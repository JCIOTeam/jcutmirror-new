// src/pages/NotFound.tsx
// 404页面

import { Home as HomeIcon } from '@mui/icons-material';
import { Box, Container, Typography, Button } from '@mui/material';
import React from 'react';
import { Helmet } from 'react-helmet-async';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

/**
 * 404 Not Found 页面
 */
const NotFound: React.FC = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();

  return (
    <>
      <Helmet>
        <title>404 - JCut Mirror</title>
      </Helmet>

      <Container maxWidth="sm">
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '60vh',
            textAlign: 'center',
            py: 8,
          }}
        >
          {/* 404 大字 */}
          <Typography
            variant="h1"
            sx={{
              fontSize: { xs: '6rem', md: '10rem' },
              fontWeight: 900,
              fontFamily: '"JetBrains Mono", monospace',
              color: 'primary.main',
              lineHeight: 1,
              mb: 2,
              opacity: 0.15,
            }}
          >
            404
          </Typography>

          <Typography variant="h4" fontWeight={700} sx={{ mb: 1.5, mt: -4 }}>
            {t('error.notFound')}
          </Typography>

          <Typography variant="body1" color="text.secondary" sx={{ mb: 4, maxWidth: 400 }}>
            {t('error.notFoundDesc')}
          </Typography>

          <Button
            variant="contained"
            startIcon={<HomeIcon />}
            onClick={() => navigate('/')}
            size="large"
            sx={{ borderRadius: 6 }}
          >
            {t('error.backHome')}
          </Button>
        </Box>
      </Container>
    </>
  );
};

export default NotFound;
