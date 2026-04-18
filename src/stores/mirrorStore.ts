// src/stores/mirrorStore.ts
// Zustand 全局状态管理
//
// 使用 persist 中间件统一管理本地存储：
//   - 自带版本迁移（version 字段）
//   - 自带异常隔离（storage 失败不影响 state）
//   - 自带选择性持久化（partialize）

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

import type { Mirror, ThemeMode, Locale } from '../types';
import { safeGetItem, safeSetItem, safeRemoveItem } from '../utils/storage';

// ── persist 自定义存储：复用 safeGetItem 的兜底逻辑（Safari 隐私模式等）──
const safeStorage = createJSONStorage(() => ({
  getItem: (key) => safeGetItem(key),
  setItem: (key, value) => safeSetItem(key, value),
  removeItem: (key) => safeRemoveItem(key),
}));

// ---- 主题 Store ----
interface ThemeState {
  mode: ThemeMode;
  setMode: (mode: ThemeMode) => void;
  toggleMode: () => void;
}

/** 首次访问跟随系统深色偏好 */
function getInitialThemeMode(): ThemeMode {
  try {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  } catch {
    return 'light';
  }
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set, get) => ({
      mode: getInitialThemeMode(),
      setMode: (mode) => {
        try {
          document.documentElement.setAttribute('data-theme', mode);
        } catch {
          /* SSR 兜底 */
        }
        set({ mode });
      },
      toggleMode: () => {
        get().setMode(get().mode === 'light' ? 'dark' : 'light');
      },
    }),
    {
      name: 'theme',
      storage: safeStorage,
      version: 1,
      partialize: (s) => ({ mode: s.mode }),
    }
  )
);

// ---- 语言 Store ----
interface LocaleState {
  locale: Locale;
  setLocale: (locale: Locale) => void;
}

export const useLocaleStore = create<LocaleState>()(
  persist(
    (set) => ({
      locale: 'zh',
      setLocale: (locale) => set({ locale }),
    }),
    {
      name: 'locale-store',
      storage: safeStorage,
      version: 1,
      partialize: (s) => ({ locale: s.locale }),
    }
  )
);

// ---- 搜索 Store（不持久化）----
interface MirrorSearchState {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
}

export const useMirrorSearchStore = create<MirrorSearchState>((set) => ({
  searchQuery: '',
  setSearchQuery: (query) => set({ searchQuery: query }),
}));

// ---- 镜像缓存 Store（运行时缓存，不持久化）----
interface MirrorCacheState {
  mirrors: Mirror[];
  setMirrors: (mirrors: Mirror[]) => void;
}

export const useMirrorCacheStore = create<MirrorCacheState>((set) => ({
  mirrors: [],
  setMirrors: (mirrors) => set({ mirrors }),
}));

// ---- 收藏 Store ----
interface FavoriteState {
  favorites: string[];
  toggleFavorite: (id: string) => void;
  isFavorite: (id: string) => boolean;
  clearFavorites: () => void;
}

export const useFavoriteStore = create<FavoriteState>()(
  persist(
    (set, get) => ({
      favorites: [],
      toggleFavorite: (id) => {
        const cur = get().favorites;
        set({ favorites: cur.includes(id) ? cur.filter((f) => f !== id) : [...cur, id] });
      },
      isFavorite: (id) => get().favorites.includes(id),
      clearFavorites: () => set({ favorites: [] }),
    }),
    {
      name: 'mirror_favorites',
      storage: safeStorage,
      version: 2,
      partialize: (s) => ({ favorites: s.favorites }),
      // 旧版本（v1，纯 JSON 数组写在 'mirror_favorites' key 下）的迁移
      migrate: (persisted, version) => {
        if (version < 2 && Array.isArray(persisted)) {
          return { favorites: (persisted as string[]).filter((v) => typeof v === 'string') };
        }
        return persisted as { favorites: string[] };
      },
    }
  )
);
