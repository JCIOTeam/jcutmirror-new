// src/components/mirrors/GithubReleaseViewer.tsx
// Github Release 专用下载页面组件
// 目录结构：/github-release/{org}/{repo}/{version}/{files}

import {
  Download as DownloadIcon,
  ContentCopy as CopyIcon,
  CheckCircle as CheckIcon,
  ArrowBack as BackIcon,
  OpenInNew as OpenIcon,
  Refresh as RefreshIcon,
  LocalOffer as LocalOfferIcon,
  FolderOff as EmptyIcon,
  VerifiedUser as ChecksumIcon,
  Search as SearchIcon,
  Close as ClearIcon,
} from '@mui/icons-material';
import {
  Box,
  Grid,
  Paper,
  Typography,
  IconButton,
  Tooltip,
  Button,
  Chip,
  Skeleton,
  Alert,
  Divider,
  Avatar,
  Link,
  Tab,
  Tabs,
  Card,
  CardActionArea,
  InputBase,
} from '@mui/material';
import React, { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import { useCopyToClipboard } from '../../hooks/useCopyToClipboard';
import {
  detectPlatform,
  detectArch,
  fetchDir,
  platformLabel,
  PLATFORM_ORDER,
  ensureTrailingSlash,
  type Project,
  type Release,
  type FileEntry,
} from '../../utils/githubRelease';

// ─── 平台图标（组件特有，纯 UI）──────────────────────────────────────────────

// macOS 用内联 SVG（Apple logo 版权原因不能用 emoji，unicode 私有区在非 Apple 系统不渲染）
const AppleIcon: React.FC<{ style?: React.CSSProperties }> = ({ style }) => (
  <svg
    viewBox="0 0 24 24"
    width="1em"
    height="1em"
    fill="currentColor"
    style={style}
    aria-hidden="true"
  >
    <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98l-.09.06c-.22.15-2.2 1.28-2.18 3.81.03 3.02 2.65 4.03 2.68 4.04l-.05.17c-.1.36-.51 1.74-1.2 2.8M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
  </svg>
);

// emoji 图标统一构造，消除重复的 <span style> 包裹
const emojiIcon = (emoji: string): React.ReactNode => (
  <span aria-hidden="true" style={{ fontSize: '1rem', lineHeight: 1 }}>
    {emoji}
  </span>
);

const PLATFORM_ICON: Record<FileEntry['platform'], React.ReactNode> = {
  windows: emojiIcon('🪟'),
  linux: emojiIcon('🐧'),
  macos: <AppleIcon style={{ fontSize: '1rem', width: '1rem', height: '1rem' }} />,
  android: emojiIcon('🤖'),
  checksum: null, // 用 MUI VerifiedUser 图标，在渲染处单独处理
  other: emojiIcon('📦'),
};

// ─── 头像颜色：根据 org 名 hash 生成确定性色相 ──────────────────────────────

const AVATAR_COLORS = [
  { bg: '#DBEAFE', fg: '#1D4ED8' }, // blue
  { bg: '#D1FAE5', fg: '#065F46' }, // green
  { bg: '#FEF3C7', fg: '#92400E' }, // amber
  { bg: '#FCE7F3', fg: '#9D174D' }, // pink
  { bg: '#EDE9FE', fg: '#5B21B6' }, // violet
  { bg: '#FFEDD5', fg: '#9A3412' }, // orange
  { bg: '#CFFAFE', fg: '#155E75' }, // cyan
  { bg: '#F0FDF4', fg: '#166534' }, // emerald (light)
];
const AVATAR_COLORS_DARK = [
  { bg: '#1E3A5F', fg: '#93C5FD' },
  { bg: '#064E3B', fg: '#6EE7B7' },
  { bg: '#451A03', fg: '#FDE68A' },
  { bg: '#500724', fg: '#FBCFE8' },
  { bg: '#2E1065', fg: '#C4B5FD' },
  { bg: '#431407', fg: '#FDBA74' },
  { bg: '#083344', fg: '#67E8F9' },
  { bg: '#052E16', fg: '#86EFAC' },
];

function orgColorIndex(org: string): number {
  let h = 0;
  for (let i = 0; i < org.length; i++) h = (Math.imul(31, h) + org.charCodeAt(i)) >>> 0;
  return h % AVATAR_COLORS.length;
}

// ─── 子组件：项目头像（加载中/失败显示彩色首字母 fallback） ──────────────────────

interface ProjectAvatarProps {
  org: string;
  size?: number;
}

const ProjectAvatar: React.FC<ProjectAvatarProps> = ({ org, size = 44 }) => {
  const [imgStatus, setImgStatus] = useState<'loading' | 'loaded' | 'error'>('loading');
  const avatarUrl = `https://github.com/${org}.png?size=64`;
  const colorIdx = orgColorIndex(org);

  return (
    <>
      {imgStatus === 'loaded' ? (
        <Box
          component="img"
          src={avatarUrl}
          alt={org}
          sx={{
            width: size,
            height: size,
            borderRadius: '6px',
            flexShrink: 0,
            objectFit: 'contain',
          }}
        />
      ) : (
        <Avatar
          variant="rounded"
          sx={{
            width: size,
            height: size,
            borderRadius: '6px',
            fontSize: size <= 36 ? '0.9rem' : '1.15rem',
            fontWeight: 700,
            flexShrink: 0,
            bgcolor: (theme) =>
              theme.palette.mode === 'dark'
                ? AVATAR_COLORS_DARK[colorIdx].bg
                : AVATAR_COLORS[colorIdx].bg,
            color: (theme) =>
              theme.palette.mode === 'dark'
                ? AVATAR_COLORS_DARK[colorIdx].fg
                : AVATAR_COLORS[colorIdx].fg,
          }}
        >
          {org[0]?.toUpperCase()}
        </Avatar>
      )}
      {imgStatus !== 'loaded' && (
        <Box
          component="img"
          src={avatarUrl}
          onLoad={() => setImgStatus('loaded')}
          onError={() => setImgStatus('error')}
          sx={{ display: 'none' }}
          alt=""
        />
      )}
    </>
  );
};

// ─── 子组件：项目卡片 ──────────────────────────────────────────────────────────

interface ProjectCardProps {
  project: Project;
  latestVersion?: string;
  onSelect: () => void;
}

const ProjectCard: React.FC<ProjectCardProps> = ({ project, latestVersion, onSelect }) => {
  return (
    <Card
      variant="outlined"
      sx={{
        borderRadius: 3,
        transition: 'border-color 0.18s, box-shadow 0.18s, transform 0.18s',
        '&:hover': {
          borderColor: 'primary.main',
          boxShadow: (theme) =>
            theme.palette.mode === 'dark'
              ? '0 4px 20px rgba(96,165,250,0.12)'
              : '0 4px 20px rgba(59,130,246,0.09)',
          transform: 'translateY(-2px)',
        },
      }}
    >
      <CardActionArea
        onClick={onSelect}
        sx={{
          borderRadius: 3,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'stretch',
          height: '100%',
        }}
      >
        {/* 主体：头像左对齐 + 文字 */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, p: 2, pb: 1.5 }}>
          {/* 头像 */}
          <ProjectAvatar org={project.org} size={44} />

          {/* 名称区 */}
          <Box sx={{ minWidth: 0, flex: 1 }}>
            <Typography
              variant="subtitle2"
              sx={{
                fontWeight: 700,
                fontSize: '0.9rem',
                lineHeight: 1.25,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {project.repo}
            </Typography>
            <Typography
              variant="caption"
              sx={{
                color: 'text.secondary',
                fontFamily: '"JetBrains Mono", monospace',
                fontSize: '0.7rem',
                display: 'block',
                mt: 0.25,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {project.org}
            </Typography>
          </Box>
        </Box>

        {/* footer：版本 tag，细线隔开 */}
        <Box
          sx={{
            px: 2,
            py: 1,
            borderTop: '1px solid',
            borderColor: 'divider',
            display: 'flex',
            alignItems: 'center',
          }}
        >
          {latestVersion ? (
            <Chip
              icon={
                <LocalOfferIcon sx={{ fontSize: '11px !important', color: 'inherit !important' }} />
              }
              label={latestVersion}
              size="small"
              variant="outlined"
              sx={{
                fontFamily: '"JetBrains Mono", monospace',
                fontSize: '0.68rem',
                height: 20,
                maxWidth: '100%',
                bgcolor: (theme) =>
                  theme.palette.mode === 'dark' ? 'rgba(96,165,250,0.07)' : 'rgba(59,130,246,0.05)',
                borderColor: (theme) =>
                  theme.palette.mode === 'dark' ? 'rgba(96,165,250,0.22)' : 'rgba(59,130,246,0.18)',
                color: 'primary.main',
                '& .MuiChip-icon': { color: 'inherit' },
                '& .MuiChip-label': {
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                },
              }}
            />
          ) : (
            <Skeleton variant="rounded" width={76} height={20} />
          )}
        </Box>
      </CardActionArea>
    </Card>
  );
};

// ─── 子组件：文件行 ──────────────────────────────────────────────────────────

interface FileRowProps {
  file: FileEntry;
}

const FileRow: React.FC<FileRowProps> = ({ file }) => {
  const { t } = useTranslation();
  const { copied, copy } = useCopyToClipboard();

  const handleCopy = () => copy(file.href);

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: { xs: 0.5, sm: 1 },
        px: 1.5,
        py: 0.8,
        borderRadius: 1,
        minWidth: 0,
        '&:hover': { bgcolor: 'action.hover' },
      }}
    >
      {/* 文件名 + arch chip（xs 时 chip 换行到文件名下方） */}
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Box
          sx={{ display: 'flex', alignItems: 'baseline', flexWrap: 'wrap', gap: 0.5, minWidth: 0 }}
        >
          <Link
            href={file.href}
            target="_blank"
            rel="noopener noreferrer"
            underline="hover"
            sx={{
              fontFamily: '"JetBrains Mono", monospace',
              fontSize: { xs: '0.75rem', sm: '0.8rem' },
              wordBreak: 'break-all',
              lineHeight: 1.4,
              minWidth: 0,
            }}
          >
            {file.name}
          </Link>
          {file.arch && (
            <Chip
              label={file.arch}
              size="small"
              variant="outlined"
              sx={{
                fontSize: '0.65rem',
                height: 18,
                fontFamily: '"JetBrains Mono", monospace',
                flexShrink: 0,
              }}
            />
          )}
        </Box>
      </Box>

      {/* 大小：xs 时隐藏，避免撑破行 */}
      <Typography
        variant="caption"
        sx={{
          color: 'text.secondary',
          fontFamily: '"JetBrains Mono", monospace',
          fontSize: '0.75rem',
          flexShrink: 0,
          minWidth: { sm: 56 },
          textAlign: 'right',
          display: { xs: 'none', sm: 'block' },
        }}
      >
        {file.size}
      </Typography>

      {/* 操作按钮 */}
      <Box sx={{ display: 'flex', gap: 0.25, flexShrink: 0 }}>
        <Tooltip title={copied ? t('common.copied') : t('common.copyLink')}>
          <IconButton
            size="small"
            sx={{ p: 0.5 }}
            onClick={handleCopy}
            color={copied ? 'success' : 'default'}
          >
            {copied ? <CheckIcon sx={{ fontSize: 14 }} /> : <CopyIcon sx={{ fontSize: 14 }} />}
          </IconButton>
        </Tooltip>
        <Tooltip title={t('common.download')}>
          <IconButton
            size="small"
            sx={{ p: 0.5 }}
            component="a"
            href={file.href}
            target="_blank"
            rel="noopener noreferrer"
            color="primary"
          >
            <DownloadIcon sx={{ fontSize: 14 }} />
          </IconButton>
        </Tooltip>
      </Box>
    </Box>
  );
};

// ─── 主组件 ───────────────────────────────────────────────────────────────────

interface GithubReleaseViewerProps {
  /** 镜像根路径，如 /github-release/ */
  rootPath: string;
}

const GithubReleaseViewer: React.FC<GithubReleaseViewerProps> = ({ rootPath }) => {
  const { t } = useTranslation();

  // ── 状态 ──────────────────────────────────────────────────────────────────

  type ViewMode = 'projects' | 'project';
  const [viewMode, setViewMode] = useState<ViewMode>('projects');

  // 项目列表
  const [projects, setProjects] = useState<Project[]>([]);
  const [projectsLoading, setProjectsLoading] = useState(true);
  const [projectsError, setProjectsError] = useState<string | null>(null);

  // 每个项目的最新版本号（驱动 ProjectCard footer 展示）
  const [versionMap, setVersionMap] = useState<Record<string, string>>({});

  // 当前选中的项目
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [releases, setReleases] = useState<Release[]>([]);
  const [releasesLoading, setReleasesLoading] = useState(false);
  const [selectedReleaseIdx, setSelectedReleaseIdx] = useState(0);

  // 当前 release 的文件
  const [files, setFiles] = useState<FileEntry[]>([]);
  const [filesLoading, setFilesLoading] = useState(false);

  // ── 加载项目列表 ────────────────────────────────────────────────────────

  const loadProjects = useCallback(
    async (signal?: AbortSignal) => {
      setProjectsLoading(true);
      setProjectsError(null);
      try {
        // Step1: 获取 org 列表
        const norm = ensureTrailingSlash(rootPath);
        const orgs = await fetchDir(norm);
        if (signal?.aborted) return;
        const orgDirs = orgs.filter((e) => e.isDir);

        // Step2: 并行拉取每个 org 下的 repo，同时保留 repo 条目供 Step3 复用
        // （旧实现 Step3 又对每个 project 重新 fetchDir(org.href) 拿同一份 org
        //  目录，造成 N 次重复请求）
        const orgReposMaps = await Promise.allSettled(
          orgDirs.map(async (org) => {
            const repos = await fetchDir(org.href);
            const repoEntries = repos.filter((r) => r.isDir);
            const projects = repoEntries.map(
              (repo): Project => ({
                org: org.name.replace(/\/$/, ''),
                repo: repo.name.replace(/\/$/, ''),
                orgDate: org.date,
              })
            );
            // 返回 projects 与对应 repo 的 href 映射，供 Step3 直接取版本目录
            return { projects, repoHrefByName: new Map(repoEntries.map((r) => [r.name.replace(/\/$/, ''), r.href])) };
          })
        );
        if (signal?.aborted) return;

        const allProjects: Project[] = [];
        // org 名 → repo 名 → repo href，供 Step3 复用，避免重复拉取 org 目录
        const orgRepoHrefByName = new Map<string, Map<string, string>>();
        orgReposMaps.forEach((r) => {
          if (r.status !== 'fulfilled') return;
          allProjects.push(...r.value.projects);
          orgRepoHrefByName.set(r.value.projects[0]?.org ?? '', r.value.repoHrefByName);
        });
        setProjects(allProjects);

        // Step3: 并行拉取每个项目的版本列表，只取最新非 LatestRelease 版本号
        // 复用 Step2 已拿到的 repo href，不再重复 fetchDir org 目录
        const versionResults = await Promise.allSettled(
          allProjects.map(async (proj) => {
            const repoHref = orgRepoHrefByName.get(proj.org)?.get(proj.repo);
            if (!repoHref) return null;
            const versions = await fetchDir(repoHref);
            const latest = versions
              .filter((v) => v.isDir && v.name.replace(/\/$/, '').toLowerCase() !== 'latestrelease')
              .sort((a, b) => b.date.localeCompare(a.date))[0];
            return {
              key: `${proj.org}/${proj.repo}`,
              version: latest?.name.replace(/\/$/, '') ?? '',
            };
          })
        );
        if (signal?.aborted) return;

        const map: Record<string, string> = {};
        versionResults.forEach((r) => {
          if (r.status === 'fulfilled' && r.value) {
            map[r.value.key] = r.value.version;
          }
        });
        setVersionMap(map);
      } catch (err: unknown) {
        if (signal?.aborted) return;
        setProjectsError(err instanceof Error ? err.message : String(err));
      } finally {
        if (!signal?.aborted) setProjectsLoading(false);
      }
    },
    [rootPath]
  );

  useEffect(() => {
    const controller = new AbortController();
    loadProjects(controller.signal);
    return () => controller.abort();
  }, [loadProjects]);

  // ── 加载选中项目的 releases ────────────────────────────────────────────

  const loadReleases = useCallback(
    async (proj: Project) => {
      setReleasesLoading(true);
      setReleases([]);
      setFiles([]);
      try {
        const norm = ensureTrailingSlash(rootPath);
        const path = `${norm}${encodeURIComponent(proj.org)}/${encodeURIComponent(proj.repo)}/`;
        const entries = await fetchDir(path);
        const releaseList: Release[] = entries
          .filter((e) => e.isDir)
          .map((e) => {
            const name = e.name.replace(/\/$/, '');
            return {
              name,
              path: e.href,
              date: e.date,
              isLatest: name.toLowerCase() === 'latestrelease',
            };
          })
          // LatestRelease 始终排第一
          .sort((a, b) => {
            if (a.isLatest) return -1;
            if (b.isLatest) return 1;
            return b.date.localeCompare(a.date);
          });
        setReleases(releaseList);
        setSelectedReleaseIdx(0);
      } catch (err) {
        if (import.meta.env.DEV) console.warn('[GithubReleaseViewer] loadReleases:', err);
        setReleases([]);
      } finally {
        setReleasesLoading(false);
      }
    },
    [rootPath]
  );

  // ── 加载 release 文件列表 ─────────────────────────────────────────────

  const loadFiles = useCallback(async (releasePath: string) => {
    setFilesLoading(true);
    setFiles([]);
    try {
      const entries = await fetchDir(releasePath);
      const fileEntries: FileEntry[] = entries
        .filter((e) => !e.isDir)
        .map(
          (e): FileEntry => ({
            name: e.name,
            href: e.href,
            size: e.size,
            date: e.date,
            platform: detectPlatform(e.name),
            arch: detectArch(e.name),
          })
        );
      setFiles(fileEntries);
    } catch (err) {
      if (import.meta.env.DEV) console.warn('[GithubReleaseViewer] loadFiles:', err);
      setFiles([]);
    } finally {
      setFilesLoading(false);
    }
  }, []);

  // 当 release 选择变化时加载文件
  useEffect(() => {
    if (releases.length > 0 && releases[selectedReleaseIdx]) {
      loadFiles(releases[selectedReleaseIdx].path);
    }
  }, [releases, selectedReleaseIdx, loadFiles]);

  // ── 项目选择 ────────────────────────────────────────────────────────────

  const handleSelectProject = (proj: Project) => {
    setSelectedProject(proj);
    setViewMode('project');
    loadReleases(proj);
    setFileSearch('');
  };

  const handleBack = () => {
    setViewMode('projects');
    setSelectedProject(null);
    setReleases([]);
    setFiles([]);
    setFileSearch('');
  };

  // ── 文件搜索 ─────────────────────────────────────────────────────────────
  const [fileSearch, setFileSearch] = useState('');
  const fileSearchRef = useRef<HTMLInputElement>(null);

  // 切换 release 时清空搜索
  useEffect(() => {
    setFileSearch('');
  }, [selectedReleaseIdx]);

  const filteredFiles = useMemo(() => {
    const q = fileSearch.trim().toLowerCase();
    return q ? files.filter((f) => f.name.toLowerCase().includes(q)) : files;
  }, [files, fileSearch]);

  // ── 按平台分组文件（基于过滤后的列表） ────────────────────────────────────
  const filesByPlatform = PLATFORM_ORDER.reduce<Record<string, FileEntry[]>>((acc, p) => {
    const group = filteredFiles.filter((f) => f.platform === p);
    if (group.length > 0) acc[p] = group;
    return acc;
  }, {});

  // ── 渲染：项目列表 ──────────────────────────────────────────────────────

  if (viewMode === 'projects') {
    if (projectsError) {
      return (
        <Alert
          severity="error"
          action={
            <Button size="small" onClick={() => loadProjects()} startIcon={<RefreshIcon />}>
              {t('common.retry')}
            </Button>
          }
        >
          {projectsError}
        </Alert>
      );
    }

    return (
      <Box>
        {/* 标题栏 */}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            mb: 2,
          }}
        >
          <Typography variant="subtitle2" sx={{ color: 'text.secondary' }}>
            {projectsLoading
              ? t('githubRelease.loadingProjects')
              : t('githubRelease.projectCount', { count: projects.length })}
          </Typography>
          <Tooltip title={t('common.refresh')}>
            <IconButton size="small" onClick={() => loadProjects()} disabled={projectsLoading}>
              <RefreshIcon sx={{ fontSize: 16 }} />
            </IconButton>
          </Tooltip>
        </Box>

        {/* 项目卡片网格 */}
        <Grid container spacing={2}>
          {projectsLoading
            ? Array.from({ length: 12 }).map((_, i) => (
                <Grid key={i} size={{ xs: 12, sm: 6, md: 4 }}>
                  <Skeleton variant="rounded" height={140} sx={{ borderRadius: 3 }} />
                </Grid>
              ))
            : projects.map((proj) => {
                const versionKey = `${proj.org}/${proj.repo}`;
                return (
                  <Grid key={versionKey} size={{ xs: 12, sm: 6, md: 4 }}>
                    <ProjectCard
                      project={proj}
                      latestVersion={versionMap[versionKey]}
                      onSelect={() => handleSelectProject(proj)}
                    />
                  </Grid>
                );
              })}
        </Grid>
      </Box>
    );
  }

  // ── 渲染：项目详情 ──────────────────────────────────────────────────────

  const selectedRelease = releases[selectedReleaseIdx];

  return (
    <Box>
      {/* 返回按钮 */}
      <Button
        size="small"
        startIcon={<BackIcon />}
        onClick={handleBack}
        sx={{ mb: 2, color: 'text.secondary' }}
      >
        {t('githubRelease.backToProjects')}
      </Button>

      {/* 项目标题 */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
        <ProjectAvatar org={selectedProject?.org ?? ''} size={32} />
        <Box>
          <Typography variant="h6" sx={{ fontWeight: 700, lineHeight: 1.2 }}>
            {selectedProject?.repo}
          </Typography>
          <Typography
            variant="caption"
            component="a"
            href={`https://github.com/${selectedProject?.org}/${selectedProject?.repo}/releases`}
            target="_blank"
            rel="noopener noreferrer"
            sx={{
              color: 'text.secondary',
              fontFamily: '"JetBrains Mono", monospace',
              fontSize: '0.72rem',
              textDecoration: 'none',
              '&:hover': { textDecoration: 'underline' },
            }}
          >
            {selectedProject?.org}/{selectedProject?.repo} ↗
          </Typography>
        </Box>
      </Box>

      {/* Release 版本 Tabs */}
      {releasesLoading ? (
        <Skeleton variant="rectangular" height={40} sx={{ borderRadius: 1, mb: 2 }} />
      ) : releases.length === 0 ? (
        <Alert severity="info" sx={{ mb: 2 }}>
          {t('githubRelease.noReleases')}
        </Alert>
      ) : (
        <Paper variant="outlined" sx={{ borderRadius: 2, overflow: 'hidden', minWidth: 0 }}>
          {/* 版本 Tabs */}
          <Box sx={{ borderBottom: 1, borderColor: 'divider', bgcolor: 'action.hover', px: 1 }}>
            <Tabs
              value={selectedReleaseIdx}
              onChange={(_, v) => setSelectedReleaseIdx(v)}
              variant="scrollable"
              scrollButtons="auto"
              allowScrollButtonsMobile
              sx={{
                minHeight: 40,
                '& .MuiTab-root': {
                  minHeight: 40,
                  py: 0,
                  fontSize: '0.8rem',
                  fontFamily: '"JetBrains Mono", monospace',
                  fontWeight: 600,
                  textTransform: 'none',
                },
              }}
            >
              {releases.map((rel, idx) => (
                <Tab
                  key={rel.path}
                  label={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      {rel.isLatest && (
                        <Chip
                          label="Latest"
                          size="small"
                          color="success"
                          sx={{ fontSize: '0.6rem', height: 16, mr: 0.25 }}
                        />
                      )}
                      {rel.isLatest ? t('githubRelease.latestRelease') : rel.name}
                    </Box>
                  }
                  value={idx}
                />
              ))}
            </Tabs>
          </Box>

          {/* 版本信息栏 */}
          {selectedRelease && (
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                px: 2,
                py: 1,
                borderBottom: 1,
                borderColor: 'divider',
                gap: 1,
                flexWrap: 'wrap',
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                <LocalOfferIcon sx={{ fontSize: 14, color: 'text.secondary' }} />
                <Typography
                  variant="caption"
                  sx={{
                    fontFamily: '"JetBrains Mono", monospace',
                    color: 'text.secondary',
                  }}
                >
                  {selectedRelease.isLatest
                    ? t('githubRelease.latestRelease')
                    : selectedRelease.name}
                </Typography>
                {selectedRelease.date && (
                  <>
                    <Typography variant="caption" sx={{ color: 'text.disabled' }}>
                      ·
                    </Typography>
                    <Typography variant="caption" sx={{ color: 'text.disabled' }}>
                      {selectedRelease.date}
                    </Typography>
                  </>
                )}
                {!filesLoading && files.length > 0 && (
                  <Chip
                    size="small"
                    label={t('githubRelease.fileCount', { count: files.length })}
                    variant="outlined"
                    sx={{ fontSize: '0.68rem', height: 20 }}
                  />
                )}
              </Box>
              <Tooltip title={t('common.openInBrowser')}>
                <IconButton
                  size="small"
                  component="a"
                  href={selectedRelease.path}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <OpenIcon sx={{ fontSize: 14 }} />
                </IconButton>
              </Tooltip>
            </Box>
          )}

          {/* 文件列表（按平台分组） */}
          <Box sx={{ p: 1.5 }}>
            {filesLoading ? (
              Array.from({ length: 6 }).map((_, i) => (
                <Skeleton
                  key={i}
                  variant="rectangular"
                  height={36}
                  sx={{ mb: 0.5, borderRadius: 1 }}
                />
              ))
            ) : files.length === 0 ? (
              <Box
                sx={{
                  py: 4,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 1,
                  color: 'text.disabled',
                }}
              >
                <EmptyIcon sx={{ fontSize: 36 }} />
                <Typography variant="body2">{t('githubRelease.noFiles')}</Typography>
              </Box>
            ) : (
              <>
                {/* 搜索栏（文件数 > 6 时才显示） */}
                {files.length > 6 && (
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 0.75,
                      mb: 1.5,
                      px: 1,
                      py: 0.5,
                      border: '1.5px solid',
                      borderColor: fileSearch ? 'primary.main' : 'divider',
                      borderRadius: 2,
                      bgcolor: 'background.paper',
                      transition: 'border-color 0.15s',
                      boxShadow: fileSearch ? '0 0 0 3px rgba(59,130,246,0.12)' : 'none',
                    }}
                  >
                    <SearchIcon sx={{ fontSize: 15, color: 'text.secondary', flexShrink: 0 }} />
                    <InputBase
                      inputRef={fileSearchRef}
                      value={fileSearch}
                      onChange={(e) => setFileSearch(e.target.value)}
                      onKeyDown={(e) => e.key === 'Escape' && setFileSearch('')}
                      placeholder={t('githubRelease.searchFiles')}
                      inputProps={{ 'aria-label': t('githubRelease.searchFiles') }}
                      sx={{
                        flex: 1,
                        fontSize: '0.82rem',
                        fontFamily: '"JetBrains Mono", monospace',
                      }}
                    />
                    {fileSearch && (
                      <Typography
                        variant="caption"
                        sx={{
                          color: 'text.secondary',
                          flexShrink: 0,
                          fontFamily: '"JetBrains Mono", monospace',
                          fontSize: '0.72rem',
                        }}
                      >
                        {filteredFiles.length}/{files.length}
                      </Typography>
                    )}
                    {fileSearch && (
                      <IconButton
                        size="small"
                        onClick={() => {
                          setFileSearch('');
                          fileSearchRef.current?.focus();
                        }}
                        aria-label={t('common.clear')}
                        sx={{ p: 0.25 }}
                      >
                        <ClearIcon sx={{ fontSize: 14 }} />
                      </IconButton>
                    )}
                  </Box>
                )}

                {/* 无结果 */}
                {fileSearch && filteredFiles.length === 0 ? (
                  <Box sx={{ py: 3, textAlign: 'center', color: 'text.disabled' }}>
                    <Typography variant="body2">
                      {t('directory.noResults', { query: fileSearch })}
                    </Typography>
                  </Box>
                ) : (
                  PLATFORM_ORDER.filter((p) => filesByPlatform[p]).map((platform, idx) => (
                    <Box key={platform}>
                      {idx > 0 && <Divider sx={{ my: 1 }} />}
                      {/* 平台标题 */}
                      <Box
                        sx={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 0.75,
                          px: 1.5,
                          py: 0.5,
                          mb: 0.25,
                        }}
                      >
                        {platform === 'checksum' ? (
                          <ChecksumIcon sx={{ fontSize: '1rem', color: 'text.secondary' }} />
                        ) : (
                          <Box
                            sx={{
                              display: 'flex',
                              alignItems: 'center',
                              color: 'text.secondary',
                              fontSize: '1rem',
                              lineHeight: 1,
                            }}
                          >
                            {PLATFORM_ICON[platform]}
                          </Box>
                        )}
                        <Typography
                          variant="caption"
                          sx={{
                            fontWeight: 700,
                            color: 'text.secondary',
                            textTransform: 'uppercase',
                            letterSpacing: '0.05em',
                          }}
                        >
                          {platformLabel(platform, t)}
                        </Typography>
                        <Chip
                          size="small"
                          label={filesByPlatform[platform].length}
                          sx={{ height: 18, fontSize: '0.65rem' }}
                        />
                      </Box>
                      {/* 该平台的文件 */}
                      {filesByPlatform[platform].map((file) => (
                        <FileRow key={file.href} file={file} />
                      ))}
                    </Box>
                  ))
                )}
              </>
            )}
          </Box>
        </Paper>
      )}
    </Box>
  );
};

export default GithubReleaseViewer;
