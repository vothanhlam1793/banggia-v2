const API_URL = process.env.NEXT_PUBLIC_API_URL || '/api/v1';
const TOKEN_KEY = 'banggiasi_token';

export class ApiError extends Error {
  constructor(message: string, public code: 'NETWORK' | 'AUTH' | 'SERVER') {
    super(message);
    this.name = 'ApiError';
  }
}

export function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
}

export async function apiRequest<T = any>(
  method: string,
  path: string,
  body?: Record<string, any>,
  opts?: { raw?: boolean }
): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;

  let url = `${API_URL}${path}`;
  let options: RequestInit = { method, headers };

  if (body) {
    if (method === 'GET') {
      const params = new URLSearchParams();
      for (const [k, v] of Object.entries(body)) {
        if (v != null && v !== '') params.set(k, String(v));
      }
      url += '?' + params.toString();
    } else {
      headers['Content-Type'] = 'application/json';
      options.body = JSON.stringify(body);
    }
  }

  const res = await fetch(url, options).catch(() => {
    throw new ApiError('Không thể kết nối đến server', 'NETWORK');
  });

  if (res.status === 401) throw new ApiError('Phiên đăng nhập hết hạn', 'AUTH');

  const json = await res.json().catch(() => null);

  if (!res.ok) throw new ApiError(json?.error || `Lỗi server (${res.status})`, 'SERVER');

  if (!json?.ok) throw new ApiError(json?.error || 'Lỗi không xác định', 'SERVER');

  if (opts?.raw) return json as T;
  return json.data as T;
}
