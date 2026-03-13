// src/components/mirrors/MirrorList.tsx
// 镜像列表组件 - 按字母A-Z分组展示

import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import {
  Box, Typography, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Paper, Skeleton, Alert, Button, Tooltip,
  IconButton, useMediaQuery, useTheme,
} from '@mui/material';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

import { useLocaleStore } from '../../stores/mirrorStore';
import type { GroupedMirrors } from '../../types';
import { formatRelativeTime } from '../../utils/time';

import StatusChip from './StatusChip';

interface MirrorListProps {
  grouped:  GroupedMirrors;
  loading?: boolean;
  error?:   string;
}

const MirrorList: React.FC<MirrorListProps> = ({ grouped, loading, error }) => {
  const navigate  = useNavigate();
  const { t }     = useTranslation();
  const { locale} = useLocaleStore();
  const theme     = useTheme();
  const isMobile  = useMediaQuery(theme.breakpoints.down('sm'));

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

  if (error) return <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>;

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
                      color:      'primary.main',
                      lineHeight: 1,
                      fontSize:   '1.4rem',
                      minWidth:   32,
                    }}
                >
                  {letter}
                </Typography>
                <Box sx={{ flex: 1, height: 1, bgcolor: 'divider' }} />
              </Box>

              <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2, overflow: 'hidden' }}>
                <Table
                    size="small"
                    aria-label={`${letter} 组镜像列表`}
                    sx={{ tableLayout: 'fixed', width: '100%' }}
                >
                  {/*
               * 列宽策略：响应式 width 直接加在 TableCell 上，不用 colgroup。
               * display:none 的列不占空间，可见列在每个断点恰好合计 100%：
               *   xs  (无描述/无更新): 名称42 + 大小16 + 状态(图标)12 + 帮助10 ≈ 80%
               *       → 实际内容列撑满，状态列只放圆点，节省列宽
               *   sm  (有描述/无更新): 名称22 + 描述30 + 大小12 + 状态20 + 帮助12 = 96%
               *   md  (全列可见):      名称20 + 描述28 + 大小10 + 状态14 + 更新20 + 帮助8 = 100%
               */}
                  <TableHead>
                    <TableRow sx={{ bgcolor: 'action.hover' }}>
                      <TableCell sx={{ fontWeight: 700, width: { xs: '42%', sm: '22%', md: '20%' } }}>
                        {locale === 'zh' ? '镜像名称' : 'Mirror'}
                      </TableCell>
                      <TableCell sx={{ fontWeight: 700, width: '30%', display: { xs: 'none', sm: 'table-cell' } }}>
                        {locale === 'zh' ? '描述' : 'Description'}
                      </TableCell>
                      <TableCell align="center" sx={{ fontWeight: 700, width: { xs: '18%', sm: '12%', md: '10%' } }}>
                        {t('mirror.size')}
                      </TableCell>
                      {/* 移动端列名缩短为"态" */}
                      <TableCell align="center" sx={{ fontWeight: 700, width: { xs: '14%', sm: '22%', md: '14%' }, whiteSpace: 'nowrap' }}>
                        {locale === 'zh' ? '状态' : 'Status'}
                      </TableCell>
                      <TableCell align="center" sx={{ fontWeight: 700, width: '20%', display: { xs: 'none', md: 'table-cell' } }}>
                        {t('mirror.lastUpdated')}
                      </TableCell>
                      <TableCell align="center" sx={{ fontWeight: 700, width: { xs: '14%', sm: '12%', md: '8%' } }}>
                        {locale === 'zh' ? '帮助' : 'Help'}
                      </TableCell>
                    </TableRow>
                  </TableHead>

                  <TableBody>
                    {grouped[letter].map((mirror) => (
                        <TableRow
                            key={mirror.id}
                            hover
                            onClick={() => navigate(`/mirrors/${mirror.id}`)}
                            sx={{
                              cursor:   'pointer',
                              '&:last-child td': { border: 0 },
                              transition: 'background-color 0.15s',
                            }}
                            role="link"
                            aria-label={`查看 ${mirror.name[locale]} 详情`}
                        >
                          {/* 镜像名称 */}
                          <TableCell>
                            <Typography
                                variant="body2"
                                sx={{ fontWeight: 700, color: 'text.primary', fontSize: '0.88rem' }}
                            >
                              {mirror.name[locale]}
                            </Typography>
                          </TableCell>

                          {/* 描述 */}
                          <TableCell sx={{ display: { xs: 'none', sm: 'table-cell' }, color: 'text.secondary' }}>
                            <Typography
                                variant="caption"
                                sx={{
                                  display:           '-webkit-box',
                                  WebkitLineClamp:   2,
                                  WebkitBoxOrient:   'vertical',
                                  overflow:          'hidden',
                                }}
                            >
                              {mirror.desc[locale]}
                            </Typography>
                          </TableCell>

                          {/* 大小 */}
                          <TableCell align="center">
                            <Typography variant="caption" color="text.secondary" fontWeight={500}>
                              {mirror.size || '-'}
                            </Typography>
                          </TableCell>

                          {/* 状态 — 移动端只显示彩色圆点，PC 显示完整 Chip */}
                          <TableCell align="center" onClick={(e) => e.stopPropagation()}>
                            <StatusChip status={mirror.status} size="small" iconOnly={isMobile} />
                          </TableCell>

                          {/* 最后更新 */}
                          <TableCell align="center" sx={{ display: { xs: 'none', md: 'table-cell' } }}>
                            <Typography variant="caption" color="text.secondary">
                              {formatRelativeTime(mirror.lastUpdated, locale)}
                            </Typography>
                          </TableCell>

                          {/* 帮助 */}
                          <TableCell align="center" onClick={(e) => e.stopPropagation()}>
                            <Button
                                size="small"
                                variant="text"
                                sx={{ fontSize: '0.75rem', p: '2px 6px', minWidth: 0, display: { xs: 'none', sm: 'inline-flex' }, whiteSpace: 'nowrap' }}
                                onClick={(e) => { e.stopPropagation(); navigate(`/mirrors/${mirror.id}?tab=help`); }}
                            >
                              {t('mirror.viewHelp')}
                            </Button>
                            <Tooltip title={t('mirror.viewHelp')} placement="left">
                              <IconButton
                                  size="small"
                                  color="primary"
                                  sx={{ display: { xs: 'inline-flex', sm: 'none' }, p: '4px' }}
                                  onClick={(e) => { e.stopPropagation(); navigate(`/mirrors/${mirror.id}?tab=help`); }}
                                  aria-label={t('mirror.viewHelp')}
                              >
                                <HelpOutlineIcon sx={{ fontSize: '1.1rem' }} />
                              </IconButton>
                            </Tooltip>
                          </TableCell>
                        </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>
        ))}
      </Box>
  );
};

export default MirrorList;
