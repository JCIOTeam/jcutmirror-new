// src/stores/mirrorStore.ts
// Zustand 全局状态管理

import { create } from 'zustand';

import type { Mirror, ThemeMode, Locale } from '../types';

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
  mode: (localStorage.getItem('theme') as ThemeMode) || 'light',

  setMode: (mode) => {
    localStorage.setItem('theme', mode);
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
  locale: (localStorage.getItem('locale') as Locale) || 'zh',

  setLocale: (locale) => {
    localStorage.setItem('locale', locale);
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
