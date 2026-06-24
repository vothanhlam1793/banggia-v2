'use client'

import { Table, Card } from '@mantine/core'

export default function SkeletonTable({ rows = 5 }: { rows?: number }) {
  return (
    <Card withBorder shadow="sm" padding={0}>
      <Table verticalSpacing="sm">
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
          {Array.from({ length: rows }).map((_, i) => (
            <Table.Tr key={i}>
              <Table.Td>
                <div
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: 4,
                    background: 'var(--mantine-color-gray-3)',
                  }}
                />
              </Table.Td>
              <Table.Td>
                <div
                  style={{
                    height: 16,
                    width: '60%',
                    background: 'var(--mantine-color-gray-3)',
                    borderRadius: 4,
                    marginBottom: 8,
                  }}
                />
                <div
                  style={{
                    height: 12,
                    width: '30%',
                    background: 'var(--mantine-color-gray-2)',
                    borderRadius: 4,
                  }}
                />
              </Table.Td>
              <Table.Td ta="right">
                <div
                  style={{
                    height: 16,
                    width: 80,
                    background: 'var(--mantine-color-gray-3)',
                    borderRadius: 4,
                    marginLeft: 'auto',
                  }}
                />
              </Table.Td>
            </Table.Tr>
          ))}
        </Table.Tbody>
      </Table>
    </Card>
  )
}
