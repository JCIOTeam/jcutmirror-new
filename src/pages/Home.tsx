// src/pages/Home.tsx
// 首页

import {
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
  LinearProgress,
  IconButton,
} from '@mui/material';
import React, { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import RefreshButton from '../components/common/RefreshButton';
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
  sortedGroupKeys,
} from '../hooks/useMirrors';
import { useMirrorSearchStore, useFavoriteStore } from '../stores/mirrorStore';
import type { Mirror } from '../types';

import { getNewsList } from '@/news';
import { SITE_ORIGIN, SITE_TITLE_ZH, KEYWORDS_ZH, DESC_ZH, canonicalUrl } from '@/utils/seo';
import { safeGetItem, safeSetItem } from '@/utils/storage';

/**
 * 首页 - 展示镜像站概览
 */
const Home: React.FC = () => {
  const { t } = useTranslation();
  const { searchQuery } = useMirrorSearchStore();

  // 获取数据
  const { data: mirrors = [], isLoading, isFetching, error, refetch } = useMirrors();
  const { data: campusStatus } = useCampusNetwork();

  // 过滤和分组
  const filteredMirrors = useFilteredMirrors(mirrors);
  const groupedMirrors = useGroupedMirrors(filteredMirrors);
  const popularMirrors = usePopularMirrors(mirrors, 8);

  // 收藏镜像 — 按收藏先后顺序排列（favorites 数组保留了添加时序）
  const { favorites } = useFavoriteStore();
  const favoriteMirrors = useMemo(() => {
    const mirrorMap = new Map(mirrors.map((m) => [m.id, m]));
    return favorites.map((id) => mirrorMap.get(id)).filter((m): m is Mirror => m !== undefined);
  }, [mirrors, favorites]);

  // 新闻列表 —— 同步读取一次（import.meta.glob 静态分析），用 useMemo 防止每次 render 重算
  const newsList = useMemo(() => getNewsList(), []);
  const hasNews = newsList.length > 0;
  const mirrorCount = hasNews ? 6 : 8;

  // 统计数据
  const totalCount = mirrors.length;
  const { syncedTodayCount, failedMirrors, failedCount } = useMemo(() => {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const synced = mirrors.filter((m) => {
      if (!m.lastUpdated) return false;
      const ts = Number(m.lastUpdated);
      if (isNaN(ts) || ts <= 0) return false;
      const ms = ts < 1e12 ? ts * 1000 : ts;
      return ms >= todayStart.getTime();
    }).length;
    const failed = mirrors.filter((m) => m.status === 'failed');
    return { syncedTodayCount: synced, failedMirrors: failed, failedCount: failed.length };
  }, [mirrors]);

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
          icon: <WifiIcon sx={{ fontSize: { xs: 16, sm: 18 } }} />,
          label: t('network.campusLabel'),
          dot: '#22C55E',
          tooltip: t('network.campus'),
        }
      : campusStatus === '6'
        ? {
            icon: <Ipv6Icon sx={{ fontSize: { xs: 16, sm: 18 } }} />,
            label: 'IPv6',
            dot: '#3B82F6',
            tooltip: t('network.ipv6'),
          }
        : null;

  // 浮动通知状态（Snackbar）- 队列式显示，避免重叠
  const [showIpv6Snackbar, setShowIpv6Snackbar] = useState(false);
  const [showFailedSnackbar, setShowFailedSnackbar] = useState(false);
  const [ipv6Dismissed, setIpv6Dismissed] = useState(false);

  // IPv6 通知 - 30 分钟内只显示一次
  useEffect(() => {
    if (campusStatus === '6') {
      const key = 'ipv6_notif_ts';
      const last = Number(safeGetItem(key) ?? 0);
      const now = Date.now();
      if (now - last > 30 * 60 * 1000) {
        setShowIpv6Snackbar(true);
        setIpv6Dismissed(false);
        safeSetItem(key, String(now));
      }
    }
  }, [campusStatus]);

  // 同步失败通知 - 30 分钟内只显示一次，等 IPv6 提示消失后再显示，避免重叠
  useEffect(() => {
    if (!isLoading && failedCount > 0) {
      const key = 'sync_failed_notif_ts';
      const last = Number(safeGetItem(key) ?? 0);
      const now = Date.now();

      if (now - last > 30 * 60 * 1000) {
        // 如果 IPv6 提示正在显示，等待其消失后再显示失败提示
        if (showIpv6Snackbar) {
          const timer = setTimeout(() => {
            setShowFailedSnackbar(true);
            safeSetItem(key, String(now));
          }, 8500);
          return () => clearTimeout(timer);
        } else if (ipv6Dismissed || campusStatus !== '6') {
          setShowFailedSnackbar(true);
          safeSetItem(key, String(now));
        }
      }
    }
  }, [isLoading, failedCount, showIpv6Snackbar, ipv6Dismissed, campusStatus]);

  return (
    <>
      <title>{SITE_TITLE_ZH} - JCUT Mirror</title>
      <meta name="description" content={DESC_ZH} />
      <meta name="keywords" content={KEYWORDS_ZH} />
      <link rel="canonical" href={canonicalUrl('/')} />
      <meta property="og:type" content="website" />
      <meta property="og:title" content={`${SITE_TITLE_ZH} - JCUT Mirror`} />
      <meta property="og:description" content={DESC_ZH} />
      <meta property="og:url" content={canonicalUrl('/')} />
      <meta property="og:image" content={`${SITE_ORIGIN}/favicon.svg`} />
      <meta name="twitter:card" content="summary" />
      <meta name="twitter:title" content={`${SITE_TITLE_ZH} - JCUT Mirror`} />
      <meta name="twitter:description" content={DESC_ZH} />
      {/* Hero 区域 */}
      <Box
        sx={{
          // 多层径向渐变叠加：左上蓝光 + 右下紫光 + 纯底色，无方格干扰
          background: (theme) =>
            theme.palette.mode === 'dark'
              ? [
                  'radial-gradient(ellipse 70% 55% at 15% 25%, rgba(59,130,246,0.13) 0%, transparent 65%)',
                  'radial-gradient(ellipse 55% 45% at 85% 75%, rgba(139,92,246,0.10) 0%, transparent 65%)',
                  '#0F172A',
                ].join(', ')
              : [
                  'radial-gradient(ellipse 70% 55% at 15% 25%, rgba(59,130,246,0.11) 0%, transparent 65%)',
                  'radial-gradient(ellipse 55% 45% at 85% 75%, rgba(139,92,246,0.07) 0%, transparent 65%)',
                  '#F8FAFF',
                ].join(', '),
          pt: { xs: 5, md: 8 },
          pb: { xs: 5, md: 8 },
          position: 'relative',
          overflow: 'hidden',
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
                      label: t('network.campusChip'),
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
                        label: t('network.externalLabel'),
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
                        : t('network.external')
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
              sx={{
                color: 'text.secondary',
                mb: 2,
                fontWeight: 400,
                fontSize: { xs: '1rem', md: '1.25rem' },
              }}
            >
              {t('home.hero.subtitle')}
            </Typography>

            <Typography
              variant="body1"
              sx={{
                color: 'text.secondary',
                mb: 3,
                lineHeight: 1.8,
                maxWidth: 520,
              }}
            >
              {t('home.hero.description')}
            </Typography>

            {/* 统计数据 —— 桌面显示图标+文字，移动端折叠成图标徽章 */}
            {(() => {
              const iconSx = { fontSize: { xs: 16, sm: 18 } };
              const stats = [
                {
                  icon: <StorageIcon sx={iconSx} />,
                  label: t('home.totalMirrors', { count: totalCount }),
                },
                {
                  icon: <SpeedIcon sx={iconSx} />,
                  label: t('home.syncedToday', { count: syncedTodayCount }),
                },
                ...(typeof window !== 'undefined' && window.location.protocol === 'https:'
                  ? [
                      {
                        icon: <SecurityIcon sx={iconSx} />,
                        label: t('network.https'),
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
                        {item.icon}
                        <Typography
                          variant="body2"
                          sx={{
                            color: 'text.secondary',
                            fontWeight: 500,
                            display: { xs: 'none', sm: 'block' },
                          }}
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
        sx={{ mt: 9, mr: 2 }}
        slots={{
          transition: Fade,
        }}
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
        sx={{ mt: 9, mr: 2 }}
        slots={{
          transition: Fade,
        }}
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
              {t('home.failedSnackbar', { count: failedCount })}
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
        {!searchQuery && (
          <Box sx={{ mb: 6 }}>
            <Grid
              container
              spacing={3}
              sx={{
                alignItems: 'flex-start',
              }}
            >
              {/* 新闻列 —— 移动端通过 order:-1 排到镜像上方，桌面端还原到右侧 */}
              {hasNews && (
                <Grid size={{ xs: 12, lg: 3 }} sx={{ order: { xs: -1, lg: 1 } }}>
                  <Typography
                    variant="h5"
                    sx={{
                      fontWeight: 700,
                      mb: 3,
                    }}
                  >
                    {t('home.news')}
                  </Typography>
                  <NewsWidget />
                </Grid>
              )}

              {/* 常用镜像列 —— 有新闻时桌面 9 列，无新闻时全宽 */}
              <Grid size={{ xs: 12, lg: hasNews ? 9 : 12 }} sx={{ order: { xs: 1, lg: 0 } }}>
                <Typography
                  variant="h5"
                  sx={{
                    fontWeight: 700,
                    mb: 3,
                  }}
                >
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
        )}

        {/* ── 收藏镜像区 —— 有收藏且未在搜索时显示 ── */}
        {!searchQuery && favoriteMirrors.length > 0 && (
          <Box sx={{ mb: 6 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
              <StarIcon sx={{ color: 'warning.main', fontSize: '1.3rem' }} />
              <Typography
                variant="h5"
                sx={{
                  fontWeight: 700,
                }}
              >
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
            <Typography
              variant="h5"
              sx={{
                fontWeight: 700,
              }}
            >
              {searchQuery
                ? t('search.results', { count: filteredMirrors.length })
                : t('home.allMirrors')}
            </Typography>

            {/* 刷新按钮 */}
            <RefreshButton onClick={() => refetch()} />
          </Box>

          {/* 刷新进度条——仅在后台 refetch 时（非首次加载）显示 */}
          <LinearProgress
            sx={{
              mb: 1.5,
              borderRadius: 1,
              height: 3,
              opacity: isFetching && !isLoading ? 1 : 0,
              transition: 'opacity 0.3s',
            }}
          />

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
              role="navigation"
              aria-label={t('home.allMirrors')}
            >
              {sortedGroupKeys(groupedMirrors).map((letter) => (
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
          <Box
            sx={{
              opacity: isFetching && !isLoading ? 0.55 : 1,
              pointerEvents: isFetching && !isLoading ? 'none' : 'auto',
              transition: 'opacity 0.25s',
            }}
          >
            <MirrorList
              grouped={groupedMirrors}
              loading={isLoading}
              error={error ? String(error) : undefined}
            />
          </Box>
        </Box>
      </Container>
    </>
  );
};

export default Home;
