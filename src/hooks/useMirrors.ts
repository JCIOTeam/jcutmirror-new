// src/hooks/useMirrors.ts
// 镜像数据获取 Hook（TanStack Query）

import { useQuery } from '@tanstack/react-query';
import { useMemo, useEffect, useState } from 'react';

import { useMirrorSearchStore } from '../stores/mirrorStore';

import { fetchMirrors, fetchMirrorByName, fetchCampusNetworkStatus } from '@/api';
import type { Mirror, GroupedMirrors } from '@/types';

// ── 基础查询 Hooks ────────────────────────────────────────────────────────────

export const useMirrors = () =>
  useQuery<Mirror[]>({
    queryKey: ['mirrors'],
    queryFn: fetchMirrors,
    staleTime: 60_000,
  });

export const useMirrorDetail = (name: string) =>
  useQuery<Mirror>({
    queryKey: ['mirror', name],
    queryFn: () => fetchMirrorByName(name),
    enabled: !!name,
    staleTime: 60_000,
  });

export const useCampusNetwork = () =>
  useQuery<string>({
    queryKey: ['campusNetwork'],
    queryFn: fetchCampusNetworkStatus,
    staleTime: 300_000,
    retry: 1,
  });

// ── 搜索 / 过滤 ───────────────────────────────────────────────────────────────

export const useFilteredMirrors = (mirrors: Mirror[]): Mirror[] => {
  const { searchQuery } = useMirrorSearchStore();
  return useMemo(() => {
    if (!searchQuery.trim()) return mirrors;
    const q = searchQuery.toLowerCase();
    return mirrors.filter(
      (m) =>
        m.id.toLowerCase().includes(q) ||
        m.name.zh.toLowerCase().includes(q) ||
        m.name.en.toLowerCase().includes(q) ||
        m.desc.zh.toLowerCase().includes(q) ||
        m.desc.en.toLowerCase().includes(q)
    );
  }, [mirrors, searchQuery]);
};

export const useGroupedMirrors = (mirrors: Mirror[]): GroupedMirrors =>
  useMemo(() => {
    const groups: GroupedMirrors = {};
    mirrors.forEach((m) => {
      const letter = m.id[0]?.toUpperCase() ?? '#';
      if (!groups[letter]) groups[letter] = [];
      groups[letter].push(m);
    });
    return groups;
  }, [mirrors]);

// ── 常用镜像 —— 从 public/popular-mirrors.json 读取，运行时可热更新 ─────────

/** 内置兜底列表，当 JSON 文件不存在或加载失败时使用 */
const FALLBACK_POPULAR = [
  'ubuntu',
  'debian',
  'archlinux',
  'archlinuxcn',
  'kali',
  'rocky',
  'alpine',
  'openeuler',
];

export const usePopularMirrors = (mirrors: Mirror[], count = 8): Mirror[] => {
  const [popularIds, setPopularIds] = useState<string[]>([]);

  useEffect(() => {
    fetch('/popular-mirrors.json')
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((ids: string[]) => {
        if (Array.isArray(ids) && ids.length > 0) setPopularIds(ids);
        else setPopularIds(FALLBACK_POPULAR);
      })
      .catch(() => setPopularIds(FALLBACK_POPULAR));
  }, []);

  return useMemo(() => {
    // 先按 popular-mirrors.json 中的顺序取
    const ids = popularIds.length > 0 ? popularIds : FALLBACK_POPULAR;
    const result: Mirror[] = [];
    ids.forEach((id) => {
      const m = mirrors.find((m) => m.id === id);
      if (m) result.push(m);
    });
    // 不足 count 条时用 succeeded 状态的镜像补足
    if (result.length < count) {
      mirrors
        .filter((m) => m.status === 'succeeded' && !result.find((r) => r.id === m.id))
        .slice(0, count - result.length)
        .forEach((m) => result.push(m));
    }
    return result.slice(0, count);
  }, [mirrors, popularIds, count]);
};
