'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import {
  Container,
  Paper,
  Title,
  TextInput,
  PasswordInput,
  Button,
  Alert,
  Stack,
  Text,
} from '@mantine/core';
import { IconAlertCircle } from '@tabler/icons-react';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login, user, loading: authLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!authLoading && user) router.push('/');
  }, [user, authLoading, router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    const err = await login(email, password);
    setLoading(false);
    if (err) setError(err);
    else router.push('/');
  }

  if (authLoading) return (
    <Container size="xs" py="xl">
      <Text ta="center" c="dimmed">Đang tải...</Text>
    </Container>
  );
  if (user) return null;

  return (
    <Container size="xs" py="xl" mt="10vh">
      <Paper radius="md" p="xl" withBorder shadow="md">
        <Title order={2} ta="center" mb="lg">BangGia Admin</Title>

        {error && (
          <Alert icon={<IconAlertCircle size={16} />} color="red" mb="md">
            {error}
          </Alert>
        )}

        <form onSubmit={handleSubmit}>
          <Stack>
            <TextInput
              label="Email"
              placeholder="admin@banggia.vn"
              value={email}
              onChange={e => setEmail(e.currentTarget.value)}
              required
              autoComplete="email"
            />
            <PasswordInput
              label="Mật khẩu"
              placeholder="••••••••"
              value={password}
              onChange={e => setPassword(e.currentTarget.value)}
              required
              autoComplete="current-password"
            />
            <Button type="submit" loading={loading} fullWidth mt="md">
              Đăng nhập
            </Button>
          </Stack>
        </form>
      </Paper>
    </Container>
  );
}
