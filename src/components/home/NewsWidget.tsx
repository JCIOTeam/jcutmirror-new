// src/components/home/NewsWidget.tsx
// 首页「最新动态」小组件 —— 显示最新 3 篇新闻标题

import { ArrowForward as ArrowIcon, Article as ArticleIcon } from '@mui/icons-material';
import { Box, Typography, Button, Divider, Chip } from '@mui/material';
import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

import { getNewsList } from '../../news';
import { useLocaleStore } from '../../stores/mirrorStore';

const MAX_ITEMS = 3;

const NewsWidget: React.FC = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { locale } = useLocaleStore();
  // getNewsList() 通过 import.meta.glob eager 在构建时固定，运行时不会变化，
  // 空依赖数组是有意为之，避免每次渲染都重新执行（尽管它是纯函数）
  const news = useMemo(() => getNewsList().slice(0, MAX_ITEMS), []);

  if (news.length === 0) return null;

  return (
    <Box
      sx={{
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: 2,
        overflow: 'hidden',
        bgcolor: 'background.paper',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* 标题栏 */}
      <Box
        sx={{
          px: 2,
          py: 1.5,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '1px solid',
          borderColor: 'divider',
          bgcolor: 'action.hover',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8 }}>
          <ArticleIcon sx={{ fontSize: 16, color: 'primary.main' }} />
          <Typography
            variant="subtitle2"
            sx={{
              fontWeight: 700,
            }}
          >
            {t('news.latestNews')}
          </Typography>
        </Box>
        <Button
          size="small"
          endIcon={<ArrowIcon sx={{ fontSize: 14 }} />}
          onClick={() => navigate('/news')}
          sx={{ fontSize: '0.75rem', p: '2px 6px', minHeight: 0 }}
        >
          {t('news.all')}
        </Button>
      </Box>
      {/* 新闻列表 */}
      <Box sx={{ flex: 1 }}>
        {news.map((item, idx) => (
          <React.Fragment key={item.slug}>
            <Box
              onClick={() => navigate(`/news/${item.slug}`)}
              sx={{
                px: 2,
                py: 1.4,
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                gap: 0.4,
                transition: 'background-color 0.15s',
                '&:hover': { bgcolor: 'action.hover' },
              }}
            >
              {/* 标题 */}
              <Typography
                variant="body2"
                sx={{
                  fontWeight: 600,
                  lineHeight: 1.4,
                  overflow: 'hidden',
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical',
                  '&:hover': { color: 'primary.main' },
                  transition: 'color 0.15s',
                }}
              >
                {locale === 'zh' ? item.title : (item.titleEn ?? item.title)}
              </Typography>

              {/* 日期 + 标签 */}
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8, flexWrap: 'wrap' }}>
                <Typography
                  variant="caption"
                  sx={{
                    color: 'text.disabled',
                    fontFamily: '"JetBrains Mono", monospace',
                  }}
                >
                  {item.date}
                </Typography>
                {item.tags?.slice(0, 2).map((tag) => (
                  <Chip
                    key={tag}
                    label={tag}
                    size="small"
                    sx={{
                      height: 16,
                      fontSize: '0.6rem',
                      '& .MuiChip-label': { px: 0.6 },
                      bgcolor: 'action.selected',
                    }}
                  />
                ))}
              </Box>
            </Box>
            {idx < news.length - 1 && <Divider />}
          </React.Fragment>
        ))}
      </Box>
    </Box>
  );
};

export default NewsWidget;
