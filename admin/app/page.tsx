'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import AdminLayout from '@/components/AdminLayout';
import { apiRequest } from '@/lib/auth';
import {
  Title,
  TextInput,
  Select,
  Checkbox,
  Badge,
  Table,
  Card,
  Group,
  Stack,
  Text,
  Pagination,
} from '@mantine/core';
import { IconSearch } from '@tabler/icons-react';

function fmt(n: number | null | undefined) {
  if (n == null) return '';
  return n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.') + 'đ';
}

function daysLabel(d: number) {
  if (d >= 999) return 'Chưa có';
  if (d === 0) return 'Hôm nay';
  return d + ' ngày';
}

const badgeColors: Record<string, string> = {
  noPrice: 'violet',
  stale: 'red',
  warning: 'yellow',
  ok: 'green',
};

export default function PriceCheckPage() {
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filterGroup, setFilterGroup] = useState('');
  const [hideNoPrice, setHideNoPrice] = useState(true);
  const [staleStatus, setStaleStatus] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [allGroups, setAllGroups] = useState<string[]>([]);
  const pageSize = 50;

  async function fetchData(opts?: { group?: string; page?: number; hide?: boolean; searchVal?: string; status?: string }) {
    setLoading(true);
    setError('');
    const group = opts?.group !== undefined ? opts.group : filterGroup;
    const pg = opts?.page !== undefined ? opts.page : page;
    const hide = opts?.hide !== undefined ? opts.hide : hideNoPrice;
    const s = opts?.searchVal !== undefined ? opts.searchVal : search;
    const st = opts?.status !== undefined ? opts.status : staleStatus;

    try {
      const [staleRes, groupsData] = await Promise.all([
        apiRequest<{ data: any[]; pagination: { total: number } }>('GET', '/products/stale', {
          group: group || undefined,
          search: s || undefined,
          staleStatus: st || undefined,
          hasPrice: hide && !st ? 'true' : undefined,
          page: pg,
          limit: pageSize,
        }, { raw: true }),
        !allGroups.length
          ? apiRequest<any[]>('GET', '/products/stale', { limit: 500, hasPrice: 'true' })
            .then(items => [...new Set((items || []).map((x: any) => x.group).filter(Boolean))] as string[])
          : null,
      ]);
      setProducts(staleRes.data || []);
      setTotal(staleRes.pagination?.total ?? 0);
      if (groupsData) setAllGroups(groupsData);
    } catch (e: any) { setError(e.message || 'Lỗi tải dữ liệu'); }
    setLoading(false);
  }

  useEffect(() => { fetchData(); }, []);

  function changeGroup(g: string) { setFilterGroup(g); setPage(1); fetchData({ group: g, page: 1 }); }
  function toggleHide(v: boolean) { setHideNoPrice(v); setPage(1); fetchData({ hide: v, page: 1 }); }
  function changeStatus(st: string) {
    const next = staleStatus === st ? '' : st;
    setStaleStatus(next); setPage(1);
    fetchData({ status: next, page: 1, hide: next === 'noPrice' ? false : hideNoPrice });
  }
  function doSearch(s: string) { setSearch(s); setPage(1); fetchData({ searchVal: s, page: 1 }); }
  function goPage(pg: number) { setPage(pg); fetchData({ page: pg }); }

  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);

  return (
    <AdminLayout>
      <Title order={2} mb="md">Kiểm tra giá cũ</Title>

      <Group gap="sm" mb="sm">
        <TextInput
          value={search}
          onChange={e => doSearch(e.target.value)}
          placeholder="Tìm tên hoặc code..."
          leftSection={<IconSearch size={16} />}
          w={200}
        />
        <Select
          value={filterGroup || null}
          onChange={value => changeGroup(value || '')}
          data={allGroups.map(g => ({ value: g, label: g }))}
          placeholder="Tất cả nhóm"
          clearable
        />
        <Checkbox
          checked={hideNoPrice}
          onChange={e => toggleHide(e.target.checked)}
          label="Ẩn sp chưa có giá"
        />
      </Group>

      <Group gap="sm" mb="sm">
        {[
          { key: 'noPrice', label: 'Chưa có giá' },
          { key: 'stale', label: 'Cần gấp' },
          { key: 'warning', label: 'Sắp hết hạn' },
          { key: 'ok', label: 'OK' },
        ].map(b => (
          <Badge
            key={b.key}
            color={badgeColors[b.key]}
            variant={staleStatus === b.key ? 'filled' : 'light'}
            style={{ cursor: 'pointer', opacity: staleStatus === b.key ? 1 : 0.6 }}
            onClick={() => changeStatus(b.key)}
            size="lg"
          >
            {b.label}
          </Badge>
        ))}
      </Group>

      {error && <Text c="red" size="sm" mb="sm">{error}</Text>}

      {loading ? (
        <Text c="gray" py="md">Đang tải...</Text>
      ) : products.length === 0 ? (
        <Text c="gray" py="md">Tất cả giá đều còn hạn</Text>
      ) : (
        <Stack gap="sm">
          <Group justify="space-between">
            <Text size="sm" c="dimmed">
              Hiển thị {from}-{to} / {total.toLocaleString()} sp
            </Text>
            <Pagination total={totalPages} value={page} onChange={goPage} size="sm" />
          </Group>

          <Card shadow="sm" p={0} withBorder>
            <Table striped highlightOnHover>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Code</Table.Th>
                  <Table.Th>Tên</Table.Th>
                  <Table.Th ta="right">Giá</Table.Th>
                  <Table.Th ta="right">Giá nhập</Table.Th>
                  <Table.Th ta="center">Cập nhật</Table.Th>
                  <Table.Th ta="center">Hạn</Table.Th>
                  <Table.Th></Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {products.map(p => (
                  <Table.Tr
                    key={p._id || p.id}
                    bg={
                      p.daysSinceUpdate >= 999 ? 'violet.0' :
                      p.isStale ? 'red.0' : p.isWarning ? 'yellow.0' : undefined
                    }
                  >
                    <Table.Td ff="monospace" fz="xs">{p.code}</Table.Td>
                    <Table.Td>{p.name}</Table.Td>
                    <Table.Td ta="right">{fmt(p.prices?.['L4'] || p.prices?.['L3'] || p.prices?.['L2'] || p.prices?.['L1'] || p.prices?.['L0'] || 0)}</Table.Td>
                    <Table.Td ta="right">{fmt(p.costPrice)}</Table.Td>
                    <Table.Td ta="center" fz="xs">{daysLabel(p.daysSinceUpdate)}</Table.Td>
                    <Table.Td ta="center" fz="xs">{p.priceStaleDays ?? '7'} ngày</Table.Td>
                    <Table.Td>
                      <Link href={`/products/${p.code}`} style={{ color: '#228be6', fontSize: '12px', textDecoration: 'none' }}>
                        Sửa
                      </Link>
                    </Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          </Card>

          <Group justify="flex-end">
            <Pagination total={totalPages} value={page} onChange={goPage} size="sm" />
          </Group>
        </Stack>
      )}
    </AdminLayout>
  );
}
