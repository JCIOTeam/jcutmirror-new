// src/pages/ErrorPage.tsx
// 通用错误页面 —— 支持 403 / 404 / 500 / 502 / 503 等状态码
// 同时作为路由通配的 404 页面使用，合并了原 NotFound.tsx

import {
  Home as HomeIcon,
  Refresh as RefreshIcon,
  InfoOutlined as InfoIcon,
} from '@mui/icons-material';
import { Box, Container, Typography, Button, Stack, Paper, Divider } from '@mui/material';
import React, { useEffect, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

interface ErrorPageProps {
  code?: number;
}

/** 哪些错误码允许用户刷新重试 */
const REFRESHABLE_CODES = new Set([500, 502, 503]);

// ── 客户端指纹信息（从响应头读取，Nginx 需配置 add_header 才会有值）──
interface ClientInfo {
  realIp?: string;
  ja4Fingerprint?: string;
  ja3Fingerprint?: string;
}

const ClientInfoPanel: React.FC = () => {
  const { t } = useTranslation();
  const [info, setInfo] = useState<ClientInfo>({});
  const [hasInfo, setHasInfo] = useState(false);

  useEffect(() => {
    fetch(window.location.href, { method: 'GET', cache: 'no-cache' })
      .then((res) => {
        const realIp = res.headers.get('x-real-ip') ?? undefined;
        const ja4Fingerprint = res.headers.get('x-ja4-fingerprint') ?? undefined;
        const ja3Fingerprint = res.headers.get('x-ja3-fingerprint') ?? undefined;
        const next: ClientInfo = { realIp, ja4Fingerprint, ja3Fingerprint };
        const any = !!(realIp || ja4Fingerprint || ja3Fingerprint);
        setInfo(next);
        setHasInfo(any);
      })
      .catch(() => {
        /* 网络错误时静默忽略，不影响错误页展示 */
      });
  }, []);

  if (!hasInfo) return null;

  const rows: Array<{ label: string; value: string }> = [
    ...(info.realIp ? [{ label: t('error.clientIp'), value: info.realIp }] : []),
    ...(info.ja4Fingerprint ? [{ label: 'JA4 Fingerprint', value: info.ja4Fingerprint }] : []),
    ...(info.ja3Fingerprint ? [{ label: 'JA3 Fingerprint', value: info.ja3Fingerprint }] : []),
  ];

  return (
    <Paper
      variant="outlined"
      sx={{ mt: 4, p: 2, borderRadius: 2, maxWidth: 480, width: '100%', textAlign: 'left' }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8, mb: 1.5 }}>
        <InfoIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
        <Typography variant="caption" fontWeight={700} color="text.secondary">
          {t('error.requestInfo')}
        </Typography>
      </Box>
      <Divider sx={{ mb: 1.5 }} />
      <Stack spacing={1}>
        {rows.map((row) => (
          <Box key={row.label} sx={{ display: 'flex', gap: 1, alignItems: 'flex-start' }}>
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ minWidth: 120, flexShrink: 0, pt: 0.1 }}
            >
              {row.label}
            </Typography>
            <Typography
              variant="caption"
              sx={{
                fontFamily: '"JetBrains Mono", monospace',
                wordBreak: 'break-all',
                color: 'text.primary',
                fontWeight: 500,
              }}
            >
              {row.value}
            </Typography>
          </Box>
        ))}
      </Stack>
    </Paper>
  );
};

// ── 主组件 ────────────────────────────────────────────────────────────────────
const ErrorPage: React.FC<ErrorPageProps> = ({ code = 404 }) => {
  const navigate = useNavigate();
  const { t } = useTranslation();

  // 尝试读取 error.title{code}，若该 key 不存在则降级为 titleDefault
  const titleKey = `error.title${code}`;
  const descKey = `error.desc${code}`;
  const title = t(titleKey, { defaultValue: '' }) || t('error.titleDefault');
  const desc = t(descKey, { defaultValue: '' }) || t('error.descDefault');
  const canRefresh = REFRESHABLE_CODES.has(code);

  const pageTitle = `${code} - JCUT Mirror`;

  return (
    <>
      <Helmet>
        <title>{pageTitle}</title>
        {/* 错误页不应被索引 */}
        <meta name="robots" content="noindex, nofollow" />
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
          <Typography
            variant="h1"
            sx={{
              fontSize: { xs: '5rem', md: '8rem' },
              fontWeight: 900,
              fontFamily: '"JetBrains Mono", monospace',
              color: 'primary.main',
              lineHeight: 1,
              opacity: 0.12,
              mb: '-2.5rem',
            }}
          >
            {code}
          </Typography>

          <Typography
            variant="h4"
            fontWeight={700}
            sx={{ mb: 1.5, position: 'relative', zIndex: 1 }}
          >
            {title}
          </Typography>

          <Typography
            variant="body1"
            color="text.secondary"
            sx={{ mb: 4, maxWidth: 420, lineHeight: 1.7 }}
          >
            {desc}
          </Typography>

          <Stack direction="row" spacing={2} justifyContent="center" flexWrap="wrap">
            <Button
              variant="contained"
              startIcon={<HomeIcon />}
              onClick={() => navigate('/')}
              size="large"
              sx={{ borderRadius: 6 }}
            >
              {t('error.backHome')}
            </Button>
            {canRefresh && (
              <Button
                variant="outlined"
                startIcon={<RefreshIcon />}
                onClick={() => window.location.reload()}
                size="large"
                sx={{ borderRadius: 6 }}
              >
                {t('error.refreshPage')}
              </Button>
            )}
          </Stack>

          {/* 客户端指纹信息面板 —— 有响应头时自动出现 */}
          <ClientInfoPanel />

          <Typography
            variant="caption"
            color="text.disabled"
            sx={{ mt: 4, fontFamily: '"JetBrains Mono", monospace' }}
          >
            HTTP {code}
          </Typography>
        </Box>
      </Container>
    </>
  );
};

export default ErrorPage;
