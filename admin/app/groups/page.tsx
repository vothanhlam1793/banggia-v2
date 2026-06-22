'use client';

import { useState, useEffect, useCallback } from 'react';
import AdminLayout from '@/components/AdminLayout';
import { apiRequest } from '@/lib/auth';
import { notifications } from '@mantine/notifications';
import {
  Title, TextInput, Button, Table, Text, Group, ActionIcon, Badge,
} from '@mantine/core';
import { IconPencil, IconTrash, IconPlus } from '@tabler/icons-react';

interface GroupInfo {
  name: string;
  count: number;
}

export default function GroupsPage() {
  const [groups, setGroups] = useState<GroupInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState<string | null>(null);
  const [editVal, setEditVal] = useState('');
  const [newGroupName, setNewGroupName] = useState('');
  const [creating, setCreating] = useState(false);

  const fetchGroups = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await apiRequest<GroupInfo[]>('GET', '/groups');
      setGroups(data || []);
    } catch (e: any) { setError(e.message || 'Lỗi tải danh sách nhóm'); }
    setLoading(false);
  }, []);

  useEffect(() => { fetchGroups(); }, [fetchGroups]);

  function startEdit(name: string) { setEditing(name); setEditVal(name); }

  async function confirmRename(old: string) {
    const newName = editVal.trim();
    setEditing(null);
    if (!newName || newName === old) return;
    try {
      const res = await apiRequest<{ message: string }>('POST', '/groups/rename', { old, new: newName });
      notifications.show({ message: res.message, color: 'green' });
      fetchGroups();
    } catch (e: any) { notifications.show({ message: e.message, color: 'red' }); }
  }

  async function deleteGroup(name: string) {
    if (!confirm(`Xóa nhóm "${name}" — tất cả sản phẩm sẽ về "Khác"?`)) return;
    try {
      const res = await apiRequest<{ message: string }>('DELETE', `/groups/${encodeURIComponent(name)}`);
      notifications.show({ message: res.message, color: 'green' });
      fetchGroups();
    } catch (e: any) { notifications.show({ message: e.message, color: 'red' }); }
  }

  async function createGroup() {
    const name = newGroupName.trim();
    if (!name) return;
    setCreating(true);
    try {
      const res = await apiRequest<{ message: string }>('POST', '/groups', { name });
      notifications.show({ message: res.message, color: 'green' });
      setNewGroupName('');
      fetchGroups();
    } catch (e: any) { notifications.show({ message: e.message, color: 'red' }); }
    setCreating(false);
  }

  return (
    <AdminLayout>
      <Title order={2} mb="md">Quản lý Nhóm hàng</Title>

      <Text size="sm" c="dimmed" mb="md">
        Nhóm hàng được đồng bộ từ KiotViet. Tạo, đổi tên hoặc xóa nhóm ở đây.
      </Text>

      <Group mb="md">
        <TextInput
          value={newGroupName}
          onChange={e => setNewGroupName(e.currentTarget.value)}
          onKeyDown={e => { if (e.key === 'Enter') createGroup(); }}
          placeholder="Tên nhóm mới..."
          style={{ width: 220 }}
        />
        <Button
          onClick={createGroup}
          loading={creating}
          disabled={!newGroupName.trim()}
          leftSection={<IconPlus size={16} />}
          color="green"
        >
          Tạo nhóm
        </Button>
      </Group>

      {error && <Text c="red" size="sm" mb="md">{error}</Text>}

      {loading ? <Text c="dimmed">Đang tải...</Text> : (
        <Table striped highlightOnHover>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Nhóm</Table.Th>
              <Table.Th ta="right" w={100}>Số SP</Table.Th>
              <Table.Th w={120}></Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {groups.map(g => (
              <Table.Tr key={g.name}>
                <Table.Td>
                  {editing === g.name ? (
                    <TextInput
                      value={editVal}
                      onChange={e => setEditVal(e.currentTarget.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter') confirmRename(g.name);
                        if (e.key === 'Escape') setEditing(null);
                      }}
                      onBlur={() => confirmRename(g.name)}
                      autoFocus
                    />
                  ) : (
                    <Badge variant="light" color="blue" size="md">{g.name}</Badge>
                  )}
                </Table.Td>
                <Table.Td ta="right" c="dimmed">{g.count}</Table.Td>
                <Table.Td>
                  <Group gap="xs">
                    <ActionIcon variant="subtle" color="blue" onClick={() => startEdit(g.name)}>
                      <IconPencil size={14} />
                    </ActionIcon>
                    <ActionIcon variant="subtle" color="red" onClick={() => deleteGroup(g.name)}>
                      <IconTrash size={14} />
                    </ActionIcon>
                  </Group>
                </Table.Td>
              </Table.Tr>
            ))}
            {groups.length === 0 && (
              <Table.Tr>
                <Table.Td colSpan={3} ta="center" c="dimmed" py="xl">Chưa có nhóm nào</Table.Td>
              </Table.Tr>
            )}
          </Table.Tbody>
        </Table>
      )}
    </AdminLayout>
  );
}
