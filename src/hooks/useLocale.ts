// src/hooks/useLocale.ts
// 语言切换 Hook —— i18next 是真理来源（detector 自动持久化到 localStorage['locale']）；
// zustand store 仅作为 React 渲染层的派生状态（key='jcut.locale'，避免与 i18next 冲突）。

import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';

import { useLocaleStore } from '../stores/mirrorStore';
import type { Locale } from '../types';

const SUPPORTED: Locale[] = ['zh', 'en'];

function normalize(lng: string | undefined): Locale {
  if (!lng) return 'zh';
  const base = lng.split('-')[0].toLowerCase();
  return (SUPPORTED as string[]).includes(base) ? (base as Locale) : 'zh';
}

export const useLocale = () => {
  const { i18n } = useTranslation();
  const { locale, setLocale } = useLocaleStore();

  // 启动时把 i18next 当前语言同步进 store；
  // 监听 languageChanged 事件以应对 detector / 程序化变更
  useEffect(() => {
    const sync = () => setLocale(normalize(i18n.language));
    sync();
    i18n.on('languageChanged', sync);
    return () => {
      i18n.off('languageChanged', sync);
    };
  }, [i18n, setLocale]);

  const changeLocale = (newLocale: Locale) => {
    void i18n.changeLanguage(newLocale); // 触发 languageChanged → 自动同步 store
  };

  const toggleLocale = () => {
    changeLocale(locale === 'zh' ? 'en' : 'zh');
  };

  return { locale, changeLocale, toggleLocale };
};
