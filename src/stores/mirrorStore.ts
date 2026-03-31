// src/stores/mirrorStore.ts
// Zustand 全局状态管理

import { create } from 'zustand';

import type { Mirror, ThemeMode, Locale } from '../types';
import { safeGetItem, safeSetItem } from '../utils/storage';

/** 主题状态 */
interface ThemeState {
  mode: ThemeMode;
  setMode: (mode: ThemeMode) => void;
  toggleMode: () => void;
}

/** 语言状态 */
interface LocaleState {
  locale: Locale;
  setLocale: (locale: Locale) => void;
}

/** 镜像搜索状态 */
interface MirrorSearchState {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
}

/** 镜像缓存状态 */
interface MirrorCacheState {
  mirrors: Mirror[];
  setMirrors: (mirrors: Mirror[]) => void;
}

// ---- 主题 Store ----
// 优先读取 localStorage；首次访问时跟随系统深色模式偏好
function getInitialTheme(): ThemeMode {
  const saved = safeGetItem('theme') as ThemeMode | null;
  if (saved === 'light' || saved === 'dark') return saved;
  try {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  } catch {
    return 'light';
  }
}

export const useThemeStore = create<ThemeState>((set, get) => ({
  mode: getInitialTheme(),

  setMode: (mode) => {
    safeSetItem('theme', mode);
    // 同步 data-theme 属性（供 FancyIndex CSS 变量使用）
    document.documentElement.setAttribute('data-theme', mode);
    set({ mode });
  },

  toggleMode: () => {
    const next = get().mode === 'light' ? 'dark' : 'light';
    get().setMode(next);
  },
}));

// ---- 语言 Store ----
export const useLocaleStore = create<LocaleState>((set) => ({
  locale: (safeGetItem('locale') as Locale) || 'zh',

  setLocale: (locale) => {
    safeSetItem('locale', locale);
    set({ locale });
  },
}));

// ---- 搜索 Store ----
export const useMirrorSearchStore = create<MirrorSearchState>((set) => ({
  searchQuery: '',
  setSearchQuery: (query) => set({ searchQuery: query }),
}));

// ---- 镜像缓存 Store ----
export const useMirrorCacheStore = create<MirrorCacheState>((set) => ({
  mirrors: [],
  setMirrors: (mirrors) => set({ mirrors }),
}));

// ---- 收藏 Store ----
interface FavoriteState {
  favorites: string[]; // Mirror id 列表
  toggleFavorite: (id: string) => void;
  isFavorite: (id: string) => boolean;
}

export const useFavoriteStore = create<FavoriteState>((set, get) => {
  let initial: string[] = [];
  try {
    const saved = safeGetItem('mirror_favorites');
    if (saved) {
      const parsed: unknown = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.every((v) => typeof v === 'string')) {
        initial = parsed as string[];
      }
    }
  } catch {
    // JSON 解析失败（数据被篡改），静默降级为空列表
    initial = [];
  }
  return {
    favorites: initial,
    toggleFavorite: (id) => {
      const cur = get().favorites;
      const next = cur.includes(id) ? cur.filter((f) => f !== id) : [...cur, id];
      safeSetItem('mirror_favorites', JSON.stringify(next));
      set({ favorites: next });
    },
    isFavorite: (id) => get().favorites.includes(id),
  };
});
