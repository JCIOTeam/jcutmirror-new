// src/components/mirrors/StatusChip.tsx
// 镜像同步状态标识组件

import { Box, Chip } from '@mui/material';
import React from 'react';
import { useTranslation } from 'react-i18next';

import type { MirrorStatus } from '../../types';

interface StatusChipProps {
    status: MirrorStatus;
    size?: 'small' | 'medium';
}

const statusColorMap: Record<MirrorStatus, 'success' | 'error' | 'info' | 'default'> = {
    succeeded: 'success',
    failed:    'error',
    syncing:   'info',
    cached:    'default',
};

// syncing 状态的颜色（亮色/暗色模式均适用的主题色）
const SYNCING_COLOR = '#3B82F6';  // MUI info blue

const StatusChip: React.FC<StatusChipProps> = ({ status, size = 'small' }) => {
    const { t } = useTranslation();
    const isSyncing = status === 'syncing';
    const chipH = size === 'small' ? 22 : 28;

    if (isSyncing) {
        // ── 同步中：呼吸效果（整个 Chip 缓慢放光） ─────────────────────────────
        return (
            <Box
                sx={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    position: 'relative',
                    // 外发光晕：随呼吸节奏扩散收缩
                    '&::before': {
                        content: '""',
                        position: 'absolute',
                        inset: -3,
                        borderRadius: 999,
                        background: `radial-gradient(ellipse at center, ${SYNCING_COLOR}55 0%, transparent 70%)`,
                        animation: 'breathe-glow 2.8s ease-in-out infinite',
                    },
                    '@keyframes breathe-glow': {
                        '0%, 100%': { opacity: 0.3, transform: 'scale(0.92)' },
                        '50%':       { opacity: 1,   transform: 'scale(1.08)' },
                    },
                }}
            >
                <Chip
                    label={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.6 }}>
                            {/* 圆形跳动指示器 */}
                            <Box
                                component="span"
                                sx={{
                                    width: size === 'small' ? 6 : 8,
                                    height: size === 'small' ? 6 : 8,
                                    borderRadius: '50%',
                                    bgcolor: 'currentColor',
                                    display: 'inline-block',
                                    flexShrink: 0,
                                    animation: 'breathe-dot 2.8s ease-in-out infinite',
                                    '@keyframes breathe-dot': {
                                        '0%, 100%': { opacity: 0.4, transform: 'scale(0.75)' },
                                        '50%':       { opacity: 1,   transform: 'scale(1)' },
                                    },
                                }}
                            />
                            {t('mirror.status.syncing')}
                        </Box>
                    }
                    color="info"
                    size={size}
                    variant="outlined"
                    sx={{
                        fontWeight: 700,
                        fontSize: size === 'small' ? '0.7rem' : '0.8rem',
                        height: chipH,
                        letterSpacing: '0.02em',
                        position: 'relative',
                        zIndex: 1,
                        // Chip 自身也随呼吸节奏淡入淡出
                        animation: 'breathe-chip 2.8s ease-in-out infinite',
                        '@keyframes breathe-chip': {
                            '0%, 100%': { opacity: 0.65 },
                            '50%':       { opacity: 1 },
                        },
                        '& .MuiChip-label': { px: 1 },
                    }}
                />
            </Box>
        );
    }

    // ── 其他状态：静态 Chip ────────────────────────────────────────────────────
    return (
        <Chip
            label={t(`mirror.status.${status}`)}
            color={statusColorMap[status]}
            size={size}
            variant="filled"
            sx={{
                fontWeight: 700,
                fontSize: size === 'small' ? '0.7rem' : '0.8rem',
                height: chipH,
                letterSpacing: '0.02em',
            }}
            aria-label={`状态: ${t(`mirror.status.${status}`)}`}
        />
    );
};

export default StatusChip;
