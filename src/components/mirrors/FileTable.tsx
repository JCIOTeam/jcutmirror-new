// src/components/mirrors/FileTable.tsx
// ISO/文件下载列表表格组件

import {
  ContentCopy as CopyIcon,
  Download as DownloadIcon,
  CheckCircle as CheckIcon,
} from '@mui/icons-material';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Tooltip,
  Typography,
  Box,
  Alert,
} from '@mui/material';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';

import type { MirrorFile } from '../../types';

interface FileTableProps {
  files: MirrorFile[];
}

/**
 * 文件下载列表 - 以表格形式展示ISO等文件
 */
const FileTable: React.FC<FileTableProps> = ({ files }) => {
  const { t } = useTranslation();
  // 记录已复制的URL
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null);

  const handleCopy = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      setCopiedUrl(url);
      setTimeout(() => setCopiedUrl(null), 2000);
    } catch {
      console.error('复制失败');
    }
  };

  if (!files || files.length === 0) {
    return <Alert severity="info">{t('mirror.noFiles')}</Alert>;
  }

  return (
    <TableContainer
      component={Paper}
      variant="outlined"
      sx={{ borderRadius: 2, overflow: 'hidden' }}
    >
      <Table size="small" aria-label="文件下载列表">
        <TableHead>
          <TableRow sx={{ bgcolor: 'action.hover' }}>
            <TableCell sx={{ fontWeight: 700 }}>{t('detail.fileName')}</TableCell>
            <TableCell sx={{ fontWeight: 700, display: { xs: 'none', md: 'table-cell' } }}>
              {t('detail.fileUrl')}
            </TableCell>
            <TableCell sx={{ fontWeight: 700, width: 100, textAlign: 'center' }}>
              {t('mirror.download')}
            </TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {files.map((file, index) => (
            <TableRow
              key={index}
              hover
              sx={{ '&:last-child td': { border: 0 } }}
            >
              {/* 文件名 */}
              <TableCell>
                <Typography
                  variant="body2"
                  sx={{
                    fontFamily: '"JetBrains Mono", monospace',
                    fontSize: '0.82rem',
                    wordBreak: 'break-all',
                  }}
                >
                  {file.name}
                </Typography>
              </TableCell>

              {/* URL */}
              <TableCell sx={{ display: { xs: 'none', md: 'table-cell' } }}>
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{
                    fontFamily: '"JetBrains Mono", monospace',
                    wordBreak: 'break-all',
                  }}
                >
                  {file.url}
                </Typography>
              </TableCell>

              {/* 操作按钮 */}
              <TableCell>
                <Box sx={{ display: 'flex', justifyContent: 'center', gap: 0.5 }}>
                  {/* 复制URL */}
                  <Tooltip
                    title={copiedUrl === file.url ? t('mirror.copied') : t('mirror.copyUrl')}
                    placement="top"
                  >
                    <IconButton
                      size="small"
                      onClick={() => handleCopy(file.url)}
                      color={copiedUrl === file.url ? 'success' : 'default'}
                      aria-label={`复制 ${file.name} 下载地址`}
                    >
                      {copiedUrl === file.url ? (
                        <CheckIcon fontSize="small" />
                      ) : (
                        <CopyIcon fontSize="small" />
                      )}
                    </IconButton>
                  </Tooltip>

                  {/* 下载链接 */}
                  <Tooltip title={`下载 ${file.name}`} placement="top">
                    <IconButton
                      size="small"
                      component="a"
                      href={file.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      color="primary"
                      aria-label={`下载 ${file.name}`}
                    >
                      <DownloadIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </Box>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
};

export default FileTable;
