// src/components/config-generator/ConfigGenerator.tsx
// 配置生成器组件 - 用于在 MDX 文档中动态生成配置

import CheckCircle from '@mui/icons-material/CheckCircle';
import ContentCopy from '@mui/icons-material/ContentCopy';
import {
  Box,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Paper,
  Typography,
  IconButton,
} from '@mui/material';
import React, { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import CodeBlock from '../docs/CodeBlock';

interface ConfigGeneratorProps {
  /** 提示文本 */
  promptString: string;
  /** 版本列表 */
  versionList: string[];
  /** 默认版本 */
  defaultVersion: string;
  /** 配置生成函数 */
  configGen: (version: string) => string;
  /** 代码语言 */
  language?: string;
}

/**
 * 配置生成器组件
 * 允许用户选择版本并生成对应的配置
 */
const ConfigGenerator: React.FC<ConfigGeneratorProps> = ({
  promptString,
  versionList = [],
  defaultVersion,
  configGen,
  language = 'bash',
}) => {
  const { t } = useTranslation();
  // 确保 versionList 不为空
  const safeVersionList = useMemo(() => {
    if (!Array.isArray(versionList) || versionList.length === 0) {
      return [];
    }
    return versionList;
  }, [versionList]);

  // 确保 defaultVersion 有效
  const safeDefaultVersion = useMemo(() => {
    if (defaultVersion && safeVersionList.includes(defaultVersion)) {
      return defaultVersion;
    }
    return safeVersionList[0] || '';
  }, [defaultVersion, safeVersionList]);

  const [selectedVersion, setSelectedVersion] = useState<string>(safeDefaultVersion);
  const [copied, setCopied] = useState(false);

  const config = useMemo(() => {
    if (!selectedVersion || !configGen) return '';
    try {
      return configGen(selectedVersion);
    } catch (error) {
      console.error('配置生成失败:', error);
      return '# 配置生成失败';
    }
  }, [selectedVersion, configGen]);

  const handleCopy = async () => {
    if (!config) return;
    try {
      await navigator.clipboard.writeText(config);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      console.error('复制失败');
    }
  };

  // 如果没有版本列表，显示提示
  if (safeVersionList.length === 0) {
    return (
      <Paper
        variant="outlined"
        sx={{
          my: 3,
          p: 2,
          borderRadius: 2,
          border: '1px solid',
          borderColor: 'divider',
          bgcolor: 'action.hover',
        }}
      >
        <Typography variant="body2" color="text.secondary">
          {t('configGenerator.noVersions')}
        </Typography>
      </Paper>
    );
  }

  return (
    <Paper
      variant="outlined"
      sx={{
        my: 3,
        p: 2,
        borderRadius: 2,
        border: '1px solid',
        borderColor: 'divider',
      }}
    >
      {/* 版本选择器 */}
      <Box sx={{ mb: 2 }}>
        <Typography variant="subtitle2" fontWeight={600} gutterBottom>
          {promptString}
        </Typography>
        <FormControl size="small" sx={{ minWidth: 200 }}>
          <InputLabel id="version-select-label">{promptString}</InputLabel>
          <Select
            labelId="version-select-label"
            value={selectedVersion}
            label={promptString}
            onChange={(e) => setSelectedVersion(e.target.value as string)}
          >
            {safeVersionList.map((version) => (
              <MenuItem key={version} value={version}>
                {version}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Box>

      {/* 配置代码块 */}
      <Box sx={{ position: 'relative' }}>
        <CodeBlock language={language}>{config}</CodeBlock>

        {/* 复制按钮 */}
        <IconButton
          size="small"
          onClick={handleCopy}
          sx={{
            position: 'absolute',
            top: 8,
            right: 8,
            bgcolor: 'background.paper',
            boxShadow: 1,
            '&:hover': {
              bgcolor: 'action.hover',
            },
          }}
          aria-label="复制配置"
        >
          {copied ? (
            <CheckCircle fontSize="small" color="success" />
          ) : (
            <ContentCopy fontSize="small" />
          )}
        </IconButton>
      </Box>
    </Paper>
  );
};

export default ConfigGenerator;
