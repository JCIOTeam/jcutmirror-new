// src/components/mirrors/DirectoryListing.tsx
// 目录文件列表组件 —— 抓取镜像目录的 nginx fancyindex HTML 并解析渲染

import {
  Folder as FolderIcon,
  InsertDriveFile as FileIcon,
  ArrowUpward as ParentIcon,
  OpenInNew as OpenIcon,
  Warning as WarnIcon,
  Search as SearchIcon,
  Close as ClearIcon,
} from '@mui/icons-material';
import {
  Box,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  Paper,
  Link,
  Skeleton,
  Alert,
  Button,
  Chip,
  InputBase,
  IconButton,
} from '@mui/material';
import React, { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import RefreshButton from '../common/RefreshButton';

interface DirEntry {
  name: string;
  href: string; // 相对或绝对链接
  size: string;
  date: string;
  isDir: boolean;
  isParent: boolean;
}

interface DirectoryListingProps {
  /** 镜像的相对或绝对 URL，如 /debian/ */
  mirrorUrl: string;
  /** 镜像显示名称（用于 aria-label） */
  mirrorName?: string;
}

/**
 * 解析 nginx fancyindex 页面，提取文件列表
 */
function parseFancyIndex(html: string, baseUrl: string): DirEntry[] {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const table = doc.getElementById('list');
  if (!table) return [];

  const rows = Array.from(table.querySelectorAll('tbody tr'));
  return rows
    .map((row): DirEntry | null => {
      const cells = row.querySelectorAll('td');
      if (cells.length < 2) return null;

      const anchor = cells[0].querySelector('a');
      if (!anchor) return null;

      const name = anchor.textContent?.trim() ?? '';
      const href = anchor.getAttribute('href') ?? '';
      const size = cells[1]?.textContent?.trim() ?? '';
      const date = cells[2]?.textContent?.trim() ?? '';
      const isParent = href === '../' || name === 'Parent Directory' || name === '../';
      const isDir = row.classList.contains('dir') || (!isParent && href.endsWith('/'));

      // 将相对 href 补全为绝对路径
      const absHref = href.startsWith('http') ? href : new URL(href, baseUrl).href;

      return { name, href: absHref, size, date, isDir, isParent };
    })
    .filter((e): e is DirEntry => e !== null);
}

const DirectoryListing: React.FC<DirectoryListingProps> = ({ mirrorUrl, mirrorName }) => {
  const { t } = useTranslation();
  const [entries, setEntries] = useState<DirEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentUrl, setCurrentUrl] = useState<string>(mirrorUrl);

  // 构造完整 URL（处理相对路径）
  const toAbsoluteUrl = useCallback(
    (rel: string) => (rel.startsWith('http') ? rel : `${window.location.origin}${rel}`),
    []
  );

  const loadDirectory = useCallback(
    async (url: string) => {
      setLoading(true);
      setError(null);
      try {
        const absUrl = toAbsoluteUrl(url);
        const res = await fetch(absUrl, { headers: { Accept: 'text/html' } });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const html = await res.text();
        const parsed = parseFancyIndex(html, absUrl);

        if (parsed.length === 0) {
          // 可能是普通 HTML（非 fancyindex），或者还没有文件
          throw new Error('no-fancyindex');
        }
        setEntries(parsed);
        setCurrentUrl(url);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        if (msg === 'no-fancyindex') {
          setError('empty');
        } else if (msg.includes('Failed to fetch') || msg.includes('NetworkError')) {
          setError('network');
        } else {
          setError(msg);
        }
        // 清空上一目录的残留条目：否则非 network/非 empty 的错误（如 HTTP 403）
        // 会因 entries 非空而落到渲染分支，在淡化遮罩下显示旧目录且无错误提示
        setEntries([]);
        // 向上抛出，让 RefreshButton 感知失败状态
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [toAbsoluteUrl]
  );

  useEffect(() => {
    loadDirectory(mirrorUrl);
  }, [mirrorUrl, loadDirectory]);

  // 进入子目录
  const handleNavigate = (entry: DirEntry) => {
    if (!entry.isDir && !entry.isParent) return;
    // entry.href 已是绝对 URL，需转回路径
    try {
      const u = new URL(entry.href);
      loadDirectory(u.pathname);
    } catch {
      loadDirectory(entry.href);
    }
  };

  const absCurrentUrl = toAbsoluteUrl(currentUrl);
  const currentPathname = (() => {
    try {
      return new URL(absCurrentUrl).pathname;
    } catch {
      return absCurrentUrl;
    }
  })();

  // ── 搜索 ─────────────────────────────────────────────────────────────────
  const [searchQuery, setSearchQuery] = useState('');
  const searchInputRef = useRef<HTMLInputElement>(null);

  // 切换目录时清空搜索
  useEffect(() => {
    setSearchQuery('');
  }, [currentUrl]);

  const filteredEntries = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return entries;
    return entries.filter((e) => e.isParent || e.name.toLowerCase().includes(q));
  }, [entries, searchQuery]);

  /** 在文件名中高亮匹配的关键词 */
  function Highlighted({ text, query }: { text: string; query: string }) {
    if (!query) return <>{text}</>;
    const idx = text.toLowerCase().indexOf(query.toLowerCase());
    if (idx === -1) return <>{text}</>;
    return (
      <>
        {text.slice(0, idx)}
        <Box
          component="mark"
          sx={{
            bgcolor: 'rgba(59,130,246,0.22)',
            color: 'inherit',
            borderRadius: '2px',
            px: '1px',
          }}
        >
          {text.slice(idx, idx + query.length)}
        </Box>
        {text.slice(idx + query.length)}
      </>
    );
  }

  if (loading && entries.length === 0) {
    // 首次加载：完整 skeleton
    return (
      <Box>
        {[...Array(6)].map((_, i) => (
          <Skeleton key={i} variant="rectangular" height={38} sx={{ mb: 0.5, borderRadius: 1 }} />
        ))}
      </Box>
    );
  }

  if (error === 'network') {
    return (
      <Alert
        severity="warning"
        icon={<WarnIcon />}
        action={
          <RefreshButton size="small" variant="text" onClick={() => loadDirectory(currentUrl)} />
        }
      >
        {t('directory.networkError')}
        <Box sx={{ mt: 1 }}>
          <Link href={absCurrentUrl} target="_blank" rel="noopener noreferrer">
            {t('common.openInNewTab')}
          </Link>
        </Box>
      </Alert>
    );
  }

  if (error === 'empty' || entries.length === 0) {
    return (
      <Alert severity="info">
        {t('directory.emptyDir')}
        <Box sx={{ mt: 1 }}>
          <Link href={absCurrentUrl} target="_blank" rel="noopener noreferrer">
            {t('common.viewInBrowser')}
          </Link>
        </Box>
      </Alert>
    );
  }

  const dirs = entries.filter((e) => e.isDir && !e.isParent);
  const files = entries.filter((e) => !e.isDir && !e.isParent);
  const parent = entries.find((e) => e.isParent);

  return (
    <Box
      sx={{
        position: 'relative',
        // 导航中淡化整体透明度，让原有 UI 保持可见
        opacity: loading ? 0.55 : 1,
        pointerEvents: loading ? 'none' : 'auto',
        transition: 'opacity 0.2s ease',
      }}
    >
      {/* 当前路径 + 在新标签打开 */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          mb: 1.5,
          gap: 1,
          flexWrap: 'wrap',
        }}
      >
        {/* 左侧：路径徽章 + 数量 chip — minWidth:0 让 flex 子项可以收缩 */}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1,
            flexWrap: 'wrap',
            minWidth: 0,
            flex: 1,
          }}
        >
          <Typography
            variant="caption"
            title={currentPathname} // hover 显示完整路径
            sx={{
              fontFamily: '"JetBrains Mono", monospace',
              color: 'text.secondary',
              bgcolor: 'action.hover',
              px: 1,
              py: 0.4,
              borderRadius: 1,
              fontSize: '0.78rem',
              // 超长路径截断，不撑破布局
              maxWidth: '100%',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              display: 'block',
            }}
          >
            {currentPathname}
          </Typography>
          {(dirs.length > 0 || files.length > 0) && (
            <Box sx={{ display: 'flex', gap: 0.5, flexShrink: 0, flexWrap: 'nowrap' }}>
              {dirs.length > 0 && (
                <Chip
                  size="small"
                  icon={<FolderIcon sx={{ fontSize: '14px !important' }} />}
                  label={t('directory.dirs', { count: dirs.length })}
                  variant="outlined"
                  sx={{ fontSize: '0.72rem', height: 22 }}
                />
              )}
              {files.length > 0 && (
                <Chip
                  size="small"
                  icon={<FileIcon sx={{ fontSize: '14px !important' }} />}
                  label={t('directory.files', { count: files.length })}
                  variant="outlined"
                  sx={{ fontSize: '0.72rem', height: 22 }}
                />
              )}
            </Box>
          )}
        </Box>
        <Box sx={{ display: 'flex', gap: 1, flexShrink: 0 }}>
          {parent && (
            <Button
              size="small"
              startIcon={<ParentIcon sx={{ fontSize: 14 }} />}
              onClick={() => handleNavigate(parent)}
              variant="outlined"
              sx={{ fontSize: '0.78rem', height: 28 }}
            >
              {t('directory.parent')}
            </Button>
          )}
          <Button
            size="small"
            endIcon={<OpenIcon sx={{ fontSize: 14 }} />}
            href={absCurrentUrl}
            target="_blank"
            rel="noopener noreferrer"
            component="a"
            variant="outlined"
            sx={{ fontSize: '0.78rem', height: 28 }}
          >
            {t('common.openInBrowser')}
          </Button>
        </Box>
      </Box>

      {/* 搜索栏（仅在有文件时显示） */}
      {(dirs.length > 0 || files.length > 0) && (
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1,
            mb: 1.5,
            px: 1,
            py: 0.5,
            border: '1.5px solid',
            borderColor: searchQuery ? 'primary.main' : 'divider',
            borderRadius: 2,
            bgcolor: 'background.paper',
            transition: 'border-color 0.15s',
            boxShadow: searchQuery ? '0 0 0 3px rgba(59,130,246,0.12)' : 'none',
          }}
        >
          <SearchIcon sx={{ fontSize: 16, color: 'text.secondary', flexShrink: 0 }} />
          <InputBase
            inputRef={searchInputRef}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Escape' && setSearchQuery('')}
            placeholder={t('directory.searchPlaceholder')}
            inputProps={{ 'aria-label': t('directory.searchPlaceholder') }}
            sx={{
              flex: 1,
              fontSize: '0.85rem',
              fontFamily: '"JetBrains Mono", monospace',
              '& input::placeholder': { fontFamily: 'inherit', fontSize: '0.83rem' },
            }}
          />
          {/* 匹配计数 */}
          {searchQuery && (
            <Typography
              variant="caption"
              sx={{
                color: 'text.secondary',
                flexShrink: 0,
                fontFamily: '"JetBrains Mono", monospace',
                fontSize: '0.75rem',
              }}
            >
              {filteredEntries.filter((e) => !e.isParent).length}
              {' / '}
              {entries.filter((e) => !e.isParent).length}
            </Typography>
          )}
          {searchQuery && (
            <IconButton
              size="small"
              onClick={() => {
                setSearchQuery('');
                searchInputRef.current?.focus();
              }}
              aria-label={t('common.clear')}
              sx={{ p: 0.25 }}
            >
              <ClearIcon sx={{ fontSize: 15 }} />
            </IconButton>
          )}
        </Box>
      )}

      {/* 无结果提示 */}
      {searchQuery && filteredEntries.filter((e) => !e.isParent).length === 0 && (
        <Alert severity="info" sx={{ mb: 1.5 }}>
          {t('directory.noResults', { query: searchQuery })}
        </Alert>
      )}

      {/* 表格：overflowX:auto 兜底横向滚动，tableLayout:fixed + 百分比列宽控制截断 */}
      <TableContainer
        component={Paper}
        variant="outlined"
        sx={{ borderRadius: 2, overflowX: 'auto' }}
      >
        <Table
          size="small"
          aria-label={`${mirrorName ?? ''} 文件列表`}
          sx={{ tableLayout: 'fixed', width: '100%' }}
        >
          <TableHead>
            <TableRow sx={{ bgcolor: 'action.hover' }}>
              <TableCell
                sx={{ fontWeight: 700, fontSize: '0.78rem', width: { xs: '55%', sm: '55%' } }}
              >
                {t('directory.colName')}
              </TableCell>
              <TableCell
                sx={{ fontWeight: 700, fontSize: '0.78rem', width: { xs: '20%', sm: '20%' } }}
              >
                {t('directory.colSize')}
              </TableCell>
              <TableCell
                sx={{
                  fontWeight: 700,
                  fontSize: '0.78rem',
                  width: '25%',
                  display: { xs: 'none', sm: 'table-cell' },
                }}
              >
                {t('directory.colModified')}
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredEntries.map((entry) => (
              <TableRow
                key={entry.href}
                hover
                sx={{
                  cursor: entry.isDir || entry.isParent ? 'pointer' : 'default',
                  '&:last-child td': { border: 0 },
                }}
                onClick={() => (entry.isDir || entry.isParent) && handleNavigate(entry)}
              >
                <TableCell
                  sx={{ maxWidth: 0, overflow: 'hidden', p: { xs: '6px 8px', sm: '6px 16px' } }}
                >
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 0.75,
                      overflow: 'hidden',
                      minWidth: 0,
                    }}
                  >
                    {entry.isParent ? (
                      <ParentIcon sx={{ fontSize: 16, color: 'text.secondary', flexShrink: 0 }} />
                    ) : entry.isDir ? (
                      <FolderIcon sx={{ fontSize: 16, color: 'warning.main', flexShrink: 0 }} />
                    ) : (
                      <FileIcon sx={{ fontSize: 16, color: 'text.secondary', flexShrink: 0 }} />
                    )}
                    {entry.isDir || entry.isParent ? (
                      <Typography
                        variant="body2"
                        title={entry.name}
                        sx={{
                          fontFamily: '"JetBrains Mono", monospace',
                          fontSize: '0.83rem',
                          color: 'primary.main',
                          fontWeight: 600,
                          flex: 1,
                          minWidth: 0,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {entry.isParent ? (
                          t('directory.parentDirectory')
                        ) : (
                          <Highlighted text={entry.name} query={searchQuery} />
                        )}
                      </Typography>
                    ) : (
                      <Link
                        href={entry.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        underline="hover"
                        title={entry.href}
                        onClick={(e) => e.stopPropagation()}
                        sx={{
                          fontFamily: '"JetBrains Mono", monospace',
                          fontSize: '0.83rem',
                          flex: 1,
                          minWidth: 0,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          display: 'block',
                        }}
                      >
                        <Highlighted text={entry.name} query={searchQuery} />
                      </Link>
                    )}
                  </Box>
                </TableCell>
                <TableCell>
                  <Typography
                    variant="caption"
                    sx={{ color: 'text.secondary', fontFamily: '"JetBrains Mono", monospace' }}
                  >
                    {entry.isDir || entry.isParent ? '-' : entry.size}
                  </Typography>
                </TableCell>
                <TableCell sx={{ display: { xs: 'none', sm: 'table-cell' } }}>
                  <Typography
                    variant="caption"
                    sx={{ color: 'text.secondary', fontFamily: '"JetBrains Mono", monospace' }}
                  >
                    {entry.date}
                  </Typography>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
};

export default DirectoryListing;
