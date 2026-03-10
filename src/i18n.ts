// src/i18n.ts
// 国际化配置 - 支持中英文切换

import i18n from 'i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import { initReactI18next } from 'react-i18next';

import en from './locales/en.json';
import zh from './locales/zh.json';

i18n
  .use(LanguageDetector) // 自动检测浏览器语言
  .use(initReactI18next)
  .init({
    resources: {
      zh: { translation: zh },
      en: { translation: en },
    },
    // 默认语言：中文
    fallbackLng: 'zh',
    lng: localStorage.getItem('locale') || 'zh',
    interpolation: {
      escapeValue: false, // React已处理XSS
    },
    detection: {
      // 语言检测顺序
      order: ['localStorage', 'navigator'],
      lookupLocalStorage: 'locale',
      caches: ['localStorage'],
    },
  });

export default i18n;
