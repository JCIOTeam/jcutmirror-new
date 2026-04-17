// src/pages/StatusPage.tsx
// 系统状态页 — 实时展示镜像同步健康情况

import {
  CheckCircle as OkIcon,
  Warning as WarnIcon,
  Error as ErrorIcon,
  Sync as SyncIcon,
  Storage as StorageIcon,
  Speed as SpeedIcon,
  Schedule as ScheduleIcon,
  ArrowBack as BackIcon,
  Circle as DotIcon,
  BarChart as GrafanaIcon,
  OpenInNew as OpenInNewIcon,
  ExpandMore as ExpandMoreIcon,
} from '@mui/icons-material';
import {
  Box,
  Container,
  Typography,
  Grid,
  Paper,
  Chip,
  Button,
  Divider,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Skeleton,
  Tooltip,
  LinearProgress,
  Alert,
  Link,
  Accordion,
  AccordionSummary,
  AccordionDetails,
} from '@mui/material';
import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, Link as RouterLink } from 'react-router-dom';

import RefreshButton from '../components/common/RefreshButton';
import { useMirrors } from '../hooks/useMirrors';
import { useLocaleStore, useThemeStore } from '../stores/mirrorStore';
import { canonicalUrl } from '../utils/seo';
import { formatRelativeTime, formatAbsoluteTime, parseTimestamp } from '../utils/time';

// ── Grafana 可用性探测 ────────────────────────────────────────────────────────
// 发一次 HEAD 请求探测 /grafana/ 是否可达，避免未部署时展示无效区块
function useGrafanaAvailable(): boolean | null {
  const [available, setAvailable] = React.useState<boolean | null>(null);
  React.useEffect(() => {
    const controller = new AbortController();
    fetch('/grafana/', { method: 'HEAD', signal: controller.signal })
      .then((res) => setAvailable(res.ok))
      .catch(() => setAvailable(false));
    return () => controller.abort();
  }, []);
  return available;
}

// ── 系统整体健康状态 ──────────────────────────────────────────────────────────
type HealthLevel = 'operational' | 'degraded' | 'outage';

/**
 * 仅 failed 视为不可用；syncing/cached/succeeded/paused 都对外可访问
 * - cached: 历史快照可正常下载
 * - syncing: 服务在跑，旧文件依然可访问
 * - paused: 维护中但内容仍在
 */
function calcHealth(total: number, unavailable: number): HealthLevel {
  if (total === 0) return 'operational';
  const ratio = unavailable / total;
  if (ratio === 0) return 'operational';
  if (ratio < 0.2) return 'degraded';
  return 'outage';
}

const HEALTH_CONFIG: Record<
  HealthLevel,
  { icon: React.ReactNode; color: 'success' | 'warning' | 'error'; bg: string }
> = {
  operational: {
    icon: <OkIcon />,
    color: 'success',
    bg: 'rgba(16,185,129,0.08)',
  },
  degraded: {
    icon: <WarnIcon />,
    color: 'warning',
    bg: 'rgba(245,158,11,0.08)',
  },
  outage: {
    icon: <ErrorIcon />,
    color: 'error',
    bg: 'rgba(239,68,68,0.08)',
  },
};

// ── 存储大小解析（"1.2T" / "500G" → 字节数，用于排序和加总）───────────────
function parseSize(s: string): number {
  if (!s) return 0;
  const m = s.trim().match(/^([\d.]+)\s*([KMGT]?B?|[KMGT])$/i);
  if (!m) return 0;
  const n = parseFloat(m[1]);
  const u = m[2].toUpperCase().replace('B', '');
  const map: Record<string, number> = { '': 1, K: 1e3, M: 1e6, G: 1e9, T: 1e12 };
  return n * (map[u] ?? 1);
}

function formatBytes(bytes: number): string {
  if (bytes >= 1e12) return `${(bytes / 1e12).toFixed(1)} T`;
  if (bytes >= 1e9) return `${(bytes / 1e9).toFixed(1)} G`;
  if (bytes >= 1e6) return `${(bytes / 1e6).toFixed(1)} M`;
  return `${bytes} B`;
}

// ── 统计卡片 ─────────────────────────────────────────────────────────────────
interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
  sub?: string;
  color?: string;
}
const StatCard: React.FC<StatCardProps> = ({ icon, label, value, sub, color }) => (
  <Paper
    variant="outlined"
    sx={{
      p: 2.5,
      borderRadius: 2,
      height: '100%',
      display: 'flex',
      alignItems: 'flex-start',
      gap: 2,
    }}
  >
    <Box sx={{ color: color ?? 'primary.main', mt: 0.3, flexShrink: 0 }}>{icon}</Box>
    <Box>
      <Typography
        variant="caption"
        sx={{
          color: 'text.secondary',
          display: 'block',
          mb: 0.4,
        }}
      >
        {label}
      </Typography>
      <Typography
        variant="h5"
        sx={{
          fontWeight: 800,
          lineHeight: 1.2,
        }}
      >
        {value}
      </Typography>
      {sub && (
        <Typography
          variant="caption"
          sx={{
            color: 'text.secondary',
            mt: 0.3,
            display: 'block',
          }}
        >
          {sub}
        </Typography>
      )}
    </Box>
  </Paper>
);

// ── 主页面 ────────────────────────────────────────────────────────────────────
const StatusPage: React.FC = () => {
  const { t } = useTranslation();
  const { locale } = useLocaleStore();
  const { mode: themeMode } = useThemeStore();
  const grafanaAvailable = useGrafanaAvailable();
  const navigate = useNavigate();
  const { data: mirrors = [], isLoading, isFetching, error, refetch, dataUpdatedAt } = useMirrors();

  // ── 聚合统计 ──────────────────────────────────────────────────────────────
  const stats = useMemo(() => {
    const total = mirrors.length;
    const succeeded = mirrors.filter((m) => m.status === 'succeeded').length;
    const failed = mirrors.filter((m) => m.status === 'failed').length;
    const syncing = mirrors.filter((m) => m.status === 'syncing').length;
    const cached = mirrors.filter((m) => m.status === 'cached').length;
    const paused = mirrors.filter((m) => m.status === 'paused').length;

    // 可用率 = (succeeded + cached + syncing + paused) / total
    // 已缓存/同步中/暂停的镜像，文件层面对用户都是可访问的；只有 failed 才真的不可用
    const available = succeeded + cached + syncing + paused;
    const successRate = total > 0 ? Math.round((available / total) * 100) : 0;

    // 存储大小汇总
    const totalBytes = mirrors.reduce((acc, m) => acc + parseSize(m.size), 0);

    // 今日同步数
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const syncedToday = mirrors.filter((m) => {
      const d = parseTimestamp(m.lastUpdated);
      return d && d >= todayStart;
    }).length;

    // 最近同步的 10 条（按 lastUpdated 降序）
    const recentlySynced = [...mirrors]
      .filter((m) => parseTimestamp(m.lastUpdated) !== null)
      .sort((a, b) => {
        const ta = parseTimestamp(a.lastUpdated)?.getTime() ?? 0;
        const tb = parseTimestamp(b.lastUpdated)?.getTime() ?? 0;
        return tb - ta;
      })
      .slice(0, 8);

    // 即将同步的 8 条（nextScheduled > now，按升序）
    const now = Date.now();
    const upcoming = [...mirrors]
      .filter((m) => {
        const d = parseTimestamp(m.nextScheduled);
        return d && d.getTime() > now;
      })
      .sort((a, b) => {
        const ta = parseTimestamp(a.nextScheduled)?.getTime() ?? 0;
        const tb = parseTimestamp(b.nextScheduled)?.getTime() ?? 0;
        return ta - tb;
      })
      .slice(0, 8);

    // 失败列表（按上次成功时间升序，越久远越靠前）
    const failedList = mirrors
      .filter((m) => m.status === 'failed')
      .sort((a, b) => {
        const ta = parseTimestamp(a.lastSuccess)?.getTime() ?? 0;
        const tb = parseTimestamp(b.lastSuccess)?.getTime() ?? 0;
        return ta - tb;
      });

    return {
      total,
      succeeded,
      failed,
      syncing,
      cached,
      paused,
      available,
      successRate,
      totalBytes,
      syncedToday,
      recentlySynced,
      upcoming,
      failedList,
    };
  }, [mirrors]);

  // 健康度只看 failed —— 与可用率含义一致
  const health = calcHealth(stats.total, stats.failed);
  const healthCfg = HEALTH_CONFIG[health];
  const lastChecked = dataUpdatedAt ? new Date(dataUpdatedAt) : null;

  // ── 渲染 ──────────────────────────────────────────────────────────────────
  return (
    <>
      <title>{`${t('status.title')} - 荆楚理工学院开源软件镜像站 JCUT Mirror`}</title>
      <meta
        name="description"
        content="荆楚理工学院开源软件镜像站实时同步状态监控，查看各镜像源的同步健康情况、成功率和服务器指标。"
      />
      <link rel="canonical" href={canonicalUrl('/status')} />
      <Container maxWidth="lg" sx={{ py: { xs: 3, md: 4 } }}>
        {/* 面包屑 */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3, flexWrap: 'wrap' }}>
          <Button
            startIcon={<BackIcon />}
            onClick={() => navigate('/')}
            size="small"
            sx={{ color: 'text.secondary' }}
          >
            {t('common.backToHome')}
          </Button>
          <Typography
            sx={{
              color: 'text.disabled',
              display: { xs: 'none', sm: 'block' },
            }}
          >
            /
          </Typography>
          <Typography
            variant="body2"
            sx={{
              color: 'text.secondary',
            }}
          >
            {t('status.title')}
          </Typography>
          <Box sx={{ flex: 1 }} />
          <RefreshButton onClick={() => refetch()} />
        </Box>

        {/* 刷新进度条——仅在后台 refetch 时（非首次加载）显示 */}
        <LinearProgress
          sx={{
            mb: 2,
            borderRadius: 1,
            height: 3,
            opacity: isFetching && !isLoading ? 1 : 0,
            transition: 'opacity 0.3s',
          }}
        />

        {/* 整体内容区：刷新时轻微淡出，提示数据更新中 */}
        <Box
          sx={{
            opacity: isFetching && !isLoading ? 0.55 : 1,
            pointerEvents: isFetching && !isLoading ? 'none' : 'auto',
            transition: 'opacity 0.25s',
          }}
        >
          {/* 整体健康状态横幅 */}
          {isLoading ? (
            <Skeleton variant="rectangular" height={88} sx={{ borderRadius: 3, mb: 4 }} />
          ) : error ? (
            <Alert severity="error" sx={{ mb: 4, borderRadius: 2 }}>
              {t('error.loadFailed')}
            </Alert>
          ) : (
            <Paper
              variant="outlined"
              sx={{
                p: 3,
                borderRadius: 3,
                mb: 4,
                bgcolor: healthCfg.bg,
                borderColor: `${healthCfg.color}.main`,
                display: 'flex',
                alignItems: 'center',
                gap: 2,
                flexWrap: 'wrap',
              }}
            >
              <Box sx={{ color: `${healthCfg.color}.main`, display: 'flex', alignItems: 'center' }}>
                {healthCfg.icon}
              </Box>
              <Box sx={{ flex: 1 }}>
                <Typography
                  variant="h6"
                  color={`${healthCfg.color}.main`}
                  sx={{
                    fontWeight: 800,
                  }}
                >
                  {t(`status.${health}`)}
                </Typography>
                <Typography
                  variant="caption"
                  sx={{
                    color: 'text.secondary',
                  }}
                >
                  {t('status.lastChecked', {
                    time: lastChecked ? formatAbsoluteTime(lastChecked.getTime(), locale) : '-',
                  })}
                </Typography>
              </Box>
              <Chip
                label={`${stats.successRate}% ${t('status.availableLabel')}`}
                color={healthCfg.color}
                variant="filled"
                sx={{ fontWeight: 700, fontSize: '0.85rem' }}
              />
            </Paper>
          )}

          {/* 统计卡片 */}
          <Grid container spacing={2.5} sx={{ mb: 4 }}>
            {isLoading ? (
              [...Array(6)].map((_, i) => (
                <Grid key={i} size={{ xs: 6, sm: 4, md: 2 }}>
                  <Skeleton variant="rectangular" height={100} sx={{ borderRadius: 2 }} />
                </Grid>
              ))
            ) : (
              <>
                <Grid size={{ xs: 6, sm: 4, md: 2 }}>
                  <StatCard
                    icon={<StorageIcon />}
                    label={t('status.totalMirrors')}
                    value={stats.total}
                    color="primary.main"
                  />
                </Grid>
                <Grid size={{ xs: 6, sm: 4, md: 2 }}>
                  <StatCard
                    icon={<OkIcon />}
                    label={t('status.succeeded')}
                    value={stats.succeeded}
                    sub={`${stats.successRate}%`}
                    color="success.main"
                  />
                </Grid>
                <Grid size={{ xs: 6, sm: 4, md: 2 }}>
                  <StatCard
                    icon={<ErrorIcon />}
                    label={t('status.failed')}
                    value={stats.failed}
                    color={stats.failed > 0 ? 'error.main' : 'text.disabled'}
                  />
                </Grid>
                <Grid size={{ xs: 6, sm: 4, md: 2 }}>
                  <StatCard
                    icon={<SyncIcon />}
                    label={t('status.syncing')}
                    value={stats.syncing}
                    color="info.main"
                  />
                </Grid>
                <Grid size={{ xs: 6, sm: 4, md: 2 }}>
                  <StatCard
                    icon={<SpeedIcon />}
                    label={t('status.syncedToday')}
                    value={stats.syncedToday}
                    color="primary.main"
                  />
                </Grid>
                <Grid size={{ xs: 6, sm: 4, md: 2 }}>
                  <StatCard
                    icon={<StorageIcon />}
                    label={t('status.totalStorage')}
                    value={stats.totalBytes > 0 ? formatBytes(stats.totalBytes) : '-'}
                    color="text.secondary"
                  />
                </Grid>
              </>
            )}
          </Grid>

          {/* 成功率进度条 */}
          {!isLoading && !error && (
            <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 2, mb: 4 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                <Typography
                  variant="body2"
                  sx={{
                    fontWeight: 600,
                  }}
                >
                  {t('status.availability')}
                </Typography>
                <Typography
                  variant="body2"
                  sx={{
                    fontWeight: 700,
                    color: 'success.main',
                  }}
                >
                  {stats.successRate}%
                </Typography>
              </Box>
              <LinearProgress
                variant="determinate"
                value={stats.successRate}
                color={
                  health === 'operational' ? 'success' : health === 'degraded' ? 'warning' : 'error'
                }
                sx={{ height: 8, borderRadius: 4 }}
              />
              <Box sx={{ display: 'flex', gap: 2, mt: 1.5, flexWrap: 'wrap' }}>
                {(
                  [
                    {
                      label: t('status.legendSucceeded'),
                      count: stats.succeeded,
                      color: '#22C55E',
                    },
                    { label: t('status.legendFailed'), count: stats.failed, color: '#EF4444' },
                    { label: t('status.legendSyncing'), count: stats.syncing, color: '#3B82F6' },
                    { label: t('status.legendCached'), count: stats.cached, color: '#94A3B8' },
                  ] as const
                ).map(({ label, count, color }) => (
                  <Box key={label} sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <DotIcon sx={{ fontSize: 10, color }} />
                    <Typography
                      variant="caption"
                      sx={{
                        color: 'text.secondary',
                      }}
                    >
                      {label} <strong style={{ color: 'inherit' }}>{count}</strong>
                    </Typography>
                  </Box>
                ))}
              </Box>
            </Paper>
          )}

          {/* 失败镜像列表 */}
          {!isLoading && stats.failedList.length > 0 && (
            <Box sx={{ mb: 4 }}>
              <Typography
                variant="h6"
                sx={{
                  fontWeight: 700,
                  mb: 2,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1,
                }}
              >
                <ErrorIcon color="error" fontSize="small" />
                {t('status.failedMirrors')}
                <Chip
                  label={stats.failedList.length}
                  size="small"
                  color="error"
                  sx={{ fontWeight: 700, height: 20 }}
                />
              </Typography>
              <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2 }}>
                <Table size="small">
                  <TableHead>
                    <TableRow sx={{ bgcolor: 'action.hover' }}>
                      <TableCell sx={{ fontWeight: 700 }}>{t('status.colMirror')}</TableCell>
                      <TableCell
                        sx={{ fontWeight: 700, display: { xs: 'none', sm: 'table-cell' } }}
                      >
                        {t('status.colLastSuccess')}
                      </TableCell>
                      <TableCell
                        sx={{ fontWeight: 700, display: { xs: 'none', md: 'table-cell' } }}
                      >
                        {t('status.colUpstream')}
                      </TableCell>
                      <TableCell sx={{ fontWeight: 700 }} align="right">
                        {t('status.colAction')}
                      </TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {stats.failedList.map((m) => (
                      <TableRow key={m.id} sx={{ '&:last-child td': { border: 0 } }}>
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <DotIcon sx={{ fontSize: 10, color: 'error.main', flexShrink: 0 }} />
                            <Typography
                              variant="body2"
                              sx={{
                                fontWeight: 600,
                              }}
                            >
                              {m.name[locale]}
                            </Typography>
                            <Typography
                              variant="caption"
                              sx={{
                                color: 'text.disabled',
                                fontFamily: '"JetBrains Mono", monospace',
                              }}
                            >
                              {m.id}
                            </Typography>
                          </Box>
                        </TableCell>
                        <TableCell sx={{ display: { xs: 'none', sm: 'table-cell' } }}>
                          <Typography
                            variant="caption"
                            sx={{
                              color: 'text.secondary',
                            }}
                          >
                            {formatRelativeTime(m.lastSuccess, locale)}
                          </Typography>
                        </TableCell>
                        <TableCell
                          sx={{ display: { xs: 'none', md: 'table-cell' }, maxWidth: 200 }}
                        >
                          <Tooltip title={m.upstream} placement="bottom-start">
                            <Typography
                              variant="caption"
                              sx={{
                                color: 'text.secondary',
                                fontFamily: '"JetBrains Mono", monospace',
                                display: 'block',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                              }}
                            >
                              {m.upstream || '-'}
                            </Typography>
                          </Tooltip>
                        </TableCell>
                        <TableCell align="right">
                          <Link
                            component={RouterLink}
                            to={`/mirrors/${m.id}`}
                            variant="caption"
                            underline="hover"
                            color="primary"
                            sx={{ fontWeight: 600 }}
                          >
                            {t('common.details')}
                          </Link>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>
          )}

          {/* 两列：最近同步 + 即将同步 */}
          <Grid container spacing={3}>
            {/* 最近已同步 */}
            <Grid size={{ xs: 12, md: 6 }}>
              <Typography
                variant="h6"
                sx={{
                  fontWeight: 700,
                  mb: 2,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1,
                }}
              >
                <OkIcon color="success" fontSize="small" />
                {t('status.recentSynced')}
              </Typography>
              {isLoading ? (
                [...Array(5)].map((_, i) => (
                  <Skeleton
                    key={i}
                    variant="rectangular"
                    height={44}
                    sx={{ mb: 0.5, borderRadius: 1 }}
                  />
                ))
              ) : (
                <Paper variant="outlined" sx={{ borderRadius: 2, overflow: 'hidden' }}>
                  {stats.recentlySynced.length === 0 ? (
                    <Box sx={{ p: 3, textAlign: 'center' }}>
                      <Typography
                        variant="body2"
                        sx={{
                          color: 'text.secondary',
                        }}
                      >
                        {t('status.noData')}
                      </Typography>
                    </Box>
                  ) : (
                    stats.recentlySynced.map((m, idx) => (
                      <React.Fragment key={m.id}>
                        <Box
                          component={RouterLink}
                          to={`/mirrors/${m.id}`}
                          sx={{
                            display: 'flex',
                            alignItems: 'center',
                            px: 2,
                            py: 1.2,
                            gap: 1.5,
                            textDecoration: 'none',
                            color: 'inherit',
                            '&:hover': { bgcolor: 'action.hover' },
                            transition: 'background 0.15s',
                          }}
                        >
                          <DotIcon sx={{ fontSize: 8, color: 'success.main', flexShrink: 0 }} />
                          <Typography
                            variant="body2"
                            noWrap
                            sx={{
                              fontWeight: 600,
                              flex: 1,
                              minWidth: 0,
                            }}
                          >
                            {m.name[locale]}
                          </Typography>
                          <Typography
                            variant="caption"
                            sx={{
                              color: 'text.secondary',
                              flexShrink: 0,
                            }}
                          >
                            {formatRelativeTime(m.lastUpdated, locale)}
                          </Typography>
                        </Box>
                        {idx < stats.recentlySynced.length - 1 && <Divider />}
                      </React.Fragment>
                    ))
                  )}
                </Paper>
              )}
            </Grid>

            {/* 即将同步 */}
            <Grid size={{ xs: 12, md: 6 }}>
              <Typography
                variant="h6"
                sx={{
                  fontWeight: 700,
                  mb: 2,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1,
                }}
              >
                <ScheduleIcon color="info" fontSize="small" />
                {t('status.upcomingSyncs')}
              </Typography>
              {isLoading ? (
                [...Array(5)].map((_, i) => (
                  <Skeleton
                    key={i}
                    variant="rectangular"
                    height={44}
                    sx={{ mb: 0.5, borderRadius: 1 }}
                  />
                ))
              ) : (
                <Paper variant="outlined" sx={{ borderRadius: 2, overflow: 'hidden' }}>
                  {stats.upcoming.length === 0 ? (
                    <Box sx={{ p: 3, textAlign: 'center' }}>
                      <Typography
                        variant="body2"
                        sx={{
                          color: 'text.secondary',
                        }}
                      >
                        {t('status.noUpcoming')}
                      </Typography>
                    </Box>
                  ) : (
                    stats.upcoming.map((m, idx) => (
                      <React.Fragment key={m.id}>
                        <Box
                          component={RouterLink}
                          to={`/mirrors/${m.id}`}
                          sx={{
                            display: 'flex',
                            alignItems: 'center',
                            px: 2,
                            py: 1.2,
                            gap: 1.5,
                            textDecoration: 'none',
                            color: 'inherit',
                            '&:hover': { bgcolor: 'action.hover' },
                            transition: 'background 0.15s',
                          }}
                        >
                          <DotIcon sx={{ fontSize: 8, color: 'info.main', flexShrink: 0 }} />
                          <Typography
                            variant="body2"
                            noWrap
                            sx={{
                              fontWeight: 600,
                              flex: 1,
                              minWidth: 0,
                            }}
                          >
                            {m.name[locale]}
                          </Typography>
                          <Typography
                            variant="caption"
                            sx={{
                              color: 'text.secondary',
                              flexShrink: 0,
                            }}
                          >
                            {formatRelativeTime(m.nextScheduled, locale)}
                          </Typography>
                        </Box>
                        {idx < stats.upcoming.length - 1 && <Divider />}
                      </React.Fragment>
                    ))
                  )}
                </Paper>
              )}
            </Grid>
          </Grid>

          {/* ── Grafana 系统指标面板 —— 仅在探测到 /grafana/ 可达时渲染 ── */}
          {grafanaAvailable && (
            <Box sx={{ mt: 4 }}>
              <Accordion
                defaultExpanded={false}
                sx={{
                  borderRadius: '12px !important',
                  border: '1px solid',
                  borderColor: 'divider',
                  '&:before': { display: 'none' },
                }}
              >
                <AccordionSummary
                  expandIcon={<ExpandMoreIcon />}
                  sx={{ px: 3, py: 1.5, borderRadius: 'inherit' }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <GrafanaIcon color="primary" fontSize="small" />
                    <Box>
                      <Typography
                        variant="subtitle1"
                        sx={{
                          fontWeight: 700,
                        }}
                      >
                        {t('status.serverMetrics')}
                      </Typography>
                      <Typography
                        variant="caption"
                        sx={{
                          color: 'text.secondary',
                        }}
                      >
                        {t('status.serverMetricsSub')}
                      </Typography>
                    </Box>
                    <Box sx={{ ml: 'auto', mr: 1 }}>
                      <Tooltip title={t('status.openGrafana')}>
                        <Button
                          size="small"
                          variant="outlined"
                          endIcon={<OpenInNewIcon sx={{ fontSize: 14 }} />}
                          component="a"
                          href="/grafana/d/jcut-mirror-system"
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          sx={{ borderRadius: 6, fontSize: '0.75rem' }}
                        >
                          Grafana
                        </Button>
                      </Tooltip>
                    </Box>
                  </Box>
                </AccordionSummary>

                <AccordionDetails sx={{ p: 0 }}>
                  <Divider />

                  {/* 嵌入面板网格 */}
                  <Grid container sx={{ p: 2 }} spacing={2}>
                    {[
                      {
                        title: t('status.cpuUsage'),
                        panelId: 1,
                      },
                      {
                        title: t('status.memUsage'),
                        panelId: 2,
                      },
                      {
                        title: t('status.networkBandwidth'),
                        panelId: 3,
                      },
                      {
                        title: t('status.diskSpace'),
                        panelId: 4,
                      },
                      {
                        title: t('status.nginxRequests'),
                        panelId: 5,
                      },
                      {
                        title: t('status.activeConnections'),
                        panelId: 6,
                      },
                    ].map(({ title, panelId }) => (
                      <Grid key={panelId} size={{ xs: 12, md: 6 }}>
                        <Paper variant="outlined" sx={{ borderRadius: 2, overflow: 'hidden' }}>
                          <Box
                            sx={{
                              px: 2,
                              py: 1,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              borderBottom: '1px solid',
                              borderColor: 'divider',
                              bgcolor: 'action.hover',
                            }}
                          >
                            <Typography
                              variant="caption"
                              sx={{
                                fontWeight: 700,
                              }}
                            >
                              {title}
                            </Typography>
                            <Link
                              href={`/grafana/d/jcut-mirror-system?viewPanel=${panelId}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              variant="caption"
                              color="primary"
                              underline="hover"
                              sx={{ display: 'flex', alignItems: 'center', gap: 0.3 }}
                            >
                              {t('common.fullscreen')}
                              <OpenInNewIcon sx={{ fontSize: 11 }} />
                            </Link>
                          </Box>
                          <Box
                            component="iframe"
                            src={`/grafana/d-solo/jcut-mirror-system?orgId=1&panelId=${panelId}&from=now-1h&to=now&theme=${themeMode}&kiosk`}
                            sx={{
                              display: 'block',
                              width: '100%',
                              height: 220,
                              border: 'none',
                            }}
                            title={title}
                            loading="lazy"
                          />
                        </Paper>
                      </Grid>
                    ))}
                  </Grid>

                  {/* 系统负载全宽面板 */}
                  <Box sx={{ px: 2, pb: 2 }}>
                    <Paper variant="outlined" sx={{ borderRadius: 2, overflow: 'hidden' }}>
                      <Box
                        sx={{
                          px: 2,
                          py: 1,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          borderBottom: '1px solid',
                          borderColor: 'divider',
                          bgcolor: 'action.hover',
                        }}
                      >
                        <Typography
                          variant="caption"
                          sx={{
                            fontWeight: 700,
                          }}
                        >
                          {t('status.systemLoad')}
                        </Typography>
                        <Link
                          href="/grafana/d/jcut-mirror-system?viewPanel=7"
                          target="_blank"
                          rel="noopener noreferrer"
                          variant="caption"
                          color="primary"
                          underline="hover"
                          sx={{ display: 'flex', alignItems: 'center', gap: 0.3 }}
                        >
                          {t('common.fullscreen')}
                          <OpenInNewIcon sx={{ fontSize: 11 }} />
                        </Link>
                      </Box>
                      <Box
                        component="iframe"
                        src={`/grafana/d-solo/jcut-mirror-system?orgId=1&panelId=7&from=now-1h&to=now&theme=${themeMode}&kiosk`}
                        sx={{ display: 'block', width: '100%', height: 200, border: 'none' }}
                        title={t('status.systemLoad')}
                        loading="lazy"
                      />
                    </Paper>
                  </Box>
                </AccordionDetails>
              </Accordion>
            </Box>
          )}
        </Box>
        {/* end opacity wrapper */}
      </Container>
    </>
  );
};

export default StatusPage;
