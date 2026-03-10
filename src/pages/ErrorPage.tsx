// src/pages/ErrorPage.tsx
// 通用错误页面 —— 支持 403 / 404 / 500 / 503 等状态码

import { Home as HomeIcon, Refresh as RefreshIcon, InfoOutlined as InfoIcon } from '@mui/icons-material';
import { Box, Container, Typography, Button, Stack, Paper, Divider } from '@mui/material';
import React, { useEffect, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { useNavigate } from 'react-router-dom';

interface ErrorPageProps { code?: number; }

interface ErrorMeta {
  titleZh: string; titleEn: string;
  descZh: string;  descEn: string;
  canRefresh: boolean;
}

const ERROR_META: Record<number, ErrorMeta> = {
  403: {
    titleZh: '访问被拒绝',            titleEn: 'Access Denied',
    descZh:  '您没有权限访问该资源，请确认您在校园网内或联系管理员。',
    descEn:  'You do not have permission to access this resource. Please make sure you are on the campus network or contact the administrator.',
    canRefresh: false,
  },
  404: {
    titleZh: '页面不存在',            titleEn: 'Page Not Found',
    descZh:  '您访问的镜像或页面不存在，请确认 URL 是否正确。',
    descEn:  'The mirror or page you are looking for does not exist. Please check the URL.',
    canRefresh: false,
  },
  500: {
    titleZh: '服务器内部错误',         titleEn: 'Internal Server Error',
    descZh:  '服务器遇到了一个意外错误，我们正在努力修复。请稍后再试。',
    descEn:  'The server encountered an unexpected error. We are working on it. Please try again later.',
    canRefresh: true,
  },
  502: {
    titleZh: '网关错误',              titleEn: 'Bad Gateway',
    descZh:  '上游服务暂时不可用，这通常是临时性问题，请稍后刷新。',
    descEn:  'The upstream service is temporarily unavailable. This is usually a temporary issue — please refresh.',
    canRefresh: true,
  },
  503: {
    titleZh: '服务暂时不可用',         titleEn: 'Service Unavailable',
    descZh:  '镜像站正在维护或负载较高，请稍后访问。',
    descEn:  'The mirror is under maintenance or experiencing high load. Please try again later.',
    canRefresh: true,
  },
};

const FALLBACK_META: ErrorMeta = {
  titleZh: '发生错误',              titleEn: 'Something went wrong',
  descZh:  '访问出现了异常，请稍后再试或返回首页。',
  descEn:  'Something went wrong. Please try again later or go back to home.',
  canRefresh: true,
};

// ── 客户端指纹信息（从响应头读取，Nginx 需配置 add_header 才会有值）──
interface ClientInfo {
  realIp?:        string;
  ja4Fingerprint?: string;
  ja3Fingerprint?: string;
}

const ClientInfoPanel: React.FC<{ isZh: boolean }> = ({ isZh }) => {
  const [info, setInfo] = useState<ClientInfo>({});
  const [hasInfo, setHasInfo] = useState(false);

  useEffect(() => {
    fetch(window.location.href, { method: 'GET', cache: 'no-cache' })
        .then(res => {
          const realIp        = res.headers.get('x-real-ip')        ?? undefined;
          const ja4Fingerprint = res.headers.get('x-ja4-fingerprint') ?? undefined;
          const ja3Fingerprint = res.headers.get('x-ja3-fingerprint') ?? undefined;
          const next: ClientInfo = { realIp, ja4Fingerprint, ja3Fingerprint };
          const any = !!(realIp || ja4Fingerprint || ja3Fingerprint);
          setInfo(next);
          setHasInfo(any);
        })
        .catch(() => { /* 网络错误时静默忽略，不影响错误页展示 */ });
  }, []);

  if (!hasInfo) return null;

  const rows: Array<{ label: string; value: string }> = [
    ...(info.realIp        ? [{ label: isZh ? '客户端 IP'      : 'Client IP',        value: info.realIp }]        : []),
    ...(info.ja4Fingerprint ? [{ label: 'JA4 Fingerprint',                            value: info.ja4Fingerprint }] : []),
    ...(info.ja3Fingerprint ? [{ label: 'JA3 Fingerprint',                            value: info.ja3Fingerprint }] : []),
  ];

  return (
      <Paper
          variant="outlined"
          sx={{ mt: 4, p: 2, borderRadius: 2, maxWidth: 480, width: '100%', textAlign: 'left' }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8, mb: 1.5 }}>
          <InfoIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
          <Typography variant="caption" fontWeight={700} color="text.secondary">
            {isZh ? '请求信息' : 'Request Info'}
          </Typography>
        </Box>
        <Divider sx={{ mb: 1.5 }} />
        <Stack spacing={1}>
          {rows.map(row => (
              <Box key={row.label} sx={{ display: 'flex', gap: 1, alignItems: 'flex-start' }}>
                <Typography
                    variant="caption"
                    color="text.secondary"
                    sx={{ minWidth: 120, flexShrink: 0, pt: 0.1 }}
                >
                  {row.label}
                </Typography>
                <Typography
                    variant="caption"
                    sx={{
                      fontFamily: '"JetBrains Mono", monospace',
                      wordBreak: 'break-all',
                      color: 'text.primary',
                      fontWeight: 500,
                    }}
                >
                  {row.value}
                </Typography>
              </Box>
          ))}
        </Stack>
      </Paper>
  );
};

// ── 主组件 ────────────────────────────────────────────────────────────────────
const ErrorPage: React.FC<ErrorPageProps> = ({ code = 404 }) => {
  const navigate = useNavigate();
  const storedLocale = (typeof localStorage !== 'undefined' && localStorage.getItem('locale')) || 'zh';
  const isZh = storedLocale !== 'en';
  const meta = ERROR_META[code] ?? FALLBACK_META;

  // ⚠️ Helmet <title> 必须是纯字符串子节点，不能是数字或 JSX 表达式
  const titleStr = `${code} - JCUT Mirror`;

  return (
      <>
        <Helmet>
          <title>{titleStr}</title>
        </Helmet>

        <Container maxWidth="sm">
          <Box
              sx={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                minHeight: '65vh',
                textAlign: 'center',
                py: 8,
                userSelect: 'none',
              }}
          >
            <Typography
                variant="h1"
                sx={{
                  fontSize: { xs: '5rem', md: '8rem' },
                  fontWeight: 900,
                  fontFamily: '"JetBrains Mono", monospace',
                  color: 'primary.main',
                  lineHeight: 1,
                  opacity: 0.12,
                  mb: '-2.5rem',
                }}
            >
              {code}
            </Typography>

            <Typography variant="h4" fontWeight={700} sx={{ mb: 1.5, position: 'relative', zIndex: 1 }}>
              {isZh ? meta.titleZh : meta.titleEn}
            </Typography>

            <Typography variant="body1" color="text.secondary" sx={{ mb: 4, maxWidth: 420, lineHeight: 1.7 }}>
              {isZh ? meta.descZh : meta.descEn}
            </Typography>

            <Stack direction="row" spacing={2} justifyContent="center" flexWrap="wrap">
              <Button variant="contained" startIcon={<HomeIcon />} onClick={() => navigate('/')} size="large" sx={{ borderRadius: 6 }}>
                {isZh ? '返回首页' : 'Back to Home'}
              </Button>
              {meta.canRefresh && (
                  <Button variant="outlined" startIcon={<RefreshIcon />} onClick={() => window.location.reload()} size="large" sx={{ borderRadius: 6 }}>
                    {isZh ? '刷新页面' : 'Refresh'}
                  </Button>
              )}
            </Stack>

            {/* 客户端指纹信息面板 —— 有响应头时自动出现 */}
            <ClientInfoPanel isZh={isZh} />

            <Typography variant="caption" color="text.disabled" sx={{ mt: 4, fontFamily: '"JetBrains Mono", monospace' }}>
              HTTP {code}
            </Typography>
          </Box>
        </Container>
      </>
  );
};

export default ErrorPage;
