# BangGia v3 — Deploy Guide

## Kiến trúc

```
Internet → banggia.creta.vn (HTTPS)
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
    │  :27045 → MongoDB    │  Docker mongo:4.0 (volume: banggia-mongo-data)
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

Config file: `/etc/nginx/sites-enabled/banggia.creta.vn.conf` trên SVR12.

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
# → {"status":"ok"}
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
curl -s -o /dev/null -w "%{http_code}" https://banggia.creta.vn
# → 200
curl -s -o /dev/null -w "%{http_code}" https://banggia.creta.vn/admin/login
# → 200
curl -s https://banggia.creta.vn/api/v1/products/count
# → {"ok":true,"data":3170}
```

### Thêm route mới vào nginx (trên SVR12)

```bash
ssh root@10.7.0.10
nano /etc/nginx/sites-enabled/banggia.creta.vn.conf
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

Container riêng, độc lập với các dự án khác.

```bash
# Kiểm tra container
docker ps | grep banggia-mongo

# Restart nếu cần
docker restart banggia-mongo

# Logs
docker logs banggia-mongo --tail 20

# Dung lượng
sudo du -sh /var/lib/docker/volumes/banggia-mongo-data/_data/
```

| Thuộc tính | Giá trị |
|------------|---------|
| Container | `banggia-mongo` |
| Image | `mongo:4.0` |
| Port | `127.0.0.1:27045` |
| Volume | `banggia-mongo-data` |
| Connection string | `mongodb://127.0.0.1:27045/banggiasi-v3` |
| Auth | Không (internal localhost) |
| Restart policy | `unless-stopped` |

> **Lưu ý:** MongoDB này KHÔNG dùng chung với Ngọc Hoàng. Ngọc Hoàng có container riêng `ngochoang-mongo-dev` (port 27044, volume `ngochoang-v2_mongo-data`).

## Troubleshooting

| Triệu chứng | Check |
|-------------|-------|
| 502 Bad Gateway | `ss -tlnp \| grep 1020` — port có listen? |
| 502 Bad Gateway | `ping 10.7.0.10` — WireGuard sống? |
| Web trống (0 sp) | Vào `/admin/activate` — sp đã ACTIVE chưa? |
| Admin 404 page mới | Đã `rm -rf .next && npm run build` chưa? |
| Backend 500 | `pm2 logs banggia-backend --lines 20` |
| Backend crash loop | `docker ps \| grep banggia-mongo` — MongoDB có chạy? |
| Backend crash loop | `curl http://localhost:10202/health` — check kết nối DB |
| MongoDB không lên | `docker logs banggia-mongo --tail 30` — xem lỗi |
| SSL hết hạn | `ssh root@10.7.0.10 "certbot renew"` |

## Các file quan trọng

| File | Mục đích |
|------|----------|
| `~/banggia/ecosystem.config.cjs` | PM2 config 3 service |
| `~/banggia/backend/.env` | MongoDB URI + KiotViet keys |
| `~/banggia/DEPLOY.md` | Tài liệu này |
| `~/.hermes/skills/productivity/banggia/SKILL.md` | Skill đầy đủ |
| `/etc/nginx/sites-enabled/banggia.creta.vn.conf` | Nginx config (trên SVR12) |

---

*Cập nhật: 2026-07-15 — tách MongoDB độc lập, container `banggia-mongo` (mongo:4.0, port 27045)*
*Viết: 2026-06-22 — từ khảo sát thực tế toàn bộ pipeline*
