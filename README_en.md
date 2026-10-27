# JCUT Mirror — University Open Source Mirror Frontend

[![CI](https://github.com/JCIOTeam/jcutmirror-new/actions/workflows/ci.yml/badge.svg)](https://github.com/JCIOTeam/jcutmirror-new/actions/workflows/ci.yml)
[![License: GPL-3.0](https://img.shields.io/badge/License-GPL--3.0--or--later-blue.svg)](https://opensource.org/licenses/GPL-3.0)
[![Node](https://img.shields.io/badge/Node-%3E%3D20-green.svg)]()

[中文文档](README.md)

A modern mirror site frontend built with React + TypeScript + Material UI, designed to work with [tunasync-rs](https://github.com/JCIOTeam/tunasync-rs) (recommended) or [tunasync](https://github.com/tuna/tunasync) out of the box.

**Live site**: [https://mirrors.jcut.edu.cn](https://mirrors.jcut.edu.cn)

---

## Feature Preview

- Mirror list with real-time sync status
- Popular mirrors recommendation (`popular-mirrors.json`)
- Mirror favorites (persisted in browser localStorage)
- Config generator (one-click source replacement config)
- Chinese/English bilingual, dark/light mode
- News/announcement system
- Mirror directory browsing (unified Nginx FancyIndex style)
- Campus network detection (auto-identify campus/public/IPv6)
- System monitoring dashboard (Grafana + Prometheus)

---

## Tech Stack

| Layer | Technology |
| ------ | ---------- |
| Frontend Framework | React 19 + TypeScript |
| UI Components | Material UI v9 |
| Build Tool | Vite 7 |
| Data Fetching | TanStack Query + Axios |
| State Management | Zustand |
| Internationalization | react-i18next + i18next |
| Icons | simple-icons (distro logos) |
| Doc Rendering | MDX (help docs compiled into frontend) |
| Unit Testing | Vitest + Testing Library |
| Web Server | Nginx (with FancyIndex module) |
| Deployment | Docker + Docker Compose |
| Monitoring | Prometheus + Grafana |

---

## How It Works with tunasync

This project **only provides the frontend**; mirror sync tasks are handled by a separate tunasync program. The relationship is as follows:

```
tunasync worker  →  Sync mirror files to /data/mirrors/
                        ↓
tunasync manager →  Provides HTTP API (default :12345/jobs)
                        ↓
   Nginx          →  Reverse proxies /jobs to tunasync manager
                  →  Frontend React SPA reads status and displays
                  →  FancyIndex for direct mirror directory browsing
```

### Recommended: tunasync-rs (Rust rewrite)

> **Recommended**: [tunasync-rs](https://github.com/JCIOTeam/tunasync-rs) is a Rust rewrite of tunasync, optimized specifically for this project with better compatibility. Use it for the best experience.

| Feature | tunasync-rs | Official tunasync (Go) |
|---------|------------|----------------------|
| Language | Rust | Go |
| Compatibility with this project | ✅ Deeply integrated | Basically compatible |
| Repository | [JCIOTeam/tunasync-rs](https://github.com/JCIOTeam/tunasync-rs) | [tuna/tunasync](https://github.com/tuna/tunasync) |

The tunasync manager needs to be **deployed separately** (it can run on the host directly). The `backend` service in this project's `docker-compose.yml` points to the tunasync manager.

---

## Quick Deployment

### Prerequisites

- Bun >= 1.4.2 (for development)
- Docker + Docker Compose (Compose v2 recommended)
- tunasync manager running (recommended: [tunasync-rs](https://github.com/JCIOTeam/tunasync-rs), default port `:12345`)
- Mirror data directory (e.g. `/data/mirrors/`)

### Step 1: Clone and Configure

```bash
git clone https://github.com/JCIOTeam/jcutmirror-new.git
cd jcutmirror-new
```

Copy the environment variable example and modify as needed:

```bash
cp .env.example .env
# At minimum, change GRAFANA_PASSWORD
```

Modify `server_name` in `docker/default.conf` to your domain:

```nginx
server_name mirrors.example.edu.cn;
```

### Step 2: Configure tunasync Backend Address

In `docker/default.conf`, confirm the tunasync manager address and port:

```nginx
location = /jobs {
    proxy_pass http://<tunasync-manager-host>:12345/jobs;
    ...
}
```

If the tunasync manager and the frontend container are on the same machine (running on the host), you can use:

```nginx
proxy_pass http://host.docker.internal:12345/jobs;
```

Or replace the `backend` image with your tunasync manager container directly.

### Step 3: Start Services

```bash
docker compose up -d --build
```

Visit `http://your-domain` to see the mirror site homepage.
Grafana monitoring dashboard is at `http://your-domain/grafana/`.

---

## Directory Structure (Core)

```
.
├── src/                    # Frontend source code
│   ├── docs/mdx/           # Mirror help docs (zh/en, MDX format)
│   └── pages/              # Page components
├── public/
│   ├── local_data.json     # Supplementary mirror info (name, description, ISO file list)
│   └── announcements.json  # Announcement data
├── nginx/
│   ├── header.html         # FancyIndex page header
│   ├── footer.html         # FancyIndex page footer
│   └── fancyindex.css      # FancyIndex styles (create manually, see notes below)
├── docker/
│   ├── nginx.conf          # Nginx main config
│   └── default.conf        # Site config (reverse proxy, FancyIndex, SPA routing)
├── monitoring/             # Prometheus + Grafana config
├── docker-compose.yml
└── Dockerfile
```

---

## Adding a New Mirror

**1. Add display info** (name, description, ISO file list)

Add to `public/local_data.json`:

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

**2. Add help documentation**

Create `your-mirror.mdx` under `src/docs/mdx/zh/` and `src/docs/mdx/en/` with source replacement instructions.

**3. Configure Nginx FancyIndex** (optional)

Add to `docker/default.conf`:

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

## ISO File List Auto-Update Script

`scripts/mirror_config_updater.py` is a Python tool that **automatically scans ISO files on disk** and syncs the results to `public/local_data.json`, eliminating the need to manually maintain the ISO list.

It currently supports auto-detection for the following distributions:

- Ubuntu, Debian
- Rocky Linux, CentOS (vault)
- Arch Linux
- openEuler
- Kali Linux

For Ubuntu, Debian, and openEuler, the script automatically **filters out old patch versions**, keeping only the latest image for each major version (e.g. if both 22.04.4 and 22.04.5 exist, only 22.04.5 is kept).

### Basic Usage

```bash
# [Recommended] Dry-run first to preview changes without modifying any files
python3 scripts/mirror_config_updater.py \
  --data-dir /data/mirrors \
  --config public/local_data.json

# After confirming, add --apply to actually write changes
python3 scripts/mirror_config_updater.py \
  --data-dir /data/mirrors \
  --config public/local_data.json \
  --apply

# Update only one distribution (e.g. only scan ubuntu)
python3 scripts/mirror_config_updater.py \
  --data-dir /data/mirrors \
  --config public/local_data.json \
  --distro ubuntu \
  --apply

# Check if scan paths exist (for troubleshooting "no files found" issues)
python3 scripts/mirror_config_updater.py \
  --data-dir /data/mirrors \
  --config public/local_data.json \
  --list-paths
```

> **Note**: Without `--apply`, the script only does a dry-run preview and will not modify files.

### Parameter Reference

| Parameter | Default | Description |
| --------- | ------- | ----------- |
| `--data-dir` | `/data` | Mirror file root directory (where tunasync syncs to) |
| `--config` | `/opt/convertAPI/local_data.json` | Path to `local_data.json` (**must be specified manually to the project path**) |
| `--apply` | No | Actually write config; without this flag, only preview |
| `--distro` | All | Only process specified distribution |
| `--list-paths` | — | List all scan paths and exit |

> **Known issue**: The default `--config` path is a legacy dev value (`/opt/convertAPI/local_data.json`). **You must specify the correct path each time you run it**, otherwise the file will not be found.

### Rebuild Frontend After Updating

The script modifies `public/local_data.json`, which is bundled into the frontend during `bun run build`. Rebuild after changes:

```bash
# If deploying via Docker
docker compose up -d --build frontend

# If building manually
bun run build
```

### Setting Up Automatic Scheduled Updates (crontab)

ISO files change after each tunasync sync, so it's recommended to set up a daily cron job.

**Option 1: Direct crontab (suitable for host deployment)**

```bash
crontab -e
```

Add the following (runs daily at 4:00 AM, logs to `/var/log/mirror_updater.log`):

```cron
0 4 * * * python3 /opt/jcutmirror/scripts/mirror_config_updater.py \
  --data-dir /data/mirrors \
  --config /opt/jcutmirror/public/local_data.json \
  --apply >> /var/log/mirror_updater.log 2>&1 \
  && docker compose -f /opt/jcutmirror/docker-compose.yml up -d --build frontend
```

This command does two things: updates the JSON, then rebuilds the frontend container on success.

**Option 2: systemd timer (recommended)**

Create service file `/etc/systemd/system/mirror-updater.service`:

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

Create timer file `/etc/systemd/system/mirror-updater.timer`:

```ini
[Unit]
Description=Run mirror updater daily at 4 AM

[Timer]
OnCalendar=*-*-* 04:00:00
Persistent=true

[Install]
WantedBy=timers.target
```

Enable and start:

```bash
systemctl daemon-reload
systemctl enable --now mirror-updater.timer

# Check timer status
systemctl list-timers mirror-updater.timer

# Manually trigger once (for testing)
systemctl start mirror-updater.service

# View logs
journalctl -u mirror-updater.service -f
```

---

## FAQ

**Q: FancyIndex page styles not working?**

You need to install `ngx_http_fancyindex_module` in the Nginx image. The official `nginx:alpine` image does **not** include this module. You need to use an image that includes it, or install it manually in the Dockerfile:

```dockerfile
RUN apk add --no-cache nginx-mod-http-fancyindex
```

And add at the top of `nginx.conf`:

```nginx
load_module modules/ngx_http_fancyindex_module.so;
```

Also ensure `nginx/fancyindex.css` exists (write it yourself following the styles referenced in header.html).

**Q: Mirror list is blank or showing errors?**

Check if the tunasync manager is running properly. Visit `http://your-server:12345/jobs` to confirm it returns JSON data. Also check if the proxy_pass address in nginx is correct.

**Q: Grafana shows "Unauthorized"?**

The default password is set in `.env` under `GRAFANA_PASSWORD`. Change it promptly after initial deployment.

---

## Development

```bash
bun install           # Install dependencies
bun run dev           # Dev server on :3000, auto-proxies /jobs to production
bun run build         # Type check + build + sitemap generation
bun run preview       # Preview production build on :4173
bun run typecheck     # TypeScript type checking
bun run lint          # Biome check
bun run lint:fix      # Biome lint auto-fix
bun run format        # Biome formatting
bun run test          # Run tests (Vitest)
bun run test:watch    # Watch mode tests
bun run test:coverage # Test coverage report
```

---

## CI/CD

The project uses GitHub Actions for continuous integration (`.github/workflows/ci.yml`), running automatically on every push and PR:

1. **Lint** — Biome code style check
2. **TypeCheck** — TypeScript type checking
3. **Test** — Vitest unit tests
4. **Build** — Production build
5. **Audit** — Bun dependency security audit
6. **Docker Smoke Test** — Docker build smoke test

---

## License

[GPL-3.0-or-later](LICENSE)
