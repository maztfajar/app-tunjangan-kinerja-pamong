import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { cookies } from 'next/headers';

import crypto from 'crypto';

let runtimeSecret = '';
function getJwtSecret(): string {
  if (process.env.JWT_SECRET) {
    return process.env.JWT_SECRET;
  }
  if (process.env.NODE_ENV === 'production') {
    if (!runtimeSecret) {
      runtimeSecret = crypto.randomBytes(32).toString('hex');
      console.warn('⚠️ PERINGATAN KEAMANAN KRITIS: JWT_SECRET belum didefinisikan di .env. Menggunakan ephemeral runtime secret untuk mencegah eksploitasi pemalsuan token publik.');
    }
    return runtimeSecret;
  }
  return 'pamong-app-super-secret-jwt-key-2025';
}

const JWT_SECRET = getJwtSecret();

export interface JWTPayload {
  userId: string;
  username: string;
  nip: string; // Alias kompatibilitas mundur
  nama: string;
  role: 'SUPERADMIN' | 'ADMIN' | 'PEGAWAI';
}

const PEPPER = process.env.PASSWORD_PEPPER || 'pamong-internal-pepper-salt-secret-key-2026';

/**
 * Kebijakan Validasi Kekuatan Password (Password Policy):
 * - Minimal 8 karakter
 * - Harus mengandung setidaknya satu huruf dan satu angka
 * Mencegah pamong/admin menggunakan password yang terlalu mudah ditebak seperti '123456'
 */
export function validatePasswordStrength(password: string): { valid: boolean; error?: string } {
  if (!password || password.length < 8) {
    return { valid: false, error: 'Password minimal terdiri dari 8 karakter.' };
  }
  if (!/[A-Za-z]/.test(password)) {
    return { valid: false, error: 'Password harus mengandung setidaknya satu huruf.' };
  }
  if (!/[0-9]/.test(password)) {
    return { valid: false, error: 'Password harus mengandung setidaknya satu angka.' };
  }
  return { valid: true };
}

/**
 * Hash password dengan bcrypt salt rounds 12 + Server Pepper untuk keamanan tingkat tinggi.
 * Sekalipun database dicuri, hash tidak bisa di-crack tanpa kunci pepper server.
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password + PEPPER, 12);
}

/**
 * Verifikasi password dengan kompatibilitas mundur penuh (Backward Compatibility):
 * 1. Coba verifikasi dengan Pepper (standar baru)
 * 2. Jika tidak cocok, fallback coba verifikasi tanpa Pepper (untuk akun yang dibuat sebelum fitur pepper)
 * Menjamin 100% akun yang sudah ada tetap bisa login lancar tanpa ada sistem yang rusak.
 */
export async function comparePassword(password: string, hash: string): Promise<boolean> {
  try {
    const isMatchWithPepper = await bcrypt.compare(password + PEPPER, hash);
    if (isMatchWithPepper) return true;
    return await bcrypt.compare(password, hash);
  } catch {
    return false;
  }
}

export function signToken(payload: { userId: string; username?: string; nip?: string; nama: string; role: 'SUPERADMIN' | 'ADMIN' | 'PEGAWAI' }): string {
  const finalUsername = payload.username || payload.nip || '';
  return jwt.sign({
    ...payload,
    username: finalUsername,
    nip: finalUsername,
  }, JWT_SECRET, { expiresIn: '24h' });
}

export function verifyToken(token: string): JWTPayload | null {
  try {
    const payload = jwt.verify(token, JWT_SECRET) as Record<string, unknown>;
    if (!payload || typeof payload !== 'object') return null;
    const finalUsername = String(payload.username || payload.nip || '');
    return {
      ...payload,
      username: finalUsername,
      nip: finalUsername,
    } as unknown as JWTPayload;
  } catch {
    return null;
  }
}

import { prisma } from '@/lib/prisma';

export async function getSession(): Promise<JWTPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get('token')?.value;
  if (!token) return null;
  return verifyToken(token);
}

export async function getAuthUser(req?: Request) {
  let session = await getSession();
  if (!session && req) {
    const authHeader = req.headers.get('authorization');
    if (authHeader?.startsWith('Bearer ')) {
      session = verifyToken(authHeader.substring(7));
    }
    const cookieHeader = req.headers.get('cookie');
    if (!session && cookieHeader) {
      const match = cookieHeader.match(/(?:^|;\s*)token=([^;]+)/);
      if (match) {
        session = verifyToken(decodeURIComponent(match[1]));
      }
    }
  }
  if (!session) return null;

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
  });
  if (!user) return null;

  let jabatanId: string | null = null;
  if (user.jabatan) {
    const mj = await prisma.masterJabatan.findUnique({ where: { nama: user.jabatan } });
    if (mj) jabatanId = mj.id;
  }

  return {
    ...user,
    nip: user.username,
    jabatanId,
  };
}

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

