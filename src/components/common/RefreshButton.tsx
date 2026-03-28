// src/components/common/RefreshButton.tsx
// 带动画状态的刷新按钮：空闲 → 转圈（请稍候）→ 打勾（已完成）/ 打叉（出错了）→ 还原
// 按钮尺寸全程固定，不因图标切换而抖动

import {
  Refresh as RefreshIcon,
  CheckCircleOutline as CheckIcon,
  ErrorOutline as ErrorIcon,
} from '@mui/icons-material';
import { Button, CircularProgress } from '@mui/material';
import type { SxProps, Theme } from '@mui/material';
import React, { useState, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';

type RefreshState = 'idle' | 'loading' | 'success' | 'error';

interface RefreshButtonProps {
  /** 点击后调用，返回 Promise；resolve → success，reject → error */
  onClick: () => Promise<unknown>;
  size?: 'small' | 'medium';
  variant?: 'outlined' | 'text';
  sx?: SxProps<Theme>;
}

// 成功 / 失败图标展示时长（ms）
const FEEDBACK_DURATION = 1400;

const RefreshButton: React.FC<RefreshButtonProps> = ({
  onClick,
  size = 'small',
  variant = 'outlined',
  sx,
}) => {
  const { t } = useTranslation();
  const [state, setState] = useState<RefreshState>('idle');
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleClick = useCallback(async () => {
    if (state === 'loading') return;
    // 取消上一个还未结束的还原定时器
    if (timerRef.current) clearTimeout(timerRef.current);
    setState('loading');
    try {
      await onClick();
      setState('success');
    } catch {
      setState('error');
    } finally {
      timerRef.current = setTimeout(() => setState('idle'), FEEDBACK_DURATION);
    }
  }, [onClick, state]);

  const isLoading = state === 'loading';
  const isSuccess = state === 'success';
  const isError = state === 'error';

  const iconSize = size === 'small' ? 16 : 18;

  const startIcon = isLoading ? (
    <CircularProgress size={iconSize} thickness={4} sx={{ color: 'inherit' }} />
  ) : isSuccess ? (
    <CheckIcon sx={{ fontSize: iconSize }} />
  ) : isError ? (
    <ErrorIcon sx={{ fontSize: iconSize }} />
  ) : (
    <RefreshIcon sx={{ fontSize: iconSize }} />
  );

  const label = isLoading
    ? t('common.refreshing')
    : isSuccess
      ? t('common.refreshed')
      : isError
        ? t('common.refreshFailed')
        : t('common.refresh');

  return (
    <Button
      size={size}
      variant={variant}
      startIcon={startIcon}
      onClick={handleClick}
      disabled={isLoading}
      color={isSuccess ? 'success' : isError ? 'error' : 'primary'}
      sx={{ borderRadius: 6, minWidth: 88, ...sx }}
    >
      {label}
    </Button>
  );
};

export default RefreshButton;
