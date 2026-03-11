// src/pages/NewsDetailPage.tsx
// 新闻详情页 /news/:slug

import { ArrowBack as BackIcon } from '@mui/icons-material';
import {
    Box, Container, Typography, Chip, Divider,
    Breadcrumbs, Link, Button, CircularProgress, Alert,
} from '@mui/material';
import React, { useEffect, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { useParams, useNavigate, Link as RouterLink } from 'react-router-dom';

import { MDXProvider } from '@mdx-js/react';
import CodeBlock from '../components/docs/CodeBlock';
import { loadNewsArticle, getNewsItem } from '@/news';
import { useLocaleStore } from '../stores/mirrorStore';

// MUI 组件映射（与 DocViewer 保持一致）
const mdxComponents = {
    h1: ({ children }: { children: React.ReactNode }) => (
        <Typography variant="h4" sx={{ mt: 3, mb: 1.5, fontWeight: 700 }}>{children}</Typography>
    ),
    h2: ({ children }: { children: React.ReactNode }) => (
        <Typography variant="h5" sx={{ mt: 3, mb: 1.5, fontWeight: 700, pt: 1, borderTop: '2px solid', borderColor: 'primary.main' }}>{children}</Typography>
    ),
    h3: ({ children }: { children: React.ReactNode }) => (
        <Typography variant="h6" sx={{ mt: 2, mb: 1, fontWeight: 600 }}>{children}</Typography>
    ),
    p: ({ children }: { children: React.ReactNode }) => (
        <Typography variant="body1" sx={{ mb: 1.5, lineHeight: 1.8 }}>{children}</Typography>
    ),
    a: ({ href, children }: { href?: string; children: React.ReactNode }) => (
        <Link href={href} target="_blank" rel="noopener noreferrer" underline="hover" color="primary">
            {children}
        </Link>
    ),
    code: ({ className, children }: { className?: string; children: React.ReactNode }) => {
        const match = /language-(\w+)/.exec(className || '');
        const isInline = !match && !className;
        return (
            <CodeBlock language={match ? match[1] : 'bash'} inline={isInline}>
                {String(children).replace(/\n$/, '')}
            </CodeBlock>
        );
    },
    table: ({ children }: { children: React.ReactNode }) => (
        <Box sx={{ overflowX: 'auto', mb: 2 }}>
            <table style={{ borderCollapse: 'collapse', width: '100%' }}>{children}</table>
        </Box>
    ),
    th: ({ children }: { children: React.ReactNode }) => (
        <th style={{ padding: '8px 12px', textAlign: 'left', borderBottom: '2px solid', fontWeight: 700 }}>{children}</th>
    ),
    td: ({ children }: { children: React.ReactNode }) => (
        <td style={{ padding: '8px 12px', borderBottom: '1px solid rgba(0,0,0,0.08)' }}>{children}</td>
    ),
    hr: () => <Divider sx={{ my: 3 }} />,
    blockquote: ({ children }: { children: React.ReactNode }) => (
        <Box sx={{ borderLeft: '3px solid', borderColor: 'primary.main', pl: 2, my: 2, color: 'text.secondary' }}>
            {children}
        </Box>
    ),
};

const NewsDetailPage: React.FC = () => {
    const { slug } = useParams<{ slug: string }>();
    const navigate = useNavigate();
    const { locale } = useLocaleStore();

    const meta = slug ? getNewsItem(slug) : undefined;
    const [ArticleComponent, setArticleComponent] = useState<React.FC | null>(null);
    const [loading, setLoading] = useState(true);
    const [notFound, setNotFound] = useState(false);

    useEffect(() => {
        if (!slug) { setNotFound(true); setLoading(false); return; }
        setLoading(true);
        loadNewsArticle(slug).then(comp => {
            if (comp) setArticleComponent(() => comp);
            else setNotFound(true);
            setLoading(false);
        });
    }, [slug]);

    const displayTitle = meta
        ? (locale === 'zh' ? meta.title : (meta.titleEn ?? meta.title))
        : (locale === 'zh' ? '新闻详情' : 'News');

    const pageTitle = `${displayTitle} - JCUT Mirror`;

    if (notFound) {
        return (
            <Container maxWidth="md" sx={{ py: 5 }}>
                <Alert severity="error" action={
                    <Button color="inherit" size="small" onClick={() => navigate('/news')}>
                        {locale === 'zh' ? '返回列表' : 'Back'}
                    </Button>
                }>
                    {locale === 'zh' ? '新闻不存在' : 'News article not found'}
                </Alert>
            </Container>
        );
    }

    return (
        <>
            <Helmet><title>{pageTitle}</title></Helmet>

            <Container maxWidth="md" sx={{ py: { xs: 3, md: 5 } }}>
                {/* 面包屑 */}
                <Breadcrumbs sx={{ mb: 3 }}>
                    <Link component={RouterLink} to="/" underline="hover" color="text.secondary">
                        {locale === 'zh' ? '首页' : 'Home'}
                    </Link>
                    <Link component={RouterLink} to="/news" underline="hover" color="text.secondary">
                        {locale === 'zh' ? '新闻动态' : 'News'}
                    </Link>
                    <Typography color="text.primary" fontWeight={500} noWrap sx={{ maxWidth: 200 }}>
                        {displayTitle}
                    </Typography>
                </Breadcrumbs>

                <Button
                    startIcon={<BackIcon />}
                    onClick={() => navigate('/news')}
                    size="small"
                    sx={{ mb: 3, color: 'text.secondary' }}
                >
                    {locale === 'zh' ? '返回列表' : 'Back to News'}
                </Button>

                {loading ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
                        <CircularProgress />
                    </Box>
                ) : (
                    <>
                        {/* 文章头部元信息 */}
                        {meta && (
                            <Box sx={{ mb: 4 }}>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5, flexWrap: 'wrap' }}>
                                    <Typography
                                        variant="caption"
                                        color="text.disabled"
                                        fontFamily='"JetBrains Mono", monospace'
                                    >
                                        {meta.date}
                                    </Typography>
                                    {meta.tags?.map(tag => (
                                        <Chip key={tag} label={tag} size="small" sx={{ height: 20, fontSize: '0.65rem', '& .MuiChip-label': { px: 0.8 } }} />
                                    ))}
                                </Box>

                                <Typography variant="h3" fontWeight={800} sx={{ mb: 1.5, fontSize: { xs: '1.6rem', md: '2rem' } }}>
                                    {displayTitle}
                                </Typography>

                                <Typography variant="body1" color="text.secondary" sx={{ lineHeight: 1.7 }}>
                                    {locale === 'zh' ? meta.summary : (meta.summaryEn ?? meta.summary)}
                                </Typography>

                                <Divider sx={{ mt: 3 }} />
                            </Box>
                        )}

                        {/* MDX 正文 */}
                        {ArticleComponent && (
                            <MDXProvider components={mdxComponents as unknown as Record<string, React.ComponentType>}>
                                <ArticleComponent />
                            </MDXProvider>
                        )}
                    </>
                )}
            </Container>
        </>
    );
};

export default NewsDetailPage;