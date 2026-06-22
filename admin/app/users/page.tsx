'use client';

import { useState, useEffect } from 'react';
import AdminLayout from '@/components/AdminLayout';
import { apiRequest } from '@/lib/auth';
import { useAuth } from '@/lib/auth-context';
import { notifications } from '@mantine/notifications';
import {
  Title, Button, Table, Text, Group, Badge, Modal, TextInput, PasswordInput, Select, Stack,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { IconPlus, IconPencil, IconTrash } from '@tabler/icons-react';

interface User {
  _id: string;
  email: string;
  name: string;
  role: 'admin' | 'editor' | 'viewer';
  createdAt: string;
}

const ROLE_COLOR: Record<string, string> = {
  admin: 'grape',
  editor: 'blue',
  viewer: 'gray',
};

export default function UsersPage() {
  const { user: me } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [opened, { open, close }] = useDisclosure(false);
  const [editUser, setEditUser] = useState<User | null>(null);
  const [form, setForm] = useState({ email: '', name: '', password: '', role: 'viewer' as string });
  const [saving, setSaving] = useState(false);

  async function loadUsers() {
    setLoading(true);
    try {
      const data = await apiRequest<User[]>('GET', '/users');
      setUsers(data);
    } catch {}
    setLoading(false);
  }

  useEffect(() => { loadUsers(); }, []);

  function openCreate() {
    setEditUser(null);
    setForm({ email: '', name: '', password: '', role: 'viewer' });
    open();
  }

  function openEdit(user: User) {
    setEditUser(user);
    setForm({ email: user.email, name: user.name, password: '', role: user.role });
    open();
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      if (editUser) {
        await apiRequest('PUT', `/users/${editUser._id}`, { name: form.name, role: form.role, password: form.password || undefined });
        notifications.show({ message: 'Đã cập nhật user', color: 'green' });
      } else {
        await apiRequest('POST', '/users', { email: form.email, name: form.name, password: form.password, role: form.role });
        notifications.show({ message: 'Đã tạo user', color: 'green' });
      }
      close();
      loadUsers();
    } catch (e: any) {
      notifications.show({ message: e.message || 'Lỗi', color: 'red' });
    }
    setSaving(false);
  }

  async function handleDelete(user: User) {
    if (!confirm(`Xóa user ${user.name} (${user.email})?`)) return;
    try {
      await apiRequest('DELETE', `/users/${user._id}`);
      notifications.show({ message: 'Đã xóa', color: 'green' });
      loadUsers();
    } catch (e: any) {
      notifications.show({ message: e.message || 'Lỗi', color: 'red' });
    }
  }

  return (
    <AdminLayout>
      <Group justify="space-between" mb="md">
        <Title order={2}>Quản lý người dùng</Title>
        <Button onClick={openCreate} leftSection={<IconPlus size={16} />}>Thêm user</Button>
      </Group>

      {loading ? (
        <Text ta="center" py="xl" c="dimmed">Đang tải...</Text>
      ) : (
        <Table striped highlightOnHover>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Tên</Table.Th>
              <Table.Th>Email</Table.Th>
              <Table.Th>Role</Table.Th>
              <Table.Th>Ngày tạo</Table.Th>
              <Table.Th ta="right" w={130}>Actions</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {users.map(u => {
              const isMe = me?.email === u.email;
              return (
                <Table.Tr key={u._id}>
                  <Table.Td>
                    <Text span fw={500}>{u.name}</Text>
                    {isMe && <Text span size="xs" c="dimmed" ml="xs">(bạn)</Text>}
                  </Table.Td>
                  <Table.Td c="dimmed">{u.email}</Table.Td>
                  <Table.Td>
                    <Badge color={ROLE_COLOR[u.role] || 'gray'} variant="light" size="sm">{u.role}</Badge>
                  </Table.Td>
                  <Table.Td c="dimmed"><Text size="xs">
                    {new Date(u.createdAt).toLocaleDateString('vi-VN')}
                  </Text></Table.Td>
                  <Table.Td ta="right">
                    <Group gap="xs" justify="flex-end">
                      <Button variant="subtle" size="compact-xs" onClick={() => openEdit(u)}>Sửa</Button>
                      {!isMe && (
                        <Button variant="subtle" size="compact-xs" color="red" onClick={() => handleDelete(u)}>Xóa</Button>
                      )}
                    </Group>
                  </Table.Td>
                </Table.Tr>
              );
            })}
            {users.length === 0 && (
              <Table.Tr>
                <Table.Td colSpan={5} ta="center" c="dimmed" py="xl">Chưa có user nào</Table.Td>
              </Table.Tr>
            )}
          </Table.Tbody>
        </Table>
      )}

      <Modal opened={opened} onClose={close} title={editUser ? 'Sửa user' : 'Thêm user'}>
        <form onSubmit={handleSave}>
          <Stack>
            {!editUser && (
              <TextInput
                label="Email"
                type="email"
                value={form.email}
                onChange={e => setForm({ ...form, email: e.currentTarget.value })}
                required
              />
            )}
            <TextInput
              label="Tên"
              value={form.name}
              onChange={e => setForm({ ...form, name: e.currentTarget.value })}
              required
            />
            <PasswordInput
              label={editUser ? 'Mật khẩu (để trống nếu không đổi)' : 'Mật khẩu'}
              value={form.password}
              onChange={e => setForm({ ...form, password: e.currentTarget.value })}
              required={!editUser}
              placeholder={editUser ? '••••••' : 'Ít nhất 6 ký tự'}
            />
            <Select
              label="Role"
              value={form.role}
              onChange={(value) => value && setForm({ ...form, role: value })}
              data={[
                { value: 'admin', label: 'Admin — toàn quyền' },
                { value: 'editor', label: 'Editor — import & duyệt giá' },
                { value: 'viewer', label: 'Viewer — chỉ xem' },
              ]}
            />
            <Group justify="flex-end" mt="md">
              <Button variant="default" onClick={close}>Hủy</Button>
              <Button type="submit" loading={saving}>
                {editUser ? 'Cập nhật' : 'Tạo user'}
              </Button>
            </Group>
          </Stack>
        </form>
      </Modal>
    </AdminLayout>
  );
}
