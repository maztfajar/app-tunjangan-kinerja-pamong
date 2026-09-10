'use client';

import { useEffect } from 'react';
import { IconClose } from '@/components/ui/Icons';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[GlobalError] Terjadi kesalahan saat navigasi/render:', error);
  }, [error]);

  return (
    <div
      style={{
        minHeight: '70vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
        backgroundColor: '#f8fafc',
      }}
    >
      <div
        style={{
          maxWidth: '480px',
          width: '100%',
          background: '#ffffff',
          borderRadius: '16px',
          border: '1px solid #e2e8f0',
          padding: '32px 24px',
          textAlign: 'center',
          boxShadow: '0 10px 25px rgba(0, 0, 0, 0.05)',
        }}
      >
        <div
          style={{
            width: '56px',
            height: '56px',
            borderRadius: '50%',
            background: '#fee2e2',
            color: '#ef4444',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 16px auto',
          }}
        >
          <IconClose size={28} color="#ef4444" />
        </div>
        <h2 style={{ fontSize: '18px', fontWeight: '800', color: '#0f172a', marginBottom: '8px' }}>
          Kendala Memuat Halaman
        </h2>
        <p style={{ fontSize: '13px', color: '#64748b', lineHeight: '1.6', marginBottom: '24px' }}>
          Terjadi kendala saat memproses antarmuka atau sambungan jaringan terputus. Silakan coba kembali atau muat ulang halaman.
        </p>
        <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
          <button
            onClick={() => reset()}
            className="btn-primary"
            style={{ padding: '10px 18px', fontSize: '13px' }}
          >
            Coba Lagi
          </button>
          <button
            onClick={() => window.location.reload()}
            style={{
              padding: '10px 18px',
              fontSize: '13px',
              fontWeight: '600',
              borderRadius: '10px',
              border: '1px solid #cbd5e1',
              background: '#ffffff',
              color: '#334155',
              cursor: 'pointer',
            }}
          >
            Muat Ulang Halaman
          </button>
        </div>
      </div>
    </div>
  );
}
