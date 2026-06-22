'use client';

import { useAuth } from '@/lib/auth-context';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect } from 'react';
import Link from 'next/link';
import {
  AppShell,
  Burger,
  Group,
  NavLink,
  Avatar,
  Text,
  Badge,
  ActionIcon,
  Stack,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import {
  IconSearch,
  IconPackage,
  IconTags,
  IconCategory,
  IconFileImport,
  IconUsers,
  IconLogout,
  IconHome,
  IconTarget,
  IconToggleLeft,
} from '@tabler/icons-react';

const ROLE_COLOR: Record<string, string> = {
  admin: 'grape',
  editor: 'blue',
  viewer: 'gray',
};

const NAV_ITEMS = [
  { href: '/', label: 'Kiểm tra giá', icon: IconHome },
  { href: '/products', label: 'Sản phẩm', icon: IconPackage },
  { href: '/activate', label: 'Kích hoạt', icon: IconToggleLeft },
  { href: '/strategic', label: 'Hàng chiến lược', icon: IconTarget },
  { href: '/tags', label: 'Tag', icon: IconTags },
  { href: '/groups', label: 'Nhóm', icon: IconCategory },
  { href: '/import-price', label: 'Import', icon: IconFileImport },
  { href: '/users', label: 'Users', icon: IconUsers, adminOnly: true },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, loading, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [opened, { toggle }] = useDisclosure();

  useEffect(() => {
    if (!loading && !user) router.push('/login');
  }, [user, loading, router]);

  if (loading) return <Text ta="center" py="xl">Đang tải...</Text>;
  if (!user) return null;

  const initials = user.name
    .split(' ')
    .map(w => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <AppShell
      header={{ height: 60 }}
      navbar={{ width: 260, breakpoint: 'sm', collapsed: { mobile: !opened } }}
      padding="md"
    >
      <AppShell.Header>
        <Group h="100%" px="md">
          <Burger opened={opened} onClick={toggle} hiddenFrom="sm" size="sm" />
          <Text fw={700} size="lg">BangGia Admin</Text>
        </Group>
      </AppShell.Header>

      <AppShell.Navbar p="md">
        <AppShell.Section grow>
          {NAV_ITEMS.filter(i => !i.adminOnly || user.role === 'admin').map(item => (
            <NavLink
              key={item.href}
              component={Link}
              href={item.href}
              label={item.label}
              leftSection={<item.icon size={18} stroke={1.5} />}
              active={
                item.href === '/'
                  ? pathname === '/'
                  : pathname === item.href || pathname.startsWith(item.href + '/')
              }
              variant="light"
              mb={4}
            />
          ))}
        </AppShell.Section>

        <AppShell.Section>
          <Stack gap="xs" pt="md" style={{ borderTop: '1px solid var(--mantine-color-gray-3)' }}>
            <Group>
              <Avatar color="blue" radius="xl" size="md">{initials}</Avatar>
              <div style={{ flex: 1, minWidth: 0 }}>
                <Text size="sm" fw={500} truncate>{user.name}</Text>
                <Text size="xs" c="dimmed" truncate>{user.email}</Text>
              </div>
            </Group>
            <Group justify="space-between">
              <Badge color={ROLE_COLOR[user.role] || 'gray'} variant="light" size="sm">
                {user.role}
              </Badge>
              <ActionIcon
                variant="subtle"
                color="red"
                onClick={() => { logout(); router.push('/login'); }}
                title="Đăng xuất"
              >
                <IconLogout size={16} />
              </ActionIcon>
            </Group>
          </Stack>
        </AppShell.Section>
      </AppShell.Navbar>

      <AppShell.Main>
        {children}
      </AppShell.Main>
    </AppShell>
  );
}
