'use client'

import { Card, Text, Group } from '@mantine/core'
import { SPEC_FIELDS } from '@/lib/constants'
import type { SpecValue } from '@/lib/types'

export default function SpecsCard({ specs }: { specs?: Record<string, unknown> }) {
  if (!specs) return null
  const rows = SPEC_FIELDS.filter((f) => specs[f.key] != null && specs[f.key] !== '')
  if (rows.length === 0) return null

  return (
    <Card withBorder>
      <Text fw={600} mb="sm">
        Thông số kỹ thuật
      </Text>
      <Group gap={8} wrap="wrap">
        {rows.map((f) => (
          <span
            key={f.key}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              columnGap: '6px',
              background: 'var(--mantine-color-gray-0)',
              borderRadius: '6px',
              padding: '6px 12px',
              border: '1px solid var(--mantine-color-gray-3)',
              fontSize: '13px',
            }}
          >
            <Text span size="xs" c="dimmed" fw={500}>
              {f.label}
            </Text>
            <Text span size="sm" fw={600}>
              {f.render(specs[f.key] as SpecValue)}
            </Text>
          </span>
        ))}
      </Group>
    </Card>
  )
}
