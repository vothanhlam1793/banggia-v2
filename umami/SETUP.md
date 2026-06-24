# Umami Analytics — Triển khai

## 1. Khởi động Umami

```bash
cd /home/leco/banggia/umami
docker compose up -d
```

Đợi ~30s cho container khởi động.

## 2. Cấu hình Umami

Truy cập dashboard nội bộ: `http://localhost:10300`
Login: `admin` / `umami`

Sau khi login:
1. Vào **Settings** → **Websites** → **Add website**
2. Name: `BangGia`
3. Domain: `banggia.besen.vn`
4. Copy **Website ID**

## 3. Cập nhật Website ID

Sửa file `web/.env.production`, thay `SET_AFTER_UMAMI_SETUP` bằng Website ID thật:

```
NEXT_PUBLIC_UMAMI_WEBSITE_ID=xxx-xxx-xxx-xxx
```

## 4. Nginx config (trên SVR12)

Thêm vào `/etc/nginx/sites-enabled/banggia.besen.vn.conf` 
(sau `location /api/v1/` block, TRƯỚC `location /` catch-all):

```nginx
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
}
```

Reload nginx:
```bash
ssh root@10.7.0.10 "nginx -t && nginx -s reload"
```

## 5. Build & deploy web

```bash
cd /home/leco/banggia/web
rm -rf .next
npm run build
pm2 restart banggia-web
```

## 6. Truy cập dashboard

Nội bộ: `http://localhost:10300`
Từ xa (SSH tunnel): `ssh -L 10300:localhost:10300 leco@<may-leco>`
