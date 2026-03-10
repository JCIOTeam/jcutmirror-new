// src/components/mirrors/SyncTimeline.tsx
// 同步状态时间线组件

import {
  CheckCircle as SuccessIcon,
  Error as ErrorIcon,
  Sync as SyncIcon,
  Schedule as ScheduleIcon,
  History as HistoryIcon,
} from '@mui/icons-material';
import {
  Box,
  Typography,
  Paper,
  Grid,
} from '@mui/material';
import React from 'react';
import { useTranslation } from 'react-i18next';

import { useLocaleStore } from '../../stores/mirrorStore';
import type { Mirror } from '../../types';
import { formatAbsoluteTime } from '../../utils/time';

interface SyncTimelineProps {
  mirror: Mirror;
}

/**
 * 同步时间信息卡片
 */
const TimeItem: React.FC<{
  icon: React.ReactNode;
  label: string;
  value: string;
  color?: string;
}> = ({ icon, label, value, color }) => (
  <Paper
    variant="outlined"
    sx={{ p: 2, borderRadius: 2, display: 'flex', alignItems: 'flex-start', gap: 1.5 }}
  >
    <Box sx={{ color: color || 'text.secondary', mt: 0.2 }}>{icon}</Box>
    <Box>
      <Typography variant="caption" color="text.secondary" display="block">
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

/**
 * 镜像同步状态时间线
 */
const SyncTimeline: React.FC<SyncTimelineProps> = ({ mirror }) => {
  const { t } = useTranslation();
  const { locale } = useLocaleStore();

  const statusColor = {
    succeeded: 'success.main',
    failed: 'error.main',
    syncing: 'info.main',
    cached: 'text.secondary',
  }[mirror.status];

  return (
    <Box>
      <Grid container spacing={2}>
        {/* 最后更新 */}
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <TimeItem
            icon={<SyncIcon fontSize="small" />}
            label={t('mirror.lastUpdated')}
            value={formatAbsoluteTime(mirror.lastUpdated, locale)}
            color={statusColor}
          />
        </Grid>

        {/* 上次成功 */}
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <TimeItem
            icon={<SuccessIcon fontSize="small" />}
            label={t('mirror.lastSuccess')}
            value={formatAbsoluteTime(mirror.lastSuccess, locale)}
            color="success.main"
          />
        </Grid>

        {/* 下次同步 */}
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <TimeItem
            icon={<ScheduleIcon fontSize="small" />}
            label={t('mirror.nextScheduled')}
            value={formatAbsoluteTime(mirror.nextScheduled, locale)}
            color="info.main"
          />
        </Grid>

        {/* 上游源 */}
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Paper
            variant="outlined"
            sx={{ p: 2, borderRadius: 2, display: 'flex', alignItems: 'flex-start', gap: 1.5 }}
          >
            <Box sx={{ color: 'text.secondary', mt: 0.2 }}>
              <HistoryIcon fontSize="small" />
            </Box>
            <Box sx={{ overflow: 'hidden' }}>
              <Typography variant="caption" color="text.secondary" display="block">
                {t('mirror.upstream')}
              </Typography>
              <Typography
                variant="body2"
                fontWeight={600}
                sx={{
                  fontFamily: '"JetBrains Mono", monospace',
                  fontSize: '0.82rem',
                  wordBreak: 'break-all',
                }}
              >
                {mirror.upstream || '-'}
              </Typography>
            </Box>
          </Paper>
        </Grid>

        {/* 同步失败警告 */}
        {mirror.status === 'failed' && (
          <Grid size={{ xs: 12 }}>
            <Paper
              variant="outlined"
              sx={{
                p: 2,
                borderRadius: 2,
                borderColor: 'error.main',
                bgcolor: 'error.light',
                display: 'flex',
                alignItems: 'center',
                gap: 1,
              }}
            >
              <ErrorIcon color="error" />
              <Typography variant="body2" color="error.dark" fontWeight={500}>
                {locale === 'zh'
                  ? '该镜像当前同步失败，请暂时使用官方源。上次成功同步时间：'
                  : 'This mirror is currently failing. Please use the official source. Last success: '}
                {formatAbsoluteTime(mirror.lastSuccess, locale)}
              </Typography>
            </Paper>
          </Grid>
        )}
      </Grid>
    </Box>
  );
};

export default SyncTimeline;
