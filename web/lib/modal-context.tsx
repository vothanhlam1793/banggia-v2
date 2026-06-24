'use client'

import { createContext, useContext, useState, useCallback, type ReactNode } from 'react'
import type { Product } from '@/lib/types'

interface ModalContextValue {
  open: boolean
  product: Product | null
  isLoading: boolean
  openModal: (p: Product) => void
  closeModal: () => void
  dismissLoading: () => void
}

const ModalContext = createContext<ModalContextValue | null>(null)

export function ModalProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false)
  const [product, setProduct] = useState<Product | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const openModal = useCallback((p: Product) => {
    setIsLoading(true)
    setProduct(p)
    setOpen(true)
  }, [])

  const closeModal = useCallback(() => {
    setOpen(false)
    setIsLoading(false)
  }, [])

  const dismissLoading = useCallback(() => {
    setIsLoading(false)
  }, [])

  return (
    <ModalContext value={{ open, product, isLoading, openModal, closeModal, dismissLoading }}>
      {children}
    </ModalContext>
  )
}

export function useModal() {
  const ctx = useContext(ModalContext)
  if (!ctx) throw new Error('useModal must be used within ModalProvider')
  return ctx
}
