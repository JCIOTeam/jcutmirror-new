// src/hooks/useLocale.ts
// 语言切换 Hook

import { useTranslation } from 'react-i18next';

import { useLocaleStore } from '../stores/mirrorStore';
import type { Locale } from '../types';

export const useLocale = () => {
  const { i18n } = useTranslation();
  const { locale, setLocale } = useLocaleStore();

  const changeLocale = (newLocale: Locale) => {
    setLocale(newLocale);
    i18n.changeLanguage(newLocale);
  };

  const toggleLocale = () => {
    changeLocale(locale === 'zh' ? 'en' : 'zh');
  };

  return { locale, changeLocale, toggleLocale };
};
