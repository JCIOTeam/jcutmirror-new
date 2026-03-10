// src/components/mirrors/DirectoryListing.tsx
// 目录文件列表组件 —— 抓取镜像目录的 nginx fancyindex HTML 并解析渲染

import {
  Folder as FolderIcon,
  InsertDriveFile as FileIcon,
  ArrowUpward as ParentIcon,
  OpenInNew as OpenIcon,
  Refresh as RefreshIcon,
  Warning as WarnIcon,
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
} from '@mui/material';
import React, { useEffect, useState, useCallback } from 'react';

import { useLocaleStore } from '../../stores/mirrorStore';

interface DirEntry {
  name: string;
  href: string;           // 相对或绝对链接
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
  const { locale } = useLocaleStore();
  const [entries, setEntries] = useState<DirEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentUrl, setCurrentUrl] = useState<string>(mirrorUrl);

  // 构造完整 URL（处理相对路径）
  const toAbsoluteUrl = useCallback(
    (rel: string) => (rel.startsWith('http') ? rel : `${window.location.origin}${rel}`),
    [],
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
      } finally {
        setLoading(false);
      }
    },
    [toAbsoluteUrl],
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

  if (loading) {
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
          <Button size="small" startIcon={<RefreshIcon />} onClick={() => loadDirectory(currentUrl)}>
            {locale === 'zh' ? '重试' : 'Retry'}
          </Button>
        }
      >
        {locale === 'zh'
          ? '无法加载目录列表，请确认在生产环境访问或检查网络。'
          : 'Cannot load directory listing. Please access in production or check network.'}
        <Box sx={{ mt: 1 }}>
          <Link href={absCurrentUrl} target="_blank" rel="noopener noreferrer">
            {locale === 'zh' ? '在新标签页中打开 →' : 'Open in new tab →'}
          </Link>
        </Box>
      </Alert>
    );
  }

  if (error === 'empty' || entries.length === 0) {
    return (
      <Alert severity="info">
        {locale === 'zh' ? '目录为空或不支持文件列表展示。' : 'Directory is empty or listing is unavailable.'}
        <Box sx={{ mt: 1 }}>
          <Link href={absCurrentUrl} target="_blank" rel="noopener noreferrer">
            {locale === 'zh' ? '在浏览器中查看 →' : 'View in browser →'}
          </Link>
        </Box>
      </Alert>
    );
  }

  const dirs = entries.filter((e) => e.isDir && !e.isParent);
  const files = entries.filter((e) => !e.isDir && !e.isParent);
  const parent = entries.find((e) => e.isParent);

  return (
    <Box>
      {/* 当前路径 + 在新标签打开 */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          mb: 1.5,
          gap: 1,
          flexWrap: 'wrap',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
          <Typography
            variant="caption"
            sx={{
              fontFamily: '"JetBrains Mono", monospace',
              color: 'text.secondary',
              bgcolor: 'action.hover',
              px: 1,
              py: 0.4,
              borderRadius: 1,
              fontSize: '0.78rem',
            }}
          >
            {new URL(absCurrentUrl).pathname}
          </Typography>
          {dirs.length > 0 && (
            <Chip
              size="small"
              icon={<FolderIcon sx={{ fontSize: '14px !important' }} />}
              label={`${dirs.length} ${locale === 'zh' ? '个目录' : 'dirs'}`}
              variant="outlined"
              sx={{ fontSize: '0.72rem', height: 22 }}
            />
          )}
          {files.length > 0 && (
            <Chip
              size="small"
              icon={<FileIcon sx={{ fontSize: '14px !important' }} />}
              label={`${files.length} ${locale === 'zh' ? '个文件' : 'files'}`}
              variant="outlined"
              sx={{ fontSize: '0.72rem', height: 22 }}
            />
          )}
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          {parent && (
            <Button
              size="small"
              startIcon={<ParentIcon sx={{ fontSize: 14 }} />}
              onClick={() => handleNavigate(parent)}
              variant="outlined"
              sx={{ fontSize: '0.78rem', height: 28 }}
            >
              {locale === 'zh' ? '上级目录' : 'Parent'}
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
            {locale === 'zh' ? '在浏览器中打开' : 'Open in browser'}
          </Button>
        </Box>
      </Box>

      <TableContainer
        component={Paper}
        variant="outlined"
        sx={{ borderRadius: 2, overflow: 'hidden' }}
      >
        <Table size="small" aria-label={`${mirrorName ?? ''} 文件列表`}>
          <TableHead>
            <TableRow sx={{ bgcolor: 'action.hover' }}>
              <TableCell sx={{ fontWeight: 700, fontSize: '0.78rem', width: '55%' }}>
                {locale === 'zh' ? '名称' : 'Name'}
              </TableCell>
              <TableCell sx={{ fontWeight: 700, fontSize: '0.78rem', width: '20%' }}>
                {locale === 'zh' ? '大小' : 'Size'}
              </TableCell>
              <TableCell
                sx={{
                  fontWeight: 700,
                  fontSize: '0.78rem',
                  width: '25%',
                  display: { xs: 'none', sm: 'table-cell' },
                }}
              >
                {locale === 'zh' ? '修改日期' : 'Modified'}
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {entries.map((entry, idx) => (
              <TableRow
                key={idx}
                hover
                sx={{
                  cursor: entry.isDir || entry.isParent ? 'pointer' : 'default',
                  '&:last-child td': { border: 0 },
                }}
                onClick={() => (entry.isDir || entry.isParent) && handleNavigate(entry)}
              >
                {/* 名称列 */}
                <TableCell>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
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
                        sx={{
                          fontFamily: '"JetBrains Mono", monospace',
                          fontSize: '0.83rem',
                          color: 'primary.main',
                          fontWeight: 600,
                          wordBreak: 'break-all',
                        }}
                      >
                        {entry.isParent ? (locale === 'zh' ? '上级目录' : 'Parent Directory') : entry.name}
                      </Typography>
                    ) : (
                      <Link
                        href={entry.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        underline="hover"
                        onClick={(e) => e.stopPropagation()}
                        sx={{
                          fontFamily: '"JetBrains Mono", monospace',
                          fontSize: '0.83rem',
                          wordBreak: 'break-all',
                        }}
                      >
                        {entry.name}
                      </Link>
                    )}
                  </Box>
                </TableCell>

                {/* 大小列 */}
                <TableCell>
                  <Typography variant="caption" color="text.secondary" fontFamily='"JetBrains Mono", monospace'>
                    {entry.isDir || entry.isParent ? '-' : entry.size}
                  </Typography>
                </TableCell>

                {/* 日期列 */}
                <TableCell sx={{ display: { xs: 'none', sm: 'table-cell' } }}>
                  <Typography variant="caption" color="text.secondary" fontFamily='"JetBrains Mono", monospace'>
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
