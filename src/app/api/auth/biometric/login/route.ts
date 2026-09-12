import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { signToken } from '@/lib/auth';
import { generateWebAuthnChallenge, verifyWebAuthnChallenge } from '@/lib/webauthn';

/**
 * GET /api/auth/biometric/login
 * Menghasilkan challenge baru untuk login biometrik
 */
export async function GET(req: NextRequest) {
  try {
    const challenge = generateWebAuthnChallenge();
    const host = req.headers.get('x-forwarded-host') || req.headers.get('host') || 'localhost';
    const cleanHost = host.split(':')[0].trim().toLowerCase();
    const isIp = /^(\d{1,3}\.){3}\d{1,3}$/.test(cleanHost) || cleanHost.includes(':');

    const optionsPayload: { challenge: string; rpId?: string; userVerification: string; timeout: number } = {
      challenge,
      userVerification: 'required',
      timeout: 60000,
    };
    if (!isIp) {
      optionsPayload.rpId = cleanHost;
    }

    return NextResponse.json({
      success: true,
      options: optionsPayload,
    });
  } catch (error) {
    console.error('Error biometric login challenge:', error);
    return NextResponse.json({ error: 'Gagal membuat sesi login biometrik' }, { status: 500 });
  }
}

/**
 * POST /api/auth/biometric/login
 * Memverifikasi respon biometrik ponsel dan menerbitkan sesi login JWT
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { credentialId, challenge } = body;

    if (!credentialId || !challenge) {
      return NextResponse.json({ error: 'Kredensial biometrik tidak lengkap' }, { status: 400 });
    }

    // 1. Validasi keabsahan challenge
    const isValidChallenge = verifyWebAuthnChallenge(challenge);
    if (!isValidChallenge) {
      return NextResponse.json({ error: 'Sesi biometrik kedaluwarsa. Silakan ulangi pemindaian.' }, { status: 400 });
    }

    // 2. Cari kredensial biometrik di database
    const cred = await prisma.biometricCredential.findUnique({
      where: { credentialId },
      include: {
        user: true,
      },
    });

    if (!cred || !cred.user) {
      return NextResponse.json({
        error: 'Biometrik belum terdaftar di akun manapun pada perangkat ini. Silakan masuk dengan username & password terlebih dahulu lalu aktifkan biometrik.',
      }, { status: 404 });
    }

    const user = cred.user;

    // 3. Terbitkan token JWT sesi resmi
    const token = signToken({
      userId: user.id,
      nip: user.nip,
      nama: user.nama,
      role: user.role,
    });

    const isHttps =
      req.headers.get('x-forwarded-proto') === 'https' ||
      req.headers.get('referer')?.startsWith('https://') ||
      process.env.NODE_ENV === 'production';

    const cookieOptions = {
      httpOnly: true,
      secure: isHttps,
      sameSite: 'lax' as const,
      maxAge: 60 * 60 * 24, // 24 jam
      path: '/',
    };

    const redirectPath =
      user.role === 'SUPERADMIN'
        ? '/superadmin'
        : user.role === 'ADMIN'
        ? '/admin'
        : '/dashboard';

    const response = NextResponse.json({
      success: true,
      user: {
        id: user.id,
        nip: user.nip,
        nama: user.nama,
        role: user.role,
        jabatan: user.jabatan,
        unitKerja: user.unitKerja,
      },
      redirect: redirectPath,
    });

    response.cookies.set('token', token, cookieOptions);
    return response;
  } catch (error) {
    console.error('Error biometric login verification:', error);
    return NextResponse.json({ error: 'Gagal memverifikasi biometrik' }, { status: 500 });
  }
}
