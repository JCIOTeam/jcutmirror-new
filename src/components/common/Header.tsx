// src/components/common/Header.tsx
// 顶部导航栏 —— 响应式
// 移动端：Logo + 搜索 + 主题 + 汉堡菜单
// 桌面端：Logo + 搜索框 + 下载按钮 + 语言 + 主题

import {
    Close as CloseIcon,
    Download as DownloadIcon,
    Menu as MenuIcon,
    Search as SearchIcon,
} from '@mui/icons-material';
import {
    AppBar, Box, Button, Divider, Drawer, Fade, IconButton,
    InputBase, List, ListItem, ListItemButton, ListItemIcon,
    ListItemText, Toolbar, Tooltip, Typography,
    useMediaQuery, useTheme as useMuiTheme,
} from '@mui/material';
import React, { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation, useNavigate } from 'react-router-dom';

import { useMirrorSearchStore } from '../../stores/mirrorStore';
import DownloadModal from '../mirrors/DownloadModal';

import LocaleToggle from './LocaleToggle';
import SearchBar from './SearchBar';
import ThemeToggle from './ThemeToggle';

const Header: React.FC = () => {
    const { t }      = useTranslation();
    const navigate   = useNavigate();
    const location   = useLocation();
    const muiTheme   = useMuiTheme();
    const isMobile   = useMediaQuery(muiTheme.breakpoints.down('md'));

    const [drawerOpen,   setDrawerOpen]   = useState(false);
    const [searchOpen,   setSearchOpen]   = useState(false);
    const [downloadOpen, setDownloadOpen] = useState(false);
    const searchInputRef                  = useRef<HTMLInputElement>(null);

    const { searchQuery, setSearchQuery } = useMirrorSearchStore();

    useEffect(() => {
        if (searchOpen) setTimeout(() => searchInputRef.current?.focus(), 50);
    }, [searchOpen]);

    const handleCloseSearch = () => {
        setSearchOpen(false);
        setSearchQuery('');
    };

    // 侧边栏导航项
    const navItems = [
        {
            label:  t('nav.home'),
            action: () => { navigate('/'); setDrawerOpen(false); },
        },
        {
            label: t('nav.mirrors'),
            action: () => {
                if (location.pathname === '/') {
                    document.getElementById('mirrors')?.scrollIntoView({ behavior: 'smooth' });
                } else {
                    navigate('/');
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

                    {/* Logo */}
                    <Fade in={!searchOpen}>
                        <Box
                            onClick={() => navigate('/')}
                            sx={{
                                display:    searchOpen ? 'none' : 'flex',
                                alignItems: 'center',
                                gap:        1,
                                cursor:     'pointer',
                                flexShrink: 0,
                            }}
                            role="link"
                            aria-label="返回首页"
                        >
                            <img src="/favicon.svg" alt="JCUT Mirror" style={{ width: 26, height: 26 }} />
                            <Typography
                                variant="h6"
                                sx={{
                                    fontWeight:    800,
                                    fontSize:      { xs: '1rem', sm: '1.1rem' },
                                    fontFamily:    '"JetBrains Mono", monospace',
                                    letterSpacing: '-0.02em',
                                    display:       { xs: 'none', sm: 'block' },
                                }}
                            >
                                JCUT
                                <Typography component="span" sx={{ color: 'primary.main', fontWeight: 800 }}>
                                    Mirror
                                </Typography>
                            </Typography>
                        </Box>
                    </Fade>

                    {/* 桌面端搜索框 */}
                    {!isMobile && (
                        <Box sx={{ flex: 1, maxWidth: 400, mx: 2 }}>
                            <SearchBar fullWidth />
                        </Box>
                    )}

                    {/* 移动端内联搜索框 */}
                    {isMobile && searchOpen && (
                        <Box
                            sx={{
                                flex:       1,
                                display:    'flex',
                                alignItems: 'center',
                                bgcolor:    'action.hover',
                                borderRadius: 2,
                                px:         1.5,
                                mx:         0.5,
                                height:     38,
                            }}
                        >
                            <SearchIcon sx={{ fontSize: 18, color: 'text.secondary', mr: 1, flexShrink: 0 }} />
                            <InputBase
                                inputRef={searchInputRef}
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder={t('search.placeholder')}
                                fullWidth
                                inputProps={{ 'aria-label': t('search.placeholder') }}
                                sx={{ fontSize: '0.9rem', color: 'text.primary' }}
                            />
                        </Box>
                    )}

                    <Box sx={{ flex: 1 }} />

                    {/* 桌面端右侧工具栏 */}
                    {!isMobile && (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            {/* 镜像下载按钮 */}
                            <Tooltip title={t('nav.download', '镜像下载')} placement="bottom">
                                <Button
                                    variant="outlined"
                                    size="small"
                                    startIcon={<DownloadIcon sx={{ fontSize: 16 }} />}
                                    onClick={() => setDownloadOpen(true)}
                                    sx={{
                                        borderRadius:  6,
                                        fontSize:      '0.8rem',
                                        px:            1.5,
                                        py:            0.4,
                                        fontWeight:    600,
                                        textTransform: 'none',
                                        mr:            0.5,
                                    }}
                                >
                                    {t('nav.download', '镜像下载')}
                                </Button>
                            </Tooltip>
                            <LocaleToggle />
                            <ThemeToggle />
                        </Box>
                    )}

                    {/* 移动端右侧按钮组 */}
                    {isMobile && (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.3 }}>
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

            {/* 移动端抽屉菜单 */}
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

                    {/* 镜像下载入口 */}
                    <ListItem disablePadding>
                        <ListItemButton
                            onClick={() => { setDownloadOpen(true); setDrawerOpen(false); }}
                            sx={{
                                color:   'primary.main',
                                '& .MuiListItemIcon-root': { color: 'primary.main', minWidth: 36 },
                            }}
                        >
                            <ListItemIcon>
                                <DownloadIcon fontSize="small" />
                            </ListItemIcon>
                            <ListItemText
                                primary={t('nav.download', '镜像下载')}
                                primaryTypographyProps={{ fontWeight: 600, fontSize: '0.9rem' }}
                            />
                        </ListItemButton>
                    </ListItem>
                </List>
                <Divider />
                <Box sx={{ p: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                    <LocaleToggle />
                </Box>
            </Drawer>

            {/* 下载弹窗 */}
            <DownloadModal open={downloadOpen} onClose={() => setDownloadOpen(false)} />
        </>
    );
};

export default Header;
