'use client'

import { useState, useEffect } from 'react'
import { Modal, Stack, Card, Text, SimpleGrid, Group, Badge, Button, LoadingOverlay } from '@mantine/core'
import { IconCopy, IconCheck } from '@tabler/icons-react'
import { fmt } from '@/lib/utils'
import { PRICE_LABELS } from '@/lib/constants'
import { useModal } from '@/lib/modal-context'
import ProductGallery from '@/components/ProductGallery'
import SpecsCard from '@/components/SpecsCard'
import CampaignBadges from '@/components/CampaignBadges'

export default function ProductDetailModal() {
  const { open, product, isLoading, closeModal, dismissLoading } = useModal()
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (open) {
      const t = setTimeout(() => dismissLoading(), 150)
      return () => clearTimeout(t)
    }
  }, [open, dismissLoading])

  function handleCopy() {
    if (!product?.code) return
    const url = `https://banggia.creta.vn/${product.code}`
    navigator.clipboard
      .writeText(url)
      .then(() => {
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
      })
      .catch(() => {})
  }

  if (!product) return null

  const allImages =
    product.images && product.images.length > 0
      ? product.images
      : product.imageUrl
        ? [product.imageUrl]
        : []

  return (
    <Modal
      opened={open}
      onClose={closeModal}
      title={product.name}
      size="lg"
      centered
    >
      <LoadingOverlay
        visible={isLoading}
        zIndex={1000}
        overlayProps={{ radius: 'md', blur: 2 }}
        loaderProps={{ type: 'oval', size: 'md' }}
      />
      <Stack gap="md">
        <ProductGallery images={allImages} name={product.name} height={250} />

        <Card withBorder>
          <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="sm">
            <div>
              <Text size="xs" c="dimmed">
                Mã sản phẩm
              </Text>
              <Text ff="monospace" fw={500}>
                {product.code}
              </Text>
            </div>
            <div>
              <Text size="xs" c="dimmed">
                Hãng
              </Text>
              <Text fw={500}>{product.brand || '—'}</Text>
            </div>
            <div>
              <Text size="xs" c="dimmed">
                Nhóm
              </Text>
              <Text fw={500}>{product.group || '—'}</Text>
            </div>
            <div>
              <Text size="xs" c="dimmed">
                Danh mục
              </Text>
              <Text fw={500}>{product.category || '—'}</Text>
            </div>
          </SimpleGrid>
        </Card>

        {product.prices && Object.keys(product.prices).length > 0 && (
          <Card withBorder>
            <Text fw={600} mb="sm">
              Bảng giá
            </Text>
            <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="sm">
              {Object.entries(product.prices).map(([level, price]) => (
                <Group key={level} justify="space-between">
                  <Text size="sm" c="dimmed">
                    {PRICE_LABELS[level] || level}
                  </Text>
                  <Text fw={600} c="blue">
                    {fmt(price)}
                  </Text>
                </Group>
              ))}
            </SimpleGrid>
          </Card>
        )}

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

        <SpecsCard specs={product.specs} />

        {product.campaigns && product.campaigns.length > 0 && (
          <Card withBorder>
            <Text fw={600} mb="xs">
              Chương trình
            </Text>
            <CampaignBadges campaigns={product.campaigns} />
          </Card>
        )}

        {(product.tags || []).length > 0 && (
          <Group gap={4}>
            {(product.tags || []).map((t: string) => (
              <Badge
                key={t}
                variant="light"
                color={t === 'khuyen-mai' ? 'red' : 'gray'}
              >
                {t}
              </Badge>
            ))}
          </Group>
        )}

        <Button
          variant="light"
          color={copied ? 'green' : 'gray'}
          size="sm"
          leftSection={copied ? <IconCheck size={14} /> : <IconCopy size={14} />}
          onClick={handleCopy}
          fullWidth
        >
          {copied ? 'Đã copy link' : 'Sao chép link sản phẩm'}
        </Button>
      </Stack>
    </Modal>
  )
}
