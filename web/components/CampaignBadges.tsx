'use client'

import { Group, Text } from '@mantine/core'
import type { Campaign } from '@/lib/types'

export default function CampaignBadges({
  campaigns,
  compact,
}: {
  campaigns: Campaign[]
  compact?: boolean
}) {
  if (!campaigns || campaigns.length === 0) return null

  return (
    <Group gap={8} wrap="wrap">
      {campaigns.map((c) => (
        <span
          key={c._id || c.name}
          style={{
            display: 'inline-flex',
            flexDirection: 'column',
            rowGap: compact ? '2px' : '4px',
            background: 'var(--mantine-color-orange-0)',
            borderRadius: '8px',
            padding: compact ? '6px 12px' : '8px 14px',
            border: '1px solid var(--mantine-color-orange-2)',
          }}
        >
          <Text fw={600} size="sm" c="orange">
            {c.name}
          </Text>
          {c.targetCustomer && !compact && (
            <Text size="xs" c="dimmed">
              KH: {c.targetCustomer}
            </Text>
          )}
          {c.targetMargin != null && (
            <Text size="xs" c="dimmed">
              Margin: {c.targetMargin}%
            </Text>
          )}
          {c.note && (
            <Text size="xs" c="dimmed">
              {c.note}
            </Text>
          )}
        </span>
      ))}
    </Group>
  )
}
