'use client'

import { useState, useMemo, useCallback, useEffect, useRef } from 'react'
import Link from 'next/link'
import { Container, Group, Text, Title, Anchor, Button } from '@mantine/core'
import type { Product } from '@/lib/types'
import { useModal } from '@/lib/modal-context'
import { useProducts } from '@/lib/queries'
import LazyGroup from '@/components/LazyGroup'
import SkeletonTable from '@/components/SkeletonTable'
import ProductTable from '@/components/ProductTable'
import SearchBar from '@/components/SearchBar'

export default function HomePageClient() {
  const { data: products = [], isLoading, error, refetch } = useProducts()
  const [search, setSearch] = useState('')
  const [activeTag, setActiveTag] = useState('')
  const { openModal } = useModal()

  const allTags = useMemo(() => {
    const ts = new Set<string>()
    products.forEach((p) => (p.tags || []).forEach((t: string) => ts.add(t)))
    return [...ts].sort()
  }, [products])

  const filtered = useMemo(() => {
    let result = products
    if (activeTag) result = result.filter((p) => (p.tags || []).includes(activeTag))
    if (search.trim()) {
      const q = search.trim().toLowerCase()
      result = result.filter((p: Product) =>
        [p.name, p.code, p.group, p.brand]
          .filter((s): s is string => typeof s === 'string')
          .some((s) => s.toLowerCase().includes(q))
      )
    }
    return result
  }, [products, search, activeTag])

  const groups = useMemo(() => {
    const map = new Map<string, Product[]>()
    for (const p of filtered) {
      const g = p.group || 'Khác'
      if (!map.has(g)) map.set(g, [])
      map.get(g)!.push(p)
    }
    return [...map.entries()].sort(
      (a, b) => b[1].length - a[1].length || a[0].localeCompare(b[0])
    )
  }, [filtered])

  const handleProductClick = useCallback(
    (p: Product) => {
      openModal(p)
    },
    [openModal]
  )

  const searchActive = search.trim().length > 0

  const searchTimerRef = useRef<ReturnType<typeof setTimeout>>(null)
  useEffect(() => {
    if (searchActive) {
      if (searchTimerRef.current) clearTimeout(searchTimerRef.current)
      searchTimerRef.current = setTimeout(() => {
        window.umami?.track('search', { query: search.trim() })
      }, 800)
    }
    return () => {
      if (searchTimerRef.current) clearTimeout(searchTimerRef.current)
    }
  }, [search, searchActive])

  useEffect(() => {
    if (activeTag) {
      window.umami?.track('filter-tag', { tag: activeTag })
    }
  }, [activeTag])

  return (
    <Container fluid px={{ base: 'sm', sm: 'lg' }} py="md">
      <Group
        mb="lg"
        pb="sm"
        style={{ borderBottom: '1px solid var(--mantine-color-gray-3)' }}
      >
        <Anchor component={Link} href="/" c="blue" fw={500}>
          Bảng giá
        </Anchor>
        <Anchor href="https://nlmt.creta.vn" target="_blank" c="dimmed">
          Đèn NLMT
        </Anchor>
        <Anchor component={Link} href="/info" c="dimmed">
          Liên hệ mua hàng
        </Anchor>
        <Text ml="auto" size="sm" c="dimmed">
          {filtered.length.toLocaleString()} sản phẩm
        </Text>
      </Group>

      {error && (
        <Group justify="center" py="xl">
          <div style={{ textAlign: 'center' }}>
            <Text c="red" size="sm" mb="md">
              {(error as Error).message || 'Lỗi tải dữ liệu'}
            </Text>
            <Button variant="light" color="red" size="sm" onClick={() => refetch()}>
              Thử lại
            </Button>
          </div>
        </Group>
      )}

      <SearchBar
        search={search}
        onSearchChange={setSearch}
        tags={allTags}
        activeTag={activeTag}
        onTagChange={setActiveTag}
        resultCount={products.length}
      />

      {isLoading && <SkeletonTable />}

      {!isLoading && searchActive && filtered.length > 0 && (
        <div style={{ marginBottom: '2rem' }}>
          <Group mb="sm">
            <Title order={3}>Kết quả: {filtered.length} sản phẩm</Title>
          </Group>
          <ProductTable
            items={filtered.slice(0, 200)}
            onProductClick={handleProductClick}
          />
          {filtered.length > 200 && (
            <Text size="sm" c="dimmed" ta="center" mt="sm">
              + {filtered.length - 200} kết quả khác trong các nhóm bên dưới
            </Text>
          )}
        </div>
      )}

      {!isLoading &&
        groups.map(([group, items]) => (
          <LazyGroup
            key={group}
            group={group}
            items={items}
            onProductClick={handleProductClick}
          />
        ))}

      {!isLoading && filtered.length === 0 && !error && (
        <Text ta="center" py="xl" c="dimmed">
          Không tìm thấy sản phẩm
        </Text>
      )}
    </Container>
  )
}
