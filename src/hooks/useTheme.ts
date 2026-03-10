// src/hooks/useTheme.ts
// 主题切换 Hook

import { useThemeStore } from '../stores/mirrorStore';
import { lightTheme, darkTheme } from '../theme/theme';

export const useTheme = () => {
  const { mode, toggleMode, setMode } = useThemeStore();
  const theme = mode === 'light' ? lightTheme : darkTheme;
  const isDark = mode === 'dark';

  return { mode, theme, isDark, toggleMode, setMode };
};
