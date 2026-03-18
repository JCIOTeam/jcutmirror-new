// src/pages/Home.tsx
// 首页

import {
  Refresh as RefreshIcon,
  Storage as StorageIcon,
  Speed as SpeedIcon,
  Security as SecurityIcon,
  Wifi as WifiIcon,
  WifiTethering as Ipv6Icon,
  Close as CloseIcon,
  InfoOutlined as InfoIcon,
  WarningAmberOutlined as WarningIcon,
  Star as StarIcon,
} from '@mui/icons-material';
import {
  Box,
  Container,
  Typography,
  Grid,
  Button,
  Chip,
  Skeleton,
  Paper,
  Tooltip,
  Snackbar,
  Fade,
  IconButton,
  ToggleButtonGroup,
  ToggleButton,
} from '@mui/material';
import React, { cloneElement, useState, useEffect, useMemo } from 'react';
import { Helmet } from 'react-helmet-async';
import { useTranslation } from 'react-i18next';

import AnnouncementBanner from '../components/home/AnnouncementBanner';
import NewsWidget from '../components/home/NewsWidget';
import MirrorCard from '../components/mirrors/MirrorCard';
import MirrorList from '../components/mirrors/MirrorList';
import {
  useMirrors,
  useCampusNetwork,
  useFilteredMirrors,
  useGroupedMirrors,
  usePopularMirrors,
} from '../hooks/useMirrors';
import { useMirrorSearchStore, useLocaleStore, useFavoriteStore } from '../stores/mirrorStore';
import type { MirrorStatus } from '../types';

import { getNewsList } from '@/news';

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
  const popularMirrors = usePopularMirrors(mirrors, 8);

  // 状态过滤器
  const [statusFilter, setStatusFilter] = useState<MirrorStatus | 'all'>('all');
  const statusFilteredMirrors = useMemo(() => {
    if (statusFilter === 'all') return filteredMirrors;
    return filteredMirrors.filter((m) => m.status === statusFilter);
  }, [filteredMirrors, statusFilter]);
  const groupedFiltered = useGroupedMirrors(statusFilteredMirrors);

  // 收藏镜像
  const { favorites } = useFavoriteStore();
  const favoriteMirrors = useMemo(
    () => mirrors.filter((m) => favorites.includes(m.id)),
    [mirrors, favorites]
  );

  // 统计数据
  const totalCount = mirrors.length;
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const syncedTodayCount = mirrors.filter((m) => {
    if (!m.lastUpdated) return false;
    const ts = Number(m.lastUpdated);
    if (isNaN(ts) || ts <= 0) return false;
    const ms = ts < 1e12 ? ts * 1000 : ts;
    return ms >= todayStart.getTime();
  }).length;
  const failedMirrors = mirrors.filter((m) => m.status === 'failed');
  const failedCount = failedMirrors.length;

  // 点击失败摘要 → 跳到第一个失败镜像所在字母组
  const handleFailedClick = () => {
    if (failedMirrors.length === 0) return;
    const firstLetter = failedMirrors[0].id[0]?.toUpperCase() ?? '';
    const el = document.getElementById(`group-${firstLetter}`);
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  };

  // 校园网/IPv6 状态指示
  const networkStat =
    campusStatus === '1'
      ? {
          icon: <WifiIcon />,
          label: locale === 'zh' ? '校园网加速' : 'Campus Network',
          dot: '#22C55E',
          tooltip: t('network.campus'),
        }
      : campusStatus === '6'
        ? { icon: <Ipv6Icon />, label: 'IPv6', dot: '#3B82F6', tooltip: t('network.ipv6') }
        : null;

  // 浮动通知状态（Snackbar）- 队列式显示，避免重叠
  const [showIpv6Snackbar, setShowIpv6Snackbar] = useState(false);
  const [showFailedSnackbar, setShowFailedSnackbar] = useState(false);
  const [ipv6Dismissed, setIpv6Dismissed] = useState(false);

  // IPv6 通知 - 30 分钟内只显示一次
  useEffect(() => {
    if (campusStatus === '6') {
      const key = 'ipv6_notif_ts';
      const last = Number(localStorage.getItem(key) ?? 0);
      const now = Date.now();
      if (now - last > 30 * 60 * 1000) {
        setShowIpv6Snackbar(true);
        setIpv6Dismissed(false);
        localStorage.setItem(key, String(now));
      }
    }
  }, [campusStatus]);

  // 同步失败通知 - 30 分钟内只显示一次，等 IPv6 提示消失后再显示，避免重叠
  useEffect(() => {
    if (!isLoading && failedCount > 0) {
      const key = 'sync_failed_notif_ts';
      const last = Number(localStorage.getItem(key) ?? 0);
      const now = Date.now();

      if (now - last > 30 * 60 * 1000) {
        // 如果 IPv6 提示正在显示，等待其消失后再显示失败提示
        if (showIpv6Snackbar) {
          const timer = setTimeout(() => {
            setShowFailedSnackbar(true);
            localStorage.setItem(key, String(now));
          }, 8500);
          return () => clearTimeout(timer);
        } else if (ipv6Dismissed || campusStatus !== '6') {
          setShowFailedSnackbar(true);
          localStorage.setItem(key, String(now));
        }
      }
    }
  }, [isLoading, failedCount, showIpv6Snackbar, ipv6Dismissed, campusStatus]);

  return (
    <>
      <Helmet>
        <title>JCUT Mirror - 开源软件镜像站</title>
        <meta
          name="description"
          content="JCUT Mirror - 高校开源软件镜像站，提供快速稳定的Linux发行版及开发工具镜像"
        />
        <meta property="og:type" content="website" />
        <meta property="og:title" content="JCUT Mirror - 开源软件镜像站" />
        <meta
          property="og:description"
          content="高校开源软件镜像站，提供快速稳定的Linux发行版及开发工具镜像"
        />
        <meta property="og:image" content="/favicon.svg" />
        <meta name="twitter:card" content="summary" />
        <meta name="twitter:title" content="JCUT Mirror" />
        <meta
          name="twitter:description"
          content="高校开源软件镜像站，提供快速稳定的Linux发行版及开发工具镜像"
        />
      </Helmet>

      {/* Hero 区域 */}
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
          {/* 公告/通知横幅 —— 从 public/announcements.json 读取，无需重新构建即可更新 */}
          <Box sx={{ mb: 3 }}>
            <AnnouncementBanner />
          </Box>
          <Box sx={{ maxWidth: 640 }}>
            {/* 网络状态胶囊 — 从 API 实时获取用户网络类型 */}
            {(() => {
              if (campusStatus === undefined) {
                return (
                  <Skeleton
                    variant="rounded"
                    width={110}
                    height={24}
                    sx={{ mb: 2, borderRadius: 6 }}
                  />
                );
              }
              const netConfig =
                campusStatus === '1'
                  ? {
                      icon: <WifiIcon sx={{ fontSize: 14 }} />,
                      label: locale === 'zh' ? '校园网' : 'Campus Network',
                      color: 'success' as const,
                      dot: '#22C55E',
                    }
                  : campusStatus === '6'
                    ? {
                        icon: <Ipv6Icon sx={{ fontSize: 14 }} />,
                        label: 'IPv6',
                        color: 'info' as const,
                        dot: '#3B82F6',
                      }
                    : {
                        icon: <WifiIcon sx={{ fontSize: 14 }} />,
                        label: locale === 'zh' ? '校外网络' : 'External Network',
                        color: 'default' as const,
                        dot: '#94A3B8',
                      };

              return (
                <Tooltip
                  title={
                    campusStatus === '1'
                      ? t('network.campus')
                      : campusStatus === '6'
                        ? t('network.ipv6')
                        : locale === 'zh'
                          ? '当前为校外网络，速度可能较慢'
                          : 'External network, speed may be limited'
                  }
                  placement="right"
                >
                  <Chip
                    icon={netConfig.icon}
                    label={netConfig.label}
                    color={netConfig.color}
                    size="small"
                    variant="outlined"
                    sx={{
                      mb: 2,
                      fontWeight: 700,
                      '& .MuiChip-icon': { color: netConfig.dot },
                      position: 'relative',
                      '& .net-dot': {
                        display: 'inline-block',
                        width: 7,
                        height: 7,
                        borderRadius: '50%',
                        bgcolor: netConfig.dot,
                        ml: 0.5,
                        animation:
                          campusStatus !== '0' ? 'net-pulse 2.4s ease-in-out infinite' : 'none',
                      },
                      '@keyframes net-pulse': {
                        '0%, 100%': { opacity: 1, transform: 'scale(1)' },
                        '50%': { opacity: 0.4, transform: 'scale(0.75)' },
                      },
                    }}
                  />
                </Tooltip>
              );
            })()}

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

            {/* 统计数据 —— 桌面显示图标+文字，移动端折叠成图标徽章 */}
            {(() => {
              const stats = [
                { icon: <StorageIcon />, label: t('home.totalMirrors', { count: totalCount }) },
                { icon: <SpeedIcon />, label: t('home.syncedToday', { count: syncedTodayCount }) },
                ...(window.location.protocol === 'https:'
                  ? [
                      {
                        icon: <SecurityIcon />,
                        label: locale === 'zh' ? 'HTTPS 加密传输' : 'HTTPS Encrypted',
                      },
                    ]
                  : []),
                ...(networkStat
                  ? [
                      {
                        icon: networkStat.icon,
                        label: networkStat.label,
                        dot: networkStat.dot,
                        tooltip: networkStat.tooltip,
                      },
                    ]
                  : []),
              ];
              return (
                <Box
                  sx={{
                    display: 'flex',
                    gap: { xs: 1, sm: 2 },
                    flexWrap: 'wrap',
                    alignItems: 'center',
                  }}
                >
                  {stats.map((item, i) => (
                    <Tooltip key={i} title={item.label} placement="top">
                      <Box
                        sx={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 0.6,
                          px: { xs: 1.2, sm: 0 },
                          py: { xs: 0.6, sm: 0 },
                          bgcolor: { xs: 'action.hover', sm: 'transparent' },
                          borderRadius: { xs: 6, sm: 0 },
                          color: 'text.secondary',
                          cursor: 'default',
                        }}
                      >
                        {cloneElement(item.icon as React.ReactElement, {
                          sx: { fontSize: { xs: 16, sm: 18 } },
                        })}
                        <Typography
                          variant="body2"
                          color="text.secondary"
                          fontWeight={500}
                          sx={{ display: { xs: 'none', sm: 'block' } }}
                        >
                          {item.label}
                        </Typography>
                      </Box>
                    </Tooltip>
                  ))}
                </Box>
              );
            })()}
          </Box>
        </Container>
      </Box>

      {/* IPv6 浮动通知 - 右上角，毛玻璃效果，淡入淡出，5 秒自动消失 */}
      <Snackbar
        open={showIpv6Snackbar}
        autoHideDuration={5000}
        onClose={() => {
          setShowIpv6Snackbar(false);
          setIpv6Dismissed(true);
        }}
        anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
        TransitionComponent={Fade}
        sx={{ mt: 9, mr: 2 }}
      >
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            minWidth: 300,
            maxWidth: 350,
            borderRadius: 1,
            // 毛玻璃效果
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            background: (theme) =>
              theme.palette.mode === 'dark' ? 'rgba(15, 23, 42, 0.7)' : 'rgba(255, 255, 255, 0.7)',
            border: (theme) =>
              theme.palette.mode === 'dark'
                ? '1px solid rgba(255, 255, 255, 0.1)'
                : '1px solid rgba(0, 0, 0, 0.05)',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)',
            // 左侧色条
            borderLeft: '3px solid #3B82F6',
            overflow: 'hidden',
            position: 'relative',
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, p: 1.5 }}>
            <InfoIcon sx={{ color: '#3B82F6', fontSize: 20 }} />
            <Typography variant="body2" sx={{ flex: 1, fontSize: '0.875rem' }}>
              {t('network.ipv6')}
            </Typography>
            <IconButton
              size="small"
              onClick={() => {
                setShowIpv6Snackbar(false);
                setIpv6Dismissed(true);
              }}
              sx={{ p: 0.5 }}
            >
              <CloseIcon sx={{ fontSize: 18 }} />
            </IconButton>
          </Box>
          {/* 底部进度条 */}
          <Box
            sx={{
              height: 3,
              bgcolor: (theme) =>
                theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)',
              position: 'relative',
              overflow: 'hidden',
              '&::after': {
                content: '""',
                position: 'absolute',
                left: 0,
                top: 0,
                height: '100%',
                width: '100%',
                bgcolor: '#3B82F6',
                animation: 'progress-5s 5s linear',
                '@keyframes progress-5s': {
                  '0%': { transform: 'translateX(0)' },
                  '100%': { transform: 'translateX(-100%)' },
                },
              },
            }}
          />
        </Box>
      </Snackbar>

      {/* 同步失败浮动通知 - 右上角，毛玻璃效果，淡入淡出，5 秒自动消失 */}
      <Snackbar
        open={showFailedSnackbar}
        autoHideDuration={5000}
        onClose={() => setShowFailedSnackbar(false)}
        anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
        TransitionComponent={Fade}
        sx={{ mt: 9, mr: 2 }}
      >
        <Box
          onClick={handleFailedClick}
          sx={{
            display: 'flex',
            flexDirection: 'column',
            minWidth: 300,
            maxWidth: 350,
            borderRadius: 1,
            cursor: 'pointer',
            // 毛玻璃效果
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            background: (theme) =>
              theme.palette.mode === 'dark' ? 'rgba(15, 23, 42, 0.7)' : 'rgba(255, 255, 255, 0.7)',
            border: (theme) =>
              theme.palette.mode === 'dark'
                ? '1px solid rgba(255, 255, 255, 0.1)'
                : '1px solid rgba(0, 0, 0, 0.05)',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)',
            // 左侧色条
            borderLeft: '3px solid #F59E0B',
            overflow: 'hidden',
            position: 'relative',
            '&:hover': {
              background: (theme) =>
                theme.palette.mode === 'dark'
                  ? 'rgba(15, 23, 42, 0.8)'
                  : 'rgba(255, 255, 255, 0.8)',
            },
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, p: 1.5 }}>
            <WarningIcon sx={{ color: '#F59E0B', fontSize: 20 }} />
            <Typography variant="body2" sx={{ flex: 1, fontSize: '0.875rem' }}>
              {locale === 'zh'
                ? `${failedCount} 个镜像同步失败，点击查看 →`
                : `${failedCount} mirror${failedCount > 1 ? 's' : ''} failed to sync — click to view →`}
            </Typography>
            <IconButton
              size="small"
              onClick={(e) => {
                e.stopPropagation();
                setShowFailedSnackbar(false);
              }}
              sx={{ p: 0.5 }}
            >
              <CloseIcon sx={{ fontSize: 18 }} />
            </IconButton>
          </Box>
          {/* 底部进度条 */}
          <Box
            sx={{
              height: 3,
              bgcolor: (theme) =>
                theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)',
              position: 'relative',
              overflow: 'hidden',
              '&::after': {
                content: '""',
                position: 'absolute',
                left: 0,
                top: 0,
                height: '100%',
                width: '100%',
                bgcolor: '#F59E0B',
                animation: 'progress-5s 5s linear',
                '@keyframes progress-5s': {
                  '0%': { transform: 'translateX(0)' },
                  '100%': { transform: 'translateX(-100%)' },
                },
              },
            }}
          />
        </Box>
      </Snackbar>

      <Container maxWidth="lg" sx={{ py: { xs: 4, md: 6 } }}>
        {/* 常用镜像 + 最新动态（无搜索时显示） */}
        {!searchQuery &&
          (() => {
            // 同步读取新闻列表，决定布局
            const newsList = getNewsList();
            const hasNews = newsList.length > 0;
            // 有新闻时左侧显示 6 个（留出右侧列给新闻），无新闻时恢复 8 个
            const mirrorCount = hasNews ? 6 : 8;
            return (
              <Box sx={{ mb: 6 }}>
                <Grid container spacing={3} alignItems="flex-start">
                  {/* 新闻列 —— 移动端通过 order:-1 排到镜像上方，桌面端还原到右侧 */}
                  {hasNews && (
                    <Grid size={{ xs: 12, lg: 3 }} sx={{ order: { xs: -1, lg: 1 } }}>
                      <Typography variant="h5" fontWeight={700} sx={{ mb: 3 }}>
                        {locale === 'zh' ? '最新动态' : 'News'}
                      </Typography>
                      <NewsWidget />
                    </Grid>
                  )}

                  {/* 常用镜像列 —— 有新闻时桌面 9 列，无新闻时全宽 */}
                  <Grid size={{ xs: 12, lg: hasNews ? 9 : 12 }} sx={{ order: { xs: 1, lg: 0 } }}>
                    <Typography variant="h5" fontWeight={700} sx={{ mb: 3 }}>
                      {t('home.popularMirrors')}
                    </Typography>
                    {isLoading ? (
                      <Grid container spacing={2}>
                        {[...Array(mirrorCount)].map((_, i) => (
                          <Grid key={i} size={{ xs: 12, sm: 6, md: hasNews ? 4 : 3 }}>
                            <Skeleton variant="rectangular" height={160} sx={{ borderRadius: 2 }} />
                          </Grid>
                        ))}
                      </Grid>
                    ) : (
                      <Grid container spacing={2}>
                        {popularMirrors.slice(0, mirrorCount).map((mirror) => (
                          <Grid key={mirror.id} size={{ xs: 12, sm: 6, md: hasNews ? 4 : 3 }}>
                            <MirrorCard mirror={mirror} />
                          </Grid>
                        ))}
                      </Grid>
                    )}
                  </Grid>
                </Grid>
              </Box>
            );
          })()}

        {/* ── 收藏镜像区 —— 有收藏且未在搜索时显示 ── */}
        {!searchQuery && favoriteMirrors.length > 0 && (
          <Box sx={{ mb: 6 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
              <StarIcon sx={{ color: 'warning.main', fontSize: '1.3rem' }} />
              <Typography variant="h5" fontWeight={700}>
                {t('favorites.title')}
              </Typography>
              <Chip
                label={favoriteMirrors.length}
                size="small"
                color="warning"
                variant="outlined"
                sx={{ fontWeight: 700, height: 20, fontSize: '0.72rem' }}
              />
            </Box>
            <Grid container spacing={2}>
              {favoriteMirrors.map((mirror) => (
                <Grid key={mirror.id} size={{ xs: 12, sm: 6, md: 3 }}>
                  <MirrorCard mirror={mirror} />
                </Grid>
              ))}
            </Grid>
          </Box>
        )}

        {/* 所有镜像列表 */}
        <Box id="mirrors">
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              mb: 2,
              flexWrap: 'wrap',
              gap: 1,
            }}
          >
            <Typography variant="h5" fontWeight={700}>
              {searchQuery
                ? t('search.results', { count: statusFilteredMirrors.length })
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

          {/* 状态过滤器 */}
          {!isLoading && (
            <Box sx={{ mb: 2 }}>
              <ToggleButtonGroup
                value={statusFilter}
                exclusive
                onChange={(_, v) => v && setStatusFilter(v)}
                size="small"
                aria-label={locale === 'zh' ? '按状态过滤' : 'Filter by status'}
                sx={{
                  flexWrap: 'wrap',
                  gap: 0.5,
                  '& .MuiToggleButton-root': {
                    borderRadius: '6px !important',
                    border: '1px solid !important',
                    borderColor: 'divider !important',
                    px: 1.5,
                    py: 0.4,
                    fontSize: '0.78rem',
                    fontWeight: 600,
                    textTransform: 'none',
                    '&.Mui-selected': { borderColor: 'primary.main !important' },
                  },
                }}
              >
                <ToggleButton value="all">
                  {t('filter.all')}
                  <Chip
                    label={filteredMirrors.length}
                    size="small"
                    sx={{
                      ml: 0.8,
                      height: 18,
                      fontSize: '0.68rem',
                      fontWeight: 700,
                      pointerEvents: 'none',
                    }}
                  />
                </ToggleButton>
                {(
                  [
                    'succeeded',
                    'failed',
                    'syncing',
                    'cached',
                    'paused',
                    'unknown',
                  ] as MirrorStatus[]
                ).map((s) => {
                  const count = filteredMirrors.filter((m) => m.status === s).length;
                  if (count === 0) return null;
                  const colorMap: Record<
                    MirrorStatus,
                    'success' | 'error' | 'info' | 'default' | 'warning'
                  > = {
                    succeeded: 'success',
                    failed: 'error',
                    syncing: 'info',
                    cached: 'default',
                    paused: 'warning',
                    unknown: 'default',
                  };
                  return (
                    <ToggleButton key={s} value={s}>
                      {t(`filter.${s}`)}
                      <Chip
                        label={count}
                        size="small"
                        color={colorMap[s]}
                        sx={{
                          ml: 0.8,
                          height: 18,
                          fontSize: '0.68rem',
                          fontWeight: 700,
                          pointerEvents: 'none',
                        }}
                      />
                    </ToggleButton>
                  );
                })}
              </ToggleButtonGroup>
            </Box>
          )}

          {/* 加载失败 */}
          {error && (
            <Paper variant="outlined" sx={{ p: 3, textAlign: 'center', borderRadius: 2, mb: 3 }}>
              <Typography color="error" gutterBottom>
                {t('error.loadFailed')}
              </Typography>
              <Button variant="contained" size="small" onClick={() => refetch()}>
                {t('error.retry')}
              </Button>
            </Paper>
          )}

          {/* 字母分组索引导航 */}
          {!isLoading && Object.keys(groupedFiltered).length > 0 && (
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
              {Object.keys(groupedFiltered)
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
            grouped={groupedFiltered}
            loading={isLoading}
            error={error ? String(error) : undefined}
          />
        </Box>
      </Container>
    </>
  );
};

export default Home;
