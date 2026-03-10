// src/pages/ErrorPage.tsx
// 通用错误页面 —— 支持 403 / 404 / 500 / 503 等状态码
// App.tsx 中为每个常见错误码添加显式路由，
// 同时 Nginx 通过 error_page 指令将错误重定向到对应路径。

import { Home as HomeIcon, Refresh as RefreshIcon } from '@mui/icons-material';
import { Box, Container, Typography, Button, Stack } from '@mui/material';
import React from 'react';
import { Helmet } from 'react-helmet-async';
import { useNavigate } from 'react-router-dom';

interface ErrorPageProps {
  /** HTTP 状态码，决定图标文案 */
  code?: number;
}

// ── 每个状态码对应的展示文案 ──────────────────────────────────────────────────
interface ErrorMeta {
  icon: string;   // emoji，用作装饰性"图标"，不依赖图片资源
  titleZh: string;
  titleEn: string;
  descZh: string;
  descEn: string;
  canRefresh: boolean;  // 是否展示"重试"按钮（服务器错误通常值得刷新，而权限错误不需要）
}

const ERROR_META: Record<number, ErrorMeta> = {
  403: {
    icon: '🔒',
    titleZh: '访问被拒绝',
    titleEn: 'Access Denied',
    descZh: '您没有权限访问该资源，请确认您在校园网内或联系管理员。',
    descEn: 'You do not have permission to access this resource. Please make sure you are on the campus network or contact the administrator.',
    canRefresh: false,
  },
  404: {
    icon: '🔍',
    titleZh: '页面不存在',
    titleEn: 'Page Not Found',
    descZh: '您访问的镜像或页面不存在，请确认 URL 是否正确。',
    descEn: 'The mirror or page you are looking for does not exist. Please check the URL.',
    canRefresh: false,
  },
  500: {
    icon: '💥',
    titleZh: '服务器内部错误',
    titleEn: 'Internal Server Error',
    descZh: '服务器遇到了一个意外错误，我们正在努力修复。请稍后再试。',
    descEn: 'The server encountered an unexpected error. We are working on it. Please try again later.',
    canRefresh: true,
  },
  502: {
    icon: '🔗',
    titleZh: '网关错误',
    titleEn: 'Bad Gateway',
    descZh: '上游服务暂时不可用，这通常是临时性问题，请稍后刷新。',
    descEn: 'The upstream service is temporarily unavailable. This is usually a temporary issue — please refresh.',
    canRefresh: true,
  },
  503: {
    icon: '🛠️',
    titleZh: '服务暂时不可用',
    titleEn: 'Service Unavailable',
    descZh: '镜像站正在维护或负载较高，请稍后访问。',
    descEn: 'The mirror is under maintenance or experiencing high load. Please try again later.',
    canRefresh: true,
  },
};

// 兜底文案，适用于任意未列举的错误码
const FALLBACK_META: ErrorMeta = {
  icon: '⚠️',
  titleZh: '发生错误',
  titleEn: 'Something went wrong',
  descZh: '访问出现了异常，请稍后再试或返回首页。',
  descEn: 'Something went wrong. Please try again later or go back to home.',
  canRefresh: true,
};

// ─────────────────────────────────────────────────────────────────────────────
const ErrorPage: React.FC<ErrorPageProps> = ({ code = 404 }) => {
  const navigate = useNavigate();
  // 读取当前语言（与全局 LocaleStore 保持一致）
  const storedLocale = (typeof localStorage !== 'undefined' && localStorage.getItem('locale')) || 'zh';
  const isZh = storedLocale !== 'en';

  const meta = ERROR_META[code] ?? FALLBACK_META;

  return (
    <>
      <Helmet>
        <title>{code} - JCUT Mirror</title>
      </Helmet>

      <Container maxWidth="sm">
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '65vh',
            textAlign: 'center',
            py: 8,
            userSelect: 'none',
          }}
        >
          {/* 装饰性 emoji —— 大号，位于数字前面 */}
          <Typography sx={{ fontSize: { xs: '3.5rem', md: '5rem' }, lineHeight: 1, mb: 2 }}>
            {meta.icon}
          </Typography>

          {/* 状态码大字（与 NotFound 保持同样的视觉风格） */}
          <Typography
            variant="h1"
            sx={{
              fontSize: { xs: '5rem', md: '8rem' },
              fontWeight: 900,
              fontFamily: '"JetBrains Mono", monospace',
              color: 'primary.main',
              lineHeight: 1,
              opacity: 0.12,
              // 用负 margin 把后面的标题向上拉，形成数字"穿透"效果
              mb: '-2.5rem',
            }}
          >
            {code}
          </Typography>

          {/* 错误标题 */}
          <Typography variant="h4" fontWeight={700} sx={{ mb: 1.5, position: 'relative', zIndex: 1 }}>
            {isZh ? meta.titleZh : meta.titleEn}
          </Typography>

          {/* 错误描述 */}
          <Typography variant="body1" color="text.secondary" sx={{ mb: 4, maxWidth: 420, lineHeight: 1.7 }}>
            {isZh ? meta.descZh : meta.descEn}
          </Typography>

          {/* 操作按钮 */}
          <Stack direction="row" spacing={2} justifyContent="center" flexWrap="wrap">
            <Button
              variant="contained"
              startIcon={<HomeIcon />}
              onClick={() => navigate('/')}
              size="large"
              sx={{ borderRadius: 6 }}
            >
              {isZh ? '返回首页' : 'Back to Home'}
            </Button>

            {meta.canRefresh && (
              <Button
                variant="outlined"
                startIcon={<RefreshIcon />}
                onClick={() => window.location.reload()}
                size="large"
                sx={{ borderRadius: 6 }}
              >
                {isZh ? '刷新页面' : 'Refresh'}
              </Button>
            )}
          </Stack>

          {/* 状态码提示行 —— 小字，方便用户截图反馈 */}
          <Typography variant="caption" color="text.disabled" sx={{ mt: 5, fontFamily: '"JetBrains Mono", monospace' }}>
            HTTP {code}
          </Typography>
        </Box>
      </Container>
    </>
  );
};

export default ErrorPage;
