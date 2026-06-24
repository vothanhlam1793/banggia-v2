import type { Metadata } from 'next'
import Link from 'next/link'
import { Container, Group, Text, Anchor, Button, SimpleGrid, Stack, Card, Badge } from '@mantine/core'
import { IconArrowLeft, IconCopy, IconCheck } from '@tabler/icons-react'
import { notFound } from 'next/navigation'
import { fetchProduct } from '@/lib/data'
import { fmt } from '@/lib/utils'
import ProductGallery from '@/components/ProductGallery'
import SpecsCard from '@/components/SpecsCard'
import CampaignBadges from '@/components/CampaignBadges'
import CopyButton from './CopyButton'

export async function generateMetadata({ params }: { params: Promise<{ code: string }> }): Promise<Metadata> {
  const { code } = await params
  const product = await fetchProduct(code)
  if (!product) return { title: 'Không tìm thấy - Bảng giá' }
  return {
    title: `${product.name} - Bảng giá Creta`,
    description: `${product.name} - ${product.brand || ''} - Giá bán: ${product.prices?.['L4'] ? fmt(product.prices['L4']) : 'Liên hệ'}`,
  }
}

export default async function ProductDetailPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params
  const product = await fetchProduct(code)
  if (!product) notFound()

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
        <Link href="/" style={{ color: 'var(--mantine-color-dimmed)', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
          <IconArrowLeft size={14} /> Bảng giá
        </Link>
        <Anchor href="https://nlmt.creta.vn" target="_blank" rel="noopener noreferrer" c="dimmed" size="sm">
          Đèn NLMT
        </Anchor>
        <CopyButton code={code} />
      </Group>

      <SimpleGrid cols={{ base: 1, md: 12 }} spacing="lg">
        <Stack gap="lg" style={{ gridColumn: 'span 9' }}>
          <div>
            <Text fw={700} size="xl">{product.name}</Text>
          </div>

          <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
            <ProductGallery images={allImages} name={product.name} height={350} />

            <Stack gap="md">
              <Card withBorder>
                <Text size="sm" c="dimmed" mb={4}>Giá bán</Text>
                {product.prices?.['L4'] ? (
                  <Text fw={700} size="xl" c="blue">{fmt(product.prices['L4'])}</Text>
                ) : product.prices?.['L5'] ? (
                  <Group gap="xs">
                    <Badge variant="light" color="orange" size="sm">Tham khảo</Badge>
                    <Text fw={700} size="xl" c="orange">{fmt(product.prices['L5'])}</Text>
                  </Group>
                ) : (
                  <Text fw={500} size="lg" c="dimmed">Liên hệ</Text>
                )}
              </Card>

              <Card withBorder>
                <SimpleGrid cols={2} spacing="sm">
                  <div>
                    <Text size="xs" c="dimmed">Mã sản phẩm</Text>
                    <Text ff="monospace" fw={500} size="sm">{product.code}</Text>
                  </div>
                  <div>
                    <Text size="xs" c="dimmed">Hãng</Text>
                    <Text fw={500} size="sm">{product.brand || '—'}</Text>
                  </div>
                  <div>
                    <Text size="xs" c="dimmed">Nhóm</Text>
                    <Text fw={500} size="sm">{product.group || '—'}</Text>
                  </div>
                  <div>
                    <Text size="xs" c="dimmed">Danh mục</Text>
                    <Text fw={500} size="sm">{product.category || '—'}</Text>
                  </div>
                </SimpleGrid>
              </Card>

              {product.campaigns && product.campaigns.length > 0 && (
                <Card withBorder>
                  <Text size="xs" c="dimmed" mb="xs">Chương trình</Text>
                  <CampaignBadges campaigns={product.campaigns} compact />
                </Card>
              )}

              {(product.tags || []).length > 0 && (
                <Group gap={4}>
                  {product.tags!.map((t: string) => (
                    <Badge key={t} variant="light" color="gray" size="sm">{t}</Badge>
                  ))}
                </Group>
              )}
            </Stack>
          </SimpleGrid>

          <SpecsCard specs={product.specs} />

          {product.description && (
            <Card withBorder>
              <Text fw={600} mb="xs">Mô tả</Text>
              <Text size="sm" style={{ whiteSpace: 'pre-wrap' }}>{product.description}</Text>
            </Card>
          )}
        </Stack>

        <div style={{ gridColumn: 'span 3' }} />
      </SimpleGrid>
    </Container>
  )
}
