# BangGia v3 — Deploy Guide

## Kiến trúc

```
Internet → banggia.besen.vn (HTTPS)
              │
    ┌─────────▼──────────┐
    │  SVR12 (nova)       │  160.250.186.95 / 10.7.0.10
    │  nginx reverse      │
    │  proxy + Let's      │
    │  Encrypt SSL        │
    └──────┬─────────────┘
           │ WireGuard tunnel (10.7.0.10 ↔ 10.7.0.21)
           ▼
    ┌──────────────────────┐
    │  Máy Leco (local)    │  10.7.0.21
    │                      │
    │  PM2 quản lý:        │
    │  :10200 → Web public │  Next.js 16 + Mantine v9
    │  :10201 → Admin      │  Next.js 16 + Mantine v9
    │  :10202 → Backend    │  Express + REST API
    │  :27044 → MongoDB    │  Docker mongo:4.0.4
    └──────────────────────┘
```

## Nginx routing (SVR12 / 10.7.0.10)

| Path | Target | Service |
|------|--------|---------|
| `/api/v1/*` | `10.7.0.21:10202` | REST API |
| `/api` | `10.7.0.21:10202` | GraphQL |
| `/import/*` | `10.7.0.21:10202` | Import legacy |
| `/admin/*` | `10.7.0.21:10201` | Admin UI |
| `/*` | `10.7.0.21:10200` | Web public |

Config file: `/etc/nginx/sites-enabled/banggia.besen.vn.conf` trên SVR12.

## Deploy steps

### Code nằm ở: `/home/leco/banggia/`

```
banggia/
├── admin/          # Next.js admin (port 10201)
├── backend/        # Express API (port 10202)
├── web/            # Next.js web public (port 10200)
├── ecosystem.config.cjs  # PM2 config
├── docs/           # Architecture + data files
└── phase/          # Kế hoạch phát triển
```

### Deploy backend

```bash
# Pull code mới (nếu có git)
cd /home/leco/banggia

# Restart backend (Express auto-reload code)
pm2 restart banggia-backend

# Verify
curl http://localhost:10202/health
# → 200 OK
```

### Deploy admin (sau khi sửa code frontend)

```bash
cd /home/leco/banggia/admin

# Build
rm -rf .next          # Xóa cache cũ (quan trọng!)
npm run build

# Restart
pm2 restart banggia-admin

# Verify
curl -s -o /dev/null -w "%{http_code}" http://localhost:10201/admin/login
# → 200
```

### Deploy web public (sau khi sửa code frontend)

```bash
cd /home/leco/banggia/web

# Build
rm -rf .next
npm run build

# Restart
pm2 restart banggia-web

# Verify
curl -s -o /dev/null -w "%{http_code}" http://localhost:10200
# → 200
```

### Verify public endpoint

```bash
curl -s -o /dev/null -w "%{http_code}" https://banggia.besen.vn
curl -s -o /dev/null -w "%{http_code}" https://banggia.besen.vn/admin/login
curl -s https://banggia.besen.vn/api/v1/products/count
```

### Thêm route mới vào nginx (trên SVR12)

```bash
ssh root@10.7.0.10
nano /etc/nginx/sites-enabled/banggia.besen.vn.conf
# Thêm location block, giữ đúng thứ tự: static routes TRƯỚC catch-all /*

nginx -t && nginx -s reload
```

Pattern location block mới:
```nginx
location /new-path {
    proxy_pass http://10.7.0.21:10202/new-path;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_read_timeout 300;
}
```

## PM2 Quick Reference

```bash
pm2 status                        # Xem tất cả service
pm2 logs banggia-backend          # Log realtime
pm2 logs banggia-admin --lines 50 # 50 dòng gần nhất
pm2 restart banggia-admin         # Restart 1 service
pm2 restart all                   # Restart tất cả
```

## MongoDB

```bash
# Container
docker ps | grep mongo          # Kiểm tra container
docker restart ngochoang-mongo-dev  # Restart nếu cần

# Connection string: mongodb://black:local-dev-pwd@127.0.0.1:27044/banggiasi-v3?authSource=admin
```

## Troubleshooting

| Triệu chứng | Check |
|-------------|-------|
| 502 Bad Gateway | `ss -tlnp \| grep 1020` — port có listen? |
| 502 Bad Gateway | `ping 10.7.0.10` — WireGuard sống? |
| Web trống (0 sp) | Vào `/admin/activate` — sp đã ACTIVE chưa? |
| Admin 404 page mới | Đã `rm -rf .next && npm run build` chưa? |
| Backend 500 | `pm2 logs banggia-backend --lines 20` |
| MongoDB auth fail | `docker restart ngochoang-mongo-dev` |
| SSL hết hạn | `ssh root@10.7.0.10 "certbot renew"` |

## Các file quan trọng

| File | Mục đích |
|------|----------|
| `~/banggia/ecosystem.config.cjs` | PM2 config 3 service |
| `~/banggia/backend/.env` | MongoDB URI + KiotViet keys |
| `~/.hermes/skills/productivity/banggia/SKILL.md` | Skill đầy đủ |
| `/etc/nginx/sites-enabled/banggia.besen.vn.conf` | Nginx config (trên SVR12) |

---

*Viết: 2026-06-22 — từ khảo sát thực tế toàn bộ pipeline*
