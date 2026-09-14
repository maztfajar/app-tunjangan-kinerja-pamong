import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyToken, signToken } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

/**
 * POST /api/auth/refresh
 * Auto-renew JWT token jika masih valid.
 * Dipanggil oleh client: saat tab kembali aktif (visibilitychange) atau saat terima 401.
 * Respons 200: token diperbarui, cookie baru di-set.
 * Respons 401: token tidak valid / sudah expired — client harus redirect ke /login.
 */
export async function POST(request: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('token')?.value;

    if (!token) {
      return NextResponse.json({ error: 'Tidak ada sesi aktif.' }, { status: 401 });
    }

    const payload = verifyToken(token);
    if (!payload) {
      // Token expired atau tidak valid — hapus cookie lama
      const res = NextResponse.json({ error: 'Sesi telah berakhir. Silakan login kembali.' }, { status: 401 });
      res.cookies.set('token', '', { maxAge: 0, path: '/' });
      return res;
    }

    // Pastikan user masih ada di database (tidak dihapus admin)
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: { id: true, username: true, nama: true, role: true },
    });

    if (!user) {
      const res = NextResponse.json({ error: 'Akun tidak ditemukan.' }, { status: 401 });
      res.cookies.set('token', '', { maxAge: 0, path: '/' });
      return res;
    }

    // Perbarui token (reset timer 24 jam)
    const newToken = signToken({
      userId: user.id,
      username: user.username,
      nip: user.username,
      nama: user.nama,
      role: user.role,
    });

    const isHttps =
      request.headers.get('x-forwarded-proto') === 'https' ||
      request.headers.get('referer')?.startsWith('https://') ||
      process.env.NODE_ENV === 'production';

    const res = NextResponse.json({ success: true, message: 'Sesi diperbarui.' });
    res.cookies.set('token', newToken, {
      httpOnly: true,
      secure: isHttps,
      sameSite: 'lax',
      maxAge: 60 * 60 * 24, // 24 jam
      path: '/',
    });

    return res;
  } catch (error) {
    console.error('[auth/refresh] Error:', error);
    return NextResponse.json({ error: 'Server error.' }, { status: 500 });
  }
}
