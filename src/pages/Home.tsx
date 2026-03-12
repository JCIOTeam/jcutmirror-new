// src/pages/Home.tsx
// 首页

import {
    Refresh as RefreshIcon,
    Storage as StorageIcon,
    Speed as SpeedIcon,
    Security as SecurityIcon,
    Wifi as WifiIcon,
    WifiTethering as Ipv6Icon,
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
    Tooltip,
} from '@mui/material';
import React, { useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { useTranslation } from 'react-i18next';

import { getNewsList } from '@/news';

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

    // 校园网/IPv6 状态指示
    const networkStat =
        campusStatus === '1'
            ? { icon: <WifiIcon />, label: locale === 'zh' ? '校园网加速' : 'Campus Network', dot: '#22C55E', tooltip: t('network.campus') }
            : campusStatus === '6'
                ? { icon: <Ipv6Icon />, label: 'IPv6', dot: '#3B82F6', tooltip: t('network.ipv6') }
                : null;

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
                                    ? { icon: <WifiIcon sx={{ fontSize: 14 }} />, label: locale === 'zh' ? '校园网' : 'Campus Network', color: 'success' as const, dot: '#22C55E' }
                                    : campusStatus === '6'
                                        ? { icon: <Ipv6Icon sx={{ fontSize: 14 }} />, label: 'IPv6', color: 'info' as const, dot: '#3B82F6' }
                                        : { icon: <WifiIcon sx={{ fontSize: 14 }} />, label: locale === 'zh' ? '校外网络' : 'External Network', color: 'default' as const, dot: '#94A3B8' };

                            return (
                                <Tooltip
                                    title={
                                        campusStatus === '1' ? t('network.campus')
                                            : campusStatus === '6' ? t('network.ipv6')
                                                : (locale === 'zh' ? '当前为校外网络，速度可能较慢' : 'External network, speed may be limited')
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
                                                animation: campusStatus !== '0'
                                                    ? 'net-pulse 2.4s ease-in-out infinite'
                                                    : 'none',
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
                                { icon: <SpeedIcon />, label: t('home.syncedToday', { count: succeededCount }) },
                                ...(window.location.protocol === 'https:' ? [{ icon: <SecurityIcon />, label: locale === 'zh' ? 'HTTPS 加密传输' : 'HTTPS Encrypted' }] : []),
                                ...(networkStat ? [{ icon: networkStat.icon, label: networkStat.label, dot: networkStat.dot, tooltip: networkStat.tooltip }] : []),
                            ];
                            return (
                                <Box sx={{ display: 'flex', gap: { xs: 1, sm: 2 }, flexWrap: 'wrap', alignItems: 'center' }}>
                                    {stats.map((item, i) => (
                                        <Tooltip key={i} title={item.label} placement="top">
                                            <Box sx={{
                                                display: 'flex', alignItems: 'center', gap: 0.6,
                                                px: { xs: 1.2, sm: 0 },
                                                py: { xs: 0.6, sm: 0 },
                                                bgcolor: { xs: 'action.hover', sm: 'transparent' },
                                                borderRadius: { xs: 6, sm: 0 },
                                                color: 'text.secondary',
                                                cursor: 'default',
                                            }}>
                                                {React.cloneElement(item.icon as React.ReactElement, { sx: { fontSize: { xs: 16, sm: 18 } } })}
                                                <Typography variant="body2" color="text.secondary" fontWeight={500}
                                                            sx={{ display: { xs: 'none', sm: 'block' } }}>
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

            <Container maxWidth="lg" sx={{ py: { xs: 4, md: 6 } }}>
                {/* 常用镜像 + 最新动态（无搜索时显示） */}
                {!searchQuery && (() => {
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
                                    <Grid
                                        size={{ xs: 12, lg: 3 }}
                                        sx={{ order: { xs: -1, lg: 1 } }}
                                    >
                                        <Typography variant="h5" fontWeight={700} sx={{ mb: 3 }}>
                                            {locale === 'zh' ? '最新动态' : 'News'}
                                        </Typography>
                                        <NewsWidget />
                                    </Grid>
                                )}

                                {/* 常用镜像列 —— 有新闻时桌面 9 列，无新闻时全宽 */}
                                <Grid
                                    size={{ xs: 12, lg: hasNews ? 9 : 12 }}
                                    sx={{ order: { xs: 1, lg: 0 } }}
                                >
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
