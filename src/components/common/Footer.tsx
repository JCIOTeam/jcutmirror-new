// src/components/common/Footer.tsx
// 页脚组件

import { GitHub as GitHubIcon, Email as EmailIcon } from '@mui/icons-material';
import {
  Box,
  Container,
  Typography,
  Link,
  Divider,
  Grid,
  IconButton,
  Tooltip,
} from '@mui/material';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { Link as RouterLink } from 'react-router-dom';

/**
 * 站点页脚
 */
const Footer: React.FC = () => {
  const { t } = useTranslation();
  const year = new Date().getFullYear();

  const friendLinks = [
    { name: 'TUNA Mirror', url: 'https://mirrors.tuna.tsinghua.edu.cn' },
    { name: 'USTC Mirror', url: 'https://mirrors.ustc.edu.cn' },
    { name: 'NJU Mirror', url: 'https://mirror.nju.edu.cn' },
  ];

  return (
    <Box
      component="footer"
      sx={{
        mt: 'auto',
        borderTop: '1px solid',
        borderColor: 'divider',
        bgcolor: 'background.paper',
        pt: 5,
        pb: 3,
      }}
    >
      <Container maxWidth="lg">
        <Grid container spacing={4} sx={{ mb: 4 }}>
          {/* 左列：Logo + 简介 */}
          <Grid size={{ xs: 12, md: 4 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
              <img
                src="/favicon.svg"
                alt="JCUT Mirror Logo"
                style={{
                  width: 22,
                  height: 22,
                }}
              />
              <Typography
                variant="h6"
                fontWeight={800}
                fontFamily='"JetBrains Mono", monospace'
                fontSize="1rem"
              >
                JCUT
                <Typography component="span" color="primary.main" fontWeight={800} fontSize="1rem">
                  Mirror
                </Typography>
              </Typography>
            </Box>
            <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.7, mb: 2 }}>
              {t('footer.description')}
            </Typography>
            {/* 社交链接 */}
            <Box sx={{ display: 'flex', gap: 0.5 }}>
              <Tooltip title="GitHub">
                <IconButton
                  size="small"
                  component="a"
                  href="https://github.com/JCIOTeam"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="GitHub"
                >
                  <GitHubIcon fontSize="small" />
                </IconButton>
              </Tooltip>
              <Tooltip title={t('footer.contact')}>
                <IconButton
                  size="small"
                  component="a"
                  href="mailto:stucloud@jcut.edu.cn"
                  aria-label="联系邮箱"
                >
                  <EmailIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </Box>
          </Grid>

          {/* 中列：友情链接 */}
          <Grid size={{ xs: 6, md: 4 }}>
            <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1.5 }}>
              {t('footer.links')}
            </Typography>
            <Box
              component="nav"
              aria-label="友情链接"
              sx={{ display: 'flex', flexDirection: 'column', gap: 0.8 }}
            >
              {friendLinks.map((link) => (
                <Link
                  key={link.url}
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  variant="body2"
                  color="text.secondary"
                  underline="hover"
                  sx={{ '&:hover': { color: 'primary.main' }, transition: 'color 0.2s' }}
                >
                  {link.name}
                </Link>
              ))}
            </Box>
          </Grid>

          {/* 右列：技术信息 */}
          <Grid size={{ xs: 6, md: 4 }}>
            <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1.5 }}>
              {t('footer.contact')}
            </Typography>
            <Box
              component="nav"
              aria-label="站点链接"
              sx={{ display: 'flex', flexDirection: 'column', gap: 0.8 }}
            >
              <Link
                href="mailto:stucloud@jcut.edu.cn"
                variant="body2"
                color="text.secondary"
                underline="hover"
              >
                stucloud@jcut.edu.cn
              </Link>
              <Link
                component={RouterLink}
                to="/status"
                variant="body2"
                color="text.secondary"
                underline="hover"
              >
                {t('footer.status')}
              </Link>
              <Link
                href="https://github.com/JCIOTeam/jcutmirror-new"
                target="_blank"
                rel="noopener noreferrer"
                variant="body2"
                color="text.secondary"
                underline="hover"
              >
                源代码 / Source Code
              </Link>
            </Box>
          </Grid>
        </Grid>

        <Divider sx={{ mb: 2 }} />

        {/* 版权信息 */}
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: 1,
          }}
        >
          <Typography variant="caption" color="text.secondary">
            {t('footer.copyright', { year })}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {t('footer.poweredBy')}
          </Typography>
        </Box>
      </Container>
    </Box>
  );
};

export default Footer;
