'use client';

import { useState, useEffect, useMemo, useCallback, memo, useRef } from 'react';
import Link from 'next/link';
import { apiRequest } from '@/lib/api';
import {
  TextInput, Badge, Table, Text, Group, Title, Card, Anchor, Container,
} from '@mantine/core';
import { IconSearch, IconPackage } from '@tabler/icons-react';
import { fmt } from './lib';
import { openModal } from './ProductModal';

const displayPrice = (prices: any) => {
  if (!prices) return { label: '', value: 'Liên hệ', color: 'dimmed' as const };
  if (prices['L4']) return { label: '', value: fmt(prices['L4']), color: 'blue' as const };
  if (prices['L5']) return { label: 'Tham khảo', value: fmt(prices['L5']), color: 'orange' as const };
  return { label: '', value: 'Liên hệ', color: 'dimmed' as const };
};

const ProductRow = memo(({ p, onSelect }: { p: any; onSelect: (p: any) => void }) => {
  const dp = displayPrice(p.prices);
  return (
    <Table.Tr onClick={() => onSelect(p)} style={{ cursor: 'pointer' }}>
      <Table.Td>
        {p.imageUrl ? (
          <img src={p.imageUrl} alt={p.name || ''} width={48} height={48} loading="lazy"
            style={{ borderRadius: 'var(--mantine-radius-sm)', objectFit: 'cover', display: 'block' }}
            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
          />
        ) : null}
        {!p.imageUrl && (
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
        <Group gap={4} justify="flex-end" wrap="nowrap">
          {dp.label && <Badge variant="light" color={dp.color} size="xs">{dp.label}</Badge>}
          <Text fw={600} size="sm" c={dp.color}>{dp.value}</Text>
        </Group>
      </Table.Td>
    </Table.Tr>
  );
});
ProductRow.displayName = 'ProductRow';

function LazyGroup({ group, items, onSelect }: { group: string; items: any[]; onSelect: (p: any) => void }) {
  const [visible, setVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setVisible(true); },
      { rootMargin: '400px' },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={ref} style={{ marginBottom: '2rem' }}>
      <Group mb="sm">
        <Title order={3}>{group}</Title>
        <Badge variant="light" color="gray" size="lg">{items.length}</Badge>
      </Group>
      {visible && (
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
                <ProductRow key={p._id || p.id} p={p} onSelect={onSelect} />
              ))}
            </Table.Tbody>
          </Table>
          </div>
        </Card>
      )}
    </div>
  );
}

export default function HomePage() {
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [activeTag, setActiveTag] = useState('');

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

  const handleProductClick = useCallback((p: any) => {
    openModal(p);
  }, []);

  const searchActive = search.trim().length > 0;

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

      {/* Search + tags — sticky */}
      <div style={{ position: 'sticky', top: 0, zIndex: 10, background: 'var(--mantine-color-gray-0)', paddingBottom: '8px' }}>
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
      </div>

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

      {/* Search results — always on top when searching */}
      {!loading && searchActive && filtered.length > 0 && (
        <div style={{ marginBottom: '2rem' }}>
          <Group mb="sm">
            <Title order={3}>Kết quả: {filtered.length} sản phẩm</Title>
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
                {filtered.slice(0, 200).map((p: any) => (
                  <ProductRow key={p._id || p.id} p={p} onSelect={handleProductClick} />
                ))}
                {filtered.length > 200 && (
                  <Table.Tr>
                    <Table.Td colSpan={3}>
                      <Text size="sm" c="dimmed" ta="center">+ {filtered.length - 200} kết quả khác trong các nhóm bên dưới</Text>
                    </Table.Td>
                  </Table.Tr>
                )}
              </Table.Tbody>
            </Table>
            </div>
          </Card>
        </div>
      )}

      {/* Product groups — lazy render via IntersectionObserver */}
      {!loading && groups.map(([group, items]) => (
        <LazyGroup key={group} group={group} items={items} onSelect={handleProductClick} />
      ))}

      {!loading && filtered.length === 0 && !error && (
        <Text ta="center" py="xl" c="dimmed">Không tìm thấy sản phẩm</Text>
      )}
    </Container>
  );
}
