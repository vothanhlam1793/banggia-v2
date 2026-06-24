export interface Product {
  _id: string
  id?: string
  name: string
  code: string
  brand?: string
  group?: string
  category?: string
  description?: string
  imageUrl?: string
  images?: string[]
  prices?: Record<string, number>
  specs?: Record<string, unknown>
  tags?: string[]
  campaigns?: Campaign[]
}

export interface Campaign {
  _id?: string
  name: string
  targetCustomer?: string
  targetMargin?: number
  note?: string
}

export interface PaginatedResponse<T> {
  data: T[]
  pagination: {
    total: number
    totalPages: number
    page: number
    limit: number
  }
}

export type SpecValue = string | number | boolean | null | undefined | Record<string, unknown> | SpecValue[]
