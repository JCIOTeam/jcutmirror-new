// src/components/common/ScrollToTop.tsx
// 回到顶部悬浮按钮 —— 滚动超过 400px 后出现

import { KeyboardArrowUp as ArrowUpIcon } from '@mui/icons-material';
import { Fab, Zoom, Tooltip } from '@mui/material';
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

const SCROLL_THRESHOLD = 400;

const ScrollToTop: React.FC = () => {
  const { t } = useTranslation();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setVisible(window.scrollY > SCROLL_THRESHOLD);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleClick = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <Zoom in={visible}>
      <Tooltip title={t('nav.backToTop', '回到顶部')} placement="left">
        <Fab
          size="small"
          color="primary"
          onClick={handleClick}
          aria-label={t('nav.backToTop', '回到顶部')}
          sx={{
            position: 'fixed',
            bottom: 24,
            right: 24,
            zIndex: 1200,
            boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
          }}
        >
          <ArrowUpIcon fontSize="small" />
        </Fab>
      </Tooltip>
    </Zoom>
  );
};

export default ScrollToTop;
