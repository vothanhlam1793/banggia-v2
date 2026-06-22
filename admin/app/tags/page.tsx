'use client';

import { useState, useEffect, useCallback } from 'react';
import AdminLayout from '@/components/AdminLayout';
import { apiRequest } from '@/lib/auth';
import { notifications } from '@mantine/notifications';
import {
  Title, TextInput, Button, Table, Text, Group, Stack, ActionIcon, Badge,
} from '@mantine/core';
import { IconPencil, IconTrash, IconPlus } from '@tabler/icons-react';

interface TagInfo {
  name: string;
  count: number;
}

export default function TagsPage() {
  const [tags, setTags] = useState<TagInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState<string | null>(null);
  const [editVal, setEditVal] = useState('');
  const [newTagName, setNewTagName] = useState('');
  const [creating, setCreating] = useState(false);

  const fetchTags = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await apiRequest<TagInfo[]>('GET', '/tags');
      setTags(data || []);
    } catch (e: any) { setError(e.message || 'Lỗi tải danh sách tag'); }
    setLoading(false);
  }, []);

  useEffect(() => { fetchTags(); }, [fetchTags]);

  function startEdit(name: string) { setEditing(name); setEditVal(name); }

  async function confirmRename(old: string) {
    const newName = editVal.trim();
    setEditing(null);
    if (!newName || newName === old) return;
    try {
      const res = await apiRequest<{ message: string }>('POST', '/tags/rename', { old, new: newName });
      notifications.show({ message: res.message, color: 'green' });
      fetchTags();
    } catch (e: any) { notifications.show({ message: e.message, color: 'red' }); }
  }

  async function deleteTag(tag: string) {
    if (!confirm(`Xóa tag "${tag}" khỏi tất cả sản phẩm?`)) return;
    try {
      const res = await apiRequest<{ message: string }>('DELETE', `/tags/${tag}`);
      notifications.show({ message: res.message, color: 'green' });
      fetchTags();
    } catch (e: any) { notifications.show({ message: e.message, color: 'red' }); }
  }

  async function createTag() {
    const name = newTagName.trim();
    if (!name) return;
    setCreating(true);
    try {
      const res = await apiRequest<{ message: string }>('POST', '/tags', { name });
      notifications.show({ message: res.message, color: 'green' });
      setNewTagName('');
      fetchTags();
    } catch (e: any) { notifications.show({ message: e.message, color: 'red' }); }
    setCreating(false);
  }

  return (
    <AdminLayout>
      <Title order={2} mb="md">Quản lý Tag</Title>

      <Text size="sm" c="dimmed" mb="md">
        Tag giúp lọc sản phẩm trên trang public. Mỗi sản phẩm có thể có nhiều tag.
      </Text>

      <Group mb="md">
        <TextInput
          value={newTagName}
          onChange={e => setNewTagName(e.currentTarget.value)}
          onKeyDown={e => { if (e.key === 'Enter') createTag(); }}
          placeholder="Tên tag mới..."
          style={{ width: 220 }}
        />
        <Button
          onClick={createTag}
          loading={creating}
          disabled={!newTagName.trim()}
          leftSection={<IconPlus size={16} />}
          color="green"
        >
          Tạo tag
        </Button>
      </Group>

      {error && <Text c="red" size="sm" mb="md">{error}</Text>}

      {loading ? <Text c="dimmed">Đang tải...</Text> : (
        <Table striped highlightOnHover>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Tag</Table.Th>
              <Table.Th ta="right" w={100}>Số SP</Table.Th>
              <Table.Th w={120}></Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {tags.map(t => (
              <Table.Tr key={t.name}>
                <Table.Td>
                  {editing === t.name ? (
                    <TextInput
                      value={editVal}
                      onChange={e => setEditVal(e.currentTarget.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter') confirmRename(t.name);
                        if (e.key === 'Escape') setEditing(null);
                      }}
                      onBlur={() => confirmRename(t.name)}
                      autoFocus
                    />
                  ) : (
                    <Badge variant="light" color="blue" size="md">{t.name}</Badge>
                  )}
                </Table.Td>
                <Table.Td ta="right" c="dimmed">{t.count}</Table.Td>
                <Table.Td>
                  <Group gap="xs">
                    <ActionIcon variant="subtle" color="blue" onClick={() => startEdit(t.name)}>
                      <IconPencil size={14} />
                    </ActionIcon>
                    <ActionIcon variant="subtle" color="red" onClick={() => deleteTag(t.name)}>
                      <IconTrash size={14} />
                    </ActionIcon>
                  </Group>
                </Table.Td>
              </Table.Tr>
            ))}
            {tags.length === 0 && (
              <Table.Tr>
                <Table.Td colSpan={3} ta="center" c="dimmed" py="xl">Chưa có tag nào</Table.Td>
              </Table.Tr>
            )}
          </Table.Tbody>
        </Table>
      )}
    </AdminLayout>
  );
}
