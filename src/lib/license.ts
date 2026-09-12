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
              const cleanHost = currentHost.split(':')[0].toLowerCase().trim();
              const isAllowed = payload.domains.some((d: string) => {
                const cleanAllowed = d.split(':')[0].toLowerCase().trim();
                return cleanHost === cleanAllowed || cleanHost.endsWith('.' + cleanAllowed);
              });

              if (!isAllowed) {
                return {
                  valid: false,
                  info: STANDARD_LICENSE,
                  error: `Serial Number dikunci khusus untuk domain: [${payload.domains.join(', ')}]. Domain aktif (${cleanHost}) tidak cocok.`,
                };
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
 * Cache in-memory untuk performa request tinggi
 */
let cachedLicense: { info: LicenseInfo; timestamp: number; host?: string } | null = null;
const CACHE_TTL_MS = 60 * 1000; // 1 menit

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
      host = headerList.get('x-forwarded-host') || headerList.get('host') || undefined;
    } catch {
      // Di luar konteks request Next.js (misal script CLI)
    }
  }

  if (cachedLicense && now - cachedLicense.timestamp < CACHE_TTL_MS && (!cachedLicense.host || cachedLicense.host === host)) {
    return cachedLicense.info;
  }

  try {
    const settings = await prisma.appSettings.findUnique({
      where: { id: 'default' },
      select: { serialNumber: true },
    });

    if (!settings?.serialNumber) {
      cachedLicense = { info: STANDARD_LICENSE, timestamp: now, host };
      return STANDARD_LICENSE;
    }

    const verification = verifySerialNumber(settings.serialNumber, host);
    const result = verification.valid ? verification.info : STANDARD_LICENSE;
    cachedLicense = { info: result, timestamp: now, host };
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
  cachedLicense = null;
}
