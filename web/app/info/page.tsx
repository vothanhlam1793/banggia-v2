'use client';

import Link from 'next/link';
import { Container, Group, Anchor, Title, Card, Text, Stack, Divider } from '@mantine/core';

export default function InfoPage() {
  return (
    <Container fluid px="lg" py="md">
      <Group mb="lg" pb="sm" style={{ borderBottom: '1px solid var(--mantine-color-gray-3)' }}>
        <Anchor component={Link} href="/" c="dimmed">Bảng giá</Anchor>
        <Anchor component={Link} href="/info" c="blue" fw={500}>Liên hệ mua hàng</Anchor>
      </Group>

      <Card withBorder shadow="sm" p="xl">
        <Title order={2} mb="lg">Thông tin liên hệ</Title>

        <Stack gap="md">
          <div>
            <Text fw={600} c="dimmed" size="sm">Địa chỉ</Text>
            <Text>40 Bảy Hiền, P.11, Tân Bình, TP. Hồ Chí Minh</Text>
          </div>

          <div>
            <Text fw={600} c="dimmed" size="sm">Kinh doanh</Text>
            <Group gap="sm">
              <Anchor href="tel:0869270717" c="blue" fw={500}>0869.27.07.17</Anchor>
              <Anchor href="https://zalo.me/0869270717" c="blue" size="sm">Zalo</Anchor>
            </Group>
          </div>

          <div>
            <Text fw={600} c="dimmed" size="sm">Kỹ thuật</Text>
            <Group gap="sm">
              <Anchor href="tel:0862270717" c="blue" fw={500}>0862.27.07.17</Anchor>
              <Anchor href="https://zalo.me/0862270717" c="blue" size="sm">Zalo</Anchor>
            </Group>
          </div>

          <Divider mt="md" />

          <Text c="dimmed" size="sm" fs="italic">
            Cảm ơn quý khách đã tin tưởng và ủng hộ Creta Shop!
          </Text>
        </Stack>
      </Card>
    </Container>
  );
}
