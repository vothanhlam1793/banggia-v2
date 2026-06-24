import type { SpecValue } from './types'

export const PRICE_LABELS: Record<string, string> = {
  L0: 'Sỉ lớn',
  L1: 'Sỉ vừa',
  L2: 'Sỉ nhỏ',
  L3: 'Bán buôn',
  L4: 'Bán lẻ',
  L5: 'Tham khảo',
}

export const AI_LABELS: Record<string, string> = {
  face_detect: 'Nhận diện khuôn mặt',
  human_detect: 'Phát hiện con người',
  motion_detect: 'Phát hiện chuyển động',
  sound_detect: 'Phát hiện âm thanh',
  smart_tracking: 'Theo dõi đối tượng',
  ivs: 'Hàng rào ảo / IVS',
  people_counting: 'Đếm người',
  privacy_mode: 'Chế độ riêng tư',
  active_deterrent: 'Cảnh báo chủ động',
}

interface SpecField {
  key: string
  label: string
  render: (v: SpecValue) => string
}

export const SPEC_FIELDS: SpecField[] = [
  { key: 'resolution', label: 'Độ phân giải', render: (v) => `${(v as Record<string, unknown>).value} ${(v as Record<string, unknown>).unit || 'MP'}` },
  { key: 'lens', label: 'Ống kính', render: (v) => `${(v as Record<string, unknown>).focal}${(v as Record<string, unknown>).unit || 'mm'}` },
  { key: 'ir_range', label: 'Tầm xa hồng ngoại', render: (v) => `${(v as Record<string, unknown>).value}${(v as Record<string, unknown>).unit || 'm'}` },
  { key: 'protection', label: 'Chuẩn chống nước', render: (v) => String(v) },
  { key: 'hdr', label: 'Chống ngược sáng', render: () => 'WDR' },
  { key: 'sensor', label: 'Cảm biến', render: (v) => String(v) },
  { key: 'compression', label: 'Chuẩn nén', render: (v) => Array.isArray(v) ? v.map(String).join(', ') : String(v) },
  { key: 'storage', label: 'Lưu trữ', render: (v) => Array.isArray(v) ? v.map((s: unknown) => `Micro SD ${(s as Record<string, unknown>).max}${(s as Record<string, unknown>).unit}`).join(', ') : '' },
  {
    key: 'audio', label: 'Âm thanh', render: (v) => v === '2way' ? 'Đàm thoại 2 chiều' : 'Tích hợp mic',
  },
  {
    key: 'ai_features', label: 'Tính năng AI', render: (v) => {
      return Array.isArray(v) ? v.map((f: unknown) => AI_LABELS[f as string] || String(f)).join(', ') : ''
    },
  },
  { key: 'power', label: 'Nguồn', render: (v) => String(v) },
  { key: 'poe', label: 'PoE', render: () => 'Có' },
  { key: 'power_consumption', label: 'Công suất', render: (v) => `${(v as Record<string, unknown>).value}${(v as Record<string, unknown>).unit || 'W'}` },
  { key: 'wifi', label: 'WiFi', render: () => 'Có' },
  { key: 'ports', label: 'Cổng', render: (v) => `${(v as Record<string, unknown>).total || v} cổng` },
  { key: 'poe_budget', label: 'PoE Budget', render: (v) => `${(v as Record<string, unknown>).value}${(v as Record<string, unknown>).unit || 'W'}` },
  { key: 'dimensions', label: 'Kích thước', render: (v) => `${(v as Record<string, unknown>).w}×${(v as Record<string, unknown>).h}×${(v as Record<string, unknown>).d} ${(v as Record<string, unknown>).unit || 'mm'}` },
  { key: 'weight', label: 'Trọng lượng', render: (v) => `${(v as Record<string, unknown>).value}${(v as Record<string, unknown>).unit}` },
  { key: 'operating_temp', label: 'Nhiệt độ hoạt động', render: (v) => `${(v as Record<string, unknown>).min}°C ~ ${(v as Record<string, unknown>).max}°C` },
]
