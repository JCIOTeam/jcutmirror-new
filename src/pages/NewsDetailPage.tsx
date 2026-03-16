// src/pages/NewsDetailPage.tsx
// 新闻详情页 /news/:slug

import { MDXProvider } from '@mdx-js/react';
import { ArrowBack as BackIcon } from '@mui/icons-material';
import {
  Box,
  Container,
  Typography,
  Chip,
  Divider,
  Breadcrumbs,
  Link,
  Button,
  Alert,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
} from '@mui/material';
import React from 'react';
import { Helmet } from 'react-helmet-async';
import { useParams, useNavigate, Link as RouterLink } from 'react-router-dom';

import CodeBlock from '../components/docs/CodeBlock';
import { useLocaleStore } from '../stores/mirrorStore';

import { getNewsArticle, getNewsItem } from '@/news';

// MUI 组件映射
// 表格使用 MUI Table 组件，保证主题色正确、暗色模式正常
const mdxComponents = {
  h1: ({ children }: { children: React.ReactNode }) => (
    <Typography variant="h4" sx={{ mt: 3, mb: 1.5, fontWeight: 700 }}>
      {children}
    </Typography>
  ),
  h2: ({ children }: { children: React.ReactNode }) => (
    <Typography
      variant="h5"
      sx={{
        mt: 3,
        mb: 1.5,
        fontWeight: 700,
        pt: 1,
        borderTop: '2px solid',
        borderColor: 'primary.main',
      }}
    >
      {children}
    </Typography>
  ),
  h3: ({ children }: { children: React.ReactNode }) => (
    <Typography variant="h6" sx={{ mt: 2, mb: 1, fontWeight: 600 }}>
      {children}
    </Typography>
  ),
  p: ({ children }: { children: React.ReactNode }) => (
    <Typography variant="body1" sx={{ mb: 1.5, lineHeight: 1.8 }}>
      {children}
    </Typography>
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
  // 表格：用 MUI Table 系列组件，颜色跟随主题，不会在暗色模式下显示白底
  table: ({ children }: { children: React.ReactNode }) => (
    <Box
      sx={{
        overflowX: 'auto',
        mb: 2.5,
        borderRadius: 1.5,
        border: '1px solid',
        borderColor: 'divider',
      }}
    >
      <Table size="small" sx={{ minWidth: 400 }}>
        {children}
      </Table>
    </Box>
  ),
  thead: ({ children }: { children: React.ReactNode }) => (
    <TableHead sx={{ bgcolor: 'action.hover' }}>{children}</TableHead>
  ),
  tbody: ({ children }: { children: React.ReactNode }) => <TableBody>{children}</TableBody>,
  tr: ({ children }: { children: React.ReactNode }) => (
    <TableRow sx={{ '&:last-child td': { borderBottom: 0 } }}>{children}</TableRow>
  ),
  th: ({ children }: { children: React.ReactNode }) => (
    <TableCell component="th" sx={{ fontWeight: 700, fontSize: '0.85rem', whiteSpace: 'nowrap' }}>
      {children}
    </TableCell>
  ),
  td: ({ children }: { children: React.ReactNode }) => (
    <TableCell sx={{ fontSize: '0.85rem' }}>{children}</TableCell>
  ),
  hr: () => <Divider sx={{ my: 3 }} />,
  blockquote: ({ children }: { children: React.ReactNode }) => (
    <Box
      sx={{
        borderLeft: '3px solid',
        borderColor: 'primary.main',
        pl: 2,
        my: 2,
        color: 'text.secondary',
      }}
    >
      {children}
    </Box>
  ),
};

const NewsDetailPage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { locale } = useLocaleStore();

  const meta = slug ? getNewsItem(slug) : undefined;
  const ArticleComponent = slug ? getNewsArticle(slug) : null;
  const notFound = !ArticleComponent && !meta;

  const displayTitle = meta
    ? locale === 'zh'
      ? meta.title
      : (meta.titleEn ?? meta.title)
    : locale === 'zh'
      ? '新闻详情'
      : 'News';

  const pageTitle = `${displayTitle} - JCUT Mirror`;

  if (notFound) {
    return (
      <Container maxWidth="md" sx={{ py: 5 }}>
        <Alert
          severity="error"
          action={
            <Button color="inherit" size="small" onClick={() => navigate('/news')}>
              {locale === 'zh' ? '返回列表' : 'Back'}
            </Button>
          }
        >
          {locale === 'zh' ? '新闻不存在' : 'News article not found'}
        </Alert>
      </Container>
    );
  }

  return (
    <>
      <Helmet>
        <title>{pageTitle}</title>
      </Helmet>

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
              {meta.tags?.map((tag) => (
                <Chip
                  key={tag}
                  label={tag}
                  size="small"
                  sx={{ height: 20, fontSize: '0.65rem', '& .MuiChip-label': { px: 0.8 } }}
                />
              ))}
            </Box>

            <Typography
              variant="h3"
              fontWeight={800}
              sx={{ mb: 1.5, fontSize: { xs: '1.6rem', md: '2rem' } }}
            >
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
      </Container>
    </>
  );
};

export default NewsDetailPage;
