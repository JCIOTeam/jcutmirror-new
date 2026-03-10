// src/pages/MirrorDetail.tsx
// 镜像详情页

import {
  ArrowBack as BackIcon,
  ContentCopy as CopyIcon,
  CheckCircle as CheckIcon,
  OpenInNew as OpenIcon,
  Link as LinkIcon,
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
} from '@mui/material';
import React, { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { useTranslation } from 'react-i18next';
import { useParams, useNavigate, Link as RouterLink } from 'react-router-dom';

import CodeBlock from '../components/docs/CodeBlock';
import DocViewer from '../components/docs/DocViewer';
import FileTable from '../components/mirrors/FileTable';
import StatusChip from '../components/mirrors/StatusChip';
import SyncTimeline from '../components/mirrors/SyncTimeline';
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

/**
 * 镜像详情页
 */
const MirrorDetail: React.FC = () => {
  const { name } = useParams<{ name: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { locale } = useLocaleStore();
  const [tabValue, setTabValue] = useState(0);
  const [copiedUrl, setCopiedUrl] = useState(false);

  const { data: mirror, isLoading, error } = useMirrorDetail(name || '');

  // 文档内容现在由 DocViewer 组件内部处理 MDX 加载

  const handleCopyUrl = async () => {
    if (!mirror) return;
    try {
      await navigator.clipboard.writeText(mirror.url);
      setCopiedUrl(true);
      setTimeout(() => setCopiedUrl(false), 2000);
    } catch {
      console.error('复制失败');
    }
  };

  // 生成换源脚本
  const generateScript = (method: 'curl' | 'wget') => {
    if (!mirror) return '';
    const url = mirror.url;
    if (method === 'curl') {
      return `# 使用 curl 配置 ${mirror.name[locale]} 镜像源\ncurl -fsSL ${url}/setup.sh | bash`;
    }
    return `# 使用 wget 配置 ${mirror.name[locale]} 镜像源\nwget -qO- ${url}/setup.sh | bash`;
  };

  // 加载中骨架屏
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
        <title>{mirror.name[locale]} - JCut Mirror</title>
        <meta name="description" content={mirror.desc[locale]} />
      </Helmet>

      <Container maxWidth="lg" sx={{ py: { xs: 3, md: 4 } }}>
        {/* 面包屑 */}
        <Breadcrumbs sx={{ mb: 2 }} aria-label="面包屑导航">
          <Link
            component={RouterLink}
            to="/"
            underline="hover"
            color="text.secondary"
            sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}
          >
            {t('nav.home')}
          </Link>
          <Typography color="text.primary" fontWeight={500}>
            {mirror.id}
          </Typography>
        </Breadcrumbs>

        {/* 返回按钮 */}
        <Button
          startIcon={<BackIcon />}
          onClick={() => navigate('/')}
          size="small"
          sx={{ mb: 3, color: 'text.secondary' }}
        >
          {locale === 'zh' ? '返回列表' : 'Back to List'}
        </Button>

        {/* 镜像信息卡片 */}
        <Paper
          variant="outlined"
          sx={{ p: { xs: 2.5, md: 3 }, borderRadius: 2, mb: 3 }}
          aria-label={`${mirror.name[locale]} 镜像信息`}
        >
          <Grid container spacing={3} alignItems="flex-start">
            {/* 左侧：名称描述 */}
            <Grid size={{ xs: 12, md: 8 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1, flexWrap: 'wrap' }}>
                <Typography
                  variant="h4"
                  fontWeight={800}
                  fontFamily='"JetBrains Mono", monospace'
                  fontSize={{ xs: '1.5rem', md: '2rem' }}
                >
                  {mirror.id}
                </Typography>
                <StatusChip status={mirror.status} size="medium" />
                {mirror.type && (
                  <Chip
                    label={mirror.type}
                    size="small"
                    variant="outlined"
                    sx={{ fontFamily: '"JetBrains Mono", monospace', fontSize: '0.72rem' }}
                  />
                )}
              </Box>

              <Typography variant="h6" color="text.secondary" fontWeight={400} sx={{ mb: 1 }}>
                {mirror.name[locale]}
              </Typography>

              <Typography variant="body1" color="text.secondary" sx={{ lineHeight: 1.7, mb: 2 }}>
                {mirror.desc[locale]}
              </Typography>

              {/* 镜像URL */}
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1,
                  p: 1.5,
                  bgcolor: 'action.hover',
                  borderRadius: 1.5,
                  fontFamily: '"JetBrains Mono", monospace',
                  fontSize: '0.85rem',
                  color: 'primary.main',
                  wordBreak: 'break-all',
                }}
              >
                <LinkIcon fontSize="small" sx={{ flexShrink: 0 }} />
                <Typography
                  variant="body2"
                  sx={{ flex: 1, fontFamily: 'inherit', color: 'inherit' }}
                >
                  {mirror.url}
                </Typography>
                <Tooltip title={copiedUrl ? t('mirror.copied') : t('mirror.copyUrl')}>
                  <Button
                    size="small"
                    onClick={handleCopyUrl}
                    color={copiedUrl ? 'success' : 'primary'}
                    startIcon={copiedUrl ? <CheckIcon fontSize="small" /> : <CopyIcon fontSize="small" />}
                    sx={{ flexShrink: 0, fontFamily: 'inherit' }}
                    aria-label="复制镜像URL"
                  >
                    {copiedUrl ? t('mirror.copied') : t('mirror.copyUrl')}
                  </Button>
                </Tooltip>
              </Box>
            </Grid>

            {/* 右侧：基本信息 */}
            <Grid size={{ xs: 12, md: 4 }}>
              <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
                <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1.5 }}>
                  {t('detail.basicInfo')}
                </Typography>
                {[
                  { label: t('mirror.size'), value: mirror.size || '-' },
                  { label: t('mirror.type'), value: mirror.type || '-' },
                  {
                    label: t('mirror.upstream'),
                    value: mirror.upstream || '-',
                    mono: true,
                    truncate: true,
                  },
                ].map(({ label, value, mono, truncate }) => (
                  <Box key={label} sx={{ mb: 1 }}>
                    <Typography variant="caption" color="text.secondary" display="block">
                      {label}
                    </Typography>
                    <Typography
                      variant="body2"
                      fontWeight={600}
                      sx={{
                        fontFamily: mono ? '"JetBrains Mono", monospace' : undefined,
                        fontSize: mono ? '0.8rem' : undefined,
                        overflow: truncate ? 'hidden' : undefined,
                        textOverflow: truncate ? 'ellipsis' : undefined,
                        whiteSpace: truncate ? 'nowrap' : undefined,
                      }}
                      title={truncate ? value : undefined}
                    >
                      {value}
                    </Typography>
                  </Box>
                ))}

                {/* 外部帮助链接 */}
                {mirror.helpUrl && (
                  <Button
                    fullWidth
                    size="small"
                    variant="outlined"
                    endIcon={<OpenIcon fontSize="small" />}
                    href={mirror.helpUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    sx={{ mt: 1 }}
                  >
                    {t('mirror.viewHelp')}
                  </Button>
                )}
              </Paper>
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

        {/* Tab 内容区 */}
        <Box>
          <Tabs
            value={tabValue}
            onChange={(_, v) => setTabValue(v)}
            aria-label="镜像详情标签页"
            sx={{
              borderBottom: 1,
              borderColor: 'divider',
              '& .MuiTab-root': { fontWeight: 600 },
            }}
          >
            <Tab label={t('detail.helpDoc')} id="tab-0" aria-controls="tabpanel-0" />
            <Tab
              label={`${t('detail.files')} (${mirror.files?.length || 0})`}
              id="tab-1"
              aria-controls="tabpanel-1"
            />
            <Tab label={t('detail.quickSetup')} id="tab-2" aria-controls="tabpanel-2" />
          </Tabs>

          {/* 帮助文档 Tab - DocViewer 会自动处理 MDX 加载 */}
          <TabPanel value={tabValue} index={0}>
            <DocViewer mirrorId={mirror.id} />
          </TabPanel>

          {/* 文件下载 Tab */}
          <TabPanel value={tabValue} index={1}>
            <FileTable files={mirror.files || []} />
          </TabPanel>

          {/* 快速换源 Tab */}
          <TabPanel value={tabValue} index={2}>
            <Alert severity="info" sx={{ mb: 3 }}>
              {locale === 'zh'
                ? '以下脚本仅供参考，请根据实际情况调整。执行前请确认脚本内容。'
                : 'The following scripts are for reference only. Please review before execution.'}
            </Alert>

            <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 1.5 }}>
              {t('mirror.usingCurl')}
            </Typography>
            <CodeBlock language="bash">{generateScript('curl')}</CodeBlock>

            <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 1.5, mt: 3 }}>
              {t('mirror.usingWget')}
            </Typography>
            <CodeBlock language="bash">{generateScript('wget')}</CodeBlock>
          </TabPanel>
        </Box>
      </Container>
    </>
  );
};

export default MirrorDetail;
