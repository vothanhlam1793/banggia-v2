'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import AdminLayout from '@/components/AdminLayout';
import { apiRequest } from '@/lib/auth';
import { notifications } from '@mantine/notifications';
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
  Modal,
  NumberInput,
  Switch,
  Stack,
} from '@mantine/core';
import {
  IconSearch,
  IconTarget,
  IconPlus,
} from '@tabler/icons-react';

function fmt(n: number | null | undefined) {
  if (n == null) return '';
  return n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.') + 'đ';
}

function marginPct(product: any) {
  const price = product.prices?.['L4'] || product.prices?.['L3'] || product.prices?.['L2'] || product.prices?.['L1'] || product.prices?.['L0'];
  const cost = product.costPrice;
  if (!price || !cost || cost === 0) return null;
  return Math.round(((price - cost) / cost) * 100);
}

const TARGET_CUSTOMERS = ['Thợ nhỏ', 'Công trình', 'Đại lý', 'Lẻ'];
const PAGE_SIZES = [25, 50, 100];

export default function StrategicPage() {
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [campaigns, setCampaigns] = useState<string[]>([]);
  const [search, setSearch] = useState('');
  const [campaignFilter, setCampaignFilter] = useState('');
  const [customerFilter, setCustomerFilter] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [total, setTotal] = useState(0);

  const [campaignModal, setCampaignModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [newCampaign, setNewCampaign] = useState({ name: '', targetMargin: 0, targetCustomer: '', note: '' });
  const [saving, setSaving] = useState(false);

  const fetchData = useCallback(async (opts?: { page?: number; search?: string; campaign?: string; targetCustomer?: string; limit?: number }) => {
    setLoading(true);
    const s = opts?.search !== undefined ? opts.search : search;
    const c = opts?.campaign !== undefined ? opts.campaign : campaignFilter;
    const tc = opts?.targetCustomer !== undefined ? opts.targetCustomer : customerFilter;
    const pg = opts?.page !== undefined ? opts.page : page;
    const lim = opts?.limit !== undefined ? opts.limit : pageSize;

    try {
      const res = await apiRequest<any>('GET', '/products/strategic', {
        search: s || undefined,
        campaign: c || undefined,
        targetCustomer: tc || undefined,
        page: pg,
        limit: lim,
      }, { raw: true });
      setProducts(res.data || []);
      setTotal(res.pagination?.total ?? 0);
    } catch {}
    setLoading(false);
  }, [search, campaignFilter, customerFilter, page, pageSize]);

  useEffect(() => {
    apiRequest<string[]>('GET', '/products/campaigns')
      .then(data => setCampaigns(data || []))
      .catch(() => {});
    fetchData();
  }, []);

  function goPage(pg: number) { setPage(pg); setTimeout(() => fetchData({ page: pg }), 0); }
  function changePageSize(sz: number) { setPageSize(sz); setPage(1); setTimeout(() => fetchData({ page: 1, limit: sz }), 0); }
  function applyFilter(field: 'campaign' | 'customer', val: string) {
    if (field === 'campaign') setCampaignFilter(val);
    else setCustomerFilter(val);
    setPage(1);
    setTimeout(() => fetchData({ page: 1, [field === 'campaign' ? 'campaign' : 'targetCustomer']: val }), 0);
  }

  async function toggleStrategic(product: any) {
    const updated = !product.isStrategic;
    setProducts(prev => prev.map(p => p.code === product.code ? { ...p, isStrategic: updated } : p));
    try {
      await apiRequest('PATCH', `/products/${product.code}`, { isStrategic: updated });
      notifications.show({ message: updated ? 'Đã bật chiến lược' : 'Đã tắt chiến lược', color: 'green' });
      fetchData();
    } catch {
      setProducts(prev => prev.map(p => p.code === product.code ? { ...p, isStrategic: !updated } : p));
      notifications.show({ message: 'Lỗi cập nhật', color: 'red' });
    }
  }

  async function removeCampaign(productCode: string, campaignId: string) {
    try {
      await apiRequest('DELETE', `/products/${productCode}/campaigns/${campaignId}`);
      notifications.show({ message: 'Đã xóa campaign', color: 'green' });
      fetchData();
    } catch {
      notifications.show({ message: 'Lỗi xóa campaign', color: 'red' });
    }
  }

  function openCampaignModal(product: any) {
    setSelectedProduct(product);
    setNewCampaign({ name: campaignFilter || '', targetMargin: 0, targetCustomer: '', note: '' });
    setCampaignModal(true);
  }

  async function saveCampaign() {
    if (!newCampaign.name.trim()) return;
    setSaving(true);
    try {
      await apiRequest('POST', `/products/${selectedProduct.code}/campaigns`, {
        name: newCampaign.name.trim(),
        targetMargin: newCampaign.targetMargin || undefined,
        targetCustomer: newCampaign.targetCustomer || undefined,
        note: newCampaign.note || undefined,
      });
      notifications.show({ message: 'Đã thêm campaign', color: 'green' });
      setCampaignModal(false);
      fetchData();
      apiRequest<string[]>('GET', '/products/campaigns').then(data => setCampaigns(data || [])).catch(() => {});
    } catch {
      notifications.show({ message: 'Lỗi thêm campaign', color: 'red' });
    }
    setSaving(false);
  }

  async function updatePriority(productCode: string, val: number) {
    setProducts(prev => prev.map(p => p.code === productCode ? { ...p, strategicPriority: val } : p));
    try {
      await apiRequest('PATCH', `/products/${productCode}`, { strategicPriority: val });
    } catch {
      notifications.show({ message: 'Lỗi cập nhật', color: 'red' });
    }
  }

  const totalPages = Math.ceil(total / pageSize);
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);

  return (
    <AdminLayout>
      <Group mb="md" gap="sm">
        <Title order={2}>Hàng chiến lược</Title>
        <Badge variant="light" color="violet" size="lg">{total.toLocaleString()} sp</Badge>
      </Group>

      <Group gap="sm" mb="sm">
        <TextInput
          value={search}
          onChange={e => { setSearch(e.target.value); setPage(1); }}
          onKeyDown={e => e.key === 'Enter' && fetchData({ page: 1, search: e.currentTarget.value })}
          placeholder="Tìm tên hoặc code..."
          leftSection={<IconSearch size={16} />}
          w={240}
        />
        <Select
          value={campaignFilter || null}
          onChange={value => applyFilter('campaign', value || '')}
          data={campaigns.map(c => ({ value: c, label: c }))}
          placeholder="Tất cả chương trình"
          clearable
        />
        <Select
          value={customerFilter || null}
          onChange={value => applyFilter('customer', value || '')}
          data={TARGET_CUSTOMERS.map(c => ({ value: c, label: c }))}
          placeholder="Tất cả khách"
          clearable
        />
      </Group>

      {loading ? (
        <Text c="gray" py="md">Đang tải...</Text>
      ) : (
        <>
          <Card shadow="sm" p={0} withBorder>
            <Table striped highlightOnHover>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th w={130}>prCode</Table.Th>
                  <Table.Th>Tên</Table.Th>
                  <Table.Th w={80}>Hãng</Table.Th>
                  <Table.Th ta="right" w={80}>Margin</Table.Th>
                  <Table.Th ta="right" w={80}>MT mục tiêu</Table.Th>
                  <Table.Th w={130}>Chương trình</Table.Th>
                  <Table.Th w={100}>Khách MT</Table.Th>
                  <Table.Th ta="center" w={50}>UT</Table.Th>
                  <Table.Th ta="center" w={70}>CL</Table.Th>
                  <Table.Th w={60}></Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {products.map(p => {
                  const m = marginPct(p);
                  const activeCampaigns = (p.campaigns || []).filter((c: any) => {
                    if (!c.endDate) return true;
                    return new Date(c.endDate) >= new Date();
                  });
                  return (
                    <Table.Tr key={p._id || p.code}>
                      <Table.Td ff="monospace" fz="xs">{p.prCode || p.code}</Table.Td>
                      <Table.Td fz="sm">
                        <Link href={`/products/${p.code}`} style={{ color: 'inherit', textDecoration: 'none' }}>
                          {p.name}
                        </Link>
                      </Table.Td>
                      <Table.Td fz="xs">{p.brand}</Table.Td>
                      <Table.Td ta="right" fz="xs" c={m != null && m < 5 ? 'red' : undefined}>
                        {m != null ? `${m}%` : '—'}
                      </Table.Td>
                      <Table.Td ta="right" fz="xs">
                        {activeCampaigns.map((c: any, i: number) => (
                          <Text key={i} span>{(c.targetMargin != null) ? `${c.targetMargin}%` : '—'}</Text>
                        ))}
                        {activeCampaigns.length === 0 && '—'}
                      </Table.Td>
                      <Table.Td fz="xs">
                        {(p.campaigns || []).map((c: any, i: number) => (
                          <Badge key={i} size="xs" variant="light" color="violet" mr={4} mb={2}>
                            {c.name}
                          </Badge>
                        ))}
                        {(p.campaigns || []).length === 0 && (
                          <Text span c="dimmed" fz="xs">—</Text>
                        )}
                      </Table.Td>
                      <Table.Td fz="xs">
                        {activeCampaigns.map((c: any, i: number) => (
                          <Text key={i} span>{c.targetCustomer || '—'}</Text>
                        ))}
                        {activeCampaigns.length === 0 && '—'}
                      </Table.Td>
                      <Table.Td ta="center">
                        <NumberInput
                          value={p.strategicPriority ?? 0}
                          onChange={v => updatePriority(p.code, Number(v))}
                          min={0}
                          max={5}
                          hideControls
                          w={40}
                          size="xs"
                        />
                      </Table.Td>
                      <Table.Td ta="center">
                        <Switch
                          checked={p.isStrategic || false}
                          onChange={() => toggleStrategic(p)}
                          size="sm"
                        />
                      </Table.Td>
                      <Table.Td>
                        <Group gap={4} wrap="nowrap">
                          <Button
                            size="compact-xs"
                            variant="light"
                            color="violet"
                            leftSection={<IconPlus size={12} />}
                            onClick={() => openCampaignModal(p)}
                          >
                            Campaign
                          </Button>
                        </Group>
                      </Table.Td>
                    </Table.Tr>
                  );
                })}
                {products.length === 0 && (
                  <Table.Tr>
                    <Table.Td colSpan={10} ta="center" py="lg" c="dimmed">
                      Chưa có sản phẩm chiến lược. Vào trang chi tiết sản phẩm để gắn nhãn.
                    </Table.Td>
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

      <Modal
        opened={campaignModal}
        onClose={() => setCampaignModal(false)}
        title={
          <Group gap="xs">
            <IconTarget size={18} />
            <Text fw={600}>Thêm campaign — {selectedProduct?.name}</Text>
          </Group>
        }
        size="sm"
      >
        <Stack gap="sm">
          <Select
            label="Chương trình"
            value={campaigns.includes(newCampaign.name) ? newCampaign.name : null}
            onChange={value => value && setNewCampaign({ ...newCampaign, name: value })}
            data={campaigns.map(c => ({ value: c, label: c }))}
            placeholder="Chọn chương trình có sẵn"
            searchable
            clearable
            nothingFoundMessage="Nhập tên mới ở dưới"
          />
          <TextInput
            label="Hoặc tạo chương trình mới"
            value={newCampaign.name}
            onChange={e => setNewCampaign({ ...newCampaign, name: e.target.value })}
            placeholder="Nhập tên chương trình mới"
          />
          <Select
            label="Khách mục tiêu"
            value={newCampaign.targetCustomer || null}
            onChange={value => setNewCampaign({ ...newCampaign, targetCustomer: value || '' })}
            data={TARGET_CUSTOMERS.map(c => ({ value: c, label: c }))}
            placeholder="— Chọn —"
            clearable
          />
          <NumberInput
            label="Margin mục tiêu (%)"
            value={newCampaign.targetMargin || 0}
            onChange={v => setNewCampaign({ ...newCampaign, targetMargin: Number(v) || 0 })}
            min={0}
            max={100}
            hideControls
          />
          <TextInput
            label="Ghi chú"
            value={newCampaign.note}
            onChange={e => setNewCampaign({ ...newCampaign, note: e.target.value })}
            placeholder="vd: Combo với Sandisk 64GB"
          />
          <Group justify="flex-end">
            <Button variant="default" onClick={() => setCampaignModal(false)}>Hủy</Button>
            <Button onClick={saveCampaign} loading={saving} color="violet" disabled={!newCampaign.name.trim()}>
              Lưu
            </Button>
          </Group>
        </Stack>
      </Modal>
    </AdminLayout>
  );
}
