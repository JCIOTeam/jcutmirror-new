// src/App.tsx
// 应用根组件 - 路由 + 主题 + 国际化

import { ThemeProvider, CssBaseline, Box } from '@mui/material';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React, { useEffect } from 'react';
import { HelmetProvider } from 'react-helmet-async';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import './i18n';

import Footer from './components/common/Footer';
import Header from './components/common/Header';
import { useTheme } from './hooks/useTheme';
import ErrorPage from './pages/ErrorPage';
import Home from './pages/Home';
import MirrorDetail from './pages/MirrorDetail';
import NewsDetailPage from './pages/NewsDetailPage';
import NewsListPage from './pages/NewsListPage';
import NotFound from './pages/NotFound';
import { useThemeStore } from './stores/mirrorStore';

// 创建 React Query 客户端
const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            retry: 2,
            refetchOnWindowFocus: false,
        },
    },
});

/**
 * 主题感知的应用容器
 * 分离出来以便在 ThemeProvider 内部使用 useTheme
 */
const ThemedApp: React.FC = () => {
    const { theme } = useTheme();
    const { mode } = useThemeStore();

    // 初始化时同步 data-theme 属性（供 FancyIndex CSS 变量使用）
    useEffect(() => {
        document.documentElement.setAttribute('data-theme', mode);
    }, [mode]);

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
                            <Route path="/mirrors/:name" element={<MirrorDetail />} />
                            <Route path="/news" element={<NewsListPage />} />
                            <Route path="/news/:slug" element={<NewsDetailPage />} />
                            {/* 明确的错误码路由 —— Nginx error_page 可将 403/500 等重定向到此处 */}
                            <Route path="/403" element={<ErrorPage code={403} />} />
                            <Route path="/500" element={<ErrorPage code={500} />} />
                            <Route path="/502" element={<ErrorPage code={502} />} />
                            <Route path="/503" element={<ErrorPage code={503} />} />
                            <Route path="*" element={<NotFound />} />
                        </Routes>
                    </Box>

                    <Footer />
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
