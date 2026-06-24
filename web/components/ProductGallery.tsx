'use client'

import { useState } from 'react'
import { Image, Stack, Group, Card } from '@mantine/core'
import { IconPackage } from '@tabler/icons-react'

export default function ProductGallery({
  images,
  name,
  height = 250,
  className,
}: {
  images: string[]
  name: string
  height?: number
  className?: string
}) {
  const [activeIdx, setActiveIdx] = useState(0)

  if (images.length === 0) {
    return (
      <Card withBorder className={className}
        style={{ height, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      >
        <IconPackage size={64} color="var(--mantine-color-gray-4)" />
      </Card>
    )
  }

  return (
    <Stack gap="xs" className={className}>
      <Card withBorder padding={0} style={{ overflow: 'hidden' }}>
        <Image
          src={images[activeIdx]}
          alt={name}
          h={height}
          fit="contain"
          fallbackSrc={`data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='${height}' viewBox='0 0 400 ${height}'%3E%3Crect fill='%23f1f3f5' width='400' height='${height}'/%3E%3Ctext x='200' y='185' text-anchor='middle' fill='%23adb5bd' font-size='48'%3E📦%3C/text%3E%3C/svg%3E`}
        />
      </Card>
      {images.length > 1 && (
        <Group gap={4} style={{ overflowX: 'auto', flexWrap: 'nowrap' }}>
          {images.map((url, idx) => (
            <Image
              key={idx}
              src={url}
              alt={`${name} ${idx + 1}`}
              w={56}
              h={56}
              radius="sm"
              fit="cover"
              style={{
                cursor: 'pointer',
                flexShrink: 0,
                border: idx === activeIdx ? '2px solid var(--mantine-color-blue-5)' : '2px solid transparent',
              }}
              onClick={() => setActiveIdx(idx)}
              fallbackSrc="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='56' height='56'%3E%3Crect fill='%23f1f3f5' width='56' height='56'/%3E%3C/svg%3E"
            />
          ))}
        </Group>
      )}
    </Stack>
  )
}
