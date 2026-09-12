import crypto from 'crypto';
import { prisma } from '@/lib/prisma';

export interface LicenseFeatures {
  biometrics: boolean;      // 1. Presensi Biometrik (WebAuthn)
  unlimitedUsers: boolean;  // 2. Pegawai diatas 50 orang (Unlimited)
  holidayCalendar: boolean; // 3 & 4. Kalender Libur Nasional & Penetapan Hari
  customKop: boolean;       // 5. Custom Kop Surat, Format TTD, Pilihan Kertas A4/F4 & Portrait/Landscape
  backupRestore: boolean;   // 6. Backup & Restory Database
  suket: boolean;           // 7. Ajukan Suket (Sakit/Izin/Cuti)
  agenda: boolean;          // 8. Agenda Kegiatan
}

export interface LicenseInfo {
  isPro: boolean;
  tier: 'STANDARD' | 'PRO';
  clientName?: string;
  serialNumber?: string;
  maxUsers: number; // 50 untuk STANDARD, -1 untuk unlimited
  features: LicenseFeatures;
  defaultPaperSize: 'F4' | 'A4';
  allowedPaperSizes: ('F4' | 'A4')[];
  defaultOrientation: 'landscape' | 'portrait';
  allowedOrientations: ('landscape' | 'portrait')[];
  issuedAt?: string;
  expiresAt?: string | null;
  allowedDomains?: string[];
  daysRemaining?: number | null;
}

export const STANDARD_LICENSE: LicenseInfo = {
  isPro: false,
  tier: 'STANDARD',
  maxUsers: 50,
  features: {
    biometrics: false,
    unlimitedUsers: false,
    holidayCalendar: false,
    customKop: false,
    backupRestore: false,
    suket: false,
    agenda: false,
  },
  defaultPaperSize: 'F4',
  allowedPaperSizes: ['F4'],
  defaultOrientation: 'landscape',
  allowedOrientations: ['landscape'],
};

const MASTER_SALT = process.env.LICENSE_SECRET || 'TKP-PAMONG-MASTER-KEY-2026-X99';

/**
 * Normalisasi nama domain: bersihkan protokol http/https, port, path, dan awalan www.
 */
export function normalizeDomain(val: string): string {
  if (!val || typeof val !== 'string') return '';
  return val
    .replace(/^https?:\/\//i, '')
    .split('/')[0]
    .split(':')[0]
    .toLowerCase()
    .trim()
    .replace(/^www\./i, '');
}

/**
 * Ekstraksi domain aktif dari berbagai kemungkinan HTTP headers (kompatibel cPanel Passenger, LiteSpeed, Nginx, Apache)
 */
export function extractDomainFromHeaders(headerList: { get: (name: string) => string | null }): string | undefined {
  const forwardedHost = headerList.get('x-forwarded-host');
  if (forwardedHost) return forwardedHost;

  const originalHost = headerList.get('x-original-host');
  if (originalHost) return originalHost;

  const forwardedServer = headerList.get('x-forwarded-server');
  if (forwardedServer) return forwardedServer;

  const host = headerList.get('host');
  if (host && !host.includes('localhost') && !host.includes('127.0.0.1') && !host.includes('::1')) {
    return host;
  }

  // Fallback ke referer atau origin jika host bernilai loopback (khas Apache proxy mod_passenger)
  const referer = headerList.get('referer');
  if (referer) {
    try {
      const url = new URL(referer);
      if (url.hostname && !url.hostname.includes('localhost') && !url.hostname.includes('127.0.0.1')) {
        return url.hostname;
      }
    } catch {}
  }

  const origin = headerList.get('origin');
  if (origin) {
    try {
      const url = new URL(origin);
      if (url.hostname && !url.hostname.includes('localhost') && !url.hostname.includes('127.0.0.1')) {
        return url.hostname;
      }
    } catch {}
  }

  return host || undefined;
}

/**
 * Validasi dan decode Serial Number string
 */
export function verifySerialNumber(rawKey: string, currentHost?: string): { valid: boolean; info: LicenseInfo; error?: string } {
  if (!rawKey || typeof rawKey !== 'string') {
    return { valid: false, info: STANDARD_LICENSE, error: 'Serial number kosong.' };
  }

  const cleanKey = rawKey.trim();

  // Format 1: Token Serial TKP-PRO-<payloadB64>-<sig>
  if (cleanKey.startsWith('TKP-PRO-') && cleanKey.includes('.')) {
    try {
      const parts = cleanKey.replace(/^TKP-PRO-/, '').split('.');
      if (parts.length === 2) {
        const [payloadB64, sig] = parts;
        const expectedSig = crypto
          .createHmac('sha256', MASTER_SALT)
          .update(payloadB64)
          .digest('hex')
          .slice(0, 16)
          .toUpperCase();

        if (crypto.timingSafeEqual(Buffer.from(sig.toUpperCase()), Buffer.from(expectedSig))) {
          const payload = JSON.parse(Buffer.from(payloadB64, 'base64url').toString('utf8'));
          
          // 1. Cek kunci domain jika serial mengikat domain tertentu
          if (payload.domains && Array.isArray(payload.domains) && payload.domains.length > 0) {
            if (currentHost) {
              const normHost = normalizeDomain(currentHost);
              // Abaikan jika pemanggilan berasal dari internal server loopback tanpa domain publik
              const isLoopback = normHost === 'localhost' || normHost === '127.0.0.1' || normHost === '::1';

              if (!isLoopback) {
                const isAllowed = payload.domains.some((d: string) => {
                  const normAllowed = normalizeDomain(d);
                  return normHost === normAllowed || normHost.endsWith('.' + normAllowed);
                });

                if (!isAllowed) {
                  return {
                    valid: false,
                    info: STANDARD_LICENSE,
                    error: `Serial Number dikunci khusus untuk domain: [${payload.domains.join(', ')}]. Domain aktif (${normHost}) tidak cocok.`,
                  };
                }
              }
            }
          }

          // 2. Cek masa berlaku jika ada
          let daysRemaining: number | null = null;
          if (payload.exp) {
            const expDate = new Date(payload.exp);
            expDate.setHours(23, 59, 59, 999);
            const now = new Date();
            if (now > expDate) {
              return { valid: false, info: STANDARD_LICENSE, error: `Masa berlaku lisensi telah berakhir pada ${payload.exp}.` };
            }
            const diffMs = expDate.getTime() - now.getTime();
            daysRemaining = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
          }

          return {
            valid: true,
            info: {
              isPro: true,
              tier: 'PRO',
              clientName: payload.client || 'Instansi Terverifikasi',
              serialNumber: cleanKey,
              maxUsers: payload.maxUsers || -1,
              features: {
                biometrics: true,
                unlimitedUsers: true,
                holidayCalendar: true,
                customKop: true,
                backupRestore: true,
                suket: true,
                agenda: true,
              },
              defaultPaperSize: 'F4',
              allowedPaperSizes: ['F4', 'A4'],
              defaultOrientation: 'landscape',
              allowedOrientations: ['landscape', 'portrait'],
              issuedAt: payload.iat,
              expiresAt: payload.exp || null,
              allowedDomains: payload.domains || undefined,
              daysRemaining,
            },
          };
        }
      }
    } catch {
      // ignore parse error, fallback
    }
  }

  // Format 2: Block Serial: TKP-PRO-XXXX-XXXX-XXXX-XXXX
  const blockMatch = cleanKey.match(/^TKP-PRO-([A-Z0-9]{4})-([A-Z0-9]{4})-([A-Z0-9]{4})-([A-Z0-9]{4})$/i);
  if (blockMatch) {
    const rawBlocks = `${blockMatch[1]}-${blockMatch[2]}-${blockMatch[3]}-${blockMatch[4]}`.toUpperCase();
    
    // Verifikasi checksum blok menggunakan HMAC
    const seed = `TKP-BLOCK-${blockMatch[1]}-${blockMatch[2]}`;
    const expectedSuffix = crypto
      .createHmac('sha256', MASTER_SALT)
      .update(seed)
      .digest('hex')
      .slice(0, 8)
      .toUpperCase();

    const expectedBlocks = `${blockMatch[1]}-${blockMatch[2]}-${expectedSuffix.slice(0, 4)}-${expectedSuffix.slice(4, 8)}`;

    if (rawBlocks === expectedBlocks) {
      return {
        valid: true,
        info: {
          isPro: true,
          tier: 'PRO',
          clientName: 'Instansi Terverifikasi',
          serialNumber: cleanKey.toUpperCase(),
          maxUsers: -1,
          features: {
            biometrics: true,
            unlimitedUsers: true,
            holidayCalendar: true,
            customKop: true,
            backupRestore: true,
            suket: true,
            agenda: true,
          },
          defaultPaperSize: 'F4',
          allowedPaperSizes: ['F4', 'A4'],
          defaultOrientation: 'landscape',
          allowedOrientations: ['landscape', 'portrait'],
        },
      };
    }
  }

  return {
    valid: false,
    info: STANDARD_LICENSE,
    error: 'Serial number tidak valid atau tidak cocok.',
  };
}

/**
 * Cache in-memory per host untuk performa request tinggi
 */
const licenseCache = new Map<string, { info: LicenseInfo; timestamp: number }>();

/**
 * Mengambil informasi lisensi aktif saat ini dari database
 */
export async function getLicenseInfo(explicitHost?: string): Promise<LicenseInfo> {
  const now = Date.now();
  let host = explicitHost;
  if (!host) {
    try {
      const { headers } = await import('next/headers');
      const headerList = await headers();
      host = extractDomainFromHeaders(headerList);
    } catch {
      // Di luar konteks request Next.js (misal script CLI)
    }
  }

  const cacheKey = host ? normalizeDomain(host) : '__global__';
  const cached = licenseCache.get(cacheKey);
  if (cached) {
    const ttl = cached.info.isPro ? 60000 : 5000;
    if (now - cached.timestamp < ttl) {
      return cached.info;
    }
  }

  try {
    const settings = await prisma.appSettings.findUnique({
      where: { id: 'default' },
      select: { serialNumber: true },
    });

    if (!settings?.serialNumber) {
      licenseCache.set(cacheKey, { info: STANDARD_LICENSE, timestamp: now });
      return STANDARD_LICENSE;
    }

    const verification = verifySerialNumber(settings.serialNumber, host);
    const result = verification.valid ? verification.info : STANDARD_LICENSE;
    licenseCache.set(cacheKey, { info: result, timestamp: now });
    return result;
  } catch (error) {
    console.error('Error membaca lisensi sistem:', error);
    return STANDARD_LICENSE;
  }
}

/**
 * Reset cache ketika serial number diubah / dihapus
 */
export function invalidateLicenseCache() {
  licenseCache.clear();
}
