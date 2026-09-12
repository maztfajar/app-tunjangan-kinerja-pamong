'use client';

import { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import MonitoringKedisiplinanModal from '@/components/presensi/MonitoringKedisiplinanModal';
import { startFastGps } from '@/lib/geolocation';
import {
  IconCalendar,
  IconMapPin,
  IconClock,
  IconFileText,
  IconClipboardCheck,
  IconCamera,
  IconUser,
  IconTrash,
  IconBarChart,
} from '@/components/ui/Icons';

interface UserInfo {
  id: string;
  nip: string;
  nama: string;
  jabatan: string | null;
  unitKerja: string | null;
  role: string;
}

interface PresensiHariIni {
  id?: string;
  tanggal: string;
  jamMasuk: string | null;
  jamPulang: string | null;
  statusMasuk: string | null;
  keterlambatan: number | null;
  mendahului?: number | null;
  targetJamPulang?: string | null;
  durasiKerjaMenit?: number | null;
  persentaseHarian?: number | null;
  lokasiTugas?: string | null;
}

interface AktifitasItem {
  id: string;
  deskripsi: string;
  foto: string | null;
  createdAt: string;
}


interface TaskItem {
  id: string;
  pemberiTugas: string;
  hal: string;
  keterangan: string | null;
  lokasi: string | null;
  waktu: string;
  status: string;
}


interface LokasiKantor {
  id?: string;
  namaLokasi: string;
  latitude: number;
  longitude: number;
  radius: number;
}

interface JamKerja {
  jamMasuk: string;
  jamPulang: string;
  toleransiSebelumMasuk?: number;
  toleransiKeterlambatan?: number;
  toleransiPulang?: number;
  durasiKerjaMenit?: number;
}

interface HariLiburItem {
  id: string;
  tanggal: string;
  tanggalKey?: string;
  keterangan: string;
  sumber: string;
  isLibur: boolean;
}

const DEFAULT_LOKASI_KANTOR: LokasiKantor = {
  id: 'default-lokasi',
  latitude: -7.841817942758396,
  longitude: 110.1685866543569,
  radius: 100,
  namaLokasi: 'Kapanewon Pengasih',
};

// Calculate distance in meters between two coordinates
function hitungJarak(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371000; // meters
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
}

// Dynamic import PresensiPopup (avoid SSR issues with Leaflet)
const PresensiPopup = dynamic(() => import('@/components/presensi/PresensiPopup'), { ssr: false });

export default function UserDashboard() {
  // User Info & Server States
  const [user, setUser] = useState<UserInfo | null>(null);
  const [currentTime, setCurrentTime] = useState<Date | null>(null);
  const [lokasiKantor, setLokasiKantor] = useState<LokasiKantor>(DEFAULT_LOKASI_KANTOR);
  const [jamKerja, setJamKerja] = useState<JamKerja>({ jamMasuk: '07:30', jamPulang: '15:45', toleransiSebelumMasuk: 30, toleransiKeterlambatan: 15, toleransiPulang: 120, durasiKerjaMenit: 495 });
  const [presensiHariIni, setPresensiHariIni] = useState<PresensiHariIni | null>(null);
  const [kegiatanHariIni, setKegiatanHariIni] = useState<AktifitasItem[]>([]);
  const [tasks, setTasks] = useState<TaskItem[]>([]);

  const [totalHadirBulanIni, setTotalHadirBulanIni] = useState(0);
  const [showMonitoring, setShowMonitoring] = useState(false);
  const [hariLiburList, setHariLiburList] = useState<HariLiburItem[]>([]);

  // Presensi Popup State
  const [showPresensiPopup, setShowPresensiPopup] = useState(false);

  // GPS & Geolocation States
  const [userPos, setUserPos] = useState<{ lat: number; lng: number } | null>(null);
  const [jarak, setJarak] = useState<number | null>(null);
  const [gpsStatus, setGpsStatus] = useState<'idle' | 'prompt' | 'granted' | 'denied' | 'error'>('idle');
  const [gpsLoading, setGpsLoading] = useState(true);
  const [gpsErrorDetail, setGpsErrorDetail] = useState('');
  const [isAgendaEnabled, setIsAgendaEnabled] = useState(false);
  const watchIdRef = useRef<(() => void) | number | null>(null);

  useEffect(() => {
    fetch('/api/license/status')
      .then((res) => res.json())
      .then((data) => {
        if (data?.features?.agenda) setIsAgendaEnabled(true);
      })
      .catch(() => {});
  }, []);

  // Form Kegiatan States
  const [deskripsiKegiatan, setDeskripsiKegiatan] = useState('');
  const [lampiranKegiatan, setLampiranKegiatan] = useState('');
  const [savingKegiatan, setSavingKegiatan] = useState(false);
  const [kegiatanMessage, setKegiatanMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Attendance Action States
  const [absenLoading, setAbsenLoading] = useState(false);
  const [absenFeedback, setAbsenFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [confirmPulangAwal, setConfirmPulangAwal] = useState<{
    show: boolean;
    menitMendahului: number;
    persenMendahului: number;
    targetStr: string;
  } | null>(null);

  // Real-time Clock
  useEffect(() => {
    setCurrentTime(new Date());
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Status Kalender Hari Ini (Sinkronisasi Otomatis dengan Penetapan Admin)
  const todayCalendarStatus = useMemo(() => {
    if (!currentTime) return null;
    const y = currentTime.getFullYear();
    const m = String(currentTime.getMonth() + 1).padStart(2, '0');
    const d = String(currentTime.getDate()).padStart(2, '0');
    const todayKey = `${y}-${m}-${d}`;
    const dayOfWeek = currentTime.getDay(); // 0 = Min, 6 = Sab
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

    const holidayItem = hariLiburList.find((h) => {
      const hKey = h.tanggalKey || h.tanggal.slice(0, 10);
      return hKey === todayKey;
    });

    if (holidayItem) {
      if (holidayItem.isLibur) {
        return {
          type: 'libur' as const,
          title: 'Hari Libur',
          keterangan: holidayItem.keterangan,
          isWorkDay: false,
          bannerBg: '#fef2f2',
          bannerBorder: '#fecaca',
          bannerColor: '#dc2626',
          badgeText: `🔴 Hari Libur: ${holidayItem.keterangan}`,
          helperText: 'Presensi pamong dinonaktifkan sesuai penetapan kalender',
        };
      } else {
        return {
          type: 'masuk' as const,
          title: 'Hari Masuk Kerja (Penetapan Khusus)',
          keterangan: holidayItem.keterangan,
          isWorkDay: true,
          bannerBg: '#ecfdf5',
          bannerBorder: '#a7f3d0',
          bannerColor: '#059669',
          badgeText: `🟢 Hari Masuk Kerja: ${holidayItem.keterangan}`,
          helperText: 'Pamong wajib melakukan presensi & pengisian kinerja',
        };
      }
    }

    if (isWeekend) {
      return {
        type: 'weekend' as const,
        title: 'Libur Akhir Pekan',
        keterangan: dayOfWeek === 0 ? 'Hari Minggu' : 'Hari Sabtu',
        isWorkDay: false,
        bannerBg: '#f8fafc',
        bannerBorder: '#e2e8f0',
        bannerColor: '#64748b',
        badgeText: `📅 Libur Akhir Pekan (${dayOfWeek === 0 ? 'Minggu' : 'Sabtu'})`,
        helperText: 'Akhir pekan reguler (presensi dinonaktifkan)',
      };
    }

    return {
      type: 'reguler' as const,
      title: 'Hari Kerja Reguler',
      keterangan: 'Jadwal kerja pamong',
      isWorkDay: true,
      bannerBg: '#eff6ff',
      bannerBorder: '#bfdbfe',
      bannerColor: '#2563eb',
      badgeText: '💼 Hari Kerja Efektif',
      helperText: 'Pamong wajib absen masuk & pulang sesuai jam kerja',
    };
  }, [currentTime, hariLiburList]);

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
    if (!lokasiKantor) return;
    setUserPos({ lat: lokasiKantor.latitude, lng: lokasiKantor.longitude });
    setGpsLoading(false);
    setGpsStatus('granted');
    try {
      sessionStorage.setItem('last_user_lat', String(lokasiKantor.latitude));
      sessionStorage.setItem('last_user_lng', String(lokasiKantor.longitude));
    } catch {}
  }, [lokasiKantor]);

  // Request GPS Location from Browser (Two-Phase: Quick Coarse → High Accuracy)
  const mintaIzinLokasiGPS = useCallback(() => {
    stopGpsTracking();

    if (typeof window === 'undefined') return;

    // Cek apakah browser dijalankan pada origin tidak aman (HTTP pada IP ponsel)
    const isSecure = window.isSecureContext || window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    if (!isSecure) {
      setGpsStatus('denied');
      setGpsErrorDetail('Akses GPS di smartphone dibatasi oleh browser karena URL HTTP (bukan HTTPS). Gunakan tombol "Simulasi Titik Kantor" di bawah atau akses via HTTPS.');
      setGpsLoading(false);
      return;
    }

    if (!navigator.geolocation) {
      setGpsStatus('error');
      setGpsErrorDetail('Browser Anda tidak mendukung fitur Geolocation GPS.');
      setGpsLoading(false);
      return;
    }

    setGpsLoading(true);
    setGpsStatus('prompt');
    setGpsErrorDetail('');

    const applyPosition = (pos: GeolocationPosition) => {
      const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
      setUserPos(coords);
      setGpsStatus('granted');
      setGpsLoading(false);
      try {
        sessionStorage.setItem('last_user_lat', String(coords.lat));
        sessionStorage.setItem('last_user_lng', String(coords.lng));
      } catch {}
    };

    const handleGpsError = (err: GeolocationPositionError) => {
      setGpsLoading(false);
      setUserPos((prev) => {
        if (!prev) {
          if (err.code === err.PERMISSION_DENIED) {
            setGpsStatus('denied');
            setGpsErrorDetail('Izin lokasi ditolak oleh browser/ponsel. Buka setelan situs pada bilah URL browser dan aktifkan izin "Lokasi".');
          } else if (err.code === err.POSITION_UNAVAILABLE) {
            setGpsStatus('error');
            setGpsErrorDetail('Informasi lokasi tidak tersedia. Pastikan sensor GPS / WiFi di ponsel aktif.');
          } else if (err.code === err.TIMEOUT) {
            setGpsStatus('error');
            setGpsErrorDetail('Waktu permintaan lokasi habis. Klik "Perbarui GPS" lagi atau gunakan simulasi titik kantor.');
          } else {
            setGpsStatus('error');
            setGpsErrorDetail(err.message || 'Gagal mendeteksi lokasi GPS.');
          }
        }
        return prev;
      });
    };

    try {
      // Deteksi titik GPS secepat mungkin (fast-path cache → refine satelit → coarse)
      watchIdRef.current = startFastGps(
        applyPosition,
        handleGpsError
      );
    } catch (e) {
      console.error('Error starting GPS tracking in dashboard:', e);
      setGpsLoading(false);
    }
  }, [stopGpsTracking]);

  // Cleanup watchPosition on unmount
  useEffect(() => {
    return () => {
      stopGpsTracking();
    };
  }, [stopGpsTracking]);

  // Recalculate distance when userPos or lokasiKantor changes
  useEffect(() => {
    if (userPos && lokasiKantor) {
      const j = hitungJarak(userPos.lat, userPos.lng, lokasiKantor.latitude, lokasiKantor.longitude);
      setJarak(j);
    }
  }, [userPos, lokasiKantor]);

  // Initial Data Fetching - Paralel 7 Request Serentak (Promise.allSettled: Anti-Crash & Cepat)
  const loadDashboardData = useCallback(async () => {
    try {
      const now = new Date();
      const bulanStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

      const [
        meResult,
        lokResult,
        jamResult,
        presResult,
        aktResult,
        taskResult,
        liburResult,
      ] = await Promise.allSettled([
        fetch('/api/auth/me').then((r) => (r.ok ? r.json() : null)),
        fetch('/api/lokasi').then((r) => (r.ok ? r.json() : null)),
        fetch('/api/jam-kerja').then((r) => (r.ok ? r.json() : null)),
        fetch(`/api/presensi?bulan=${bulanStr}`).then((r) => (r.ok ? r.json() : null)),
        fetch('/api/aktifitas').then((r) => (r.ok ? r.json() : null)),
        fetch('/api/task').then((r) => (r.ok ? r.json() : null)),
        fetch(`/api/hari-libur?tahun=${now.getFullYear()}`).then((r) => (r.ok ? r.json() : null)),
      ]);

      // 1. User Profile
      if (meResult.status === 'fulfilled' && meResult.value?.user) {
        setUser(meResult.value.user);
      }

      // 2. Lokasi Kantor
      if (lokResult.status === 'fulfilled' && lokResult.value?.lokasi) {
        setLokasiKantor(lokResult.value.lokasi);
        try {
          localStorage.setItem('cached_lokasi_kantor', JSON.stringify(lokResult.value.lokasi));
        } catch {}
      }

      // 3. Jam Kerja
      if (jamResult.status === 'fulfilled' && jamResult.value?.jamKerja) {
        setJamKerja(jamResult.value.jamKerja);
      }

      // 4. Presensi Hari Ini & Rekap Bulan Ini
      if (presResult.status === 'fulfilled' && presResult.value?.presensi) {
        const presensiList = presResult.value.presensi;
        const todayZero = new Date();
        todayZero.setHours(0, 0, 0, 0);

        const foundToday = presensiList.find((p: { tanggal: string }) => {
          const pt = new Date(p.tanggal);
          pt.setHours(0, 0, 0, 0);
          return pt.getTime() === todayZero.getTime();
        });
        setPresensiHariIni(foundToday || null);

        const hadirBulan = presensiList.filter((p: { jamMasuk: string | null }) => p.jamMasuk).length;
        setTotalHadirBulanIni(hadirBulan);
      }

      // 5. Kegiatan Hari Ini
      if (aktResult.status === 'fulfilled' && aktResult.value?.aktifitas) {
        const todayZero = new Date();
        todayZero.setHours(0, 0, 0, 0);

        const todayAkt = aktResult.value.aktifitas.filter((a: AktifitasItem) => {
          const at = new Date(a.createdAt);
          at.setHours(0, 0, 0, 0);
          return at.getTime() === todayZero.getTime();
        });
        setKegiatanHariIni(todayAkt);
      }

      // 6. Tugas
      if (taskResult.status === 'fulfilled' && taskResult.value?.tasks) {
        setTasks(taskResult.value.tasks);
      }

      // 7. Kalender Hari Libur & Penetapan Masuk Kerja
      if (liburResult.status === 'fulfilled' && liburResult.value?.hariLibur) {
        setHariLiburList(liburResult.value.hariLibur);
      }
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
    }
  }, []);

  useEffect(() => {
    // Restore cached lokasi & GPS di client setelah hydration
    try {
      const cached = localStorage.getItem('cached_lokasi_kantor');
      if (cached) setLokasiKantor(JSON.parse(cached));
      const lat = sessionStorage.getItem('last_user_lat');
      const lng = sessionStorage.getItem('last_user_lng');
      if (lat && lng) {
        const uLat = parseFloat(lat);
        const uLng = parseFloat(lng);
        setUserPos({ lat: uLat, lng: uLng });
        setGpsStatus('granted');
        setGpsLoading(false);
        setJarak(hitungJarak(uLat, uLng, DEFAULT_LOKASI_KANTOR.latitude, DEFAULT_LOKASI_KANTOR.longitude));
      }
    } catch {}

    loadDashboardData();
  }, [loadDashboardData]);

  // Request GPS after mounting
  useEffect(() => {
    mintaIzinLokasiGPS();
  }, [mintaIzinLokasiGPS]);

  // Show presensi popup once per session on login
  useEffect(() => {
    const popupKey = 'presensi_popup_shown';
    const alreadyShown = sessionStorage.getItem(popupKey);
    if (!alreadyShown) {
      // Small delay to let the dashboard load first
      const timer = setTimeout(() => {
        setShowPresensiPopup(true);
        sessionStorage.setItem(popupKey, 'true');
      }, 800);
      return () => clearTimeout(timer);
    }
  }, []);

  // Handler: Absen Masuk / Absen Pulang
  const handleAbsen = async (tipe: 'masuk' | 'pulang') => {
    setAbsenFeedback(null);

    // Cek apakah hari ini bukan hari kerja
    if (tipe === 'masuk' && todayCalendarStatus && !todayCalendarStatus.isWorkDay) {
      setAbsenFeedback({
        type: 'error',
        text: `Presensi tidak tersedia: Hari ini adalah ${todayCalendarStatus.title} (${todayCalendarStatus.keterangan}).`,
      });
      return;
    }

    if (!userPos) {
      setAbsenFeedback({
        type: 'error',
        text: 'Posisi GPS belum terdeteksi. Izinkan akses lokasi di browser Anda terlebih dahulu.',
      });
      mintaIzinLokasiGPS();
      return;
    }

    if (lokasiKantor && jarak !== null && jarak > lokasiKantor.radius) {
      setAbsenFeedback({
        type: 'error',
        text: `Presensi ditolak: Anda berada ${jarak}m dari kantor (Radius maksimal: ${lokasiKantor.radius}m).`,
      });
      return;
    }

    setAbsenLoading(true);
    try {
      const res = await fetch('/api/presensi', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tipe,
          latitude: userPos.lat,
          longitude: userPos.lng,
          lokasiTugas: 'Kantor Pamong',
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setAbsenFeedback({
          type: 'success',
          text: data.message || `Berhasil melakukan absen ${tipe}!`,
        });
        // Reload attendance data
        loadDashboardData();
      } else {
        setAbsenFeedback({
          type: 'error',
          text: data.error || `Gagal melakukan presensi ${tipe}.`,
        });
      }
    } catch {
      setAbsenFeedback({
        type: 'error',
        text: 'Terjadi gangguan jaringan saat memproses presensi.',
      });
    }
    setAbsenLoading(false);
  };

  // Handler klik dengan konfirmasi pulang mendahului
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
    handleAbsen(tipe);
  };

  // Handler: Input Kegiatan Kinerja Harian
  const handleSimpanKegiatan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!deskripsiKegiatan.trim()) {
      setKegiatanMessage({ type: 'error', text: 'Deskripsi kegiatan wajib diisi.' });
      return;
    }

    setSavingKegiatan(true);
    setKegiatanMessage(null);

    try {
      const res = await fetch('/api/aktifitas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          deskripsi: deskripsiKegiatan.trim(),
          foto: lampiranKegiatan.trim() || null,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setKegiatanMessage({ type: 'success', text: 'Kegiatan harian berhasil dicatat!' });
        setDeskripsiKegiatan('');
        setLampiranKegiatan('');
        // Append to list or reload
        setKegiatanHariIni((prev) => [data.aktifitas, ...prev]);
      } else {
        setKegiatanMessage({ type: 'error', text: data.error || 'Gagal menyimpan kegiatan.' });
      }
    } catch {
      setKegiatanMessage({ type: 'error', text: 'Terjadi kesalahan koneksi saat menyimpan kegiatan.' });
    }
    setSavingKegiatan(false);
  };

  // Handler: Hapus Kegiatan
  const handleHapusKegiatan = async (id: string) => {
    if (!confirm('Apakah Anda yakin ingin menghapus catatan kegiatan ini?')) return;
    try {
      const res = await fetch(`/api/aktifitas?id=${id}`, { method: 'DELETE' });
      if (res.ok) {
        setKegiatanHariIni((prev) => prev.filter((item) => item.id !== id));
      }
    } catch {
      alert('Gagal menghapus kegiatan.');
    }
  };

  // Handler: Ganti Status Tugas
  const handleUpdateTaskStatus = async (taskId: string, newStatus: string) => {
    try {
      const res = await fetch('/api/task', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: taskId, status: newStatus }),
      });
      if (res.ok) {
        setTasks((prev) =>
          prev.map((t) => (t.id === taskId ? { ...t, status: newStatus } : t))
        );
      }
    } catch {
      alert('Gagal memperbarui status tugas.');
    }
  };

  const formatJam = (dStr: string | null) => {
    if (!dStr) return '-';
    return new Date(dStr).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
  };

  const isInRadius = lokasiKantor && jarak !== null && jarak <= lokasiKantor.radius;

  return (
    <div suppressHydrationWarning style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* 1. Header Profil & Jam Digital (Tertata Rapi Tanpa Tabrakan Icon) */}
      <div
        className="glass-card-static animate-slide-up"
        style={{
          padding: '14px 16px',
          background: '#ffffff',
          border: '1px solid #e2e8f0',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
        }}
      >
        {/* Baris 1: Avatar Pamong + Nama & NIP/Jabatan */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', width: '100%', minWidth: 0 }}>
          <div
            style={{
              width: '42px',
              height: '42px',
              minWidth: '42px',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, #4361ee 0%, #3a0ca3 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ffffff',
              flexShrink: 0,
              boxShadow: '0 2px 8px rgba(67, 97, 238, 0.25)',
            }}
          >
            <IconUser size={22} color="#ffffff" />
          </div>
          <div style={{ minWidth: 0, flex: 1, overflow: 'hidden' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <h2 style={{ fontSize: '15px', fontWeight: '800', color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                Selamat Datang, {user?.nama?.split(' ')[0] || 'Pamong'}!
              </h2>
              <span className="badge badge-info" style={{ fontSize: '9px', textTransform: 'uppercase', flexShrink: 0 }}>
                {user?.role || 'PEGAWAI'}
              </span>
            </div>
            <p style={{ color: '#64748b', fontSize: '11px', marginTop: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              <span style={{ color: '#0f172a', fontWeight: '700' }}>{user?.jabatan || 'Pamong Kalurahan'}</span> • Pemerintah Kalurahan
            </p>
          </div>
        </div>

        {/* Baris 2: Jam Digital & Tombol Monitoring Kedisiplinan */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '8px',
            paddingTop: '10px',
            borderTop: '1px solid #f1f5f9',
          }}
        >
          {/* Jam Live Digital */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '15px' }}>⏰</span>
            <div>
              <div style={{ fontSize: '14px', fontWeight: '800', color: '#4361ee', letterSpacing: '0.3px', lineHeight: '1.2' }}>
                {currentTime
                  ? currentTime.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
                  : '--:--:--'}{' '}
                <span style={{ fontSize: '10px', color: '#64748b', fontWeight: '600' }}>WIB</span>
              </div>
              <div style={{ fontSize: '10px', color: '#94a3b8' }}>
                {currentTime
                  ? currentTime.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'short', year: 'numeric' })
                  : '-'}
              </div>
            </div>
          </div>

          {/* Tombol Monitoring Kedisiplinan */}
          <button
            type="button"
            onClick={() => setShowMonitoring(true)}
            className="btn-outline"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '11px',
              padding: '6px 12px',
              borderRadius: '8px',
              fontWeight: '700',
              borderColor: '#bfdbfe',
              color: '#4361ee',
              background: '#eff6ff',
              cursor: 'pointer',
              minHeight: '32px',
              touchAction: 'manipulation',
            }}
          >
            <IconCalendar size={14} color="#4361ee" />
            <span>Monitoring Kedisiplinan</span>
          </button>
        </div>
      </div>

      {/* 2. Grid Utama: Absensi Online (Kiri) & Input Kegiatan Harian (Kanan) */}
      <div className="responsive-grid-2">
        {/* ================= MODUL 1: ABSENSI ONLINE (GPS) ================= */}
        <div
          className="glass-card-static animate-slide-up"
          style={{
            padding: '18px 16px',
            border: '1px solid #e2e8f0',
            background: '#ffffff',
            display: 'flex',
            flexDirection: 'column',
            gap: '14px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
          }}
        >
          {/* Header Modul */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <IconMapPin size={20} color="#4361ee" />
                <h3 style={{ fontSize: '16px', fontWeight: '700', color: '#0f172a' }}>
                  Presensi Mandiri (GPS)
                </h3>
              </div>
              <p style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>
                Validasi koordinat radius kantor
              </p>
            </div>
            <Link
              href="/dashboard/presensi"
              prefetch={true}
              className="btn-outline"
              style={{ fontSize: '11px', padding: '5px 10px', minHeight: '32px', display: 'inline-flex', alignItems: 'center', gap: '5px' }}
            >
              <IconMapPin size={13} color="#4361ee" /> Peta GPS
            </Link>
          </div>

          {/* Banner Status Kalender & Penetapan Libur/Masuk */}
          {todayCalendarStatus && (
            <div
              style={{
                padding: '10px 14px',
                borderRadius: '10px',
                background: todayCalendarStatus.bannerBg,
                border: `1px solid ${todayCalendarStatus.bannerBorder}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '8px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '13px', fontWeight: '800', color: todayCalendarStatus.bannerColor }}>
                  {todayCalendarStatus.badgeText}
                </span>
              </div>
              <span style={{ fontSize: '11px', color: '#64748b', fontWeight: '500' }}>
                {todayCalendarStatus.helperText}
              </span>
            </div>
          )}

          {/* Kartu Status Kehadiran Hari Ini (Rapi & Tidak Terpotong) */}
          <div
            style={{
              padding: '12px 14px',
              borderRadius: '12px',
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', flexWrap: 'wrap', gap: '4px' }}>
              <span style={{ fontSize: '11px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Status Hari Ini ({jamKerja.jamMasuk} - {jamKerja.jamPulang} WIB)
              </span>
              {presensiHariIni?.statusMasuk && (
                <span
                  className={`badge ${
                    presensiHariIni.statusMasuk === 'Tepat Waktu' ? 'badge-success' : presensiHariIni.statusMasuk === 'Telat dalam toleransi' ? 'badge-info' : 'badge-warning'
                  }`}
                  style={{ fontSize: '10px', padding: '2px 7px' }}
                >
                  {presensiHariIni.statusMasuk}
                  {presensiHariIni.keterlambatan ? ` (+${presensiHariIni.keterlambatan}m)` : ''}
                </span>
              )}
            </div>

            <div suppressHydrationWarning style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: '8px', textAlign: 'center' }}>
              <div suppressHydrationWarning style={{ background: '#ffffff', padding: '8px 4px', borderRadius: '8px', border: '1px solid #edf2f7' }}>
                <span suppressHydrationWarning style={{ fontSize: '10px', color: '#64748b', display: 'block', marginBottom: '2px' }}>Absen Masuk:</span>
                <div suppressHydrationWarning style={{ fontSize: 'clamp(13px, 3.6vw, 16px)', fontWeight: '800', color: presensiHariIni?.jamMasuk ? '#059669' : '#d97706', whiteSpace: 'nowrap' }}>
                  {formatJam(presensiHariIni?.jamMasuk || null)}{' '}
                  <span suppressHydrationWarning style={{ fontSize: '9px', color: '#94a3b8', fontWeight: '600' }}>WIB</span>
                </div>
              </div>
              <div suppressHydrationWarning style={{ background: '#ffffff', padding: '8px 4px', borderRadius: '8px', border: '1px solid #edf2f7' }}>
                <span suppressHydrationWarning style={{ fontSize: '10px', color: '#64748b', display: 'block', marginBottom: '2px' }}>Target Pulang:</span>
                <div suppressHydrationWarning style={{ fontSize: 'clamp(13px, 3.6vw, 16px)', fontWeight: '800', color: '#7c3aed', whiteSpace: 'nowrap' }}>
                  {presensiHariIni?.targetJamPulang ? formatJam(presensiHariIni.targetJamPulang) : jamKerja.jamPulang}{' '}
                  <span suppressHydrationWarning style={{ fontSize: '9px', color: '#94a3b8', fontWeight: '600' }}>WIB</span>
                </div>
              </div>
              <div suppressHydrationWarning style={{ background: '#ffffff', padding: '8px 4px', borderRadius: '8px', border: '1px solid #edf2f7' }}>
                <span suppressHydrationWarning style={{ fontSize: '10px', color: '#64748b', display: 'block', marginBottom: '2px' }}>Absen Pulang:</span>
                <div suppressHydrationWarning style={{ fontSize: 'clamp(13px, 3.6vw, 16px)', fontWeight: '800', color: presensiHariIni?.jamPulang ? '#059669' : '#64748b', whiteSpace: 'nowrap' }}>
                  {formatJam(presensiHariIni?.jamPulang || null)}{' '}
                  <span suppressHydrationWarning style={{ fontSize: '9px', color: '#94a3b8', fontWeight: '600' }}>WIB</span>
                </div>
              </div>
            </div>
          </div>

          {/* Feedback Pesan Absensi */}
          {absenFeedback && (
            <div
              style={{
                padding: '10px 14px',
                borderRadius: '10px',
                background: absenFeedback.type === 'success' ? '#f0fdf4' : '#fef2f2',
                border: `1px solid ${absenFeedback.type === 'success' ? '#bbf7d0' : '#fecaca'}`,
                color: absenFeedback.type === 'success' ? '#15803d' : '#b91c1c',
                fontSize: '13px',
                fontWeight: '600',
              }}
            >
              {absenFeedback.text}
            </div>
          )}

          {/* =================================================================
              TOMBOL AKSI PRESENSI LANGSUNG (TAMPIL DI ATAS, TANPA PERLU SCROLL)
              ================================================================= */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <button
              type="button"
              onClick={() => handleAbsenClick('masuk')}
              disabled={
                absenLoading ||
                !!presensiHariIni?.jamMasuk ||
                !isInRadius ||
                (todayCalendarStatus ? !todayCalendarStatus.isWorkDay : false)
              }
              className="btn-success"
              style={{
                padding: '14px 10px',
                fontSize: '14px',
                fontWeight: '800',
                justifyContent: 'center',
                borderRadius: '12px',
                opacity:
                  !!presensiHariIni?.jamMasuk ||
                  !isInRadius ||
                  (todayCalendarStatus ? !todayCalendarStatus.isWorkDay : false)
                    ? 0.45
                    : 1,
                background:
                  todayCalendarStatus && !todayCalendarStatus.isWorkDay ? '#94a3b8' : undefined,
                boxShadow: !!presensiHariIni?.jamMasuk || !isInRadius ? 'none' : '0 4px 14px rgba(16, 185, 129, 0.35)',
                touchAction: 'manipulation',
              }}
            >
              {absenLoading ? (
                <div className="spinner" style={{ width: '16px', height: '16px', borderWidth: '2px' }} />
              ) : todayCalendarStatus && !todayCalendarStatus.isWorkDay ? (
                '🔴'
              ) : (
                '🟢'
              )}{' '}
              {presensiHariIni?.jamMasuk
                ? 'Sudah Masuk'
                : todayCalendarStatus && !todayCalendarStatus.isWorkDay
                ? 'Hari Libur'
                : 'Absen Masuk'}
            </button>

            <button
              type="button"
              onClick={() => handleAbsenClick('pulang')}
              disabled={
                absenLoading ||
                !presensiHariIni?.jamMasuk ||
                !!presensiHariIni?.jamPulang ||
                !isInRadius
              }
              className="btn-primary"
              style={{
                padding: '14px 10px',
                fontSize: '14px',
                fontWeight: '800',
                justifyContent: 'center',
                borderRadius: '12px',
                opacity:
                  !presensiHariIni?.jamMasuk || !!presensiHariIni?.jamPulang || !isInRadius ? 0.45 : 1,
                boxShadow: !presensiHariIni?.jamMasuk || !!presensiHariIni?.jamPulang || !isInRadius ? 'none' : '0 4px 14px rgba(67, 97, 238, 0.35)',
                touchAction: 'manipulation',
              }}
            >
              {absenLoading ? (
                <div className="spinner" style={{ width: '16px', height: '16px', borderWidth: '2px' }} />
              ) : (
                '🔴'
              )}{' '}
              {presensiHariIni?.jamPulang ? 'Sudah Pulang' : 'Absen Pulang'}
            </button>
          </div>

          {/* Bar Status Lokasi GPS Ringkas (Tepat di Bawah Tombol) */}
          <div
            style={{
              padding: '10px 14px',
              borderRadius: '10px',
              background: isInRadius ? '#f0fdf4' : gpsStatus === 'denied' ? '#fef2f2' : '#f8fafc',
              border: `1px solid ${isInRadius ? '#bbf7d0' : gpsStatus === 'denied' ? '#fecaca' : '#e2e8f0'}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '8px',
              fontSize: '12px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0 }}>
              <IconMapPin size={16} color={isInRadius ? '#16a34a' : gpsStatus === 'denied' ? '#dc2626' : '#64748b'} />
              <span style={{ fontWeight: '600', color: isInRadius ? '#15803d' : gpsStatus === 'denied' ? '#b91c1c' : '#475569', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {gpsLoading
                  ? 'Mendeteksi GPS...'
                  : gpsStatus === 'denied'
                  ? 'Akses GPS diblokir'
                  : isInRadius
                  ? `Dalam radius (${jarak}m)`
                  : jarak !== null
                  ? `Luar radius (${jarak}m / maks ${lokasiKantor?.radius}m)`
                  : 'Klik Refresh GPS'}
              </span>
            </div>
            <button
              type="button"
              onClick={mintaIzinLokasiGPS}
              disabled={gpsLoading}
              className="btn-outline"
              style={{
                padding: '4px 10px',
                fontSize: '11px',
                fontWeight: '700',
                minHeight: '28px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                flexShrink: 0,
                touchAction: 'manipulation',
              }}
              title="Perbarui koordinat GPS sekarang"
            >
              {gpsLoading ? '⏳...' : '🔄 Refresh GPS'}
            </button>
          </div>

          {/* Kotak Panduan Izin GPS Jika Terblokir */}
          {gpsStatus === 'denied' && (
            <div
              style={{
                padding: '12px 14px',
                borderRadius: '10px',
                background: '#fef2f2',
                border: '1px solid #fecaca',
                color: '#b91c1c',
                fontSize: '12px',
                lineHeight: '1.5',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
              }}
            >
              <div style={{ fontWeight: '700' }}>
                ⚠️ Akses Lokasi GPS Dibatasi di Browser Anda
              </div>
              <div>{gpsErrorDetail || 'Browser smartphone membatasi akses sensor GPS pada koneksi HTTP (bukan HTTPS).'}</div>
              <button
                type="button"
                onClick={handleSimulasiLokasiKantor}
                className="btn-outline"
                style={{
                  padding: '6px 12px',
                  fontSize: '12px',
                  fontWeight: '700',
                  color: '#1d4ed8',
                  borderColor: '#93c5fd',
                  background: '#eff6ff',
                  borderRadius: '8px',
                  alignSelf: 'flex-start',
                }}
              >
                🏢 Gunakan Titik Kantor (Simulasi Presensi)
              </button>
            </div>
          )}

          {/* Koordinat Info Ringkas */}
          {userPos && (
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#94a3b8', padding: '0 2px' }}>
              <span>Koordinat GPS:</span>
              <span style={{ fontFamily: 'monospace', color: '#64748b' }}>
                {userPos.lat.toFixed(6)}, {userPos.lng.toFixed(6)}
              </span>
            </div>
          )}
        </div>

        {/* ================= MODUL 2: INPUT & LOG KEGIATAN HARIAN ================= */}
        <div
          suppressHydrationWarning
          className="glass-card-static animate-slide-up"
          style={{
            padding: '22px',
            border: '1px solid #e2e8f0',
            background: '#ffffff',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <IconFileText size={20} color="#4361ee" />
                <h3 style={{ fontSize: '16px', fontWeight: '700', color: '#0f172a' }}>
                  Input Kegiatan Harian
                </h3>
              </div>
              <p style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>
                Catat aktifitas kinerja untuk penilaian tunjangan kinerja pamong
              </p>
            </div>
            <Link href="/dashboard/aktifitas" className="btn-outline" style={{ fontSize: '11px', padding: '5px 10px', minHeight: '32px' }}>
              Lihat Log
            </Link>
          </div>

          {/* Form Cepat Input Kegiatan */}
          <form suppressHydrationWarning onSubmit={handleSimpanKegiatan} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div>
              <label className="input-label" style={{ fontSize: '11px' }}>
                Deskripsi Pekerjaan / Kegiatan
              </label>
              <textarea
                suppressHydrationWarning
                className="input-field"
                placeholder="Contoh: Menyiapkan administrasi rapat pamong, melayani legalisir surat pengantar warga..."
                value={deskripsiKegiatan}
                onChange={(e) => setDeskripsiKegiatan(e.target.value)}
                required
                style={{ minHeight: '80px', fontSize: '13px' }}
              />
            </div>

            <div>
              <label className="input-label" style={{ fontSize: '11px' }}>
                Tautan / Link Dokumentasi Foto (Opsional)
              </label>
              <input
                suppressHydrationWarning
                type="text"
                className="input-field"
                placeholder="https://... atau nomor surat/dokumen"
                value={lampiranKegiatan}
                onChange={(e) => setLampiranKegiatan(e.target.value)}
                style={{ padding: '8px 12px', fontSize: '13px', minHeight: '38px' }}
              />
            </div>

            {kegiatanMessage && (
              <div
                style={{
                  padding: '10px 14px',
                  borderRadius: '8px',
                  background:
                    kegiatanMessage.type === 'success' ? '#f0fdf4' : '#fef2f2',
                  border: `1px solid ${
                    kegiatanMessage.type === 'success' ? '#bbf7d0' : '#fecaca'
                  }`,
                  color: kegiatanMessage.type === 'success' ? '#15803d' : '#b91c1c',
                  fontSize: '12px',
                }}
              >
                {kegiatanMessage.text}
              </div>
            )}

            <button
              type="submit"
              disabled={savingKegiatan || !deskripsiKegiatan.trim()}
              className="btn-primary"
              style={{
                width: '100%',
                justifyContent: 'center',
                padding: '10px',
                fontSize: '14px',
              }}
            >
              {savingKegiatan ? (
                <>
                  <div className="spinner" style={{ width: '16px', height: '16px', borderWidth: '2px' }} />
                  Menyimpan...
                </>
              ) : (
                '💾 Simpan Kegiatan Hari Ini'
              )}
            </button>
          </form>

          {/* Daftar Kegiatan Hari Ini */}
          <div style={{ marginTop: '6px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <span style={{ fontSize: '11px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Kegiatan Terlaksana Hari Ini ({kegiatanHariIni.length})
              </span>
            </div>

            <div
              style={{
                maxHeight: '200px',
                overflowY: 'auto',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
                paddingRight: '4px',
              }}
            >
              {kegiatanHariIni.length === 0 ? (
                <div
                  style={{
                    padding: '20px',
                    textAlign: 'center',
                    background: '#f8fafc',
                    borderRadius: '8px',
                    border: '1px dashed #cbd5e1',
                    color: '#64748b',
                    fontSize: '12px',
                  }}
                >
                  Belum ada kegiatan yang dicatat hari ini. Silakan input pada form di atas.
                </div>
              ) : (
                kegiatanHariIni.map((item) => (
                  <div
                    key={item.id}
                    style={{
                      padding: '10px 12px',
                      borderRadius: '8px',
                      background: '#f8fafc',
                      border: '1px solid #e2e8f0',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'flex-start',
                      gap: '10px',
                    }}
                  >
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '11px', color: '#64748b', marginBottom: '2px' }}>
                        ⏰ {new Date(item.createdAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} WIB
                      </div>
                      <p style={{ fontSize: '13px', color: '#1e293b', lineHeight: '1.4' }}>
                        {item.deskripsi}
                      </p>
                      {item.foto && (
                        <span
                          className="badge badge-info"
                          style={{ fontSize: '10px', marginTop: '4px', display: 'inline-block' }}
                        >
                          📎 {item.foto}
                        </span>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => handleHapusKegiatan(item.id)}
                      className="btn-danger"
                      style={{ padding: '4px 8px', fontSize: '11px', minHeight: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                      title="Hapus kegiatan ini"
                    >
                      <IconTrash size={13} color="#ffffff" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 3. Monitoring Tugas & Ringkasan Kinerja Pamong */}
      <div className="responsive-grid-2">
        {/* Log Aktivitas Pamong */}
        <div
          className="glass-card-static animate-slide-up"
          style={{
            padding: '22px',
            border: '1px solid #e2e8f0',
            background: '#ffffff',
            boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <IconClipboardCheck size={20} color="#4361ee" />
              <h3 style={{ fontSize: '16px', fontWeight: '700', color: '#0f172a' }}>
                Log Aktivitas
              </h3>
            </div>
            <Link href="/dashboard/task" className="btn-outline" style={{ fontSize: '11px', padding: '4px 8px', minHeight: '30px' }}>
              Kelola Log
            </Link>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '250px', overflowY: 'auto' }}>
            {tasks.length === 0 ? (
              <p style={{ color: '#64748b', fontSize: '13px', textAlign: 'center', padding: '24px 0' }}>
                Belum ada log aktivitas atau tugas aktif.
              </p>
            ) : (
              tasks.slice(0, 4).map((t) => (
                <div
                  key={t.id}
                  style={{
                    padding: '12px 14px',
                    borderRadius: '8px',
                    background: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: '12px',
                  }}
                >
                  <div style={{ flex: 1 }}>
                    <h4 style={{ fontSize: '13px', fontWeight: '700', color: '#0f172a' }}>{t.hal}</h4>
                    <p style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>
                      👤 Dari: {t.pemberiTugas} {t.lokasi ? `• 📍 ${t.lokasi}` : ''}
                    </p>
                  </div>
                  <select
                    className="input-field"
                    value={t.status}
                    onChange={(e) => handleUpdateTaskStatus(t.id, e.target.value)}
                    style={{ width: '125px', padding: '4px 8px', fontSize: '11px', minHeight: '32px' }}
                  >
                    <option value="Belum Dikerjakan">Belum</option>
                    <option value="Proses">Proses</option>
                    <option value="Selesai">Selesai</option>
                    <option value="Ijin">Ijin</option>
                  </select>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Ringkasan Disiplin & Performa Bulanan */}
        <div
          className="glass-card-static animate-slide-up"
          style={{
            padding: '22px',
            border: '1px solid #e2e8f0',
            background: '#ffffff',
            boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <IconBarChart size={20} color="#4361ee" />
              <h3 style={{ fontSize: '16px', fontWeight: '700', color: '#0f172a' }}>
                Ringkasan Kinerja Bulan Ini
              </h3>
            </div>
            <Link href="/dashboard/rekap" className="btn-outline" style={{ fontSize: '11px', padding: '4px 8px', minHeight: '30px' }}>
              Rekap Absensi
            </Link>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div
              style={{
                padding: '14px',
                borderRadius: '10px',
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
              }}
            >
              <span style={{ fontSize: '11px', color: '#64748b', textTransform: 'uppercase', fontWeight: '600' }}>Hadir Bulan Ini</span>
              <div style={{ fontSize: '22px', fontWeight: '800', color: '#059669', marginTop: '4px' }}>
                {totalHadirBulanIni} <span style={{ fontSize: '12px', fontWeight: '500', color: '#64748b' }}>Hari</span>
              </div>
            </div>

            <div
              style={{
                padding: '14px',
                borderRadius: '10px',
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
              }}
            >
              <span style={{ fontSize: '11px', color: '#64748b', textTransform: 'uppercase', fontWeight: '600' }}>Kegiatan Hari Ini</span>
              <div style={{ fontSize: '22px', fontWeight: '800', color: '#2563eb', marginTop: '4px' }}>
                {kegiatanHariIni.length} <span style={{ fontSize: '12px', fontWeight: '500', color: '#64748b' }}>Log</span>
              </div>
            </div>
          </div>

          {/* Pintasan Cepat Menu Pamong */}
          <div style={{ marginTop: '16px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <Link
              href="/dashboard/rekap"
              className="btn-outline"
              style={{ flex: 1, justifyContent: 'center', padding: '7px 10px', fontSize: '12px', minHeight: '34px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
            >
              <IconBarChart size={14} color="#4361ee" /> Rekap
            </Link>
            <Link
              href="/dashboard/laporan"
              className="btn-outline"
              style={{ flex: 1, justifyContent: 'center', padding: '7px 10px', fontSize: '12px', minHeight: '34px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
            >
              <IconFileText size={14} color="#4361ee" /> Laporan
            </Link>
            {isAgendaEnabled && (
              <Link
                href="/dashboard/agenda"
                className="btn-outline"
                style={{ flex: 1, justifyContent: 'center', padding: '7px 10px', fontSize: '12px', minHeight: '34px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
              >
                <IconCalendar size={14} color="#4361ee" /> Agenda
              </Link>
            )}
          </div>
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
                  handleAbsen('pulang');
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
      {/* =================== MODAL: Monitoring Kedisiplinan =================== */}
      <MonitoringKedisiplinanModal
        isOpen={showMonitoring}
        onClose={() => setShowMonitoring(false)}
      />

      {/* =================== POPUP PRESENSI SAAT LOGIN =================== */}
      <PresensiPopup
        isOpen={showPresensiPopup}
        onClose={() => setShowPresensiPopup(false)}
        onPresensiDone={() => {
          // Reload data dashboard setelah presensi berhasil
          loadDashboardData();
        }}
      />
    </div>
  );
}

