const API_URL = process.env.NEXT_PUBLIC_API_URL || '/api/v1'

export async function apiRequest<T = unknown>(
  method: string,
  path: string,
  body?: Record<string, unknown>,
  opts?: { raw?: boolean }
): Promise<T> {
  const headers: Record<string, string> = {}

  let url = `${API_URL}${path}`
  const options: RequestInit = { method, headers }

  if (body) {
    if (method === 'GET') {
      const params = new URLSearchParams()
      for (const [k, v] of Object.entries(body)) {
        if (v != null && v !== '') params.set(k, String(v))
      }
      url += '?' + params.toString()
    } else {
      headers['Content-Type'] = 'application/json'
      options.body = JSON.stringify(body)
    }
  }

  const res = await fetch(url, options).catch(() => {
    throw new Error('Không thể kết nối đến server')
  })

  const json = await res.json().catch(() => null)

  if (!res.ok || !json?.ok) throw new Error(json?.error || 'Lỗi tải dữ liệu')

  if (opts?.raw) return json as T
  return json.data as T
}
