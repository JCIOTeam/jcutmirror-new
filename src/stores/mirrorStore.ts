// src/stores/mirrorStore.ts
// Zustand 全局状态管理

import { create } from 'zustand';

import type { Mirror, ThemeMode, Locale } from '../types';

// ── 安全的 localStorage 工具函数 ──────────────────────────────────────────────
// Safari 隐私模式、部分嵌入环境下 localStorage 访问会抛出异常，需统一兜底
function safeGetItem(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeSetItem(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    // 存储失败时静默降级，不影响运行时状态
  }
}

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
export const useThemeStore = create<ThemeState>((set, get) => ({
  // 从 localStorage 读取主题，默认浅色
  mode: (safeGetItem('theme') as ThemeMode) || 'light',

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
  const saved = safeGetItem('mirror_favorites');
  const initial: string[] = saved ? (JSON.parse(saved) as string[]) : [];
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
