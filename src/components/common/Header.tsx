// src/components/common/Header.tsx
// 顶部导航栏组件

import { Menu as MenuIcon } from '@mui/icons-material';
import {
  AppBar,
  Toolbar,
  Typography,
  Box,
  IconButton,
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  Divider,
  useMediaQuery,
  useTheme as useMuiTheme,
} from '@mui/material';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useLocation } from 'react-router-dom';

import LocaleToggle from './LocaleToggle';
import SearchBar from './SearchBar';
import ThemeToggle from './ThemeToggle';

/**
 * 响应式顶部导航栏
 * - 桌面端：Logo + 搜索框 + 语言切换 + 主题切换
 * - 移动端：Logo + 汉堡菜单
 */
const Header: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const muiTheme = useMuiTheme();
  const isMobile = useMediaQuery(muiTheme.breakpoints.down('md'));
  const [drawerOpen, setDrawerOpen] = useState(false);

  const navItems = [
    { label: t('nav.home'), path: '/' },
    { label: t('nav.mirrors'), path: '/#mirrors' },
  ];

  const isHome = location.pathname === '/';

  return (
    <>
      <AppBar position="sticky" elevation={0}>
        <Toolbar sx={{ gap: 1, minHeight: { xs: 56, sm: 64 } }}>
          {/* Logo */}
          <Box
            onClick={() => navigate('/')}
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1,
              cursor: 'pointer',
              textDecoration: 'none',
              color: 'inherit',
              flexShrink: 0,
            }}
            role="link"
            aria-label="返回首页"
          >
          <img
            src="/favicon.svg"
            alt="JCUT Mirror Logo"
            style={{
              width: 26,
              height: 26,
            }}
          />
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
              <Typography
                component="span"
                sx={{ color: 'primary.main', fontWeight: 800 }}
              >
                Mirror
              </Typography>
            </Typography>
          </Box>

          {/* 桌面端搜索框 */}
          {!isMobile && (
            <Box sx={{ flex: 1, maxWidth: 400, mx: 2 }}>
              <SearchBar fullWidth />
            </Box>
          )}

          <Box sx={{ flex: 1 }} />

          {/* 桌面端工具栏 */}
          {!isMobile && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <LocaleToggle />
              <ThemeToggle />
            </Box>
          )}

          {/* 移动端汉堡菜单 */}
          {isMobile && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
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

        {/* 移动端搜索框（首页显示） */}
        {isMobile && isHome && (
          <Toolbar variant="dense" sx={{ pb: 1, pt: 0 }}>
            <SearchBar fullWidth size="small" />
          </Toolbar>
        )}
      </AppBar>

      {/* 移动端抽屉菜单 */}
      <Drawer
        anchor="right"
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        PaperProps={{
          sx: { width: 240 },
        }}
      >
        <Box sx={{ p: 2 }}>
          <Typography variant="h6" fontWeight={800} fontFamily='"JetBrains Mono", monospace'>
            JCUT Mirror
          </Typography>
        </Box>
        <Divider />
        <List>
          {navItems.map((item) => (
            <ListItem key={item.path} disablePadding>
              <ListItemButton
                onClick={() => {
                  navigate(item.path);
                  setDrawerOpen(false);
                }}
              >
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
