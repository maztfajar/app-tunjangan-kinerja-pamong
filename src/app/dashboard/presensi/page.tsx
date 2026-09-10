'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import dynamic from 'next/dynamic';
import { startFastGps } from '@/lib/geolocation';

const MapPicker = dynamic(() => import('@/components/presensi/MapPicker'), {
  ssr: false,
  loading: () => (
    <div
      style={{
        width: '100%',
        height: '100%',
        minHeight: '280px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#f8fafc',
        gap: '12px',
        color: '#64748b',
        borderRadius: '12px',
      }}
    >
      <div className="spinner" style={{ width: '28px', height: '28px', borderWidth: '3px' }} />
      <span style={{ fontSize: '13px', fontWeight: '600' }}>Menyiapkan Peta GPS...</span>
    </div>
  ),
});

interface JamKerjaData {
  jamMasuk: string;
  jamPulang: string;
  toleransiSebelumMasuk: number;
  toleransiKeterlambatan: number;
  toleransiPulang: number;
  durasiKerjaMenit: number;
}

interface PresensiData {
  id?: string;
  tanggal: string;
  jamMasuk: string | null;
  jamPulang: string | null;
  statusMasuk: string | null;
  keterlambatan: number | null;
  mendahului: number | null;
  persenTerlambat: number | null;
  persenMendahului: number | null;
  targetJamPulang: string | null;
  durasiKerjaMenit: number | null;
  persentaseHarian: number | null;
}

const DEFAULT_LOKASI = {
  latitude: -7.841817942758396,
  longitude: 110.1685866543569,
  radius: 100,
  namaLokasi: 'Kapanewon Pengasih',
};

export default function PresensiPage() {
  const [lokasi, setLokasi] = useState<{ latitude: number; longitude: number; radius: number; namaLokasi: string }>(DEFAULT_LOKASI);
  const [userPos, setUserPos] = useState<{ lat: number; lng: number } | null>(null);
  const [loading, setLoading] = useState(false);
  const [gpsLoading, setGpsLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<'success' | 'error'>('success');
  const [presensiHariIni, setPresensiHariIni] = useState<PresensiData | null>(null);
  const [jamKerja, setJamKerja] = useState<JamKerjaData>({
    jamMasuk: '07:30',
    jamPulang: '15:45',
    toleransiSebelumMasuk: 30,
    toleransiKeterlambatan: 15,
    toleransiPulang: 120,
    durasiKerjaMenit: 495,
  });
  const watchIdRef = useRef<(() => void) | number | null>(null);

  // State untuk modal konfirmasi pulang awal
  const [confirmPulangAwal, setConfirmPulangAwal] = useState<{
    show: boolean;
    menitMendahului: number;
    persenMendahului: number;
    targetStr: string;
  } | null>(null);

  const fetchLokasi = useCallback(async () => {
    try {
      const res = await fetch('/api/lokasi');
      const data = await res.json();
      if (data.lokasi) {
        setLokasi(data.lokasi);
        try {
          localStorage.setItem('cached_lokasi_kantor', JSON.stringify(data.lokasi));
        } catch {}
      }
    } catch (err) {
      console.error('Fetch lokasi error:', err);
    }
  }, []);

  const fetchPresensiHariIni = useCallback(async () => {
    try {
      const now = new Date();
      const bulan = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
      const res = await fetch(`/api/presensi?bulan=${bulan}`);
      const data = await res.json();
      if (data.jamKerja) setJamKerja(data.jamKerja);

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayP = (data.presensi || []).find((p: { tanggal: string }) => {
        const pt = new Date(p.tanggal);
        pt.setHours(0, 0, 0, 0);
        return pt.getTime() === today.getTime();
      });
      if (todayP) setPresensiHariIni(todayP);
    } catch (err) {
      console.error('Fetch presensi error:', err);
    }
  }, []);

  const stopGpsTracking = useCallback(() => {
    if (watchIdRef.current === null) return;
    if (typeof watchIdRef.current === 'function') {
      try {
        watchIdRef.current();
      } catch {}
    } else if (typeof navigator !== 'undefined' && navigator.geolocation) {
      try {
        navigator.geolocation.clearWatch(watchIdRef.current);
      } catch {}
    }
    watchIdRef.current = null;
  }, []);

  // Helper simulasi lokasi kantor jika GPS diblokir di HP
  const handleSimulasiLokasiKantor = useCallback(() => {
    if (!lokasi) return;
    setUserPos({ lat: lokasi.latitude, lng: lokasi.longitude });
    setGpsLoading(false);
    setMessage('Mode Simulasi: Posisi GPS berhasil diset di titik kantor kalurahan.');
    setMessageType('success');
    try {
      sessionStorage.setItem('last_user_lat', String(lokasi.latitude));
      sessionStorage.setItem('last_user_lng', String(lokasi.longitude));
    } catch {}
  }, [lokasi]);

  // Pelacakan GPS Cepat & Akurat untuk Smartphone (iPhone & Android)
  const startGpsTracking = useCallback(() => {
    stopGpsTracking();
    setMessage('');

    if (typeof window === 'undefined') return;

    // Cek protokol keamanan (HTTPS diperlukan untuk GPS di smartphone non-localhost)
    const isSecure = window.isSecureContext || window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    if (!isSecure) {
      setMessage('Akses GPS di smartphone dibatasi oleh browser karena menggunakan protokol HTTP. Gunakan HTTPS atau tombol "Simulasi Titik Kantor" di bawah.');
      setMessageType('error');
      setGpsLoading(false);
      return;
    }

    if (!navigator.geolocation) {
      setMessage('Fitur GPS tidak didukung oleh browser ini.');
      setMessageType('error');
      setGpsLoading(false);
      return;
    }

    setGpsLoading(true);

    const applyPosition = (pos: GeolocationPosition) => {
      const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
      setUserPos(coords);
      setGpsLoading(false);
      try {
        sessionStorage.setItem('last_user_lat', String(coords.lat));
        sessionStorage.setItem('last_user_lng', String(coords.lng));
      } catch {}
    };

    // Mengembalikan fungsi penghenti pelacakan (disimpan ke watchIdRef)
    const cleanup = startFastGps(
      applyPosition,
      (err) => {
        setGpsLoading(false);
        setUserPos((prev) => {
          if (!prev) {
            if (err.code === err.PERMISSION_DENIED) {
              setMessage('Izin GPS ditolak oleh browser/ponsel. Buka setelan browser (ikon gembok/setelan situs di samping alamat web), ubah Lokasi menjadi "Izinkan / Allow".');
            } else if (err.code === err.POSITION_UNAVAILABLE) {
              setMessage('Sinyal GPS ponsel tidak terdeteksi. Pastikan GPS/Lokasi di perangkat ponsel Anda aktif.');
            } else if (err.code === err.TIMEOUT) {
              setMessage('Waktu permintaan GPS habis. Silakan klik tombol "Refresh GPS" lagi atau gunakan Simulasi Titik Kantor.');
            } else {
              setMessage(`Gagal membaca GPS: ${err.message}`);
            }
            setMessageType('error');
          }
          return prev;
        });
      }
    );
    watchIdRef.current = cleanup;
  }, [stopGpsTracking]);

  useEffect(() => {
    // Restore cached lokasi & GPS di client setelah hydration
    try {
      const cached = localStorage.getItem('cached_lokasi_kantor');
      if (cached) setLokasi(JSON.parse(cached));
      const lat = sessionStorage.getItem('last_user_lat');
      const lng = sessionStorage.getItem('last_user_lng');
      if (lat && lng) {
        setUserPos({ lat: parseFloat(lat), lng: parseFloat(lng) });
        setGpsLoading(false);
      }
    } catch {}

    fetchLokasi();
    fetchPresensiHariIni();
    startGpsTracking();

    return () => {
      stopGpsTracking();
    };
  }, [fetchLokasi, fetchPresensiHariIni, startGpsTracking, stopGpsTracking]);

  // Hitung jarak murni secara deklaratif
  const jarak = useMemo(() => {
    if (!lokasi || !userPos) return null;
    const R = 6371000;
    const toRad = (deg: number) => (deg * Math.PI) / 180;
    const dLat = toRad(lokasi.latitude - userPos.lat);
    const dLng = toRad(lokasi.longitude - userPos.lng);
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(toRad(userPos.lat)) * Math.cos(toRad(lokasi.latitude)) * Math.sin(dLng / 2) ** 2;
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return Math.round(R * c);
  }, [lokasi, userPos]);

  const isInRadius = jarak !== null && lokasi !== null && jarak <= lokasi.radius;

  // Format jam helper
  const formatJam = (d: string | null) => {
    if (!d) return '-';
    return new Date(d).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) + ' WIB';
  };

  // Eksekusi API presensi
  const eksekusiAbsen = async (tipe: 'masuk' | 'pulang') => {
    if (!userPos) {
      setMessage('Posisi GPS belum tersedia. Silakan klik Refresh GPS dan izinkan akses lokasi.');
      setMessageType('error');
      return;
    }
    setLoading(true);
    setMessage('');
    try {
      const res = await fetch('/api/presensi', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tipe,
          latitude: userPos.lat,
          longitude: userPos.lng,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setMessage(data.message);
        setMessageType('success');
        fetchPresensiHariIni();
      } else {
        setMessage(data.error);
        setMessageType('error');
      }
    } catch {
      setMessage('Terjadi kesalahan koneksi saat memproses presensi');
      setMessageType('error');
    }
    setLoading(false);
  };

  // Handler klik absen dengan validasi early departure warning
  const handleAbsenClick = (tipe: 'masuk' | 'pulang') => {
    if (tipe === 'pulang' && presensiHariIni?.targetJamPulang) {
      const targetTime = new Date(presensiHariIni.targetJamPulang).getTime();
      const now = Date.now();
      if (now < targetTime) {
        const diffMenit = Math.ceil((targetTime - now) / 60000);
        const persen = parseFloat(((diffMenit / (jamKerja.durasiKerjaMenit || 495)) * 100).toFixed(2));
        const targetStr = new Date(presensiHariIni.targetJamPulang).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + ' WIB';
        setConfirmPulangAwal({
          show: true,
          menitMendahului: diffMenit,
          persenMendahului: persen,
          targetStr,
        });
        return;
      }
    }
    eksekusiAbsen(tipe);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div>
        <h2 style={{ fontSize: '22px', fontWeight: '800', color: '#0f172a', marginBottom: '4px' }}>
          Presensi GPS Pamong 📌
        </h2>
        <p style={{ color: '#64748b', fontSize: '13px' }}>
          Validasi kehadiran masuk & pulang terintegrasi jam kerja dan radius kantor kalurahan
        </p>
      </div>

      {/* Grid Responsif: 1 Kolom di Handphone, 2 Kolom di Desktop */}
      <div className="presensi-grid">
        {/* Peta GPS */}
        <div className="glass-card-static" style={{ padding: '4px', overflow: 'hidden' }}>
          <div
            style={{
              height: 'clamp(260px, 38vh, 440px)',
              borderRadius: '12px',
              overflow: 'hidden',
              position: 'relative',
            }}
          >
            {lokasi ? (
              <MapPicker
                latitude={lokasi.latitude}
                longitude={lokasi.longitude}
                radius={lokasi.radius}
                interactive={true}
                showUserPosition={!!userPos}
                userLat={userPos?.lat}
                userLng={userPos?.lng}
              />
            ) : (
              <div
                style={{
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: '#f8fafc',
                  gap: '12px',
                  color: '#64748b',
                }}
              >
                <div className="spinner" style={{ width: '28px', height: '28px', borderWidth: '3px' }} />
                <span style={{ fontSize: '13px', fontWeight: '600' }}>Memuat Peta Koordinat Kantor Kalurahan...</span>
              </div>
            )}
          </div>
        </div>

        {/* Panel Kontrol Presensi */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Status Jadwal & Target Presensi Hari Ini */}
          <div className="glass-card-static" style={{ padding: '18px 20px', borderLeft: '4px solid #7c3aed' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '16px' }}>⏰</span>
                <h3 style={{ fontSize: '13px', fontWeight: '700', color: '#0f172a', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Jadwal & Target Presensi
                </h3>
              </div>
              {presensiHariIni?.statusMasuk && (
                <span
                  style={{
                    fontSize: '11px',
                    fontWeight: '700',
                    padding: '3px 8px',
                    borderRadius: '6px',
                    background:
                      presensiHariIni.statusMasuk === 'Tepat Waktu'
                        ? '#ecfdf5'
                        : presensiHariIni.statusMasuk === 'Telat dalam toleransi'
                        ? '#fefce8'
                        : '#fef2f2',
                    color:
                      presensiHariIni.statusMasuk === 'Tepat Waktu'
                        ? '#059669'
                        : presensiHariIni.statusMasuk === 'Telat dalam toleransi'
                        ? '#b45309'
                        : '#dc2626',
                    border: `1px solid ${
                      presensiHariIni.statusMasuk === 'Tepat Waktu'
                        ? '#a7f3d0'
                        : presensiHariIni.statusMasuk === 'Telat dalam toleransi'
                        ? '#fde68a'
                        : '#fecaca'
                    }`,
                  }}
                >
                  {presensiHariIni.statusMasuk}
                  {presensiHariIni.keterlambatan ? ` (+${presensiHariIni.keterlambatan}m)` : ''}
                </span>
              )}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', marginBottom: '10px' }}>
              <div>
                <span style={{ fontSize: '11px', color: '#64748b' }}>Absen Masuk:</span>
                <div style={{ fontSize: '15px', fontWeight: '800', color: presensiHariIni?.jamMasuk ? '#059669' : '#d97706' }}>
                  {formatJam(presensiHariIni?.jamMasuk || null)}
                </div>
              </div>
              <div>
                <span style={{ fontSize: '11px', color: '#64748b' }}>Target Pulang:</span>
                <div style={{ fontSize: '15px', fontWeight: '800', color: '#7c3aed' }}>
                  {presensiHariIni?.targetJamPulang
                    ? new Date(presensiHariIni.targetJamPulang).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + ' WIB'
                    : jamKerja.jamPulang + ' WIB'}
                </div>
              </div>
              <div>
                <span style={{ fontSize: '11px', color: '#64748b' }}>Absen Pulang:</span>
                <div style={{ fontSize: '15px', fontWeight: '800', color: presensiHariIni?.jamPulang ? '#059669' : '#64748b' }}>
                  {formatJam(presensiHariIni?.jamPulang || null)}
                </div>
              </div>
            </div>

            {presensiHariIni?.jamMasuk && (presensiHariIni.keterlambatan || 0) > 0 && (
              <div
                style={{
                  fontSize: '11px',
                  color: '#7c3aed',
                  background: '#f5f3ff',
                  padding: '6px 10px',
                  borderRadius: '6px',
                  border: '1px solid #ddd6fe',
                  lineHeight: '1.4',
                }}
              >
                ℹ️ Jam pulang digeser mundur <b>{presensiHariIni.keterlambatan} menit</b> agar beban kerja Anda tetap terpenuhi <b>{jamKerja.durasiKerjaMenit} menit</b> (100%).
              </div>
            )}
          </div>

          {/* Status GPS & Jarak */}
          <div className="glass-card-static" style={{ padding: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <h3 style={{ fontSize: '12px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                📡 Status Lokasi GPS
              </h3>
              <button
                onClick={startGpsTracking}
                disabled={gpsLoading}
                className="btn-outline"
                style={{ padding: '4px 10px', fontSize: '11px', minHeight: '32px' }}
                title="Perbarui GPS Real-time"
              >
                {gpsLoading ? '⏳ Mendeteksi...' : '🔄 Refresh GPS'}
              </button>
            </div>

            {gpsLoading ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 0' }}>
                <div className="spinner" style={{ width: '18px', height: '18px' }} />
                <span style={{ color: '#64748b', fontSize: '13px' }}>Mendeteksi posisi perangkat Anda...</span>
              </div>
            ) : userPos ? (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontSize: '13px' }}>
                  <span style={{ color: '#64748b' }}>Koordinat Anda</span>
                  <span style={{ color: '#0f172a', fontWeight: '600', fontFamily: 'monospace' }}>
                    {userPos.lat.toFixed(5)}, {userPos.lng.toFixed(5)}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px', fontSize: '13px' }}>
                  <span style={{ color: '#64748b' }}>Jarak ke Kantor</span>
                  <span
                    style={{
                      color: isInRadius ? '#059669' : '#dc2626',
                      fontSize: '16px',
                      fontWeight: '800',
                    }}
                  >
                    {jarak !== null ? `${jarak} meter` : '-'}
                  </span>
                </div>
                <div
                  style={{
                    padding: '10px 14px',
                    borderRadius: '10px',
                    background: isInRadius ? '#ecfdf5' : '#fef2f2',
                    border: `1px solid ${isInRadius ? '#a7f3d0' : '#fecaca'}`,
                    color: isInRadius ? '#047857' : '#b91c1c',
                    fontSize: '12px',
                    fontWeight: '600',
                    textAlign: 'center',
                    lineHeight: '1.4',
                  }}
                >
                  {isInRadius
                    ? `✅ Anda berada dalam radius kantor (${lokasi?.radius}m)`
                    : `❌ Di luar radius (Radius maks: ${lokasi?.radius}m). Dekati kantor untuk presensi.`}
                </div>
              </div>
            ) : (
              <div style={{ padding: '8px 0', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ color: '#dc2626', fontSize: '12px', lineHeight: '1.4' }}>
                  ❌ Sinyal GPS belum terdeteksi. Browser smartphone membatasi GPS pada koneksi HTTP (bukan HTTPS).
                </div>
                <button
                  type="button"
                  onClick={handleSimulasiLokasiKantor}
                  className="btn-outline"
                  style={{
                    padding: '8px 12px',
                    fontSize: '12px',
                    fontWeight: '700',
                    color: '#1d4ed8',
                    borderColor: '#93c5fd',
                    background: '#eff6ff',
                    borderRadius: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                  }}
                >
                  🏢 Gunakan Titik Kantor (Simulasi Presensi)
                </button>
              </div>
            )}
          </div>

          {/* Tombol Aksi Presensi */}
          <div className="glass-card-static" style={{ padding: '20px' }}>
            <h3 style={{ fontSize: '12px', fontWeight: '700', color: '#64748b', marginBottom: '14px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              ⏰ Tombol Presensi
            </h3>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <button
                onClick={() => handleAbsenClick('masuk')}
                disabled={loading || !!presensiHariIni?.jamMasuk || !isInRadius}
                className="btn-success"
                style={{
                  padding: '14px 10px',
                  fontSize: '14px',
                  opacity: presensiHariIni?.jamMasuk || !isInRadius ? 0.45 : 1,
                  flexDirection: 'column',
                  gap: '4px',
                }}
              >
                <span style={{ fontSize: '20px' }}>🟢</span>
                <span>{presensiHariIni?.jamMasuk ? 'Sudah Masuk' : 'Absen Masuk'}</span>
              </button>

              <button
                onClick={() => handleAbsenClick('pulang')}
                disabled={loading || !presensiHariIni?.jamMasuk || !!presensiHariIni?.jamPulang || !isInRadius}
                className="btn-primary"
                style={{
                  padding: '14px 10px',
                  fontSize: '14px',
                  opacity: (!presensiHariIni?.jamMasuk || presensiHariIni?.jamPulang || !isInRadius) ? 0.45 : 1,
                  flexDirection: 'column',
                  gap: '4px',
                }}
              >
                <span style={{ fontSize: '20px' }}>🔴</span>
                <span>{presensiHariIni?.jamPulang ? 'Sudah Pulang' : 'Absen Pulang'}</span>
              </button>
            </div>
          </div>

          {/* Feedback Notifikasi */}
          {message && (
            <div
              style={{
                padding: '12px 14px',
                borderRadius: '12px',
                background: messageType === 'success' ? '#ecfdf5' : '#fef2f2',
                border: `1px solid ${messageType === 'success' ? '#a7f3d0' : '#fecaca'}`,
                color: messageType === 'success' ? '#047857' : '#b91c1c',
                fontSize: '13px',
                lineHeight: '1.4',
              }}
            >
              {message}
            </div>
          )}
        </div>
      </div>

      {/* MODAL KONFIRMASI PULANG MENDAHULUI */}
      {confirmPulangAwal?.show && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '16px',
          }}
          onClick={() => setConfirmPulangAwal(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: '#ffffff',
              borderRadius: '16px',
              padding: '24px',
              maxWidth: '440px',
              width: '100%',
              boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
            }}
          >
            <div style={{ textAlign: 'center', marginBottom: '16px' }}>
              <span style={{ fontSize: '40px' }}>⚠️</span>
              <h3 style={{ fontSize: '18px', fontWeight: '800', color: '#b45309', marginTop: '8px' }}>
                Peringatan Pulang Mendahului
              </h3>
            </div>
            <div style={{ fontSize: '13px', color: '#334155', lineHeight: '1.6', marginBottom: '20px' }}>
              <p style={{ marginBottom: '8px' }}>
                Target jam pulang Anda hari ini adalah <b>{confirmPulangAwal.targetStr}</b>.
              </p>
              <div
                style={{
                  background: '#fef2f2',
                  border: '1px solid #fecaca',
                  borderRadius: '10px',
                  padding: '12px',
                  color: '#991b1b',
                  marginBottom: '10px',
                }}
              >
                Jika Anda absen pulang sekarang, Anda akan tercatat mendahului <b>{confirmPulangAwal.menitMendahului} menit</b> dengan estimasi potongan kedisiplinan <b>{confirmPulangAwal.persenMendahului}%</b>.
              </div>
              <p>Apakah Anda yakin tetap ingin melakukan absen pulang?</p>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <button
                onClick={() => setConfirmPulangAwal(null)}
                className="btn-outline"
                style={{ padding: '10px', fontSize: '13px', justifyContent: 'center' }}
              >
                Batal
              </button>
              <button
                onClick={() => {
                  setConfirmPulangAwal(null);
                  eksekusiAbsen('pulang');
                }}
                className="btn-primary"
                style={{ padding: '10px', fontSize: '13px', justifyContent: 'center', background: '#dc2626' }}
              >
                Ya, Tetap Pulang
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
