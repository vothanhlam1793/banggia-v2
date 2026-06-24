# Umami Analytics — Yêu cầu DevOps

## Kiến trúc

```
Public visitor → banggia.besen.vn
  ├── /_u/script.js  ──→ nginx proxy → 10.7.0.21:10300  (Umami tracking script)
  ├── /_u/api/send   ──→ nginx proxy → 10.7.0.21:10300  (Umami API — gửi event data)
  └── Dashboard       ──→ KHÔNG proxy public, chỉ nội bộ qua SSH tunnel
```

Umami chạy Docker trên máy Leco (10.7.0.21), port **10300**.
Chỉ 2 endpoint được public qua nginx để tracking script hoạt động. Dashboard chỉ truy cập nội bộ.

---

## Việc 1: Khởi động Umami Docker trên máy Leco

```bash
cd /home/leco/banggia/umami
docker compose up -d
```

Kiểm tra:
```bash
docker compose ps
curl -s -o /dev/null -w "%{http_code}" http://localhost:10300
# → 200
```

> Docker compose tự pull image `ghcr.io/umami-software/umami:postgresql-latest` + `postgres:16-alpine`.
> Data Postgres lưu tại `./pgdata/` (volume mount).

---

## Việc 2: Cấu hình nginx trên SVR12 (10.7.0.10)

File cần sửa: `/etc/nginx/sites-enabled/banggia.besen.vn.conf`

Thêm 2 location block bên dưới. **Đặt trước `location /` catch-all**, sau các route API:

```nginx
# === UMAMI TRACKING (script + API only, no dashboard) ===

location /_u/script.js {
    proxy_pass http://10.7.0.21:10300/script.js;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
}

location /_u/api/send {
    proxy_pass http://10.7.0.21:10300/api/send;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}
```

**Giải thích:**
- `/_u/script.js` — Public truy cập file tracking script (~2KB). Browser của visitor load file này.
- `/_u/api/send` — Endpoint Umami nhận dữ liệu analytics từ browser visitor gửi về.
- `proxy_set_header X-Real-IP` — Để Umami ghi nhận IP thật của visitor (dùng cho geo lookup).
- **Không proxy `/_u/`** dashboard — dashboard chỉ dùng nội bộ.

Reload nginx:
```bash
ssh root@10.7.0.10 "nginx -t && nginx -s reload"
```

Verify:
```bash
curl -s -o /dev/null -w "%{http_code}" https://banggia.besen.vn/_u/script.js
# → 200
```

---

## Việc 3: Cấu hình Umami ban đầu

Truy cập dashboard nội bộ:
```bash
# Trực tiếp trên máy Leco:
http://localhost:10300

# Hoặc từ xa qua SSH tunnel:
ssh -L 10300:localhost:10300 leco@<ip-may-leco>
# Rồi mở http://localhost:10300
```

Login mặc định: `admin` / `umami`

Các bước thiết lập:
1. **Settings → Websites → Add website**
   - Name: `BangGia`
   - Domain: `banggia.besen.vn`
2. Sau khi tạo, copy **Website ID** (dạng UUID)
3. Đổi password admin trong Settings → Account

---

## Việc 4: Cập nhật Website ID vào code web

Sửa file `/home/leco/banggia/web/.env.production`:
```
NEXT_PUBLIC_UMAMI_WEBSITE_ID=<website-id-da-copy-o-tren>
```

Build & deploy:
```bash
cd /home/leco/banggia/web
rm -rf .next
npm run build
pm2 restart banggia-web
```

---

## Kiểm tra hoạt động

Sau khi deploy, mở browser truy cập `https://banggia.besen.vn/`:
1. Mở DevTools → Network → filter `umami` hoặc `script.js`
2. Mỗi lần load trang sẽ thấy request đến `/_u/api/send`
3. Vào Umami dashboard `http://localhost:10300` → xem realtime visitors

---

## Tổng kết port mapping

| Port | Service | Truy cập |
|------|---------|----------|
| 10200 | Web public | Public qua nginx |
| 10201 | Admin | Public qua nginx |
| 10202 | Backend API | Public qua nginx |
| 10300 | **Umami** | Dashboard: nội bộ; Script+API: public qua nginx `/_u/*` |
| 27044 | MongoDB | Nội bộ |

## File liên quan

| File | Mô tả |
|------|-------|
| `umami/docker-compose.yml` | Docker compose Umami + Postgres |
| `umami/pgdata/` | Volume Postgres data (auto created) |
| `umami/SETUP.md` | Hướng dẫn đầy đủ cho developer |
| `web/app/layout.tsx` | Load Umami `<Script>` |
| `web/.env.production` | Config env `NEXT_PUBLIC_UMAMI_WEBSITE_ID` |
