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
