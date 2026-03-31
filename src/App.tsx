// src/App.tsx
// 应用根组件 - 路由 + 主题 + 国际化

import { ThemeProvider, CssBaseline, Box } from '@mui/material';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { HelmetProvider } from 'react-helmet-async';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import './i18n';

import Footer from './components/common/Footer';
import Header from './components/common/Header';
import ScrollToTop from './components/common/ScrollToTop';
import { useTheme } from './hooks/useTheme';
import ErrorPage from './pages/ErrorPage';
import Home from './pages/Home';
import MirrorDetail from './pages/MirrorDetail';
import NewsDetailPage from './pages/NewsDetailPage';
import NewsListPage from './pages/NewsListPage';
import StatusPage from './pages/StatusPage';
import { useThemeStore } from './stores/mirrorStore';

// 创建 React Query 客户端
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      refetchOnWindowFocus: false,
      gcTime: 10 * 60 * 1000, // 10 分钟垃圾回收，避免长时间停留时缓存意外失效
    },
  },
});

/**
 * 主题感知的应用容器
 * 分离出来以便在 ThemeProvider 内部使用 useTheme
 */
const ThemedApp: React.FC = () => {
  const { theme } = useTheme();
  useThemeStore();

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <BrowserRouter>
        {/* 全局 CSS 变量（供 FancyIndex 共享） */}
        <style>{`
          :root {
            --bg-primary: ${theme.palette.background.paper};
            --bg-secondary: ${theme.palette.background.default};
            --text-primary: ${theme.palette.text.primary};
            --text-secondary: ${theme.palette.text.secondary};
            --accent: ${theme.palette.primary.main};
            --border: ${theme.palette.divider};
          }
          * { box-sizing: border-box; }
          html { scroll-behavior: smooth; }
          body { font-family: "Inter", "Helvetica", "Arial", sans-serif; }
        `}</style>

        {/* 页面布局：Header + 内容区 + Footer */}
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
            <Routes>
              <Route path="/" element={<Home />} />
              {/* /mirrors/ 无独立页面，重定向回首页（避免直接访问出现 404） */}
              <Route path="/mirrors" element={<Navigate to="/" replace />} />
              <Route path="/mirrors/:name" element={<MirrorDetail />} />
              <Route path="/news" element={<NewsListPage />} />
              <Route path="/news/:slug" element={<NewsDetailPage />} />
              <Route path="/status" element={<StatusPage />} />
              {/* 明确的错误码路由 —— Nginx error_page 可将 403/500 等重定向到此处 */}
              <Route path="/403" element={<ErrorPage code={403} />} />
              <Route path="/500" element={<ErrorPage code={500} />} />
              <Route path="/502" element={<ErrorPage code={502} />} />
              <Route path="/503" element={<ErrorPage code={503} />} />
              <Route path="*" element={<ErrorPage code={404} />} />
            </Routes>
          </Box>

          <Footer />
          <ScrollToTop />
        </Box>
      </BrowserRouter>
    </ThemeProvider>
  );
};

/**
 * 应用根组件 - 提供全局 Provider
 */
const App: React.FC = () => {
  return (
    <HelmetProvider>
      <QueryClientProvider client={queryClient}>
        <ThemedApp />
      </QueryClientProvider>
    </HelmetProvider>
  );
};

export default App;
