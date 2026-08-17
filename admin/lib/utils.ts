const IMAGE_URL = process.env.NEXT_PUBLIC_IMAGE_URL?.replace(/\/+$/, '');

export function resolveImageUrl(path: string): string {
  if (!IMAGE_URL) return path;

  try {
    const url = new URL(path, 'http://relative.local');
    if (url.pathname.startsWith('/uploads/')) {
      return `${IMAGE_URL}${url.pathname}${url.search}${url.hash}`;
    }
  } catch {
    return path;
  }

  return path;
}
