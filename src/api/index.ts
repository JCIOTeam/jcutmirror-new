// src/api/index.ts
// API 请求封装 - 与后端严格兼容

import axios from 'axios';

import type { Mirror, CampusNetworkStatus } from '../types';

// 创建 axios 实例
const apiClient = axios.create({
  baseURL: 'https://mirrors.jcut.edu.cn/api',
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// 请求拦截器
apiClient.interceptors.request.use(
  (config) => config,
  (error) => Promise.reject(error),
);

// 响应拦截器
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error('[API Error]', error.message);
    return Promise.reject(error);
  },
);

/**
 * 获取所有镜像列表
 * GET /api/mirrors
 */
export const fetchMirrors = async (): Promise<Mirror[]> => {
  const { data } = await apiClient.get<Mirror[]>('/mirrors');
  return data;
};

/**
 * 获取单个镜像详情
 * GET /api/mirrors/:name
 */
export const fetchMirrorByName = async (name: string): Promise<Mirror> => {
  const { data } = await apiClient.get<Mirror>(`/mirrors/${encodeURIComponent(name)}`);
  return data;
};

/**
 * 判断是否校园网IP
 * GET /api/is_campus_network
 * 返回: "1"(校内) | "0"(校外) | "6"(IPv6)
 */
export const fetchCampusNetworkStatus = async (): Promise<CampusNetworkStatus> => {
  const { data } = await apiClient.get<CampusNetworkStatus>('/is_campus_network');
  return data;
};
