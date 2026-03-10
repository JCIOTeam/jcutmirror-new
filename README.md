# JCut Mirror - 开源软件镜像站前端

高校开源软件镜像站现代化前端，基于 React 18 + TypeScript + Material UI v7。

## 技术栈

| 技术 | 版本 | 用途 |
|------|------|------|
| React | 18.x | 前端框架 |
| TypeScript | 5.x | 类型安全 |
| Vite | 5.x | 构建工具 |
| Material UI | 7.x | UI 组件库 |
| React Router | 6.x | 客户端路由 |
| Zustand | 5.x | 状态管理 |
| TanStack Query | 5.x | 数据获取/缓存 |
| react-i18next | 15.x | 国际化 |
| react-markdown | 9.x | Markdown 渲染 |
| date-fns | 4.x | 时间格式化 |
| Axios | 1.x | HTTP 客户端 |

## 目录结构

```
mirror-site/
├── src/
│   ├── api/            # API 请求封装
│   ├── components/
│   │   ├── common/     # 通用组件（Header、Footer、SearchBar...）
│   │   ├── mirrors/    # 镜像相关组件（Card、List、FileTable...）
│   │   └── docs/       # 文档渲染（DocViewer、CodeBlock）
│   ├── docs/           # 内置帮助文档（构建时加载）
│   ├── hooks/          # 自定义 Hooks
│   ├── locales/        # 国际化文件（zh.json、en.json）
│   ├── pages/          # 页面组件
│   ├── stores/         # Zustand 状态管理
│   ├── theme/          # MUI 主题配置
│   └── types/          # TypeScript 类型定义
├── nginx/
│   ├── header.html     # FancyIndex 页头
│   ├── footer.html     # FancyIndex 页脚
│   └── fancyindex.css  # FancyIndex 样式
├── docker/
│   ├── nginx.conf      # Nginx 主配置
│   └── default.conf    # 站点配置（含 FancyIndex）
├── Dockerfile
└── docker-compose.yml
```

## 快速开始

### 开发环境

```bash
# 安装依赖
npm install

# 启动开发服务器（代理到 localhost:8080）
npm run dev

# 构建生产版本
npm run build
```

### Docker 部署

```bash
# 构建并启动
docker-compose up -d --build

# 查看日志
docker-compose logs -f frontend

# 停止
docker-compose down
```

## 功能特性

- ✅ **响应式设计** - 完美适配手机/平板/桌面
- ✅ **深色/浅色模式** - MUI 主题系统，localStorage 持久化
- ✅ **中英文切换** - react-i18next，默认中文
- ✅ **镜像状态标识** - 四色状态（成功/失败/同步中/缓存）
- ✅ **字母分组列表** - A-Z 索引快速跳转
- ✅ **实时搜索过滤** - 即时响应，无需提交
- ✅ **Markdown 文档渲染** - 代码高亮 + 一键复制
- ✅ **ISO 文件下载列表** - 表格展示，带复制URL功能
- ✅ **一键换源脚本** - curl/wget 两种方式
- ✅ **校园网检测** - 显示校内/校外/IPv6 提示
- ✅ **FancyIndex 集成** - header/footer 与主站风格统一

## Nginx FancyIndex 配置

在 Nginx 配置中添加：

```nginx
location /ubuntu/ {
    alias /data/mirrors/ubuntu/;
    fancyindex on;
    fancyindex_exact_size off;
    fancyindex_header /etc/nginx/conf.d/fancyindex/header.html;
    fancyindex_footer /etc/nginx/conf.d/fancyindex/footer.html;
    fancyindex_ignore "header.html" "footer.html";
    fancyindex_directories_first on;
    fancyindex_time_format "%Y-%m-%d %H:%M";
    fancyindex_name_length 256;
    fancyindex_css_href /fancyindex.css;
}
```

## 主题与语言状态共享

主站 React 应用和 FancyIndex 页面通过 `localStorage` 共享状态：

| Key | 值 | 说明 |
|-----|-----|------|
| `theme` | `'light'` \| `'dark'` | 主题模式 |
| `locale` | `'zh'` \| `'en'` | 语言设置 |

FancyIndex 的 header.html 中通过监听 `storage` 事件实时同步变化。

## 添加帮助文档

在 `src/docs/index.ts` 中添加新文档：

```typescript
export const helpDocs: Record<string, string> = {
  'your-mirror-id': `
# 你的镜像使用帮助

## 配置方法
...
  `,
};
```

## API 接口

| 端点 | 方法 | 说明 |
|------|------|------|
| `/api/mirrors` | GET | 获取所有镜像列表 |
| `/api/mirrors/:name` | GET | 获取单个镜像详情 |
| `/api/is_campus_network` | GET | 检测是否校园网 |

## 许可证

MIT
