'use client';

import { useEffect, useState, useCallback } from 'react';
import MonitoringKedisiplinanModal from '@/components/presensi/MonitoringKedisiplinanModal';
import AjukanSuketModal from '@/components/presensi/AjukanSuketModal';
import { IconCalendar, IconFileText, IconClock, IconInfo } from '@/components/ui/Icons';

interface PresensiItem {
  id: string;
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
  keterangan: string | null;
  lokasiTugas: string | null;
  suket?: string | null;
}

interface JamKerjaData {
  jamMasuk: string;
  jamPulang: string;
  toleransiSebelumMasuk: number;
  toleransiKeterlambatan: number;
  toleransiPulang: number;
  durasiKerjaMenit: number;
}

interface HariLiburItem {
  tanggal: string;
  tanggalKey?: string;
  keterangan: string;
  isLibur?: boolean;
}

const BULAN_NAMES = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
];

export default function RekapPage() {
  const [presensi, setPresensi] = useState<PresensiItem[]>([]);
  const [jamKerja, setJamKerja] = useState<JamKerjaData | null>(null);
  const [hariLibur, setHariLibur] = useState<HariLiburItem[]>([]);
  const [showMonitoring, setShowMonitoring] = useState(false);
  const [showDetailHariIni, setShowDetailHariIni] = useState(false);
  const [suketModal, setSuketModal] = useState<{
    isOpen: boolean;
    tanggal: Date | null;
    presensi: PresensiItem | null;
  }>({
    isOpen: false,
    tanggal: null,
    presensi: null,
  });

  const now = new Date();
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1); // 1-indexed

  const fetchRekap = useCallback(async () => {
    try {
      const bulan = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}`;
      const res = await fetch(`/api/presensi?bulan=${bulan}`);
      const data = await res.json();
      setPresensi(data.presensi || []);
      if (data.jamKerja) setJamKerja(data.jamKerja);
    } catch (err) {
      console.error('Fetch rekap error:', err);
    }
  }, [selectedYear, selectedMonth]);

  const fetchHariLibur = useCallback(async () => {
    try {
      const res = await fetch(`/api/hari-libur?tahun=${selectedYear}&bulan=${selectedMonth}`);
      const data = await res.json();
      setHariLibur(data.hariLibur || []);
    } catch (err) {
      console.error('Fetch hari libur error:', err);
    }
  }, [selectedYear, selectedMonth]);

  useEffect(() => {
    fetchRekap();
    fetchHariLibur();
  }, [fetchRekap, fetchHariLibur]);

  // Generate all days in the selected month
  const daysInMonth = new Date(selectedYear, selectedMonth, 0).getDate();
  const allDays = Array.from({ length: daysInMonth }, (_, i) => {
    const d = new Date(selectedYear, selectedMonth - 1, i + 1);
    return d;
  });

  // Helper to format Date to 'YYYY-MM-DD'
  const toDateKey = (date: Date) => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };

  // Helper: check if a date is an active holiday (isLibur !== false)
  const getHariLibur = (date: Date): HariLiburItem | null => {
    const targetKey = toDateKey(date);
    return hariLibur.find((h) => {
      const hKey = h.tanggalKey || h.tanggal.slice(0, 10);
      return hKey === targetKey && h.isLibur !== false;
    }) || null;
  };

  // Helper: check if a date is overridden to work by admin (isLibur === false)
  const getOverrideMasuk = (date: Date): HariLiburItem | null => {
    const targetKey = toDateKey(date);
    return hariLibur.find((h) => {
      const hKey = h.tanggalKey || h.tanggal.slice(0, 10);
      return hKey === targetKey && h.isLibur === false;
    }) || null;
  };

  // Check if weekend
  const isWeekend = (date: Date) => date.getDay() === 0 || date.getDay() === 6;

  // Check if hari ini
  const isToday = (date: Date) => {
    const today = new Date();
    return date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear();
  };

  // Find presensi for a given date
  const findPresensi = (date: Date): PresensiItem | null => {
    return presensi.find((p) => {
      const pt = new Date(p.tanggal);
      return pt.getDate() === date.getDate() &&
        pt.getMonth() === date.getMonth() &&
        pt.getFullYear() === date.getFullYear();
    }) || null;
  };

  // Format time
  const formatTime = (d: string | null) =>
    d ? new Date(d).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '-';

  const formatDate = (d: Date) =>
    d.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });

  // Cek apakah keterlambatan dalam batas toleransi telah diganti dengan memenuhi target jam pulang
  const isTelatToleransiTerpenuhi = (p: PresensiItem) => {
    if (p.statusMasuk !== 'Telat dalam toleransi') return false;
    if (!p.jamPulang || !p.targetJamPulang) return false;
    return new Date(p.jamPulang).getTime() >= new Date(p.targetJamPulang).getTime();
  };

  // Helper: Mengecek apakah pegawai memenuhi syarat aksi suket:
  // Kondisi: Melebihi jam masuk (terlambat), tidak absen masuk, tidak absen pulang, atau pulang mendahului
  const getSuketActionState = (day: Date, p: PresensiItem | null, isOffDay: boolean | null) => {
    if (isOffDay) return null;

    const today = isToday(day);
    const nowTime = new Date();
    const isPast = day < nowTime && !today;

    // Jika suket sudah diajukan
    if (p?.suket) {
      try {
        const parsed = JSON.parse(p.suket);
        if (parsed?.status === 'Disetujui') {
          return { show: true, type: 'approved' as const, label: '✓ Suket Disetujui' };
        }
        if (parsed?.status === 'Ditolak') {
          return { show: true, type: 'rejected' as const, label: '✕ Suket Ditolak' };
        }
      } catch {}
      return { show: true, type: 'submitted' as const, label: 'Suket Diajukan' };
    }

    // Kasus 1: Melebihi jam masuk standar (Terlambat)
    const isTerlambat = !!(p?.keterlambatan && p.keterlambatan > 0);

    // Kasus 2: Pulang cepat / mendahului target pulang
    const isMendahului = !!(p?.mendahului && p.mendahului > 0);

    // Kasus 3: Tidak absen masuk (hari lampau atau hari ini yang sudah lewat jam masuk)
    let isTidakAbsenMasuk = false;
    if (isPast && !p?.jamMasuk) {
      isTidakAbsenMasuk = true;
    } else if (today && !p?.jamMasuk && jamKerja) {
      const [h, m] = jamKerja.jamMasuk.split(':').map(Number);
      const jamMasukBatas = new Date();
      jamMasukBatas.setHours(h, m, 0, 0);
      if (nowTime > jamMasukBatas) {
        isTidakAbsenMasuk = true;
      }
    }

    // Kasus 4: Tidak absen pulang (hari lampau atau hari ini yang sudah lewat jam pulang target)
    let isTidakAbsenPulang = false;
    if (p?.jamMasuk && !p?.jamPulang) {
      if (isPast) {
        isTidakAbsenPulang = true;
      } else if (today) {
        const targetPulangTime = p.targetJamPulang
          ? new Date(p.targetJamPulang).getTime()
          : (jamKerja ? new Date().setHours(Number(jamKerja.jamPulang.split(':')[0]), Number(jamKerja.jamPulang.split(':')[1]), 0, 0) : 0);
        if (targetPulangTime && Date.now() > targetPulangTime) {
          isTidakAbsenPulang = true;
        }
      }
    }

    if (isTerlambat || isMendahului || isTidakAbsenMasuk || isTidakAbsenPulang) {
      return { show: true, type: 'action' as const, label: 'Ajukan Suket' };
    }

    return null;
  };

  // Menit keterlambatan yang dikenai potongan (hanya jika di luar batas toleransi, atau jika dalam toleransi tapi tidak memenuhi target jam pulang)
  const totalTerlambatMenit = presensi.reduce((sum, p) => {
    if (isTelatToleransiTerpenuhi(p)) return sum;
    return sum + (p.keterlambatan || 0);
  }, 0);

  const totalMendahuluiMenit = presensi.reduce((sum, p) => sum + (p.mendahului || 0), 0);
  const durasiStandar = jamKerja?.durasiKerjaMenit || 495;

  // Count hari kerja efektif in this month (respects admin overrides)
  const hariKerjaEfektif = allDays.filter((d) => {
    const override = getOverrideMasuk(d);
    if (override) return true;
    if (isWeekend(d)) return false;
    if (getHariLibur(d)) return false;
    return true;
  }).length;

  // Potongan percentages (total late/early minutes / total expected work minutes * 100)
  const totalExpectedMenit = hariKerjaEfektif * durasiStandar;
  const persenPotonganTerlambat = totalExpectedMenit > 0
    ? parseFloat(((totalTerlambatMenit / totalExpectedMenit) * 100).toFixed(2))
    : 0;
  const persenPotonganMendahului = totalExpectedMenit > 0
    ? parseFloat(((totalMendahuluiMenit / totalExpectedMenit) * 100).toFixed(2))
    : 0;
  const totalPotongan = parseFloat((persenPotonganTerlambat + persenPotonganMendahului).toFixed(2));

  // Presensi hari ini
  const todayPresensi = presensi.find((p) => {
    const pt = new Date(p.tanggal);
    const t = new Date();
    return pt.getDate() === t.getDate() && pt.getMonth() === t.getMonth() && pt.getFullYear() === t.getFullYear();
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Tombol Monitoring Kedisiplinan */}
      <button
        onClick={() => setShowMonitoring(true)}
        className="btn-primary"
        style={{
          alignSelf: 'flex-start',
          padding: '10px 18px',
          fontSize: '13px',
          gap: '8px',
          display: 'inline-flex',
          alignItems: 'center',
          borderRadius: '8px',
          fontWeight: '600',
        }}
      >
        <IconCalendar size={16} color="#ffffff" />
        <span>Monitoring Kedisiplinan</span>
      </button>

      {/* =================== Ringkasan Presensi =================== */}
      <div className="glass-card-static" style={{ padding: '20px' }}>
        <h3 style={{ fontSize: '14px', fontWeight: '700', color: '#0f172a', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <IconFileText size={16} color="#4361ee" /> Ringkasan Presensi — {BULAN_NAMES[selectedMonth - 1]} {selectedYear}
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' }}>
          {/* Potongan Terlambat */}
          <div style={{
            padding: '16px',
            borderRadius: '12px',
            background: '#fef2f2',
            border: '1px solid #fecaca',
            textAlign: 'center',
          }}>
            <div style={{ fontSize: '24px', fontWeight: '800', color: '#dc2626' }}>
              {persenPotonganTerlambat}%
            </div>
            <div style={{ fontSize: '12px', color: '#dc2626', marginTop: '2px' }}>
              {totalTerlambatMenit} menit
            </div>
            <div style={{ fontSize: '11px', color: '#64748b', marginTop: '6px', fontStyle: 'italic' }}>
              Potongan Terlambat
            </div>
          </div>

          {/* Potongan Mendahului */}
          <div style={{
            padding: '16px',
            borderRadius: '12px',
            background: '#f5f3ff',
            border: '1px solid #ddd6fe',
            textAlign: 'center',
          }}>
            <div style={{ fontSize: '24px', fontWeight: '800', color: '#7c3aed' }}>
              {persenPotonganMendahului}%
            </div>
            <div style={{ fontSize: '12px', color: '#7c3aed', marginTop: '2px' }}>
              {totalMendahuluiMenit} menit
            </div>
            <div style={{ fontSize: '11px', color: '#64748b', marginTop: '6px', fontStyle: 'italic' }}>
              Potongan Mendahului
            </div>
          </div>

          {/* Total Potongan */}
          <div style={{
            padding: '16px',
            borderRadius: '12px',
            background: '#f8fafc',
            border: '1px solid #e2e8f0',
            textAlign: 'center',
          }}>
            <div style={{ fontSize: '24px', fontWeight: '800', color: totalPotongan > 0 ? '#f59e0b' : '#059669' }}>
              {totalPotongan}%
            </div>
            <div style={{ fontSize: '12px', color: '#64748b', marginTop: '6px' }}>
              Total Potongan
            </div>
          </div>
        </div>
      </div>

      {/* =================== Presensi Hari Ini =================== */}
      <div
        className="glass-card-static"
        style={{
          padding: '18px 20px',
          borderLeft: '4px solid #4361ee',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '12px',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <IconClock size={16} color="#4361ee" />
            <h3 style={{ fontSize: '15px', fontWeight: '700', color: '#0f172a' }}>
              Presensi Hari Ini
            </h3>
          </div>
          <p suppressHydrationWarning style={{ color: '#64748b', fontSize: '13px' }}>
            {new Date().toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}
          </p>
        </div>
        <button
          onClick={() => setShowDetailHariIni(true)}
          className="btn-outline"
          style={{ padding: '8px 16px', fontSize: '12px', gap: '6px', display: 'inline-flex', alignItems: 'center' }}
        >
          <IconInfo size={14} color="#4361ee" /> Detail
        </button>
      </div>

      {/* =================== Filter Tahun dan Bulan =================== */}
      <div className="glass-card-static" style={{ padding: '20px' }}>
        <h3 style={{ fontSize: '14px', fontWeight: '700', color: '#0f172a', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <IconCalendar size={16} color="#4361ee" /> Filter Tahun dan Bulan
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          <div>
            <label className="input-label">Tahun</label>
            <select
              className="input-field"
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              style={{ background: '#ffffff', color: '#0f172a' }}
            >
              {[2024, 2025, 2026, 2027, 2028].map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="input-label">Bulan</label>
            <select
              className="input-field"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(Number(e.target.value))}
              style={{ background: '#ffffff', color: '#0f172a' }}
            >
              {BULAN_NAMES.map((name, i) => (
                <option key={i} value={i + 1}>{name}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* =================== Tabel Rekap Presensi =================== */}
      <div className="glass-card-static" style={{ padding: '4px', overflow: 'hidden' }}>
        <div style={{ padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '14px', fontWeight: '700', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <IconFileText size={16} color="#4361ee" /> Rekap Presensi
          </span>
          <span style={{ fontSize: '11px', color: '#94a3b8' }}>
            {hariKerjaEfektif} hari kerja efektif
          </span>
        </div>
        <div className="table-container" style={{ borderRadius: '12px', border: '1px solid #eaedf2' }}>
          <table className="data-table" style={{ width: '100%', minWidth: '940px' }}>
            <thead>
              <tr>
                <th style={{ minWidth: '125px', padding: '14px 16px' }}>Tanggal</th>
                <th style={{ minWidth: '135px', textAlign: 'center', padding: '14px 16px' }}>Aksi</th>
                <th style={{ minWidth: '100px', padding: '14px 16px' }}>Masuk</th>
                <th style={{ minWidth: '135px', padding: '14px 16px' }}>Terlambat (menit)</th>
                <th style={{ minWidth: '100px', padding: '14px 16px' }}>Pulang</th>
                <th style={{ minWidth: '145px', padding: '14px 16px' }}>Mendahului (menit)</th>
                <th style={{ minWidth: '115px', padding: '14px 16px' }}>Keterangan</th>
                <th style={{ minWidth: '110px', padding: '14px 16px' }}>Lokasi Kerja</th>
              </tr>
            </thead>
            <tbody>
              {allDays.map((day) => {
                const weekend = isWeekend(day);
                const libur = getHariLibur(day);
                const overrideMasuk = getOverrideMasuk(day);
                const p = findPresensi(day);
                const today = isToday(day);
                const isOffDay = Boolean((weekend || libur) && !overrideMasuk);
                const actionState = getSuketActionState(day, p, isOffDay);

                // Determine keterangan
                let keterangan = '-';
                let keteranganColor = '#64748b';
                if (overrideMasuk) {
                  if (p?.keterangan && p.keterangan !== 'e-presensi') {
                    keterangan = p.keterangan;
                    keteranganColor = '#2563eb';
                  } else if (p?.jamMasuk && !p?.jamPulang && !today && day < new Date()) {
                    keterangan = 'Tidak Absen Pulang';
                    keteranganColor = '#d97706';
                  } else if (p?.jamMasuk) {
                    keterangan = 'e-presensi';
                    keteranganColor = '#2563eb';
                  } else {
                    keterangan = `Masuk Kerja (${overrideMasuk.keterangan})`;
                    keteranganColor = '#059669';
                  }
                } else if (weekend) {
                  keterangan = 'Libur';
                  keteranganColor = '#dc2626';
                } else if (libur) {
                  keterangan = libur.keterangan;
                  keteranganColor = '#dc2626';
                } else if (p?.keterangan && p.keterangan !== 'e-presensi') {
                  keterangan = p.keterangan;
                  keteranganColor = '#2563eb';
                } else if (p?.jamMasuk && !p?.jamPulang && !today && day < new Date()) {
                  keterangan = 'Tidak Absen Pulang';
                  keteranganColor = '#d97706';
                } else if (p?.jamMasuk) {
                  keterangan = 'e-presensi';
                  keteranganColor = '#2563eb';
                }

                const rowStyle: React.CSSProperties = {
                  background: today
                    ? '#f5f3ff'
                    : overrideMasuk
                    ? '#ecfdf5'
                    : weekend || libur
                    ? '#fef2f2'
                    : undefined,
                };

                return (
                  <tr key={day.toISOString()} style={rowStyle}>
                    <td style={{ fontWeight: '600', color: '#0f172a', whiteSpace: 'nowrap', padding: '14px 16px' }}>
                      {formatDate(day)}
                    </td>
                    <td style={{ textAlign: 'center', whiteSpace: 'nowrap', padding: '14px 16px' }}>
                      {actionState?.show ? (
                        actionState.type === 'approved' ? (
                          <button
                            onClick={() => setSuketModal({ isOpen: true, tanggal: day, presensi: p })}
                            title="Suket telah disetujui admin. Jam kerja otomatis disesuaikan ke jam standar."
                            style={{
                              background: '#ecfdf5',
                              border: '1px solid #a7f3d0',
                              borderRadius: '8px',
                              padding: '5px 12px',
                              fontSize: '12px',
                              fontWeight: '700',
                              color: '#059669',
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              transition: 'all 0.15s ease',
                              boxShadow: '0 1px 2px rgba(5, 150, 105, 0.08)',
                            }}
                          >
                            <span>{actionState.label}</span>
                          </button>
                        ) : actionState.type === 'rejected' ? (
                          <button
                            onClick={() => setSuketModal({ isOpen: true, tanggal: day, presensi: p })}
                            title="Suket ditolak oleh admin"
                            style={{
                              background: '#fef2f2',
                              border: '1px solid #fecaca',
                              borderRadius: '8px',
                              padding: '5px 12px',
                              fontSize: '12px',
                              fontWeight: '700',
                              color: '#dc2626',
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                            }}
                          >
                            <span>{actionState.label}</span>
                          </button>
                        ) : actionState.type === 'submitted' ? (
                          <button
                            onClick={() => setSuketModal({ isOpen: true, tanggal: day, presensi: p })}
                            title="Klik untuk melihat / mengubah suket"
                            style={{
                              background: '#eff6ff',
                              border: '1px solid #bfdbfe',
                              borderRadius: '8px',
                              padding: '5px 12px',
                              fontSize: '12px',
                              fontWeight: '700',
                              color: '#2563eb',
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              transition: 'all 0.15s ease',
                              boxShadow: '0 1px 2px rgba(37, 99, 235, 0.08)',
                            }}
                          >
                            <span>✓</span>
                            <span>{actionState.label}</span>
                          </button>
                        ) : (
                          <button
                            onClick={() => setSuketModal({ isOpen: true, tanggal: day, presensi: p })}
                            style={{
                              background: '#ffffff',
                              border: '1px solid #cbd5e1',
                              borderRadius: '8px',
                              padding: '5px 12px',
                              fontSize: '12px',
                              fontWeight: '600',
                              color: '#1e293b',
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              transition: 'all 0.15s ease',
                              boxShadow: '0 1px 2px rgba(0, 0, 0, 0.04)',
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.borderColor = '#94a3b8';
                              e.currentTarget.style.background = '#f8fafc';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.borderColor = '#cbd5e1';
                              e.currentTarget.style.background = '#ffffff';
                            }}
                          >
                            {actionState.label}
                          </button>
                        )
                      ) : (
                        <span style={{ color: '#cbd5e1' }}>-</span>
                      )}
                    </td>
                    <td style={{ color: p?.jamMasuk ? '#059669' : '#94a3b8', fontWeight: '600', padding: '14px 16px' }}>
                      {isOffDay ? '-' : formatTime(p?.jamMasuk || null)}
                    </td>
                    <td style={{ color: p?.keterlambatan ? '#dc2626' : '#94a3b8', padding: '14px 16px' }}>
                      {isOffDay ? '-' : (p?.keterlambatan && p.keterlambatan > 0 ? (
                        <span>
                          <span style={{ fontWeight: '600' }}>{p.keterlambatan}</span>
                          <span style={{ fontSize: '11px', color: '#64748b', marginLeft: '4px' }}>
                            ({p.persenTerlambat || 0}%)
                          </span>
                        </span>
                      ) : '-')}
                    </td>
                    <td style={{ color: p?.jamPulang ? '#2563eb' : '#94a3b8', fontWeight: '600', padding: '14px 16px' }}>
                      {isOffDay ? '-' : formatTime(p?.jamPulang || null)}
                    </td>
                    <td style={{ color: p?.mendahului ? '#dc2626' : '#94a3b8', padding: '14px 16px' }}>
                      {isOffDay ? '-' : (p?.mendahului && p.mendahului > 0 ? (
                        <span style={{ color: '#dc2626', fontWeight: '700' }}>
                          <span>{p.mendahului}</span>
                          <span style={{ fontSize: '11px', marginLeft: '4px', fontWeight: '600' }}>
                            ({p.persenMendahului || 0}%)
                          </span>
                        </span>
                      ) : '-')}
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      <span style={{ fontStyle: 'italic', color: keteranganColor, fontSize: '12.5px' }}>
                        {keterangan}
                      </span>
                    </td>
                    <td style={{ color: '#475569', padding: '14px 16px' }}>
                      {isOffDay ? '-' : (p?.lokasiTugas || 'Kantor')}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* =================== MODAL: Monitoring Kedisiplinan (Exact Mockup Match) =================== */}
      <MonitoringKedisiplinanModal
        isOpen={showMonitoring}
        onClose={() => setShowMonitoring(false)}
        initialYear={selectedYear}
      />

      {/* =================== MODAL: Ajukan Suket =================== */}
      <AjukanSuketModal
        isOpen={suketModal.isOpen}
        onClose={() => setSuketModal({ isOpen: false, tanggal: null, presensi: null })}
        tanggal={suketModal.tanggal}
        presensi={suketModal.presensi}
        onSuccess={() => {
          fetchRekap();
        }}
      />


      {/* =================== MODAL: Detail Presensi Hari Ini =================== */}
      {showDetailHariIni && (
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
          onClick={() => setShowDetailHariIni(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: '#ffffff',
              borderRadius: '16px',
              padding: '28px',
              maxWidth: '500px',
              width: '100%',
              boxShadow: '0 20px 60px rgba(0,0,0,0.15)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: '800', color: '#0f172a' }}>
                📋 Detail Presensi Hari Ini
              </h3>
              <button
                onClick={() => setShowDetailHariIni(false)}
                style={{
                  background: '#f1f5f9',
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                  padding: '4px 10px',
                  cursor: 'pointer',
                  color: '#64748b',
                  fontSize: '14px',
                }}
              >
                ✕
              </button>
            </div>

            {todayPresensi ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {[
                  { label: 'Jam Masuk', value: formatTime(todayPresensi.jamMasuk), color: '#059669' },
                  { label: 'Status Masuk', value: todayPresensi.statusMasuk || '-', color: todayPresensi.statusMasuk === 'Tepat Waktu' ? '#059669' : '#d97706' },
                  { label: 'Keterlambatan', value: todayPresensi.keterlambatan ? `${todayPresensi.keterlambatan} menit (${todayPresensi.persenTerlambat || 0}%)` : '0 menit', color: todayPresensi.keterlambatan ? '#dc2626' : '#059669' },
                  { label: 'Target Jam Pulang', value: todayPresensi.targetJamPulang ? formatTime(todayPresensi.targetJamPulang) : (jamKerja?.jamPulang || '15:45'), color: '#7c3aed' },
                  { label: 'Jam Pulang Aktual', value: todayPresensi.jamPulang ? formatTime(todayPresensi.jamPulang) : 'Belum absen pulang', color: todayPresensi.jamPulang ? '#2563eb' : '#94a3b8' },
                  { label: 'Mendahului (Pulang Cepat)', value: todayPresensi.mendahului ? `${todayPresensi.mendahului} menit (${todayPresensi.persenMendahului || 0}%)` : '0 menit', color: todayPresensi.mendahului ? '#7c3aed' : '#059669' },
                  { label: 'Durasi Kerja Hari Ini', value: todayPresensi.durasiKerjaMenit ? `${Math.floor(todayPresensi.durasiKerjaMenit / 60)}j ${todayPresensi.durasiKerjaMenit % 60}m (${todayPresensi.persentaseHarian || 0}%)` : '-', color: '#0f172a' },
                  { label: 'Lokasi', value: todayPresensi.lokasiTugas || '-', color: '#475569' },
                ].map((item, i) => (
                  <div
                    key={i}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '10px 14px',
                      borderRadius: '10px',
                      background: '#f8fafc',
                      border: '1px solid #e2e8f0',
                    }}
                  >
                    <span style={{ fontSize: '13px', color: '#64748b' }}>{item.label}</span>
                    <span style={{ fontSize: '14px', fontWeight: '700', color: item.color }}>{item.value}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ textAlign: 'center', color: '#94a3b8', padding: '30px 0' }}>
                Belum ada data presensi hari ini
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
