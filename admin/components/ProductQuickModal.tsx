'use client';

import Link from 'next/link';
import {
  Modal, Image, Card, Text, Group, Badge, Stack, SimpleGrid, Anchor,
} from '@mantine/core';
import { IconPackage, IconArrowRight } from '@tabler/icons-react';

const PRICE_LABELS: Record<string, string> = {
  L0: 'L0', L1: 'L1', L2: 'L2', L3: 'L3', L4: 'L4',
};

const SPEC_FIELDS: { key: string; label: string; render: (v: any) => string }[] = [
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
      people_counting: 'Đếm người', abandoned_object: 'Phát hiện đồ bỏ quên',
      scene_change: 'Phát hiện thay đổi hiện trường', privacy_mode: 'Chế độ riêng tư',
      anpr: 'Nhận diện biển số', smd_plus: 'SMD Plus', active_deterrent: 'Cảnh báo chủ động',
    };
    return Array.isArray(v) ? v.map((f: string) => labels[f] || f).join(', ') : '';
  }},
  { key: 'power', label: 'Nguồn', render: (v: any) => v },
  { key: 'poe', label: 'PoE', render: () => 'Có' },
  { key: 'power_consumption', label: 'Công suất', render: (v: any) => `${v.value}${v.unit || 'W'}` },
  { key: 'wifi', label: 'WiFi', render: () => 'Có' },
  { key: 'ports', label: 'Cổng', render: (v: any) => `${v.total || v} cổng` },
  { key: 'poe_budget', label: 'PoE Budget', render: (v: any) => `${v.value}${v.unit || 'W'}` },
  { key: 'dimensions', label: 'Kích thước', render: (v: any) => `${v.w}×${v.h}×${v.d} ${v.unit || 'mm'}` },
  { key: 'weight', label: 'Trọng lượng', render: (v: any) => `${v.value}${v.unit}` },
  { key: 'operating_temp', label: 'Nhiệt độ hoạt động', render: (v: any) => `${v.min}°C ~ ${v.max}°C` },
];

function fmt(n: number | null | undefined) {
  if (n == null) return '—';
  return n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.') + 'đ';
}

type Props = {
  product: any | null;
  opened: boolean;
  onClose: () => void;
};

export default function ProductQuickModal({ product, opened, onClose }: Props) {
  if (!product) return null;

  const allImages = (product.images && product.images.length > 0)
    ? product.images
    : product.imageUrl ? [product.imageUrl] : [];

  const specRows = SPEC_FIELDS.filter(f => product.specs && product.specs[f.key] != null && product.specs[f.key] !== '');

  return (
    <Modal opened={opened} onClose={onClose} size="xl" centered>
      <Stack gap="md">
        {/* Header */}
        <div>
          <Text fw={700} size="lg">{product.name}</Text>
          <Group gap="xs" mt={4}>
            <Text size="sm" c="dimmed" ff="monospace">{product.code}</Text>
            {product.brand && <Badge variant="light" color="gray" size="sm">{product.brand}</Badge>}
            {product.group && <Badge variant="light" color="blue" size="sm">{product.group}</Badge>}
          </Group>
        </div>

        {/* Row 1: Image + Price */}
        <SimpleGrid cols={2} spacing="md">
          {/* Image gallery */}
          <Stack gap="xs">
            {allImages.length > 0 ? (
              <>
                <Image
                  src={allImages[0]}
                  alt={product.name}
                  h={200}
                  fit="contain"
                  radius="md"
                  fallbackSrc="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='200' viewBox='0 0 300 200'%3E%3Crect fill='%23f1f3f5' width='300' height='200'/%3E%3Ctext x='150' y='110' text-anchor='middle' fill='%23adb5bd' font-size='48'%3E📦%3C/text%3E%3C/svg%3E"
                />
                {allImages.length > 1 && (
                  <Group gap={4} style={{ overflowX: 'auto', flexWrap: 'nowrap' }}>
                    {allImages.map((url: string, idx: number) => (
                      <Image
                        key={idx}
                        src={url}
                        alt={`${product.name} ${idx + 1}`}
                        w={48}
                        h={48}
                        radius="sm"
                        fit="cover"
                        style={{ cursor: 'pointer', flexShrink: 0 }}
                        fallbackSrc="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='48' height='48'%3E%3Crect fill='%23f1f3f5' width='48' height='48'/%3E%3C/svg%3E"
                      />
                    ))}
                  </Group>
                )}
              </>
            ) : (
              <div style={{
                height: 200, borderRadius: 'var(--mantine-radius-md)',
                background: 'var(--mantine-color-gray-1)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <IconPackage size={64} color="var(--mantine-color-gray-5)" />
              </div>
            )}
          </Stack>

          {/* Price table */}
          <Card withBorder>
            <Text fw={600} mb="sm">Bảng giá</Text>
            <SimpleGrid cols={2} spacing="xs">
              {Object.keys(PRICE_LABELS).map(level => {
                const price = product.prices?.[level];
                return (
                  <Group key={level} justify="space-between" wrap="nowrap">
                    <Text size="sm" c="dimmed">{PRICE_LABELS[level]}</Text>
                    <Text size="sm" fw={600} c={price ? 'blue' : 'dimmed'}>
                      {fmt(price)}
                    </Text>
                  </Group>
                );
              })}
            </SimpleGrid>
            {product.costPrice > 0 && (
              <Group justify="space-between" mt="sm" pt="sm" style={{ borderTop: '1px solid var(--mantine-color-gray-2)' }}>
                <Text size="sm" c="dimmed">Giá vốn</Text>
                <Text size="sm" fw={600} c="orange">{fmt(product.costPrice)}</Text>
              </Group>
            )}
          </Card>
        </SimpleGrid>

        {/* Specs */}
        {specRows.length > 0 && (
          <Card withBorder>
            <Text fw={600} mb="sm">Thông số kỹ thuật</Text>
            <Group gap={8} wrap="wrap">
              {specRows.map(f => (
                <div key={f.key} style={{
                  display: 'inline-flex', alignItems: 'center', gap: '6px',
                  background: 'var(--mantine-color-gray-0)', borderRadius: '6px',
                  padding: '6px 12px', border: '1px solid var(--mantine-color-gray-3)',
                  fontSize: '13px',
                }}>
                  <Text span size="xs" c="dimmed" fw={500}>{f.label}</Text>
                  <Text span size="sm" fw={600}>{f.render(product.specs[f.key])}</Text>
                </div>
              ))}
            </Group>
          </Card>
        )}

        {/* Description */}
        {product.description && (
          <Card withBorder>
            <Text fw={600} mb="xs">Mô tả</Text>
            <Text size="sm" style={{ whiteSpace: 'pre-wrap' }}>{product.description}</Text>
          </Card>
        )}

        {/* Footer: Tags + Detail link */}
        <Group justify="space-between" wrap="wrap">
          <Group gap={4}>
            {(product.tags || []).map((t: string) => (
              <Badge key={t} variant="light" color="gray" size="sm">{t}</Badge>
            ))}
          </Group>
          <Anchor
            component={Link}
            href={`/admin/products/${product.code}`}
            size="sm"
            fw={500}
            onClick={onClose}
          >
            <Group gap={4}>
              Xem chi tiết <IconArrowRight size={14} />
            </Group>
          </Anchor>
        </Group>
      </Stack>
    </Modal>
  );
}
