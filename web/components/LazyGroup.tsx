'use client'

import { useState, useEffect, useRef } from 'react'
import { Group, Title, Badge } from '@mantine/core'
import type { Product } from '@/lib/types'
import ProductTable from './ProductTable'

export default function LazyGroup({
  group,
  items,
  onProductClick,
}: {
  group: string
  items: Product[]
  onProductClick: (p: Product) => void
}) {
  const [visible, setVisible] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setVisible(true)
      },
      { rootMargin: '400px' }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  return (
    <div ref={ref} style={{ marginBottom: '2rem' }}>
      <Group mb="sm">
        <Title order={3}>{group}</Title>
        <Badge variant="light" color="gray" size="lg">
          {items.length}
        </Badge>
      </Group>
      {visible && <ProductTable items={items} onProductClick={onProductClick} />}
    </div>
  )
}
