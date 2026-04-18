# JCUT Mirror — 高校开源镜像站前端

基于 React + TypeScript + Material UI 构建的现代化镜像站前端，设计用于配合 [tunasync](https://github.com/tuna/tunasync) 使用，开箱即用。

---

## 效果预览

- 镜像列表、同步状态实时显示
- 中英双语、深色/浅色模式
- 镜像目录浏览（Nginx FancyIndex 风格统一）
- 系统监控面板（Grafana + Prometheus）

---

## 技术栈（简介）

| 层次     | 技术                        |
| -------- | --------------------------- |
| 前端框架 | React 18 + TypeScript       |
| UI 组件  | Material UI v7              |
| 构建工具 | Vite                        |
| 数据获取 | TanStack Query + Axios      |
| 状态管理 | Zustand                     |
| 国际化   | react-i18next               |
| 文档渲染 | MDX（帮助文档编译到前端）   |
| Web 服务 | Nginx（含 FancyIndex 模块） |
| 部署方式 | Docker + Docker Compose     |
| 监控     | Prometheus + Grafana        |

---

## 与 tunasync 的配合方式

本项目**只提供前端展示**，镜像同步任务由 [tunasync](https://github.com/tuna/tunasync) 负责。两者的关系如下：

```
tunasync worker  →  同步镜像文件到 /data/mirrors/
                        ↓
tunasync manager →  提供 HTTP API（默认 :12345/jobs）
                        ↓
   Nginx          →  反向代理 /jobs 到 tunasync manager
                  →  前端 React SPA 读取状态并展示
                  →  FancyIndex 直接浏览镜像目录
```

tunasync manager 需要**单独部署**（可直接跑在宿主机上，或用官方 Docker 镜像），本项目的 `docker-compose.yml` 中 `backend` 服务指向的正是 tunasync manager。

---

## 快速部署

### 前置条件

- Docker + Docker Compose（推荐 Compose v2）
- tunasync manager 已在运行（默认监听 `:12345`）
- 镜像数据目录（如 `/data/mirrors/`）

### 第一步：克隆并配置

```bash
git clone https://github.com/your-org/jcutmirror.git
cd jcutmirror
```

复制环境变量示例并按需修改：

```bash
cp .env.example .env
# 至少修改 GRAFANA_PASSWORD
```

修改 `docker/default.conf` 中的 `server_name`，改为你的域名：

```nginx
server_name mirrors.example.edu.cn;
```

### 第二步：配置 tunasync backend 地址

在 `docker/default.conf` 中，确认 tunasync manager 的地址和端口：

```nginx
location = /jobs {
    proxy_pass http://<tunasync-manager-host>:12345/jobs;
    ...
}
```

如果 tunasync manager 和前端容器在同一台机器上（宿主机运行），可以用：

```nginx
proxy_pass http://host.docker.internal:12345/jobs;
```

或直接把 `backend` 的 `image` 替换为你的 tunasync manager 容器。

### 第三步：启动服务

```bash
docker compose up -d --build
```

访问 `http://your-domain` 即可看到镜像站主页。  
Grafana 监控面板在 `http://your-domain/grafana/`。

---

## 目录结构（核心部分）

```
.
├── src/                    # 前端源代码
│   ├── docs/mdx/           # 镜像帮助文档（zh/en，MDX 格式）
│   └── pages/              # 各页面组件
├── public/
│   ├── local_data.json     # 各镜像的补充信息（名称、描述、ISO 文件列表）
│   └── announcements.json  # 公告数据
├── nginx/
│   ├── header.html         # FancyIndex 页头
│   ├── footer.html         # FancyIndex 页脚
│   └── fancyindex.css      # FancyIndex 样式（需自行创建，见下方说明）
├── docker/
│   ├── nginx.conf          # Nginx 主配置
│   └── default.conf        # 站点配置（反代、FancyIndex、SPA 路由）
├── monitoring/             # Prometheus + Grafana 配置
├── docker-compose.yml
└── Dockerfile
```

---

## 添加新镜像

**1. 补充展示信息**（名称、描述、ISO 文件列表）

在 `public/local_data.json` 中添加：

```json
"your-mirror": {
  "name": { "zh": "你的镜像", "en": "Your Mirror" },
  "desc": { "zh": "简介", "en": "Brief description" },
  "type": "os",
  "files": [
    { "name": "v1.0 amd64", "url": "/your-mirror/v1.0-amd64.iso" }
  ]
}
```

**2. 添加帮助文档**

在 `src/docs/mdx/zh/` 和 `src/docs/mdx/en/` 下新建 `your-mirror.mdx`，写上换源方法。

**3. 配置 Nginx FancyIndex**（可选）

在 `docker/default.conf` 中添加：

```nginx
location /your-mirror/ {
    alias /data/mirrors/your-mirror/;
    fancyindex on;
    fancyindex_exact_size off;
    fancyindex_header /etc/nginx/conf.d/fancyindex/header.html;
    fancyindex_footer /etc/nginx/conf.d/fancyindex/footer.html;
    fancyindex_directories_first on;
    fancyindex_css_href /fancyindex.css;
}
```

---

## ISO 文件列表自动更新脚本

`scripts/mirror_config_updater.py` 是一个 Python 工具，用于**自动扫描磁盘上的 ISO 文件**，并将结果同步写入 `public/local_data.json`，免去手动维护 ISO 列表的麻烦。

目前支持自动识别以下发行版的 ISO 文件：

- Ubuntu、Debian
- Rocky Linux、CentOS（vault）
- Arch Linux
- openEuler
- Kali Linux

对于 Ubuntu、Debian、openEuler，脚本会自动**过滤掉旧的补丁版本**，只保留每个大版本的最新镜像（例如同时存在 22.04.4 和 22.04.5 时，只保留 22.04.5）。

### 基本用法

```bash
# 【推荐先试运行】预览会发生什么变化，不修改任何文件
python3 scripts/mirror_config_updater.py \
  --data-dir /data/mirrors \
  --config public/local_data.json

# 确认无误后，加 --apply 实际写入
python3 scripts/mirror_config_updater.py \
  --data-dir /data/mirrors \
  --config public/local_data.json \
  --apply

# 只更新某一个发行版（比如只扫 ubuntu）
python3 scripts/mirror_config_updater.py \
  --data-dir /data/mirrors \
  --config public/local_data.json \
  --distro ubuntu \
  --apply

# 检查扫描路径是否存在（用于排查"扫不到文件"的问题）
python3 scripts/mirror_config_updater.py \
  --data-dir /data/mirrors \
  --config public/local_data.json \
  --list-paths
```

> ⚠️ **注意**：脚本默认不加 `--apply` 时只是预览（dry-run），不会修改文件。

### 参数说明

| 参数           | 默认值                            | 说明                                                 |
| -------------- | --------------------------------- | ---------------------------------------------------- |
| `--data-dir`   | `/data`                           | 镜像文件根目录（tunasync 同步到的目录）              |
| `--config`     | `/opt/convertAPI/local_data.json` | `local_data.json` 路径（**需要手动指定为项目路径**） |
| `--apply`      | 否                                | 实际写入配置，不加则只预览                           |
| `--distro`     | 全部                              | 只处理指定发行版                                     |
| `--list-paths` | —                                 | 列出所有扫描路径后退出                               |

> ⚠️ **已知问题**：`--config` 的默认路径是开发时的遗留值（`/opt/convertAPI/local_data.json`），**每次运行必须手动指定正确路径**，否则会找不到文件。

### 更新后重新构建前端

脚本修改的是 `public/local_data.json`，该文件在 `npm run build` 时会被打包进前端。修改后需要重新构建才能生效：

```bash
# 如果通过 Docker 部署
docker compose up -d --build frontend

# 如果手动构建
npm run build
```

### 配置定时自动运行（crontab）

tunasync 每次同步完成后 ISO 文件会发生变化，建议配置定时任务每天自动更新一次。

**方式一：直接写 crontab（适合宿主机运行）**

```bash
crontab -e
```

添加以下内容（每天凌晨 4:00 运行，日志写到 `/var/log/mirror_updater.log`）：

```cron
0 4 * * * python3 /opt/jcutmirror/scripts/mirror_config_updater.py \
  --data-dir /data/mirrors \
  --config /opt/jcutmirror/public/local_data.json \
  --apply >> /var/log/mirror_updater.log 2>&1 \
  && docker compose -f /opt/jcutmirror/docker-compose.yml up -d --build frontend
```

这条命令做两件事：先更新 JSON，成功后立刻重建前端容器。

**方式二：systemd timer（更推荐）**

创建 service 文件 `/etc/systemd/system/mirror-updater.service`：

```ini
[Unit]
Description=Mirror ISO list updater
After=network.target

[Service]
Type=oneshot
WorkingDirectory=/opt/jcutmirror
ExecStart=/usr/bin/python3 scripts/mirror_config_updater.py \
  --data-dir /data/mirrors \
  --config public/local_data.json \
  --apply
ExecStartPost=/usr/bin/docker compose up -d --build frontend
StandardOutput=journal
StandardError=journal
```

创建 timer 文件 `/etc/systemd/system/mirror-updater.timer`：

```ini
[Unit]
Description=Run mirror updater daily at 4 AM

[Timer]
OnCalendar=*-*-* 04:00:00
Persistent=true

[Install]
WantedBy=timers.target
```

启用并启动：

```bash
systemctl daemon-reload
systemctl enable --now mirror-updater.timer

# 查看定时任务状态
systemctl list-timers mirror-updater.timer

# 手动触发一次（测试用）
systemctl start mirror-updater.service

# 查看运行日志
journalctl -u mirror-updater.service -f
```

---

## 常见问题

**Q：FancyIndex 页面样式不生效？**

需要在 Nginx 镜像中安装 `ngx_http_fancyindex_module`。`nginx:alpine` 官方镜像**不自带**该模块，需要使用带该模块的镜像，或在 Dockerfile 中手动安装：

```dockerfile
RUN apk add --no-cache nginx-mod-http-fancyindex
```

并在 `nginx.conf` 顶部添加：

```nginx
load_module modules/ngx_http_fancyindex_module.so;
```

同时确保 `nginx/fancyindex.css` 文件存在（参考 header.html 中引用的样式自行编写）。

**Q：镜像列表空白、报错？**

检查 tunasync manager 是否正常运行，访问 `http://your-server:12345/jobs` 确认能返回 JSON 数据。再检查 nginx 中的 proxy_pass 地址是否正确。

**Q：Grafana 显示 "Unauthorized"？**

默认密码在 `.env` 中的 `GRAFANA_PASSWORD`，初次部署后请及时修改。

---

## 开发调试

```bash
npm install
npm run dev      # 本地开发，默认 :3000，自动代理 /jobs 到线上
npm run build    # 构建生产版本
```

---

## 许可证

GPLv3
