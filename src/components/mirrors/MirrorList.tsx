// src/components/mirrors/MirrorList.tsx
// 镜像列表组件 - 按字母A-Z分组展示

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
  Link,
  Skeleton,
  Alert,
} from '@mui/material';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

import { useLocaleStore } from '../../stores/mirrorStore';
import type { GroupedMirrors } from '../../types';
import { formatRelativeTime } from '../../utils/time';

import StatusChip from './StatusChip';

interface MirrorListProps {
  grouped: GroupedMirrors;
  loading?: boolean;
  error?: string;
}

/**
 * 按字母分组的镜像列表
 */
const MirrorList: React.FC<MirrorListProps> = ({ grouped, loading, error }) => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { locale } = useLocaleStore();
  // dateFnsLocale 已由 formatRelativeTime 工具内部处理

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

  if (error) {
    return (
      <Alert severity="error" sx={{ mb: 2 }}>
        {error}
      </Alert>
    );
  }

  const letters = Object.keys(grouped).sort();

  if (letters.length === 0) {
    return (
      <Alert severity="info">{t('search.noResults')}</Alert>
    );
  }

  return (
    <Box>
      {letters.map((letter) => (
        <Box key={letter} sx={{ mb: 4 }} id={`group-${letter}`}>
          {/* 字母索引标题 */}
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              mb: 1.5,
              gap: 1.5,
            }}
          >
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

          {/* 镜像表格 */}
          <TableContainer
            component={Paper}
            variant="outlined"
            sx={{ borderRadius: 2, overflow: 'hidden' }}
          >
            <Table size="small" aria-label={`${letter} 组镜像列表`}>
              <TableHead>
                <TableRow sx={{ bgcolor: 'action.hover' }}>
                  <TableCell sx={{ fontWeight: 700, width: '20%' }}>
                    {locale === 'zh' ? '镜像名称' : 'Mirror'}
                  </TableCell>
                  <TableCell sx={{ fontWeight: 700, width: '30%', display: { xs: 'none', sm: 'table-cell' } }}>
                    {locale === 'zh' ? '描述' : 'Description'}
                  </TableCell>
                  <TableCell sx={{ fontWeight: 700, width: '10%' }}>
                    {t('mirror.size')}
                  </TableCell>
                  <TableCell sx={{ fontWeight: 700, width: '12%' }}>
                    {locale === 'zh' ? '状态' : 'Status'}
                  </TableCell>
                  <TableCell sx={{ fontWeight: 700, width: '18%', display: { xs: 'none', md: 'table-cell' } }}>
                    {t('mirror.lastUpdated')}
                  </TableCell>
                  <TableCell sx={{ fontWeight: 700, width: '10%' }}>
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
                      cursor: 'pointer',
                      '&:last-child td': { border: 0 },
                      transition: 'background-color 0.15s',
                    }}
                    role="link"
                    aria-label={`查看 ${mirror.name[locale]} 详情`}
                  >
                    {/* 镜像名 */}
                    <TableCell>
                      <Box>
                        <Typography
                          variant="body2"
                          sx={{
                            fontFamily: '"JetBrains Mono", monospace',
                            fontWeight: 700,
                            color: 'primary.main',
                            fontSize: '0.85rem',
                          }}
                        >
                          {mirror.id}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {mirror.name[locale]}
                        </Typography>
                      </Box>
                    </TableCell>

                    {/* 描述 */}
                    <TableCell
                      sx={{
                        display: { xs: 'none', sm: 'table-cell' },
                        color: 'text.secondary',
                        fontSize: '0.82rem',
                      }}
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
                        {mirror.desc[locale]}
                      </Typography>
                    </TableCell>

                    {/* 大小 */}
                    <TableCell>
                      <Typography variant="caption" color="text.secondary" fontWeight={500}>
                        {mirror.size || '-'}
                      </Typography>
                    </TableCell>

                    {/* 状态 */}
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <StatusChip status={mirror.status} size="small" />
                    </TableCell>

                    {/* 最后更新 */}
                    <TableCell sx={{ display: { xs: 'none', md: 'table-cell' } }}>
                      <Typography variant="caption" color="text.secondary">
                        {formatRelativeTime(mirror.lastUpdated, locale)}
                      </Typography>
                    </TableCell>

                    {/* 帮助链接 */}
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      {mirror.helpUrl && (
                        <Link
                          href={mirror.helpUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          variant="caption"
                          underline="hover"
                          color="primary"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {t('mirror.viewHelp')}
                        </Link>
                      )}
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
