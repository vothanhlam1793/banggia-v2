'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { apiRequest } from '@/lib/api';
import {
  Container, Image, Card, Text, Group, Badge, Stack, SimpleGrid, Anchor, Button,
} from '@mantine/core';
import { IconArrowLeft, IconCopy, IconPackage, IconCheck } from '@tabler/icons-react';

function fmt(n: number | null | undefined) {
  if (n == null) return '—';
  return n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.') + 'đ';
}

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
      people_counting: 'Đếm người', privacy_mode: 'Chế độ riêng tư',
      active_deterrent: 'Cảnh báo chủ động',
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

export default function ProductDetailPage() {
  const { code } = useParams<{ code: string }>();
  const [product, setProduct] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!code) return;
    apiRequest<any>('GET', `/products/${code}`)
      .then(data => {
        setProduct(data);
        setLoading(false);
      })
      .catch(e => {
        setError(e.message || 'Lỗi tải sản phẩm');
        setLoading(false);
      });
  }, [code]);

  function handleCopy() {
    const url = `https://banggia.besen.vn/${code}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }).catch(() => {});
  }

  if (loading) {
    return (
      <Container fluid px="lg" py="xl">
        <Text ta="center" c="dimmed">Đang tải...</Text>
      </Container>
    );
  }

  if (error || !product) {
    return (
      <Container fluid px="lg" py="xl">
        <Text ta="center" c="red">{error || 'Không tìm thấy sản phẩm'}</Text>
        <Anchor component={Link} href="/" size="sm" ta="center" display="block" mt="md">
          ← Về bảng giá
        </Anchor>
      </Container>
    );
  }

  const allImages = (product.images && product.images.length > 0)
    ? product.images
    : product.imageUrl ? [product.imageUrl] : [];

  const specRows = SPEC_FIELDS.filter(f => product.specs && product.specs[f.key] != null && product.specs[f.key] !== '');

  return (
    <Container fluid px="lg" py="md">
      {/* Header */}
      <Group mb="md" pb="sm" style={{ borderBottom: '1px solid var(--mantine-color-gray-3)' }}>
        <Anchor component={Link} href="/" c="dimmed">
          <Group gap={4}>
            <IconArrowLeft size={14} /> Bảng giá
          </Group>
        </Anchor>
        <Anchor href="https://nlmt.creta.vn" target="_blank" c="dimmed" size="sm">Đèn NLMT</Anchor>
        <Button
          variant="light"
          color={copied ? 'green' : 'gray'}
          size="xs"
          leftSection={copied ? <IconCheck size={14} /> : <IconCopy size={14} />}
          onClick={handleCopy}
          ml="auto"
        >
          {copied ? 'Đã copy' : 'Copy link'}
        </Button>
      </Group>

      <SimpleGrid cols={{ base: 1, md: 12 }} spacing="lg">
        {/* Content area */}
        <Stack gap="lg" style={{ gridColumn: 'span 9' }}>
          {/* Title */}
          <div>
            <Text fw={700} size="xl">{product.name}</Text>
          </div>

          {/* Image + Info row */}
          <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
            {/* Image gallery */}
            <Stack gap="xs">
              {allImages.length > 0 ? (
                <>
                  <Card withBorder padding={0} style={{ overflow: 'hidden' }}>
                    <Image
                      src={allImages[0]}
                      alt={product.name}
                      h={350}
                      fit="contain"
                      fallbackSrc="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='350' viewBox='0 0 400 350'%3E%3Crect fill='%23f1f3f5' width='400' height='350'/%3E%3Ctext x='200' y='185' text-anchor='middle' fill='%23adb5bd' font-size='48'%3E📦%3C/text%3E%3C/svg%3E"
                    />
                  </Card>
                  {allImages.length > 1 && (
                    <Group gap={4} style={{ overflowX: 'auto', flexWrap: 'nowrap' }}>
                      {allImages.map((url: string, idx: number) => (
                        <Image
                          key={idx}
                          src={url}
                          alt={`${product.name} ${idx + 1}`}
                          w={56}
                          h={56}
                          radius="sm"
                          fit="cover"
                          style={{ cursor: 'pointer', flexShrink: 0 }}
                          fallbackSrc="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='56' height='56'%3E%3Crect fill='%23f1f3f5' width='56' height='56'/%3E%3C/svg%3E"
                        />
                      ))}
                    </Group>
                  )}
                </>
              ) : (
                <Card withBorder style={{ height: 350, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <IconPackage size={80} color="var(--mantine-color-gray-4)" />
                </Card>
              )}
            </Stack>

            {/* Price + Meta */}
            <Stack gap="md">
              <Card withBorder>
                <Text size="sm" c="dimmed" mb={4}>Giá bán</Text>
                {(() => {
                  const price = product.prices;
                  if (price?.['L4']) return <Text fw={700} size="xl" c="blue">{fmt(price['L4'])}</Text>;
                  if (price?.['L5']) return (
                    <Group gap="xs">
                      <Badge variant="light" color="orange" size="sm">Tham khảo</Badge>
                      <Text fw={700} size="xl" c="orange">{fmt(price['L5'])}</Text>
                    </Group>
                  );
                  return <Text fw={500} size="lg" c="dimmed">Liên hệ</Text>;
                })()}
              </Card>

              <Card withBorder>
                <SimpleGrid cols={2} spacing="sm">
                  <div>
                    <Text size="xs" c="dimmed">Mã sản phẩm</Text>
                    <Text ff="monospace" fw={500} size="sm">{product.code}</Text>
                  </div>
                  <div>
                    <Text size="xs" c="dimmed">Hãng</Text>
                    <Text fw={500} size="sm">{product.brand || '—'}</Text>
                  </div>
                  <div>
                    <Text size="xs" c="dimmed">Nhóm</Text>
                    <Text fw={500} size="sm">{product.group || '—'}</Text>
                  </div>
                  <div>
                    <Text size="xs" c="dimmed">Danh mục</Text>
                    <Text fw={500} size="sm">{product.category || '—'}</Text>
                  </div>
                </SimpleGrid>
              </Card>

              {/* Campaign badges */}
              {product.campaigns && product.campaigns.length > 0 && (
                <Card withBorder>
                  <Text size="xs" c="dimmed" mb="xs">Chương trình</Text>
                  <Group gap={8} wrap="wrap">
                    {product.campaigns.map((c: any) => (
                      <div key={c._id || c.name} style={{
                        display: 'inline-flex', flexDirection: 'column', gap: '2px',
                        background: 'var(--mantine-color-orange-0)', borderRadius: '8px',
                        padding: '6px 12px', border: '1px solid var(--mantine-color-orange-2)',
                      }}>
                        <Text fw={600} size="sm" c="orange">{c.name}</Text>
                        {c.targetCustomer && <Text size="xs" c="dimmed">KH: {c.targetCustomer}</Text>}
                        {c.note && <Text size="xs" c="dimmed">{c.note}</Text>}
                      </div>
                    ))}
                  </Group>
                </Card>
              )}

              {/* Tags */}
              {(product.tags || []).length > 0 && (
                <Group gap={4}>
                  {(product.tags || []).map((t: string) => (
                    <Badge key={t} variant="light" color="gray" size="sm">{t}</Badge>
                  ))}
                </Group>
              )}
            </Stack>
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
        </Stack>

        {/* Sidebar — để trống cho tương lai */}
        <div style={{ gridColumn: 'span 3' }} />
      </SimpleGrid>
    </Container>
  );
}
