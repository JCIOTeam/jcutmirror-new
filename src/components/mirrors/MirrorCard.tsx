// src/components/mirrors/MirrorCard.tsx
// 镜像卡片组件 - 首页展示用

import { Storage as StorageIcon } from '@mui/icons-material';
import { Card, CardContent, CardActionArea, Typography, Box, Tooltip } from '@mui/material';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

import { useLocaleStore } from '../../stores/mirrorStore';
import type { Mirror } from '../../types';
import { formatRelativeTime } from '../../utils/time';

import DistroLogo from './DistroLogo';
import StatusChip from './StatusChip';

interface MirrorCardProps {
  mirror: Mirror;
}

const MirrorCard: React.FC<MirrorCardProps> = ({ mirror }) => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { locale } = useLocaleStore();
  const lastUpdatedText = formatRelativeTime(mirror.lastUpdated, locale);

  return (
    <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }} role="article">
      <CardActionArea
        onClick={() => navigate(`/mirrors/${mirror.id}`)}
        sx={{ flexGrow: 1, alignItems: 'flex-start', display: 'flex', flexDirection: 'column' }}
      >
        <CardContent sx={{ width: '100%', p: 2.5 }}>
          {/* Logo + 名称 + 状态 */}
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
              mb: 1,
              gap: 1,
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 0 }}>
              <DistroLogo id={mirror.id} size={20} />
              <Typography
                variant="h6"
                sx={{ fontSize: '1rem', fontWeight: 700, color: 'text.primary', lineHeight: 1.3 }}
              >
                {mirror.name[locale]}
              </Typography>
            </Box>
            <StatusChip status={mirror.status} size="small" />
          </Box>

          {/* 描述 */}
          <Typography
            variant="body2"
            sx={{
              color: 'text.secondary',
              mb: 1.5,
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
              lineHeight: 1.5,
              minHeight: '3em',
            }}
          >
            {mirror.desc[locale]}
          </Typography>

          {/* 底部：大小 + 更新时间 */}
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              pt: 1,
              borderTop: '1px solid',
              borderColor: 'divider',
            }}
          >
            <Tooltip title={t('mirror.size')} placement="bottom">
              <Box
                sx={{ display: 'flex', alignItems: 'center', gap: 0.5, color: 'text.secondary' }}
              >
                <StorageIcon sx={{ fontSize: 14 }} />
                <Typography
                  variant="caption"
                  sx={{
                    fontWeight: 500,
                  }}
                >
                  {mirror.size || '-'}
                </Typography>
              </Box>
            </Tooltip>
            <Typography
              variant="caption"
              sx={{
                color: 'text.secondary',
              }}
            >
              {lastUpdatedText}
            </Typography>
          </Box>
        </CardContent>
      </CardActionArea>
    </Card>
  );
};

export default MirrorCard;
