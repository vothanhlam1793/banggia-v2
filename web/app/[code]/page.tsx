'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import {
  Container, Card, Text, Group, Badge, Stack, SimpleGrid, Anchor, Button,
} from '@mantine/core'
import { IconArrowLeft, IconCopy, IconCheck } from '@tabler/icons-react'
import { fmt } from '@/lib/utils'
import { useProduct } from '@/lib/queries'
import ProductGallery from '@/components/ProductGallery'
import SpecsCard from '@/components/SpecsCard'
import CampaignBadges from '@/components/CampaignBadges'

export default function ProductDetailPage() {
  const { code } = useParams<{ code: string }>()
  const { data: product, isLoading, error } = useProduct(code)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (product) {
      window.umami?.track('product-detail', { code })
    }
  }, [code, product])

  function handleCopy() {
    const url = `https://banggia.creta.vn/${code}`
    window.umami?.track('copy-link', { code })
    navigator.clipboard
      .writeText(url)
      .then(() => {
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
      })
      .catch(() => {})
  }

  if (isLoading) {
    return (
      <Container fluid px="lg" py="xl">
        <Text ta="center" c="dimmed">
          Đang tải...
        </Text>
      </Container>
    )
  }

  if (error || !product) {
    return (
      <Container fluid px="lg" py="xl">
        <Text ta="center" c="red">
          {error ? (error as Error).message : 'Không tìm thấy sản phẩm'}
        </Text>
        <Anchor
          component={Link}
          href="/"
          size="sm"
          ta="center"
          display="block"
          mt="md"
        >
          ← Về bảng giá
        </Anchor>
      </Container>
    )
  }

  const allImages =
    product.images && product.images.length > 0
      ? product.images
      : product.imageUrl
        ? [product.imageUrl]
        : []

  return (
    <Container fluid px="lg" py="md">
      <Group
        mb="md"
        pb="sm"
        style={{ borderBottom: '1px solid var(--mantine-color-gray-3)' }}
      >
        <Anchor component={Link} href="/" c="dimmed">
          <Group gap={4}>
            <IconArrowLeft size={14} /> Bảng giá
          </Group>
        </Anchor>
        <Anchor
          href="https://nlmt.creta.vn"
          target="_blank"
          c="dimmed"
          size="sm"
        >
          Đèn NLMT
        </Anchor>
        <Button
          variant="light"
          color={copied ? 'green' : 'gray'}
          size="xs"
          leftSection={copied ? <IconCheck size={14} /> : <IconCopy size={14} />}
          onClick={handleCopy}
          ml="auto"
        >
          {copied ? 'Đã copy' : 'Copy link'}
        </Button>
      </Group>

      <SimpleGrid cols={{ base: 1, md: 12 }} spacing="lg">
        <Stack gap="lg" style={{ gridColumn: 'span 9' }}>
          <div>
            <Text fw={700} size="xl">
              {product.name}
            </Text>
          </div>

          <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
            <ProductGallery images={allImages} name={product.name} height={350} />

            <Stack gap="md">
              <Card withBorder>
                <Text size="sm" c="dimmed" mb={4}>
                  Giá bán
                </Text>
                {product.prices?.['L4'] ? (
                  <Text fw={700} size="xl" c="blue">
                    {fmt(product.prices['L4'])}
                  </Text>
                ) : product.prices?.['L5'] ? (
                  <Group gap="xs">
                    <Badge variant="light" color="orange" size="sm">
                      Tham khảo
                    </Badge>
                    <Text fw={700} size="xl" c="orange">
                      {fmt(product.prices['L5'])}
                    </Text>
                  </Group>
                ) : (
                  <Text fw={500} size="lg" c="dimmed">
                    Liên hệ
                  </Text>
                )}
              </Card>

              <Card withBorder>
                <SimpleGrid cols={2} spacing="sm">
                  <div>
                    <Text size="xs" c="dimmed">
                      Mã sản phẩm
                    </Text>
                    <Text ff="monospace" fw={500} size="sm">
                      {product.code}
                    </Text>
                  </div>
                  <div>
                    <Text size="xs" c="dimmed">
                      Hãng
                    </Text>
                    <Text fw={500} size="sm">
                      {product.brand || '—'}
                    </Text>
                  </div>
                  <div>
                    <Text size="xs" c="dimmed">
                      Nhóm
                    </Text>
                    <Text fw={500} size="sm">
                      {product.group || '—'}
                    </Text>
                  </div>
                  <div>
                    <Text size="xs" c="dimmed">
                      Danh mục
                    </Text>
                    <Text fw={500} size="sm">
                      {product.category || '—'}
                    </Text>
                  </div>
                </SimpleGrid>
              </Card>

              {product.campaigns && product.campaigns.length > 0 && (
                <Card withBorder>
                  <Text size="xs" c="dimmed" mb="xs">
                    Chương trình
                  </Text>
                  <CampaignBadges campaigns={product.campaigns} compact />
                </Card>
              )}

              {(product.tags || []).length > 0 && (
                <Group gap={4}>
                  {(product.tags || []).map((t: string) => (
                    <Badge key={t} variant="light" color="gray" size="sm">
                      {t}
                    </Badge>
                  ))}
                </Group>
              )}
            </Stack>
          </SimpleGrid>

          <SpecsCard specs={product.specs} />

          {product.description && (
            <Card withBorder>
              <Text fw={600} mb="xs">
                Mô tả
              </Text>
              <Text size="sm" style={{ whiteSpace: 'pre-wrap' }}>
                {product.description}
              </Text>
            </Card>
          )}
        </Stack>

        <div style={{ gridColumn: 'span 3' }} />
      </SimpleGrid>
    </Container>
  )
}
