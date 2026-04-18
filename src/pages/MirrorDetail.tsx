// src/pages/MirrorDetail.tsx
// 镜像详情页

import {
  ArrowBack as BackIcon,
  ContentCopy as CopyIcon,
  CheckCircle as CheckIcon,
  OpenInNew as OpenIcon,
  Download as DownloadIcon,
  FolderOpen as FolderIcon,
} from '@mui/icons-material';
import {
  Box,
  Container,
  Typography,
  Grid,
  Paper,
  Breadcrumbs,
  Link,
  Button,
  Tabs,
  Tab,
  Divider,
  Alert,
  Chip,
  Skeleton,
  Tooltip,
  List,
  ListItem,
  ListItemText,
  IconButton,
} from '@mui/material';
import React, { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { useTranslation } from 'react-i18next';
// useSearchParams allows us to read ?tab=help from the URL
import { useParams, useNavigate, Link as RouterLink, useSearchParams } from 'react-router-dom';

import DocViewer from '../components/docs/DocViewer';
import DirectoryListing from '../components/mirrors/DirectoryListing';
import StatusChip from '../components/mirrors/StatusChip';
import SyncTimeline from '../components/mirrors/SyncTimeline';
import { hasMdxDoc } from '../docs';
import { useMirrorDetail } from '../hooks/useMirrors';
import { useLocaleStore } from '../stores/mirrorStore';
import { SITE_ORIGIN, canonicalUrl, mirrorJsonLd, breadcrumbJsonLd } from '../utils/seo';

// ─── Tab 面板 ────────────────────────────────────────────────────────────────
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

// ─── ISO 文件侧栏 ─────────────────────────────────────────────────────────────
// 固定高度可滚动列表，文件再多也不会撑破卡片
interface IsoFilesCardProps {
  files: Array<{ name: string; url: string }>;
  mirrorUrl: string;
}

// 单个文件行显示约 36px，预留 5 行高度；超出部分滚动
const LIST_MAX_HEIGHT = 36 * 5 + 8; // px

const IsoFilesCard: React.FC<IsoFilesCardProps> = ({ files, mirrorUrl }) => {
  const { t } = useTranslation();
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);

  const toFull = (url: string) =>
    url.startsWith('http') ? url : `${window.location.origin}${sanitizeUrl(url)}`;

  const handleCopy = async (url: string, idx: number) => {
    try {
      await navigator.clipboard.writeText(toFull(url));
      setCopiedIdx(idx);
      setTimeout(() => setCopiedIdx(null), 2000);
    } catch {
      /* ignore */
    }
  };

  return (
    <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
      {/* 标题行 */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
        <Typography
          variant="subtitle2"
          fontWeight={700}
          sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}
        >
          <FolderIcon sx={{ fontSize: 16, color: 'primary.main' }} />
          {t('detail.downloads')}
        </Typography>
        <Tooltip title={t('common.openInBrowser')}>
          <IconButton
            size="small"
            component="a"
            href={toFull(mirrorUrl)}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={t('common.openInBrowser')}
          >
            <OpenIcon sx={{ fontSize: 15 }} />
          </IconButton>
        </Tooltip>
      </Box>

      {/* 完整 URL 展示 */}
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
        {toFull(mirrorUrl)}
      </Box>

      <Divider sx={{ mb: 1 }} />
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 0.5 }}>
        <Typography variant="caption" color="text.secondary" fontWeight={600}>
          {t('detail.installImages')}
        </Typography>
        {/* 文件数量角标，超过可视行数时提示"可滚动" */}
        <Typography variant="caption" color="text.disabled">
          {t('detail.filesCount', { count: files.length })}
          {files.length > 5 ? t('detail.scrollHint') : ''}
        </Typography>
      </Box>

      {/* 固定高度 + 滚动区域 —— 5 行可见，更多文件直接向下滚动 */}
      <Box
        sx={{
          maxHeight: LIST_MAX_HEIGHT,
          overflowY: 'auto',
          // 细滚动条，不影响整体风格
          '&::-webkit-scrollbar': { width: 4 },
          '&::-webkit-scrollbar-track': { bgcolor: 'transparent' },
          '&::-webkit-scrollbar-thumb': {
            bgcolor: 'divider',
            borderRadius: 2,
            '&:hover': { bgcolor: 'text.disabled' },
          },
        }}
      >
        <List dense disablePadding>
          {files.map((file, idx) => {
            const fullUrl = toFull(file.url);
            return (
              <ListItem
                key={file.url}
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
                      }}
                    >
                      {file.name}
                    </Link>
                  }
                  sx={{ m: 0 }}
                />
                <Box sx={{ display: 'flex', gap: 0.3, ml: 0.5, flexShrink: 0 }}>
                  <Tooltip title={copiedIdx === idx ? t('common.copied') : t('common.copyLink')}>
                    <IconButton
                      size="small"
                      sx={{ p: 0.4 }}
                      onClick={() => handleCopy(file.url, idx)}
                      color={copiedIdx === idx ? 'success' : 'default'}
                      aria-label={`${t('common.copyLink')}: ${file.name}`}
                    >
                      {copiedIdx === idx ? (
                        <CheckIcon sx={{ fontSize: 13 }} />
                      ) : (
                        <CopyIcon sx={{ fontSize: 13 }} />
                      )}
                    </IconButton>
                  </Tooltip>
                  <Tooltip title={t('common.download')}>
                    <IconButton
                      size="small"
                      sx={{ p: 0.4 }}
                      component="a"
                      href={fullUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      color="primary"
                      aria-label={`${t('common.download')}: ${file.name}`}
                    >
                      <DownloadIcon sx={{ fontSize: 13 }} />
                    </IconButton>
                  </Tooltip>
                </Box>
              </ListItem>
            );
          })}
        </List>
      </Box>
    </Paper>
  );
};

// ─── URL 安全校验 ─────────────────────────────────────────────────────────────
// 仅允许 http / https / 相对路径，防止 javascript: 等危险协议被渲染为 href
const SAFE_URL_RE = /^(https?:\/\/|\/)/i;

function sanitizeUrl(url: string): string {
  if (!url) return '#';
  return SAFE_URL_RE.test(url) ? url : '#';
}

// ─── 主页面 ───────────────────────────────────────────────────────────────────
const MirrorDetail: React.FC = () => {
  const { name } = useParams<{ name: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { locale } = useLocaleStore();
  const [searchParams, setSearchParams] = useSearchParams();

  const { data: mirror, isLoading, error } = useMirrorDetail(name || '');

  // Tab 初始值计算 —— 提取为纯函数，依赖完全显式，避免 effect 闭包过期
  const tabParam = searchParams.get('tab');
  const hasDoc = name ? hasMdxDoc(name, locale) : false;

  const computeTab = React.useCallback((param: string | null, docAvailable: boolean): number => {
    if (param === 'help' || param === '0') return 0;
    if (param === 'files' || param === '1') return 1;
    if (param === 'downloads' || param === '2') return 2;
    // 无参数时：有文档默认帮助，否则文件列表
    return docAvailable ? 0 : 1;
  }, []);

  const [tabValue, setTabValue] = useState(() => computeTab(tabParam, hasDoc));

  // tabParam / locale / 文档可用性变化时重算 Tab，依赖完全显式
  React.useEffect(() => {
    setTabValue(computeTab(tabParam, hasDoc));
  }, [tabParam, hasDoc, computeTab]);

  // Tab 切换时同步到 URL，不产生历史记录（replace）
  const handleTabChange = (_: React.SyntheticEvent, v: number) => {
    setTabValue(v);
    const labels = ['help', 'files', 'downloads'];
    setSearchParams({ tab: labels[v] ?? 'help' }, { replace: true });
  };

  const [copiedUrl, setCopiedUrl] = useState(false);

  const toFull = (url: string) =>
    url ? (url.startsWith('http') ? url : `${window.location.origin}${sanitizeUrl(url)}`) : '';

  const fullMirrorUrl = mirror ? toFull(mirror.url) : '';

  const handleCopyUrl = async () => {
    if (!mirror) return;
    try {
      await navigator.clipboard.writeText(fullMirrorUrl);
      setCopiedUrl(true);
      setTimeout(() => setCopiedUrl(false), 2000);
    } catch {
      /* ignore */
    }
  };

  // 右侧侧栏是否显示：只有 API 返回了 files 且不为空时才渲染
  const hasFiles = Array.isArray(mirror?.files) && (mirror?.files.length ?? 0) > 0;

  if (isLoading) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Skeleton variant="text" width={200} height={24} sx={{ mb: 3 }} />
        <Skeleton variant="rectangular" height={120} sx={{ borderRadius: 2, mb: 3 }} />
        <Skeleton variant="rectangular" height={200} sx={{ borderRadius: 2 }} />
      </Container>
    );
  }

  if (error || !mirror) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Alert
          severity="error"
          action={
            <Button color="inherit" size="small" onClick={() => navigate('/')}>
              {t('error.backHome')}
            </Button>
          }
        >
          {error ? t('error.loadFailed') : t('error.notFound')}
        </Alert>
      </Container>
    );
  }

  return (
    <>
      <Helmet>
        <html lang={locale === 'en' ? 'en' : 'zh-CN'} />
        <title>
          {locale === 'en'
            ? `${mirror.name.en} Mirror — JCUT Mirror`
            : `${mirror.name.zh} 镜像 - 荆楚理工学院开源软件镜像站 JCUT Mirror`}
        </title>
        <meta
          name="description"
          content={
            locale === 'en'
              ? `${mirror.name.en} - ${mirror.desc.en} High-speed mirror provided by JCUT Mirror.`
              : `${mirror.name.zh} - ${mirror.desc.zh} 由荆楚理工学院开源软件镜像站（JCUT Mirror）提供高速下载。`
          }
        />
        <meta
          name="keywords"
          content={
            locale === 'en'
              ? `${mirror.name.en},${mirror.id},${mirror.name.en} mirror,${mirror.name.en} download,JCUT Mirror,open source mirror`
              : `${mirror.name.zh},${mirror.id},${mirror.name.zh}镜像,${mirror.name.zh}下载,JCUT Mirror,荆楚理工学院镜像站,开源软件镜像`
          }
        />
        <link rel="canonical" href={canonicalUrl(`/mirrors/${mirror.id}`)} />
        <meta property="og:type" content="website" />
        <meta property="og:title" content={`${mirror.name[locale]} - JCUT Mirror`} />
        <meta property="og:description" content={mirror.desc[locale]} />
        <meta property="og:url" content={canonicalUrl(`/mirrors/${mirror.id}`)} />
        <meta property="og:image" content={`${SITE_ORIGIN}/favicon.svg`} />
        <meta name="twitter:card" content="summary" />
        <meta name="twitter:title" content={`${mirror.name[locale]} - JCUT Mirror`} />
        <meta name="twitter:description" content={mirror.desc[locale]} />
        {/* 结构化数据：面包屑 */}
        <script type="application/ld+json">
          {breadcrumbJsonLd([
            { name: locale === 'en' ? 'Home' : '首页', url: '/' },
            { name: mirror.name[locale], url: `/mirrors/${mirror.id}` },
          ])}
        </script>
        {/* 结构化数据：软件应用 */}
        <script type="application/ld+json">
          {mirrorJsonLd(mirror.name[locale], mirror.desc[locale], `/mirrors/${mirror.id}`)}
        </script>
      </Helmet>

      <Container maxWidth="lg" sx={{ py: { xs: 3, md: 4 } }}>
        {/* 面包屑 */}
        <Breadcrumbs sx={{ mb: 2 }}>
          <Link component={RouterLink} to="/" underline="hover" color="text.secondary">
            {t('nav.home')}
          </Link>
          <Typography color="text.primary" fontWeight={500}>
            {mirror.name[locale]}
          </Typography>
        </Breadcrumbs>

        <Button
          startIcon={<BackIcon />}
          onClick={() => {
            navigate('/');
            // 跳回首页后滚动到镜像列表区，与 SearchBar 的跳转逻辑保持一致
            setTimeout(() => {
              document.getElementById('mirrors')?.scrollIntoView({ behavior: 'smooth' });
            }, 150);
          }}
          size="small"
          sx={{ mb: 3, color: 'text.secondary' }}
        >
          {t('common.backToList')}
        </Button>

        {/* ── 顶部信息卡 ── */}
        <Paper variant="outlined" sx={{ p: { xs: 2.5, md: 3 }, borderRadius: 2, mb: 3 }}>
          <Grid container spacing={3} alignItems="flex-start">
            {/* 左侧：名称 / 描述 / URL */}
            {/* 若没有文件，左侧占满 12 列；有文件时占 8 列，右侧 4 列给侧栏 */}
            <Grid size={{ xs: 12 }}>
              <Box
                sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 0.5, flexWrap: 'wrap' }}
              >
                <Typography variant="h4" fontWeight={800} fontSize={{ xs: '1.5rem', md: '2rem' }}>
                  {mirror.name[locale]}
                </Typography>
                <StatusChip status={mirror.status} size="medium" />
                {/* id 在详情页保留作为标签，因为详情页有充足空间展示 */}
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

              <Typography variant="body1" color="text.secondary" sx={{ lineHeight: 1.7, mb: 2 }}>
                {mirror.desc[locale]}
              </Typography>

              {/* 完整 URL 行 */}
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
                      startIcon={
                        copiedUrl ? <CheckIcon fontSize="small" /> : <CopyIcon fontSize="small" />
                      }
                      sx={{ fontFamily: '"JetBrains Mono", monospace' }}
                    >
                      {copiedUrl ? t('mirror.copied') : t('mirror.copyUrl')}
                    </Button>
                  </Tooltip>
                  <Tooltip title={t('common.openInBrowser')}>
                    <IconButton
                      size="small"
                      component="a"
                      href={fullMirrorUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      color="primary"
                      aria-label={t('common.openInBrowser')}
                    >
                      <OpenIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </Box>
              </Box>
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

        {/* ── Tabs ── */}
        <Box>
          <Tabs
            value={tabValue}
            onChange={handleTabChange}
            variant="scrollable"
            scrollButtons="auto"
            allowScrollButtonsMobile
            sx={{
              borderBottom: 1,
              borderColor: 'divider',
              '& .MuiTab-root': { fontWeight: 600, minWidth: { xs: 80, sm: 120 } },
            }}
          >
            <Tab label={t('detail.helpDoc')} />
            <Tab label={t('detail.fileList')} />
            {hasFiles && <Tab label={t('detail.installImages')} />}
          </Tabs>

          <TabPanel value={tabValue} index={0}>
            <DocViewer mirrorId={mirror.id} />
          </TabPanel>

          <TabPanel value={tabValue} index={1}>
            <DirectoryListing mirrorUrl={mirror.url} mirrorName={mirror.name[locale]} />
          </TabPanel>

          {hasFiles && (
            <TabPanel value={tabValue} index={2}>
              <IsoFilesCard files={mirror.files} mirrorUrl={mirror.url} />
            </TabPanel>
          )}
        </Box>
      </Container>
    </>
  );
};

export default MirrorDetail;
