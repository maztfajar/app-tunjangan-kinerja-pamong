'use client';

import Link from 'next/link';
import { IconMapPin, IconInfo } from '@/components/ui/Icons';

export default function LokasiPage() {
  return (
    <div style={{ maxWidth: '800px', margin: '40px auto', padding: '0 16px' }}>
      <div
        className="glass-card-static animate-slide-up"
        style={{
          padding: '36px 32px',
          background: '#ffffff',
          border: '1px solid #e2e8f0',
          borderRadius: '20px',
          textAlign: 'center',
          boxShadow: '0 4px 20px rgba(0,0,0,0.05)',
        }}
      >
        <div
          style={{
            width: '64px',
            height: '64px',
            borderRadius: '16px',
            background: '#eff6ff',
            color: '#0089d7',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 20px auto',
          }}
        >
          <IconMapPin size={32} color="#0089d7" />
        </div>

        <h2 style={{ fontSize: '22px', fontWeight: '800', color: '#0f172a', marginBottom: '12px' }}>
          Menu Setting Lokasi Kantor Telah Dipindahkan
        </h2>

        <div
          style={{
            padding: '16px 20px',
            borderRadius: '12px',
            background: '#f8fafc',
            border: '1px solid #e2e8f0',
            textAlign: 'left',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '12px',
            marginBottom: '24px',
          }}
        >
          <IconInfo size={22} color="#0284c7" />
          <div style={{ fontSize: '13.5px', color: '#334155', lineHeight: '1.6' }}>
            Demi menjaga stabilitas dan akurasi presensi seluruh pamong, penentuan titik koordinat GPS kantor kalurahan merupakan konfigurasi infrastruktur <strong>vital</strong> dan kini sepenuhnya dikelola melalui <strong>Dashboard Super Administrator</strong> pada menu <em>Setting Lokasi Kantor</em>.
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'center', gap: '12px' }}>
          <Link
            href="/admin"
            className="btn-primary"
            style={{
              padding: '12px 24px',
              fontSize: '14px',
              fontWeight: '700',
              borderRadius: '12px',
            }}
          >
            ← Kembali ke Dashboard Admin
          </Link>
        </div>
      </div>
    </div>
  );
}

