import type { Product, PaginatedResponse } from './types'

const API_URL = process.env.NEXT_PUBLIC_API_URL || '/api/v1'

async function fetchApi<T>(path: string, params?: Record<string, string>): Promise<T> {
  const base = process.env.BACKEND_INTERNAL_URL || 'http://localhost:10202'
  const url = new URL(`${API_URL}${path}`, base)
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      if (v) url.searchParams.set(k, v)
    }
  }
  const res = await fetch(url.toString())
  if (!res.ok) throw new Error('Lỗi tải dữ liệu')
  return res.json()
}

export async function fetchAllActiveProducts(): Promise<Product[]> {
  const PAGE_SIZE = 200
  const first = await fetchApi<PaginatedResponse<Product>>('/products', {
    isPublic: 'true',
    status: 'ACTIVE',
    limit: String(PAGE_SIZE),
    page: '1',
  })

  let all: Product[] = first.data || []
  const totalPages = first.pagination?.totalPages || 1

  if (totalPages > 1) {
    const batch = []
    for (let p = 2; p <= totalPages; p++) {
      batch.push(
        fetchApi<PaginatedResponse<Product>>('/products', {
          isPublic: 'true',
          status: 'ACTIVE',
          limit: String(PAGE_SIZE),
          page: String(p),
        })
      )
    }
    const results = await Promise.all(batch)
    for (const r of results) {
      all = [...all, ...(r.data || [])]
    }
  }

  return all
}

export async function fetchProduct(code: string): Promise<Product | null> {
  const res = await fetchApi<{ ok: boolean; data: Product }>(`/products/${code}`)
  return res.data || null
}
