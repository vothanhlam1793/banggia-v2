# BangGia → Product Information Hub

**Goal:** Nâng cấp BangGia từ "kho giá" thành **trung tâm thông tin sản phẩm** — mọi thứ về 1 sản phẩm (giá, ảnh, demo, chiến lược, khách mục tiêu, chương trình) đều ở 1 nơi.

---

## Phase 1: Hàng chiến lược (Priority: HIGH)

### Problem
Hiện tại không có chỗ lưu: sản phẩm nào đang chạy chương trình gì, margin mục tiêu bao nhiêu, nhắm nhóm khách nào. Ra quyết định dựa trên cảm tính + Excel rời rạc.

### Solution
Thêm field vào Product model + admin UI để gắn nhãn chiến lược.

### 1.1 Schema mở rộng

```js
// backend/src/models/Product.js — thêm:
{
  isStrategic: { type: Boolean, default: false },
  campaigns: [{              // 1 SP có thể thuộc nhiều chương trình
    name: String,            // "DTS-2%", "Đẩy tồn T6", "KM đầu năm"
    startDate: Date,
    endDate: Date,
    targetMargin: Number,    // % (vd: 8 = 8%)
    targetCustomer: String,  // "Thợ nhỏ", "Công trình", "Đại lý", "Lẻ"
    note: String,            // "Combo với Sandisk 64GB"
  }],
  strategicPriority: { type: Number, default: 0 }, // 0-5, dùng để sort
}
```

### 1.2 Admin UI

**Trang mới: `/admin/strategic`** — danh sách hàng chiến lược:
- Table filter theo campaign, targetCustomer
- Cột: prCode, name, brand, margin hiện tại, margin mục tiêu, chương trình, khách mục tiêu
- Inline toggle `isStrategic`
- Nút "Thêm vào campaign" → form nhỏ (chọn campaign có sẵn hoặc tạo mới)

**Trang product detail** — thêm section "Chiến lược":
- Toggle isStrategic
- List campaigns đang active + nút thêm/xóa
- Chỉnh sửa targetMargin, targetCustomer, note

### 1.3 API

```
GET  /api/v1/products/strategic?campaign=DTS-2%    ← lọc theo campaign
POST /api/v1/products/:code/campaigns               ← thêm campaign
DELETE /api/v1/products/:code/campaigns/:campaignId ← xóa
```

### 1.4 Tích hợp với Hermes agent

Agent có thể:
- Query `GET /products/strategic` → biết mặt hàng nào đang chiến lược
- Gợi ý: "A32EP đang DTS-2%, margin mục tiêu 8%, nhắm thợ nhỏ → còn 15 con tồn → đề xuất đẩy thêm 1 tuần"

---

## Phase 2: Media Hub (Priority: MEDIUM)

### Problem
Ảnh/video demo sản phẩm nằm rải rác: Zalo, Drive, YouTube. Khi Trang cần gửi khách phải lục tung lên.

### Solution
Tận dụng field `images` hiện có + thêm field video/links.

### 2.1 Schema

```js
{
  images: [String],           // đã có — thêm upload video ngắn
  demoLinks: [{
    type: String,             // "youtube", "drive", "facebook"
    url: String,
    label: String,            // "Unboxing", "Lắp đặt thực tế", "Demo tính năng"
  }],
}
```

### 2.2 Admin UI

- Product detail: upload video (mp4, <30MB)
- Section "Media": list ảnh, video, link demo
- Web public: hiển thị video/ảnh trong modal sản phẩm

---

## Phase 3: Đầu ra thông minh (Priority: LOW — nghiên cứu sau)

### Problem
Chưa link được: hàng chiến lược → khách hàng mục tiêu → dự đoán doanh số.

### Ý tưởng
- Từ campaign + targetCustomer → agent tự đề xuất danh sách khách từ KiotViet
- Track: khách nào mua hàng chiến lược → tự động gắn nhãn "khách chiến lược"
- Dashboard: doanh số campaign, tỷ lệ chuyển đổi

---

## Timeline đề xuất

| Phase | Effort | Ai |
|-------|--------|-----|
| 1.1 Schema + migration | 1-2h | Backend |
| 1.2 Admin UI (strategic page) | 3-4h | Frontend |
| 1.3 API | 1-2h | Backend |
| 1.4 Hermes integration | 1h | Agent config |
| 2 Media Hub | 4-6h | Full-stack |
| 3 Smart Output | Research | — |

**Bắt đầu Phase 1 — tổng ~6-8h cho full-stack.**

---

## Notes

- Không migrate dữ liệu cũ — thêm field mới, để trống, gắn nhãn dần
- Campaign "DTS-2%" đang chạy → ưu tiên gắn nhãn ngay sau khi deploy
- Admin UI dùng Mantine v9 (theo chuẩn hiện tại của banggia)
- API public cho agent không cần auth (đã có pattern trong `agent-api.md`)
