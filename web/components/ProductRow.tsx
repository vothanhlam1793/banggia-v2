'use client'

import { memo } from 'react'
import { Table, Text, Group, Badge, Image } from '@mantine/core'
import { IconPackage } from '@tabler/icons-react'
import { displayPrice } from '@/lib/utils'
import type { Product } from '@/lib/types'

const ProductRow = memo(function ProductRow({ p, onClick }: { p: Product; onClick: (p: Product) => void }) {
  const dp = displayPrice(p.prices)
  return (
    <Table.Tr onClick={() => { window.umami?.track('view-product', { code: p.code, name: p.name || '' }); onClick(p); }} style={{ cursor: 'pointer' }}>
      <Table.Td>
        {p.imageUrl ? (
          <Image
            src={p.imageUrl}
            alt={p.name || ''}
            w={48}
            h={48}
            radius="sm"
            fit="cover"
            style={{ display: 'block' }}
            onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
          />
        ) : (
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: 'var(--mantine-radius-sm)',
              background: 'var(--mantine-color-gray-1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <IconPackage size={24} color="var(--mantine-color-gray-5)" />
          </div>
        )}
      </Table.Td>
      <Table.Td>
        <Text fw={500}>{p.name}</Text>
        <Group gap="xs" mt={4}>
          {p.brand && <Text size="xs" c="dimmed">{p.brand}</Text>}
          {p.code && (
            <Text size="xs" c="dimmed" ff="monospace">
              ({p.code})
            </Text>
          )}
        </Group>
        {(p.tags || []).length > 0 && (
          <Group gap={4} mt={4}>
            {p.tags!.map((t: string) => (
              <Badge key={t} variant="light" color={t === 'khuyen-mai' ? 'red' : 'gray'} size="xs">
                {t}
              </Badge>
            ))}
          </Group>
        )}
        {p.campaigns && p.campaigns.length > 0 && (
          <Group gap={4} mt={4}>
            {p.campaigns.map((c) => (
              <Badge key={c._id || c.name} variant="light" color="orange" size="xs">
                {c.name}
              </Badge>
            ))}
          </Group>
        )}
      </Table.Td>
      <Table.Td ta="right">
        <Group gap={4} justify="flex-end" wrap="nowrap">
          {dp.label && (
            <Badge variant="light" color={dp.color} size="xs">
              {dp.label}
            </Badge>
          )}
          <Text fw={600} size="sm" c={dp.color}>
            {dp.value}
          </Text>
        </Group>
      </Table.Td>
    </Table.Tr>
  )
})

export default ProductRow
