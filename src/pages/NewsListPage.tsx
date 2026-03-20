// src/pages/NewsListPage.tsx
// 新闻列表页 /news

import { ArrowForward as ArrowIcon } from '@mui/icons-material';
import { Box, Container, Typography, Chip, Divider, Breadcrumbs, Link } from '@mui/material';
import React, { useMemo } from 'react';
import { Helmet } from 'react-helmet-async';
import { useTranslation } from 'react-i18next';
import { useNavigate, Link as RouterLink } from 'react-router-dom';

import { useLocaleStore } from '../stores/mirrorStore';

import { getNewsList } from '@/news';

const NewsListPage: React.FC = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { locale } = useLocaleStore();
  const news = useMemo(() => getNewsList(), []);

  const title = t('news.title') + ' - JCUT Mirror';

  return (
    <>
      <Helmet>
        <title>{title}</title>
      </Helmet>

      <Container maxWidth="md" sx={{ py: { xs: 3, md: 5 } }}>
        <Breadcrumbs sx={{ mb: 3 }}>
          <Link component={RouterLink} to="/" underline="hover" color="text.secondary">
            {t('nav.home')}
          </Link>
          <Typography color="text.primary" fontWeight={500}>
            {t('news.breadcrumb')}
          </Typography>
        </Breadcrumbs>

        <Typography variant="h4" fontWeight={800} sx={{ mb: 0.5 }}>
          {t('news.latestNews')}
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 4 }}>
          {t('news.subtitle')}
        </Typography>

        <Box>
          {news.map((item, idx) => (
            <React.Fragment key={item.slug}>
              <Box
                onClick={() => navigate(`/news/${item.slug}`)}
                sx={{
                  py: 2.5,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'flex-start',
                  justifyContent: 'space-between',
                  gap: 2,
                  '&:hover .news-title': { color: 'primary.main' },
                  '&:hover .news-arrow': { opacity: 1, transform: 'translateX(3px)' },
                }}
              >
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  {/* 日期 + 标签行 */}
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 1,
                      mb: 0.8,
                      flexWrap: 'wrap',
                    }}
                  >
                    <Typography
                      variant="caption"
                      color="text.disabled"
                      fontFamily='"JetBrains Mono", monospace'
                    >
                      {item.date}
                    </Typography>
                    {item.tags?.map((tag) => (
                      <Chip
                        key={tag}
                        label={tag}
                        size="small"
                        sx={{
                          height: 18,
                          fontSize: '0.65rem',
                          '& .MuiChip-label': { px: 0.8 },
                        }}
                      />
                    ))}
                  </Box>

                  {/* 标题 */}
                  <Typography
                    className="news-title"
                    variant="h6"
                    fontWeight={700}
                    sx={{
                      fontSize: { xs: '1rem', md: '1.1rem' },
                      mb: 0.5,
                      transition: 'color 0.15s',
                    }}
                  >
                    {locale === 'zh' ? item.title : (item.titleEn ?? item.title)}
                  </Typography>

                  {/* 摘要 */}
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{ lineHeight: 1.6, maxWidth: 600 }}
                  >
                    {locale === 'zh' ? item.summary : (item.summaryEn ?? item.summary)}
                  </Typography>
                </Box>

                {/* 箭头 */}
                <ArrowIcon
                  className="news-arrow"
                  sx={{
                    color: 'primary.main',
                    mt: 0.5,
                    flexShrink: 0,
                    opacity: 0,
                    transition: 'opacity 0.15s, transform 0.15s',
                  }}
                />
              </Box>
              {idx < news.length - 1 && <Divider />}
            </React.Fragment>
          ))}

          {news.length === 0 && (
            <Typography color="text.secondary" sx={{ py: 4, textAlign: 'center' }}>
              {t('news.noNews')}
            </Typography>
          )}
        </Box>
      </Container>
    </>
  );
};

export default NewsListPage;
