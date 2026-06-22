# BangGia v3 — Hệ thống Bảng giá Creta Shop

> **Last updated:** 22/06/2026  
> **Deploy:** https://banggia.besen.vn (proxy qua SVR12 / 10.7.0.10)  
> **WireGuard:** 10.7.0.21 (leco) ↔ 10.7.0.10 (SVR12)

---

## I. Kiến trúc tổng thể

```
┌──────────────────────────────────────────────────────┐
│                   KIOTVIET (POS)                      │
│  API: public.kiotapi.com                             │
│  → Products: 3202 mã (code SPxxxxxx)                 │
│  → Purchase Orders: sync từ 01/01/2025               │
└──────────────────────┬───────────────────────────────┘
                       │ sync: products + import prices
                       ▼
┌──────────────────────────────────────────────────────┐
│              BACKEND (Express REST, :10202)           │
│  /api/v1/* — REST API (chính)                        │
│  /graphql  — Apollo (backup, không dùng)             │
│  /health   — status check                            │
│                                                      │
│  Models:   Product, PriceLog, User                   │
│  Routes:   products, prices, tags, groups,           │
│            auth, sync, agent                         │
│  Services: kiotviet.js (token + API client)          │
│  Scripts:  seed-tags.js, import-dlvip.js (pending)   │
└──────┬────────────────────────────┬──────────────────┘
       │                            │
       ▼                            ▼
┌─────────────────┐    ┌───────────────────────────────┐
│  WEB PUBLIC     │    │  ADMIN (:10201, /admin)        │
│  (:10200, /)    │    │                               │
│                 │    │  /            Dashboard        │
│  /        Home  │    │  /products    Products list    │
│  /info    Info  │    │  /products/*  Detail (tabs)    │
│                 │    │  /tags        Tag management   │
│  No auth        │    │  /groups      Group management │
│                 │    │  /login       Auth             │
│                 │    │                               │
│                 │    │  Auth: JWT (localStorage)      │
└─────────────────┘    └───────────────────────────────┘
       │                            │
       └────────────┬───────────────┘
                    │
    ┌───────────────┴───────────────┐
    │           MONGODB             │
    │  Docker: ngochoang-mongo-dev  │
    │  Port: 27044                  │
    │  DB: banggiasi-v3             │
    │  Auth: black / local-dev-pwd  │
    └───────────────────────────────┘
```

---

## II. Nginx Proxy (SVR12 / 10.7.0.10)

```
https://banggia.besen.vn/
├── /api/v1/*  → http://10.7.0.21:10202/api/v1   (REST API)
├── /import/*  → http://10.7.0.21:10202/import    (CSV import review)
├── /uploads/* → http://10.7.0.21:10202/uploads   (Static images)
├── /admin/*   → http://10.7.0.21:10201           (Admin app)
└── /*         → http://10.7.0.21:10200           (Public web)
```

---

## III. REST API Endpoints

### Products
```
GET    /api/v1/products           ?search&brand&status&page&limit&isPublic&tag
GET    /api/v1/products/count     ?search&brand&status
GET    /api/v1/products/stale     ?search&group&hasPrice&staleStatus&page&limit
GET    /api/v1/products/:code
GET    /api/v1/products/:code/logs
POST   /api/v1/products/:code/prices    { prices: {L0..L4}, notes }      [auth]
PATCH  /api/v1/products/:code           { brand, group, status, ... }    [auth]
```

### Tags & Groups
```
GET    /api/v1/tags               → [{ name, count }]
POST   /api/v1/tags/rename         { old, new }                          [auth]
DELETE /api/v1/tags/:name                                                 [auth]
GET    /api/v1/groups             → [{ name, count }]
POST   /api/v1/groups/rename       { old, new }                          [auth]
DELETE /api/v1/groups/:name                                               [auth]
```

### Auth
```
POST   /api/v1/auth/login          { email, password } → { token, user }
GET    /api/v1/me                                                        [auth]
```

### Sync
```
POST   /api/v1/sync/products                                             [auth]
POST   /api/v1/sync/import-prices                                        [auth]
```

### Agent (Dify)
```
GET    /api/v1/agent/search        ?q&tag&group&brand&limit
GET    /api/v1/agent/product/:code
GET    /api/v1/agent/promotions
```

---

## IV. Data Models

### Product
| Field | Type | Description |
|-------|------|-------------|
| `code` | String unique | KiotViet product code (SPxxxxxx) |
| `name` | String | Tên sản phẩm |
| `brand` | String | Hãng (manual edit) |
| `group` | String | Nhóm (CAMERA IP, PHỤ KIỆN, Khác) |
| `prices` | Map(String→Number) | L0(sỉ lớn), L1, L2, L3, L4(bán lẻ) |
| `costPrice` | Number | Giá nhập mới nhất từ PO sync |
| `priceStaleDays` | Number | Số ngày trước khi giá "cũ" (default 7) |
| `priceUpdatedAt` | Date | Lần cuối cập nhật giá |
| `status` | Enum | ACTIVE / OUT_OF_STOCK / DISCONTINUED / PENDING_MAP |
| `isPublic` | Boolean | Hiển thị trên public page |
| `tags` | [String] | Tag filter (wifi, ngoai-troi, 4mp, ...) |
| `description` | String | Mô tả |
| `category` | String | Danh mục KiotViet |
| `imageUrl` | String | Ảnh từ KiotViet |
| `syncedFromKv` | Boolean | Đã sync từ KiotViet |

### PriceLog
| Field | Type | Description |
|-------|------|-------------|
| `productCode` | String | Reference đến Product.code |
| `type` | Enum | IMPORT_SYNC (PO) / MANUAL (tay) |
| `costPrice` | Number | Giá nhập tại thời điểm |
| `previousCostPrice` | Number | Giá nhập trước đó |
| `changes` | [{level, old, new}] | Thay đổi giá bán L0-L4 (chỉ MANUAL) |
| `updatedBy` | String | Người cập nhật |
| `notes` | String | Ghi chú |
| `createdAt` | Date | Thời điểm (PO date cho IMPORT_SYNC) |

### User
| Field | Type | Description |
|-------|------|-------------|
| `email` | String unique | Email đăng nhập |
| `name` | String | Tên |
| `password` | String | bcrypt hash |
| `isAdmin` | Boolean | Quyền admin |

---

## V. Dữ liệu hiện tại

| Chỉ số | Giá trị |
|--------|--------|
| Tổng sản phẩm | 3,202 |
| ACTIVE | 3,202 (bulk update từ PENDING_MAP) |
| Có costPrice (PO sync) | 498 |
| Có priceUpdatedAt | 498 |
| Có prices (L0-L4) | 0 (chưa import DLVIP) |
| Có tags | 2,270 / 3,202 |
| isPublic = true | 3,201 |
| Groups | 3 (CAMERA IP: 2071, Khác: 931, PHỤ KIỆN: 200) |
| Tags | 14 (camera-ip, phu-kien, wifi, 4g, 2mp, 4mp, ...) |
| PriceLogs (IMPORT_SYNC) | 2,150 entries |
| Users | 1 (admin@example.com / admin123) |

---

## VI. Môi trường

### Backend (.env)
```
MONGODB_URI=mongodb://black:local-dev-password@127.0.0.1:27044/banggiasi-v3?authSource=admin
JWT_SECRET=cretabanggia-dev-secret-key-2026
KIOTVIET_CLIENT_ID=bae3bcbe-...
KIOTVIET_CLIENT_SECRET=0D92F5E...
KIOTVIET_RETAILER=cretasolu
PORT=10202
```

### Admin (.env.local + .env.production)
```
NEXT_PUBLIC_API_URL=https://banggia.besen.vn/api/v1  (.env.local)
NEXT_PUBLIC_API_URL=/api/v1                           (.env.production)
```

### Web (.env.local + .env.production)
```
NEXT_PUBLIC_API_URL=https://banggia.besen.vn/api/v1  (.env.local)
NEXT_PUBLIC_API_URL=/api/v1                           (.env.production)
```

---

## VII. Running Services

| Service | Port | Command | Status |
|---------|------|---------|--------|
| MongoDB | 27044 | Docker: ngochoang-mongo-dev | Running |
| Backend | 10202 | `node src/index.js` | Running |
| Admin | 10201 | `npx next start -p 10201` | Running |
| Web | 10200 | `npx next start -p 10200` | Running |

---

## VIII. Nguồn dữ liệu tham khảo

### DLVIP (bảng giá bán hiện tại)
```
File: docs/DLVIP.csv
Sheet: https://docs.google.com/spreadsheets/d/1vEmcBNNzSQe5UM-gbQGCh3Y7AkzUJFuPuBnRAMJU0lg
Columns: STT | TÊN MÃ | Mã đồng bộ | HÃNG | L4(giá lẻ) | L0(giá sỉ) | Trạng thái | Date
Rows: 33 sản phẩm (IMOU, EZVIZ, DAHUA)
Status: Cần import → Product.prices (pending)
```

### BẢNG GIÁ KHUYẾN MÃI
```
File: docs/BANG-GIA-KHUYENMAI.csv
Sheet: https://docs.google.com/spreadsheets/d/14UNvSW83YGLAPfj0UwqkZoZVpcw1jdHzG72aZ7HsYTg
Columns: name | price | branch (CAM ANALOG/XVR/CAMERA IP/NVR) | group=KHUYENMAI
Rows: 51 sản phẩm (Dahua, Hikvision, KBVision)
Status: Cần mapping model name → KiotViet code (dành cho Dify agent)
```

---

## IX. Next Steps (Gold-4+)

| Priority | Task | Status |
|----------|------|--------|
| P0 | Import DLVIP → Product.prices (L0-L4) | Pending |
| P0 | Map KHUYENMAI sheet → tags + prices | Pending |
| P1 | Docker + docker-compose | Not started |
| P1 | PM2 process manager | Not started |
| P1 | Auth gate mutations (requireAdmin) | Not started |
| P2 | Dify Agent tích hợp search_products, get_product, get_promotions | Configs ready |
| P2 | Remove GraphQL + Apollo (deprecated) | Ready to delete |
| P3 | Auto-incremental PO sync (lastSyncDate) | Not started |
| P3 | Public page SEO (ISR/SSR, metadata) | Not started |
