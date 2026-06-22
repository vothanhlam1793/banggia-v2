'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import AdminLayout from '@/components/AdminLayout';
import { apiRequest } from '@/lib/auth';
import { notifications } from '@mantine/notifications';
import {
  Title, Button, Table, Text, Group, Card, Badge, TextInput, Flex,
} from '@mantine/core';
import { IconArrowLeft, IconCheck, IconX, IconArrowBack, IconSortAscending } from '@tabler/icons-react';

function fmt(n: number) {
  if (!n) return '';
  return n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.') + 'đ';
}

// ---------- SearchableSelect (Mantine-styled but keeps custom logic) ----------
function SearchableSelect({
  candidates, matchedCode, matchedName, value, onChange, onSearch,
}: {
  candidates: { code: string; name: string; score: number }[];
  matchedCode: string | null;
  matchedName: string | null;
  value: string;
  onChange: (code: string) => void;
  onSearch: (q: string) => Promise<{ code: string; name: string }[]>;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [results, setResults] = useState<{ code: string; name: string }[]>([]);
  const [searching, setSearching] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const defaultOptions = candidates.map(c => ({ code: c.code, name: c.name }));
  const selectedOption =
    defaultOptions.find(c => c.code === value) ||
    (matchedCode ? { code: matchedCode, name: matchedName || '' } : null);

  useEffect(() => {
    if (!search.trim()) { setResults([]); return; }
    let cancelled = false;
    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        const data = await onSearch(search.trim());
        if (!cancelled) setResults(data);
      } catch { if (!cancelled) setResults([]); }
      if (!cancelled) setSearching(false);
    }, 300);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [search, onSearch]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setSearch('');
      }
    };
    const timer = setTimeout(() => document.addEventListener('mousedown', handler), 0);
    return () => { clearTimeout(timer); document.removeEventListener('mousedown', handler); };
  }, [open]);

  const displayOptions = search.trim() ? results : defaultOptions;

  function handleSelect(code: string) {
    onChange(code);
    setOpen(false);
    setSearch('');
  }

  function handleToggle() {
    if (!open) {
      setOpen(true);
      setTimeout(() => inputRef.current?.focus(), 10);
    } else {
      setOpen(false);
      setSearch('');
    }
  }

  return (
    <div ref={containerRef} style={{ position: 'relative' }}>
      <div
        onClick={handleToggle}
        style={{
          border: '1px solid var(--mantine-color-gray-3)',
          borderRadius: 'var(--mantine-radius-sm)',
          padding: '4px 8px',
          fontSize: '12px',
          maxWidth: '220px',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'white',
        }}
      >
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {selectedOption ? (
            <><span style={{ fontFamily: 'monospace', color: 'var(--mantine-color-blue-7)' }}>{selectedOption.code}</span>
            <span style={{ color: 'var(--mantine-color-gray-6)', marginLeft: '4px' }}>| {selectedOption.name}</span></>
          ) : '— Select —'}
        </span>
        <span style={{ marginLeft: '4px', color: 'var(--mantine-color-gray-5)', fontSize: '10px' }}>{open ? '▲' : '▼'}</span>
      </div>
      {open && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, marginTop: '4px',
          background: 'white', border: '1px solid var(--mantine-color-gray-3)',
          borderRadius: 'var(--mantine-radius-md)', boxShadow: 'var(--mantine-shadow-xl)',
          zIndex: 9999, width: '320px', maxHeight: '288px',
          display: 'flex', flexDirection: 'column',
        }}>
          <div style={{ padding: '6px', borderBottom: '1px solid var(--mantine-color-gray-2)', background: 'var(--mantine-color-gray-0)' }}>
            <input
              ref={inputRef}
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Gõ code hoặc tên để tìm..."
              style={{
                width: '100%', padding: '4px 8px', fontSize: '12px',
                border: '1px solid var(--mantine-color-gray-3)', borderRadius: 'var(--mantine-radius-sm)',
                outline: 'none',
              }}
            />
          </div>
          <div style={{ overflowY: 'auto', flex: 1 }}>
            {searching ? (
              <p style={{ padding: '8px 12px', fontSize: '12px', color: 'var(--mantine-color-gray-5)' }}>Đang tìm...</p>
            ) : displayOptions.length === 0 ? (
              <p style={{ padding: '8px 12px', fontSize: '12px', color: 'var(--mantine-color-gray-5)' }}>
                {search.trim() ? 'Không tìm thấy sản phẩm' : 'Không có gợi ý'}
              </p>
            ) : (
              displayOptions.map(opt => (
                <div
                  key={opt.code}
                  onMouseDown={e => { e.preventDefault(); handleSelect(opt.code); }}
                  style={{
                    padding: '6px 8px', fontSize: '12px', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', gap: '8px',
                    background: opt.code === value ? 'var(--mantine-color-blue-1)' : undefined,
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'var(--mantine-color-blue-0)')}
                  onMouseLeave={e => { e.currentTarget.style.background = opt.code === value ? 'var(--mantine-color-blue-1)' : ''; }}
                >
                  <span style={{ fontFamily: 'monospace', color: 'var(--mantine-color-blue-7)', flexShrink: 0 }}>{opt.code}</span>
                  <span style={{ color: 'var(--mantine-color-gray-7)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{opt.name}</span>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

interface ImportItem {
  _id: string;
  batchId: string;
  sourceName: string;
  inputCode: string;
  inputName: string;
  sellPrice: number;
  costPrice: number;
  type: 'sell' | 'cost';
  matchedProductCode: string | null;
  matchedProductName: string | null;
  matchScore: number;
  candidates: { code: string; name: string; score: number }[];
  status: 'AUTO_MATCHED' | 'PENDING' | 'APPROVED' | 'REJECTED';
}

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

export default function BatchDetailPage() {
  const params = useParams();
  const router = useRouter();
  const batchId = params.batchId as string;

  const [batch, setBatch] = useState<Batch | null>(null);
  const [items, setItems] = useState<ImportItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortDir, setSortDir] = useState<'asc' | 'desc' | null>(null);
  const [selectedProducts, setSelectedProducts] = useState<Record<string, string>>({});
  const initialLoadDone = useRef(false);

  async function loadData() {
    if (!initialLoadDone.current) {
      setLoading(true);
    }
    try {
      const [batchData, itemsData] = await Promise.all([
        apiRequest<any[]>('GET', '/import/batches', {}),
        apiRequest<{ items: ImportItem[] }>('GET', `/import/batch/${batchId}`),
      ]);
      const found = (batchData || []).find((b: any) => (b._id || b.batchId) === batchId);
      setBatch(found || null);
      setItems(itemsData?.items || []);
    } catch (e: any) {
      notifications.show({ message: e.message || 'Failed to load', color: 'red' });
    }
    setLoading(false);
    initialLoadDone.current = true;
  }

  useEffect(() => { loadData(); }, [batchId]);

  async function approveOne(id: string, productCode: string) {
    try {
      await apiRequest('POST', `/import/${id}/approve`, { productCode });
      notifications.show({ message: 'Approved: ' + productCode, color: 'green' });
      setItems(prev => prev.map(i => i._id === id ? { ...i, status: 'APPROVED' as const } : i));
      loadData();
    } catch (e: any) {
      notifications.show({ message: e.message || 'Failed', color: 'red' });
    }
  }

  async function rejectOne(id: string) {
    try {
      await apiRequest('POST', `/import/${id}/reject`);
      notifications.show({ message: 'Rejected', color: 'orange' });
      setItems(prev => prev.map(i => i._id === id ? { ...i, status: 'REJECTED' as const } : i));
      loadData();
    } catch (e: any) {
      notifications.show({ message: e.message || 'Failed', color: 'red' });
    }
  }

  async function undoOne(id: string) {
    try {
      await apiRequest('POST', `/import/${id}/undo`);
      notifications.show({ message: 'Undone', color: 'blue' });
      loadData();
    } catch (e: any) {
      notifications.show({ message: e.message || 'Failed', color: 'red' });
    }
  }

  async function batchApprove() {
    if (!confirm('Approve all items in this batch?')) return;
    try {
      const res = await apiRequest('POST', '/import/batch/approve', { batchId });
      notifications.show({ message: `Batch approved: ${res?.approved}/${res?.total}`, color: 'green' });
      loadData();
    } catch (e: any) {
      notifications.show({ message: e.message || 'Failed', color: 'red' });
    }
  }

  async function completeBatch() {
    if (!confirm('Xác nhận hoàn thành batch này?')) return;
    try {
      const res = await apiRequest('POST', '/import/batch/complete', { batchId });
      notifications.show({ message: `Đã hoàn thành bởi ${res?.completedBy}`, color: 'green' });
      loadData();
    } catch (e: any) {
      notifications.show({ message: e.message || 'Failed', color: 'red' });
    }
  }

  async function searchProducts(q: string) {
    const data = await apiRequest<any[]>(
      'GET', '/products?search=' + encodeURIComponent(q) + '&limit=25'
    );
    return (data || []).map((p: any) => ({ code: p.code, name: p.name }));
  }

  const pendingItems = items.filter(i => i.status === 'PENDING' || i.status === 'AUTO_MATCHED');
  const isBatchCompleted = batch?.completedBy != null;
  const allProcessed = pendingItems.length === 0 && items.length > 0;
  const itemType = items[0]?.type || 'sell';
  const priceLabel = itemType === 'sell' ? 'Giá bán' : 'Giá nhập';

  const sortedItems = sortDir
    ? [...items].sort((a, b) => {
        const sa = a.matchScore ?? -1;
        const sb = b.matchScore ?? -1;
        return sortDir === 'desc' ? sb - sa : sa - sb;
      })
    : items;

  function formatDate(d?: string) {
    if (!d) return '';
    return new Date(d).toLocaleString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  }

  return (
    <AdminLayout>
      {/* Header */}
      <Group mb="md">
        <Button
          variant="subtle"
          leftSection={<IconArrowLeft size={16} />}
          onClick={() => router.push(`/import-price?tab=${itemType}`)}
        >
          Back
        </Button>
        <Title order={3}>{batch?.sourceName || batchId.slice(0, 8)}</Title>
        {batch && (
          <Text size="xs" c="dimmed">
            {formatDate(batch.createdAt)} · {itemType === 'sell' ? 'Giá bán' : 'Giá nhập'} · {batch.total} items
          </Text>
        )}
      </Group>

      {/* Batch stats + actions */}
      {batch && (
        <Card withBorder shadow="sm" mb="md">
          <Group justify="space-between">
            <Group gap="lg">
              <Text size="sm" c="dimmed">Tổng: <Text span fw={700}>{batch.total}</Text></Text>
              <Text size="sm" c="green">Auto: <Text span fw={700}>{batch.autoMatched}</Text></Text>
              <Text size="sm" c="yellow">Pending: <Text span fw={700}>{batch.pending}</Text></Text>
              <Text size="sm" c="blue">OK: <Text span fw={700}>{batch.approved}</Text></Text>
              <Text size="sm" c="red">Rejected: <Text span fw={700}>{batch.rejected}</Text></Text>
            </Group>
            <Group>
              {pendingItems.length > 0 && (
                <Button color="green" size="compact-sm" onClick={batchApprove}>
                  Approve All ({pendingItems.length})
                </Button>
              )}
              {allProcessed && !isBatchCompleted && (
                <Button color="grape" size="compact-sm" onClick={completeBatch} leftSection={<IconCheck size={14} />}>
                  Hoàn thành
                </Button>
              )}
              {isBatchCompleted && (
                <Badge color="green" variant="light" size="lg">
                  ✓ Đã hoàn thành {batch.completedBy ? `bởi ${batch.completedBy}` : ''}
                </Badge>
              )}
            </Group>
          </Group>
        </Card>
      )}

      {/* Items table */}
      <Card withBorder shadow="sm" style={{ overflow: 'visible' }}>
        {/* Color legend */}
        <Group gap="md" mb="md" pb="md" style={{ borderBottom: '1px solid var(--mantine-color-gray-2)' }}>
          <Group gap={4}><div style={{ width: 12, height: 12, borderRadius: 4, background: 'var(--mantine-color-green-2)' }} /><Text size="xs" c="dimmed">&gt; 3</Text></Group>
          <Group gap={4}><div style={{ width: 12, height: 12, borderRadius: 4, background: 'var(--mantine-color-blue-1)' }} /><Text size="xs" c="dimmed">1.5 – 3</Text></Group>
          <Group gap={4}><div style={{ width: 12, height: 12, borderRadius: 4, background: 'var(--mantine-color-yellow-1)' }} /><Text size="xs" c="dimmed">1 – 1.5</Text></Group>
          <Group gap={4}><div style={{ width: 12, height: 12, borderRadius: 4, background: 'var(--mantine-color-orange-0)' }} /><Text size="xs" c="dimmed">0 – 1</Text></Group>
          <Group gap={4}><div style={{ width: 12, height: 12, borderRadius: 4, border: '1px solid var(--mantine-color-gray-3)', background: 'white' }} /><Text size="xs" c="dimmed">Chưa match</Text></Group>
        </Group>

        {loading ? (
          <Text ta="center" py="xl" c="dimmed">Đang tải...</Text>
        ) : items.length === 0 ? (
          <Text ta="center" py="xl" c="dimmed">Không có items nào.</Text>
        ) : (
          <Table striped>
            <Table.Thead>
              <Table.Tr>
                <Table.Th w={40}>#</Table.Th>
                <Table.Th>Input Name</Table.Th>
                <Table.Th ta="right" w={120}>{priceLabel}</Table.Th>
                <Table.Th>Matched</Table.Th>
                <Table.Th
                  ta="center" w={80}
                  style={{ cursor: 'pointer', userSelect: 'none' }}
                  onClick={() => setSortDir(sortDir === 'desc' ? 'asc' : sortDir === 'asc' ? null : 'desc')}
                >
                  <Group gap={4} justify="center" wrap="nowrap">
                    Score
                    <IconSortAscending
                      size={12}
                      style={{
                        transform: sortDir === 'desc' ? 'rotate(180deg)' : 'none',
                        opacity: sortDir ? 1 : 0.3,
                      }}
                    />
                  </Group>
                </Table.Th>
                <Table.Th ta="center" w={160}>Actions</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {sortedItems.map((item, idx) => {
                const isApproved = item.status === 'APPROVED';
                const isRejected = item.status === 'REJECTED';
                const price = itemType === 'sell' ? item.sellPrice : (item.costPrice || item.sellPrice);
                const s = item.matchScore ?? -1;
                const rowBg = isApproved ? 'green.0'
                  : isRejected ? 'red.0'
                  : s > 3 ? 'green.0'
                  : s > 1.5 ? 'blue.0'
                  : s > 1 ? 'yellow.0'
                  : s > 0 ? 'orange.0'
                  : undefined;

                return (
                  <Table.Tr key={item._id} bg={rowBg} opacity={isApproved || isRejected ? 0.6 : 1}>
                    <Table.Td c="dimmed"><Text size="xs">{idx + 1}</Text></Table.Td>
                    <Table.Td>
                      <Text lineClamp={1} title={item.inputName} maw={280}>
                        {item.inputName}
                      </Text>
                      {item.inputCode && <Text size="xs" c="dimmed">{item.inputCode}</Text>}
                    </Table.Td>
                    <Table.Td ta="right">
                      <Text fw={600} c="green">{fmt(price) || '-'}</Text>
                    </Table.Td>
                    <Table.Td>
                      {isApproved || isRejected ? (
                        <Text size="xs" c={isApproved ? 'green.7' : 'red.7'}>
                          {item.matchedProductCode} | {item.matchedProductName}
                        </Text>
                      ) : (
                        <SearchableSelect
                          candidates={item.candidates || []}
                          matchedCode={item.matchedProductCode}
                          matchedName={item.matchedProductName}
                          value={selectedProducts[item._id] ?? item.matchedProductCode ?? ''}
                          onChange={code => setSelectedProducts(prev => ({ ...prev, [item._id]: code }))}
                          onSearch={searchProducts}
                        />
                      )}
                    </Table.Td>
                    <Table.Td ta="center">
                      {item.matchScore != null ? (
                        <Text fw={700} ff="monospace" size="xs"
                          c={s > 3 ? 'green.7' : s > 1.5 ? 'blue.7' : s > 1 ? 'yellow.7' : s > 0 ? 'orange.6' : 'dimmed'}
                        >
                          {item.matchScore.toFixed(2)}
                        </Text>
                      ) : <Text c="dimmed">-</Text>}
                    </Table.Td>
                    <Table.Td ta="center">
                      {isApproved ? (
                        <Group gap="xs" justify="center" wrap="nowrap">
                          <Badge color="green" variant="light" size="sm">✓ Approved</Badge>
                          <Button variant="subtle" size="compact-xs" color="gray" onClick={() => undoOne(item._id)}>
                            Undo
                          </Button>
                        </Group>
                      ) : isRejected ? (
                        <Group gap="xs" justify="center" wrap="nowrap">
                          <Badge color="red" variant="light" size="sm">✗ Rejected</Badge>
                          <Button variant="subtle" size="compact-xs" color="gray" onClick={() => undoOne(item._id)}>
                            Undo
                          </Button>
                        </Group>
                      ) : (
                        <Group gap="xs" justify="center">
                          <Button
                            color="green"
                            size="compact-xs"
                            onClick={() => {
                              const code = selectedProducts[item._id] || item.matchedProductCode;
                              if (!code) { notifications.show({ message: 'Select a product first', color: 'red' }); return; }
                              approveOne(item._id, code);
                            }}
                          >
                            Approve
                          </Button>
                          <Button color="red" size="compact-xs" onClick={() => rejectOne(item._id)}>
                            Reject
                          </Button>
                        </Group>
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
