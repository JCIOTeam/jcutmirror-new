// src/components/mirrors/DistroLogo.tsx
// 发行版 Logo 组件
//
// 优先级：
//   1. ICON_MAP 中有记录 → simple-icons CDN + CSS mask 染色
//   2. INLINE_MAP 中有记录 → 内嵌 SVG（用于 simple-icons 未收录的发行版）
//   3. 兜底 → MUI AlbumIcon（光盘图标），新增镜像时不会报错
//
// 新增发行版时，在 ICON_MAP 中补充 simple-icons slug 即可。
// simple-icons 未收录的，在 INLINE_MAP 里提供一个内嵌 SVG。
// simple-icons slug 查询：https://simpleicons.org/
//
// 用法：<DistroLogo id="ubuntu" size={22} />

import AlbumIcon from '@mui/icons-material/Album';
import { Box } from '@mui/material';
import React from 'react';

// ── 1. simple-icons 收录的发行版（id → slug + 品牌色）────────────────────────
const ICON_MAP: Record<string, { slug: string; color: string }> = {
    ubuntu:    { slug: 'ubuntu',     color: '#E95420' },
    debian:    { slug: 'debian',     color: '#A81D33' },
    archlinux: { slug: 'archlinux',  color: '#1793D1' },
    centos:    { slug: 'centos',     color: '#262577' },
    rocky:     { slug: 'rockylinux', color: '#10B981' },
    kali:      { slug: 'kalilinux',  color: '#557C94' },
};

// ── 2. 内嵌 SVG（simple-icons 未收录时的备选）────────────────────────────────
const INLINE_MAP: Record<string, (size: number) => React.ReactElement> = {
    openeuler: (size) => (
        <svg viewBox="0 0 24 24" width={size} height={size} aria-label="openEuler">
            <circle cx="12" cy="12" r="9"   fill="none" stroke="#C00000" strokeWidth="1.6" />
            <circle cx="12" cy="12" r="5.2" fill="none" stroke="#C00000" strokeWidth="1.6" />
            <path d="M12 3v18M3 12h18"      stroke="#C00000" strokeWidth="1.1" />
        </svg>
    ),
};

// ─────────────────────────────────────────────────────────────────────────────

interface DistroLogoProps {
    id:    string;
    size?: number;
}

const siUrl = (slug: string) =>
    `https://cdn.jsdelivr.net/npm/simple-icons@13/icons/${slug}.svg`;

const DistroLogo: React.FC<DistroLogoProps> = ({ id, size = 22 }) => {
    const key  = id.toLowerCase();
    const info = ICON_MAP[key];

    // 1. simple-icons CSS mask
    if (info) {
        return (
            <Box
                component="span"
                aria-label={id}
                sx={{
                    display:            'inline-block',
                    width:              size,
                    height:             size,
                    flexShrink:         0,
                    backgroundColor:    info.color,
                    maskImage:          `url("${siUrl(info.slug)}")`,
                    maskSize:           'contain',
                    maskRepeat:         'no-repeat',
                    maskPosition:       'center',
                    WebkitMaskImage:    `url("${siUrl(info.slug)}")`,
                    WebkitMaskSize:     'contain',
                    WebkitMaskRepeat:   'no-repeat',
                    WebkitMaskPosition: 'center',
                }}
            />
        );
    }

    // 2. 内嵌 SVG
    if (INLINE_MAP[key]) return INLINE_MAP[key](size);

    // 3. 兜底：光盘图标（新增镜像时自动适用，无需改代码）
    return (
        <AlbumIcon
            sx={{ width: size, height: size, color: 'text.secondary', flexShrink: 0 }}
            aria-label={id}
        />
    );
};

export default DistroLogo;