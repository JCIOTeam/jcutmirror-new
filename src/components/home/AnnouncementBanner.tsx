// src/components/home/AnnouncementBanner.tsx
// 全宽细条公告横幅 —— system banner 风格
// · 从 public/announcements.json 加载，无需重新构建
// · 多条公告时用 1/N 翻页，不堆叠
// · 置顶公告左侧加粗色条，可逐条关闭

import {
  Close as CloseIcon,
  ChevronLeft as PrevIcon,
  ChevronRight as NextIcon,
  OpenInNew as LinkIcon,
  CampaignOutlined as MegaphoneIcon,
} from '@mui/icons-material';
import { Box, Typography, IconButton, Link, Chip } from '@mui/material';
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { useLocaleStore } from '../../stores/mirrorStore';

type AnnouncementType = 'info' | 'warning' | 'error' | 'success';

interface AnnouncementLink {
  url: string;
  label: { zh: string; en: string };
}

interface Announcement {
  id: string;
  type: AnnouncementType;
  pinned: boolean;
  dismissible: boolean;
  date: string;
  title: { zh: string; en: string };
  content: { zh: string; en: string };
  link: AnnouncementLink | null;
}

const STORAGE_KEY = 'dismissed_announcements';
const RECENT_DAYS = 30;

function isRecent(dateStr: string) {
  return new Date(dateStr).getTime() >= Date.now() - RECENT_DAYS * 86400_000;
}
function loadDismissed(): Set<string> {
  try {
    return new Set(JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]'));
  } catch {
    return new Set();
  }
}
function saveDismissed(ids: Set<string>) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...ids]));
  } catch {
    /* ignore */
  }
}

// severity → 颜色 token（用于背景色和强调色）
const SEVERITY_COLOR: Record<
  AnnouncementType,
  { bg: string; bgDark: string; accent: string; text: string }
> = {
  info: {
    bg: 'rgba(59,130,246,0.07)',
    bgDark: 'rgba(59,130,246,0.12)',
    accent: '#3B82F6',
    text: '#1D4ED8',
  },
  warning: {
    bg: 'rgba(245,158,11,0.08)',
    bgDark: 'rgba(245,158,11,0.13)',
    accent: '#F59E0B',
    text: '#92400E',
  },
  error: {
    bg: 'rgba(239,68,68,0.07)',
    bgDark: 'rgba(239,68,68,0.12)',
    accent: '#EF4444',
    text: '#991B1B',
  },
  success: {
    bg: 'rgba(34,197,94,0.07)',
    bgDark: 'rgba(34,197,94,0.11)',
    accent: '#22C55E',
    text: '#14532D',
  },
};

const AnnouncementBanner: React.FC = () => {
  const { locale } = useLocaleStore();
  const navigate = useNavigate();

  const [items, setItems] = useState<Announcement[]>([]);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const [index, setIndex] = useState(0);

  useEffect(() => {
    fetch('/announcements.json')
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((data: Announcement[]) => {
        const dis = loadDismissed();
        const filtered = data
          .filter((a) => (a.pinned || isRecent(a.date)) && !dis.has(a.id))
          .sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0));
        setItems(filtered);
        setDismissed(dis);
      })
      .catch(() => {
        /* 静默忽略 */
      });
  }, []);

  const visible = items.filter((a) => !dismissed.has(a.id));
  if (visible.length === 0) return null;

  const current = visible[Math.min(index, visible.length - 1)];
  const colors = SEVERITY_COLOR[current.type];
  const total = visible.length;

  const handleDismiss = () => {
    const next = new Set(dismissed);
    next.add(current.id);
    saveDismissed(next);
    setDismissed(next);
    // 关闭后 index 可能越界，向前收缩
    setIndex((i) => Math.max(0, Math.min(i, total - 2)));
  };

  const handleLink = (url: string) => {
    if (url.startsWith('http')) {
      window.open(url, '_blank', 'noopener');
    } else {
      navigate(url);
    }
  };

  return (
    <Box
      sx={{
        width: '100%',
        bgcolor: (theme) => (theme.palette.mode === 'dark' ? colors.bgDark : colors.bg),
        borderBottom: '1px solid',
        borderColor: (theme) =>
          theme.palette.mode === 'dark' ? `${colors.accent}30` : `${colors.accent}25`,
        // 置顶公告左侧加粗色条
        borderLeft: current.pinned ? `3px solid ${colors.accent}` : 'none',
        position: 'relative',
      }}
    >
      <Box
        sx={{
          maxWidth: 1200,
          mx: 'auto',
          px: { xs: 2, md: 3 },
          py: 0,
          height: { xs: 'auto', sm: 40 },
          minHeight: 40,
          display: 'flex',
          alignItems: 'center',
          gap: 1.5,
          flexWrap: { xs: 'wrap', sm: 'nowrap' },
        }}
      >
        {/* 图标 */}
        <MegaphoneIcon sx={{ fontSize: 15, color: colors.accent, flexShrink: 0 }} />

        {/* 置顶徽章 */}
        {current.pinned && (
          <Chip
            label={locale === 'zh' ? '置顶' : 'Pinned'}
            size="small"
            sx={{
              height: 18,
              fontSize: '0.62rem',
              fontWeight: 700,
              bgcolor: colors.accent,
              color: '#fff',
              flexShrink: 0,
              '& .MuiChip-label': { px: 0.8 },
            }}
          />
        )}

        {/* 标题 + 正文（单行，超出省略） */}
        <Typography
          variant="body2"
          sx={{
            flex: 1,
            minWidth: 0,
            fontSize: '0.82rem',
            lineHeight: '40px',
            overflow: 'hidden',
            whiteSpace: 'nowrap',
            textOverflow: 'ellipsis',
            color: (theme) => (theme.palette.mode === 'dark' ? 'text.primary' : colors.text),
          }}
        >
          <Box component="span" sx={{ fontWeight: 700, mr: 0.8 }}>
            {current.title[locale]}
          </Box>
          <Box component="span" sx={{ opacity: 0.75 }}>
            {current.content[locale]}
          </Box>
        </Typography>

        {/* 详情链接 */}
        {current.link && (
          <Link
            component="button"
            onClick={() => handleLink(current.link?.url ?? '')}
            underline="hover"
            sx={{
              fontSize: '0.78rem',
              color: colors.accent,
              fontWeight: 600,
              flexShrink: 0,
              display: 'flex',
              alignItems: 'center',
              gap: 0.3,
              border: 'none',
              bgcolor: 'transparent',
              cursor: 'pointer',
              lineHeight: 1,
            }}
          >
            {current.link.label[locale]}
            <LinkIcon sx={{ fontSize: 11 }} />
          </Link>
        )}

        {/* 多条翻页 */}
        {total > 1 && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.2, flexShrink: 0 }}>
            <IconButton
              size="small"
              sx={{ p: 0.3 }}
              onClick={() => setIndex((i) => (i - 1 + total) % total)}
              disabled={total <= 1}
            >
              <PrevIcon sx={{ fontSize: 16 }} />
            </IconButton>
            <Typography
              variant="caption"
              sx={{
                fontSize: '0.7rem',
                color: 'text.secondary',
                minWidth: 28,
                textAlign: 'center',
              }}
            >
              {Math.min(index, total - 1) + 1}/{total}
            </Typography>
            <IconButton
              size="small"
              sx={{ p: 0.3 }}
              onClick={() => setIndex((i) => (i + 1) % total)}
              disabled={total <= 1}
            >
              <NextIcon sx={{ fontSize: 16 }} />
            </IconButton>
          </Box>
        )}

        {/* 关闭按钮 */}
        {current.dismissible && (
          <IconButton
            size="small"
            onClick={handleDismiss}
            sx={{ p: 0.4, flexShrink: 0, opacity: 0.6, '&:hover': { opacity: 1 } }}
          >
            <CloseIcon sx={{ fontSize: 14 }} />
          </IconButton>
        )}
      </Box>
    </Box>
  );
};

export default AnnouncementBanner;
