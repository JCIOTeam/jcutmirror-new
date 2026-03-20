// src/components/mirrors/DownloadModal.tsx
// 镜像下载弹窗

import CloseIcon from '@mui/icons-material/Close';
import DownloadIcon from '@mui/icons-material/Download';
import FolderOpenIcon from '@mui/icons-material/FolderOpen';
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
      PaperProps={{
        sx: {
          borderRadius: fullScreen ? 0 : 3,
          overflow: 'hidden',
          height: fullScreen ? '100%' : 600,
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
          <Typography variant="h6" fontWeight={700}>
            {t('download.title')}
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ ml: 0.5 }}>
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
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                  </InputAdornment>
                ),
                sx: { fontSize: '0.85rem', borderRadius: 2 },
              }}
            />
          </Box>
          <Divider />

          <List dense disablePadding sx={{ overflowY: 'auto', flex: 1 }}>
            {filtered.length === 0 ? (
              <Box sx={{ p: 2, textAlign: 'center' }}>
                <Typography variant="caption" color="text.secondary">
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
                      primaryTypographyProps={{
                        variant: 'body2',
                        fontWeight: isActive ? 700 : 500,
                        noWrap: true,
                        fontSize: '0.85rem',
                      }}
                      secondary={t('download.fileCount', { count: m.files.length })}
                      secondaryTypographyProps={{ fontSize: '0.72rem' }}
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
                  <Typography variant="subtitle1" fontWeight={700} lineHeight={1.2}>
                    {activeMirror.name[locale]}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {activeMirror.desc[locale]}
                  </Typography>
                </Box>
              </Box>

              {/* 文件列表 */}
              <List dense disablePadding sx={{ overflowY: 'auto', flex: 1, px: 1 }}>
                {activeMirror.files.map((file, idx) => (
                  <React.Fragment key={file.url}>
                    <ListItemButton
                      component="a"
                      href={file.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      sx={{
                        borderRadius: 1.5,
                        px: 1.5,
                        py: 0.8,
                        my: 0.3,
                        '&:hover .dl-icon': { opacity: 1 },
                      }}
                    >
                      <ListItemIcon sx={{ minWidth: 32, color: 'primary.main' }}>
                        <FolderOpenIcon sx={{ fontSize: 18 }} />
                      </ListItemIcon>
                      <ListItemText
                        primary={file.name}
                        primaryTypographyProps={{
                          variant: 'body2',
                          fontWeight: 500,
                          noWrap: true,
                        }}
                        secondary={
                          <Typography
                            component="span"
                            variant="caption"
                            color="text.secondary"
                            sx={{
                              display: 'block',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {file.url}
                          </Typography>
                        }
                      />
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
                    {idx < activeMirror.files.length - 1 && <Divider sx={{ mx: 1.5 }} />}
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
              <Typography color="text.secondary" variant="body2">
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
