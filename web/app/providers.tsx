'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useState, type ReactNode } from 'react'
import { ModalProvider } from '@/lib/modal-context'
import ProductDetailModal from './ProductModal'
import PrefetchProducts from '@/components/PrefetchProducts'

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            refetchOnWindowFocus: false,
            retry: 1,
          },
        },
      })
  )

  return (
    <QueryClientProvider client={queryClient}>
      <ModalProvider>
        {children}
        <ProductDetailModal />
      </ModalProvider>
      <PrefetchProducts />
    </QueryClientProvider>
  )
}
