'use client';

import { useEffect, useState, useCallback } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { IconMapPin, IconCheckCircle, IconInfo } from '@/components/ui/Icons';

const MapPicker = dynamic(() => import('@/components/presensi/MapPicker'), {
  ssr: false,
  loading: () => (
    <div
      style={{
        height: '100%',
        minHeight: '380px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#f8fafc',
        gap: '12px',
        color: '#64748b',
      }}
    >
      <div className="spinner" style={{ width: '32px', height: '32px', borderWidth: '3px' }} />
      <span style={{ fontSize: '13px', fontWeight: '600' }}>Memuat Komponen Peta Interaktif...</span>
    </div>
  ),
});

interface LokasiData {
  id?: string;
  namaLokasi: string;
  latitude: number;
  longitude: number;
  radius: number;
}

export default function SuperAdminLokasiPage() {
  const [lokasi, setLokasi] = useState<LokasiData>({
    namaLokasi: 'Kantor Kalurahan',
    latitude: -7.841817942758396,
    longitude: 110.1685866543569,
    radius: 100,
  });
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fetchLokasi = async () => {
    try {
      const res = await fetch('/api/lokasi');
      const data = await res.json();
      if (data.lokasi) {
        setLokasi(data.lokasi);
      }
    } catch (error) {
      console.error('Fetch lokasi error:', error);
    } finally {
      setFetching(false);
    }
  };

  useEffect(() => {
    fetchLokasi();
  }, []);

  const handleMapClick = useCallback((lat: number, lng: number) => {
    setLokasi((prev) => ({ ...prev, latitude: lat, longitude: lng }));
  }, []);

  const handleSave = async () => {
    setLoading(true);
    setMessage(null);
    try {
      const res = await fetch('/api/lokasi', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(lokasi),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setMessage({
          type: 'success',
          text: 'Titik koordinat dan radius lokasi kantor berhasil diperbarui! Seluruh presensi pamong kini otomatis tervalidasi terhadap koordinat baru ini.',
        });
      } else {
        setMessage({
          type: 'error',
          text: data.error || 'Gagal menyimpan pengaturan lokasi.',
        });
      }
    } catch {
      setMessage({ type: 'error', text: 'Terjadi kesalahan jaringan saat menyimpan lokasi.' });
    }
    setLoading(false);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', width: '100%', maxWidth: '1400px', margin: '0 auto' }}>
      {/* Header Halaman */}
      <div
        className="glass-card-static animate-slide-up"
        style={{
          padding: '24px 28px',
          background: '#ffffff',
          border: '1px solid #e0f2fe',
          borderRadius: '16px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '16px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div
            style={{
              width: '48px',
              height: '48px',
              borderRadius: '12px',
              background: '#eff6ff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#0089d7',
            }}
          >
            <IconMapPin size={26} color="#0089d7" />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h2 style={{ fontSize: '20px', fontWeight: '800', color: '#0f172a', letterSpacing: '-0.02em', margin: 0 }}>
                Setting Titik Lokasi Kantor &amp; Radius Presensi
              </h2>
              <span className="badge badge-info" style={{ fontSize: '11px', padding: '2px 8px' }}>
                SUPER ADMIN
              </span>
            </div>
            <p style={{ fontSize: '13px', color: '#64748b', margin: '4px 0 0 0' }}>
              Konfigurasi titik pusat GPS kantor kalurahan dan radius presensi (klik langsung pada peta atau ketik koordinat).
            </p>
          </div>
        </div>

        <Link href="/superadmin" className="btn-outline" style={{ fontSize: '13px', padding: '8px 16px' }}>
          ← Kembali ke Ringkasan
        </Link>
      </div>

      {/* Alert Warning Penting */}
      <div
        style={{
          padding: '14px 18px',
          borderRadius: '12px',
          background: '#eff6ff',
          border: '1px solid #bfdbfe',
          display: 'flex',
          alignItems: 'flex-start',
          gap: '12px',
        }}
      >
        <IconInfo size={20} color="#1d4ed8" />
        <div style={{ fontSize: '13px', color: '#1e40af', lineHeight: '1.5' }}>
          <strong>Pemberitahuan Infrastruktur Vital:</strong> Penentuan titik lokasi kantor merupakan pengaturan sensitif yang menentukan validitas presensi seluruh Pamong Kalurahan. Menu ini dipindahkan ke panel Super Administrator guna mencegah perubahan titik yang tidak disengaja.
        </div>
      </div>

      {/* Alert Status Simpan */}
      {message && (
        <div
          className="animate-fade-in"
          style={{
            padding: '14px 18px',
            borderRadius: '12px',
            background: message.type === 'success' ? '#f0fdf4' : '#fef2f2',
            border: `1px solid ${message.type === 'success' ? '#bbf7d0' : '#fecaca'}`,
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
          }}
        >
          {message.type === 'success' ? (
            <IconCheckCircle size={20} color="#16a34a" />
          ) : (
            <IconInfo size={20} color="#dc2626" />
          )}
          <span style={{ fontSize: '13px', fontWeight: '600', color: message.type === 'success' ? '#15803d' : '#b91c1c' }}>
            {message.text}
          </span>
        </div>
      )}

      {fetching ? (
        <div className="glass-card-static" style={{ padding: '60px 20px', textAlign: 'center' }}>
          <div className="spinner" style={{ margin: '0 auto 16px auto', width: '36px', height: '36px' }} />
          <p style={{ color: '#64748b', fontSize: '14px', fontWeight: '500' }}>Memuat data titik lokasi kantor...</p>
        </div>
      ) : (
        <div className="presensi-grid" style={{ alignItems: 'start' }}>
          {/* Peta Interaktif */}
          <div
            className="glass-card-static"
            style={{
              padding: '6px',
              background: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: '16px',
              overflow: 'hidden',
              boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
            }}
          >
            <div style={{ height: '520px', borderRadius: '12px', overflow: 'hidden' }}>
              <MapPicker
                latitude={lokasi.latitude}
                longitude={lokasi.longitude}
                radius={lokasi.radius}
                onMapClick={handleMapClick}
              />
            </div>
            <div style={{ padding: '10px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc', fontSize: '12px', color: '#64748b' }}>
              <span>👆 <em>Klik di mana saja pada peta untuk memindahkan pin titik kantor</em></span>
              <span>Radius Aktif: <strong>{lokasi.radius} meter</strong></span>
            </div>
          </div>

          {/* Panel Konfigurasi Koordinat */}
          <div
            className="glass-card-static"
            style={{
              padding: '28px',
              background: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: '16px',
              display: 'flex',
              flexDirection: 'column',
              gap: '20px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
            }}
          >
            <div style={{ borderBottom: '1px solid #f1f5f9', paddingBottom: '14px' }}>
              <h3 style={{ fontSize: '17px', fontWeight: '800', color: '#0f172a', margin: 0 }}>
                📍 Detail Titik &amp; Radius
              </h3>
              <p style={{ fontSize: '12px', color: '#64748b', margin: '4px 0 0 0' }}>
                Koordinat GPS resmi kantor kalurahan
              </p>
            </div>

            <div>
              <label className="input-label" style={{ fontWeight: '700' }}>Nama Kantor / Lokasi</label>
              <input
                type="text"
                className="input-field"
                value={lokasi.namaLokasi}
                onChange={(e) => setLokasi({ ...lokasi, namaLokasi: e.target.value })}
                placeholder="Contoh: Kantor Pemerintah Kalurahan Pengasih"
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
              <div>
                <label className="input-label" style={{ fontWeight: '700' }}>Latitude</label>
                <input
                  type="number"
                  className="input-field"
                  value={lokasi.latitude}
                  onChange={(e) => setLokasi({ ...lokasi, latitude: parseFloat(e.target.value) || 0 })}
                  step="0.000001"
                />
              </div>

              <div>
                <label className="input-label" style={{ fontWeight: '700' }}>Longitude</label>
                <input
                  type="number"
                  className="input-field"
                  value={lokasi.longitude}
                  onChange={(e) => setLokasi({ ...lokasi, longitude: parseFloat(e.target.value) || 0 })}
                  step="0.000001"
                />
              </div>
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label className="input-label" style={{ fontWeight: '700', marginBottom: 0 }}>
                  Radius Toleransi Presensi
                </label>
                <span className="badge badge-info" style={{ fontSize: '11px', fontWeight: '700' }}>
                  {lokasi.radius} meter
                </span>
              </div>
              <input
                type="number"
                className="input-field"
                style={{ marginTop: '8px' }}
                value={lokasi.radius}
                onChange={(e) => setLokasi({ ...lokasi, radius: parseInt(e.target.value) || 50 })}
                min="10"
                max="2000"
              />
              
              {/* Tombol preset radius cepat */}
              <div style={{ display: 'flex', gap: '6px', marginTop: '8px', flexWrap: 'wrap' }}>
                {[50, 100, 150, 200, 300].map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setLokasi({ ...lokasi, radius: r })}
                    style={{
                      padding: '4px 10px',
                      borderRadius: '6px',
                      fontSize: '11px',
                      fontWeight: lokasi.radius === r ? '700' : '500',
                      background: lokasi.radius === r ? '#0089d7' : '#f1f5f9',
                      color: lokasi.radius === r ? '#ffffff' : '#475569',
                      border: 'none',
                      cursor: 'pointer',
                    }}
                  >
                    {r}m
                  </button>
                ))}
              </div>

              <p style={{ fontSize: '11px', color: '#64748b', marginTop: '8px', lineHeight: '1.4' }}>
                Pamong harus berada di dalam radius lingkaran ini agar sistem mengizinkan pengisian presensi masuk dan pulang.
              </p>
            </div>

            <div style={{ paddingTop: '8px' }}>
              <button
                onClick={handleSave}
                disabled={loading}
                className="btn-primary"
                style={{
                  width: '100%',
                  justifyContent: 'center',
                  padding: '14px',
                  fontSize: '14px',
                  fontWeight: '700',
                  borderRadius: '12px',
                  boxShadow: '0 4px 14px rgba(0, 137, 215, 0.3)',
                }}
              >
                {loading ? (
                  <>
                    <div className="spinner" style={{ width: '18px', height: '18px', borderWidth: '2px' }} />
                    <span>Menyimpan Titik Lokasi...</span>
                  </>
                ) : (
                  <>
                    <IconCheckCircle size={18} color="#ffffff" />
                    <span>Simpan Titik Lokasi Kantor</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
