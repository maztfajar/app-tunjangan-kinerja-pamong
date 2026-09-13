import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { comparePassword, signToken } from '@/lib/auth';
import { createRedirectUrl } from '@/lib/url';
import { getClientIp, checkLoginRateLimit, recordLoginAttempt } from '@/lib/rateLimiter';

export async function POST(request: Request) {
  const clientIp = getClientIp(request);
  const contentType = request.headers.get('content-type') || '';
  const isFormSubmit =
    contentType.includes('application/x-www-form-urlencoded') ||
    contentType.includes('multipart/form-data');

  const makeErrorResponse = (errorMsg: string, status: number) => {
    if (isFormSubmit) {
      return NextResponse.redirect(
        createRedirectUrl(`/login?error=${encodeURIComponent(errorMsg)}`, request),
        { status: 303 }
      );
    }
    return NextResponse.json({ error: errorMsg }, { status });
  };

  const makeSuccessResponse = (
    userPayload: {
      id: string;
      username: string;
      nip: string;
      nama: string;
      role: string;
      jabatan: string | null;
      unitKerja: string | null;
    },
    redirectPath: string,
    token: string
  ) => {
    const isHttps =
      request.headers.get('x-forwarded-proto') === 'https' ||
      request.headers.get('referer')?.startsWith('https://') ||
      process.env.NODE_ENV === 'production';

    const cookieOptions = {
      httpOnly: true,
      secure: isHttps,
      sameSite: 'lax' as const,
      maxAge: 60 * 60 * 24, // 24 jam
      path: '/',
    };

    if (isFormSubmit) {
      const response = NextResponse.redirect(
        createRedirectUrl(redirectPath, request),
        { status: 303 }
      );
      response.cookies.set('token', token, cookieOptions);
      return response;
    }

    const response = NextResponse.json({
      success: true,
      user: userPayload,
      redirect: redirectPath,
    });
    response.cookies.set('token', token, cookieOptions);
    return response;
  };

  try {
    let username = '';
    let password = '';

    let botToken = '';

    if (isFormSubmit) {
      const formData = await request.formData();
      username = String(formData.get('username') || formData.get('nip') || '').trim();
      password = String(formData.get('password') || '');
      botToken = String(formData.get('cf-turnstile-response') || formData.get('botToken') || '');
    } else {
      try {
        const body = await request.json();
        username = String(body.username || body.nip || '').trim();
        password = String(body.password || '');
        botToken = String(body['cf-turnstile-response'] || body.botToken || '');
      } catch {
        username = '';
        password = '';
      }
    }

    if (!username || !password) {
      return makeErrorResponse('Username dan password wajib diisi', 400);
    }

    // 1. Verifikasi Wajib Anti-Bot (Cloudflare Turnstile)
    const turnstileSecret = process.env.TURNSTILE_SECRET_KEY;
    if (turnstileSecret) {
      if (!botToken) {
        return makeErrorResponse('Verifikasi anti-bot (Cloudflare Turnstile) wajib diselesaikan terlebih dahulu.', 400);
      }

      // Fallback token hanya diizinkan pada lingkungan pengembangan lokal (development)
      let isFallbackToken = false;
      if (process.env.NODE_ENV !== 'production') {
        try {
          const decoded = Buffer.from(botToken, 'base64').toString('utf-8');
          if (decoded.startsWith('cf_turnstile_guard_')) {
            const parts = decoded.split('_');
            const tokenTime = parseInt(parts[3] || '0', 10);
            if (Date.now() - tokenTime < 5 * 60 * 1000) {
              isFallbackToken = true;
            }
          }
        } catch {}
      }

      if (!isFallbackToken) {
        try {
          const verifyRes = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
              secret: turnstileSecret,
              response: botToken,
              remoteip: clientIp,
            }),
          });
          const verifyData = await verifyRes.json();
          if (!verifyData.success) {
            return makeErrorResponse('Verifikasi anti-bot Cloudflare gagal. Silakan centang ulang verifikasi keamanan.', 400);
          }
        } catch (err) {
          console.warn('Turnstile verification request failed:', err);
          return makeErrorResponse('Gagal memvalidasi keamanan Cloudflare. Silakan coba kembali.', 400);
        }
      }
    }

    // 2. Periksa batas percobaan login per akun (Anti Brute-force per Akun/Jalur Mandiri)
    // Sepenuhnya independen per akun, tidak mengganggu akun pamong lain yang berada di IP/Wi-Fi yang sama
    const normalizedUsername = username.toLowerCase();
    const rateLimitKey = `user:${normalizedUsername}`;
    const rateLimitStatus = checkLoginRateLimit(rateLimitKey);
    if (!rateLimitStatus.allowed) {
      const menit = Math.max(1, Math.ceil(rateLimitStatus.blockedSeconds / 60));
      return makeErrorResponse(
        `Akses login untuk akun ini dijeda selama ${menit} menit demi keamanan karena 5 kali salah password. Silakan tunggu sejenak atau hubungi Admin Kalurahan jika lupa password.`,
        429
      );
    }

    const superAdminUser = process.env.SUPERADMIN_USER || 'root';
    const superAdminPass = process.env.SUPERADMIN_PASS || 'root';

    // 3. Cek login Super Admin (kredensial dari .env)
    if (username === superAdminUser) {
      if (password !== superAdminPass) {
        recordLoginAttempt(rateLimitKey, false);
        const updatedStatus = checkLoginRateLimit(rateLimitKey);
        if (!updatedStatus.allowed) {
          return makeErrorResponse(
            'Username atau password salah. Akses login untuk akun ini dijeda selama 2 menit demi keamanan.',
            429
          );
        }
        const warning =
          updatedStatus.remainingAttempts <= 2 && updatedStatus.remainingAttempts > 0
            ? ` (Sisa kesempatan: ${updatedStatus.remainingAttempts}x sebelum akun dijeda sejenak)`
            : '';
        return makeErrorResponse(`Username atau password salah${warning}`, 401);
      }

      // Pastikan record Super Admin di database
      let superUser = await prisma.user.findUnique({
        where: { username: superAdminUser },
      });

      if (!superUser) {
        const { hashPassword } = await import('@/lib/auth');
        const hashedPassword = await hashPassword(superAdminPass);
        superUser = await prisma.user.create({
          data: {
            username: superAdminUser,
            nama: 'Super Administrator',
            password: hashedPassword,
            role: 'SUPERADMIN',
            jabatan: 'Super Admin',
            unitKerja: 'Pemerintah Kalurahan',
          },
        });
      } else if (superUser.role !== 'SUPERADMIN') {
        superUser = await prisma.user.update({
          where: { id: superUser.id },
          data: { role: 'SUPERADMIN' },
        });
      }

      // Reset limiter saat berhasil login
      recordLoginAttempt(rateLimitKey, true);

      const token = signToken({
        userId: superUser.id,
        username: superUser.username,
        nip: superUser.username,
        nama: superUser.nama,
        role: 'SUPERADMIN',
      });

      return makeSuccessResponse(
        {
          id: superUser.id,
          username: superUser.username,
          nip: superUser.username,
          nama: superUser.nama,
          role: superUser.role,
          jabatan: superUser.jabatan,
          unitKerja: superUser.unitKerja,
        },
        '/superadmin',
        token
      );
    }

    // 4. Cek login Pengguna Biasa (Admin & Pegawai)
    const user = await prisma.user.findUnique({
      where: { username },
    });

    if (!user) {
      recordLoginAttempt(rateLimitKey, false);
      const updatedStatus = checkLoginRateLimit(rateLimitKey);
      if (!updatedStatus.allowed) {
        return makeErrorResponse(
          'Username atau password salah. Akses login untuk akun ini dijeda selama 2 menit demi keamanan.',
          429
        );
      }
      const warning =
        updatedStatus.remainingAttempts <= 2 && updatedStatus.remainingAttempts > 0
          ? ` (Sisa kesempatan: ${updatedStatus.remainingAttempts}x sebelum akun dijeda sejenak)`
          : '';
      return makeErrorResponse(`Username atau password salah${warning}`, 401);
    }

    const isValid = await comparePassword(password, user.password);
    if (!isValid) {
      recordLoginAttempt(rateLimitKey, false);
      const updatedStatus = checkLoginRateLimit(rateLimitKey);
      if (!updatedStatus.allowed) {
        return makeErrorResponse(
          'Username atau password salah. Akses login untuk akun ini dijeda selama 2 menit demi keamanan.',
          429
        );
      }
      const warning =
        updatedStatus.remainingAttempts <= 2 && updatedStatus.remainingAttempts > 0
          ? ` (Sisa kesempatan: ${updatedStatus.remainingAttempts}x sebelum akun dijeda sejenak)`
          : '';
      return makeErrorResponse(`Username atau password salah${warning}`, 401);
    }

    // Reset limiter saat berhasil login
    recordLoginAttempt(rateLimitKey, true);

    const token = signToken({
      userId: user.id,
      username: user.username,
      nip: user.username,
      nama: user.nama,
      role: user.role,
    });

    const redirectPath =
      user.role === 'SUPERADMIN'
        ? '/superadmin'
        : user.role === 'ADMIN'
        ? '/admin'
        : '/dashboard';

    return makeSuccessResponse(
      {
        id: user.id,
        username: user.username,
        nip: user.username,
        nama: user.nama,
        role: user.role,
        jabatan: user.jabatan,
        unitKerja: user.unitKerja,
      },
      redirectPath,
      token
    );
  } catch (error) {
    console.error('Login error:', error);
    return makeErrorResponse('Terjadi kesalahan server', 500);
  }
}
