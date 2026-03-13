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
        <svg viewBox="0 0 1024 1024" width={size} height={size} aria-label="openEuler">
            <path
                d="M887.04 399.36A122.24 122.24 0 0 1 768 421.76c-40.32-12.16-53.76-40.96-31.36-64a122.88 122.88 0 0 1 107.52-21.12c41.6 10.24 60.8 37.76 40.96 64M697.6 348.8a116.48 116.48 0 0 1-104.32 20.48c-19.2-5.76-30.08-17.92-30.72-28.16s-12.8-14.72-26.24-18.56A118.4 118.4 0 0 0 492.8 320l-17.92 3.84a128 128 0 0 0-37.76 18.56 52.48 52.48 0 0 0-17.28 35.84c0 9.6 10.24 17.92 24.32 23.04a98.56 98.56 0 0 0 48 0 112 112 0 0 1 64 0 37.76 37.76 0 0 1 17.28 64 117.12 117.12 0 0 1-114.56 21.76 41.6 41.6 0 0 1-27.52-36.48c0-10.88-10.88-19.2-24.32-24.96a116.48 116.48 0 0 0-48-3.84l-19.84 3.84a101.76 101.76 0 0 0-42.88 22.4 92.8 92.8 0 0 0-20.48 28.8 51.2 51.2 0 0 0-4.48 15.36 33.92 33.92 0 0 0 21.12 30.08 87.04 87.04 0 0 0 50.56 5.76 101.76 101.76 0 0 1 64 3.84c35.2 16 39.04 55.04 6.4 87.04a113.92 113.92 0 0 1-128 23.04 44.8 44.8 0 0 1-21.76-48 34.56 34.56 0 0 0 0-7.04 28.16 28.16 0 0 0-3.2-8.96 37.76 37.76 0 0 0-17.28-17.28 82.56 82.56 0 0 0-49.28-6.4 85.12 85.12 0 0 1-64-3.84c-24.96-15.36-17.92-47.36 15.36-71.68a128 128 0 0 1 56.32-24.32 128 128 0 0 0 54.4-16.64 51.84 51.84 0 0 0 23.04-33.92 39.68 39.68 0 0 0 0-11.52 35.84 35.84 0 0 1 8.32-28.16A60.16 60.16 0 0 1 320 349.44a212.48 212.48 0 0 1 27.52 0h19.2a82.56 82.56 0 0 0 30.72-16 39.04 39.04 0 0 0 17.28-23.04v-9.6c0-17.28 21.76-35.84 56.32-42.24a99.2 99.2 0 0 1 46.08 0 32.64 32.64 0 0 1 23.68 16 8.96 8.96 0 0 1 0 3.84 35.84 35.84 0 0 0 25.6 17.92 122.88 122.88 0 0 0 46.08 0 128 128 0 0 1 59.52 0c33.92 8.32 45.44 32 24.32 52.48m-80.64 384a120.32 120.32 0 0 1-147.2 26.24 67.84 67.84 0 0 1-12.16-110.08 124.16 124.16 0 0 1 133.76-24.32 64 64 0 0 1 25.6 108.16m332.8-499.2L544.64 8.32a69.12 69.12 0 0 0-64 0L72.32 232.96a64 64 0 0 0-32 54.4v448a64 64 0 0 0 32 54.4l407.04 224.64a69.12 69.12 0 0 0 64 0L950.4 789.76a64 64 0 0 0 32-54.4v-448a64 64 0 0 0-32-54.4"
                fill="#002FA7">
            </path>
        </svg>
    ),
};

// ─────────────────────────────────────────────────────────────────────────────

interface DistroLogoProps {
    id: string;
    size?: number;
}

const siUrl = (slug: string) =>
    `https://cdn.jsdelivr.net/npm/simple-icons@13/icons/${slug}.svg`;

const DistroLogo: React.FC<DistroLogoProps> = ({id, size = 22}) => {
    const key = id.toLowerCase();
    const info = ICON_MAP[key];

    // 1. simple-icons CSS mask
    if (info) {
        return (
            <Box
                component="span"
                aria-label={id}
                sx={{
                    display: 'inline-block',
                    width: size,
                    height: size,
                    flexShrink: 0,
                    backgroundColor: info.color,
                    maskImage: `url("${siUrl(info.slug)}")`,
                    maskSize: 'contain',
                    maskRepeat: 'no-repeat',
                    maskPosition: 'center',
                    WebkitMaskImage: `url("${siUrl(info.slug)}")`,
                    WebkitMaskSize: 'contain',
                    WebkitMaskRepeat: 'no-repeat',
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
            sx={{width: size, height: size, color: 'text.secondary', flexShrink: 0}}
            aria-label={id}
        />
    );
};

export default DistroLogo;