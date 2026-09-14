import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { createRedirectUrl } from '@/lib/url';

export function proxy(request: NextRequest) {
  const token = request.cookies.get('token')?.value;
  const { pathname } = request.nextUrl;

  // 1. Public routes (bebas diakses tanpa token)
  if (
    pathname === '/login' ||
    pathname === '/' ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/leaflet') ||
    pathname.startsWith('/api/auth') ||
    pathname.startsWith('/api/license/status') ||
    pathname.startsWith('/api/settings')
  ) {
    // Jika sudah login dan mencoba ke /login, arahkan ke dashboard sesuai role
    if (pathname === '/login' && token) {
      const payload = verifyToken(token);
      if (payload) {
        const redirectUrl =
          payload.role === 'SUPERADMIN'
            ? '/superadmin'
            : payload.role === 'ADMIN'
            ? '/admin'
            : '/dashboard';
        return NextResponse.redirect(createRedirectUrl(redirectUrl, request));
      }
    }
    return NextResponse.next();
  }

  // 2. Protected routes - cek keberadaan token
  if (!token) {
    return NextResponse.redirect(createRedirectUrl('/login', request));
  }

  // 3. Verifikasi validitas token JWT
  const payload = verifyToken(token);
  if (!payload) {
    const response = NextResponse.redirect(createRedirectUrl('/login', request));
    response.cookies.delete('token');
    return response;
  }

  // 4. Proteksi rute SUPERADMIN - Hanya role SUPERADMIN yang boleh mengakses
  if (pathname.startsWith('/superadmin') && payload.role !== 'SUPERADMIN') {
    const fallbackUrl = payload.role === 'ADMIN' ? '/admin' : '/dashboard';
    return NextResponse.redirect(createRedirectUrl(fallbackUrl, request));
  }

  // 5. Proteksi rute ADMIN - Hanya ADMIN & SUPERADMIN yang boleh mengakses
  if (
    pathname.startsWith('/admin') &&
    payload.role !== 'ADMIN' &&
    payload.role !== 'SUPERADMIN'
  ) {
    return NextResponse.redirect(createRedirectUrl('/dashboard', request));
  }

  // 6. Proteksi rute DASHBOARD - PEGAWAI, ADMIN, dan SUPERADMIN boleh mengakses
  if (
    pathname.startsWith('/dashboard') &&
    payload.role !== 'PEGAWAI' &&
    payload.role !== 'ADMIN' &&
    payload.role !== 'SUPERADMIN'
  ) {
    return NextResponse.redirect(createRedirectUrl('/login', request));
  }

  // 7. Teruskan user context & audit trail Request ID ke request headers
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-user-id', payload.userId);
  requestHeaders.set('x-user-username', payload.username);
  requestHeaders.set('x-user-nip', payload.username);
  requestHeaders.set('x-user-role', payload.role);
  requestHeaders.set('x-user-nama', payload.nama);
  requestHeaders.set('x-request-id', crypto.randomUUID());

  return NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });
}

export const config = {
  matcher: [
    '/((?!_next|favicon.ico|icons|leaflet|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff2?)$|api/auth|api/license/status|api/settings).*)',
  ],
};
