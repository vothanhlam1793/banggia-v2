'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import AdminLayout from '@/components/AdminLayout';
import ProductQuickModal from '@/components/ProductQuickModal';
import { apiRequest } from '@/lib/auth';
import {
  Title,
  TextInput,
  Select,
  Button,
  Table,
  Card,
  Group,
  Text,
  Pagination,
  Badge,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { IconSearch, IconRefresh } from '@tabler/icons-react';

function fmt(n: number | null | undefined) {
  if (n == null) return '';
  return n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.') + 'đ';
}

const STATUS_LABELS: Record<string, string> = {
  ACTIVE: 'KD', OUT_OF_STOCK: 'Hết', DISCONTINUED: 'Ngừng', PENDING_MAP: 'Chưa map',
};
const STATUS_OPTIONS = [
  { value: '', label: 'Tất cả TT' },
  { value: 'ACTIVE', label: 'Đang KD' },
  { value: 'OUT_OF_STOCK', label: 'Hết hàng' },
  { value: 'DISCONTINUED', label: 'Ngừng KD' },
  { value: 'PENDING_MAP', label: 'Chưa map' },
];
const PAGE_SIZES = [25, 50, 100, 200];

export default function ProductsPage() {
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [brand, setBrand] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [total, setTotal] = useState(0);
  const [brands, setBrands] = useState<string[]>([]);
  const debounceRef = useRef<any>(null);

  const [syncState, setSyncState] = useState<{ loading: boolean; result?: any; lastSync?: any }>({ loading: false });

  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [modalOpened, { open, close }] = useDisclosure(false);

  const fetchData = useCallback(async (overrides?: Record<string, any>) => {
    setLoading(true);
    try {
      const params: any = { page, limit: pageSize, search, brand, status, ...(overrides || {}) };
      const data = await apiRequest<any>('GET', '/products', params);
      setProducts(data || []);
      setError('');
    } catch (e: any) {
      setError(e.message || 'Lỗi tải dữ liệu');
    }
    setLoading(false);
  }, [page, pageSize, search, brand, status]);

  const fetchLastSync = useCallback(async () => {
    try {
      const last = await apiRequest<any>('GET', '/products/last-sync');
      if (last) setSyncState(prev => ({ ...prev, lastSync: last }));
    } catch {}
  }, []);

  const handleSync = useCallback(async () => {
    setSyncState({ loading: true });
    try {
      const result = await apiRequest<any>('POST', '/products/sync-kiotviet');
      setSyncState({ loading: false, result, lastSync: { createdAt: result.syncedAt, created: result.created } });
      fetchData();
    } catch (e: any) {
      setSyncState({ loading: false, result: { error: e.message || 'Lỗi đồng bộ' } });
    }
  }, [fetchData]);

  useEffect(() => {
    apiRequest<number>('GET', '/products/count').then(d => setTotal(d ?? 0)).catch(() => {});
    apiRequest<any[]>('GET', '/products', { limit: 500 }).then(items => {
      const bs = [...new Set((items || []).map(p => p.brand).filter(Boolean))].sort();
      setBrands(bs);
    }).catch(() => {});
    fetchData();
    fetchLastSync();
  }, []);

  function updateSearch(val: string) {
    setSearch(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setPage(1);
      fetchData({ page: 1, search: val });
    }, 300);
  }

  function updateBrand(val: string) { setBrand(val); setPage(1); fetchData({ page: 1, brand: val }); }
  function updateStatus(val: string) { setStatus(val); setPage(1); fetchData({ page: 1, status: val }); }
  function goPage(pg: number) { setPage(pg); fetchData({ page: pg }); }
  function changePageSize(sz: number) { setPageSize(sz); setPage(1); fetchData({ page: 1, limit: sz }); }

  const totalPages = Math.ceil(total / pageSize);
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);

  return (
    <AdminLayout>
      <Group mb="md" gap="sm">
        <Title order={2}>Danh sách sản phẩm</Title>
        <Badge variant="light" color="gray" size="lg">{total.toLocaleString()} sp</Badge>
        <Button
          onClick={handleSync}
          loading={syncState.loading}
          leftSection={<IconRefresh size={16} />}
          color="teal"
        >
          Sync KiotViet
        </Button>
        {syncState.lastSync && (
          <Text size="xs" c="dimmed">
            Lần cuối: {new Date(syncState.lastSync.createdAt).toLocaleString('vi-VN')}
            {syncState.lastSync.created > 0 && ` (+${syncState.lastSync.created} mới)`}
          </Text>
        )}
        {syncState.result && !syncState.loading && (
          <Text size="xs" c={syncState.result.error ? 'red' : 'green'}>
            {syncState.result.error || syncState.result.message}
          </Text>
        )}
      </Group>

      <Group gap="sm" mb="sm">
        <TextInput
          value={search}
          onChange={e => updateSearch(e.target.value)}
          placeholder="Tìm tên hoặc code..."
          leftSection={<IconSearch size={16} />}
          w={240}
        />
        <Select
          value={brand || null}
          onChange={value => updateBrand(value || '')}
          data={brands.map(b => ({ value: b, label: b }))}
          placeholder="Tất cả hãng"
          clearable
        />
        <Select
          value={status || null}
          onChange={value => updateStatus(value || '')}
          data={STATUS_OPTIONS}
          placeholder="Tất cả TT"
          clearable
        />
      </Group>

      {error && <Text c="red" size="sm" mb="sm">{error}</Text>}

      {loading ? (
        <Text c="gray" py="md">Đang tải...</Text>
      ) : (
        <>
          <Card shadow="sm" p={0} withBorder>
            <Table striped highlightOnHover>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th w={140}>Code</Table.Th>
                  <Table.Th>Tên</Table.Th>
                  <Table.Th w={100}>Hãng</Table.Th>
                  <Table.Th w={120}>Nhóm</Table.Th>
                  <Table.Th ta="right" w={100}>Giá</Table.Th>
                  <Table.Th ta="center" w={70}>TT</Table.Th>
                  <Table.Th w={60}></Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {products.map(p => (
                  <Table.Tr key={p._id || p.id || p.code}
                    onClick={(e) => {
                      const target = e.target as HTMLElement;
                      if (target.closest('a')) return;
                      setSelectedProduct(p);
                      open();
                    }}
                    style={{ cursor: 'pointer' }}
                  >
                    <Table.Td ff="monospace" fz="xs">{p.code}</Table.Td>
                    <Table.Td>{p.name}</Table.Td>
                    <Table.Td fz="xs">{p.brand}</Table.Td>
                    <Table.Td fz="xs">{p.group}</Table.Td>
                    <Table.Td ta="right" fw={500}>{fmt(p.prices?.['L4'] || p.prices?.['L3'] || p.prices?.['L2'] || p.prices?.['L1'] || p.prices?.['L0'] || 0)}</Table.Td>
                    <Table.Td ta="center" fz="xs">{STATUS_LABELS[p.status] || p.status}</Table.Td>
                    <Table.Td>
                      <Link href={`/products/${p.code}`} style={{ color: '#228be6', fontSize: '12px', textDecoration: 'none' }}>
                        Chi tiết
                      </Link>
                    </Table.Td>
                  </Table.Tr>
                ))}
                {products.length === 0 && (
                  <Table.Tr>
                    <Table.Td colSpan={7} ta="center" py="lg" c="dimmed">Không có sản phẩm</Table.Td>
                  </Table.Tr>
                )}
              </Table.Tbody>
            </Table>
          </Card>

          <Group justify="space-between" mt="sm">
            <Group gap="sm">
              <Text size="sm" c="dimmed">
                Hiển thị {from}-{to} / {total.toLocaleString()}
              </Text>
              <Select
                value={String(pageSize)}
                onChange={value => changePageSize(Number(value))}
                data={PAGE_SIZES.map(sz => ({ value: String(sz), label: `${sz} / trang` }))}
                w={120}
                size="xs"
              />
            </Group>
            <Pagination total={totalPages || 1} value={page} onChange={goPage} size="sm" />
          </Group>
        </>
      )}

      <ProductQuickModal product={selectedProduct} opened={modalOpened} onClose={close} />
    </AdminLayout>
  );
}
