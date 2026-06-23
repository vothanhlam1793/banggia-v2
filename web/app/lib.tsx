'use client';

import { Card, Text, Group } from '@mantine/core';

export function fmt(n: number | null | undefined) {
  if (n == null) return '0đ';
  return n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.') + 'đ';
}

export const PRICE_LABELS: Record<string, string> = {
  L0: 'Sỉ lớn', L1: 'Sỉ vừa', L2: 'Sỉ nhỏ', L3: 'Bán buôn', L4: 'Bán lẻ', L5: 'Tham khảo',
};

export const SPEC_FIELDS: { key: string; label: string; render: (v: any) => string }[] = [
  { key: 'resolution', label: 'Độ phân giải', render: (v: any) => `${v.value} ${v.unit || 'MP'}` },
  { key: 'lens', label: 'Ống kính', render: (v: any) => `${v.focal}${v.unit || 'mm'}` },
  { key: 'ir_range', label: 'Tầm xa hồng ngoại', render: (v: any) => `${v.value}${v.unit || 'm'}` },
  { key: 'protection', label: 'Chuẩn chống nước', render: (v: any) => v },
  { key: 'hdr', label: 'Chống ngược sáng', render: () => 'WDR' },
  { key: 'sensor', label: 'Cảm biến', render: (v: any) => v },
  { key: 'compression', label: 'Chuẩn nén', render: (v: any) => Array.isArray(v) ? v.join(', ') : v },
  { key: 'storage', label: 'Lưu trữ', render: (v: any) => Array.isArray(v) ? v.map((s: any) => `Micro SD ${s.max}${s.unit}`).join(', ') : '' },
  { key: 'audio', label: 'Âm thanh', render: (v: any) => v === '2way' ? 'Đàm thoại 2 chiều' : 'Tích hợp mic' },
  { key: 'ai_features', label: 'Tính năng AI', render: (v: any) => {
    const labels: Record<string, string> = {
      face_detect: 'Nhận diện khuôn mặt', human_detect: 'Phát hiện con người',
      motion_detect: 'Phát hiện chuyển động', sound_detect: 'Phát hiện âm thanh',
      smart_tracking: 'Theo dõi đối tượng', ivs: 'Hàng rào ảo / IVS',
    };
    return Array.isArray(v) ? v.map((f: string) => labels[f] || f).join(', ') : '';
  }},
  { key: 'power', label: 'Nguồn', render: (v: any) => v },
  { key: 'poe', label: 'PoE', render: () => 'Có' },
  { key: 'power_consumption', label: 'Công suất', render: (v: any) => `${v.value}${v.unit || 'W'}` },
  { key: 'wifi', label: 'WiFi', render: (v: any) => 'Có' },
  { key: 'ports', label: 'Cổng', render: (v: any) => `${v.total || v} cổng` },
  { key: 'dimensions', label: 'Kích thước', render: (v: any) => `${v.w}×${v.h}×${v.d} ${v.unit || 'mm'}` },
  { key: 'weight', label: 'Trọng lượng', render: (v: any) => `${v.value}${v.unit}` },
  { key: 'operating_temp', label: 'Nhiệt độ hoạt động', render: (v: any) => `${v.min}°C ~ ${v.max}°C` },
];

export function renderStructuredSpecs(specs: Record<string, any>) {
  if (!specs) return null;
  const rows = SPEC_FIELDS.filter(f => specs[f.key] != null && specs[f.key] !== '');
  if (rows.length === 0) return null;
  return (
    <Card withBorder>
      <Text fw={600} mb="sm">Thông số kỹ thuật</Text>
      <Group gap={8} wrap="wrap">
        {rows.map(f => (
          <div key={f.key} style={{
            display: 'inline-flex', alignItems: 'center', gap: '6px',
            background: 'var(--mantine-color-gray-0)', borderRadius: '6px',
            padding: '6px 12px', border: '1px solid var(--mantine-color-gray-3)',
            fontSize: '13px',
          }}>
            <Text span size="xs" c="dimmed" fw={500}>{f.label}</Text>
            <Text span size="sm" fw={600}>{f.render(specs[f.key])}</Text>
          </div>
        ))}
      </Group>
    </Card>
  );
}
