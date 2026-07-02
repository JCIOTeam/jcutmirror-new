// src/components/mirrors/LogStreamDialog.tsx
// 镜像同步日志实时流窗口（SSE）
// 连接 /jobs/<name>/log/stream，订阅 onmessage + addEventListener('lag', ...)
// 终端风格滚动窗口；自动跟随底部；用户向上滚动后暂停自动跟随

import {
  Close as CloseIcon,
  ContentCopy as CopyIcon,
  CheckCircle as CheckIcon,
  Terminal as TerminalIcon,
  CircleOutlined as DotIcon,
  Circle as DotFilledIcon,
  ErrorOutlined as ErrorIcon,
} from '@mui/icons-material';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  Box,
  Typography,
  IconButton,
  Chip,
  Tooltip,
  Button,
} from '@mui/material';
import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';

import { useCopyToClipboard } from '../../hooks/useCopyToClipboard';

interface LogStreamDialogProps {
  open: boolean;
  mirrorId: string | null;
  onClose: () => void;
}

type ConnectionState = 'connecting' | 'open' | 'error' | 'closed';

const MAX_LINES = 2000; // 最多保留 2000 行，超出截断头部

const LogStreamDialog: React.FC<LogStreamDialogProps> = ({ open, mirrorId, onClose }) => {
  const { t } = useTranslation();
  const [lines, setLines] = useState<string[]>([]);
  const [connState, setConnState] = useState<ConnectionState>('connecting');
  const [lagWarning, setLagWarning] = useState<string | null>(null);
  const [autoFollow, setAutoFollow] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const esRef = useRef<EventSource | null>(null);
  const logBoxRef = useRef<HTMLDivElement>(null);
  const lagTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { copied, copy: copyText } = useCopyToClipboard();
  // 持有最新的 lines，让 handleCopy 不依赖 lines（回调引用稳定），
  // 同时 copyText 来自 hook，引用稳定
  const linesRef = useRef<string[]>([]);
  useEffect(() => {
    linesRef.current = lines;
  }, [lines]);
  // 持有最新的 t（i18n 翻译函数），让 SSE effect 不依赖 t，
  // 避免切换语言时重建 EventSource 并清空已累积的日志行。
  const tRef = useRef(t);
  useEffect(() => {
    tRef.current = t;
  }, [t]);

  // ── 建立/关闭 SSE 连接 ────────────────────────────────────────────────────
  // 注意：依赖数组只含 [open, mirrorId]，不含 t。
  // 切换语言只更新 tRef，不会断开 SSE 连接、不会丢失已接收的日志。
  useEffect(() => {
    if (!open || !mirrorId) return;

    // 重置状态
    setLines([]);
    setConnState('connecting');
    setLagWarning(null);
    setErrorMsg(null);
    setAutoFollow(true);

    const url = `/jobs/${encodeURIComponent(mirrorId)}/log/stream`;
    const es = new EventSource(url);
    esRef.current = es;

    // onopen：连接（含自动重连）成功后，清除错误横幅，避免「已连接(绿)+错误横幅(红)」自相矛盾
    es.onopen = () => {
      setConnState('open');
      setErrorMsg(null);
    };

    es.onmessage = (e) => {
      setLines((prev) => {
        const next = [...prev, e.data];
        // 超出上限时截断头部
        return next.length > MAX_LINES ? next.slice(next.length - MAX_LINES) : next;
      });
    };

    es.addEventListener('lag', (e: MessageEvent) => {
      setLagWarning(e.data || 'subscriber too slow');
      // 5 秒后自动清除提示：先清除上一个定时器，避免连续 lag 事件堆积多个定时器
      // 导致最早定时器提前清掉最新告警
      if (lagTimerRef.current) clearTimeout(lagTimerRef.current);
      lagTimerRef.current = setTimeout(() => setLagWarning(null), 5000);
    });

    es.onerror = () => {
      // EventSource 的错误事件：可能是 404，也可能是网络中断
      // readyState: 0=CONNECTING, 1=OPEN, 2=CLOSED
      if (es.readyState === EventSource.CLOSED) {
        setConnState('closed');
      } else {
        setConnState('error');
        setErrorMsg(tRef.current('logStream.connectionError'));
      }
    };

    return () => {
      es.close();
      esRef.current = null;
      // 清理 lag 定时器，避免卸载后 setState
      if (lagTimerRef.current) {
        clearTimeout(lagTimerRef.current);
        lagTimerRef.current = null;
      }
    };
  }, [open, mirrorId]);

  // ── 自动滚动到底部（仅在 autoFollow=true 时） ──────────────────────────
  useEffect(() => {
    if (!autoFollow || !logBoxRef.current) return;
    const box = logBoxRef.current;
    // 使用 requestAnimationFrame 确保 DOM 已渲染
    requestAnimationFrame(() => {
      box.scrollTo({ top: box.scrollHeight, behavior: 'smooth' });
    });
  }, [lines, autoFollow]);

  // ── 检测用户手动滚动：向上滚动时关闭 autoFollow，滚到底时重新开启 ──
  const handleScroll = useCallback(() => {
    const box = logBoxRef.current;
    if (!box) return;
    const atBottom = box.scrollHeight - box.scrollTop - box.clientHeight < 40;
    setAutoFollow(atBottom);
  }, []);

  // ── 复制全部日志 ──────────────────────────────────────────────────────────
  // 通过 linesRef 读取最新行，handleCopy 引用稳定，不随 lines 变化重建
  const handleCopy = useCallback(() => {
    copyText(linesRef.current.join('\n'));
  }, [copyText]);

  // ── 跳到底部按钮 ──────────────────────────────────────────────────────────
  const scrollToBottom = useCallback(() => {
    const box = logBoxRef.current;
    if (!box) return;
    box.scrollTo({ top: box.scrollHeight, behavior: 'smooth' });
    setAutoFollow(true);
  }, []);

  // ── 连接状态指示 ──────────────────────────────────────────────────────────
  const stateConfig: Record<
    ConnectionState,
    { label: string; color: 'success' | 'error' | 'default' | 'warning'; pulse: boolean }
  > = {
    connecting: { label: t('logStream.connecting'), color: 'warning', pulse: true },
    open: { label: t('logStream.connected'), color: 'success', pulse: true },
    error: { label: t('logStream.error'), color: 'error', pulse: false },
    closed: { label: t('logStream.closed'), color: 'default', pulse: false },
  };
  const curState = stateConfig[connState];

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      slotProps={{
        paper: {
          sx: {
            borderRadius: 3,
            // 窗口高度限制：viewport 80%，最小 400 最大 700
            height: { xs: '90vh', md: 'min(700px, 80vh)' },
            display: 'flex',
            flexDirection: 'column',
          },
        },
      }}
    >
      {/* 标题栏：终端图标 + 镜像名 + 状态指示 + 操作按钮 */}
      <DialogTitle
        sx={{
          py: 1.5,
          px: 2,
          borderBottom: '1px solid',
          borderColor: 'divider',
          display: 'flex',
          alignItems: 'center',
          gap: 1.5,
        }}
      >
        <TerminalIcon sx={{ color: 'primary.main', fontSize: 22 }} />
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography
            variant="subtitle1"
            sx={{
              fontWeight: 700,
              fontFamily: '"JetBrains Mono", monospace',
              fontSize: '0.95rem',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {mirrorId}
          </Typography>
          <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.7rem' }}>
            {t('logStream.title')}
          </Typography>
        </Box>

        {/* 连接状态指示器 */}
        <Tooltip title={curState.label}>
          <Chip
            icon={
              curState.pulse ? (
                <Box
                  sx={{
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    bgcolor: `${curState.color}.main`,
                    animation: 'pulse-dot 1.6s ease-in-out infinite',
                    ml: 1,
                    '@keyframes pulse-dot': {
                      '0%, 100%': { opacity: 1, transform: 'scale(1)' },
                      '50%': { opacity: 0.5, transform: 'scale(0.85)' },
                    },
                  }}
                />
              ) : (
                <DotIcon sx={{ fontSize: 10 }} />
              )
            }
            label={curState.label}
            size="small"
            color={curState.color}
            variant="outlined"
            sx={{ height: 24, fontSize: '0.72rem', fontWeight: 600 }}
          />
        </Tooltip>

        {/* 复制按钮 */}
        <Tooltip title={copied ? t('common.copied') : t('logStream.copyAll')}>
          <span>
            <IconButton
              size="small"
              onClick={handleCopy}
              disabled={lines.length === 0}
              color={copied ? 'success' : 'default'}
            >
              {copied ? <CheckIcon sx={{ fontSize: 18 }} /> : <CopyIcon sx={{ fontSize: 18 }} />}
            </IconButton>
          </span>
        </Tooltip>

        {/* 关闭按钮 */}
        <IconButton size="small" onClick={onClose} aria-label={t('common.close')}>
          <CloseIcon sx={{ fontSize: 20 }} />
        </IconButton>
      </DialogTitle>

      <DialogContent
        sx={{
          p: 0,
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          // 终端配色（暗色基调，对深浅主题都友好）
          bgcolor: (theme) => (theme.palette.mode === 'dark' ? '#0A0E1A' : '#1A1F2E'),
        }}
      >
        {/* lag 警告横幅 */}
        {lagWarning && (
          <Box
            sx={{
              px: 2,
              py: 0.75,
              bgcolor: 'rgba(245,158,11,0.15)',
              borderBottom: '1px solid rgba(245,158,11,0.3)',
              display: 'flex',
              alignItems: 'center',
              gap: 1,
            }}
          >
            <DotFilledIcon sx={{ fontSize: 10, color: '#F59E0B' }} />
            <Typography
              variant="caption"
              sx={{ color: '#FCD34D', fontFamily: '"JetBrains Mono", monospace' }}
            >
              {t('logStream.lag', { msg: lagWarning })}
            </Typography>
          </Box>
        )}

        {/* 错误提示横幅 */}
        {errorMsg && (
          <Box
            sx={{
              px: 2,
              py: 1,
              bgcolor: 'rgba(239,68,68,0.15)',
              borderBottom: '1px solid rgba(239,68,68,0.3)',
              display: 'flex',
              alignItems: 'center',
              gap: 1,
            }}
          >
            <ErrorIcon sx={{ fontSize: 16, color: '#F87171' }} />
            <Typography
              variant="caption"
              sx={{ color: '#FCA5A5', fontFamily: '"JetBrains Mono", monospace' }}
            >
              {errorMsg}
            </Typography>
          </Box>
        )}

        {/* 日志区 */}
        <Box
          ref={logBoxRef}
          onScroll={handleScroll}
          sx={{
            flex: 1,
            overflowY: 'auto',
            overflowX: 'auto',
            px: 2,
            py: 1.5,
            fontFamily: '"JetBrains Mono", "SF Mono", Menlo, Consolas, monospace',
            fontSize: '0.78rem',
            lineHeight: 1.55,
            color: '#E2E8F0',
            // 平滑滚动 + 自定义滚动条
            scrollBehavior: 'smooth',
            '&::-webkit-scrollbar': { width: 10, height: 10 },
            '&::-webkit-scrollbar-track': { bgcolor: 'rgba(255,255,255,0.04)' },
            '&::-webkit-scrollbar-thumb': {
              bgcolor: 'rgba(255,255,255,0.15)',
              borderRadius: 5,
              '&:hover': { bgcolor: 'rgba(255,255,255,0.25)' },
            },
          }}
        >
          {lines.length === 0 ? (
            <Box
              sx={{
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 1.5,
                color: 'rgba(226,232,240,0.5)',
              }}
            >
              {connState === 'open' ? (
                <>
                  <Box
                    sx={{
                      width: 32,
                      height: 32,
                      border: '2px solid rgba(226,232,240,0.2)',
                      borderTopColor: '#60A5FA',
                      borderRadius: '50%',
                      animation: 'spin 0.8s linear infinite',
                      '@keyframes spin': { to: { transform: 'rotate(360deg)' } },
                    }}
                  />
                  <Typography variant="body2" sx={{ fontFamily: 'inherit', fontSize: '0.82rem' }}>
                    {t('logStream.waitingForOutput')}
                  </Typography>
                  <Typography
                    variant="caption"
                    sx={{ color: 'rgba(226,232,240,0.35)', fontFamily: 'inherit' }}
                  >
                    {t('logStream.waitingHint')}
                  </Typography>
                </>
              ) : connState === 'connecting' ? (
                <Typography variant="body2" sx={{ fontFamily: 'inherit' }}>
                  {t('logStream.connecting')}…
                </Typography>
              ) : (
                <Typography variant="body2" sx={{ fontFamily: 'inherit' }}>
                  {errorMsg || t('logStream.noData')}
                </Typography>
              )}
            </Box>
          ) : (
            lines.map((line, i) => (
              <Box
                key={i}
                sx={{
                  whiteSpace: 'pre',
                  // 让用户能选中复制单行
                  userSelect: 'text',
                  // 行号悬停高亮
                  '&:hover': { bgcolor: 'rgba(255,255,255,0.03)' },
                  // rsync 输出的不同行类型给一点视觉区分
                  color: colorForLine(line),
                }}
              >
                {line || '\u00A0'}
              </Box>
            ))
          )}
        </Box>

        {/* 底部状态条：行数、跟随状态、跳到底部按钮 */}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 1,
            px: 2,
            py: 0.75,
            borderTop: '1px solid rgba(255,255,255,0.08)',
            bgcolor: 'rgba(0,0,0,0.25)',
          }}
        >
          <Typography
            variant="caption"
            sx={{
              fontFamily: '"JetBrains Mono", monospace',
              fontSize: '0.7rem',
              color: 'rgba(226,232,240,0.55)',
            }}
          >
            {t('logStream.lineCount', { count: lines.length })}
            {lines.length >= MAX_LINES && ' · ' + t('logStream.truncated')}
          </Typography>
          {!autoFollow && lines.length > 0 && (
            <Button
              size="small"
              variant="text"
              onClick={scrollToBottom}
              sx={{
                color: '#60A5FA',
                fontSize: '0.7rem',
                py: 0,
                minWidth: 0,
                textTransform: 'none',
                '&:hover': { bgcolor: 'rgba(96,165,250,0.1)' },
              }}
            >
              {t('logStream.jumpToBottom')} ↓
            </Button>
          )}
          {autoFollow && lines.length > 0 && (
            <Typography
              variant="caption"
              sx={{
                fontFamily: '"JetBrains Mono", monospace',
                fontSize: '0.7rem',
                color: '#4ADE80',
                display: 'flex',
                alignItems: 'center',
                gap: 0.5,
              }}
            >
              <DotFilledIcon sx={{ fontSize: 8 }} />
              {t('logStream.following')}
            </Typography>
          )}
        </Box>
      </DialogContent>
    </Dialog>
  );
};

/**
 * 根据行内容判断颜色——rsync 的输出有规律：
 * - 进度行（含百分比和速率）：偏蓝
 * - 总计/sent/received 行：偏绿
 * - 文件路径行（一般是目录形式）：默认色
 * - 错误关键字：偏红
 */
function colorForLine(line: string): string {
  const lower = line.toLowerCase();
  if (lower.includes('error') || lower.includes('failed') || lower.includes('rsync error'))
    return '#F87171';
  if (lower.includes('warning') || lower.includes('skipping')) return '#FCD34D';
  if (/^(sent|total size is|received)/i.test(line.trim())) return '#86EFAC';
  if (/\d+%\s+[\d.]+[KMGT]B\/s/.test(line)) return '#93C5FD';
  return '#E2E8F0';
}

export default LogStreamDialog;
