'use client'

import { useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Modal, LoadingOverlay } from '@mantine/core'
import { useProduct } from '@/lib/queries'
import ProductDetailUI from '@/app/_components/ProductDetailUI'

export default function ProductModalPage() {
  const { code } = useParams<{ code: string }>()
  const router = useRouter()
  const { data: product, isLoading } = useProduct(code)

  useEffect(() => {
    if (product) {
      window.umami?.track('product-detail', { code })
    }
  }, [code, product])

  function handleClose() {
    router.back()
  }

  return (
    <Modal
      opened
      onClose={handleClose}
      title={product?.name || 'Đang tải...'}
      size="lg"
      centered
    >
      {isLoading && (
        <LoadingOverlay
          visible
          zIndex={1000}
          overlayProps={{ radius: 'md', blur: 2 }}
          loaderProps={{ type: 'oval', size: 'md' }}
        />
      )}
      {!isLoading && !product && (
        <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--mantine-color-red-6)' }}>
          Không tìm thấy sản phẩm
        </div>
      )}
      {product && <ProductDetailUI product={product} compact />}
    </Modal>
  )
}
