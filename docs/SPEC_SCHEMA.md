# Schema Chuẩn Hóa Thông Số Sản Phẩm

Tài liệu này định nghĩa cấu trúc dữ liệu chuẩn cho các nhóm sản phẩm trong hệ thống BangGia.
Dùng làm reference khi scrape dữ liệu từ web ngoài, import catalog, hoặc người dùng nhập tay.

## Nguyên tắc chung

1. **Tất cả giá trị số phải normalize về number** — không lưu string "3 Megapixel", mà lưu `{ value: 3, unit: "MP" }`
2. **Unit là SI chuẩn**: MP, mm, m, GB, TB, Mbps, V, A, W...
3. **Null = không có / không áp dụng** — không dùng string rỗng hay "N/A"
4. **Boolean cho yes/no**: true/false, không dùng string "Có"/"Không"
5. **Array cho multi-value**: `ai_features: ["human_detect", "motion_detect"]`

---

## Nhóm 1: CAMERA (IP / Wifi / PTZ)

```json
{
  // ── Nhận dạng ──
  "specs": {
    "resolution":    { "value": 3, "unit": "MP" },
    "sensor":        "1/2.8\" CMOS",
    "lens":          { "focal": 3.6, "unit": "mm", "angle_h": 83, "angle_v": null },
    "ir_range":      { "value": 10, "unit": "m" },
    "hdr":           true,
    "min_illumination": "0.1 Lux",

    // ── Cơ học ──
    "ptz":           { "pan": 355, "tilt": 90 },
    "protection":    "IP67",                // null = indoor
    "material":      "plastic",             // plastic | metal
    "mounting":      ["ceiling", "wall"],   // ceiling | wall | desk | magnetic

    // ── Âm thanh ──
    "audio":         "2way",                // 2way | 1way | mic_only | none
    "alarm_siren":   true,

    // ── Kết nối ──
    "wifi":          "802.11b/g/n",         // null nếu không có
    "wifi_band":     "2.4GHz",              // 2.4GHz | 5GHz | dual
    "ethernet":      true,
    "bluetooth":     false,
    "onvif":         true,
    "rtsp":          true,
    "cloud":         "imou_protect",        // tên cloud service, null nếu ko có
    "soft_ap":       true,

    // ── Lưu trữ ──
    "storage": [
      { "type": "microSD", "max": 256, "unit": "GB" }
    ],

    // ── AI / Thông minh ──
    "ai_features":   ["human_detect", "motion_detect", "sound_detect", "smart_tracking"],
    "privacy_mode":  true,

    // ── Nguồn ──
    "power":         "DC 5V",
    "poe":           false,
    "power_consumption": { "value": 5, "unit": "W" },

    // ── Kích thước / Khối lượng ──
    "dimensions":    { "w": 80, "h": 110, "d": 80, "unit": "mm" },
    "weight":        { "value": 200, "unit": "g" },

    // ── Tương thích ──
    "compatible_nvr":  ["Dahua XVR5108", "IMOU NVR1104"],
    "compatible_app":  ["Imou Life", "DMSS"],

    // ── Nhiệt độ hoạt động ──
    "operating_temp": { "min": -10, "max": 50, "unit": "°C" }
  },

  // ── Ảnh sản phẩm ──
  "images": [
    "https://cdn.vuhoangtelecom.vn/xxx/a32-front.jpg",
    "https://cdn.vuhoangtelecom.vn/xxx/a32-back.jpg"
  ],

  // ── Meta ──
  "specs_updated_at": "2026-06-05"
}
```

## Nhóm 2: Ổ CỨNG / THẺ NHỚ (dự kiến)

```json
{
  "specs": {
    "capacity":      { "value": 1, "unit": "TB" },
    "type":          "SSD",                 // SSD | HDD | NVMe
    "form_factor":   "2.5\"",               // 2.5" | 3.5" | M.2 2280
    "interface":     "SATA3",               // SATA3 | NVMe PCIe 3.0 x4
    "read_speed":    { "value": 550, "unit": "MB/s" },
    "write_speed":   { "value": 520, "unit": "MB/s" },
    "rpm":           null,                  // chỉ cho HDD
    "cache":         { "value": 64, "unit": "MB" },
    "mtbf":          { "value": 1.5, "unit": "million_hours" }
  }
}
```

## Nhóm 3: SWITCH / ROUTER (dự kiến)

```json
{
  "specs": {
    "ports":         8,
    "speed":         "10/100/1000Mbps",
    "poe":           true,
    "poe_budget":    { "value": 65, "unit": "W" },
    "managed":       false,
    "vlan":          false,
    "uplink":        "2x SFP",
    "switching_capacity": { "value": 16, "unit": "Gbps" }
  }
}
```

---

## Migration Plan (từ Product model hiện tại)

Hiện tại model Product có các field:

```
code, name, brand, group, prices, costPrice, description, imageUrl, tags, category, status
```

Cần thêm:

```
specs       : Mixed (Object) — chứa schema như trên, theo nhóm sản phẩm
images      : [String]      — danh sách URL ảnh sản phẩm
specs_updated_at : Date     — thời điểm cập nhật specs gần nhất
```

Không cần thêm `specs_source` vì mình tự update web mình, không cần trace nguồn.

## Mapping khi scrape

Khi scrape từ site ngoài (VD: vuhoangtelecom.vn), cần 1 lớp mapping từ text tiếng Việt → schema chuẩn:

| Text gốc (VN)                  | Field                    | Transform                     |
|-------------------------------|--------------------------|-------------------------------|
| "Độ phân giải 3MP"            | specs.resolution         | parse "3MP" → {value:3, unit:"MP"} |
| "Cảm biến 1/2.8\" CMOS"      | specs.sensor             | giữ nguyên string              |
| "Ống kính 3.6mm"              | specs.lens.focal         | parse "3.6mm" → 3.6           |
| "Tầm xa hồng ngoại 10m"      | specs.ir_range           | parse "10m" → {value:10, unit:"m"} |
| "Quay ngang 355°, dọc 90°"   | specs.ptz                | parse góc                      |
| "Đàm thoại 2 chiều"          | specs.audio              | → "2way"                      |
| "Khe thẻ MicroSD 256GB"      | specs.storage            | → [{type:"microSD", max:256, unit:"GB"}] |
| "Chống nước IP67"            | specs.protection         | → "IP67"                      |
| "Phát hiện con người"        | specs.ai_features        | push "human_detect"           |
| "WiFi 802.11b/g/n"           | specs.wifi               | → "802.11b/g/n"               |
| "Nguồn DC 5V"                | specs.power              | → "DC 5V"                     |
| "HDR / Chống ngược sáng"     | specs.hdr                | → true                        |

Các giá trị không parse được → null (bỏ qua), không ép.
