// src/components/common/ThemeToggle.tsx
// 主题切换按钮组件

import {
  DarkMode as DarkIcon,
  LightMode as LightIcon,
} from '@mui/icons-material';
import { IconButton, Tooltip } from '@mui/material';
import React from 'react';
import { useTranslation } from 'react-i18next';

import { useTheme } from '../../hooks/useTheme';

/**
 * 主题切换按钮（浅色/深色）
 * 状态通过 localStorage['theme'] 与 FancyIndex 共享
 */
const ThemeToggle: React.FC = () => {
  const { t } = useTranslation();
  const { isDark, toggleMode } = useTheme();

  return (
    <Tooltip title={isDark ? t('theme.light') : t('theme.dark')} placement="bottom">
      <IconButton
        onClick={toggleMode}
        color="inherit"
        size="small"
        aria-label={t('theme.toggle')}
        sx={{
          transition: 'transform 0.3s ease',
          '&:hover': { transform: 'rotate(20deg)' },
        }}
      >
        {isDark ? <LightIcon fontSize="small" /> : <DarkIcon fontSize="small" />}
      </IconButton>
    </Tooltip>
  );
};

export default ThemeToggle;
