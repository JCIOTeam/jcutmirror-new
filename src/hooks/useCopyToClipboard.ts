// src/hooks/useCopyToClipboard.ts
// 复制到剪贴板的统一 hook —— 消除 6 处重复的
// useRef<timer> + useEffect cleanup + navigator.clipboard.writeText + setTimeout 2s 模式
//
// 用法：
//   const { copied, copy } = useCopyToClipboard();
//   <IconButton onClick={() => copy(text)}>{copied ? <Check/> : <Copy/>}</IconButton>
//
// copy 返回 Promise<boolean>，成功才置 copied=true（2s 后自动复位）。
// clipboard API 不可用或写入失败时静默失败（DEV 下 console.warn），
// copied 保持 false，按钮不误显示「已复制」。

import { useState, useRef, useEffect, useCallback } from 'react';

const RESET_DELAY = 2000;

export interface UseCopyToClipboardResult {
  copied: boolean;
  /** 复制给定文本；成功后 copied 置 true 并 2s 后自动复位。返回是否成功。 */
  copy: (text: string) => Promise<boolean>;
}

export function useCopyToClipboard(): UseCopyToClipboardResult {
  const [copied, setCopied] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 卸载时清理定时器，避免 setState on unmounted
  useEffect(
    () => () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    },
    []
  );

  const copy = useCallback(async (text: string): Promise<boolean> => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => setCopied(false), RESET_DELAY);
      return true;
    } catch (err) {
      if (import.meta.env.DEV) console.warn('[copy]', err);
      return false;
    }
  }, []);

  return { copied, copy };
}
