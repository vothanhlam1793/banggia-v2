'use client'

import { TextInput, Badge, Group } from '@mantine/core'
import { IconSearch } from '@tabler/icons-react'

export default function SearchBar({
  search,
  onSearchChange,
  tags,
  activeTag,
  onTagChange,
  resultCount,
}: {
  search: string
  onSearchChange: (v: string) => void
  tags: string[]
  activeTag: string
  onTagChange: (tag: string) => void
  resultCount: number
}) {
  return (
    <div
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 10,
        background: 'var(--mantine-color-gray-0)',
        paddingBottom: '8px',
      }}
    >
      <TextInput
        value={search}
        onChange={(e) => onSearchChange(e.currentTarget.value)}
        placeholder="Nhập tên, mã hoặc hãng sản phẩm..."
        leftSection={<IconSearch size={18} />}
        size="lg"
        mb="md"
      />

      {tags.length > 0 && (
        <Group gap={4} mb="lg">
          <Badge
            variant={activeTag ? 'light' : 'filled'}
            color={activeTag ? 'gray' : 'blue'}
            style={{ cursor: 'pointer' }}
            onClick={() => onTagChange('')}
            size="lg"
          >
            Tất cả {resultCount ? `(${resultCount})` : ''}
          </Badge>
          {tags.map((tag) => (
            <Badge
              key={tag}
              variant={tag === activeTag ? 'filled' : 'light'}
              color={tag === activeTag ? 'blue' : 'gray'}
              style={{ cursor: 'pointer' }}
              onClick={() => onTagChange(tag === activeTag ? '' : tag)}
              size="lg"
            >
              {tag}
            </Badge>
          ))}
        </Group>
      )}
    </div>
  )
}
