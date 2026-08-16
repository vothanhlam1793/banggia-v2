export function fmt(n: number | null | undefined): string {
  if (n == null) return 'Liên hệ'
  return n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.') + 'đ'
}

export function displayPrice(prices?: Record<string, number>) {
  if (!prices) return { label: '', value: 'Liên hệ', color: 'dimmed' as const }
  if (prices['L4']) return { label: '', value: fmt(prices['L4']), color: 'blue' as const }
  if (prices['L5']) return { label: 'Tham khảo', value: fmt(prices['L5']), color: 'orange' as const }
  return { label: '', value: 'Liên hệ', color: 'dimmed' as const }
}

const IMAGE_URL = process.env.NEXT_PUBLIC_IMAGE_URL?.replace(/\/+$/, '')

export function resolveImageUrl(path: string): string {
  if (!IMAGE_URL) return path

  try {
    const url = new URL(path, 'http://relative.local')
    if (url.pathname.startsWith('/uploads/')) {
      return `${IMAGE_URL}${url.pathname}${url.search}${url.hash}`
    }
  } catch {
    return path
  }

  return path
}
