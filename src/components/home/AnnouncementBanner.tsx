// src/components/home/AnnouncementBanner.tsx
// 公告/通知组件 —— 从 public/announcements.json 加载内容
// 设计目标：
//   · 只渲染"置顶"项（pinned:true）和"最近 30 天"内的公告
//   · 支持逐条关闭（dismissible），关闭状态存入 localStorage
//   · 类型（type）对应 MUI Alert 的 severity，颜色自动匹配
//   · 不依赖后端，纯静态 JSON，运维人员可直接编辑文件

import {
  Close as CloseIcon,
  OpenInNew as LinkIcon,
} from '@mui/icons-material';
import {
  Alert, AlertTitle, Box, Button, Collapse, IconButton,
  Typography, Stack,
} from '@mui/material';
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { useLocaleStore } from '../../stores/mirrorStore';

// ── 数据类型 ──────────────────────────────────────────────────────────────────
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

function isRecent(dateStr: string): boolean {
  const cutoff = Date.now() - RECENT_DAYS * 24 * 60 * 60 * 1000;
  return new Date(dateStr).getTime() >= cutoff;
}

function loadDismissed(): Set<string> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? new Set(JSON.parse(raw) as string[]) : new Set();
  } catch {
    return new Set();
  }
}

function saveDismissed(ids: Set<string>) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...ids]));
  } catch { /* ignore */ }
}

const AnnouncementBanner: React.FC = () => {
  const { locale } = useLocaleStore();
  const navigate = useNavigate();

  const [items, setItems] = useState<Announcement[]>([]);
  const [visible, setVisible] = useState<Set<string>>(new Set());
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    fetch('/announcements.json')
      .then(r => r.ok ? r.json() : Promise.reject())
      .then((data: Announcement[]) => {
        const dismissed = loadDismissed();
        const filtered = data.filter(
          a => (a.pinned || isRecent(a.date)) && !dismissed.has(a.id)
        );
        // 置顶排前面
        filtered.sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0));
        setItems(filtered);
        setVisible(new Set(filtered.map(a => a.id)));
      })
      .catch(() => { /* 文件不存在或出错时静默忽略 */ })
      .finally(() => setLoaded(true));
  }, []);

  const handleDismiss = (id: string) => {
    setVisible(prev => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
    const dismissed = loadDismissed();
    dismissed.add(id);
    saveDismissed(dismissed);
  };

  const handleLink = (url: string) => {
    if (url.startsWith('http://') || url.startsWith('https://')) {
      window.open(url, '_blank', 'noopener,noreferrer');
    } else {
      navigate(url);
    }
  };

  if (!loaded || items.length === 0) return null;

  return (
    <Stack spacing={1}>
      {items.map(item => (
        <Collapse key={item.id} in={visible.has(item.id)} timeout={300} unmountOnExit>
          <Alert
            severity={item.type}
            variant="outlined"
            sx={{
              borderRadius: 2,
              // 置顶公告左侧加粗蓝色边框，视觉区分度更强
              borderLeftWidth: item.pinned ? 4 : 1,
              alignItems: 'flex-start',
            }}
            action={
              item.dismissible ? (
                <IconButton size="small" onClick={() => handleDismiss(item.id)} aria-label="关闭公告" sx={{ mt: -0.5 }}>
                  <CloseIcon fontSize="small" />
                </IconButton>
              ) : undefined
            }
          >
            <AlertTitle sx={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
              {item.title[locale]}
              {item.pinned && (
                <Typography component="span" variant="caption"
                  sx={{ bgcolor: 'warning.main', color: 'warning.contrastText', px: 0.7, py: 0.1, borderRadius: 0.8, fontSize: '0.65rem', fontWeight: 700, lineHeight: 1.6 }}>
                  {locale === 'zh' ? '置顶' : 'Pinned'}
                </Typography>
              )}
            </AlertTitle>

            <Box sx={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 2, flexWrap: 'wrap' }}>
              <Typography variant="body2" sx={{ flex: 1, minWidth: 0, lineHeight: 1.65 }}>
                {item.content[locale]}
              </Typography>
              {item.link && (
                <Button size="small" endIcon={<LinkIcon sx={{ fontSize: 14 }} />}
                  onClick={() => handleLink(item.link!.url)}
                  sx={{ flexShrink: 0, fontSize: '0.78rem', whiteSpace: 'nowrap' }}>
                  {item.link.label[locale]}
                </Button>
              )}
            </Box>

            <Typography variant="caption" color="text.disabled" sx={{ mt: 0.5, display: 'block' }}>
              {item.date}
            </Typography>
          </Alert>
        </Collapse>
      ))}
    </Stack>
  );
};

export default AnnouncementBanner;
