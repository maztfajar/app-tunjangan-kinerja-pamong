import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { cookies } from 'next/headers';

const JWT_SECRET = process.env.JWT_SECRET || 'pamong-app-super-secret-jwt-key-2025';

if (process.env.NODE_ENV === 'production' && !process.env.JWT_SECRET) {
  console.warn('⚠️ PERINGATAN KEAMANAN: JWT_SECRET belum didefinisikan di environment variable (.env).');
}

export interface JWTPayload {
  userId: string;
  nip: string;
  nama: string;
  role: 'SUPERADMIN' | 'ADMIN' | 'PEGAWAI';
}

/**
 * Hash password dengan bcrypt salt rounds 12 untuk keamanan tinggi
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export async function comparePassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function signToken(payload: JWTPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '24h' });
}

export function verifyToken(token: string): JWTPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as JWTPayload;
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

