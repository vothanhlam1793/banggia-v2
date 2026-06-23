'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { apiRequest } from '@/lib/api';
import {
  TextInput, Badge, Table, Text, Group, Title, Card, Anchor, Modal, Stack, Image, Divider,
  SimpleGrid, Container, Button,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { IconSearch, IconPackage, IconCopy, IconCheck } from '@tabler/icons-react';

function fmt(n: number | null | undefined) {
  if (n == null) return '0đ';
  return n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.') + 'đ';
}

const PRICE_LABELS: Record<string, string> = {
  L0: 'Sỉ lớn', L1: 'Sỉ vừa', L2: 'Sỉ nhỏ', L3: 'Bán buôn', L4: 'Bán lẻ',
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

function renderStructuredSpecs(specs: Record<string, any>) {
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

export default function HomePage() {
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [activeTag, setActiveTag] = useState('');
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [modalOpened, { open: openModal, close: closeModal }] = useDisclosure(false);
  const [copied, setCopied] = useState(false);

  const PAGE_SIZE = 200;

  useEffect(() => {
    let cancelled = false;

    async function loadAll() {
      const first = await apiRequest<any>('GET', '/products', {
        isPublic: true, status: 'ACTIVE', limit: PAGE_SIZE, page: 1,
      }, { raw: true });

      if (cancelled) return;

      const total = first.pagination?.total || 0;
      let all: any[] = first.data || [];
      const totalPages = first.pagination?.totalPages || 1;

      if (totalPages > 1) {
        const batch = [];
        for (let p = 2; p <= totalPages; p++) {
          batch.push(
            apiRequest<any>('GET', '/products', {
              isPublic: true, status: 'ACTIVE', limit: PAGE_SIZE, page: p,
            }, { raw: true })
          );
        }
        const results = await Promise.all(batch);
        for (const r of results) {
          if (cancelled) return;
          all = [...all, ...(r.data || [])];
        }
      }

      if (!cancelled) {
        setProducts(all);
        setLoading(false);
      }
    }

    loadAll().catch(e => {
      if (!cancelled) {
        setError(e.message || 'Lỗi tải dữ liệu');
        setLoading(false);
      }
    });

    return () => { cancelled = true; };
  }, []);

  const allTags = useMemo(() => {
    const ts = new Set<string>();
    products.forEach(p => (p.tags || []).forEach((t: string) => ts.add(t)));
    return [...ts].sort();
  }, [products]);

  const filtered = useMemo(() => {
    let result = products;
    if (activeTag) result = result.filter(p => (p.tags || []).includes(activeTag));
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      result = result.filter((p: any) =>
        [p.name, p.code, p.group, p.brand].filter(Boolean).some((s: string) => s.toLowerCase().includes(q))
      );
    }
    return result;
  }, [products, search, activeTag]);

  const groups = useMemo(() => {
    const map = new Map<string, any[]>();
    for (const p of filtered) {
      const g = p.group || 'Khác';
      if (!map.has(g)) map.set(g, []);
      map.get(g)!.push(p);
    }
    return [...map.entries()].sort((a, b) => b[1].length - a[1].length || a[0].localeCompare(b[0]));
  }, [filtered]);

  const displayPrice = (prices: any) => {
    if (!prices) return '0đ';
    return fmt(prices['L4'] || prices['L3'] || prices['L2'] || prices['L1'] || prices['L0'] || 0);
  };

  function handleProductClick(p: any) {
    setSelectedProduct(p);
    openModal();
  }

  function handleCopy() {
    if (!selectedProduct?.code) return;
    const url = `https://banggia.besen.vn/${selectedProduct.code}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }).catch(() => {});
  }

  return (
    <Container fluid px={{ base: 'sm', sm: 'lg' }} py="md">
      {/* Header */}
      <Group mb="lg" pb="sm" style={{ borderBottom: '1px solid var(--mantine-color-gray-3)' }}>
        <Anchor component={Link} href="/" c="blue" fw={500}>Bảng giá</Anchor>
        <Anchor href="https://nlmt.creta.vn" target="_blank" c="dimmed">Đèn NLMT</Anchor>
        <Anchor component={Link} href="/info" c="dimmed">Liên hệ mua hàng</Anchor>
        <Text ml="auto" size="sm" c="dimmed">
          {filtered.length.toLocaleString()} sản phẩm
        </Text>
      </Group>

      {error && <Text c="red" size="sm" mb="md">{error}</Text>}

      {/* Search */}
      <TextInput
        value={search}
        onChange={e => setSearch(e.currentTarget.value)}
        placeholder="Nhập tên, mã hoặc hãng sản phẩm..."
        leftSection={<IconSearch size={18} />}
        size="lg"
        mb="md"
      />

      {/* Tags filter */}
      {allTags.length > 0 && (
        <Group gap={4} mb="lg">
          <Badge
            variant={!activeTag ? 'filled' : 'light'}
            color={!activeTag ? 'blue' : 'gray'}
            style={{ cursor: 'pointer' }}
            onClick={() => setActiveTag('')}
            size="lg"
          >
            Tất cả
          </Badge>
          {allTags.map(tag => (
            <Badge
              key={tag}
              variant={tag === activeTag ? 'filled' : 'light'}
              color={tag === activeTag ? 'blue' : 'gray'}
              style={{ cursor: 'pointer' }}
              onClick={() => setActiveTag(tag === activeTag ? '' : tag)}
              size="lg"
            >
              {tag}
            </Badge>
          ))}
        </Group>
      )}

      {loading && (
        <Card withBorder shadow="sm" padding={0}>
          <Table verticalSpacing="sm">
            <Table.Thead>
              <Table.Tr>
                <Table.Th w={60}></Table.Th>
                <Table.Th>Tên sản phẩm</Table.Th>
                <Table.Th ta="right" w={150}>Giá</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {Array.from({ length: 5 }).map((_, i) => (
                <Table.Tr key={i}>
                  <Table.Td><div style={{ width: 48, height: 48, borderRadius: 4, background: 'var(--mantine-color-gray-3)' }} /></Table.Td>
                  <Table.Td>
                    <div style={{ height: 16, width: '60%', background: 'var(--mantine-color-gray-3)', borderRadius: 4, marginBottom: 8 }} />
                    <div style={{ height: 12, width: '30%', background: 'var(--mantine-color-gray-2)', borderRadius: 4 }} />
                  </Table.Td>
                  <Table.Td ta="right"><div style={{ height: 16, width: 80, background: 'var(--mantine-color-gray-3)', borderRadius: 4, marginLeft: 'auto' }} /></Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        </Card>
      )}

      {/* Product groups */}
          {!loading && groups.map(([group, items]) => (
        <div key={group} style={{ marginBottom: '2rem' }}>
          <Group mb="sm">
            <Title order={3}>{group}</Title>
            <Badge variant="light" color="gray" size="lg">{items.length}</Badge>
          </Group>

          <Card withBorder shadow="sm" padding={0}>
            <div style={{ overflowX: 'auto' }}>
            <Table verticalSpacing="sm" highlightOnHover>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th w={60}></Table.Th>
                  <Table.Th>Tên sản phẩm</Table.Th>
                  <Table.Th ta="right" w={150}>Giá</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {items.map((p: any) => (
                  <Table.Tr
                    key={p._id || p.id}
                    onClick={() => handleProductClick(p)}
                    style={{ cursor: 'pointer' }}
                  >
                    <Table.Td>
                      {p.imageUrl ? (
                        <Image
                          src={p.imageUrl}
                          alt={p.name}
                          w={48}
                          h={48}
                          radius="sm"
                          fit="cover"
                          fallbackSrc="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='48' height='48' viewBox='0 0 48 48'%3E%3Crect fill='%23f1f3f5' width='48' height='48'/%3E%3Ctext x='24' y='30' text-anchor='middle' fill='%23adb5bd' font-size='20'%3E📦%3C/text%3E%3C/svg%3E"
                        />
                      ) : (
                        <div style={{
                          width: 48, height: 48, borderRadius: 'var(--mantine-radius-sm)',
                          background: 'var(--mantine-color-gray-1)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}>
                          <IconPackage size={24} color="var(--mantine-color-gray-5)" />
                        </div>
                      )}
                    </Table.Td>
                    <Table.Td>
                      <Text fw={500}>{p.name}</Text>
                      <Group gap="xs" mt={4}>
                        {p.brand && <Text size="xs" c="dimmed">{p.brand}</Text>}
                        {p.code && <Text size="xs" c="dimmed" ff="monospace">({p.code})</Text>}
                      </Group>
                      {(p.tags || []).length > 0 && (
                        <Group gap={4} mt={4}>
                          {p.tags.map((t: string) => (
                            <Badge key={t} variant="light" color={t === 'khuyen-mai' ? 'red' : 'gray'} size="xs">{t}</Badge>
                          ))}
                        </Group>
                      )}
                      {p.campaigns && p.campaigns.length > 0 && (
                        <Group gap={4} mt={4}>
                          {p.campaigns.map((c: any) => (
                            <Badge key={c._id || c.name} variant="light" color="orange" size="xs">
                              {c.name}
                            </Badge>
                          ))}
                        </Group>
                      )}
                    </Table.Td>
                    <Table.Td ta="right">
                      <Text fw={600} size="sm" c="blue">{displayPrice(p.prices)}</Text>
                    </Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
            </div>
          </Card>
        </div>
      ))}

      {!loading && filtered.length === 0 && !error && (
        <Text ta="center" py="xl" c="dimmed">Không tìm thấy sản phẩm</Text>
      )}

      {/* Product Detail Modal */}
      <Modal
        opened={modalOpened}
        onClose={closeModal}
        title={selectedProduct?.name}
        size="lg"
        centered
      >
        {selectedProduct && (
          <Stack gap="md">
            {/* Gallery */}
            {(() => {
              const allImages = (selectedProduct.images && selectedProduct.images.length > 0)
                ? selectedProduct.images
                : selectedProduct.imageUrl ? [selectedProduct.imageUrl] : [];

              if (allImages.length === 0) {
                return (
                  <div style={{
                    height: 200, borderRadius: 'var(--mantine-radius-md)',
                    background: 'var(--mantine-color-gray-1)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <IconPackage size={64} color="var(--mantine-color-gray-5)" />
                  </div>
                );
              }

              return (
                <Stack gap="sm">
                  {/* Main image */}
                  <Image
                    src={allImages[0]}
                    alt={selectedProduct.name}
                    height={250}
                    fit="contain"
                    radius="md"
                    fallbackSrc="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='250' viewBox='0 0 400 250'%3E%3Crect fill='%23f1f3f5' width='400' height='250'/%3E%3Ctext x='200' y='135' text-anchor='middle' fill='%23adb5bd' font-size='48'%3E📦%3C/text%3E%3C/svg%3E"
                    id="main-gallery-img"
                  />
                  {/* Thumbnails */}
                  {allImages.length > 1 && (
                    <Group gap="xs" style={{ overflowX: 'auto', flexWrap: 'nowrap' }}>
                      {allImages.map((url: string, idx: number) => (
                        <Image
                          key={idx}
                          src={url}
                          alt={`${selectedProduct.name} ${idx + 1}`}
                          w={60}
                          h={60}
                          radius="sm"
                          fit="cover"
                          style={{ cursor: 'pointer', border: idx === 0 ? '2px solid var(--mantine-color-blue-5)' : '2px solid transparent', flexShrink: 0 }}
                          onClick={() => {
                            const main = document.getElementById('main-gallery-img') as HTMLImageElement;
                            if (main) main.src = url;
                            // highlight selected
                            const thumbs = document.querySelectorAll('[data-gallery-thumb]');
                            thumbs.forEach((t, i) => {
                              (t as HTMLElement).style.border = i === idx ? '2px solid var(--mantine-color-blue-5)' : '2px solid transparent';
                            });
                          }}
                          data-gallery-thumb
                          fallbackSrc="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='60' height='60' viewBox='0 0 60 60'%3E%3Crect fill='%23f1f3f5' width='60' height='60'/%3E%3Ctext x='30' y='38' text-anchor='middle' fill='%23adb5bd' font-size='20'%3E📷%3C/text%3E%3C/svg%3E"
                        />
                      ))}
                    </Group>
                  )}
                </Stack>
              );
            })()}

            {/* Meta info */}
            <Card withBorder>
              <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="sm">
                <div>
                  <Text size="xs" c="dimmed">Mã sản phẩm</Text>
                  <Text ff="monospace" fw={500}>{selectedProduct.code}</Text>
                </div>
                <div>
                  <Text size="xs" c="dimmed">Hãng</Text>
                  <Text fw={500}>{selectedProduct.brand || '—'}</Text>
                </div>
                <div>
                  <Text size="xs" c="dimmed">Nhóm</Text>
                  <Text fw={500}>{selectedProduct.group || '—'}</Text>
                </div>
                <div>
                  <Text size="xs" c="dimmed">Danh mục</Text>
                  <Text fw={500}>{selectedProduct.category || '—'}</Text>
                </div>
              </SimpleGrid>
            </Card>

            {/* Prices */}
            {selectedProduct.prices && Object.keys(selectedProduct.prices).length > 0 && (
              <Card withBorder>
                <Text fw={600} mb="sm">Bảng giá</Text>
                <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="sm">
                  {Object.entries(selectedProduct.prices).map(([level, price]) => (
                    <Group key={level} justify="space-between">
                      <Text size="sm" c="dimmed">
                        {PRICE_LABELS[level] || level}
                      </Text>
                      <Text fw={600} c="blue">{fmt(price as number)}</Text>
                    </Group>
                  ))}
                </SimpleGrid>
              </Card>
            )}

            {/* Description */}
            {selectedProduct.description && (
              <Card withBorder>
                <Text fw={600} mb="xs">Mô tả</Text>
                <Text size="sm" style={{ whiteSpace: 'pre-wrap' }}>{selectedProduct.description}</Text>
              </Card>
            )}

            {/* Structured Specs */}
            {renderStructuredSpecs(selectedProduct.specs)}

            {/* Campaigns */}
            {selectedProduct.campaigns && selectedProduct.campaigns.length > 0 && (
              <Card withBorder>
                <Text fw={600} mb="xs">Chương trình</Text>
                <Group gap={8} wrap="wrap">
                  {selectedProduct.campaigns.map((c: any) => (
                    <div key={c._id || c.name} style={{
                      display: 'inline-flex', flexDirection: 'column', gap: '4px',
                      background: 'var(--mantine-color-orange-0)', borderRadius: '8px',
                      padding: '8px 14px', border: '1px solid var(--mantine-color-orange-2)',
                    }}>
                      <Text fw={600} size="sm" c="orange">{c.name}</Text>
                      {c.targetCustomer && <Text size="xs" c="dimmed">KH: {c.targetCustomer}</Text>}
                      {c.targetMargin != null && <Text size="xs" c="dimmed">Margin: {c.targetMargin}%</Text>}
                      {c.note && <Text size="xs" c="dimmed">{c.note}</Text>}
                    </div>
                  ))}
                </Group>
              </Card>
            )}

            {/* Tags */}
            {(selectedProduct.tags || []).length > 0 && (
              <Group gap={4}>
                {(selectedProduct.tags || []).map((t: string) => (
                  <Badge key={t} variant="light" color={t === 'khuyen-mai' ? 'red' : 'gray'}>{t}</Badge>
                ))}
              </Group>
            )}

            {/* Copy link */}
            <Button
              variant="light"
              color={copied ? 'green' : 'gray'}
              size="sm"
              leftSection={copied ? <IconCheck size={14} /> : <IconCopy size={14} />}
              onClick={handleCopy}
              fullWidth
            >
              {copied ? 'Đã copy link' : 'Sao chép link sản phẩm'}
            </Button>
          </Stack>
        )}
      </Modal>
    </Container>
  );
}
