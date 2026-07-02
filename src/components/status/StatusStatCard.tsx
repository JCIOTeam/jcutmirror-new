// src/components/status/StatusStatCard.tsx
// 状态页统计卡片 + 健康度配置 —— 从 StatusPage 抽出
//
// HEALTH_CONFIG 含图标 JSX，故放 .tsx；calcHealth 纯逻辑在 utils/statusHealth.ts

import { CheckCircle as OkIcon, Warning as WarnIcon, Error as ErrorIcon } from '@mui/icons-material';
import { Box, Paper, Typography } from '@mui/material';
import React from 'react';

import type { HealthLevel } from '../../utils/statusHealth';

export const HEALTH_CONFIG: Record<
  HealthLevel,
  { icon: React.ReactNode; color: 'success' | 'warning' | 'error'; bg: string }
> = {
  operational: {
    icon: <OkIcon />,
    color: 'success',
    bg: 'rgba(16,185,129,0.08)',
  },
  degraded: {
    icon: <WarnIcon />,
    color: 'warning',
    bg: 'rgba(245,158,11,0.08)',
  },
  outage: {
    icon: <ErrorIcon />,
    color: 'error',
    bg: 'rgba(239,68,68,0.08)',
  },
};

// ── 统计卡片 ─────────────────────────────────────────────────────────────────
interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
  sub?: string;
  color?: string;
}

export const StatCard: React.FC<StatCardProps> = ({ icon, label, value, sub, color }) => (
  <Paper
    variant="outlined"
    sx={{
      p: 2.5,
      borderRadius: 2,
      height: '100%',
      display: 'flex',
      alignItems: 'flex-start',
      gap: 2,
    }}
  >
    <Box sx={{ color: color ?? 'primary.main', mt: 0.3, flexShrink: 0 }}>{icon}</Box>
    <Box>
      <Typography
        variant="caption"
        sx={{
          color: 'text.secondary',
          display: 'block',
          mb: 0.4,
        }}
      >
        {label}
      </Typography>
      <Typography
        variant="h5"
        sx={{
          fontWeight: 800,
          lineHeight: 1.2,
        }}
      >
        {value}
      </Typography>
      {sub && (
        <Typography
          variant="caption"
          sx={{
            color: 'text.secondary',
            mt: 0.3,
            display: 'block',
          }}
        >
          {sub}
        </Typography>
      )}
    </Box>
  </Paper>
);
