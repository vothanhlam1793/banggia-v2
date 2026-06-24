'use client'

import { Table, Card } from '@mantine/core'
import type { Product } from '@/lib/types'
import ProductRow from './ProductRow'

export default function ProductTable({
  items,
  onProductClick,
}: {
  items: Product[]
  onProductClick: (p: Product) => void
}) {
  return (
    <Card withBorder shadow="sm" padding={0}>
      <div style={{ overflowX: 'auto' }}>
        <Table verticalSpacing="sm" highlightOnHover>
          <Table.Thead>
            <Table.Tr>
              <Table.Th w={60}></Table.Th>
              <Table.Th>Tên sản phẩm</Table.Th>
              <Table.Th ta="right" w={150}>
                Giá
              </Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {items.map((p) => (
              <ProductRow key={p._id || p.id} p={p} onClick={onProductClick} />
            ))}
          </Table.Tbody>
        </Table>
      </div>
    </Card>
  )
}
