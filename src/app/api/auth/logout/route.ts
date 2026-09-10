import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  const isHttps =
    request.headers.get('x-forwarded-proto') === 'https' ||
    request.headers.get('referer')?.startsWith('https://') ||
    process.env.NODE_ENV === 'production';

  const response = NextResponse.json({ success: true, message: 'Berhasil logout' });
  response.cookies.set('token', '', {
    httpOnly: true,
    secure: isHttps,
    sameSite: 'lax',
    maxAge: 0,
    path: '/',
  });
  return response;
}
