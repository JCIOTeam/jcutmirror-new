// src/App.tsx
// 应用根组件 - 路由 + 主题 + 国际化

import { ThemeProvider, CssBaseline, Box, GlobalStyles, LinearProgress } from '@mui/material';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React, { Suspense, lazy } from 'react';
import { HelmetProvider } from 'react-helmet-async';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import './i18n';

import Footer from './components/common/Footer';
import Header from './components/common/Header';
import ScrollToTop from './components/common/ScrollToTop';
import { useTheme } from './hooks/useTheme';

// ── 路由级代码分割：除首页外按需加载，减小首屏 JS ────────────────────────────
const Home = lazy(() => import('./pages/Home'));
const MirrorDetail = lazy(() => import('./pages/MirrorDetail'));
const NewsDetailPage = lazy(() => import('./pages/NewsDetailPage'));
const NewsListPage = lazy(() => import('./pages/NewsListPage'));
const StatusPage = lazy(() => import('./pages/StatusPage'));
const ErrorPage = lazy(() => import('./pages/ErrorPage'));

// 创建 React Query 客户端
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      refetchOnWindowFocus: false,
      gcTime: 10 * 60 * 1000,
    },
  },
});

/**
 * 全局基础样式 —— 抽离自原 App 内的 inline <style>，避免每次 render 重新插入
 * CSS 变量供 FancyIndex 模板共享主题色
 */
const RootGlobalStyles: React.FC = () => {
  const { theme } = useTheme();
  return (
    <GlobalStyles
      styles={{
        ':root': {
          '--bg-primary': theme.palette.background.paper,
          '--bg-secondary': theme.palette.background.default,
          '--text-primary': theme.palette.text.primary,
          '--text-secondary': theme.palette.text.secondary,
          '--accent': theme.palette.primary.main,
          '--border': theme.palette.divider,
        },
        '*': { boxSizing: 'border-box' },
        html: { scrollBehavior: 'smooth' },
        body: { fontFamily: '"Inter", "Helvetica", "Arial", sans-serif' },
        // 字母分组锚点：避免被 sticky AppBar 遮挡（修复 #21）
        '[id^="group-"], #mirrors': { scrollMarginTop: '80px' },
        // 尊重用户的减少动画偏好
        '@media (prefers-reduced-motion: reduce)': {
          '*, *::before, *::after': {
            animationDuration: '0.01ms !important',
            animationIterationCount: '1 !important',
            transitionDuration: '0.01ms !important',
            scrollBehavior: 'auto !important',
          },
        },
      }}
    />
  );
};

/** 路由级 Suspense fallback —— 顶部进度条，无侵入 */
const RouteFallback: React.FC = () => (
  <Box sx={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 1300 }}>
    <LinearProgress />
  </Box>
);

const ThemedApp: React.FC = () => {
  const { theme } = useTheme();

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <RootGlobalStyles />
      <BrowserRouter>
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            minHeight: '100vh',
            bgcolor: 'background.default',
          }}
        >
          <Header />

          <Box component="main" sx={{ flex: 1 }}>
            <Suspense fallback={<RouteFallback />}>
              <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/mirrors" element={<Navigate to="/" replace />} />
                <Route path="/mirrors/:name" element={<MirrorDetail />} />
                <Route path="/news" element={<NewsListPage />} />
                <Route path="/news/:slug" element={<NewsDetailPage />} />
                <Route path="/status" element={<StatusPage />} />
                <Route path="/403" element={<ErrorPage code={403} />} />
                <Route path="/500" element={<ErrorPage code={500} />} />
                <Route path="/502" element={<ErrorPage code={502} />} />
                <Route path="/503" element={<ErrorPage code={503} />} />
                <Route path="*" element={<ErrorPage code={404} />} />
              </Routes>
            </Suspense>
          </Box>

          <Footer />
          <ScrollToTop />
        </Box>
      </BrowserRouter>
    </ThemeProvider>
  );
};

const App: React.FC = () => (
  <HelmetProvider>
    <QueryClientProvider client={queryClient}>
      <ThemedApp />
    </QueryClientProvider>
  </HelmetProvider>
);

export default App;
