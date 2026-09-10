import type { NextConfig } from "next";

const securityHeaders = [
  {
    key: 'X-DNS-Prefetch-Control',
    value: 'on',
  },
  {
    key: 'Strict-Transport-Security',
    value: 'max-age=63072000; includeSubDomains; preload',
  },
  {
    key: 'X-Frame-Options',
    value: 'SAMEORIGIN',
  },
  {
    key: 'X-Content-Type-Options',
    value: 'nosniff',
  },
  {
    key: 'Referrer-Policy',
    value: 'strict-origin-when-cross-origin',
  },
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=(self)',
  },
  {
    key: 'X-XSS-Protection',
    value: '1; mode=block',
  },
];

const nextConfig: NextConfig = {
  // Sembunyikan header 'x-powered-by: Next.js'
  poweredByHeader: false,

  // Sembunyikan logo/indikator Next.js ("N" badge dev indicator di pojok layar)
  devIndicators: false,

  // Mode standalone: mengemas semua modul yang dibutuhkan ke dalam .next/standalone
  // sehingga hosting TIDAK perlu menjalankan npm install sama sekali
  output: 'standalone',

  // Izinkan origin domain Cloudflare tunnel untuk request Next.js dev server & websocket HMR
  // (hanya aktif saat next dev, diabaikan di production)
  allowedDevOrigins: [
    'tukinku.ai-jogja.my.id',
    '*.ai-jogja.my.id',
    'localhost:3000',
    '127.0.0.1:3000',
  ],

  async headers() {
    return [
      {
        // Terapkan security headers ke seluruh rute aplikasi
        source: '/:path*',
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
