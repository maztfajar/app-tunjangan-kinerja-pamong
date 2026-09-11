"use client";

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  IconTrash,
  IconDatabase,
  IconGlobe,
  IconCalendarYear,
  IconCalendarMonth,
  IconCalendarRange,
  IconTargetDay,
  IconFingerprint,
  IconActivity,
  IconBriefcase,
  IconAlertTriangle,
  IconCheckCircle,
  IconFileText,
  IconCalendar,
} from '@/components/ui/Icons';
import { TimeRangeMode } from '@/lib/dateRange';

interface RecordCounts {
  totalPresensi: number;
  totalLaporan: number;
  totalAktifitas: number;
  totalAgenda: number;
  rangePresensi?: number;
  rangeLaporan?: number;
  rangeAktifitas?: number;
  rangeAgenda?: number;
  rangeDescription?: string;
  isFiltered?: boolean;
}

export default function ResetDatabasePage() {
  const todayStr = new Date().toISOString().slice(0, 10);
  const currentMonthStr = todayStr.slice(0, 7);
  const currentYearStr = String(new Date().getFullYear());

  const [timeRangeMode, setTimeRangeMode] = useState<TimeRangeMode>('ALL');
  const [selectedTahun, setSelectedTahun] = useState<string>(currentYearStr);
  const [selectedBulan, setSelectedBulan] = useState<string>(currentMonthStr);
  const [startDate, setStartDate] = useState<string>(todayStr);
  const [endDate, setEndDate] = useState<string>(todayStr);
  const [harianDate, setHarianDate] = useState<string>(todayStr);

  const [counts, setCounts] = useState<RecordCounts>({
    totalPresensi: 0,
    totalLaporan: 0,
    totalAktifitas: 0,
    totalAgenda: 0,
    rangePresensi: 0,
    rangeLaporan: 0,
    rangeAktifitas: 0,
    rangeAgenda: 0,
    rangeDescription: 'Semua Riwayat Data (Seluruh Waktu)',
    isFiltered: false,
  });
  const [loading, setLoading] = useState(true);

  const [selected, setSelected] = useState({
    resetPresensi: false,
    resetLaporan: false,
    resetAktifitas: false,
    resetAgenda: false,
  });

  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [confirmInput, setConfirmInput] = useState('');
  const [executing, setExecuting] = useState(false);
  const [resultMessage, setResultMessage] = useState<{ type: 'success' | 'error'; text: string; rangeDescription?: string; details?: Record<string, number>; } | null>(null);

  const fetchStats = useCallback(async () => {
    setLoading(true);
    try {
      const queryParams = new URLSearchParams({
        timeRangeMode,
        tahun: selectedTahun,
        bulan: selectedBulan,
        startDate,
        endDate,
        harianDate,
      });

      const res = await fetch(`/api/superadmin/stats?${queryParams.toString()}`);
      const data = await res.json();
      if (data.stats) {
        setCounts({
          totalPresensi: data.stats.totalPresensi || 0,
          totalLaporan: data.stats.totalLaporan || 0,
          totalAktifitas: data.stats.totalAktifitas || 0,
          totalAgenda: data.stats.totalAgenda || 0,
          rangePresensi: data.stats.rangePresensi ?? data.stats.totalPresensi ?? 0,
          rangeLaporan: data.stats.rangeLaporan ?? data.stats.totalLaporan ?? 0,
          rangeAktifitas: data.stats.rangeAktifitas ?? data.stats.totalAktifitas ?? 0,
          rangeAgenda: data.stats.rangeAgenda ?? data.stats.totalAgenda ?? 0,
          rangeDescription: data.stats.rangeDescription || 'Semua Riwayat Data',
          isFiltered: !!data.stats.isFiltered,
        });
      }
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  }, [timeRangeMode, selectedTahun, selectedBulan, startDate, endDate, harianDate]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  const handleSelectAll = (val: boolean) => {
    setSelected({
      resetPresensi: val,
      resetLaporan: val,
      resetAktifitas: val,
      resetAgenda: val,
    });
  };

  const setPresetWeek = (type: 'last7' | 'thisWeek' | 'thisMonth') => {
    const now = new Date();
    if (type === 'last7') {
      const past = new Date(now);
      past.setDate(now.getDate() - 6);
      setStartDate(past.toISOString().slice(0, 10));
      setEndDate(now.toISOString().slice(0, 10));
    } else if (type === 'thisWeek') {
      const day = now.getDay();
      const diff = now.getDate() - day + (day === 0 ? -6 : 1);
      const monday = new Date(now.setDate(diff));
      const sunday = new Date(monday);
      sunday.setDate(monday.getDate() + 6);
      setStartDate(monday.toISOString().slice(0, 10));
      setEndDate(sunday.toISOString().slice(0, 10));
    } else if (type === 'thisMonth') {
      const y = now.getFullYear();
      const m = now.getMonth();
      const first = new Date(y, m, 1);
      const last = new Date(y, m + 1, 0);
      setStartDate(first.toISOString().slice(0, 10));
      setEndDate(last.toISOString().slice(0, 10));
    }
  };

  const setPresetDaily = (type: 'today' | 'yesterday') => {
    const now = new Date();
    if (type === 'today') {
      setHarianDate(now.toISOString().slice(0, 10));
    } else if (type === 'yesterday') {
      now.setDate(now.getDate() - 1);
      setHarianDate(now.toISOString().slice(0, 10));
    }
  };

  const hasSelection = Object.values(selected).some(Boolean);

  const handleOpenConfirm = () => {
    if (!hasSelection) { alert('Silakan pilih minimal satu jenis data yang ingin dihapus / direset.'); return; }
    setConfirmInput('');
    setShowConfirmModal(true);
  };

  const handleExecuteReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (confirmInput !== 'HAPUS DATA') { alert('Kata kunci konfirmasi salah. Harap ketik "HAPUS DATA" persis.'); return; }

    setExecuting(true);
    setResultMessage(null);

    try {
      const res = await fetch('/api/superadmin/reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...selected,
          timeRangeMode,
          tahun: selectedTahun,
          bulan: selectedBulan,
          startDate,
          endDate,
          harianDate,
          confirmKey: confirmInput,
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        setResultMessage({ type: 'error', text: data.error || 'Gagal mereset database.' });
      } else {
        setResultMessage({ type: 'success', text: data.message || 'Pembersihan database berhasil diselesaikan!', rangeDescription: data.rangeDescription, details: data.deletedCounts });
        setShowConfirmModal(false);
        handleSelectAll(false);
        fetchStats();
      }
    } catch {
      setResultMessage({ type: 'error', text: 'Terjadi kesalahan jaringan saat memproses reset data.' });
    }
    setExecuting(false);
  };

  const rangeDesc = counts.rangeDescription || 'Rentang Terpilih';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', width: '100%' }}>
      <div className="glass-card-static animate-slide-up" style={{ padding: '24px 28px', background: '#ffffff', border: '1px solid #fee2e2', borderRadius: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{ width: '50px', height: '50px', background: '#fef2f2', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><IconDatabase size={28} color="#ef4444"/></div>
          <div>
            <h2 style={{ fontSize: '22px', fontWeight: '800', color: '#0f172a' }}>Reset &amp; Pembersihan Database</h2>
            <p style={{ fontSize: '14px', color: '#64748b', marginTop: '3px' }}>Pembersihan data rekapitulasi absensi, laporan kinerja, dan operasional dengan filter rentang waktu fleksibel.</p>
          </div>
        </div>

        <Link href="/superadmin" className="btn-outline" style={{ fontSize: '13px', fontWeight: '700', padding: '8px 16px' }}>← Kembali ke Dashboard</Link>
      </div>

      <div style={{ padding: '18px 24px', borderRadius: '14px', background: '#fff1f2', border: '1px solid #fecaca', color: '#991b1b', fontSize: '13px', lineHeight: '1.6' }}>
        <div style={{ fontWeight: '800', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}><IconAlertTriangle size={18} color="#dc2626" /><span>PERHATIAN TINGKAT SISTEM (SUPER ADMIN):</span></div>
        <p>Pembersihan data bersifat <b>permanen</b> sesuai kriteria dan rentang waktu yang Anda tentukan. <b>Data Pengguna (User Akun Pamong &amp; Admin) serta Pengaturan Master Lokasi/Jam Kerja TIDAK AKAN DIHAPUS</b>.</p>
      </div>

      {resultMessage && (
        <div style={{ padding: '14px 18px', borderRadius: '10px', background: resultMessage.type === 'success' ? '#ecfdf5' : '#fef2f2', border: resultMessage.type === 'success' ? '1px solid #a7f3d0' : '1px solid #fecaca', color: resultMessage.type === 'success' ? '#065f46' : '#991b1b', fontSize: '13px', fontWeight: '600' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>{resultMessage.type === 'success' ? <IconCheckCircle size={18} color="#059669" /> : '❌'}<span>{resultMessage.text}</span></div>
          {resultMessage.rangeDescription && (<div style={{ fontSize: '12px', marginTop: '4px', opacity: 0.9 }}>Rentang pembersihan: <b>{resultMessage.rangeDescription}</b></div>)}
          {resultMessage.details && (<ul style={{ margin: '8px 0 0 24px', fontSize: '12px', fontWeight: '500' }}>{Object.entries(resultMessage.details).map(([k, v]) => (<li key={k}>Data {k}: <b>{v} baris</b> berhasil dibersihkan</li>))}</ul>)}
        </div>
      )}

      <div className="glass-card-static animate-slide-up" style={{ padding: '24px', background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '16px' }}>
        <div style={{ marginBottom: '18px' }}>
          <h3 style={{ fontSize: '17px', fontWeight: '800', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}><span>1.</span><span>Pilih Cakupan / Rentang Waktu Pembersihan:</span></h3>
          <p style={{ fontSize: '14px', color: '#64748b', marginTop: '4px' }}>Tentukan apakah Anda ingin mereset seluruh data, atau membatasi penghapusan pada tahun, bulan, minggu, maupun hari tertentu.</p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px', marginBottom: '20px' }}>
          {[
            { id: 'ALL', label: 'Reset Semua', sub: 'Seluruh Riwayat', icon: IconGlobe, color: '#0284c7', bg: '#e0f2fe' },
            { id: 'TAHUN', label: 'Rentang Tahun', sub: '1 Jan - 31 Des', icon: IconCalendarYear, color: '#0d9488', bg: '#ccfbf1' },
            { id: 'BULAN', label: 'Rentang Bulan', sub: '1 Bulan Penuh', icon: IconCalendarMonth, color: '#6366f1', bg: '#e0e7ff' },
            { id: 'MINGGU', label: 'Rentang Mingguan', sub: 'Rentang Tanggal', icon: IconCalendarRange, color: '#f59e0b', bg: '#fef3c7' },
            { id: 'HARIAN', label: 'Harian (1 Hari)', sub: 'Tanggal Spesifik', icon: IconTargetDay, color: '#ec4899', bg: '#fce7f3' },
          ].map((mode) => {
            const isActive = timeRangeMode === mode.id;
            const IconComponent = mode.icon as any;
            return (
              <button key={mode.id} type="button" onClick={() => setTimeRangeMode(mode.id as TimeRangeMode)} style={{ padding: '14px 16px', borderRadius: '12px', border: isActive ? '2px solid #0089d7' : '1px solid #e2e8f0', background: isActive ? '#eff6ff' : '#f8fafc', color: isActive ? '#0077b6' : '#334155', cursor: 'pointer', textAlign: 'left', display: 'flex', alignItems: 'center', gap: '12px', transition: 'all 0.15s ease' }}>
                <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: isActive ? '#0089d7' : mode.bg, color: isActive ? '#ffffff' : mode.color, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'all 0.15s ease' }}>
                  <IconComponent size={22} color={isActive ? '#ffffff' : mode.color} />
                </div>
                <div>
                  <div style={{ fontSize: '14px', fontWeight: isActive ? '800' : '700' }}>{mode.label}</div>
                  <div style={{ fontSize: '12px', color: isActive ? '#0284c7' : '#64748b', marginTop: '2px' }}>{mode.sub}</div>
                </div>
              </button>
            );
          })}
        </div>

        <div style={{ padding: '20px', borderRadius: '14px', background: '#f8fafc', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {timeRangeMode === 'ALL' && (<div style={{ fontSize: '14px', color: '#334155', display: 'flex', alignItems: 'center', gap: '10px' }}><span style={{ fontSize: '18px' }}>ℹ️</span><span><b>Mode Semua Riwayat:</b> Seluruh data catatan sejak awal sistem dibuat akan dihapus untuk jenis data yang Anda beri tanda centang di bawah.</span></div>)}

          {timeRangeMode === 'TAHUN' && (<div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}><div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}><label style={{ fontSize: '13px', fontWeight: '800', color: '#1e293b' }}>Pilih Tahun Anggaran / Kegiatan:</label><select value={selectedTahun} onChange={(e) => setSelectedTahun(e.target.value)} className="input-field" style={{ width: '200px', padding: '10px 14px', fontSize: '14px', fontWeight: '700' }}>{[2027, 2026, 2025, 2024, 2023, 2022].map((y) => (<option key={y} value={y}>Tahun {y}</option>))}</select></div><div style={{ fontSize: '12px', color: '#64748b', marginTop: '16px' }}>* Hanya data yang tercatat pada <b>1 Januari {selectedTahun} s/d 31 Desember {selectedTahun}</b> yang akan dihapus.</div></div>)}

          {timeRangeMode === 'BULAN' && (<div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}><div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}><label style={{ fontSize: '12px', fontWeight: '700', color: '#334155' }}>Pilih Bulan &amp; Tahun:</label><input type="month" value={selectedBulan} onChange={(e) => setSelectedBulan(e.target.value)} className="input-field" style={{ width: '200px', padding: '8px 12px', fontSize: '13px', fontWeight: '700' }} /></div><div style={{ display: 'flex', gap: '6px', marginTop: '18px' }}><button type="button" onClick={() => setSelectedBulan(currentMonthStr)} className="btn-outline" style={{ fontSize: '11px', padding: '6px 10px' }}>Bulan Ini</button></div></div>)}

          {timeRangeMode === 'MINGGU' && (<div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}><div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}><div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}><label style={{ fontSize: '12px', fontWeight: '700', color: '#334155' }}>Tanggal Mulai:</label><input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="input-field" style={{ width: '160px', padding: '8px 10px', fontSize: '13px', fontWeight: '600' }} /></div><div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}><label style={{ fontSize: '12px', fontWeight: '700', color: '#334155' }}>Tanggal Selesai:</label>
              <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="input-field" style={{ width: '160px', padding: '8px 10px', fontSize: '13px', fontWeight: '600' }} /></div><div style={{ display: 'flex', gap: '6px', marginTop: '18px', flexWrap: 'wrap' }}><button type="button" onClick={() => setPresetWeek('last7')} className="btn-outline" style={{ fontSize: '11px', padding: '6px 10px' }}>7 Hari Terakhir</button><button type="button" onClick={() => setPresetWeek('thisWeek')} className="btn-outline" style={{ fontSize: '11px', padding: '6px 10px' }}>Minggu Ini (Senin - Minggu)</button><button type="button" onClick={() => setPresetWeek('thisMonth')} className="btn-outline" style={{ fontSize: '11px', padding: '6px 10px' }}>Bulan Berjalan</button></div></div><div style={{ fontSize: '12px', color: '#64748b' }}>* Menghapus data operasional di antara <b>{startDate}</b> sampai dengan <b>{endDate}</b>.</div></div>)}

          {timeRangeMode === 'HARIAN' && (<div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}><div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}><label style={{ fontSize: '12px', fontWeight: '700', color: '#334155' }}>Pilih Tanggal Spesifik (Harian):</label><input type="date" value={harianDate} onChange={(e) => setHarianDate(e.target.value)} className="input-field" style={{ width: '180px', padding: '8px 12px', fontSize: '13px', fontWeight: '700' }} /></div><div style={{ display: 'flex', gap: '6px', marginTop: '18px' }}><button type="button" onClick={() => setPresetDaily('today')} className="btn-outline" style={{ fontSize: '11px', padding: '6px 10px' }}>Hari Ini</button><button type="button" onClick={() => setPresetDaily('yesterday')} className="btn-outline" style={{ fontSize: '11px', padding: '6px 10px' }}>Kemarin</button></div><div style={{ fontSize: '12px', color: '#64748b', marginTop: '16px' }}>* Hanya data transaksi pada tanggal <b>{harianDate}</b> yang akan dihapus.</div></div>)}

          <div style={{ marginTop: '6px', padding: '8px 12px', borderRadius: '8px', background: counts.isFiltered ? '#fef3c7' : '#e2e8f0', color: counts.isFiltered ? '#92400e' : '#334155', fontSize: '12px', fontWeight: '700', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '6px' }}>
            <div>📍 Rentang Aktif: <b>{rangeDesc}</b></div>
            <div>{counts.isFiltered ? '⚙️ Filter Aktif (Data di luar rentang ini aman)' : '🌐 Seluruh Data Sistem'}</div>
          </div>
        </div>
      </div>

      <div className="glass-card-static animate-slide-up" style={{ padding: '24px', background: '#ffffff', border: '1px solid #eaedf2', borderRadius: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h3 style={{ fontSize: '17px', fontWeight: '800', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}><span>2.</span><span>Pilih Jenis Data yang Ingin Direset / Dihapus:</span></h3>
            <p style={{ fontSize: '14px', color: '#64748b', marginTop: '3px' }}>Beri tanda centang pada kategori data yang hendak dibersihkan pada rentang waktu di atas.</p>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}><button type="button" onClick={() => handleSelectAll(true)} className="btn-outline" style={{ fontSize: '12px', fontWeight: '700', padding: '6px 14px' }}>Pilih Semua</button><button type="button" onClick={() => handleSelectAll(false)} className="btn-outline" style={{ fontSize: '12px', fontWeight: '700', padding: '6px 14px' }}>Batal Pilih</button></div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <label style={{ padding: '16px 20px', borderRadius: '14px', border: selected.resetPresensi ? '2px solid #ef4444' : '1px solid #e2e8f0', background: selected.resetPresensi ? '#fef2f2' : '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', transition: 'all 0.15s ease' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              <input type="checkbox" checked={selected.resetPresensi} onChange={(e) => setSelected({ ...selected, resetPresensi: e.target.checked })} style={{ width: '20px', height: '20px', accentColor: '#ef4444', cursor: 'pointer' }} />
              <div>
                <div style={{ fontSize: '15px', fontWeight: '800', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}><IconFingerprint size={20} color="#0089d7" /><span>Data Rekapitulasi Presensi &amp; Absensi GPS</span></div>
                <div style={{ fontSize: '13px', color: '#64748b', marginTop: '3px' }}>Menghapus riwayat jam masuk, jam pulang, keterlambatan, dan status kehadiran pamong.</div>
              </div>
            </div>
            <div style={{ textAlign: 'right' }}><span style={{ fontSize: '13px', fontWeight: '800', color: selected.resetPresensi ? '#dc2626' : '#ef4444', background: '#ffffff', padding: '6px 12px', borderRadius: '8px', border: '1px solid #fecaca', display: 'inline-block' }}>{loading ? '...' : counts.isFiltered ? `${counts.rangePresensi} Baris Terpilih` : `${counts.totalPresensi} Baris`}</span>{counts.isFiltered && (<div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '4px', fontWeight: '600' }}>Total Sistem: {counts.totalPresensi} Baris</div>)}</div>
          </label>

          <label style={{ padding: '16px 20px', borderRadius: '14px', border: selected.resetLaporan ? '2px solid #ef4444' : '1px solid #e2e8f0', background: selected.resetLaporan ? '#fef2f2' : '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', transition: 'all 0.15s ease' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              <input type="checkbox" checked={selected.resetLaporan} onChange={(e) => setSelected({ ...selected, resetLaporan: e.target.checked })} style={{ width: '20px', height: '20px', accentColor: '#ef4444', cursor: 'pointer' }} />
              <div>
                <div style={{ fontSize: '15px', fontWeight: '800', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}><IconFileText size={20} color="#7c3aed" /><span>Data Rekapitulasi Laporan Kinerja Bulanan</span></div>
                <div style={{ fontSize: '13px', color: '#64748b', marginTop: '3px' }}>Menghapus lembar laporan kinerja, rencana, target capaian, dan dokumen penilaian pamong.</div>
              </div>
            </div>
            <div style={{ textAlign: 'right' }}><span style={{ fontSize: '13px', fontWeight: '800', color: selected.resetLaporan ? '#dc2626' : '#ef4444', background: '#ffffff', padding: '6px 12px', borderRadius: '8px', border: '1px solid #fecaca', display: 'inline-block' }}>{loading ? '...' : counts.isFiltered ? `${counts.rangeLaporan} Baris Terpilih` : `${counts.totalLaporan} Baris`}</span>{counts.isFiltered && (<div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '4px', fontWeight: '600' }}>Total Sistem: {counts.totalLaporan} Baris</div>)}</div>
          </label>

          <label style={{ padding: '16px 20px', borderRadius: '14px', border: selected.resetAktifitas ? '2px solid #ef4444' : '1px solid #e2e8f0', background: selected.resetAktifitas ? '#fef2f2' : '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', transition: 'all 0.15s ease' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              <input type="checkbox" checked={selected.resetAktifitas} onChange={(e) => setSelected({ ...selected, resetAktifitas: e.target.checked })} style={{ width: '20px', height: '20px', accentColor: '#ef4444', cursor: 'pointer' }} />
              <div>
                <div style={{ fontSize: '15px', fontWeight: '800', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}><IconActivity size={20} color="#059669" /><span>Data Aktivitas Harian</span></div>
                <div style={{ fontSize: '13px', color: '#64748b', marginTop: '3px' }}>Menghapus catatan uraian pekerjaan harian dan lampiran foto kegiatan pamong.</div>
              </div>
            </div>
            <div style={{ textAlign: 'right' }}><span style={{ fontSize: '13px', fontWeight: '800', color: selected.resetAktifitas ? '#dc2626' : '#ef4444', background: '#ffffff', padding: '6px 12px', borderRadius: '8px', border: '1px solid #fecaca', display: 'inline-block' }}>{loading ? '...' : counts.isFiltered ? `${counts.rangeAktifitas} Baris Terpilih` : `${counts.totalAktifitas} Baris`}</span>{counts.isFiltered && (<div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '4px', fontWeight: '600' }}>Total Sistem: {counts.totalAktifitas} Baris</div>)}</div>
          </label>

          <label style={{ padding: '16px 20px', borderRadius: '14px', border: selected.resetAgenda ? '2px solid #ef4444' : '1px solid #e2e8f0', background: selected.resetAgenda ? '#fef2f2' : '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', transition: 'all 0.15s ease' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              <input type="checkbox" checked={selected.resetAgenda} onChange={(e) => setSelected({ ...selected, resetAgenda: e.target.checked })} style={{ width: '20px', height: '20px', accentColor: '#ef4444', cursor: 'pointer' }} />
              <div>
                <div style={{ fontSize: '15px', fontWeight: '800', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}><IconCalendar size={20} color="#0284c7" /><span>Data Agenda Jadwal Kegiatan</span></div>
                <div style={{ fontSize: '13px', color: '#64748b', marginTop: '3px' }}>Menghapus jadwal agenda pertemuan dan acara kalurahan.</div>
              </div>
            </div>
            <div style={{ textAlign: 'right' }}><span style={{ fontSize: '13px', fontWeight: '800', color: selected.resetAgenda ? '#dc2626' : '#ef4444', background: '#ffffff', padding: '6px 12px', borderRadius: '8px', border: '1px solid #fecaca', display: 'inline-block' }}>{loading ? '...' : counts.isFiltered ? `${counts.rangeAgenda} Baris Terpilih` : `${counts.totalAgenda} Baris`}</span>{counts.isFiltered && (<div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '4px', fontWeight: '600' }}>Total Sistem: {counts.totalAgenda} Baris</div>)}</div>
          </label>
        </div>

        <div style={{ marginTop: '28px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
          <div style={{ fontSize: '14px', color: '#475569' }}>Rentang Terpilih: <b style={{ color: '#0f172a' }}>{rangeDesc}</b></div>

          <button type="button" disabled={!hasSelection} onClick={handleOpenConfirm} className="btn-danger" style={{ padding: '14px 28px', fontSize: '14px', fontWeight: '800', gap: '10px', opacity: hasSelection ? 1 : 0.45, cursor: hasSelection ? 'pointer' : 'not-allowed' }}><IconTrash size={18} color="#ffffff" /><span>Jalankan Pembersihan Database</span></button>
        </div>
      </div>

      {showConfirmModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.65)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <form onSubmit={handleExecuteReset} style={{ background: '#fff', padding: 20, borderRadius: 12, width: 520 }}>
            <h3 style={{ marginTop: 0 }}>Konfirmasi Keamanan Ketat</h3>
            <p>Operasi ini bersifat permanen. Ketik <b>HAPUS DATA</b> lalu klik konfirmasi untuk melanjutkan.</p>
            <input value={confirmInput} onChange={(e) => setConfirmInput(e.target.value)} style={{ width: '100%', padding: 10, marginBottom: 12 }} />
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <button type="button" onClick={() => setShowConfirmModal(false)} className="btn-outline">Batal</button>
              <button type="submit" className="btn-danger" disabled={executing}>{executing ? 'Sedang...' : 'Konfirmasi Hapus Sekarang'}</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
