// src/components/mirrors/StatusChip.tsx
// 镜像同步状态标识组件

import { Box, Chip, Tooltip } from '@mui/material';
import React from 'react';
import { useTranslation } from 'react-i18next';

import type { MirrorStatus } from '../../types';

interface StatusChipProps {
  status: MirrorStatus;
  size?: 'small' | 'medium';
  iconOnly?: boolean;
}

const statusColorMap: Record<MirrorStatus, 'success' | 'error' | 'info' | 'default' | 'warning'> = {
  succeeded: 'success',
  failed: 'error',
  syncing: 'info',
  cached: 'default',
  paused: 'warning',
  disabled: 'default',
  unknown: 'default',
};

// 各状态对应的圆点颜色
const DOT_COLOR: Record<MirrorStatus, string> = {
  succeeded: '#22C55E',
  failed: '#EF4444',
  syncing: '#3B82F6',
  cached: '#94A3B8',
  paused: '#F59E0B',
  disabled: '#9CA3AF',
  unknown: '#6B7280',
};

const SYNCING_COLOR = '#3B82F6';

// ── 图标模式：小圆点 + Tooltip ───────────────────────────────────────────────
const StatusDot: React.FC<{ status: MirrorStatus; label: string }> = ({ status, label }) => {
  const color = DOT_COLOR[status];
  const isSyncing = status === 'syncing';

  return (
    <Tooltip title={label} placement="top" arrow>
      <Box
        component="span"
        sx={{
          display: 'inline-block',
          width: 10,
          height: 10,
          borderRadius: '50%',
          bgcolor: color,
          flexShrink: 0,
          cursor: 'default',
          ...(isSyncing && {
            animation: 'dot-breathe 2.8s ease-in-out infinite',
            '@keyframes dot-breathe': {
              '0%, 100%': { opacity: 0.4, transform: 'scale(0.75)' },
              '50%': { opacity: 1, transform: 'scale(1)' },
            },
          }),
        }}
        aria-label={label}
      />
    </Tooltip>
  );
};

// ── 主组件 ───────────────────────────────────────────────────────────────────
const StatusChip: React.FC<StatusChipProps> = ({ status, size = 'small', iconOnly = false }) => {
  const { t } = useTranslation();
  const label = t(`mirror.status.${status}`);
  const isSyncing = status === 'syncing';
  const chipH = size === 'small' ? 22 : 28;

  if (iconOnly) {
    return <StatusDot status={status} label={label} />;
  }

  if (isSyncing) {
    return (
      <Box
        sx={{
          display: 'inline-flex',
          alignItems: 'center',
          position: 'relative',
          '&::before': {
            content: '""',
            position: 'absolute',
            inset: -3,
            borderRadius: 999,
            background: `radial-gradient(ellipse at center, ${SYNCING_COLOR}55 0%, transparent 70%)`,
            animation: 'breathe-glow 2.8s ease-in-out infinite',
          },
          '@keyframes breathe-glow': {
            '0%, 100%': { opacity: 0.3, transform: 'scale(0.92)' },
            '50%': { opacity: 1, transform: 'scale(1.08)' },
          },
        }}
      >
        <Chip
          label={
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.6 }}>
              <Box
                component="span"
                sx={{
                  width: size === 'small' ? 6 : 8,
                  height: size === 'small' ? 6 : 8,
                  borderRadius: '50%',
                  bgcolor: 'currentColor',
                  display: 'inline-block',
                  flexShrink: 0,
                  animation: 'breathe-dot 2.8s ease-in-out infinite',
                  '@keyframes breathe-dot': {
                    '0%, 100%': { opacity: 0.4, transform: 'scale(0.75)' },
                    '50%': { opacity: 1, transform: 'scale(1)' },
                  },
                }}
              />
              {label}
            </Box>
          }
          color="info"
          size={size}
          variant="outlined"
          sx={{
            fontWeight: 700,
            fontSize: size === 'small' ? '0.7rem' : '0.8rem',
            height: chipH,
            letterSpacing: '0.02em',
            position: 'relative',
            zIndex: 1,
            animation: 'breathe-chip 2.8s ease-in-out infinite',
            '@keyframes breathe-chip': {
              '0%, 100%': { opacity: 0.65 },
              '50%': { opacity: 1 },
            },
            '& .MuiChip-label': { px: 1 },
          }}
        />
      </Box>
    );
  }

  return (
    <Chip
      label={label}
      color={statusColorMap[status]}
      size={size}
      variant="filled"
      sx={{
        fontWeight: 700,
        fontSize: size === 'small' ? '0.7rem' : '0.8rem',
        height: chipH,
        letterSpacing: '0.02em',
      }}
      aria-label={`状态: ${label}`}
    />
  );
};

export default StatusChip;
