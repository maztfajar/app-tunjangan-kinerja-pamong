/**
 * Membangun URL redirect absolut yang kompatibel dengan Cloudflare Tunnel / Reverse Proxy.
 * Mencegah redirect salah sasaran ke http://localhost:3000 pada browser client.
 */
export function createRedirectUrl(path: string, request: Request): URL {
  const forwardedHost =
    request.headers.get('x-forwarded-host') ||
    request.headers.get('host');
  const forwardedProto =
    request.headers.get('x-forwarded-proto') ||
    (request.headers.get('referer')?.startsWith('https://') ? 'https' : 'http') ||
    'https';

  if (forwardedHost && !forwardedHost.includes('localhost') && !forwardedHost.includes('127.0.0.1')) {
    return new URL(path, `${forwardedProto}://${forwardedHost}`);
  }

  return new URL(path, request.url);
}
