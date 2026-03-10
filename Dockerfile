# ===== 构建阶段 =====
FROM node:20-alpine AS builder

WORKDIR /app

# 先复制依赖文件，利用 Docker 层缓存
COPY package.json package-lock.json* ./

# 安装依赖（使用 ci 确保版本锁定）
RUN npm ci --prefer-offline

# 复制源代码
COPY . .

# 构建生产版本
RUN npm run build

# ===== 生产阶段 =====
FROM nginx:1.25-alpine AS production

# 安装 nginx-module-fancyindex（如果基础镜像未包含）
# RUN apk add --no-cache nginx-mod-http-fancyindex

# 将构建产物复制到 Nginx 默认目录
COPY --from=builder /app/dist /usr/share/nginx/html

# 复制 Nginx FancyIndex 模板文件
COPY --from=builder /app/nginx/header.html /etc/nginx/conf.d/fancyindex/header.html
COPY --from=builder /app/nginx/footer.html /etc/nginx/conf.d/fancyindex/footer.html
COPY --from=builder /app/nginx/fancyindex.css /usr/share/nginx/html/fancyindex.css

# 复制 Nginx 配置
COPY docker/nginx.conf /etc/nginx/nginx.conf
COPY docker/default.conf /etc/nginx/conf.d/default.conf

# 暴露端口
EXPOSE 80
EXPOSE 443

# 健康检查
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -qO- http://localhost/api/mirrors > /dev/null || exit 1

CMD ["nginx", "-g", "daemon off;"]
