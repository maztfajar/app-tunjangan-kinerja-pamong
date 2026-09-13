/**
 * In-Memory Sliding Window Rate Limiter
 * Melindungi endpoint login dari serangan brute-force, dan API dari DDoS/spam request.
 */

interface RateLimitRecord {
  timestamps: number[];
  blockedUntil?: number;
}

// Global store in memory (persists across requests during server runtime)
const rateLimitStore = new Map<string, RateLimitRecord>();
const loginAttemptsStore = new Map<string, { count: number; blockedUntil: number }>();

// Periodic cleanup every 5 minutes to prevent memory leak
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now();
    for (const [key, record] of rateLimitStore.entries()) {
      record.timestamps = record.timestamps.filter((t) => now - t < 60000);
      if (record.timestamps.length === 0 && (!record.blockedUntil || record.blockedUntil < now)) {
        rateLimitStore.delete(key);
      }
    }
    for (const [ip, record] of loginAttemptsStore.entries()) {
      if (record.blockedUntil < now && record.count === 0) {
        loginAttemptsStore.delete(ip);
      }
    }
  }, 5 * 60 * 1000);
}

/**
 * Mendapatkan IP klien dari headers request
 */
export function getClientIp(request: Request | { headers: Headers }): string {
  const headers = request.headers;
  // 1. Cloudflare Tunnel & Proxy menyediakan IP asli di header 'cf-connecting-ip'
  const cfConnectingIp = headers.get('cf-connecting-ip');
  if (cfConnectingIp) {
    return cfConnectingIp.trim();
  }
  // 2. Fallback ke header proxy standar
  const realIp = headers.get('x-real-ip');
  if (realIp) {
    return realIp.trim();
  }
  const forwarded = headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  return '127.0.0.1';
}

/**
 * General Sliding Window Rate Limiter
 * @param key Identifier unik (misal IP address atau user ID)
 * @param limit Jumlah request maksimal dalam rentang waktu (default: 300 untuk mendukung banyak user)
 * @param windowMs Rentang waktu dalam milidetik (default: 60 detik)
 */
export function checkRateLimit(
  key: string,
  limit = 300,
  windowMs = 60 * 1000
): { allowed: boolean; remaining: number; resetTime: number } {
  const now = Date.now();
  let record = rateLimitStore.get(key);

  if (!record) {
    record = { timestamps: [] };
    rateLimitStore.set(key, record);
  }

  // Filter out timestamps older than the sliding window
  record.timestamps = record.timestamps.filter((t) => now - t < windowMs);

  if (record.timestamps.length >= limit) {
    const oldestTimestamp = record.timestamps[0];
    const resetTime = oldestTimestamp + windowMs;
    return {
      allowed: false,
      remaining: 0,
      resetTime,
    };
  }

  record.timestamps.push(now);
  return {
    allowed: true,
    remaining: limit - record.timestamps.length,
    resetTime: now + windowMs,
  };
}

/**
 * Rate Limiter Khusus Login (Anti Brute-force per Akun/Username Mandiri)
 * Maksimal 5x gagal dalam 2 menit per akun (username). Jika melampaui, akun tersebut dijeda selama 2 menit.
 * 
 * Prinsip Isolasi:
 * Pembatasan ini sepenuhnya mandiri per-akun (identifier). Jika ada satu akun yang salah 5 kali
 * dan dijeda 2 menit, akun-akun pegawai lainnya dalam jaringan/Wi-Fi/LAN/IP yang sama TETAP BISA
 * login dan masuk ke dashboard tanpa terganggu sama sekali.
 */
export function checkLoginRateLimit(identifier: string): {
  allowed: boolean;
  remainingAttempts: number;
  blockedSeconds: number;
} {
  const now = Date.now();
  const record = loginAttemptsStore.get(identifier);

  if (!record) {
    return { allowed: true, remainingAttempts: 5, blockedSeconds: 0 };
  }

  // Jika akun sedang dalam masa jeda 2 menit
  if (record.blockedUntil > now) {
    const blockedSeconds = Math.ceil((record.blockedUntil - now) / 1000);
    return {
      allowed: false,
      remainingAttempts: 0,
      blockedSeconds,
    };
  }

  // Jika masa jeda 2 menit sudah selesai, reset counter dan berikan 5 kesempatan baru
  if (record.blockedUntil !== 0 && record.blockedUntil <= now) {
    loginAttemptsStore.delete(identifier);
    return { allowed: true, remainingAttempts: 5, blockedSeconds: 0 };
  }

  const remainingAttempts = Math.max(0, 5 - record.count);
  return {
    allowed: record.count < 5,
    remainingAttempts,
    blockedSeconds: 0,
  };
}

/**
 * Catat hasil percobaan login per akun (identifier).
 * Reset ke 0 jika sukses login. Jika gagal 5 kali, jeda selama 2 menit (120 detik).
 */
export function recordLoginAttempt(identifier: string, success: boolean) {
  const now = Date.now();
  if (success) {
    // Reset counter kegagalan setelah login berhasil
    loginAttemptsStore.delete(identifier);
    return;
  }

  const record = loginAttemptsStore.get(identifier) || { count: 0, blockedUntil: 0 };
  record.count += 1;

  // Jika gagal 5 kali berturut-turut, jeda akun tersebut selama 2 menit
  if (record.count >= 5) {
    record.blockedUntil = now + 2 * 60 * 1000; // 2 menit (120.000 ms)
  }

  loginAttemptsStore.set(identifier, record);
}
