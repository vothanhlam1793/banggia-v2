'use client'

import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useCallback } from 'react'
import { apiRequest } from './api'
import type { Product, PaginatedResponse } from './types'

const PAGE_SIZE = 200

export function useProducts(initialData?: Product[]) {
  return useQuery({
    queryKey: ['products', 'active'],
    queryFn: async () => {
      const first = await apiRequest<PaginatedResponse<Product>>('GET', '/products', {
        isPublic: true,
        status: 'ACTIVE',
        limit: PAGE_SIZE,
        page: 1,
      }, { raw: true })

      let all: Product[] = first.data || []
      const totalPages = first.pagination?.totalPages || 1

      if (totalPages > 1) {
        const batch = []
        for (let p = 2; p <= totalPages; p++) {
          batch.push(
            apiRequest<PaginatedResponse<Product>>('GET', '/products', {
              isPublic: true,
              status: 'ACTIVE',
              limit: PAGE_SIZE,
              page: p,
            }, { raw: true })
          )
        }
        const results = await Promise.all(batch)
        for (const r of results) {
          all = [...all, ...(r.data || [])]
        }
      }

      return all
    },
    staleTime: 5 * 60 * 1000,
    initialData,
  })
}

export function useProduct(code: string) {
  return useQuery({
    queryKey: ['product', code],
    queryFn: () => apiRequest<Product>('GET', `/products/${code}`),
    enabled: !!code,
    staleTime: 5 * 60 * 1000,
  })
}

export function usePrefetchProducts() {
  const queryClient = useQueryClient()
  return useCallback(() => {
    queryClient.prefetchQuery({
      queryKey: ['products', 'active'],
      queryFn: async () => {
        const first = await apiRequest<PaginatedResponse<Product>>('GET', '/products', {
          isPublic: true,
          status: 'ACTIVE',
          limit: PAGE_SIZE,
          page: 1,
        }, { raw: true })

        let all: Product[] = first.data || []
        const totalPages = first.pagination?.totalPages || 1

        if (totalPages > 1) {
          const batch = []
          for (let p = 2; p <= totalPages; p++) {
            batch.push(
              apiRequest<PaginatedResponse<Product>>('GET', '/products', {
                isPublic: true,
                status: 'ACTIVE',
                limit: PAGE_SIZE,
                page: p,
              }, { raw: true })
            )
          }
          const results = await Promise.all(batch)
          for (const r of results) {
            all = [...all, ...(r.data || [])]
          }
        }

        return all
      },
      staleTime: 5 * 60 * 1000,
    })
  }, [queryClient])
}
