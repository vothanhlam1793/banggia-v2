'use client'

import { useEffect } from 'react'
import { usePrefetchProducts } from '@/lib/queries'

export default function PrefetchProducts() {
  const prefetch = usePrefetchProducts()

  useEffect(() => {
    prefetch()
  }, [prefetch])

  return null
}
