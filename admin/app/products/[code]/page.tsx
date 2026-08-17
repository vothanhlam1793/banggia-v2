'use client';

import { useState, useEffect, use } from 'react';
import Link from 'next/link';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import AdminLayout from '@/components/AdminLayout';
import { apiRequest } from '@/lib/auth';
import { resolveImageUrl } from '@/lib/utils';
import { notifications } from '@mantine/notifications';
import {
  Title,
  TextInput,
  Select,
  Checkbox,
  Badge,
  Button,
  Card,
  Group,
  Stack,
  Text,
  Tabs,
  NumberInput,
  Textarea,
  Grid,
  Image,
  FileButton,
  ActionIcon,
  Modal,
  Switch,
} from '@mantine/core';
import { IconArrowLeft, IconTrash, IconPlus, IconPhoto, IconTarget, IconEdit } from '@tabler/icons-react';

function fmt(n: number | null | undefined) {
  if (n == null) return '';
  return n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.') + 'đ';
}

function fmt0(n: number | null | undefined) {
  return fmt(n ?? 0);
}

const PRICE_LABELS: Record<string, string> = {
  L0: 'L0 (Sỉ lớn)',
  L1: 'L1 (Sỉ vừa)',
  L2: 'L2 (Sỉ nhỏ)',
  L3: 'L3 (Bán buôn)',
  L4: 'L4 (Bán lẻ)',
  L5: 'L5 (Tham khảo)',
};
const PRICE_LEVELS = ['L0', 'L1', 'L2', 'L3', 'L4', 'L5'];

export default function ProductDetailPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = use(params);
  const [product, setProduct] = useState<any>(null);
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editPrices, setEditPrices] = useState<Record<string, string>>({});
  const [notes, setNotes] = useState('');
  const [msg, setMsg] = useState('');
  const [activeTab, setActiveTab] = useState<string | null>('info');
  const [allTags, setAllTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [allGroups, setAllGroups] = useState<string[]>([]);
  const [allBrands, setAllBrands] = useState<string[]>([]);
  const [newImageUrl, setNewImageUrl] = useState('');
  const [uploading, setUploading] = useState(false);

  const [stratModal, setStratModal] = useState(false);
  const [stratForm, setStratForm] = useState({ name: '', targetMargin: 0, targetCustomer: '', note: '' });
  const [stratSaving, setStratSaving] = useState(false);
  const [allCampaigns, setAllCampaigns] = useState<string[]>([]);

  // Upload image
  async function uploadImage(file: File | null) {
    if (!file) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('image', file);
      const token = localStorage.getItem('token');
      const res = await (fetch as any)(`/api/v1/upload`, {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: fd,
      });
      const json = await res.json();
      if (json.ok) {
        addImageUrl(json.data.url);
      } else {
        notifications.show({ message: json.error || 'Upload failed', color: 'red' });
      }
    } catch (e: any) {
      notifications.show({ message: 'Upload failed: ' + e.message, color: 'red' });
    }
    setUploading(false);
  }

  function addImageUrl(url: string) {
    const current = product?.images || [];
    const updated = [...current, url];
    setProduct((p: any) => ({ ...p, images: updated }));
    saveField('images', updated);
  }

  function removeImage(index: number) {
    const updated = (product?.images || []).filter((_: any, i: number) => i !== index);
    setProduct((p: any) => ({ ...p, images: updated }));
    saveField('images', updated);
  }

  function addUrlFromInput() {
    const url = newImageUrl.trim();
    if (!url) return;
    setNewImageUrl('');
    addImageUrl(url);
  }

  async function fetch() {
    setLoading(true);
    setError('');
    try {
      const [prod, logList, tags, brands, groups] = await Promise.all([
        apiRequest<any>('GET', `/products/${code}`),
        apiRequest<any[]>('GET', `/products/${code}/logs`),
        apiRequest<{ name: string; count: number }[]>('GET', '/tags'),
        apiRequest<string[]>('GET', '/products/brands'),
        apiRequest<{ name: string }[]>('GET', '/groups'),
      ]);
      setProduct(prod);
      setLogs(logList || []);
      setAllTags((tags || []).map(t => t.name));
      setAllBrands(brands || []);
      setAllGroups((groups || []).map(g => g.name));
      const init: Record<string, string> = {};
      for (const lvl of PRICE_LEVELS) init[lvl] = prod?.prices?.[lvl] != null ? String(prod.prices[lvl]) : '';
      setEditPrices(init);
    } catch (e: any) {
      setError(e.message || 'Lỗi tải dữ liệu');
      setProduct(null);
    }
    setLoading(false);
  }

  useEffect(() => { fetch(); }, [code]);

  async function updatePrices() {
    setMsg('');
    const data: Record<string, number> = {};
    for (const lvl of PRICE_LEVELS) {
      const v = editPrices[lvl];
      if (v !== '' && v != null) data[lvl] = Number(v);
    }
    if (Object.keys(data).length === 0) { setMsg('Nhập ít nhất 1 mức giá'); return; }
    try {
      await apiRequest('POST', `/products/${code}/prices`, { prices: data, notes });
      notifications.show({ message: 'Cập nhật giá thành công', color: 'green' });
      setNotes('');
      setMsg('');
      fetch();
    } catch (e: any) { setMsg(e.message); }
  }

  async function saveField(field: string, value: any) {
    try {
      await apiRequest('PATCH', `/products/${code}`, { [field]: value });
      setProduct((p: any) => ({ ...p, [field]: value }));
      if (field !== 'isPublic') notifications.show({ message: 'Đã lưu', color: 'green' });
    } catch (e: any) {
      notifications.show({ message: e.message || 'Lỗi lưu', color: 'red' });
      fetch();
    }
  }

  function toggleTag(tag: string) {
    const oldTags = product?.tags || [];
    const updated = oldTags.includes(tag) ? oldTags.filter((t: string) => t !== tag) : [...oldTags, tag];
    setProduct((p: any) => ({ ...p, tags: updated }));
    apiRequest('PATCH', `/products/${code}`, { tags: updated }).catch(() => {
      notifications.show({ message: 'Lỗi cập nhật tag', color: 'red' });
      setProduct((p: any) => ({ ...p, tags: oldTags }));
    });
  }

  function addCustomTag() {
    const t = tagInput.trim();
    if (!t) return;
    setTagInput('');
    if ((product?.tags || []).includes(t)) return;
    toggleTag(t);
  }

  async function openStratModal() {
    await fetchCampaigns();
    setStratForm({ name: '', targetMargin: 0, targetCustomer: '', note: '' });
    setStratModal(true);
  }

  async function fetchCampaigns() {
    try {
      const data = await apiRequest<string[]>('GET', '/products/campaigns');
      setAllCampaigns(data || []);
    } catch {}
  }

  async function saveCampaign() {
    if (!stratForm.name.trim()) return;
    setStratSaving(true);
    try {
      await apiRequest('POST', `/products/${code}/campaigns`, {
        name: stratForm.name.trim(),
        targetMargin: stratForm.targetMargin || undefined,
        targetCustomer: stratForm.targetCustomer || undefined,
        note: stratForm.note || undefined,
      });
      notifications.show({ message: 'Đã thêm campaign', color: 'green' });
      setStratModal(false);
      fetch();
    } catch {
      notifications.show({ message: 'Lỗi thêm campaign', color: 'red' });
    }
    setStratSaving(false);
  }

  async function removeCampaign(campaignId: string) {
    try {
      await apiRequest('DELETE', `/products/${code}/campaigns/${campaignId}`);
      notifications.show({ message: 'Đã xóa campaign', color: 'green' });
      fetch();
    } catch {
      notifications.show({ message: 'Lỗi xóa campaign', color: 'red' });
    }
  }

  const statusMap: Record<string, string> = { ACTIVE: 'Đang KD', OUT_OF_STOCK: 'Hết hàng', DISCONTINUED: 'Ngừng KD', PENDING_MAP: 'Chưa map' };

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
    { key: 'wifi', label: 'WiFi', render: (v: any) => {
      if (v === true || v === null) return 'Có';
      const parts: string[] = [];
      const bandLabels: Record<string, string> = { dual: '2 băng tần', '2.4GHz': '2.4GHz', '5GHz': '5GHz' };
      if (v.band) parts.push(bandLabels[v.band] || v.band);
      if (v.standard) parts.push(v.standard);
      return parts.join(' / ') || 'Có';
    }},
    { key: 'ports', label: 'Cổng', render: (v: any) => {
      const parts: string[] = [];
      if (v.copper) parts.push(`${v.copper} GE`);
      if (v.fiber) parts.push(`${v.fiber} SFP`);
      if (v.total && !v.copper) parts.push(`${v.total} cổng`);
      return parts.length > 0 ? parts.join(' + ') : `${v.total} cổng`;
    }},
    { key: 'managed', label: 'Quản lý', render: () => 'Managed / L2+' },
    { key: 'poe_budget', label: 'PoE Budget', render: (v: any) => `${v.value}${v.unit || 'W'}` },
    { key: 'dimensions', label: 'Kích thước', render: (v: any) => `${v.w}×${v.h}×${v.d} ${v.unit || 'mm'}` },
    { key: 'weight', label: 'Trọng lượng', render: (v: any) => `${v.value}${v.unit}` },
    { key: 'operating_temp', label: 'Nhiệt độ hoạt động', render: (v: any) => `${v.min}°C ~ ${v.max}°C` },
  ];

  function renderStructuredSpecs(specs: Record<string, any>) {
    if (!specs) return null;
    const rows = SPEC_FIELDS.filter(f => specs[f.key] != null && specs[f.key] !== '');
    if (rows.length === 0) return null;
    return (
      <div style={{
        background: 'linear-gradient(135deg, #f8f9ff 0%, #f0f4ff 100%)',
        borderRadius: 'var(--mantine-radius-md)',
        border: '1px solid var(--mantine-color-blue-2)',
        padding: '12px 16px',
      }}>
        <Group gap={8} wrap="wrap">
          {rows.map(f => (
            <div key={f.key} style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              background: 'white',
              borderRadius: '6px',
              padding: '6px 12px',
              border: '1px solid var(--mantine-color-gray-2)',
              fontSize: '13px',
              boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
            }}>
              <Text span size="xs" c="dimmed" fw={500}>
                {f.label}
              </Text>
              <Text span size="sm" fw={600}>
                {f.render(specs[f.key])}
              </Text>
            </div>
          ))}
        </Group>
      </div>
    );
  }

  return (
    <AdminLayout>
      <Link href="/products" style={{ color: '#228be6', fontSize: '14px', marginBottom: '16px', display: 'inline-flex', alignItems: 'center', gap: '4px', textDecoration: 'none' }}>
        <IconArrowLeft size={14} /> Danh sách
      </Link>

      {loading ? (
        <Text c="gray" py="md">Đang tải...</Text>
      ) : error ? (
        <Text c="red" py="md">{error}</Text>
      ) : !product ? (
        <Text c="gray" py="md">Không tìm thấy sản phẩm</Text>
      ) : (
        <Stack gap="lg">
          <div>
            <Title order={3}>{product.name}</Title>
            <Text size="sm" c="dimmed" ff="monospace">{product.code}</Text>
            <Group gap="xs" mt="xs">
              <Badge variant="light" color="gray">{product.brand}</Badge>
              <Badge variant="light" color="blue">{product.group}</Badge>
              <Badge variant="light" color="green">{statusMap[product.status]}</Badge>
              <Badge variant="light" color={product.isPublic ? 'yellow' : 'gray'}>
                {product.isPublic ? 'Public' : 'Ẩn'}
              </Badge>
            </Group>
          </div>

          <Tabs value={activeTab} onChange={setActiveTab}>
            <Tabs.List>
              <Tabs.Tab value="info">Giá & Thông tin</Tabs.Tab>
              <Tabs.Tab value="history">Lịch sử ({logs.length})</Tabs.Tab>
              <Tabs.Tab value="strategic" leftSection={<IconTarget size={14} />}>Chiến lược</Tabs.Tab>
            </Tabs.List>

            <Tabs.Panel value="info" pt="md">
              <Stack gap="md">
                <Card shadow="sm" padding="md" withBorder>
                  <Title order={5} mb="md">Cập nhật giá bán</Title>
                  {msg && (
                    <Text
                      size="sm"
                      c={msg.includes('thành công') ? 'green' : 'red'}
                      bg={msg.includes('thành công') ? 'green.0' : 'red.0'}
                      p="xs"
                      style={{ borderRadius: '4px' }}
                      mb="sm"
                    >
                      {msg}
                    </Text>
                  )}

                  <Grid mb="md">
                    {PRICE_LEVELS.map(lvl => (
                      <Grid.Col key={lvl} span={6}>
                        <Group gap="xs" align="center" wrap="nowrap">
                          <Text size="sm" w={120}>{PRICE_LABELS[lvl] || lvl}</Text>
                          <NumberInput
                            value={editPrices[lvl] || ''}
                            onChange={value => setEditPrices(p => ({ ...p, [lvl]: String(value ?? '') }))}
                            thousandSeparator="."
                            decimalSeparator=","
                            w={140}
                            size="sm"
                            hideControls
                          />
                          {(product.prices && product.prices[lvl] != null) && (
                            <Text size="xs" c="dimmed">({fmt(product.prices[lvl])})</Text>
                          )}
                        </Group>
                      </Grid.Col>
                    ))}
                  </Grid>

                  <Group gap="sm">
                    <TextInput
                      value={notes}
                      onChange={e => setNotes(e.target.value)}
                      placeholder="Ghi chú"
                      w={200}
                      size="sm"
                    />
                    <Button onClick={updatePrices} color="blue">
                      Cập nhật giá
                    </Button>
                  </Group>

                  <Group mt="md" pt="md" gap="xs" style={{ borderTop: '1px solid #dee2e6' }}>
                    <Text size="sm">Giá nhập: <strong>{fmt0(product.costPrice)}</strong></Text>
                    <Text size="xs" c="dimmed">
                      Cập nhật: {product.priceUpdatedAt ? new Date(product.priceUpdatedAt).toLocaleDateString('vi-VN') : 'Chưa có'}
                      {' '}| Hạn: {product.priceStaleDays ?? 7} ngày
                    </Text>
                  </Group>
                </Card>

                <Card shadow="sm" padding="md" withBorder>
                  <Title order={5} mb="md">Thông tin sản phẩm</Title>
                  <Grid>
                    <Grid.Col span={6}>
                      <Text size="sm" c="dimmed" mb={4}>Hãng</Text>
                      <Select
                        value={product.brand || null}
                        onChange={value => {
                          const v = value || '';
                          setProduct((p: any) => ({ ...p, brand: v }));
                          saveField('brand', v);
                        }}
                        data={allBrands.map(b => ({ value: b, label: b }))}
                        placeholder="— Chọn hãng —"
                        clearable
                      />
                    </Grid.Col>
                    <Grid.Col span={6}>
                      <Text size="sm" c="dimmed" mb={4}>Nhóm</Text>
                      <Select
                        value={product.group || null}
                        onChange={value => {
                          const v = value || '';
                          setProduct((p: any) => ({ ...p, group: v }));
                          saveField('group', v);
                        }}
                        data={allGroups.map(g => ({ value: g, label: g }))}
                        placeholder="— Chọn nhóm —"
                        clearable
                      />
                    </Grid.Col>
                    <Grid.Col span={6}>
                      <Text size="sm" c="dimmed" mb={4}>Danh mục</Text>
                      <TextInput
                        value={product.category || ''}
                        onChange={e => setProduct((p: any) => ({ ...p, category: e.target.value }))}
                        onBlur={e => { if (e.target.value !== product.category) saveField('category', e.target.value); }}
                      />
                    </Grid.Col>
                    <Grid.Col span={6}>
                      <Text size="sm" c="dimmed" mb={4}>Hạn giá (ngày)</Text>
                      <NumberInput
                        value={product.priceStaleDays ?? 7}
                        onChange={value => setProduct((p: any) => ({ ...p, priceStaleDays: Number(value) }))}
                        onBlur={e => {
                          const v = Number((e.target as HTMLInputElement).value);
                          if (v !== product.priceStaleDays) saveField('priceStaleDays', v);
                        }}
                        hideControls
                      />
                    </Grid.Col>
                    <Grid.Col span={6}>
                      <Checkbox
                        checked={product.isPublic || false}
                        onChange={e => saveField('isPublic', e.target.checked)}
                        label="Hiển thị công khai"
                        mt="md"
                      />
                    </Grid.Col>
                    <Grid.Col span={6}>
                      <Text size="sm" c="dimmed" mb={4}>Trạng thái</Text>
                      <Select
                        value={product.status || ''}
                        onChange={value => {
                          const v = value || '';
                          setProduct((p: any) => ({ ...p, status: v }));
                          saveField('status', v);
                        }}
                        data={[
                          { value: 'ACTIVE', label: 'Đang kinh doanh' },
                          { value: 'OUT_OF_STOCK', label: 'Hết hàng' },
                          { value: 'DISCONTINUED', label: 'Ngừng kinh doanh' },
                          { value: 'PENDING_MAP', label: 'Chưa map' },
                        ]}
                      />
                    </Grid.Col>
                    <Grid.Col span={12}>
                      <Text size="sm" c="dimmed" mb={4}>Tags</Text>
                      <Group gap="xs" mb="xs">
                        {allTags.map(tag => (
                          <Badge
                            key={tag}
                            variant={product.tags?.includes(tag) ? 'filled' : 'light'}
                            color={product.tags?.includes(tag) ? 'blue' : 'gray'}
                            style={{ cursor: 'pointer' }}
                            onClick={() => toggleTag(tag)}
                          >
                            {tag}
                          </Badge>
                        ))}
                      </Group>
                      <Group gap="xs">
                        <TextInput
                          value={tagInput}
                          onChange={e => setTagInput(e.target.value)}
                          onKeyDown={e => e.key === 'Enter' && addCustomTag()}
                          placeholder="Thêm tag mới..."
                          w={150}
                          size="xs"
                        />
                        <Button
                          onClick={addCustomTag}
                          variant="default"
                          size="xs"
                        >
                          + Thêm
                        </Button>
                      </Group>
                    </Grid.Col>
                    <Grid.Col span={12}>
                      <Text size="sm" c="dimmed" mb={4}>Mô tả</Text>
                      <Textarea
                        value={product.description || ''}
                        onChange={e => setProduct((p: any) => ({ ...p, description: e.target.value }))}
                        onBlur={e => { if (e.target.value !== product.description) saveField('description', e.target.value); }}
                        rows={3}
                      />
                    </Grid.Col>
                    {product.specs?.raw && (
                      <Grid.Col span={12}>
                        <Group gap="xs" mb={4} align="center">
                          <Text size="sm" c="dimmed">Thông số kỹ thuật</Text>
                          {product.specs_source && (
                            <Text size="xs" c="gray">(nguồn: {product.specs_source})</Text>
                          )}
                        </Group>
                        {renderStructuredSpecs(product.specs)}
                        <details style={{ marginTop: '12px' }}>
                          <summary style={{ cursor: 'pointer', fontSize: '13px', color: 'var(--mantine-color-gray-6)' }}>
                            Xem thông số gốc
                          </summary>
                          <div style={{
                            background: 'var(--mantine-color-gray-0)',
                            padding: '12px 16px',
                            borderRadius: 'var(--mantine-radius-sm)',
                            fontSize: '14px',
                            lineHeight: '1.6',
                            whiteSpace: 'pre-wrap',
                            wordBreak: 'break-word',
                            maxHeight: '300px',
                            overflowY: 'auto',
                            border: '1px solid var(--mantine-color-gray-3)',
                            marginTop: '4px',
                          }}>
                            {product.specs.raw}
                          </div>
                        </details>
                      </Grid.Col>
                    )}
                    <Grid.Col span={12}>
                      <Text size="sm" c="dimmed" mb="xs">Hình ảnh ({(product.images || []).length})</Text>
                      <Group gap="sm" mb="sm">
                        {(product.images || []).map((url: string, idx: number) => (
                          <div key={idx} style={{ position: 'relative', display: 'inline-block' }}>
                            <Image
                              src={resolveImageUrl(url)}
                              alt={`${product.name} ${idx + 1}`}
                              w={80}
                              h={80}
                              radius="sm"
                              fit="cover"
                              fallbackSrc="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='80' height='80' viewBox='0 0 80 80'%3E%3Crect fill='%23f1f3f5' width='80' height='80'/%3E%3Ctext x='40' y='48' text-anchor='middle' fill='%23adb5bd' font-size='28'%3E📷%3C/text%3E%3C/svg%3E"
                            />
                            <ActionIcon
                              size="xs"
                              color="red"
                              variant="filled"
                              style={{ position: 'absolute', top: -6, right: -6 }}
                              onClick={() => removeImage(idx)}
                            >
                              <IconTrash size={10} />
                            </ActionIcon>
                          </div>
                        ))}
                      </Group>
                      <Group gap="sm">
                        <FileButton onChange={uploadImage} accept="image/*">
                          {(props) => (
                            <Button {...props} variant="light" leftSection={<IconPhoto size={16} />} loading={uploading} size="sm">
                              Upload ảnh
                            </Button>
                          )}
                        </FileButton>
                        <TextInput
                          value={newImageUrl}
                          onChange={e => setNewImageUrl(e.currentTarget.value)}
                          onKeyDown={e => e.key === 'Enter' && addUrlFromInput()}
                          placeholder="hoặc paste URL ảnh..."
                          w={250}
                          size="sm"
                        />
                        <Button onClick={addUrlFromInput} variant="default" size="sm" leftSection={<IconPlus size={14} />}>
                          Thêm URL
                        </Button>
                      </Group>
                    </Grid.Col>
                  </Grid>
                </Card>
              </Stack>
            </Tabs.Panel>

            <Tabs.Panel value="history" pt="md">
              <Card shadow="sm" padding="md" withBorder>
                <Title order={5} mb="sm">
                  Lịch sử giá nhập ({logs.filter((l: any) => l.type === 'IMPORT_SYNC').length} lần)
                </Title>

                {(() => {
                  const importLogs = logs
                    .filter((l: any) => l.type === 'IMPORT_SYNC')
                    .map((l: any) => ({ date: new Date(l.createdAt).toLocaleDateString('vi-VN'), price: l.costPrice }))
                    .reverse();

                  if (importLogs.length === 0) return <Text size="sm" c="dimmed">Chưa có lịch sử nhập</Text>;

                  const allPrices = importLogs.map((d: any) => d.price);
                  const lo = Math.min(...allPrices) * 0.9;
                  const hi = Math.max(...allPrices) * 1.1;

                  return (
                    <ResponsiveContainer width="100%" height={280}>
                      <LineChart data={importLogs} margin={{ top: 10, right: 20, left: 20, bottom: 10 }}>
                        <XAxis dataKey="date" tick={{ fontSize: 11 }} interval="preserveStartEnd" />
                        <YAxis domain={[Math.floor(lo), Math.ceil(hi)]} tickFormatter={v => fmt(v)} tick={{ fontSize: 11 }} width={80} />
                        <Tooltip formatter={(v: any) => [fmt(v), 'Giá nhập']} labelFormatter={(l: any) => `Ngày: ${l}`} />
                        <Line type="monotone" dataKey="price" stroke="#7c3aed" strokeWidth={2} dot={{ r: 4, fill: '#7c3aed' }} activeDot={{ r: 6 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  );
                })()}

                {logs.filter((l: any) => l.type === 'MANUAL').length > 0 && (
                  <div style={{ marginTop: '12px', borderTop: '1px solid #dee2e6', paddingTop: '8px' }}>
                    <Text size="sm" fw={500} mb="xs">Cập nhật giá bán (tay)</Text>
                    <Stack gap={2} mah={160} style={{ overflowY: 'auto' }}>
                      {logs.filter((l: any) => l.type === 'MANUAL').slice(0, 20).map((l: any) => (
                        <Text key={l.id || l._id} size="xs" c="dimmed">
                          <Text span c="gray" size="xs">{new Date(l.createdAt).toLocaleDateString('vi-VN')}</Text>
                          {' '}
                          {l.changes?.map((c: any) => `${c.level}: ${fmt(c.old)}→${fmt(c.new)}`).join(', ') || '—'}
                          {l.notes ? <Text span fs="italic" c="gray" size="xs" ml={4}>({l.notes})</Text> : null}
                        </Text>
                      ))}
                    </Stack>
                  </div>
                )}
              </Card>
            </Tabs.Panel>

            <Tabs.Panel value="strategic" pt="md">
              <Stack gap="md">
                <Card shadow="sm" padding="md" withBorder>
                  <Group justify="space-between" mb="md">
                    <Title order={5}>Chiến lược sản phẩm</Title>
                    <Switch
                      checked={product?.isStrategic || false}
                      onChange={e => saveField('isStrategic', e.target.checked)}
                      label="Hàng chiến lược"
                      size="sm"
                    />
                  </Group>

                  <Stack gap="xs">
                    <Group justify="space-between" align="center">
                      <Text size="sm" fw={500}>Campaign đang chạy</Text>
                      <Button size="compact-sm" variant="light" color="violet" leftSection={<IconPlus size={14} />} onClick={openStratModal}>
                        Thêm campaign
                      </Button>
                    </Group>

                    {(product?.campaigns || []).length === 0 ? (
                      <Text size="sm" c="dimmed" py="sm">Chưa có campaign nào</Text>
                    ) : (
                      (product?.campaigns || []).map((c: any) => (
                        <Card key={c._id} p="sm" withBorder style={{ backgroundColor: 'var(--mantine-color-gray-0)' }}>
                          <Group justify="space-between" mb={4}>
                            <Group gap="xs">
                              <Badge size="sm" color="violet" variant="filled">{c.name}</Badge>
                              {c.endDate && new Date(c.endDate) < new Date() && (
                                <Badge size="xs" color="gray">Đã kết thúc</Badge>
                              )}
                            </Group>
                            <ActionIcon size="sm" color="red" variant="subtle" onClick={() => removeCampaign(c._id)}>
                              <IconTrash size={14} />
                            </ActionIcon>
                          </Group>
                          <Group gap="md" fz="xs" c="dimmed">
                            <Text span>Margin MT: {c.targetMargin != null ? `${c.targetMargin}%` : '—'}</Text>
                            <Text span>Khách: {c.targetCustomer || '—'}</Text>
                            <Text span>
                              Thời gian: {c.startDate ? new Date(c.startDate).toLocaleDateString('vi-VN') : '—'}
                              {' → '}
                              {c.endDate ? new Date(c.endDate).toLocaleDateString('vi-VN') : 'Không giới hạn'}
                            </Text>
                          </Group>
                          {c.note && <Text size="xs" mt={4}>{c.note}</Text>}
                        </Card>
                      ))
                    )}
                  </Stack>
                </Card>
              </Stack>
            </Tabs.Panel>
          </Tabs>
        </Stack>
      )}
      <Modal
        opened={stratModal}
        onClose={() => setStratModal(false)}
        title={
          <Group gap="xs">
            <IconTarget size={18} />
            <Text fw={600}>Thêm campaign — {product?.name}</Text>
          </Group>
        }
        size="sm"
      >
        <Stack gap="sm">
          <Select
            label="Chương trình"
            value={allCampaigns.includes(stratForm.name) ? stratForm.name : null}
            onChange={value => value && setStratForm({ ...stratForm, name: value })}
            data={allCampaigns.map(c => ({ value: c, label: c }))}
            placeholder="Chọn chương trình có sẵn"
            searchable
            clearable
            nothingFoundMessage="Nhập tên mới ở dưới"
          />
          <TextInput
            label="Hoặc tạo chương trình mới"
            value={stratForm.name}
            onChange={e => setStratForm({ ...stratForm, name: e.target.value })}
            placeholder="Nhập tên chương trình mới"
          />
          <Select
            label="Khách mục tiêu"
            value={stratForm.targetCustomer || null}
            onChange={value => setStratForm({ ...stratForm, targetCustomer: value || '' })}
            data={['Thợ nhỏ', 'Công trình', 'Đại lý', 'Lẻ'].map(c => ({ value: c, label: c }))}
            placeholder="— Chọn —"
            clearable
          />
          <NumberInput
            label="Margin mục tiêu (%)"
            value={stratForm.targetMargin || 0}
            onChange={v => setStratForm({ ...stratForm, targetMargin: Number(v) || 0 })}
            min={0}
            max={100}
            hideControls
          />
          <TextInput
            label="Ghi chú"
            value={stratForm.note}
            onChange={e => setStratForm({ ...stratForm, note: e.target.value })}
            placeholder="vd: Combo với Sandisk 64GB"
          />
          <Group justify="flex-end">
            <Button variant="default" onClick={() => setStratModal(false)}>Hủy</Button>
            <Button onClick={saveCampaign} loading={stratSaving} color="violet" disabled={!stratForm.name.trim()}>
              Lưu
            </Button>
          </Group>
        </Stack>
      </Modal>
    </AdminLayout>
  );
}
