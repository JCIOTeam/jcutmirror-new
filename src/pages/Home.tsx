// src/pages/Home.tsx
// 首页

import {
  Refresh as RefreshIcon,
  Storage as StorageIcon,
  Speed as SpeedIcon,
  Security as SecurityIcon,
} from '@mui/icons-material';
import {
  Box,
  Container,
  Typography,
  Grid,
  Alert,
  Button,
  Chip,
  Skeleton,
  Paper,
} from '@mui/material';
import React, { useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { useTranslation } from 'react-i18next';

import AnnouncementBanner from '../components/home/AnnouncementBanner';
import MirrorCard from '../components/mirrors/MirrorCard';
import MirrorList from '../components/mirrors/MirrorList';
import {
  useMirrors,
  useCampusNetwork,
  useFilteredMirrors,
  useGroupedMirrors,
  usePopularMirrors,
} from '../hooks/useMirrors';
import { useMirrorSearchStore , useLocaleStore } from '../stores/mirrorStore';

/**
 * 首页 - 展示镜像站概览
 */
const Home: React.FC = () => {
  const { t } = useTranslation();
  const { locale } = useLocaleStore();
  const { searchQuery } = useMirrorSearchStore();

  // 获取数据
  const { data: mirrors = [], isLoading, error, refetch } = useMirrors();
  const { data: campusStatus } = useCampusNetwork();

  // 过滤和分组
  const filteredMirrors = useFilteredMirrors(mirrors);
  const groupedMirrors = useGroupedMirrors(filteredMirrors);
  const popularMirrors = usePopularMirrors(mirrors, 8);

  // 统计数据
  const totalCount = mirrors.length;
  const succeededCount = mirrors.filter((m) => m.status === 'succeeded').length;

  return (
    <>
      <Helmet>
        <title>JCUT Mirror - 开源软件镜像站</title>
        <meta
          name="description"
          content="JCUT Mirror - 高校开源软件镜像站，提供快速稳定的Linux发行版及开发工具镜像"
        />
      </Helmet>

      {/* Hero 区域 */}
      <Box
        sx={{
          background: (theme) =>
            theme.palette.mode === 'dark'
              ? 'linear-gradient(135deg, #0F172A 0%, #1E293B 50%, #0F172A 100%)'
              : 'linear-gradient(135deg, #EFF6FF 0%, #F0FDF4 50%, #FFF7ED 100%)',
          pt: { xs: 5, md: 8 },
          pb: { xs: 5, md: 8 },
          position: 'relative',
          overflow: 'hidden',
          // 装饰背景网格
          '&::before': {
            content: '""',
            position: 'absolute',
            inset: 0,
            backgroundImage:
              'radial-gradient(circle at 1px 1px, rgba(59,130,246,0.08) 1px, transparent 0)',
            backgroundSize: '32px 32px',
          },
        }}
      >
        <Container maxWidth="lg" sx={{ position: 'relative' }}>
          {/* 校园网检测提示 - 只显示校内或 IPv6 状态 */}
          {(campusStatus === '1' || campusStatus === '6') && (
            <Box sx={{ mb: 2 }}>
              <Alert
                severity={campusStatus === '1' ? 'success' : 'info'}
                sx={{ py: 0.5 }}
              >
                {t(`network.${campusStatus === '1' ? 'campus' : 'ipv6'}`)}
              </Alert>
            </Box>
          )}

          {/* 公告/通知横幅 —— 从 public/announcements.json 读取，无需重新构建即可更新 */}
          <Box sx={{ mb: 3 }}>
            <AnnouncementBanner />
          </Box>
          <Box sx={{ maxWidth: 640 }}>
            {/* 标签 */}
            <Chip
              label={locale === 'zh' ? '高校镜像站' : 'University Mirror'}
              color="primary"
              size="small"
              variant="outlined"
              sx={{ mb: 2, fontWeight: 700 }}
            />

            {/* 标题 */}
            <Typography
              variant="h2"
              sx={{
                fontWeight: 800,
                fontSize: { xs: '2rem', md: '3rem' },
                fontFamily: '"JetBrains Mono", monospace',
                mb: 1,
                letterSpacing: '-0.03em',
              }}
            >
              {t('home.hero.title')}
            </Typography>

            <Typography
              variant="h5"
              color="text.secondary"
              sx={{ mb: 2, fontWeight: 400, fontSize: { xs: '1rem', md: '1.25rem' } }}
            >
              {t('home.hero.subtitle')}
            </Typography>

            <Typography
              variant="body1"
              color="text.secondary"
              sx={{ mb: 3, lineHeight: 1.8, maxWidth: 520 }}
            >
              {t('home.hero.description')}
            </Typography>

            {/* 统计数据 */}
            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
              {[
                {
                  icon: <StorageIcon fontSize="small" />,
                  label: t('home.totalMirrors', { count: totalCount }),
                },
                {
                  icon: <SpeedIcon fontSize="small" />,
                  label: t('home.syncedToday', { count: succeededCount }),
                },
                {
                  icon: <SecurityIcon fontSize="small" />,
                  label: locale === 'zh' ? 'HTTPS 加密传输' : 'HTTPS Encrypted',
                },
              ].map((item, i) => (
                <Box
                  key={i}
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 0.5,
                    color: 'text.secondary',
                    fontSize: '0.85rem',
                  }}
                >
                  {item.icon}
                  <Typography variant="body2" color="text.secondary" fontWeight={500}>
                    {item.label}
                  </Typography>
                </Box>
              ))}
            </Box>
          </Box>
        </Container>
      </Box>

      <Container maxWidth="lg" sx={{ py: { xs: 4, md: 6 } }}>
        {/* 常用镜像 - 只在无搜索时显示 */}
        {!searchQuery && (
          <Box sx={{ mb: 6 }}>
            <Typography
              variant="h5"
              fontWeight={700}
              sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 1 }}
            >
              {t('home.popularMirrors')}
            </Typography>
            {isLoading ? (
              <Grid container spacing={2}>
                {[...Array(8)].map((_, i) => (
                  <Grid key={i} size={{ xs: 12, sm: 6, md: 4, lg: 3 }}>
                    <Skeleton variant="rectangular" height={160} sx={{ borderRadius: 2 }} />
                  </Grid>
                ))}
              </Grid>
            ) : (
              <Grid container spacing={2}>
                {popularMirrors.map((mirror) => (
                  <Grid key={mirror.id} size={{ xs: 12, sm: 6, md: 4, lg: 3 }}>
                    <MirrorCard mirror={mirror} />
                  </Grid>
                ))}
              </Grid>
            )}
          </Box>
        )}

        {/* 所有镜像列表 */}
        <Box id="mirrors">
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              mb: 3,
            }}
          >
            <Typography variant="h5" fontWeight={700}>
              {searchQuery
                ? t('search.results', { count: filteredMirrors.length })
                : t('home.allMirrors')}
            </Typography>

            {/* 刷新按钮 */}
            <Button
              size="small"
              startIcon={<RefreshIcon />}
              onClick={() => refetch()}
              disabled={isLoading}
              variant="outlined"
              sx={{ borderRadius: 6 }}
            >
              {locale === 'zh' ? '刷新' : 'Refresh'}
            </Button>
          </Box>

          {/* 加载失败 */}
          {error && (
            <Paper
              variant="outlined"
              sx={{ p: 3, textAlign: 'center', borderRadius: 2, mb: 3 }}
            >
              <Typography color="error" gutterBottom>
                {t('error.loadFailed')}
              </Typography>
              <Button variant="contained" size="small" onClick={() => refetch()}>
                {t('error.retry')}
              </Button>
            </Paper>
          )}

          {/* 字母分组索引导航 */}
          {!isLoading && Object.keys(groupedMirrors).length > 0 && (
            <Box
              sx={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: 0.5,
                mb: 3,
                p: 1.5,
                bgcolor: 'background.paper',
                borderRadius: 2,
                border: '1px solid',
                borderColor: 'divider',
              }}
            >
              {Object.keys(groupedMirrors)
                .sort()
                .map((letter) => (
                  <Button
                    key={letter}
                    size="small"
                    href={`#group-${letter}`}
                    sx={{
                      minWidth: 32,
                      width: 32,
                      height: 28,
                      p: 0,
                      fontFamily: '"JetBrains Mono", monospace',
                      fontWeight: 700,
                      fontSize: '0.8rem',
                      borderRadius: 1,
                      color: 'primary.main',
                      '&:hover': { bgcolor: 'primary.main', color: 'white' },
                    }}
                  >
                    {letter}
                  </Button>
                ))}
            </Box>
          )}

          {/* 镜像列表 */}
          <MirrorList
            grouped={groupedMirrors}
            loading={isLoading}
            error={error ? String(error) : undefined}
          />
        </Box>
      </Container>
    </>
  );
};

export default Home;
