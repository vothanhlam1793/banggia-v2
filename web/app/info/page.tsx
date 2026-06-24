'use client'

import Link from 'next/link'
import { Container, Group, Anchor, Title, Card, Text, Stack, Divider, ThemeIcon } from '@mantine/core'
import {
  IconArrowLeft,
  IconMapPin,
  IconPhone,
  IconClock,
  IconWorld,
} from '@tabler/icons-react'

export default function InfoPage() {
  return (
    <Container fluid px="lg" py="md">
      <Group
        mb="lg"
        pb="sm"
        style={{ borderBottom: '1px solid var(--mantine-color-gray-3)' }}
      >
        <Anchor component={Link} href="/" c="dimmed">
          <Group gap={4}>
            <IconArrowLeft size={14} /> Bảng giá
          </Group>
        </Anchor>
        <Anchor component={Link} href="/info" c="blue" fw={500}>
          Liên hệ mua hàng
        </Anchor>
      </Group>

      <Card withBorder shadow="sm" p="xl">
        <Title order={2} mb="lg">
          Thông tin liên hệ
        </Title>

        <Stack gap="lg">
          <div>
            <Group gap={6} mb={4}>
              <ThemeIcon variant="light" color="gray" size="sm">
                <IconMapPin size={14} />
              </ThemeIcon>
              <Text fw={600} c="dimmed" size="sm">
                Địa chỉ
              </Text>
            </Group>
            <Text>572/15A7 Âu Cơ, Phường Bảy Hiền, Hồ Chí Minh</Text>
            <Anchor
              href="https://maps.app.goo.gl/huXgZpTDH3yrGSdE8"
              target="_blank"
              rel="noopener noreferrer"
              c="blue"
              size="sm"
              mt={4}
              display="inline-block"
            >
              Xem bản đồ
            </Anchor>
          </div>

          <div>
            <Group gap={6} mb={4}>
              <ThemeIcon variant="light" color="gray" size="sm">
                <IconClock size={14} />
              </ThemeIcon>
              <Text fw={600} c="dimmed" size="sm">
                Giờ làm việc
              </Text>
            </Group>
            <Text size="sm">
              Thứ 2 - Thứ 7: 8h - 18h
            </Text>
          </div>

          <Divider />

          <div>
            <Group gap={6} mb={4}>
              <ThemeIcon variant="light" color="green" size="sm">
                <IconPhone size={14} />
              </ThemeIcon>
              <Text fw={600} c="dimmed" size="sm">
                Kinh doanh
              </Text>
            </Group>
            <Stack gap={6} mt={4}>
              <Group gap="sm">
                <Anchor href="tel:0869270717" c="blue" fw={500}>
                  0869.27.07.17
                </Anchor>
                <Anchor href="https://zalo.me/0869270717" c="blue" size="sm" target="_blank" rel="noopener noreferrer">
                  Zalo
                </Anchor>
              </Group>
              <Group gap="sm">
                <Anchor href="tel:0334270717" c="blue" fw={500}>
                  0334.27.07.17
                </Anchor>
                <Anchor href="https://zalo.me/0334270717" c="blue" size="sm" target="_blank" rel="noopener noreferrer">
                  Zalo
                </Anchor>
              </Group>
            </Stack>
          </div>

          <div>
            <Group gap={6} mb={4}>
              <ThemeIcon variant="light" color="orange" size="sm">
                <IconPhone size={14} />
              </ThemeIcon>
              <Text fw={600} c="dimmed" size="sm">
                Kỹ thuật
              </Text>
            </Group>
            <Stack gap={6} mt={4}>
              <Group gap="sm">
                <Anchor href="tel:0862270717" c="blue" fw={500}>
                  0862.27.07.17
                </Anchor>
                <Anchor href="https://zalo.me/0862270717" c="blue" size="sm" target="_blank" rel="noopener noreferrer">
                  Zalo
                </Anchor>
              </Group>
              <Group gap="sm">
                <Anchor href="tel:0362697197" c="blue" fw={500}>
                  0362.69.71.97
                </Anchor>
                <Anchor href="https://zalo.me/0362697197" c="blue" size="sm" target="_blank" rel="noopener noreferrer">
                  Zalo
                </Anchor>
              </Group>
            </Stack>
          </div>

          <Divider />

          <div>
            <Group gap={6} mb={4}>
              <ThemeIcon variant="light" color="blue" size="sm">
                <IconWorld size={14} />
              </ThemeIcon>
              <Text fw={600} c="dimmed" size="sm">
                Website
              </Text>
            </Group>
            <Anchor
              href="https://creta.vn"
              target="_blank"
              rel="noopener noreferrer"
              c="blue"
              size="sm"
            >
              creta.vn
            </Anchor>
          </div>

          <Divider />

          <Text c="dimmed" size="sm" fs="italic">
            Cảm ơn quý khách đã tin tưởng và ủng hộ Creta Shop!
          </Text>
        </Stack>
      </Card>
    </Container>
  )
}
