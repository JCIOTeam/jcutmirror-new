// src/components/common/Header.tsx
// 顶部导航栏 —— 响应式
// 移动端：Logo + 搜索图标（点击展开内联搜索框） + 主题 + 汉堡菜单
// 桌面端：Logo + 搜索框 + 语言 + 主题

import { Menu as MenuIcon, Search as SearchIcon, Close as CloseIcon } from '@mui/icons-material';
import {
    AppBar, Toolbar, Typography, Box, IconButton,
    Drawer, List, ListItem, ListItemButton, ListItemText,
    Divider, InputBase, useMediaQuery, useTheme as useMuiTheme,
    Fade,
} from '@mui/material';
import React, { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useLocation } from 'react-router-dom';

import { useMirrorSearchStore } from '../../stores/mirrorStore';
import LocaleToggle from './LocaleToggle';
import SearchBar from './SearchBar';
import ThemeToggle from './ThemeToggle';

const Header: React.FC = () => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const location = useLocation();
    const muiTheme = useMuiTheme();
    const isMobile = useMediaQuery(muiTheme.breakpoints.down('md'));

    const [drawerOpen, setDrawerOpen]     = useState(false);
    const [searchOpen, setSearchOpen]     = useState(false);
    const searchInputRef                  = useRef<HTMLInputElement>(null);

    // 使用全局搜索 store，与桌面端 SearchBar 共享状态
    const { searchQuery, setSearchQuery } = useMirrorSearchStore();

    // 搜索框展开时自动聚焦
    useEffect(() => {
        if (searchOpen) {
            setTimeout(() => searchInputRef.current?.focus(), 50);
        }
    }, [searchOpen]);

    // 关闭搜索时清空查询
    const handleCloseSearch = () => {
        setSearchOpen(false);
        setSearchQuery('');
    };

    // 抽屉导航项
    const navItems = [
        { label: t('nav.home'),    action: () => { navigate('/');           setDrawerOpen(false); } },
        { label: t('nav.mirrors'), action: () => {
                // 若已在首页直接滚动，否则先导航到首页再滚动
                if (location.pathname === '/') {
                    document.getElementById('mirrors')?.scrollIntoView({ behavior: 'smooth' });
                } else {
                    navigate('/');
                    // 导航后稍等 DOM 更新再滚动
                    setTimeout(() => document.getElementById('mirrors')?.scrollIntoView({ behavior: 'smooth' }), 300);
                }
                setDrawerOpen(false);
            },
        },
    ];

    return (
        <>
            <AppBar position="sticky" elevation={0}>
                <Toolbar sx={{ gap: 1, minHeight: { xs: 56, sm: 64 } }}>

                    {/* ── Logo —— 搜索展开时隐藏，节省空间 ── */}
                    <Fade in={!searchOpen}>
                        <Box
                            onClick={() => navigate('/')}
                            sx={{
                                display: searchOpen ? 'none' : 'flex',
                                alignItems: 'center',
                                gap: 1,
                                cursor: 'pointer',
                                flexShrink: 0,
                            }}
                            role="link"
                            aria-label="返回首页"
                        >
                            <img src="/favicon.svg" alt="JCUT Mirror" style={{ width: 26, height: 26 }} />
                            <Typography
                                variant="h6"
                                sx={{
                                    fontWeight: 800,
                                    fontSize: { xs: '1rem', sm: '1.1rem' },
                                    fontFamily: '"JetBrains Mono", monospace',
                                    letterSpacing: '-0.02em',
                                    display: { xs: 'none', sm: 'block' },
                                }}
                            >
                                JCUT
                                <Typography component="span" sx={{ color: 'primary.main', fontWeight: 800 }}>
                                    Mirror
                                </Typography>
                            </Typography>
                        </Box>
                    </Fade>

                    {/* ── 桌面端搜索框 ── */}
                    {!isMobile && (
                        <Box sx={{ flex: 1, maxWidth: 400, mx: 2 }}>
                            <SearchBar fullWidth />
                        </Box>
                    )}

                    {/* ── 移动端内联搜索框（展开时占满剩余空间） ── */}
                    {isMobile && searchOpen && (
                        <Box
                            sx={{
                                flex: 1,
                                display: 'flex',
                                alignItems: 'center',
                                bgcolor: 'action.hover',
                                borderRadius: 2,
                                px: 1.5,
                                mx: 0.5,
                                height: 38,
                            }}
                        >
                            <SearchIcon sx={{ fontSize: 18, color: 'text.secondary', mr: 1, flexShrink: 0 }} />
                            <InputBase
                                inputRef={searchInputRef}
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                                placeholder={t('search.placeholder')}
                                fullWidth
                                inputProps={{ 'aria-label': t('search.placeholder') }}
                                sx={{ fontSize: '0.9rem', color: 'text.primary' }}
                            />
                        </Box>
                    )}

                    <Box sx={{ flex: 1 }} />

                    {/* ── 桌面端右侧工具栏 ── */}
                    {!isMobile && (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <LocaleToggle />
                            <ThemeToggle />
                        </Box>
                    )}

                    {/* ── 移动端右侧按钮组 ── */}
                    {isMobile && (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.3 }}>
                            {/* 搜索图标 / 关闭图标 */}
                            <IconButton
                                color="inherit"
                                size="small"
                                onClick={() => (searchOpen ? handleCloseSearch() : setSearchOpen(true))}
                                aria-label={searchOpen ? '关闭搜索' : '搜索'}
                            >
                                {searchOpen ? <CloseIcon fontSize="small" /> : <SearchIcon fontSize="small" />}
                            </IconButton>

                            <ThemeToggle />

                            <IconButton
                                color="inherit"
                                onClick={() => setDrawerOpen(true)}
                                aria-label="打开菜单"
                                size="small"
                            >
                                <MenuIcon />
                            </IconButton>
                        </Box>
                    )}
                </Toolbar>
            </AppBar>

            {/* ── 移动端抽屉菜单 ── */}
            <Drawer
                anchor="right"
                open={drawerOpen}
                onClose={() => setDrawerOpen(false)}
                PaperProps={{ sx: { width: 240 } }}
            >
                <Box sx={{ p: 2 }}>
                    <Typography variant="h6" fontWeight={800} fontFamily='"JetBrains Mono", monospace'>
                        JCUT Mirror
                    </Typography>
                </Box>
                <Divider />
                <List>
                    {navItems.map((item) => (
                        <ListItem key={item.label} disablePadding>
                            <ListItemButton onClick={item.action}>
                                <ListItemText primary={item.label} />
                            </ListItemButton>
                        </ListItem>
                    ))}
                </List>
                <Divider />
                <Box sx={{ p: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                    <LocaleToggle />
                </Box>
            </Drawer>
        </>
    );
};

export default Header;
