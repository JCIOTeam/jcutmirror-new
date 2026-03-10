// src/components/docs/CodeBlock.tsx
// 代码块组件 - 语法高亮 + 一键复制

import {
  ContentCopy as CopyIcon,
  CheckCircle as CheckIcon,
} from '@mui/icons-material';
import { Box, IconButton, Tooltip, Typography } from '@mui/material';
import React, { useState } from 'react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark, oneLight } from 'react-syntax-highlighter/dist/esm/styles/prism';

import { useThemeStore } from '../../stores/mirrorStore';

interface CodeBlockProps {
  children: string;
  language?: string;
  inline?: boolean;
}

/**
 * 带语法高亮和复制按钮的代码块
 */
const CodeBlock: React.FC<CodeBlockProps> = ({ children, language = 'bash', inline = false }) => {
  const [copied, setCopied] = useState(false);
  const { mode } = useThemeStore();

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(children);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      console.error('复制失败');
    }
  };

  // 行内代码
  if (inline) {
    return (
      <Typography
        component="code"
        sx={{
          fontFamily: '"JetBrains Mono", monospace',
          fontSize: '0.85em',
          bgcolor: mode === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)',
          color: 'primary.main',
          px: 0.6,
          py: 0.2,
          borderRadius: 0.5,
        }}
      >
        {children}
      </Typography>
    );
  }

  return (
    <Box
      sx={{
        position: 'relative',
        borderRadius: 2,
        overflow: 'hidden',
        my: 2,
        border: '1px solid',
        borderColor: 'divider',
      }}
    >
      {/* 语言标签 + 复制按钮 */}
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          px: 2,
          py: 0.8,
          bgcolor: mode === 'dark' ? '#2d3748' : '#f1f5f9',
          borderBottom: '1px solid',
          borderColor: 'divider',
        }}
      >
        <Typography
          variant="caption"
          sx={{
            fontFamily: '"JetBrains Mono", monospace',
            color: 'text.secondary',
            fontWeight: 600,
            fontSize: '0.72rem',
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
          }}
        >
          {language}
        </Typography>
        <Tooltip title={copied ? '已复制！' : '复制代码'} placement="left">
          <IconButton
            size="small"
            onClick={handleCopy}
            color={copied ? 'success' : 'default'}
            sx={{ p: 0.5 }}
            aria-label="复制代码"
          >
            {copied ? (
              <CheckIcon sx={{ fontSize: 16 }} />
            ) : (
              <CopyIcon sx={{ fontSize: 16 }} />
            )}
          </IconButton>
        </Tooltip>
      </Box>

      {/* 语法高亮代码 */}
      <SyntaxHighlighter
        language={language}
        style={mode === 'dark' ? oneDark : oneLight}
        customStyle={{
          margin: 0,
          padding: '16px',
          fontSize: '0.85rem',
          lineHeight: 1.6,
          borderRadius: 0,
          background: 'transparent',
        }}
        showLineNumbers={children.split('\n').length > 3}
        wrapLongLines
      >
        {children}
      </SyntaxHighlighter>
    </Box>
  );
};

export default CodeBlock;
