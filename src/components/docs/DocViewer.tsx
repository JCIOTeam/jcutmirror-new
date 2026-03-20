// src/components/docs/DocViewer.tsx
// Markdown/MDX 文档渲染组件

import { MDXProvider } from '@mdx-js/react';
import {
  Box,
  Typography,
  Link,
  Divider,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Paper,
  Alert,
  CircularProgress,
} from '@mui/material';
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

import { loadHelpDoc, hasMdxDoc } from '../../docs';
import { useLocaleStore } from '../../stores/mirrorStore';

import CodeBlock from './CodeBlock';

// MDX 组件的 MUI 映射，与 ReactMarkdown 保持一致
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
    <Typography variant="body1" sx={{ mb: 1.5, lineHeight: 1.8, color: 'text.primary' }}>
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
  hr: () => <Divider sx={{ my: 2 }} />,
  ul: ({ children }: { children: React.ReactNode }) => (
    <Box component="ul" sx={{ pl: 3, mb: 1.5 }}>
      {children}
    </Box>
  ),
  ol: ({ children }: { children: React.ReactNode }) => (
    <Box component="ol" sx={{ pl: 3, mb: 1.5 }}>
      {children}
    </Box>
  ),
  li: ({ children }: { children: React.ReactNode }) => (
    <Typography component="li" variant="body1" sx={{ mb: 0.5, lineHeight: 1.8 }}>
      {children}
    </Typography>
  ),
  blockquote: ({ children }: { children: React.ReactNode }) => (
    <Paper
      variant="outlined"
      sx={{
        pl: 2,
        pr: 2,
        py: 1,
        my: 2,
        borderLeft: '4px solid',
        borderColor: 'primary.main',
        bgcolor: 'action.hover',
        borderRadius: '0 8px 8px 0',
      }}
    >
      {children}
    </Paper>
  ),
  table: ({ children }: { children: React.ReactNode }) => (
    <Paper variant="outlined" sx={{ my: 2, overflow: 'hidden', borderRadius: 2 }}>
      <Table size="small">{children}</Table>
    </Paper>
  ),
  thead: ({ children }: { children: React.ReactNode }) => (
    <TableHead sx={{ bgcolor: 'action.hover' }}>{children}</TableHead>
  ),
  tbody: ({ children }: { children: React.ReactNode }) => <TableBody>{children}</TableBody>,
  tr: ({ children }: { children: React.ReactNode }) => <TableRow hover>{children}</TableRow>,
  th: ({ children }: { children: React.ReactNode }) => (
    <TableCell sx={{ fontWeight: 700 }}>{children}</TableCell>
  ),
  td: ({ children }: { children: React.ReactNode }) => <TableCell>{children}</TableCell>,
  strong: ({ children }: { children: React.ReactNode }) => (
    <Typography component="strong" fontWeight={700} color="text.primary">
      {children}
    </Typography>
  ),
  em: ({ children }: { children: React.ReactNode }) => (
    <Typography component="em" fontStyle="italic" color="text.primary">
      {children}
    </Typography>
  ),
  pre: ({ children }: { children: React.ReactNode }) => <Box sx={{ my: 1.5 }}>{children}</Box>,
};

interface DocViewerProps {
  mirrorId: string;
  content?: string | null;
  loading?: boolean;
}

/**
 * Markdown 文档查看器
 * 使用 react-markdown 渲染，并自定义 MUI 组件映射
 */
const DocViewer: React.FC<DocViewerProps> = ({ mirrorId, content, loading }) => {
  const { t } = useTranslation();
  const { locale } = useLocaleStore();
  const [MdxComponent, setMdxComponent] = useState<React.FC | null>(null);
  const [mdxLoading, setMdxLoading] = useState(false);

  useEffect(() => {
    // 尝试加载 MDX 文档
    if (mirrorId && hasMdxDoc(mirrorId, locale)) {
      setMdxLoading(true);
      loadHelpDoc(mirrorId, locale)
        .then((component) => {
          // 必须用箭头函数包裹，否则 React 会把 component 当成 state updater 函数调用
          setMdxComponent(() => component);
        })
        .finally(() => {
          setMdxLoading(false);
        });
    } else {
      setMdxComponent(null);
    }
  }, [mirrorId, locale]);

  // 优先显示 MDX 加载状态
  if (mdxLoading) {
    return (
      <Box sx={{ py: 2, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
        <CircularProgress size={24} sx={{ mr: 1 }} />
        <Typography variant="body2" color="text.secondary">
          {t('docs.loading')}
        </Typography>
      </Box>
    );
  }

  // 渲染 MDX 组件 —— 必须用 MDXProvider 包裹，否则 table 等自定义组件不生效
  if (MdxComponent) {
    return (
      <Box sx={{ '& > *:first-of-type': { mt: 0 }, '& > *:last-child': { mb: 0 } }}>
        <MDXProvider components={mdxComponents as unknown as Record<string, React.ComponentType>}>
          <MdxComponent />
        </MDXProvider>
      </Box>
    );
  }

  // 回退到传统的 Markdown 渲染
  if (loading) {
    return (
      <Box sx={{ py: 2 }}>
        {[...Array(5)].map((_, i) => (
          <Box
            key={i}
            sx={{
              height: 16,
              bgcolor: 'action.hover',
              borderRadius: 1,
              mb: 1.5,
              width: `${85 + Math.random() * 15}%`,
              animation: 'pulse 1.5s ease-in-out infinite',
              '@keyframes pulse': {
                '0%, 100%': { opacity: 1 },
                '50%': { opacity: 0.5 },
              },
            }}
          />
        ))}
      </Box>
    );
  }

  if (!content) {
    return <Alert severity="info">{t('detail.noHelp')}</Alert>;
  }

  return (
    <Box
      sx={{
        '& > *:first-of-type': { mt: 0 },
        '& > *:last-child': { mb: 0 },
      }}
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          // 标题
          h1: ({ children }) => (
            <Typography variant="h4" sx={{ mt: 3, mb: 1.5, fontWeight: 700 }}>
              {children}
            </Typography>
          ),
          h2: ({ children }) => (
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
          h3: ({ children }) => (
            <Typography variant="h6" sx={{ mt: 2, mb: 1, fontWeight: 600 }}>
              {children}
            </Typography>
          ),

          // 段落
          p: ({ children }) => (
            <Typography variant="body1" sx={{ mb: 1.5, lineHeight: 1.8, color: 'text.primary' }}>
              {children}
            </Typography>
          ),

          // 链接
          a: ({ href, children }) => (
            <Link
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              underline="hover"
              color="primary"
            >
              {children}
            </Link>
          ),

          // 代码块
          code: ({ className, children }) => {
            const match = /language-(\w+)/.exec(className || '');
            const isInline = !match && !className;
            return (
              <CodeBlock language={match ? match[1] : 'bash'} inline={isInline}>
                {String(children).replace(/\n$/, '')}
              </CodeBlock>
            );
          },

          // 分割线
          hr: () => <Divider sx={{ my: 2 }} />,

          // 无序列表
          ul: ({ children }) => (
            <Box component="ul" sx={{ pl: 3, mb: 1.5 }}>
              {children}
            </Box>
          ),

          // 有序列表
          ol: ({ children }) => (
            <Box component="ol" sx={{ pl: 3, mb: 1.5 }}>
              {children}
            </Box>
          ),

          // 列表项
          li: ({ children }) => (
            <Typography component="li" variant="body1" sx={{ mb: 0.5, lineHeight: 1.8 }}>
              {children}
            </Typography>
          ),

          // 引用块
          blockquote: ({ children }) => (
            <Paper
              variant="outlined"
              sx={{
                pl: 2,
                pr: 2,
                py: 1,
                my: 2,
                borderLeft: '4px solid',
                borderColor: 'primary.main',
                bgcolor: 'action.hover',
                borderRadius: '0 8px 8px 0',
              }}
            >
              {children}
            </Paper>
          ),

          // 表格
          table: ({ children }) => (
            <Paper variant="outlined" sx={{ my: 2, overflow: 'hidden', borderRadius: 2 }}>
              <Table size="small">{children}</Table>
            </Paper>
          ),
          thead: ({ children }) => (
            <TableHead sx={{ bgcolor: 'action.hover' }}>{children}</TableHead>
          ),
          tbody: ({ children }) => <TableBody>{children}</TableBody>,
          tr: ({ children }) => <TableRow hover>{children}</TableRow>,
          th: ({ children }) => <TableCell sx={{ fontWeight: 700 }}>{children}</TableCell>,
          td: ({ children }) => <TableCell>{children}</TableCell>,

          // 强调
          strong: ({ children }) => (
            <Typography component="strong" fontWeight={700} color="text.primary">
              {children}
            </Typography>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </Box>
  );
};

export default DocViewer;
