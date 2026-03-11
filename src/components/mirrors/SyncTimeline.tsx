// src/components/mirrors/SyncTimeline.tsx
// 同步状态时间线组件 —— 四卡片等高布局

import {
  CheckCircle as SuccessIcon,
  Error as ErrorIcon,
  Sync as SyncIcon,
  Schedule as ScheduleIcon,
  History as HistoryIcon,
} from '@mui/icons-material';
import { Box, Typography, Paper, Grid, Link } from '@mui/material';
import React from 'react';
import { useTranslation } from 'react-i18next';

import { useLocaleStore } from '../../stores/mirrorStore';
import type { Mirror } from '../../types';
import { formatAbsoluteTime } from '../../utils/time';

interface SyncTimelineProps { mirror: Mirror; }

// ── 通用时间卡片 ──────────────────────────────────────────────────────────────
// height: '100%' 配合父级 Grid item 的 display:'flex' 实现等高
const TimeCard: React.FC<{
  icon: React.ReactNode;
  label: string;
  value: string;
  color?: string;
}> = ({ icon, label, value, color }) => (
    <Paper
        variant="outlined"
        sx={{
          p: 2, borderRadius: 2,
          display: 'flex', alignItems: 'flex-start', gap: 1.5,
          height: '100%',         // 撑满 Grid item 高度
        }}
    >
      <Box sx={{ color: color ?? 'text.secondary', mt: 0.2, flexShrink: 0 }}>{icon}</Box>
      <Box sx={{ minWidth: 0 }}>
        <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 0.3 }}>
          {label}
        </Typography>
        <Typography
            variant="body2"
            fontWeight={600}
            sx={{ fontFamily: '"JetBrains Mono", monospace', fontSize: '0.82rem' }}
        >
          {value}
        </Typography>
      </Box>
    </Paper>
);

// ── 上游地址卡片 —— 长 URL 截断 + tooltip 展示完整地址 ────────────────────────
const UpstreamCard: React.FC<{ label: string; value: string }> = ({ label, value }) => (
    <Paper
        variant="outlined"
        sx={{
          p: 2, borderRadius: 2,
          display: 'flex', alignItems: 'flex-start', gap: 1.5,
          height: '100%',
        }}
    >
      <Box sx={{ color: 'text.secondary', mt: 0.2, flexShrink: 0 }}>
        <HistoryIcon fontSize="small" />
      </Box>
      <Box sx={{ minWidth: 0, overflow: 'hidden' }}>
        <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 0.3 }}>
          {label}
        </Typography>
        {value && value !== '-' ? (
            // 链接形式，单行截断，hover 显示完整 URL
            <Link
                href={value.startsWith('http') ? value : undefined}
                target="_blank"
                rel="noopener noreferrer"
                underline={value.startsWith('http') ? 'hover' : 'none'}
                title={value}             // 浏览器原生 tooltip 显示完整 URL
                sx={{
                  fontFamily: '"JetBrains Mono", monospace',
                  fontSize: '0.82rem',
                  fontWeight: 600,
                  display: 'block',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',   // 单行，不换行不撑高
                  color: value.startsWith('http') ? 'primary.main' : 'text.primary',
                  cursor: value.startsWith('http') ? 'pointer' : 'default',
                }}
            >
              {value}
            </Link>
        ) : (
            <Typography variant="body2" fontWeight={600} color="text.disabled">—</Typography>
        )}
      </Box>
    </Paper>
);

// ── 主组件 ────────────────────────────────────────────────────────────────────
const SyncTimeline: React.FC<SyncTimelineProps> = ({ mirror }) => {
  const { t } = useTranslation();
  const { locale } = useLocaleStore();

  const statusColor = {
    succeeded: 'success.main',
    failed:    'error.main',
    syncing:   'info.main',
    cached:    'text.secondary',
  }[mirror.status];

  return (
      <Box>
        {/* alignItems="stretch" 是让同行所有 Grid item 等高的关键 */}
        <Grid container spacing={2} alignItems="stretch">

          <Grid size={{ xs: 12, sm: 6, md: 3 }} sx={{ display: 'flex' }}>
            <TimeCard
                icon={<SyncIcon fontSize="small" />}
                label={t('mirror.lastUpdated')}
                value={formatAbsoluteTime(mirror.lastUpdated, locale)}
                color={statusColor}
            />
          </Grid>

          <Grid size={{ xs: 12, sm: 6, md: 3 }} sx={{ display: 'flex' }}>
            <TimeCard
                icon={<SuccessIcon fontSize="small" />}
                label={t('mirror.lastSuccess')}
                value={formatAbsoluteTime(mirror.lastSuccess, locale)}
                color="success.main"
            />
          </Grid>

          <Grid size={{ xs: 12, sm: 6, md: 3 }} sx={{ display: 'flex' }}>
            <TimeCard
                icon={<ScheduleIcon fontSize="small" />}
                label={t('mirror.nextScheduled')}
                value={formatAbsoluteTime(mirror.nextScheduled, locale)}
                color="info.main"
            />
          </Grid>

          {/* 上游地址 —— 单行截断，不撑高卡片 */}
          <Grid size={{ xs: 12, sm: 6, md: 3 }} sx={{ display: 'flex' }}>
            <UpstreamCard
                label={t('mirror.upstream')}
                value={mirror.upstream || '-'}
            />
          </Grid>

          {/* 同步失败全宽警告条 */}
          {mirror.status === 'failed' && (
              <Grid size={{ xs: 12 }}>
                <Paper
                    variant="outlined"
                    sx={{
                      p: 2, borderRadius: 2,
                      borderColor: 'error.main',
                      bgcolor: (theme) => theme.palette.mode === 'dark' ? 'rgba(239,68,68,0.08)' : 'rgba(254,242,242,1)',
                      display: 'flex', alignItems: 'center', gap: 1,
                    }}
                >
                  <ErrorIcon color="error" sx={{ flexShrink: 0 }} />
                  <Typography variant="body2" color="error.dark" fontWeight={500}>
                    {locale === 'zh'
                        ? `该镜像当前同步失败，请暂时使用官方源。上次成功同步：${formatAbsoluteTime(mirror.lastSuccess, locale)}`
                        : `This mirror is currently failing. Please use the official source. Last success: ${formatAbsoluteTime(mirror.lastSuccess, locale)}`}
                  </Typography>
                </Paper>
              </Grid>
          )}
        </Grid>
      </Box>
  );
};

export default SyncTimeline;
