// src/components/mirrors/DownloadModal.tsx
// 镜像下载弹窗

import AlbumIcon from '@mui/icons-material/Album';
import CloseIcon from '@mui/icons-material/Close';
import DownloadIcon from '@mui/icons-material/Download';
import InsertDriveFileIcon from '@mui/icons-material/InsertDriveFile';
import SearchIcon from '@mui/icons-material/Search';
import {
  Box,
  Dialog,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  InputAdornment,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  TextField,
  Tooltip,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { useMirrors } from '../../hooks/useMirrors';
import { useLocaleStore } from '../../stores/mirrorStore';

import DistroLogo from './DistroLogo';

// 仅允许 http / https / 相对路径，防止 javascript: 等危险协议
const SAFE_URL_RE = /^(https?:\/\/|\/)/i;
function sanitizeUrl(url: string): string {
  if (!url) return '#';
  return SAFE_URL_RE.test(url) ? url : '#';
}

// 根据文件 URL 后缀返回合适的图标
function getFileIcon(url: string): React.ReactNode {
  const ext = url.split('.').pop()?.toLowerCase() ?? '';
  if (ext === 'iso' || ext === 'img') return <AlbumIcon sx={{ fontSize: 18 }} />;
  return <InsertDriveFileIcon sx={{ fontSize: 18 }} />;
}

// 从文件名中提取版本号数组，用于降序排序（最新版本在最前）
// 例："24.04.4 desktop amd64" → [24, 4, 4]
//     "8-latest x86_64 Rocky Dvd" → [8]
//     "latest" → []
function extractVersion(name: string): number[] {
  const m = name.match(/^[\d]+(?:[.-][\d]+)*/);
  if (!m) return [];
  return m[0]
    .split(/[.-]/)
    .map(Number)
    .filter((n) => !isNaN(n));
}

function compareVersionDesc(a: string, b: string): number {
  const va = extractVersion(a);
  const vb = extractVersion(b);
  // 无版本号的排到最后
  if (va.length === 0 && vb.length === 0) return 0;
  if (va.length === 0) return 1;
  if (vb.length === 0) return -1;
  for (let i = 0; i < Math.max(va.length, vb.length); i++) {
    const diff = (vb[i] ?? 0) - (va[i] ?? 0);
    if (diff !== 0) return diff;
  }
  return 0;
}

function sortFiles<T extends { name: string }>(files: T[]): T[] {
  return [...files].sort((a, b) => compareVersionDesc(a.name, b.name));
}

interface DownloadModalProps {
  open: boolean;
  onClose: () => void;
}

const DownloadModal: React.FC<DownloadModalProps> = ({ open, onClose }) => {
  const { t } = useTranslation();
  const { locale } = useLocaleStore();
  const { data: mirrors = [] } = useMirrors();
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down('sm'));

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  const distros = useMemo(() => mirrors.filter((m) => m.files && m.files.length > 0), [mirrors]);

  const filtered = useMemo(() => {
    if (!search.trim()) return distros;
    const q = search.toLowerCase();
    return distros.filter(
      (m) =>
        m.id.toLowerCase().includes(q) ||
        m.name.zh.toLowerCase().includes(q) ||
        m.name.en.toLowerCase().includes(q)
    );
  }, [distros, search]);

  const activeId = selectedId ?? filtered[0]?.id ?? null;
  const activeMirror = useMemo(
    () => distros.find((m) => m.id === activeId) ?? null,
    [distros, activeId]
  );

  const handleClose = () => {
    setSearch('');
    setSelectedId(null);
    onClose();
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      fullScreen={fullScreen}
      maxWidth="md"
      fullWidth
      slotProps={{
        paper: {
          sx: {
            borderRadius: fullScreen ? 0 : 3,
            overflow: 'hidden',
            height: fullScreen ? '100%' : 600,
          },
        },
      }}
    >
      {/* 标题栏 */}
      <DialogTitle
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          py: 1.5,
          px: 2.5,
          borderBottom: '1px solid',
          borderColor: 'divider',
          flexShrink: 0,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <DownloadIcon color="primary" />
          <Typography
            variant="h6"
            sx={{
              fontWeight: 700,
            }}
          >
            {t('download.title')}
          </Typography>
          <Typography
            variant="caption"
            sx={{
              color: 'text.secondary',
              ml: 0.5,
            }}
          >
            {t('download.distroCount', { count: distros.length })}
          </Typography>
        </Box>
        <IconButton size="small" onClick={handleClose} aria-label="关闭">
          <CloseIcon fontSize="small" />
        </IconButton>
      </DialogTitle>
      <DialogContent sx={{ p: 0, display: 'flex', overflow: 'hidden', flex: 1 }}>
        {/* 左栏：发行版列表 */}
        <Box
          sx={{
            width: { xs: '44%', sm: 210 },
            flexShrink: 0,
            borderRight: '1px solid',
            borderColor: 'divider',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
          }}
        >
          <Box sx={{ p: 1.5, flexShrink: 0 }}>
            <TextField
              size="small"
              fullWidth
              placeholder={t('download.search')}
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setSelectedId(null);
              }}
              slotProps={{
                input: {
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                    </InputAdornment>
                  ),
                  sx: { fontSize: '0.85rem', borderRadius: 2 },
                },
              }}
            />
          </Box>
          <Divider />

          <List dense disablePadding sx={{ overflowY: 'auto', flex: 1 }}>
            {filtered.length === 0 ? (
              <Box sx={{ p: 2, textAlign: 'center' }}>
                <Typography
                  variant="caption"
                  sx={{
                    color: 'text.secondary',
                  }}
                >
                  {t('search.noResults')}
                </Typography>
              </Box>
            ) : (
              filtered.map((m) => {
                const isActive = m.id === activeId;
                return (
                  <ListItemButton
                    key={m.id}
                    selected={isActive}
                    onClick={() => setSelectedId(m.id)}
                    sx={{
                      py: 1,
                      px: 1.5,
                      borderLeft: '3px solid',
                      borderColor: isActive ? 'primary.main' : 'transparent',
                      '&.Mui-selected': {
                        bgcolor: 'action.selected',
                        '&:hover': { bgcolor: 'action.selected' },
                      },
                    }}
                  >
                    <ListItemIcon sx={{ minWidth: 34 }}>
                      <DistroLogo id={m.id} size={20} />
                    </ListItemIcon>
                    <ListItemText
                      primary={m.name[locale]}
                      secondary={t('download.fileCount', { count: m.files.length })}
                      slotProps={{
                        primary: {
                          variant: 'body2',
                          noWrap: true,
                          sx: {
                            fontWeight: isActive ? 700 : 500,
                            fontSize: '0.85rem',
                          },
                        },

                        secondary: { sx: { fontSize: '0.72rem' } },
                      }}
                    />
                  </ListItemButton>
                );
              })
            )}
          </List>
        </Box>

        {/* 右栏：文件列表 */}
        <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {activeMirror ? (
            <>
              {/* 右栏标题 */}
              <Box
                sx={{
                  px: 2.5,
                  py: 1.5,
                  flexShrink: 0,
                  borderBottom: '1px solid',
                  borderColor: 'divider',
                  bgcolor: 'action.hover',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1.5,
                }}
              >
                <DistroLogo id={activeMirror.id} size={30} />
                <Box>
                  <Typography
                    variant="subtitle1"
                    sx={{
                      fontWeight: 700,
                      lineHeight: 1.2,
                    }}
                  >
                    {activeMirror.name[locale]}
                  </Typography>
                  <Typography
                    variant="caption"
                    sx={{
                      color: 'text.secondary',
                    }}
                  >
                    {activeMirror.desc[locale]}
                  </Typography>
                </Box>
              </Box>

              {/* 文件列表 */}
              <List dense disablePadding sx={{ overflowY: 'auto', flex: 1, px: 1 }}>
                {sortFiles(activeMirror.files).map((file, idx, arr) => (
                  <React.Fragment key={file.url || idx}>
                    <ListItemButton
                      component="a"
                      href={sanitizeUrl(file.url)}
                      target="_blank"
                      rel="noopener noreferrer"
                      sx={{
                        borderRadius: 1.5,
                        px: 1.5,
                        py: 0.8,
                        my: 0.3,
                        alignItems: 'center',
                        '&:hover .dl-icon': { opacity: 1 },
                      }}
                    >
                      <ListItemIcon
                        sx={{ minWidth: 32, color: 'primary.main', alignSelf: 'center' }}
                      >
                        {getFileIcon(file.url)}
                      </ListItemIcon>
                      <Tooltip title={file.name} placement="top" enterDelay={600}>
                        <ListItemText
                          primary={file.name}
                          secondary={
                            // 移动端隐藏 URL——屏幕窄且 URL 无法操作，保留空间给文件名
                            <Typography
                              component="span"
                              variant="caption"
                              sx={{
                                color: 'text.secondary',
                                display: { xs: 'none', sm: 'block' },
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                              }}
                            >
                              {file.url}
                            </Typography>
                          }
                          slotProps={{
                            primary: {
                              variant: 'body2',
                              noWrap: true,
                              sx: { fontWeight: 500 },
                            },
                          }}
                        />
                      </Tooltip>
                      <Tooltip title={t('common.download')} placement="left">
                        <DownloadIcon
                          className="dl-icon"
                          sx={{
                            fontSize: 18,
                            color: 'primary.main',
                            opacity: 0.4,
                            transition: 'opacity 0.15s',
                            flexShrink: 0,
                            ml: 1,
                          }}
                        />
                      </Tooltip>
                    </ListItemButton>
                    {idx < arr.length - 1 && <Divider sx={{ mx: 1.5 }} />}
                  </React.Fragment>
                ))}
              </List>
            </>
          ) : (
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                height: '100%',
              }}
            >
              <Typography
                variant="body2"
                sx={{
                  color: 'text.secondary',
                }}
              >
                {t('download.selectDistro')}
              </Typography>
            </Box>
          )}
        </Box>
      </DialogContent>
    </Dialog>
  );
};

export default DownloadModal;
