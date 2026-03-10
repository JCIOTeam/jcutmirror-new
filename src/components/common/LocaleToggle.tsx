// src/components/common/LocaleToggle.tsx
// 语言切换按钮组件

import { Translate as TranslateIcon } from '@mui/icons-material';
import { Button, Tooltip } from '@mui/material';
import React from 'react';
import { useTranslation } from 'react-i18next';

import { useLocale } from '../../hooks/useLocale';

/**
 * 语言切换按钮（中文/English）
 * 状态通过 localStorage['locale'] 与 FancyIndex 共享
 */
const LocaleToggle: React.FC = () => {
  const { t } = useTranslation();
  const { locale, toggleLocale } = useLocale();

  return (
    <Tooltip title={t('locale.toggle')} placement="bottom">
      <Button
        onClick={toggleLocale}
        color="inherit"
        size="small"
        startIcon={<TranslateIcon fontSize="small" />}
        aria-label={t('locale.toggle')}
        sx={{
          fontWeight: 600,
          fontSize: '0.82rem',
          minWidth: 'auto',
          px: 1,
          py: 0.5,
          textTransform: 'none',
          borderRadius: 1.5,
          '&:hover': { bgcolor: 'action.hover' },
        }}
      >
        {locale === 'zh' ? 'EN' : '中文'}
      </Button>
    </Tooltip>
  );
};

export default LocaleToggle;
