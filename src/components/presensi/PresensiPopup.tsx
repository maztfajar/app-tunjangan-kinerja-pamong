'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import dynamic from 'next/dynamic';
import { IconMapPin, IconClock, IconClose } from '@/components/ui/Icons';
import { getEffectiveJamKerja } from '@/lib/jam-kerja-helper';

const MapPicker = dynamic(() => import('@/components/presensi/MapPicker'), {
  ssr: false,
  loading: () => (
    <div
      style={{
        height: '100%',
        minHeight: '260px',
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
      <span style={{ fontSize: '13px', fontWeight: '600' }}>Memuat Komponen Peta...</span>
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
  isJumatKhusus?: boolean;
  jamMasukJumat?: string;
  jamPulangJumat?: string;
  durasiKerjaJumatMenit?: number;
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
  keterangan?: string | null;
}

interface LokasiKantor {
  latitude: number;
  longitude: number;
  radius: number;
  namaLokasi: string;
}

interface HariLiburItem {
  id: string;
  tanggal: string;
  tanggalKey?: string;
  keterangan: string;
  sumber: string;
  isLibur: boolean;
}

interface PresensiPopupProps {
  isOpen: boolean;
  onClose: () => void;
  onPresensiDone?: () => void;
}

const DEFAULT_LOKASI: LokasiKantor = {
  latitude: -7.841817942758396,
  longitude: 110.1685866543569,
  radius: 100,
  namaLokasi: 'Kapanewon Pengasih',
};

export default function PresensiPopup({ isOpen, onClose, onPresensiDone }: PresensiPopupProps) {
  const [lokasi, setLokasi] = useState<LokasiKantor>(DEFAULT_LOKASI);
  const [userPos, setUserPos] = useState<{ lat: number; lng: number } | null>(null);
  const [loading, setLoading] = useState(false);
  const [gpsLoading, setGpsLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<'success' | 'error'>('success');
  const [presensiHariIni, setPresensiHariIni] = useState<PresensiData | null>(null);
  const [currentTime, setCurrentTime] = useState<Date>(new Date());
  const [jamKerja, setJamKerja] = useState<JamKerjaData>({
    jamMasuk: '07:30',
    jamPulang: '15:45',
    toleransiSebelumMasuk: 30,
    toleransiKeterlambatan: 15,
    toleransiPulang: 120,
    durasiKerjaMenit: 495,
  });
  const [hariLiburList, setHariLiburList] = useState<HariLiburItem[]>([]);
  const [animateIn, setAnimateIn] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [confirmPulangAwal, setConfirmPulangAwal] = useState<{
    show: boolean;
    menitMendahului: number;
    persenMendahului: number;
    targetStr: string;
  } | null>(null);
  const watchIdRef = useRef<number | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Animasi entrance & restore cached data
  useEffect(() => {
    if (isOpen) {
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

      const timer = setTimeout(() => setAnimateIn(true), 50);
      return () => clearTimeout(timer);
    } else {
      setAnimateIn(false);
    }
  }, [isOpen]);

  // Real-time Clock
  useEffect(() => {
    if (!isOpen) return;
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(interval);
  }, [isOpen]);

  // Status Hari Ini
  const todayCalendarStatus = useMemo(() => {
    const now = currentTime;
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    const todayKey = `${y}-${m}-${d}`;
    const dayOfWeek = now.getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

    const holidayItem = hariLiburList.find((h) => {
      const hKey = h.tanggalKey || h.tanggal.slice(0, 10);
      return hKey === todayKey;
    });

    if (holidayItem) {
      if (holidayItem.isLibur) {
        return { type: 'libur' as const, isWorkDay: false, label: `🔴 Hari Libur: ${holidayItem.keterangan}` };
      } else {
        return { type: 'masuk' as const, isWorkDay: true, label: `🟢 Masuk Kerja: ${holidayItem.keterangan}` };
      }
    }

    if (isWeekend) {
      return { type: 'weekend' as const, isWorkDay: false, label: `📅 Libur Akhir Pekan (${dayOfWeek === 0 ? 'Minggu' : 'Sabtu'})` };
    }

    return { type: 'reguler' as const, isWorkDay: true, label: '💼 Hari Kerja Efektif' };
  }, [currentTime, hariLiburList]);

  // Perhitungan status jadwal buka & tutup absensi (mendukung jadwal khusus Jumat)
  const jadwalStatus = useMemo(() => {
    if (!currentTime || !jamKerja?.jamMasuk || !jamKerja?.jamPulang) {
      return {
        isBelumBuka: false,
        isSudahTutup: false,
        batasBukaStr: '',
        batasTutupStr: '',
        effective: null,
      };
    }

    const effective = getEffectiveJamKerja(jamKerja, currentTime);
    const [mH, mM] = effective.jamMasuk.split(':').map(Number);
    const [pH, pM] = effective.jamPulang.split(':').map(Number);

    const now = currentTime;
    const jamMasukDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), mH || 0, mM || 0, 0);
    const jamPulangStandar = new Date(now.getFullYear(), now.getMonth(), now.getDate(), pH || 0, pM || 0, 0);

    const toleransiBuka = effective.toleransiSebelumMasuk ?? 30;
    const toleransiTutup = effective.toleransiPulang ?? 120;

    const batasBukaAbsen = new Date(jamMasukDate.getTime() - toleransiBuka * 60000);
    const batasTutupAbsensi = new Date(jamPulangStandar.getTime() + toleransiTutup * 60000);

    const isBelumBuka = now.getTime() < batasBukaAbsen.getTime();
    const isSudahTutup = now.getTime() > batasTutupAbsensi.getTime();

    const pad = (n: number) => String(n).padStart(2, '0');
    const formatTime = (d: Date) => `${pad(d.getHours())}:${pad(d.getMinutes())} WIB`;

    return {
      isBelumBuka,
      isSudahTutup,
      batasBukaStr: formatTime(batasBukaAbsen),
      batasTutupStr: formatTime(batasTutupAbsensi),
      effective,
    };
  }, [currentTime, jamKerja]);

  const fetchData = useCallback(async () => {
    try {
      // Lokasi kantor
      const lokRes = await fetch('/api/lokasi');
      const lokData = await lokRes.json();
      if (lokData.lokasi) {
        setLokasi(lokData.lokasi);
        try {
          localStorage.setItem('cached_lokasi_kantor', JSON.stringify(lokData.lokasi));
        } catch {}
      }

      // Presensi hari ini
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

      // Hari Libur
      const liburRes = await fetch(`/api/hari-libur?tahun=${now.getFullYear()}`);
      const liburData = await liburRes.json();
      if (liburData.hariLibur) setHariLiburList(liburData.hariLibur);
    } catch (err) {
      console.error('Fetch popup data error:', err);
    }
  }, []);

  const stopGpsTracking = useCallback(() => {
    if (watchIdRef.current !== null && typeof navigator !== 'undefined' && navigator.geolocation) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
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

  // Two-Phase GPS: Quick Coarse (WiFi/Cell/Cache ~50ms-2s) → High Accuracy Satellite Tracking
  const startGpsTracking = useCallback(() => {
    stopGpsTracking();

    if (typeof window === 'undefined') return;

    // Cek apakah browser dijalankan pada origin tidak aman (HTTP pada IP ponsel)
    const isSecure = window.isSecureContext || window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    if (!isSecure) {
      setMessage('Akses GPS di ponsel dibatasi oleh browser karena URL HTTP (bukan HTTPS). Gunakan tombol "Simulasi Titik Kantor" di bawah atau akses via HTTPS.');
      setMessageType('error');
      setGpsLoading(false);
      return;
    }

    if (!navigator.geolocation) {
      setMessage('GPS tidak didukung browser Anda');
      setMessageType('error');
      setGpsLoading(false);
      return;
    }

    setGpsLoading(true);

    // Failsafe timer: Beri waktu toleransi hingga 35 detik agar perangkat baru sempat mengizinkan lokasi
    const safetyTimer = setTimeout(() => {
      setGpsLoading(false);
    }, 35000);

    const applyPosition = (pos: GeolocationPosition) => {
      clearTimeout(safetyTimer);
      const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
      setUserPos(coords);
      setGpsLoading(false);
      try {
        sessionStorage.setItem('last_user_lat', String(coords.lat));
        sessionStorage.setItem('last_user_lng', String(coords.lng));
      } catch {}
    };

    const handleGpsError = (err: GeolocationPositionError) => {
      clearTimeout(safetyTimer);
      setGpsLoading(false);
      setUserPos((prev) => {
        if (!prev) {
          if (err.code === err.PERMISSION_DENIED) {
            setMessage(`Izin GPS ditolak oleh browser/ponsel. Aktifkan izin lokasi situs di peramban.`);
          } else if (err.code === err.POSITION_UNAVAILABLE) {
            setMessage('Sinyal GPS ponsel tidak terdeteksi. Pastikan GPS ponsel aktif.');
          } else if (err.code === err.TIMEOUT) {
            setMessage('Permintaan GPS habis waktu. Silakan coba lagi atau gunakan simulasi titik kantor.');
          } else {
            setMessage(`Gagal mendeteksi sinyal GPS: ${err.message}.`);
          }
          setMessageType('error');
        }
        return prev;
      });
    };

    try {
      // FASE 1: Posisi cepat (WiFi/Cell Tower/Cache) dengan batas toleran 35 detik
      navigator.geolocation.getCurrentPosition(
        applyPosition,
        (err) => {
          if (err.code === err.PERMISSION_DENIED) {
            handleGpsError(err);
          }
        },
        { enableHighAccuracy: false, timeout: 35000, maximumAge: 300000 }
      );

      // FASE 2: Pelacakan satelit akurasi tinggi (35 detik)
      const id = navigator.geolocation.watchPosition(
        applyPosition,
        handleGpsError,
        { enableHighAccuracy: true, timeout: 35000, maximumAge: 3000 }
      );
      watchIdRef.current = id;
    } catch (e) {
      clearTimeout(safetyTimer);
      console.error('Error starting GPS tracking in PresensiPopup:', e);
      setGpsLoading(false);
    }
  }, [stopGpsTracking]);

  useEffect(() => {
    if (isOpen) {
      fetchData();
      startGpsTracking();
    } else {
      stopGpsTracking();
    }
    return () => {
      stopGpsTracking();
    };
  }, [isOpen, fetchData, startGpsTracking, stopGpsTracking]);

  // Hitung jarak
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

  const formatJam = (d: string | null) => {
    if (!d) return '-';
    return new Date(d).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) + ' WIB';
  };

  // Eksekusi API presensi
  const eksekusiAbsen = async (tipe: 'masuk' | 'pulang') => {
    if (!userPos) {
      setMessage('Posisi GPS belum tersedia. Izinkan akses lokasi di browser.');
      setMessageType('error');
      return;
    }

    // Cek hari libur
    if (tipe === 'masuk' && todayCalendarStatus && !todayCalendarStatus.isWorkDay) {
      setMessage(`Presensi tidak tersedia: Hari ini adalah ${todayCalendarStatus.label}`);
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
        // Refresh data presensi
        const now = new Date();
        const bulan = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
        const presRes = await fetch(`/api/presensi?bulan=${bulan}`);
        const presData = await presRes.json();
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const todayP = (presData.presensi || []).find((p: { tanggal: string }) => {
          const pt = new Date(p.tanggal);
          pt.setHours(0, 0, 0, 0);
          return pt.getTime() === today.getTime();
        });
        if (todayP) setPresensiHariIni(todayP);
        if (onPresensiDone) onPresensiDone();
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

  // Handler klik absen dengan validasi peringatan pulang mendahului
  const handleAbsenClick = (tipe: 'masuk' | 'pulang') => {
    if (tipe === 'pulang' && presensiHariIni?.targetJamPulang) {
      const targetTime = new Date(presensiHariIni.targetJamPulang).getTime();
      const now = Date.now();
      if (now < targetTime) {
        const diffMenit = Math.ceil((targetTime - now) / 60000);
        const effective = getEffectiveJamKerja(jamKerja, new Date());
        const durasi = effective.durasiKerjaMenit || 495;
        const persen = parseFloat(((diffMenit / durasi) * 100).toFixed(2));
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

  // Status presensi saat ini
  const sudahMasuk = !!presensiHariIni?.jamMasuk;
  const sudahPulang = !!presensiHariIni?.jamPulang;
  const sudahLengkap = sudahMasuk && sudahPulang;

  if (!isOpen || !mounted) return null;

  return createPortal(
    <>
      {/* Global keyframe styles */}
      <style jsx global>{`
        @keyframes presensiPopupSlideUp {
          from {
            opacity: 0;
            transform: translateY(40px) scale(0.95);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
        @keyframes presensiPopupFadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes presensiPulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.05); }
        }
        @keyframes presensiGlow {
          0%, 100% { box-shadow: 0 0 5px rgba(67, 97, 238, 0.3); }
          50% { box-shadow: 0 0 20px rgba(67, 97, 238, 0.6); }
        }
        @keyframes presensiBreathe {
          0%, 100% { opacity: 0.6; }
          50% { opacity: 1; }
        }
        @keyframes presensiSuccessCheck {
          0% { transform: scale(0); opacity: 0; }
          50% { transform: scale(1.2); }
          100% { transform: scale(1); opacity: 1; }
        }
      `}</style>

      <div
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(15, 23, 42, 0.7)',
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'center',
          overflowY: 'auto',
          WebkitOverflowScrolling: 'touch',
          zIndex: 99999,
          padding: '12px 10px 24px 10px',
          animation: animateIn ? 'presensiPopupFadeIn 0.25s ease' : 'none',
        }}
        onClick={() => !loading && onClose()}
      >
        <div
          onClick={(e) => e.stopPropagation()}
          style={{
            background: '#ffffff',
            borderRadius: '20px',
            maxWidth: '520px',
            width: '100%',
            maxHeight: 'calc(100dvh - 24px)',
            overflowY: 'auto',
            overflowX: 'hidden',
            WebkitOverflowScrolling: 'touch',
            boxShadow: '0 25px 60px -12px rgba(0,0,0,0.35), 0 0 0 1px rgba(0,0,0,0.05)',
            display: 'flex',
            flexDirection: 'column',
            margin: 'auto 0',
            animation: animateIn ? 'presensiPopupSlideUp 0.35s cubic-bezier(0.16, 1, 0.3, 1)' : 'none',
          }}
        >
          {/* ============ HEADER (STICKY AT TOP) ============ */}
          <div
            style={{
              padding: '16px 18px 12px',
              background: 'linear-gradient(135deg, #4361ee 0%, #3730a3 100%)',
              borderRadius: '20px 20px 0 0',
              color: '#ffffff',
              position: 'sticky',
              top: 0,
              zIndex: 50,
              overflow: 'hidden',
              boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
            }}
          >
            {/* Dekoratif circles */}
            <div style={{ position: 'absolute', top: '-30px', right: '-30px', width: '100px', height: '100px', borderRadius: '50%', background: 'rgba(255,255,255,0.08)' }} />
            <div style={{ position: 'absolute', bottom: '-20px', left: '-20px', width: '70px', height: '70px', borderRadius: '50%', background: 'rgba(255,255,255,0.05)' }} />

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', position: 'relative', zIndex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div
                  style={{
                    width: '42px',
                    height: '42px',
                    borderRadius: '12px',
                    background: 'rgba(255,255,255,0.2)',
                    backdropFilter: 'blur(4px)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    animation: sudahLengkap ? 'none' : 'presensiGlow 2s ease-in-out infinite',
                  }}
                >
                  <IconMapPin size={22} color="#ffffff" />
                </div>
                <div>
                  <h3 style={{ fontSize: '17px', fontWeight: '800', letterSpacing: '-0.02em', margin: 0 }}>
                    Presensi GPS
                  </h3>
                  <p style={{ fontSize: '11px', opacity: 0.85, margin: '2px 0 0 0', fontWeight: '500' }}>
                    {currentTime.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                  </p>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                {/* Jam Digital */}
                <div
                  style={{
                    background: 'rgba(255,255,255,0.15)',
                    backdropFilter: 'blur(4px)',
                    padding: '6px 12px',
                    borderRadius: '10px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  <IconClock size={14} color="#ffffff" />
                  <span style={{ fontSize: '15px', fontWeight: '800', fontFamily: 'monospace', letterSpacing: '0.5px' }}>
                    {currentTime.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                  </span>
                </div>

                {/* Tombol Close */}
                <button
                  onClick={() => !loading && onClose()}
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '8px',
                    background: 'rgba(255,255,255,0.15)',
                    backdropFilter: 'blur(4px)',
                    border: 'none',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'all 0.15s ease',
                  }}
                  title="Tutup"
                >
                  <IconClose size={16} color="#ffffff" />
                </button>
              </div>
            </div>
          </div>

          {/* ============ KONTEN ============ */}
          <div style={{ padding: '16px 18px 20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>

            {/* Banner Status Hari Ini */}
            <div
              style={{
                padding: '10px 14px',
                borderRadius: '10px',
                background: todayCalendarStatus.isWorkDay ? '#eff6ff' : '#fef2f2',
                border: `1px solid ${todayCalendarStatus.isWorkDay ? '#bfdbfe' : '#fecaca'}`,
                fontSize: '13px',
                fontWeight: '700',
                color: todayCalendarStatus.isWorkDay ? '#1d4ed8' : '#dc2626',
                textAlign: 'center',
              }}
            >
              {todayCalendarStatus.label}
            </div>

            {/* ===== PETA GPS ===== */}
            <div
              style={{
                borderRadius: '14px',
                overflow: 'hidden',
                border: '2px solid #e2e8f0',
                position: 'relative',
              }}
            >
              <div style={{ height: '220px', position: 'relative' }}>
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
                      alignItems: 'center',
                      justifyContent: 'center',
                      background: '#f1f5f9',
                      color: '#64748b',
                      fontSize: '13px',
                    }}
                  >
                    <div className="spinner" style={{ width: '20px', height: '20px', marginRight: '8px' }} />
                    Memuat peta...
                  </div>
                )}
              </div>

              {/* Overlay Status GPS di atas peta */}
              {userPos && jarak !== null && (
                <div
                  style={{
                    position: 'absolute',
                    bottom: '10px',
                    left: '10px',
                    right: '10px',
                    padding: '8px 12px',
                    borderRadius: '10px',
                    background: isInRadius
                      ? 'rgba(16, 185, 129, 0.92)'
                      : 'rgba(239, 68, 68, 0.92)',
                    backdropFilter: 'blur(4px)',
                    color: '#ffffff',
                    fontSize: '12px',
                    fontWeight: '700',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                  }}
                >
                  <span>
                    {isInRadius ? '✅ Dalam Radius Kantor' : '❌ Di Luar Radius Kantor'}
                  </span>
                  <span style={{ fontFamily: 'monospace', fontSize: '13px', fontWeight: '800' }}>
                    {jarak}m / {lokasi?.radius}m
                  </span>
                </div>
              )}
            </div>

            {/* GPS Status Info */}
            {gpsLoading ? (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '10px',
                  padding: '12px',
                  background: '#f8fafc',
                  borderRadius: '10px',
                  border: '1px solid #e2e8f0',
                }}
              >
                <div className="spinner" style={{ width: '18px', height: '18px' }} />
                <span style={{ color: '#64748b', fontSize: '13px', animation: 'presensiBreathe 1.5s ease-in-out infinite' }}>
                  Mendeteksi posisi GPS Anda secara real-time...
                </span>
              </div>
            ) : !userPos ? (
              <div
                style={{
                  padding: '12px 14px',
                  borderRadius: '10px',
                  background: '#fef2f2',
                  border: '1px solid #fecaca',
                  color: '#b91c1c',
                  fontSize: '13px',
                  textAlign: 'center',
                }}
              >
                ⚠️ Sinyal GPS belum terdeteksi. Pada smartphone, browser membatasi akses GPS pada koneksi HTTP (bukan HTTPS).
                <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', marginTop: '10px', flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    onClick={startGpsTracking}
                    style={{
                      padding: '6px 14px',
                      borderRadius: '8px',
                      border: '1px solid #fecaca',
                      background: '#ffffff',
                      color: '#dc2626',
                      fontWeight: '700',
                      fontSize: '12px',
                      cursor: 'pointer',
                    }}
                  >
                    🔄 Refresh GPS
                  </button>
                  <button
                    type="button"
                    onClick={handleSimulasiLokasiKantor}
                    style={{
                      padding: '6px 14px',
                      borderRadius: '8px',
                      border: '1px solid #93c5fd',
                      background: '#eff6ff',
                      color: '#1d4ed8',
                      fontWeight: '700',
                      fontSize: '12px',
                      cursor: 'pointer',
                    }}
                  >
                    🏢 Gunakan Titik Kantor (Simulasi)
                  </button>
                </div>
              </div>
            ) : (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '7px 12px',
                  borderRadius: '8px',
                  background: '#f0fdf4',
                  border: '1px solid #bbf7d0',
                  fontSize: '11px',
                  color: '#166534',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span
                    style={{
                      display: 'inline-block',
                      width: '8px',
                      height: '8px',
                      borderRadius: '50%',
                      background: '#22c55e',
                      boxShadow: '0 0 6px #22c55e',
                    }}
                  />
                  <span style={{ fontWeight: '700' }}>GPS Real-time Aktif (Auto-track)</span>
                </div>
                <button
                  onClick={startGpsTracking}
                  title="Sinkronkan ulang koordinat GPS"
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#15803d',
                    fontSize: '11px',
                    fontWeight: '700',
                    cursor: 'pointer',
                    textDecoration: 'underline',
                    padding: 0,
                  }}
                >
                  🔄 Sinkron Ulang
                </button>
              </div>
            )}

            {/* ===== STATUS PRESENSI HARI INI ===== */}
            {sudahLengkap ? (
              /* ===== SUDAH PRESENSI LENGKAP ===== */
              <div
                style={{
                  padding: '20px',
                  borderRadius: '14px',
                  background: 'linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%)',
                  border: '2px solid #a7f3d0',
                  textAlign: 'center',
                  position: 'relative',
                  overflow: 'hidden',
                }}
              >
                {/* Background decorative */}
                <div style={{ position: 'absolute', top: '-15px', right: '-15px', width: '60px', height: '60px', borderRadius: '50%', background: 'rgba(16,185,129,0.1)' }} />
                <div style={{ position: 'absolute', bottom: '-10px', left: '-10px', width: '40px', height: '40px', borderRadius: '50%', background: 'rgba(16,185,129,0.08)' }} />

                <div style={{ position: 'relative', zIndex: 1 }}>
                  <div style={{ fontSize: '44px', marginBottom: '8px', animation: 'presensiSuccessCheck 0.5s ease' }}>
                    ✅
                  </div>
                  <h4 style={{ fontSize: '17px', fontWeight: '800', color: '#047857', marginBottom: '4px' }}>
                    Anda Telah Melakukan Presensi
                  </h4>
                  <p style={{ fontSize: '13px', color: '#059669', fontWeight: '500', marginBottom: '14px' }}>
                    Presensi masuk & pulang hari ini sudah tercatat
                  </p>

                  {/* Detail Jam */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                    <div
                      style={{
                        padding: '10px',
                        borderRadius: '10px',
                        background: '#ffffff',
                        border: '1px solid #a7f3d0',
                      }}
                    >
                      <div style={{ fontSize: '10px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        Masuk
                      </div>
                      <div style={{ fontSize: '16px', fontWeight: '800', color: '#059669', marginTop: '2px' }}>
                        {formatJam(presensiHariIni?.jamMasuk || null)}
                      </div>
                      {presensiHariIni?.statusMasuk && (
                        <div
                          style={{
                            fontSize: '10px',
                            fontWeight: '700',
                            marginTop: '4px',
                            padding: '2px 6px',
                            borderRadius: '4px',
                            display: 'inline-block',
                            background: presensiHariIni.statusMasuk === 'Tepat Waktu' ? '#dcfce7' : '#fef3c7',
                            color: presensiHariIni.statusMasuk === 'Tepat Waktu' ? '#15803d' : '#b45309',
                          }}
                        >
                          {presensiHariIni.statusMasuk}
                        </div>
                      )}
                    </div>
                    <div
                      style={{
                        padding: '10px',
                        borderRadius: '10px',
                        background: '#ffffff',
                        border: '1px solid #a7f3d0',
                      }}
                    >
                      <div style={{ fontSize: '10px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        Pulang
                      </div>
                      <div style={{ fontSize: '16px', fontWeight: '800', color: '#059669', marginTop: '2px' }}>
                        {formatJam(presensiHariIni?.jamPulang || null)}
                      </div>
                    </div>
                  </div>

                  {/* Opsi perbarui pulang hingga batas tutup absensi */}
                  {!jadwalStatus.isSudahTutup ? (
                    <button
                      onClick={() => handleAbsenClick('pulang')}
                      disabled={loading || !isInRadius}
                      style={{
                        marginTop: '12px',
                        width: '100%',
                        padding: '10px',
                        borderRadius: '10px',
                        border: '1px dashed #059669',
                        background: '#ffffff',
                        color: '#059669',
                        fontSize: '12px',
                        fontWeight: '700',
                        cursor: loading || !isInRadius ? 'not-allowed' : 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                        opacity: loading || !isInRadius ? 0.5 : 1,
                      }}
                    >
                      <span>🔄</span>
                      <span>Perbarui Absen Pulang (Rekam Waktu Terakhir)</span>
                    </button>
                  ) : (
                    <div
                      style={{
                        marginTop: '10px',
                        padding: '6px 10px',
                        borderRadius: '8px',
                        background: '#fef2f2',
                        color: '#991b1b',
                        fontSize: '11px',
                        fontWeight: '600',
                        textAlign: 'center',
                      }}
                    >
                      🛑 Absensi hari ini telah ditutup (Pukul {jadwalStatus.batasTutupStr})
                    </div>
                  )}
                </div>
              </div>
            ) : (
              /* ===== BELUM SELESAI PRESENSI ===== */
              <>
                {/* Banner Status Jadwal Buka / Tutup */}
                {jadwalStatus.isBelumBuka && (
                  <div
                    style={{
                      padding: '8px 12px',
                      borderRadius: '8px',
                      background: '#fffbeb',
                      border: '1px solid #fde68a',
                      color: '#92400e',
                      fontSize: '12px',
                      fontWeight: '600',
                      textAlign: 'center',
                    }}
                  >
                    ⏳ Absensi belum dibuka (Tombol aktif pukul {jadwalStatus.batasBukaStr})
                  </div>
                )}

                {jadwalStatus.isSudahTutup && (
                  <div
                    style={{
                      padding: '8px 12px',
                      borderRadius: '8px',
                      background: '#fef2f2',
                      border: '1px solid #fecaca',
                      color: '#991b1b',
                      fontSize: '12px',
                      fontWeight: '600',
                      textAlign: 'center',
                    }}
                  >
                    🛑 Absensi telah ditutup (Batas akhir pukul {jadwalStatus.batasTutupStr})
                  </div>
                )}

                {/* Peringatan jika jam kerja terpotong batas tutup */}
                {presensiHariIni?.keterangan?.includes('Jam kerja anda akan berkurang') && (
                  <div
                    style={{
                      padding: '8px 12px',
                      borderRadius: '8px',
                      background: '#fffbeb',
                      border: '1px solid #fde68a',
                      color: '#b45309',
                      fontSize: '11px',
                      fontWeight: '600',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      lineHeight: '1.4',
                    }}
                  >
                    <span>⚠️</span>
                    <span><b>Peringatan:</b> {presensiHariIni.keterangan}</span>
                  </div>
                )}

                {/* Status Masuk/Pulang */}
                <div
                  style={{
                    padding: '14px 16px',
                    borderRadius: '12px',
                    background: '#f8fafc',
                    border: '1px solid #e2e8f0',
                  }}
                >
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px', textAlign: 'center' }}>
                    <div>
                      <div style={{ fontSize: '10px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        Masuk
                      </div>
                      <div
                        style={{
                          fontSize: '15px',
                          fontWeight: '800',
                          color: presensiHariIni?.jamMasuk ? '#059669' : '#d97706',
                          marginTop: '2px',
                        }}
                      >
                        {presensiHariIni?.jamMasuk
                          ? new Date(presensiHariIni.jamMasuk).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
                          : '-'}
                      </div>
                      {presensiHariIni?.statusMasuk && (
                        <div
                          style={{
                            fontSize: '9px',
                            fontWeight: '700',
                            marginTop: '3px',
                            padding: '2px 5px',
                            borderRadius: '4px',
                            display: 'inline-block',
                            background: presensiHariIni.statusMasuk === 'Tepat Waktu' ? '#dcfce7' : '#fef3c7',
                            color: presensiHariIni.statusMasuk === 'Tepat Waktu' ? '#15803d' : '#b45309',
                          }}
                        >
                          {presensiHariIni.statusMasuk}
                        </div>
                      )}
                    </div>
                    <div>
                      <div style={{ fontSize: '10px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        Target Pulang
                      </div>
                      <div style={{ fontSize: '15px', fontWeight: '800', color: '#7c3aed', marginTop: '2px' }}>
                        {presensiHariIni?.targetJamPulang
                          ? new Date(presensiHariIni.targetJamPulang).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
                          : (jadwalStatus.effective?.jamPulang || jamKerja.jamPulang)}
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: '10px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        Pulang
                      </div>
                      <div
                        style={{
                          fontSize: '15px',
                          fontWeight: '800',
                          color: presensiHariIni?.jamPulang ? '#059669' : '#94a3b8',
                          marginTop: '2px',
                        }}
                      >
                        {presensiHariIni?.jamPulang
                          ? new Date(presensiHariIni.jamPulang).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
                          : '-'}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Tombol Presensi */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <button
                    onClick={() => handleAbsenClick('masuk')}
                    disabled={loading || jadwalStatus.isBelumBuka || jadwalStatus.isSudahTutup || sudahMasuk || !isInRadius || !todayCalendarStatus.isWorkDay}
                    style={{
                      padding: '14px 10px',
                      borderRadius: '12px',
                      border: 'none',
                      cursor: loading || jadwalStatus.isBelumBuka || jadwalStatus.isSudahTutup || sudahMasuk || !isInRadius || !todayCalendarStatus.isWorkDay ? 'not-allowed' : 'pointer',
                      fontFamily: 'inherit',
                      fontSize: '14px',
                      fontWeight: '800',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '6px',
                      transition: 'all 0.2s ease',
                      background: sudahMasuk
                        ? 'linear-gradient(135deg, #d1d5db 0%, #9ca3af 100%)'
                        : !todayCalendarStatus.isWorkDay
                        ? '#94a3b8'
                        : 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                      color: '#ffffff',
                      opacity: loading || jadwalStatus.isBelumBuka || jadwalStatus.isSudahTutup || sudahMasuk || !isInRadius || !todayCalendarStatus.isWorkDay ? 0.6 : 1,
                      boxShadow: sudahMasuk || !isInRadius || jadwalStatus.isBelumBuka || jadwalStatus.isSudahTutup ? 'none' : '0 4px 14px rgba(16,185,129,0.3)',
                      animation: !sudahMasuk && isInRadius && todayCalendarStatus.isWorkDay && !jadwalStatus.isBelumBuka && !jadwalStatus.isSudahTutup ? 'presensiPulse 2s ease-in-out infinite' : 'none',
                    }}
                  >
                    <span style={{ fontSize: '22px' }}>
                      {jadwalStatus.isBelumBuka ? '🔒' : jadwalStatus.isSudahTutup ? '🛑' : sudahMasuk ? '✅' : !todayCalendarStatus.isWorkDay ? '🔴' : '🟢'}
                    </span>
                    <span>
                      {jadwalStatus.isBelumBuka
                        ? 'Belum Buka'
                        : jadwalStatus.isSudahTutup
                        ? 'Absen Ditutup'
                        : sudahMasuk
                        ? 'Sudah Masuk'
                        : !todayCalendarStatus.isWorkDay
                        ? 'Hari Libur'
                        : 'Absen Masuk'}
                    </span>
                  </button>

                  <button
                    onClick={() => handleAbsenClick('pulang')}
                    disabled={loading || jadwalStatus.isBelumBuka || jadwalStatus.isSudahTutup || !sudahMasuk || !isInRadius}
                    style={{
                      padding: '14px 10px',
                      borderRadius: '12px',
                      border: 'none',
                      cursor: loading || jadwalStatus.isBelumBuka || jadwalStatus.isSudahTutup || !sudahMasuk || !isInRadius ? 'not-allowed' : 'pointer',
                      fontFamily: 'inherit',
                      fontSize: '14px',
                      fontWeight: '800',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '6px',
                      transition: 'all 0.2s ease',
                      background: !sudahMasuk
                        ? 'linear-gradient(135deg, #d1d5db 0%, #9ca3af 100%)'
                        : 'linear-gradient(135deg, #4361ee 0%, #3730a3 100%)',
                      color: '#ffffff',
                      opacity: loading || jadwalStatus.isBelumBuka || jadwalStatus.isSudahTutup || !sudahMasuk || !isInRadius ? 0.6 : 1,
                      boxShadow: !sudahMasuk || !isInRadius || jadwalStatus.isBelumBuka || jadwalStatus.isSudahTutup ? 'none' : '0 4px 14px rgba(67,97,238,0.3)',
                    }}
                  >
                    <span style={{ fontSize: '22px' }}>
                      {jadwalStatus.isSudahTutup ? '🛑' : jadwalStatus.isBelumBuka ? '🔒' : sudahPulang ? '🔄' : '🔴'}
                    </span>
                    <span>
                      {jadwalStatus.isSudahTutup
                        ? 'Absen Ditutup'
                        : jadwalStatus.isBelumBuka
                        ? 'Belum Buka'
                        : !sudahMasuk
                        ? 'Absen Pulang'
                        : sudahPulang
                        ? 'Perbarui Pulang'
                        : 'Absen Pulang'}
                    </span>
                  </button>
                </div>
              </>
            )}

            {/* Feedback message */}
            {message && (
              <div
                style={{
                  padding: '10px 14px',
                  borderRadius: '10px',
                  background: messageType === 'success' ? '#ecfdf5' : '#fef2f2',
                  border: `1px solid ${messageType === 'success' ? '#a7f3d0' : '#fecaca'}`,
                  color: messageType === 'success' ? '#047857' : '#b91c1c',
                  fontSize: '13px',
                  fontWeight: '600',
                  textAlign: 'center',
                  animation: 'presensiPopupSlideUp 0.2s ease',
                }}
              >
                {messageType === 'success' ? '✅' : '⚠️'} {message}
              </div>
            )}

            {/* Loading state */}
            {loading && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '10px',
                  padding: '12px',
                }}
              >
                <div className="spinner" style={{ width: '20px', height: '20px' }} />
                <span style={{ color: '#4361ee', fontSize: '13px', fontWeight: '700' }}>
                  Memproses presensi...
                </span>
              </div>
            )}

            {/* Tombol Close */}
            <button
              onClick={onClose}
              disabled={loading}
              style={{
                width: '100%',
                padding: '12px',
                borderRadius: '12px',
                border: '1px solid #e2e8f0',
                background: '#f8fafc',
                color: '#475569',
                fontFamily: 'inherit',
                fontSize: '14px',
                fontWeight: '700',
                cursor: loading ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                transition: 'all 0.15s ease',
              }}
            >
              <IconClose size={16} color="#475569" />
              <span>Tutup</span>
            </button>
          </div>
        </div>
      </div>

      {/* MODAL KONFIRMASI PULANG MENDAHULUI */}
      {confirmPulangAwal?.show && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.6)',
            backdropFilter: 'blur(4px)',
            WebkitBackdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100000,
            padding: '16px',
            animation: 'presensiPopupFadeIn 0.2s ease',
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
              boxShadow: '0 20px 60px rgba(0,0,0,0.25)',
              animation: 'presensiPopupSlideUp 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
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
                style={{
                  padding: '10px 16px',
                  borderRadius: '10px',
                  border: '1px solid #cbd5e1',
                  background: '#ffffff',
                  color: '#475569',
                  fontWeight: '700',
                  fontSize: '13px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                Batal
              </button>
              <button
                onClick={() => {
                  setConfirmPulangAwal(null);
                  eksekusiAbsen('pulang');
                }}
                style={{
                  padding: '10px 16px',
                  borderRadius: '10px',
                  border: 'none',
                  background: '#dc2626',
                  color: '#ffffff',
                  fontWeight: '700',
                  fontSize: '13px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 4px 12px rgba(220, 38, 38, 0.3)',
                }}
              >
                Ya, Tetap Pulang
              </button>
            </div>
          </div>
        </div>
      )}
    </>,
    document.body
  );
}
