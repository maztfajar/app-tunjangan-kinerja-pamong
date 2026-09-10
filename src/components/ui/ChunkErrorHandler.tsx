'use client';

import { useEffect } from 'react';

/**
 * Komponen penangan otomatis ChunkLoadError di Next.js App Router.
 * Ketika server me-rebuild atau me-restart, hash file JavaScript di server dapat berubah.
 * Browser yang menyimpan cache lama sering gagal mengunduh chunk baru (silent ChunkLoadError).
 * Handler ini mendeteksi kegagalan tersebut dan otomatis melakukan reload lembut agar aplikasi
 * langsung berfungsi normal tanpa mengharuskan pengguna menekan F5 secara manual.
 */
export default function ChunkErrorHandler() {
  useEffect(() => {
    const isChunkError = (text: string) => {
      const lower = text.toLowerCase();
      return (
        lower.includes('loading chunk') ||
        lower.includes('chunkloaderror') ||
        lower.includes('failed to fetch dynamically imported module') ||
        lower.includes('error loading dynamically imported module') ||
        lower.includes('failed to load script')
      );
    };

    const triggerSoftReload = () => {
      try {
        const lastReload = sessionStorage.getItem('__last_chunk_reload');
        const now = Date.now();

        // Mencegah loop reload tanpa henti: hanya reload jika reload terakhir lebih dari 15 detik lalu
        if (!lastReload || now - parseInt(lastReload, 10) > 15000) {
          sessionStorage.setItem('__last_chunk_reload', String(now));
          console.warn('[ChunkErrorHandler] ChunkLoadError terdeteksi. Memuat ulang halaman untuk mengambil aset terbaru...');
          window.location.reload();
        }
      } catch {
        window.location.reload();
      }
    };

    const handleError = (event: ErrorEvent) => {
      if (event.message && isChunkError(event.message)) {
        triggerSoftReload();
      }
    };

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      const reason = event.reason?.message || String(event.reason || '');
      if (reason && isChunkError(reason)) {
        triggerSoftReload();
      }
    };

    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleUnhandledRejection);

    return () => {
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
  }, []);

  return null;
}
