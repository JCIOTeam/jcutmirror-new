// src/components/mirrors/StatusChip.tsx
// 镜像同步状态标识组件

import { Chip } from '@mui/material';
import React from 'react';
import { useTranslation } from 'react-i18next';

import type { MirrorStatus } from '../../types';

interface StatusChipProps {
  status: MirrorStatus;
  size?: 'small' | 'medium';
}

/**
 * 状态颜色映射
 */
const statusColorMap: Record<MirrorStatus, 'success' | 'error' | 'info' | 'default'> = {
  succeeded: 'success',
  failed: 'error',
  syncing: 'info',
  cached: 'default',
};

/**
 * 镜像状态 Chip 组件
 */
const StatusChip: React.FC<StatusChipProps> = ({ status, size = 'small' }) => {
  const { t } = useTranslation();

  return (
    <Chip
      label={t(`mirror.status.${status}`)}
      color={statusColorMap[status]}
      size={size}
      variant="filled"
      sx={{
        fontWeight: 700,
        fontSize: size === 'small' ? '0.7rem' : '0.8rem',
        height: size === 'small' ? 22 : 28,
        letterSpacing: '0.02em',
      }}
      aria-label={`状态: ${t(`mirror.status.${status}`)}`}
    />
  );
};

export default StatusChip;
