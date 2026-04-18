# ===== 构建阶段 =====
FROM node:20-alpine AS builder

WORKDIR /app

# 先复制依赖文件，利用 Docker 层缓存
COPY package.json package-lock.json* ./

# 使用 ci 确保版本锁定；--ignore-scripts 阻断潜在依赖 postinstall 攻击
RUN npm ci --prefer-offline --ignore-scripts

# 复制源代码
COPY . .

# 构建生产版本
RUN npm run build

# ===== 生产阶段 =====
# 使用 Alpine 官方 nginx 包，确保主程序与 fancyindex 模块来自同一套构建
# 不使用官方 nginx:X.Y-alpine 镜像，因为其编译参数与 Alpine apk 模块包不兼容
FROM alpine:3.20 AS production

# nginx 和 fancyindex 模块必须来自同一个 apk 仓库，保证 ABI 兼容
# wget 给 healthcheck 使用，curl 用于排查
RUN apk add --no-cache \
      nginx \
      nginx-mod-http-fancyindex \
      wget \
      curl \
      tzdata \
    && rm -rf /var/cache/apk/* \
    && mkdir -p /var/log/nginx /var/run/nginx /usr/share/nginx/html \
    && chown -R nginx:nginx /var/log/nginx /var/run/nginx /usr/share/nginx/html

# 用非 root 用户跑 nginx 主进程（worker 仍然降权运行）
# nginx 镜像里默认有 nginx 用户

# 将构建产物复制到 Nginx 默认目录
COPY --from=builder /app/dist /usr/share/nginx/html

# 复制 Nginx FancyIndex 模板文件
COPY --from=builder /app/nginx/header.html /etc/nginx/conf.d/fancyindex/header.html
COPY --from=builder /app/nginx/footer.html /etc/nginx/conf.d/fancyindex/footer.html
# fancyindex.css 必须存在（README 中已说明，由维护者编写）；缺失时构建失败更明显
#COPY --from=builder /app/nginx/fancyindex.css /usr/share/nginx/html/fancyindex.css

# 复制 Nginx 配置
COPY docker/nginx.conf /etc/nginx/nginx.conf
COPY docker/default.conf /etc/nginx/conf.d/default.conf

# 暴露端口
EXPOSE 80
EXPOSE 443

# 健康检查 —— 修正：原 /api/mirrors 不存在；用 /jobs（实际后端接口）
# 失败立刻 exit 1 让 Docker/K8s 知道服务不健康
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -q --spider --tries=1 http://127.0.0.1/jobs || exit 1

CMD ["nginx", "-g", "daemon off;"]
