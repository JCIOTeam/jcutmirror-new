// src/hooks/useMirrors.ts
// 镜像数据获取 Hook（TanStack Query）

import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';

import { fetchMirrors, fetchMirrorByName, fetchCampusNetworkStatus } from '../api';
import { useMirrorSearchStore } from '../stores/mirrorStore';
import type { GroupedMirrors, Mirror } from '../types';

/**
 * 获取所有镜像列表
 */
export const useMirrors = () => {
  return useQuery({
    queryKey: ['mirrors'],
    queryFn: fetchMirrors,
    staleTime: 1000 * 60 * 2, // 2分钟缓存
    refetchInterval: 1000 * 60 * 5, // 5分钟自动刷新
  });
};

/**
 * 获取单个镜像详情
 */
export const useMirrorDetail = (name: string) => {
  return useQuery({
    queryKey: ['mirror', name],
    queryFn: () => fetchMirrorByName(name),
    enabled: !!name,
    staleTime: 1000 * 60 * 2,
  });
};

/**
 * 获取校园网状态
 */
export const useCampusNetwork = () => {
  return useQuery({
    queryKey: ['campusNetwork'],
    queryFn: fetchCampusNetworkStatus,
    staleTime: 1000 * 60 * 10, // 10分钟缓存
    retry: 1,
  });
};

/**
 * 镜像搜索过滤
 */
export const useFilteredMirrors = (mirrors: Mirror[] = []) => {
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
        m.desc.en.toLowerCase().includes(q),
    );
  }, [mirrors, searchQuery]);
};

/**
 * 按字母A-Z分组镜像
 */
export const useGroupedMirrors = (mirrors: Mirror[]): GroupedMirrors => {
  return useMemo(() => {
    const groups: GroupedMirrors = {};
    const sorted = [...mirrors].sort((a, b) => a.id.localeCompare(b.id));
    sorted.forEach((mirror) => {
      const letter = mirror.id[0].toUpperCase();
      if (!groups[letter]) groups[letter] = [];
      groups[letter].push(mirror);
    });
    return groups;
  }, [mirrors]);
};

/**
 * 获取常用/热门镜像（取前8个succeeded状态的）
 */
export const usePopularMirrors = (mirrors: Mirror[], count = 8): Mirror[] => {
  return useMemo(() => {
    const popular = ['ubuntu', 'debian', 'centos', 'fedora', 'archlinux', 'pypi', 'npm', 'docker'];
    const result: Mirror[] = [];
    popular.forEach((id) => {
      const m = mirrors.find((m) => m.id === id);
      if (m) result.push(m);
    });
    // 如果热门镜像不足，用其他succeeded的补充
    if (result.length < count) {
      mirrors
        .filter((m) => m.status === 'succeeded' && !result.includes(m))
        .slice(0, count - result.length)
        .forEach((m) => result.push(m));
    }
    return result.slice(0, count);
  }, [mirrors, count]);
};
