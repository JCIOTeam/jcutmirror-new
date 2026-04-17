// src/i18n.ts
// 国际化配置 - 支持中英文切换
//
// 语言决策顺序：
//   1. localStorage 中的 'locale' 键（来自 useLocaleStore 的 persist）
//   2. 浏览器 navigator.language
//   3. fallbackLng: 'zh'

import i18next from 'i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import { initReactI18next } from 'react-i18next';

import en from './locales/en.json';
import zh from './locales/zh.json';

i18next
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      zh: { translation: zh },
      en: { translation: en },
    },
    // 仅支持中英；非这两种一律退回中文
    supportedLngs: ['zh', 'en'],
    fallbackLng: 'zh',
    // 注意：不要同时设置 lng 和 detection，否则 detector 不生效
    // lng 删除后，detector 才能按 detection.order 决策
    interpolation: {
      escapeValue: false, // React 已处理 XSS
    },
    detection: {
      order: ['localStorage', 'navigator', 'htmlTag'],
      lookupLocalStorage: 'locale-store-i18n',
      caches: ['localStorage'],
    },
    // 没找到翻译键时不要把 key 当文本展示（更利于发现遗漏的翻译）
    returnEmptyString: false,
  });

export default i18next;
