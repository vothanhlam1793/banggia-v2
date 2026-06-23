'use client';

import { useState, useEffect } from 'react';
import AdminLayout from '@/components/AdminLayout';
import ProductQuickModal from '@/components/ProductQuickModal';
import { apiRequest } from '@/lib/auth';
import {
  Title, TextInput, Table, Card, Group, Text, Switch, Badge,
  Select, MultiSelect,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { notifications } from '@mantine/notifications';
import { IconSearch } from '@tabler/icons-react';

function fmt(n: number | null | undefined) {
  if (n == null) return '';
  return n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.') + 'đ';
}

const PAGE_SIZE = 100;

export default function ActivatePage() {
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'ALL' | 'ACTIVE' | 'PENDING'>('PENDING');
  const [toggling, setToggling] = useState<Set<string>>(new Set());

  const [activeTags, setActiveTags] = useState<string[]>([]);
  const [activeGroup, setActiveGroup] = useState<string | null>(null);
  const [allTags, setAllTags] = useState<{ value: string; label: string }[]>([]);
  const [allGroups, setAllGroups] = useState<{ value: string; label: string }[]>([]);

  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [modalOpened, { open, close }] = useDisclosure(false);

  function handleClick(p: any) {
    setSelectedProduct(p);
    open();
  }

  useEffect(() => {
    apiRequest<{ name: string; count: number }[]>('GET', '/tags').then(d => {
      setAllTags((d || []).map(t => ({ value: t.name, label: `${t.name} (${t.count})` })));
    }).catch(() => {});
    apiRequest<{ name: string; count: number }[]>('GET', '/groups').then(d => {
      setAllGroups((d || []).map(g => ({ value: g.name, label: `${g.name} (${g.count})` })));
    }).catch(() => {});
  }, []);

  useEffect(() => {
    loadData();
  }, [filter, activeGroup]);

  async function loadData() {
    setLoading(true);
    try {
      const statusParam = filter === 'ALL' ? '' : filter === 'ACTIVE' ? 'ACTIVE' : 'PENDING_MAP';
      const params: any = { limit: PAGE_SIZE };
      if (statusParam) params.status = statusParam;
      if (activeGroup) params.group = activeGroup;

      const first = await apiRequest<any>('GET', '/products', { ...params, page: 1 }, { raw: true });
      const totalPages = first.pagination?.totalPages || 1;
      let all: any[] = first.data || [];
      setProducts([...all]);
      setLoading(false);

      for (let p = 2; p <= totalPages; p++) {
        const res = await apiRequest<any>('GET', '/products', { ...params, page: p }, { raw: true });
        all = [...all, ...(res.data || [])];
        setProducts([...all]);
      }
    } catch (e: any) {
      notifications.show({ message: e.message || 'Lỗi', color: 'red' });
      setLoading(false);
    }
  }

  async function toggleStatus(code: string, currentStatus: string) {
    setToggling(prev => new Set(prev).add(code));
    const newStatus = currentStatus === 'ACTIVE' ? 'PENDING_MAP' : 'ACTIVE';
    try {
      await apiRequest('PATCH', `/products/${code}`, { status: newStatus, isPublic: newStatus === 'ACTIVE' ? true : false });
      setProducts(prev => prev.map(p => p.code === code ? { ...p, status: newStatus } : p));
      notifications.show({ message: `${code} → ${newStatus}`, color: 'green' });
    } catch (e: any) {
      notifications.show({ message: e.message, color: 'red' });
    }
    setToggling(prev => { const s = new Set(prev); s.delete(code); return s; });
  }

  const sellPrice = (p: any) => {
    if (!p.prices) return '';
    return p.prices['L4'] || p.prices['L3'] || p.prices['L2'] || p.prices['L1'] || p.prices['L0'] || '';
  };

  const filtered = products.filter((p: any) => {
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      if (![p.name, p.code, p.brand].filter(Boolean).some((s: string) => s.toLowerCase().includes(q))) return false;
    }
    if (activeTags.length > 0) {
      if (!p.tags || !activeTags.some((t: string) => p.tags.includes(t))) return false;
    }
    return true;
  });

  const activeCount = products.filter((p: any) => p.status === 'ACTIVE').length;
  const pendingCount = products.filter((p: any) => p.status === 'PENDING_MAP').length;

  return (
    <AdminLayout>
      <Title order={1} mb="md">Kích hoạt sản phẩm</Title>
      <Text c="dimmed" size="sm" mb="lg">
        Toggle ACTIVE/PENDING cho từng sản phẩm. ACTIVE = hiển thị trên web public.
      </Text>

      <Group mb="md" gap="xs" wrap="wrap">
        {[
          { label: `Chờ KH (${pendingCount})`, value: 'PENDING' as const },
          { label: `Đã active (${activeCount})`, value: 'ACTIVE' as const },
          { label: `Tất cả (${products.length})`, value: 'ALL' as const },
        ].map(f => (
          <Badge
            key={f.value}
            variant={filter === f.value ? 'filled' : 'light'}
            color={f.value === 'ACTIVE' ? 'green' : f.value === 'PENDING' ? 'yellow' : 'gray'}
            style={{ cursor: 'pointer' }}
            onClick={() => { setFilter(f.value); }}
          >
            {f.label}
          </Badge>
        ))}

        <Select
          data={allGroups}
          value={activeGroup}
          onChange={v => { setActiveGroup(v); }}
          placeholder="Chọn nhóm..."
          clearable
          searchable
          w={200}
          size="sm"
        />

        <MultiSelect
          data={allTags}
          value={activeTags}
          onChange={setActiveTags}
          placeholder="Lọc tag..."
          clearable
          searchable
          w={250}
          size="sm"
          hidePickedOptions
        />

        <TextInput
          placeholder="Tìm tên, mã, hãng..."
          leftSection={<IconSearch size={16} />}
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ flex: 1, minWidth: 200, maxWidth: 300 }}
          size="sm"
        />
      </Group>

      <Card withBorder shadow="sm" style={{ overflow: 'visible' }}>
        <Table striped highlightOnHover>
          <Table.Thead>
            <Table.Tr>
              <Table.Th w={140}>Mã</Table.Th>
              <Table.Th>Tên</Table.Th>
              <Table.Th w={100}>Hãng</Table.Th>
              <Table.Th w={130}>Giá bán</Table.Th>
              <Table.Th w={90}>Status</Table.Th>
              <Table.Th w={80}>Active</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {loading ? (
              <Table.Tr><Table.Td colSpan={6}><Text c="dimmed" ta="center">Đang tải...</Text></Table.Td></Table.Tr>
            ) : filtered.length === 0 ? (
              <Table.Tr><Table.Td colSpan={6}><Text c="dimmed" ta="center">Không có sản phẩm</Text></Table.Td></Table.Tr>
            ) : (
              filtered.map((p: any) => (
                <Table.Tr key={p.code} bg={p.status === 'ACTIVE' ? 'green.0' : undefined}
                  onClick={(e) => {
                    const target = e.target as HTMLElement;
                    if (target.closest('input')) return;
                    handleClick(p);
                  }}
                  style={{ cursor: 'pointer' }}
                >
                  <Table.Td><Text size="xs" ff="monospace">{p.code}</Text></Table.Td>
                  <Table.Td><Text size="sm">{p.name}</Text></Table.Td>
                  <Table.Td><Text size="xs">{p.brand}</Text></Table.Td>
                  <Table.Td><Text size="sm" fw={500}>{fmt(sellPrice(p))}</Text></Table.Td>
                  <Table.Td>
                    <Badge color={p.status === 'ACTIVE' ? 'green' : 'yellow'} size="sm">
                      {p.status === 'ACTIVE' ? 'ACTIVE' : 'PENDING'}
                    </Badge>
                  </Table.Td>
                  <Table.Td>
                    <Switch
                      checked={p.status === 'ACTIVE'}
                      disabled={toggling.has(p.code)}
                      onChange={() => toggleStatus(p.code, p.status)}
                    />
                  </Table.Td>
                </Table.Tr>
              ))
            )}
          </Table.Tbody>
        </Table>
      </Card>

      <ProductQuickModal product={selectedProduct} opened={modalOpened} onClose={close} />
    </AdminLayout>
  );
}
