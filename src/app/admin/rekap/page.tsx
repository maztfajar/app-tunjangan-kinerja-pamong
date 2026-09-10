'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { IconFileText, IconCalendar, IconClock, IconUsers, IconCheckCircle, IconClose } from '@/components/ui/Icons';

interface Pegawai {
  id: string;
  nip: string;
  nama: string;
  jabatan: string | null;
  unitKerja: string | null;
}

interface PresensiItem {
  id: string;
  userId: string;
  user: { id?: string; nama: string; nip: string; jabatan: string | null };
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

interface HariLiburItem {
  tanggal: string;
  tanggalKey?: string;
  keterangan: string;
  isLibur?: boolean;
}

interface JamKerjaData {
  jamMasuk: string;
  jamPulang: string;
  durasiKerjaMenit: number;
}

interface ParsedSuket {
  jenisSuket?: string;
  tipeSuket?: string;
  alasan?: string;
  status?: string;
  tanggalPengajuan?: string;
  catatanAdmin?: string;
  approvedAt?: string;
  rejectedAt?: string;
}

export default function RekapAdminPage() {
  const [pegawaiList, setPegawaiList] = useState<Pegawai[]>([]);
  const [presensiList, setPresensiList] = useState<PresensiItem[]>([]);
  const [hariLibur, setHariLibur] = useState<HariLiburItem[]>([]);
  const [jamKerja, setJamKerja] = useState<JamKerjaData | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'pending_suket'>('all');

  // Month state (YYYY-MM)
  const [bulan, setBulan] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });

  // Modal State: Review Suket
  const [reviewModal, setReviewModal] = useState<{
    isOpen: boolean;
    presensi: PresensiItem | null;
    parsedSuket: ParsedSuket | null;
  }>({
    isOpen: false,
    presensi: null,
    parsedSuket: null,
  });
  const [catatanAdmin, setCatatanAdmin] = useState('');
  const [reviewLoading, setReviewLoading] = useState(false);
  const [reviewMessage, setReviewMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Modal State: Detail Log Harian Pamong
  const [detailModal, setDetailModal] = useState<{
    isOpen: boolean;
    pegawai: Pegawai | null;
  }>({
    isOpen: false,
    pegawai: null,
  });

  const [year, month] = useMemo(() => bulan.split('-').map(Number), [bulan]);

  // Fetch all required data
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [pegRes, presRes, liburRes] = await Promise.all([
        fetch('/api/pegawai'),
        fetch(`/api/presensi?all=true&bulan=${bulan}`),
        fetch(`/api/hari-libur?tahun=${year}&bulan=${month}`),
      ]);

      const pegData = await pegRes.json();
      const presData = await presRes.json();
      const liburData = await liburRes.json();

      setPegawaiList(pegData.pegawai || []);
      setPresensiList(presData.presensi || []);
      setHariLibur(liburData.hariLibur || []);
      if (presData.jamKerja) setJamKerja(presData.jamKerja);
    } catch (err) {
      console.error('Fetch admin rekap error:', err);
    } finally {
      setLoading(false);
    }
  }, [bulan, year, month]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Helper date keys
  const toDateKey = (date: Date) => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };

  const isWeekend = (date: Date) => date.getDay() === 0 || date.getDay() === 6;

  const getHariLibur = (date: Date): HariLiburItem | null => {
    const targetKey = toDateKey(date);
    return hariLibur.find((h) => {
      const hKey = h.tanggalKey || h.tanggal.slice(0, 10);
      return hKey === targetKey && h.isLibur !== false;
    }) || null;
  };

  const getOverrideMasuk = (date: Date): HariLiburItem | null => {
    const targetKey = toDateKey(date);
    return hariLibur.find((h) => {
      const hKey = h.tanggalKey || h.tanggal.slice(0, 10);
      return hKey === targetKey && h.isLibur === false;
    }) || null;
  };

  // Generate all days in selected month
  const daysInMonth = new Date(year, month, 0).getDate();
  const allDays = useMemo(() => {
    return Array.from({ length: daysInMonth }, (_, i) => new Date(year, month - 1, i + 1));
  }, [year, month, daysInMonth]);

  // Real-time Cutoff: Hanya hari s/d hari ini yang dihitung (tidak bocor ke masa depan)
  const now = new Date();
  const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

  const pastAndCurrentDays = useMemo(() => {
    return allDays.filter((d) => d <= todayEnd);
  }, [allDays, todayEnd]);

  // Total Hari Kerja Efektif Real-time (s/d hari ini)
  const totalHariKerjaRealtime = useMemo(() => {
    return pastAndCurrentDays.filter((d) => {
      const override = getOverrideMasuk(d);
      if (override) return true;
      if (isWeekend(d)) return false;
      if (getHariLibur(d)) return false;
      return true;
    }).length;
  }, [pastAndCurrentDays, hariLibur]);

  // Agregasi Data Kedisiplinan Per Pegawai
  const aggregatedPegawai = useMemo(() => {
    return pegawaiList.map((peg) => {
      // Presensi pamong ini di bulan terpilih
      const userRecords = presensiList.filter((p) => p.userId === peg.id || p.user?.nip === peg.nip);

      // Filter hanya tanggal realtime (<= today) untuk keterlambatan & mendahului
      let totalTerlambat = 0;
      let totalMendahului = 0;
      const attendedDates = new Set<string>();
      const pendingSukets: Array<{ presensi: PresensiItem; suket: ParsedSuket }> = [];
      const approvedSukets: Array<{ presensi: PresensiItem; suket: ParsedSuket }> = [];

      userRecords.forEach((p) => {
        const pDate = new Date(p.tanggal);

        // Parse suket jika ada
        let parsed: ParsedSuket | null = null;
        if (p.suket) {
          try {
            parsed = JSON.parse(p.suket);
            if (parsed?.status === 'Diajukan') {
              pendingSukets.push({ presensi: p, suket: parsed });
            } else if (parsed?.status === 'Disetujui') {
              approvedSukets.push({ presensi: p, suket: parsed });
            }
          } catch {}
        }

        // Hitung akumulasi hanya jika tanggal <= hari ini
        if (pDate <= todayEnd) {
          const dateKey = toDateKey(pDate);
          if (p.jamMasuk || parsed?.status === 'Disetujui') {
            attendedDates.add(dateKey);
          }

          // Keterlambatan dan kepulangan mendahului dihitung jika belum disetujui suketnya
          if (parsed?.status !== 'Disetujui') {
            totalTerlambat += p.keterlambatan || 0;
            totalMendahului += p.mendahului || 0;
          }
        }
      });

      const totalHadir = attendedDates.size;
      const tidakHadir = Math.max(0, totalHariKerjaRealtime - totalHadir);
      const totalPelanggaranMenit = totalTerlambat + totalMendahului;

      // Tentukan Status Kedisiplinan Real-Time
      // Syarat Sangat Disiplin: Hadir lengkap tanpa alpa (tidakHadir === 0) dan total pelanggaran menit <= 30
      let kedisiplinan = {
        label: 'Sangat Disiplin',
        color: '#059669',
        bg: '#ecfdf5',
        border: '#a7f3d0',
      };

      if (totalHariKerjaRealtime > 0) {
        if (totalHadir === 0 || tidakHadir >= 2 || totalPelanggaranMenit > 120) {
          kedisiplinan = {
            label: 'Kurang Disiplin',
            color: '#dc2626',
            bg: '#fef2f2',
            border: '#fecaca',
          };
        } else if (tidakHadir === 1 || totalPelanggaranMenit > 30) {
          kedisiplinan = {
            label: 'Disiplin',
            color: '#2563eb',
            bg: '#eff6ff',
            border: '#bfdbfe',
          };
        }
      }

      return {
        pegawai: peg,
        totalHadir,
        tidakHadir,
        totalTerlambat,
        totalMendahului,
        totalPelanggaranMenit,
        pendingSukets,
        approvedSukets,
        kedisiplinan,
        userRecords,
      };
    });
  }, [pegawaiList, presensiList, todayEnd, totalHariKerjaRealtime]);

  // Hitung total pending suket di seluruh pamong
  const totalPendingSuket = useMemo(() => {
    return aggregatedPegawai.reduce((sum, item) => sum + item.pendingSukets.length, 0);
  }, [aggregatedPegawai]);

  // Filter daftar pegawai berdasarkan search & activeTab
  const filteredData = useMemo(() => {
    return aggregatedPegawai.filter((item) => {
      const matchSearch =
        item.pegawai.nama.toLowerCase().includes(search.toLowerCase()) ||
        item.pegawai.nip.includes(search);

      if (!matchSearch) return false;

      if (activeTab === 'pending_suket') {
        return item.pendingSukets.length > 0;
      }

      return true;
    });
  }, [aggregatedPegawai, search, activeTab]);

  // Handler Review Suket (Approve / Reject)
  const handleReviewSuket = async (action: 'approve' | 'reject') => {
    if (!reviewModal.presensi) return;

    setReviewLoading(true);
    setReviewMessage(null);

    try {
      const res = await fetch('/api/admin/suket', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          presensiId: reviewModal.presensi.id,
          action,
          catatanAdmin: catatanAdmin.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Gagal memproses suket');
      }

      setReviewMessage({
        type: 'success',
        text: data.message || 'Suket berhasil diproses',
      });

      setTimeout(() => {
        setReviewModal({ isOpen: false, presensi: null, parsedSuket: null });
        setCatatanAdmin('');
        setReviewMessage(null);
        fetchData();
      }, 1200);
    } catch (err: unknown) {
      setReviewMessage({
        type: 'error',
        text: err instanceof Error ? err.message : 'Terjadi kesalahan saat memproses suket',
      });
    } finally {
      setReviewLoading(false);
    }
  };

  const formatDate = (d: string | Date) =>
    new Date(d).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });

  const formatTime = (d: string | null) =>
    d ? new Date(d).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '-';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>
      {/* Header & Month Filter */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h2 style={{ fontSize: '24px', fontWeight: '800', color: '#0f172a', marginBottom: '6px' }}>
            Rekap Kedisiplinan Pamong 📋
          </h2>
          <p style={{ color: '#64748b', fontSize: '13.5px' }}>
            Rekapitulasi keterlambatan, kepulangan cepat, dan pengajuan suket pamong (Real-Time s/d hari ini)
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <label className="input-label" style={{ marginBottom: 0, color: '#334155', fontWeight: '700' }}>
            Periode Bulan:
          </label>
          <input
            type="month"
            className="input-field"
            value={bulan}
            onChange={(e) => setBulan(e.target.value)}
            style={{ width: '180px', background: '#ffffff', color: '#0f172a', fontWeight: '600' }}
          />
        </div>
      </div>

      {/* 4 Summary Stat Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px' }}>
        {/* Total Pamong */}
        <div className="stat-card" style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderLeft: '4px solid #4361ee' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#64748b' }}>
            <IconUsers size={16} color="#4361ee" />
            <p style={{ fontSize: '11px', fontWeight: '700', textTransform: 'uppercase' }}>Total Pamong</p>
          </div>
          <p style={{ fontSize: '24px', fontWeight: '800', color: '#0f172a', marginTop: '6px' }}>
            {pegawaiList.length} <span style={{ fontSize: '13px', fontWeight: '500', color: '#64748b' }}>orang</span>
          </p>
        </div>

        {/* Suket Menunggu Tindakan (Notification) */}
        <div
          className="stat-card"
          onClick={() => setActiveTab('pending_suket')}
          style={{
            background: totalPendingSuket > 0 ? '#fffbeb' : '#ffffff',
            border: `1px solid ${totalPendingSuket > 0 ? '#fde68a' : '#e2e8f0'}`,
            borderLeft: '4px solid #f59e0b',
            cursor: 'pointer',
            transition: 'all 0.15s ease',
          }}
          title="Klik untuk memfilter suket yang menunggu tindakan"
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#b45309' }}>
              <IconFileText size={16} color="#f59e0b" />
              <p style={{ fontSize: '11px', fontWeight: '700', textTransform: 'uppercase' }}>Suket Perlu Tindakan</p>
            </div>
            {totalPendingSuket > 0 && (
              <span style={{ fontSize: '10px', background: '#f59e0b', color: '#ffffff', padding: '2px 6px', borderRadius: '10px', fontWeight: '800' }}>
                BARU
              </span>
            )}
          </div>
          <p style={{ fontSize: '24px', fontWeight: '800', color: totalPendingSuket > 0 ? '#b45309' : '#0f172a', marginTop: '6px' }}>
            {totalPendingSuket} <span style={{ fontSize: '13px', fontWeight: '500', color: '#64748b' }}>pengajuan</span>
          </p>
        </div>

        {/* Hari Kerja Efektif Realtime */}
        <div className="stat-card" style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderLeft: '4px solid #10b981' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#64748b' }}>
            <IconCalendar size={16} color="#10b981" />
            <p style={{ fontSize: '11px', fontWeight: '700', textTransform: 'uppercase' }}>Hari Kerja Real-Time</p>
          </div>
          <p style={{ fontSize: '24px', fontWeight: '800', color: '#059669', marginTop: '6px' }}>
            {totalHariKerjaRealtime} <span style={{ fontSize: '13px', fontWeight: '500', color: '#64748b' }}>hari (s/d hari ini)</span>
          </p>
        </div>

        {/* Pamong Sangat Disiplin */}
        <div className="stat-card" style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderLeft: '4px solid #059669' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#64748b' }}>
            <IconCheckCircle size={16} color="#059669" />
            <p style={{ fontSize: '11px', fontWeight: '700', textTransform: 'uppercase' }}>Sangat Disiplin</p>
          </div>
          <p style={{ fontSize: '24px', fontWeight: '800', color: '#059669', marginTop: '6px' }}>
            {aggregatedPegawai.filter((p) => p.kedisiplinan.label === 'Sangat Disiplin').length}{' '}
            <span style={{ fontSize: '13px', fontWeight: '500', color: '#64748b' }}>pamong</span>
          </p>
        </div>
      </div>

      {/* Filter Tabs & Search Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px' }}>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={() => setActiveTab('all')}
            style={{
              padding: '8px 16px',
              borderRadius: '8px',
              border: activeTab === 'all' ? '1px solid #2563eb' : '1px solid #cbd5e1',
              background: activeTab === 'all' ? '#eff6ff' : '#ffffff',
              color: activeTab === 'all' ? '#1d4ed8' : '#475569',
              fontWeight: '700',
              fontSize: '13px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <span>Semua Pamong</span>
            <span style={{ background: activeTab === 'all' ? '#2563eb' : '#f1f5f9', color: activeTab === 'all' ? '#ffffff' : '#64748b', padding: '1px 7px', borderRadius: '10px', fontSize: '11px' }}>
              {aggregatedPegawai.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('pending_suket')}
            style={{
              padding: '8px 16px',
              borderRadius: '8px',
              border: activeTab === 'pending_suket' ? '1px solid #f59e0b' : '1px solid #cbd5e1',
              background: activeTab === 'pending_suket' ? '#fffbeb' : '#ffffff',
              color: activeTab === 'pending_suket' ? '#b45309' : '#475569',
              fontWeight: '700',
              fontSize: '13px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <span>⚠️ Suket Perlu Tindakan</span>
            <span style={{ background: '#f59e0b', color: '#ffffff', padding: '1px 7px', borderRadius: '10px', fontSize: '11px', fontWeight: '800' }}>
              {totalPendingSuket}
            </span>
          </button>
        </div>

        <div style={{ maxWidth: '340px', width: '100%' }}>
          <input
            type="text"
            className="input-field"
            placeholder="🔍 Cari nama atau username pamong..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ width: '100%', background: '#ffffff' }}
          />
        </div>
      </div>

      {/* Tabel Utama: Rekapitulasi Per Pegawai */}
      <div className="glass-card-static" style={{ padding: '4px', overflow: 'hidden' }}>
        <div className="table-container" style={{ borderRadius: '12px', border: '1px solid #eaedf2' }}>
          <table className="data-table" style={{ width: '100%', minWidth: '980px' }}>
            <thead>
              <tr>
                <th style={{ width: '40px', textAlign: 'center', padding: '14px 16px' }}>No</th>
                <th style={{ minWidth: '180px', padding: '14px 16px' }}>Nama Pamong</th>
                <th style={{ minWidth: '130px', padding: '14px 16px' }}>Username</th>
                <th style={{ minWidth: '200px', padding: '14px 16px' }}>Status & Suket</th>
                <th style={{ minWidth: '140px', textAlign: 'center', padding: '14px 16px' }}>Total Terlambat</th>
                <th style={{ minWidth: '140px', textAlign: 'center', padding: '14px 16px' }}>Total Mendahului</th>
                <th style={{ minWidth: '140px', textAlign: 'center', padding: '14px 16px' }}>Kedisiplinan</th>
                <th style={{ minWidth: '110px', textAlign: 'center', padding: '14px 16px' }}>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>
                    <div className="spinner" style={{ margin: '0 auto 10px auto' }} />
                    Memuat data rekap pamong...
                  </td>
                </tr>
              ) : filteredData.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>
                    {activeTab === 'pending_suket'
                      ? 'Tidak ada pengajuan suket yang menunggu tindakan saat ini.'
                      : 'Tidak ada data pamong yang cocok dengan pencarian.'}
                  </td>
                </tr>
              ) : (
                filteredData.map((item, idx) => (
                  <tr key={item.pegawai.id}>
                    <td style={{ textAlign: 'center', color: '#64748b', fontWeight: '600', padding: '14px 16px' }}>
                      {idx + 1}
                    </td>

                    {/* Nama Pamong & Jabatan */}
                    <td style={{ padding: '14px 16px' }}>
                      <div style={{ fontWeight: '700', color: '#0f172a', fontSize: '13.5px' }}>
                        {item.pegawai.nama}
                      </div>
                      <div style={{ fontSize: '11.5px', color: '#64748b', marginTop: '2px' }}>
                        {item.pegawai.jabatan || 'Pamong'}
                      </div>
                    </td>

                    {/* Username / NIP */}
                    <td style={{ padding: '14px 16px', fontFamily: 'monospace', color: '#334155', fontWeight: '600', fontSize: '12.5px' }}>
                      {item.pegawai.nip}
                    </td>

                    {/* Status & Suket */}
                    <td style={{ padding: '14px 16px' }}>
                      {item.pendingSukets.length > 0 ? (
                        <button
                          onClick={() => {
                            const first = item.pendingSukets[0];
                            setReviewModal({
                              isOpen: true,
                              presensi: first.presensi,
                              parsedSuket: first.suket,
                            });
                          }}
                          style={{
                            background: '#fffbeb',
                            border: '1px solid #fde68a',
                            borderRadius: '8px',
                            padding: '6px 12px',
                            color: '#b45309',
                            fontSize: '12px',
                            fontWeight: '700',
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            boxShadow: '0 1px 2px rgba(245, 158, 11, 0.1)',
                          }}
                          title="Klik untuk memeriksa & menyetujui suket"
                        >
                          <span>⚠️</span>
                          <span>{item.pendingSukets.length} Suket Perlu Review</span>
                        </button>
                      ) : item.approvedSukets.length > 0 ? (
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: '#059669', fontSize: '12px', fontWeight: '600' }}>
                          <span>✓</span>
                          <span>{item.approvedSukets.length} Suket Disetujui</span>
                        </div>
                      ) : item.totalHadir >= totalHariKerjaRealtime && totalHariKerjaRealtime > 0 ? (
                        <span style={{ color: '#059669', fontSize: '12px', fontWeight: '600' }}>
                          ✓ Kehadiran Lengkap ({item.totalHadir}/{totalHariKerjaRealtime})
                        </span>
                      ) : (
                        <span style={{ color: '#64748b', fontSize: '12px' }}>
                          Hadir {item.totalHadir} dari {totalHariKerjaRealtime} hari kerja
                        </span>
                      )}
                    </td>

                    {/* Total Terlambat (Realtime) */}
                    <td style={{ textAlign: 'center', padding: '14px 16px' }}>
                      {item.totalTerlambat > 0 ? (
                        <span style={{ fontWeight: '700', color: '#dc2626' }}>
                          {item.totalTerlambat} <span style={{ fontSize: '11px', fontWeight: '500' }}>menit</span>
                        </span>
                      ) : (
                        <span style={{ color: '#94a3b8' }}>-</span>
                      )}
                    </td>

                    {/* Total Mendahului (Realtime) */}
                    <td style={{ textAlign: 'center', padding: '14px 16px' }}>
                      {item.totalMendahului > 0 ? (
                        <span style={{ fontWeight: '700', color: '#7c3aed' }}>
                          {item.totalMendahului} <span style={{ fontSize: '11px', fontWeight: '500' }}>menit</span>
                        </span>
                      ) : (
                        <span style={{ color: '#94a3b8' }}>-</span>
                      )}
                    </td>

                    {/* Kedisiplinan Badge */}
                    <td style={{ textAlign: 'center', padding: '14px 16px' }}>
                      <span
                        style={{
                          display: 'inline-block',
                          padding: '4px 10px',
                          borderRadius: '8px',
                          fontSize: '11.5px',
                          fontWeight: '700',
                          color: item.kedisiplinan.color,
                          background: item.kedisiplinan.bg,
                          border: `1px solid ${item.kedisiplinan.border}`,
                        }}
                      >
                        {item.kedisiplinan.label}
                      </span>
                    </td>

                    {/* Tombol Detail Log */}
                    <td style={{ textAlign: 'center', padding: '14px 16px' }}>
                      <button
                        onClick={() => setDetailModal({ isOpen: true, pegawai: item.pegawai })}
                        style={{
                          padding: '6px 12px',
                          borderRadius: '8px',
                          border: '1px solid #cbd5e1',
                          background: '#ffffff',
                          color: '#1e293b',
                          fontSize: '12px',
                          fontWeight: '600',
                          cursor: 'pointer',
                          transition: 'all 0.15s ease',
                          boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
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
                        Detail Log
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div style={{ color: '#64748b', fontSize: '13px' }}>
        Total pamong terdaftar: <b>{pegawaiList.length}</b> orang
      </div>

      {/* =================== MODAL 1: REVIEW SUKET PAMONG =================== */}
      {reviewModal.isOpen && reviewModal.presensi && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.5)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 99999,
            padding: '16px',
            animation: 'fadeIn 0.2s ease',
          }}
          onClick={() => !reviewLoading && setReviewModal({ isOpen: false, presensi: null, parsedSuket: null })}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: '#ffffff',
              borderRadius: '16px',
              padding: '24px 28px',
              maxWidth: '520px',
              width: '100%',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
            }}
          >
            {/* Header Modal */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <IconFileText size={20} color="#f59e0b" />
                  <h3 style={{ fontSize: '18px', fontWeight: '800', color: '#0f172a' }}>
                    Tinjau Surat Keterangan (Suket)
                  </h3>
                </div>
                <p style={{ fontSize: '13px', color: '#64748b', marginTop: '4px' }}>
                  Pengajuan alasan presensi dari pamong
                </p>
              </div>
              <button
                onClick={() => !reviewLoading && setReviewModal({ isOpen: false, presensi: null, parsedSuket: null })}
                disabled={reviewLoading}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#64748b',
                  cursor: reviewLoading ? 'not-allowed' : 'pointer',
                  padding: '4px',
                }}
              >
                <IconClose size={18} color="#64748b" />
              </button>
            </div>

            {/* Informasi Detail Pengajuan */}
            <div
              style={{
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '12px',
                padding: '16px',
                display: 'flex',
                flexDirection: 'column',
                gap: '10px',
                fontSize: '13px',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#64748b' }}>Nama Pamong:</span>
                <span style={{ fontWeight: '700', color: '#0f172a' }}>{reviewModal.presensi.user?.nama}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#64748b' }}>Tanggal Presensi:</span>
                <span style={{ fontWeight: '600', color: '#0f172a' }}>{formatDate(reviewModal.presensi.tanggal)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#64748b' }}>Jenis Suket:</span>
                <span style={{ fontWeight: '700', color: '#2563eb' }}>
                  {reviewModal.parsedSuket?.jenisSuket || 'Surat Keterangan'}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#64748b' }}>Tipe Kehadiran:</span>
                <span style={{ fontWeight: '600', color: '#475569' }}>
                  {reviewModal.parsedSuket?.tipeSuket || 'presensi'}
                </span>
              </div>
              <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '8px' }}>
                <span style={{ color: '#64748b', display: 'block', marginBottom: '4px' }}>Alasan / Keterangan Pamong:</span>
                <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '10px', color: '#0f172a', lineHeight: '1.5' }}>
                  "{reviewModal.parsedSuket?.alasan || '-'}"
                </div>
              </div>
            </div>

            {/* Catatan Admin */}
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#334155', marginBottom: '6px' }}>
                Catatan Admin (Opsional):
              </label>
              <textarea
                value={catatanAdmin}
                onChange={(e) => setCatatanAdmin(e.target.value)}
                placeholder="Tuliskan catatan persetujuan / alasan penolakan..."
                rows={2}
                disabled={reviewLoading}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  fontSize: '13px',
                  color: '#0f172a',
                  outline: 'none',
                  fontFamily: 'inherit',
                }}
              />
            </div>

            {reviewMessage && (
              <div
                style={{
                  padding: '10px 14px',
                  borderRadius: '8px',
                  background: reviewMessage.type === 'success' ? '#ecfdf5' : '#fef2f2',
                  border: `1px solid ${reviewMessage.type === 'success' ? '#a7f3d0' : '#fecaca'}`,
                  color: reviewMessage.type === 'success' ? '#059669' : '#dc2626',
                  fontSize: '12.5px',
                  fontWeight: '600',
                }}
              >
                {reviewMessage.text}
              </div>
            )}

            {/* Tombol Aksi Persetujuan */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginTop: '6px' }}>
              <button
                type="button"
                onClick={() => handleReviewSuket('reject')}
                disabled={reviewLoading}
                style={{
                  padding: '10px',
                  borderRadius: '8px',
                  border: '1px solid #fecaca',
                  background: '#fef2f2',
                  color: '#dc2626',
                  fontSize: '13px',
                  fontWeight: '700',
                  cursor: reviewLoading ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                }}
              >
                <span>✕</span>
                <span>Tolak Suket</span>
              </button>

              <button
                type="button"
                onClick={() => handleReviewSuket('approve')}
                disabled={reviewLoading}
                style={{
                  padding: '10px',
                  borderRadius: '8px',
                  border: 'none',
                  background: '#16a34a',
                  color: '#ffffff',
                  fontSize: '13px',
                  fontWeight: '700',
                  cursor: reviewLoading ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  boxShadow: '0 2px 6px rgba(22, 163, 74, 0.3)',
                }}
              >
                {reviewLoading ? (
                  <div className="spinner" style={{ width: '14px', height: '14px' }} />
                ) : (
                  <span>✓</span>
                )}
                <span>Setujui Suket (Otomatis Standar)</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =================== MODAL 2: DETAIL LOG HARIAN PAMONG =================== */}
      {detailModal.isOpen && detailModal.pegawai && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.5)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 99999,
            padding: '16px',
            animation: 'fadeIn 0.2s ease',
          }}
          onClick={() => setDetailModal({ isOpen: false, pegawai: null })}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: '#ffffff',
              borderRadius: '16px',
              padding: '24px 28px',
              maxWidth: '900px',
              width: '100%',
              maxHeight: '90vh',
              overflowY: 'auto',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
            }}
          >
            {/* Header Detail Modal */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ fontSize: '18px', fontWeight: '800', color: '#0f172a' }}>
                  Log Presensi Harian: {detailModal.pegawai.nama}
                </h3>
                <p style={{ fontSize: '13px', color: '#64748b', marginTop: '2px' }}>
                  Bulan: {bulan}
                </p>
              </div>
              <button
                onClick={() => setDetailModal({ isOpen: false, pegawai: null })}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#64748b',
                  cursor: 'pointer',
                  padding: '4px',
                }}
              >
                <IconClose size={18} color="#64748b" />
              </button>
            </div>

            {/* Tabel Detail Harian */}
            <div className="table-container" style={{ borderRadius: '10px', border: '1px solid #eaedf2' }}>
              <table className="data-table" style={{ width: '100%', minWidth: '780px' }}>
                <thead>
                  <tr>
                    <th>Tanggal</th>
                    <th>Jam Masuk</th>
                    <th>Terlambat</th>
                    <th>Jam Pulang</th>
                    <th>Mendahului</th>
                    <th>Status / Keterangan</th>
                    <th>Suket</th>
                  </tr>
                </thead>
                <tbody>
                  {allDays.map((day) => {
                    const weekend = isWeekend(day);
                    const libur = getHariLibur(day);
                    const overrideMasuk = getOverrideMasuk(day);
                    const isOffDay = Boolean((weekend || libur) && !overrideMasuk);
                    const isFuture = day > todayEnd;

                    // Cari record presensi
                    const p = presensiList.find((item) => {
                      const pt = new Date(item.tanggal);
                      return (
                        (item.userId === detailModal.pegawai?.id || item.user?.nip === detailModal.pegawai?.nip) &&
                        pt.getDate() === day.getDate() &&
                        pt.getMonth() === day.getMonth() &&
                        pt.getFullYear() === day.getFullYear()
                      );
                    });

                    let suketStatus = '-';
                    if (p?.suket) {
                      try {
                        const parsed = JSON.parse(p.suket);
                        suketStatus = `${parsed.status || 'Diajukan'} (${parsed.jenisSuket || 'Suket'})`;
                      } catch {}
                    }

                    return (
                      <tr key={day.toISOString()} style={{ background: isFuture ? '#fafafa' : undefined }}>
                        <td style={{ fontWeight: '600', color: isFuture ? '#94a3b8' : '#0f172a' }}>
                          {formatDate(day)}
                        </td>
                        <td style={{ color: p?.jamMasuk ? '#059669' : '#94a3b8', fontWeight: '600' }}>
                          {isOffDay ? '-' : formatTime(p?.jamMasuk || null)}
                        </td>
                        <td style={{ color: p?.keterlambatan ? '#dc2626' : '#94a3b8' }}>
                          {isOffDay || isFuture ? '-' : (p?.keterlambatan ? `${p.keterlambatan} mnt` : '-')}
                        </td>
                        <td style={{ color: p?.jamPulang ? '#2563eb' : '#94a3b8', fontWeight: '600' }}>
                          {isOffDay ? '-' : formatTime(p?.jamPulang || null)}
                        </td>
                        <td style={{ color: p?.mendahului ? '#dc2626' : '#94a3b8' }}>
                          {isOffDay || isFuture ? '-' : (p?.mendahului ? `${p.mendahului} mnt` : '-')}
                        </td>
                        <td style={{ fontSize: '12.5px' }}>
                          {isOffDay ? (libur ? libur.keterangan : 'Libur') : isFuture ? '-' : (p?.keterangan || 'e-presensi')}
                        </td>
                        <td style={{ fontSize: '12px', color: suketStatus.includes('Disetujui') ? '#059669' : suketStatus.includes('Diajukan') ? '#b45309' : '#64748b' }}>
                          {suketStatus}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setDetailModal({ isOpen: false, pegawai: null })}
                style={{
                  padding: '9px 18px',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  background: '#ffffff',
                  color: '#475569',
                  fontWeight: '600',
                  fontSize: '13px',
                  cursor: 'pointer',
                }}
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
