export function resolveMediaUrl(value: unknown): string | undefined {
  if (typeof value === 'string' && value.trim() !== '') {
    const serverUrl = process.env.NEXT_PUBLIC_SERVER_URL
    if (serverUrl && value.startsWith(serverUrl)) {
      return value.replace(serverUrl, '')
    }
    return value
  }
  if (!value || typeof value !== 'object') return undefined

  const url = (value as { url?: unknown }).url
  if (typeof url === 'string' && url.trim() !== '') {
    const serverUrl = process.env.NEXT_PUBLIC_SERVER_URL
    if (serverUrl && url.startsWith(serverUrl)) {
      return url.replace(serverUrl, '')
    }
    return url
  }
  return undefined
}
