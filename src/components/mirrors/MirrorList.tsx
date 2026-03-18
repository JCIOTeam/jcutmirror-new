// src/components/mirrors/MirrorList.tsx
// 镜像列表组件 - 按字母A-Z分组展示

import { Star as StarIcon, StarBorder as StarBorderIcon } from '@mui/icons-material';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import {
  Box,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Skeleton,
  Alert,
  Button,
  Tooltip,
  IconButton,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

import { useLocaleStore, useMirrorSearchStore, useFavoriteStore } from '../../stores/mirrorStore';
import type { GroupedMirrors } from '../../types';
import { formatRelativeTime } from '../../utils/time';

import StatusChip from './StatusChip';

interface MirrorListProps {
  grouped: GroupedMirrors;
  loading?: boolean;
  error?: string;
}

// ── 关键词高亮辅助组件 ─────────────────────────────────────────────────────────
const Highlight: React.FC<{ text: string; query: string }> = ({ text, query }) => {
  if (!query.trim()) return <>{text}</>;
  const idx = text.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return <>{text}</>;
  return (
    <>
      {text.slice(0, idx)}
      <Box
        component="mark"
        sx={{
          bgcolor: 'warning.light',
          color: 'warning.contrastText',
          borderRadius: '2px',
          px: '1px',
          fontWeight: 700,
        }}
      >
        {text.slice(idx, idx + query.length)}
      </Box>
      {text.slice(idx + query.length)}
    </>
  );
};

const MirrorList: React.FC<MirrorListProps> = ({ grouped, loading, error }) => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { locale } = useLocaleStore();
  const { searchQuery } = useMirrorSearchStore();
  const { isFavorite, toggleFavorite } = useFavoriteStore();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  if (loading) {
    return (
      <Box>
        {[...Array(3)].map((_, i) => (
          <Box key={i} sx={{ mb: 3 }}>
            <Skeleton variant="text" width={40} height={32} sx={{ mb: 1 }} />
            <Skeleton variant="rectangular" height={120} sx={{ borderRadius: 1 }} />
          </Box>
        ))}
      </Box>
    );
  }

  if (error)
    return (
      <Alert severity="error" sx={{ mb: 2 }}>
        {error}
      </Alert>
    );

  const letters = Object.keys(grouped).sort();
  if (letters.length === 0) return <Alert severity="info">{t('search.noResults')}</Alert>;

  return (
    <Box>
      {letters.map((letter) => (
        <Box key={letter} sx={{ mb: 4 }} id={`group-${letter}`}>
          {/* 字母索引标题 */}
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 1.5, gap: 1.5 }}>
            <Typography
              variant="h5"
              sx={{
                fontFamily: '"JetBrains Mono", monospace',
                fontWeight: 800,
                color: 'primary.main',
                lineHeight: 1,
                fontSize: '1.4rem',
                minWidth: 32,
              }}
            >
              {letter}
            </Typography>
            <Box sx={{ flex: 1, height: 1, bgcolor: 'divider' }} />
          </Box>

          <TableContainer
            component={Paper}
            variant="outlined"
            sx={{ borderRadius: 2, overflow: 'hidden' }}
          >
            <Table
              size="small"
              aria-label={`${letter} 组镜像列表`}
              sx={{ tableLayout: 'fixed', width: '100%' }}
            >
              <TableHead>
                <TableRow sx={{ bgcolor: 'action.hover' }}>
                  <TableCell
                    scope="col"
                    sx={{ fontWeight: 700, width: { xs: '38%', sm: '20%', md: '18%' } }}
                  >
                    {locale === 'zh' ? '镜像名称' : 'Mirror'}
                  </TableCell>
                  <TableCell
                    scope="col"
                    sx={{
                      fontWeight: 700,
                      width: '30%',
                      display: { xs: 'none', sm: 'table-cell' },
                    }}
                  >
                    {locale === 'zh' ? '描述' : 'Description'}
                  </TableCell>
                  <TableCell
                    scope="col"
                    align="center"
                    sx={{ fontWeight: 700, width: { xs: '18%', sm: '12%', md: '10%' } }}
                  >
                    {t('mirror.size')}
                  </TableCell>
                  <TableCell
                    scope="col"
                    align="center"
                    sx={{
                      fontWeight: 700,
                      width: { xs: '14%', sm: '20%', md: '14%' },
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {locale === 'zh' ? '状态' : 'Status'}
                  </TableCell>
                  <TableCell
                    scope="col"
                    align="center"
                    sx={{
                      fontWeight: 700,
                      width: '18%',
                      display: { xs: 'none', md: 'table-cell' },
                    }}
                  >
                    {t('mirror.lastUpdated')}
                  </TableCell>
                  {/* 收藏 + 帮助列合并为操作列 */}
                  <TableCell
                    scope="col"
                    align="center"
                    sx={{ fontWeight: 700, width: { xs: '18%', sm: '16%', md: '12%' } }}
                  >
                    {locale === 'zh' ? '操作' : 'Actions'}
                  </TableCell>
                </TableRow>
              </TableHead>

              <TableBody>
                {grouped[letter].map((mirror) => {
                  const starred = isFavorite(mirror.id);
                  return (
                    <TableRow
                      key={mirror.id}
                      hover
                      onClick={() => navigate(`/mirrors/${mirror.id}`)}
                      sx={{
                        cursor: 'pointer',
                        '&:last-child td': { border: 0 },
                        transition: 'background-color 0.15s',
                      }}
                      aria-label={`查看 ${mirror.name[locale]} 详情`}
                    >
                      {/* 镜像名称（带高亮） */}
                      <TableCell>
                        <Typography
                          variant="body2"
                          sx={{ fontWeight: 700, color: 'text.primary', fontSize: '0.88rem' }}
                        >
                          <Highlight text={mirror.name[locale]} query={searchQuery} />
                        </Typography>
                      </TableCell>

                      {/* 描述（带高亮） */}
                      <TableCell
                        sx={{ display: { xs: 'none', sm: 'table-cell' }, color: 'text.secondary' }}
                      >
                        <Typography
                          variant="caption"
                          sx={{
                            display: '-webkit-box',
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: 'vertical',
                            overflow: 'hidden',
                          }}
                        >
                          <Highlight text={mirror.desc[locale]} query={searchQuery} />
                        </Typography>
                      </TableCell>

                      {/* 大小 */}
                      <TableCell align="center">
                        <Typography variant="caption" color="text.secondary" fontWeight={500}>
                          {mirror.size || '-'}
                        </Typography>
                      </TableCell>

                      {/* 状态 */}
                      <TableCell align="center" onClick={(e) => e.stopPropagation()}>
                        <StatusChip status={mirror.status} size="small" iconOnly={isMobile} />
                      </TableCell>

                      {/* 最后更新 */}
                      <TableCell align="center" sx={{ display: { xs: 'none', md: 'table-cell' } }}>
                        <Typography variant="caption" color="text.secondary">
                          {formatRelativeTime(mirror.lastUpdated, locale)}
                        </Typography>
                      </TableCell>

                      {/* 收藏 + 帮助 */}
                      <TableCell align="center" onClick={(e) => e.stopPropagation()}>
                        <Box
                          sx={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: 0.2,
                          }}
                        >
                          {/* 收藏按钮 */}
                          <Tooltip
                            title={starred ? t('favorites.remove') : t('favorites.add')}
                            placement="top"
                          >
                            <IconButton
                              size="small"
                              sx={{
                                p: '3px',
                                color: starred ? 'warning.main' : 'text.disabled',
                                '&:hover': { color: 'warning.main' },
                                transition: 'color 0.15s',
                              }}
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleFavorite(mirror.id);
                              }}
                              aria-label={starred ? t('favorites.remove') : t('favorites.add')}
                            >
                              {starred ? (
                                <StarIcon sx={{ fontSize: '1rem' }} />
                              ) : (
                                <StarBorderIcon sx={{ fontSize: '1rem' }} />
                              )}
                            </IconButton>
                          </Tooltip>

                          {/* 帮助按钮 */}
                          <Button
                            size="small"
                            variant="text"
                            sx={{
                              fontSize: '0.75rem',
                              p: '2px 6px',
                              minWidth: 0,
                              display: { xs: 'none', sm: 'inline-flex' },
                              whiteSpace: 'nowrap',
                            }}
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/mirrors/${mirror.id}?tab=help`);
                            }}
                          >
                            {t('mirror.viewHelp')}
                          </Button>
                          <Tooltip title={t('mirror.viewHelp')} placement="left">
                            <IconButton
                              size="small"
                              color="primary"
                              sx={{ display: { xs: 'inline-flex', sm: 'none' }, p: '4px' }}
                              onClick={(e) => {
                                e.stopPropagation();
                                navigate(`/mirrors/${mirror.id}?tab=help`);
                              }}
                              aria-label={t('mirror.viewHelp')}
                            >
                              <HelpOutlineIcon sx={{ fontSize: '1.1rem' }} />
                            </IconButton>
                          </Tooltip>
                        </Box>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>
      ))}
    </Box>
  );
};

export default MirrorList;
