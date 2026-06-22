'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import AdminLayout from '@/components/AdminLayout';
import { apiRequest } from '@/lib/auth';
import { notifications } from '@mantine/notifications';
import {
  Title, Tabs, Button, Table, Text, Group, TextInput, Card, Badge, FileInput,
} from '@mantine/core';
import { IconUpload, IconDownload, IconFileSpreadsheet } from '@tabler/icons-react';

interface Batch {
  _id: string;
  sourceName: string;
  total: number;
  autoMatched: number;
  pending: number;
  approved: number;
  rejected: number;
  completedBy?: string;
  completedAt?: string;
  createdAt?: string;
  type?: string;
}

type TabType = 'sell' | 'cost';

const LABELS: Record<TabType, { title: string; label: string; csvHeader: string }> = {
  sell: { title: 'Import giá bán', label: 'Giá bán', csvHeader: 'Tên hàng,Giá bán,Code' },
  cost: { title: 'Import giá nhập', label: 'Giá nhập', csvHeader: 'Tên hàng,Giá nhập,Code' },
};

function formatDate(d?: string) {
  if (!d) return '';
  return new Date(d).toLocaleString('vi-VN', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
}

export default function ImportListPage() {
  return (
    <Suspense fallback={<AdminLayout><Text ta="center" py="xl" c="dimmed">Đang tải...</Text></AdminLayout>}>
      <ImportListContent />
    </Suspense>
  );
}

function ImportListContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tabParam = searchParams.get('tab') as TabType;
  const [tab, setTab] = useState<TabType>(tabParam === 'cost' ? 'cost' : 'sell');
  const [batches, setBatches] = useState<Batch[]>([]);
  const [uploading, setUploading] = useState(false);
  const [sourceName, setSourceName] = useState('');
  const [file, setFile] = useState<File | null>(null);

  const cfg = LABELS[tab];

  function switchTab(t: string | null) {
    if (!t || (t !== 'sell' && t !== 'cost')) return;
    setTab(t as TabType);
    router.replace(`/import-price?tab=${t}`);
  }

  async function loadBatches(type: TabType) {
    try {
      const data = await apiRequest<any[]>('GET', '/import/batches', { type });
      setBatches((data || []).map(b => ({ ...b, _id: b._id || b.batchId })));
    } catch {}
  }

  useEffect(() => { loadBatches(tab); }, [tab]);

  async function handleUpload(e: React.FormEvent) {
    e.preventDefault();
    if (!file) return;

    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      if (sourceName) fd.append('source', sourceName);

      const res = await fetch(`/api/v1/import/${tab}/upload`, {
        method: 'POST',
        headers: { 'Authorization': 'Bearer ' + localStorage.getItem('token') },
        body: fd,
      });
      const json = await res.json();
      if (json.ok) {
        notifications.show({
          message: `Uploaded: ${json.data.total} rows (${json.data.autoMatched} auto, ${json.data.pending} pending)`,
          color: 'green',
        });
        loadBatches(tab);
        router.push(`/import-price/${json.data.batchId}`);
      } else {
        notifications.show({ message: json.error || 'Upload failed', color: 'red' });
      }
    } catch (e: any) {
      notifications.show({ message: 'Error: ' + e.message, color: 'red' });
    }
    setUploading(false);
    setFile(null);
  }

  function downloadSample(type: TabType) {
    const header = LABELS[type].csvHeader;
    const rows = [
      'Camera IP 2MP,DH-IPC-HDW1230S,' + (type === 'sell' ? '950000' : '780000'),
      'Camera IP 4MP,DH-IPC-HDW1430S,' + (type === 'sell' ? '1450000' : '1200000'),
      'Đầu ghi 4 kênh,DH-NVR4104HS-P,' + (type === 'sell' ? '2100000' : '1750000'),
    ];
    const csv = [header, ...rows].join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sample-gia-${type === 'sell' ? 'ban' : 'nhap'}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <AdminLayout>
      <Title order={2} mb="md">{cfg.title}</Title>

      <Tabs value={tab} onChange={switchTab} mb="md">
        <Tabs.List>
          <Tabs.Tab value="sell">Giá bán</Tabs.Tab>
          <Tabs.Tab value="cost">Giá nhập</Tabs.Tab>
        </Tabs.List>
      </Tabs>

      <Card withBorder shadow="sm" mb="md">
        <Group justify="space-between" mb="md">
          <Text fw={600} size="sm" c="dimmed">Upload CSV {cfg.label}</Text>
          <Button
            variant="subtle"
            size="compact-sm"
            leftSection={<IconDownload size={14} />}
            onClick={() => downloadSample(tab)}
          >
            Tải CSV mẫu
          </Button>
        </Group>
        <form onSubmit={handleUpload}>
          <Group align="end">
            <FileInput
              label="File CSV"
              placeholder="Chọn file .csv"
              accept=".csv,.txt"
              value={file}
              onChange={setFile}
              required
              leftSection={<IconFileSpreadsheet size={16} />}
              style={{ flex: 1 }}
            />
            <TextInput
              label="Sheet / Nguồn"
              placeholder="VD: DLVIP-WIFI"
              value={sourceName}
              onChange={e => setSourceName(e.currentTarget.value)}
              style={{ width: 180 }}
            />
            <Button type="submit" loading={uploading} leftSection={<IconUpload size={16} />}>
              Upload & Match
            </Button>
          </Group>
        </form>
      </Card>

      <Card withBorder shadow="sm">
        <Text fw={600} size="sm" c="dimmed" mb="md">
          Lịch sử import ({batches.length})
        </Text>
        {batches.length === 0 ? (
          <Text ta="center" py="xl" c="dimmed">Chưa có dữ liệu. Upload file CSV ở trên.</Text>
        ) : (
          <Table striped highlightOnHover>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Nguồn</Table.Th>
                <Table.Th>Ngày</Table.Th>
                <Table.Th ta="center" w={60}>Tổng</Table.Th>
                <Table.Th ta="center" w={60}>Auto</Table.Th>
                <Table.Th ta="center" w={70}>Pending</Table.Th>
                <Table.Th ta="center" w={50}>OK</Table.Th>
                <Table.Th ta="center" w={70}>Reject</Table.Th>
                <Table.Th ta="center" w={130}>Trạng thái</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {batches.map(b => {
                const done = b.completedBy != null;
                return (
                  <Table.Tr
                    key={b._id}
                    onClick={() => router.push(`/import-price/${b._id}`)}
                    style={{ cursor: 'pointer' }}
                    bg={done ? 'green.0' : undefined}
                  >
                    <Table.Td fw={500}>{b.sourceName || b._id.slice(0, 8)}</Table.Td>
                    <Table.Td c="dimmed"><Text size="xs">{formatDate(b.createdAt)}</Text></Table.Td>
                    <Table.Td ta="center" fw={600}>{b.total}</Table.Td>
                    <Table.Td ta="center" c="green">{b.autoMatched || 0}</Table.Td>
                    <Table.Td ta="center" c="yellow" fw={500}>{b.pending}</Table.Td>
                    <Table.Td ta="center" c="blue">{b.approved}</Table.Td>
                    <Table.Td ta="center" c="red">{b.rejected}</Table.Td>
                    <Table.Td ta="center">
                      {done ? (
                        <Badge color="green" variant="light" size="sm">✓ Hoàn thành</Badge>
                      ) : b.pending === 0 ? (
                        <Text size="xs" c="dimmed">Sẵn sàng</Text>
                      ) : (
                        <Badge color="yellow" variant="light" size="sm">{b.pending} chờ xử lý</Badge>
                      )}
                    </Table.Td>
                  </Table.Tr>
                );
              })}
            </Table.Tbody>
          </Table>
        )}
      </Card>
    </AdminLayout>
  );
}
