// src/pages/NewsListPage.tsx
// 新闻列表页 /news

import { ArrowForward as ArrowIcon } from '@mui/icons-material';
import {
    Box, Container, Typography, Chip, Divider,
    Breadcrumbs, Link,
} from '@mui/material';
import React, { useMemo } from 'react';
import { Helmet } from 'react-helmet-async';
import { useNavigate, Link as RouterLink } from 'react-router-dom';

import { getNewsList } from '@/news';

import { useLocaleStore } from '../stores/mirrorStore';

const NewsListPage: React.FC = () => {
    const navigate = useNavigate();
    const { locale } = useLocaleStore();
    const news = useMemo(() => getNewsList(), []);

    const title = locale === 'zh' ? '新闻动态 - JCUT Mirror' : 'News - JCUT Mirror';

    return (
        <>
            <Helmet><title>{title}</title></Helmet>

            <Container maxWidth="md" sx={{ py: { xs: 3, md: 5 } }}>
                <Breadcrumbs sx={{ mb: 3 }}>
                    <Link component={RouterLink} to="/" underline="hover" color="text.secondary">
                        {locale === 'zh' ? '首页' : 'Home'}
                    </Link>
                    <Typography color="text.primary" fontWeight={500}>
                        {locale === 'zh' ? '新闻动态' : 'News'}
                    </Typography>
                </Breadcrumbs>

                <Typography variant="h4" fontWeight={800} sx={{ mb: 0.5 }}>
                    {locale === 'zh' ? '新闻动态' : 'Latest News'}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 4 }}>
                    {locale === 'zh'
                        ? '镜像站最新动态、维护通知与服务升级公告'
                        : 'Mirror service updates, maintenance notices and announcements'}
                </Typography>

                <Box>
                    {news.map((item, idx) => (
                        <React.Fragment key={item.slug}>
                            <Box
                                onClick={() => navigate(`/news/${item.slug}`)}
                                sx={{
                                    py: 2.5, cursor: 'pointer',
                                    display: 'flex', alignItems: 'flex-start',
                                    justifyContent: 'space-between', gap: 2,
                                    '&:hover .news-title': { color: 'primary.main' },
                                    '&:hover .news-arrow': { opacity: 1, transform: 'translateX(3px)' },
                                }}
                            >
                                <Box sx={{ flex: 1, minWidth: 0 }}>
                                    {/* 日期 + 标签行 */}
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.8, flexWrap: 'wrap' }}>
                                        <Typography
                                            variant="caption"
                                            color="text.disabled"
                                            fontFamily='"JetBrains Mono", monospace'
                                        >
                                            {item.date}
                                        </Typography>
                                        {item.tags?.map(tag => (
                                            <Chip
                                                key={tag}
                                                label={tag}
                                                size="small"
                                                sx={{
                                                    height: 18, fontSize: '0.65rem',
                                                    '& .MuiChip-label': { px: 0.8 },
                                                }}
                                            />
                                        ))}
                                    </Box>

                                    {/* 标题 */}
                                    <Typography
                                        className="news-title"
                                        variant="h6"
                                        fontWeight={700}
                                        sx={{
                                            fontSize: { xs: '1rem', md: '1.1rem' },
                                            mb: 0.5,
                                            transition: 'color 0.15s',
                                        }}
                                    >
                                        {locale === 'zh' ? item.title : (item.titleEn ?? item.title)}
                                    </Typography>

                                    {/* 摘要 */}
                                    <Typography
                                        variant="body2"
                                        color="text.secondary"
                                        sx={{ lineHeight: 1.6, maxWidth: 600 }}
                                    >
                                        {locale === 'zh' ? item.summary : (item.summaryEn ?? item.summary)}
                                    </Typography>
                                </Box>

                                {/* 箭头 */}
                                <ArrowIcon
                                    className="news-arrow"
                                    sx={{
                                        color: 'primary.main', mt: 0.5, flexShrink: 0,
                                        opacity: 0, transition: 'opacity 0.15s, transform 0.15s',
                                    }}
                                />
                            </Box>
                            {idx < news.length - 1 && <Divider />}
                        </React.Fragment>
                    ))}

                    {news.length === 0 && (
                        <Typography color="text.secondary" sx={{ py: 4, textAlign: 'center' }}>
                            {locale === 'zh' ? '暂无新闻' : 'No news yet'}
                        </Typography>
                    )}
                </Box>
            </Container>
        </>
    );
};

export default NewsListPage;
