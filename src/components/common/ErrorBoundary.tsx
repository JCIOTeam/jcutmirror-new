// src/components/common/ErrorBoundary.tsx
// 全局错误边界 —— 捕获子树渲染期抛出的运行时错误，避免整页白屏
//
// Suspense 只处理懒加载的 loading 态，不会捕获渲染期异常。
// 没有这层边界时，任一组件抛错（如 GithubReleaseViewer 解析畸形
// fancyindex HTML、DOMParser 异常、new URL() 抛错）会冒泡到根，
// 整个 Suspense 区白屏，已有的 ErrorPage 路由不会触发。
//
// 捕获后跳转到 /500（已有的 ErrorPage），让用户看到统一的错误页
// 而非空白。用 window.location.assign 整页跳转 —— 错误页是全屏页面，
// 不依赖错误态下可能已损坏的 Router context。
// 开发环境额外重新抛出，让 React DevTools 能定位原始错误。

import React from 'react';

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo): void {
    // 记录到 console 便于运维排查
    console.error('[ErrorBoundary] 渲染期异常:', error, info.componentStack);
    // 整页跳转到 500 错误页。错误态下 Router context 可能不可靠，
    // 用 window.location 比 useNavigate 更稳妥。
    window.location.assign('/500');
  }

  render(): React.ReactNode {
    // 出错后渲染 null —— 跳转期间避免重复抛出或渲染半破损的子树
    return this.state.hasError ? null : this.props.children;
  }
}

export default ErrorBoundary;
