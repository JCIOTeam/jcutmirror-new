// src/pages/MirrorDetail.tsx
// 镜像详情页

import {
  ArrowBack as BackIcon,
  ContentCopy as CopyIcon,
  CheckCircle as CheckIcon,
  OpenInNew as OpenIcon,
  Download as DownloadIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  FolderOpen as FolderIcon,
} from '@mui/icons-material';
import {
  Box, Container, Typography, Grid, Paper, Breadcrumbs,
  Link, Button, Tabs, Tab, Divider, Alert, Chip,
  Skeleton, Tooltip, Collapse, List, ListItem,
  ListItemText, IconButton,
} from '@mui/material';
import React, { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { useTranslation } from 'react-i18next';
import { useParams, useNavigate, Link as RouterLink } from 'react-router-dom';

import DocViewer from '../components/docs/DocViewer';
import DirectoryListing from '../components/mirrors/DirectoryListing';
import StatusChip from '../components/mirrors/StatusChip';
import SyncTimeline from '../components/mirrors/SyncTimeline';
import { hasMdxDoc } from '../docs';
import { useMirrorDetail } from '../hooks/useMirrors';
import { useLocaleStore } from '../stores/mirrorStore';

// Tab 面板
interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}
const TabPanel: React.FC<TabPanelProps> = ({ children, value, index }) => (
  <Box role="tabpanel" hidden={value !== index} sx={{ pt: 3 }}>
    {value === index && children}
  </Box>
);

// ---- ISO 文件侧栏组件 ----
interface IsoFilesCardProps {
  files: Array<{ name: string; url: string }>;
  mirrorUrl: string;
  locale: 'zh' | 'en';
}

const COLLAPSE_THRESHOLD = 5;

const IsoFilesCard: React.FC<IsoFilesCardProps> = ({ files, mirrorUrl, locale }) => {
  const [expanded, setExpanded] = useState(false);
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);

  const handleCopy = async (url: string, idx: number) => {
    try {
      // 复制完整 URL
      const full = url.startsWith('http') ? url : `${window.location.origin}${url}`;
      await navigator.clipboard.writeText(full);
      setCopiedIdx(idx);
      setTimeout(() => setCopiedIdx(null), 2000);
    } catch { /* ignore */ }
  };

  const hasFiles = files && files.length > 0;
  const displayedFiles = hasFiles && !expanded ? files.slice(0, COLLAPSE_THRESHOLD) : files;
  const hasMore = hasFiles && files.length > COLLAPSE_THRESHOLD;

  return (
    <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
      {/* 标题：镜像下载页面 */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
        <Typography variant="subtitle2" fontWeight={700} sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <FolderIcon sx={{ fontSize: 16, color: 'primary.main' }} />
          {locale === 'zh' ? '下载页面' : 'Downloads'}
        </Typography>
        <Tooltip title={locale === 'zh' ? '在浏览器中打开' : 'Open in browser'}>
          <IconButton
            size="small"
            component="a"
            href={mirrorUrl.startsWith('http') ? mirrorUrl : `${window.location.origin}${mirrorUrl}`}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="在浏览器中打开"
          >
            <OpenIcon sx={{ fontSize: 15 }} />
          </IconButton>
        </Tooltip>
      </Box>

      {/* 镜像完整 URL */}
      <Box
        sx={{
          fontFamily: '"JetBrains Mono", monospace',
          fontSize: '0.75rem',
          color: 'primary.main',
          bgcolor: (theme) =>
            theme.palette.mode === 'dark' ? 'rgba(96,165,250,0.08)' : 'rgba(59,130,246,0.06)',
          borderRadius: 1,
          px: 1,
          py: 0.6,
          mb: 1.5,
          wordBreak: 'break-all',
          lineHeight: 1.5,
        }}
      >
        {mirrorUrl.startsWith('http') ? mirrorUrl : `${window.location.origin}${mirrorUrl}`}
      </Box>

      {/* ISO 文件列表 */}
      {hasFiles ? (
        <>
          <Divider sx={{ mb: 1 }} />
          <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 0.5, fontWeight: 600 }}>
            ISO / {locale === 'zh' ? '安装镜像' : 'Install Images'} ({files.length})
          </Typography>
          <List dense disablePadding>
            {displayedFiles!.map((file, idx) => {
              const fullUrl = file.url.startsWith('http')
                ? file.url
                : `${window.location.origin}${file.url}`;
              return (
                <ListItem
                  key={idx}
                  disablePadding
                  sx={{
                    px: 0.5,
                    py: 0.3,
                    borderRadius: 1,
                    '&:hover': { bgcolor: 'action.hover' },
                    alignItems: 'flex-start',
                  }}
                >
                  <ListItemText
                    primary={
                      <Link
                        href={fullUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        underline="hover"
                        sx={{
                          fontSize: '0.78rem',
                          fontFamily: '"JetBrains Mono", monospace',
                          wordBreak: 'break-all',
                          lineHeight: 1.4,
                          color: 'primary.main',
                        }}
                      >
                        {file.name}
                      </Link>
                    }
                    sx={{ m: 0 }}
                  />
                  <Box sx={{ display: 'flex', gap: 0.3, ml: 0.5, flexShrink: 0 }}>
                    <Tooltip title={copiedIdx === idx ? (locale === 'zh' ? '已复制' : 'Copied!') : (locale === 'zh' ? '复制链接' : 'Copy URL')}>
                      <IconButton
                        size="small"
                        sx={{ p: 0.4 }}
                        onClick={() => handleCopy(file.url, idx)}
                        color={copiedIdx === idx ? 'success' : 'default'}
                      >
                        {copiedIdx === idx
                          ? <CheckIcon sx={{ fontSize: 13 }} />
                          : <CopyIcon sx={{ fontSize: 13 }} />}
                      </IconButton>
                    </Tooltip>
                    <Tooltip title={locale === 'zh' ? '下载' : 'Download'}>
                      <IconButton
                        size="small"
                        sx={{ p: 0.4 }}
                        component="a"
                        href={fullUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        color="primary"
                      >
                        <DownloadIcon sx={{ fontSize: 13 }} />
                      </IconButton>
                    </Tooltip>
                  </Box>
                </ListItem>
              );
            })}
          </List>

          {/* 折叠/展开 */}
          {hasMore && (
            <Button
              fullWidth
              size="small"
              onClick={() => setExpanded((v) => !v)}
              endIcon={expanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
              sx={{ mt: 0.5, fontSize: '0.75rem' }}
            >
              {expanded
                ? (locale === 'zh' ? '收起' : 'Show less')
                : (locale === 'zh' ? `显示全部 ${files.length} 个` : `Show all ${files.length}`)}
            </Button>
          )}
        </>
      ) : (
        <Typography variant="caption" color="text.secondary">
          {locale === 'zh' ? '暂无可下载文件' : 'No files available'}
        </Typography>
      )}
    </Paper>
  );
};

// ---- 主页面 ----
const MirrorDetail: React.FC = () => {
  const { name } = useParams<{ name: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { locale } = useLocaleStore();

  const { data: mirror, isLoading, error } = useMirrorDetail(name || '');

  // 是否有帮助文档（同步判断，用于决定默认 Tab）
  const hasDoc = name ? hasMdxDoc(name, locale) : false;
  // 无文档则默认到"文件列表" Tab（index 1）
  const [tabValue, setTabValue] = useState(hasDoc ? 0 : 1);

  const [copiedUrl, setCopiedUrl] = useState(false);

  // 完整 URL（处理 /debian/ 相对路径）
  const fullMirrorUrl = mirror
    ? mirror.url.startsWith('http')
      ? mirror.url
      : `${window.location.origin}${mirror.url}`
    : '';

  const handleCopyUrl = async () => {
    if (!mirror) return;
    try {
      await navigator.clipboard.writeText(fullMirrorUrl);
      setCopiedUrl(true);
      setTimeout(() => setCopiedUrl(false), 2000);
    } catch { /* ignore */ }
  };

  // 骨架屏
  if (isLoading) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Skeleton variant="text" width={200} height={24} sx={{ mb: 3 }} />
        <Skeleton variant="rectangular" height={120} sx={{ borderRadius: 2, mb: 3 }} />
        <Skeleton variant="rectangular" height={200} sx={{ borderRadius: 2 }} />
      </Container>
    );
  }

  // 加载失败
  if (error || !mirror) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Alert
          severity="error"
          action={<Button color="inherit" size="small" onClick={() => navigate('/')}>{t('error.backHome')}</Button>}
        >
          {error ? t('error.loadFailed') : t('error.notFound')}
        </Alert>
      </Container>
    );
  }

  return (
    <>
      <Helmet>
        <title>{mirror.name[locale]} - JCut Mirror</title>
        <meta name="description" content={mirror.desc[locale]} />
      </Helmet>

      <Container maxWidth="lg" sx={{ py: { xs: 3, md: 4 } }}>
        {/* 面包屑 */}
        <Breadcrumbs sx={{ mb: 2 }} aria-label="面包屑导航">
          <Link component={RouterLink} to="/" underline="hover" color="text.secondary">
            {t('nav.home')}
          </Link>
          <Typography color="text.primary" fontWeight={500}>
            {mirror.name[locale]}
          </Typography>
        </Breadcrumbs>

        <Button startIcon={<BackIcon />} onClick={() => navigate('/')} size="small" sx={{ mb: 3, color: 'text.secondary' }}>
          {locale === 'zh' ? '返回列表' : 'Back to List'}
        </Button>

        {/* ===== 顶部信息卡 ===== */}
        <Paper variant="outlined" sx={{ p: { xs: 2.5, md: 3 }, borderRadius: 2, mb: 3 }}>
          <Grid container spacing={3} alignItems="flex-start">
            {/* 左侧：名称描述 + URL */}
            <Grid size={{ xs: 12, md: 8 }}>
              {/* name 作主标题 */}
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 0.5, flexWrap: 'wrap' }}>
                <Typography
                  variant="h4"
                  fontWeight={800}
                  fontSize={{ xs: '1.5rem', md: '2rem' }}
                >
                  {mirror.name[locale]}
                </Typography>
                <StatusChip status={mirror.status} size="medium" />
                {/* id 标签 */}
                <Chip
                  label={mirror.id}
                  size="small"
                  variant="outlined"
                  color="primary"
                  sx={{ fontFamily: '"JetBrains Mono", monospace', fontSize: '0.72rem' }}
                />
                {mirror.type && mirror.type !== 'none' && (
                  <Chip
                    label={mirror.type}
                    size="small"
                    variant="outlined"
                    sx={{ fontFamily: '"JetBrains Mono", monospace', fontSize: '0.72rem' }}
                  />
                )}
              </Box>

              {/* 描述 */}
              <Typography variant="body1" color="text.secondary" sx={{ lineHeight: 1.7, mb: 2 }}>
                {mirror.desc[locale]}
              </Typography>

              {/* 完整 URL 显示 + 复制 */}
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1,
                  p: 1.5,
                  bgcolor: 'action.hover',
                  borderRadius: 1.5,
                  wordBreak: 'break-all',
                }}
              >
                <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', gap: 1, minWidth: 0 }}>
                  <FolderIcon sx={{ fontSize: 16, color: 'primary.main', flexShrink: 0 }} />
                  <Typography
                    variant="body2"
                    sx={{
                      fontFamily: '"JetBrains Mono", monospace',
                      fontSize: '0.83rem',
                      color: 'primary.main',
                      wordBreak: 'break-all',
                      flex: 1,
                      minWidth: 0,
                    }}
                  >
                    {fullMirrorUrl}
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', gap: 0.5, flexShrink: 0 }}>
                  <Tooltip title={copiedUrl ? t('mirror.copied') : t('mirror.copyUrl')}>
                    <Button
                      size="small"
                      onClick={handleCopyUrl}
                      color={copiedUrl ? 'success' : 'primary'}
                      startIcon={copiedUrl ? <CheckIcon fontSize="small" /> : <CopyIcon fontSize="small" />}
                      sx={{ fontFamily: '"JetBrains Mono", monospace' }}
                    >
                      {copiedUrl ? t('mirror.copied') : t('mirror.copyUrl')}
                    </Button>
                  </Tooltip>
                  <Tooltip title={locale === 'zh' ? '在浏览器中打开' : 'Open in browser'}>
                    <IconButton
                      size="small"
                      component="a"
                      href={fullMirrorUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      color="primary"
                    >
                      <OpenIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </Box>
              </Box>
            </Grid>

            {/* 右侧：ISO 文件下载侧栏 */}
            <Grid size={{ xs: 12, md: 4 }}>
              <IsoFilesCard
                files={mirror.files || []}
                mirrorUrl={mirror.url}
                locale={locale}
              />
            </Grid>
          </Grid>
        </Paper>

        {/* 同步状态 */}
        <Box sx={{ mb: 3 }}>
          <Typography variant="h6" fontWeight={700} sx={{ mb: 2 }}>
            {t('detail.syncStatus')}
          </Typography>
          <SyncTimeline mirror={mirror} />
        </Box>

        <Divider sx={{ mb: 3 }} />

        {/* ===== Tab 区域 ===== */}
        <Box>
          <Tabs
            value={tabValue}
            onChange={(_, v) => setTabValue(v)}
            aria-label="镜像详情标签页"
            sx={{ borderBottom: 1, borderColor: 'divider', '& .MuiTab-root': { fontWeight: 600 } }}
          >
            <Tab label={t('detail.helpDoc')} id="tab-0" aria-controls="tabpanel-0" />
            <Tab
              label={locale === 'zh' ? '文件列表' : 'File List'}
              id="tab-1"
              aria-controls="tabpanel-1"
            />
          </Tabs>

          {/* 帮助文档 */}
          <TabPanel value={tabValue} index={0}>
            <DocViewer mirrorId={mirror.id} />
          </TabPanel>

          {/* 真实目录文件列表 */}
          <TabPanel value={tabValue} index={1}>
            <DirectoryListing mirrorUrl={mirror.url} mirrorName={mirror.name[locale]} />
          </TabPanel>
        </Box>
      </Container>
    </>
  );
};

export default MirrorDetail;
