'use client';

import { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import Link from 'next/link';
import {
  IconFileText,
  IconPrinter,
  IconDownload,
  IconChevronDown,
  IconUsers,
  IconCheckCircle,
  IconBarChart,
  IconClock,
} from '@/components/ui/Icons';
import {
  exportToExcel,
  exportToCsv,
  exportToWord,
  exportToPdfPrint,
  ExportColumn,
} from '@/lib/exportHelper';
import KopSurat from '@/components/cetak/KopSurat';
import PrintPreviewModal from '@/components/cetak/PrintPreviewModal';

interface RekapPegawaiItem {
  id: string;
  username: string;
  nip: string;
  nama: string;
  jabatan: string | null;
  unitKerja: string | null;
  totalOutput: number;
  totalTarget: number;
  totalCapaian: number;
  progresPersen: number;
  status: string;
}

export default function RekapLaporanPage() {
  const [rekapList, setRekapList] = useState<RekapPegawaiItem[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table');

  // Month state (YYYY-MM)
  const [bulan, setBulan] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });

  const [exportDropdownOpen, setExportDropdownOpen] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [printSettings, setPrintSettings] = useState<any>(null);
  const exportMenuRef = useRef<HTMLDivElement>(null);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (exportMenuRef.current && !exportMenuRef.current.contains(event.target as Node)) {
        setExportDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const [year, month] = useMemo(() => {
    const parts = bulan.split('-').map(Number);
    return [parts[0] || new Date().getFullYear(), parts[1] || new Date().getMonth() + 1];
  }, [bulan]);

  const monthNames = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
  ];
  const bulanLabel = `${monthNames[month - 1] || ''} ${year}`;

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [rekapRes, settingsRes] = await Promise.all([
        fetch(`/api/laporan/admin?bulan=${bulan}`),
        fetch('/api/settings'),
      ]);

      const rekapData = await rekapRes.json();
      const settingsData = await settingsRes.json();

      setRekapList(rekapData.rekap || []);
      if (settingsData.settings) setPrintSettings(settingsData.settings);
    } catch (err) {
      console.error('Fetch rekap laporan error:', err);
    } finally {
      setLoading(false);
    }
  }, [bulan]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Filter pencarian
  const filtered = useMemo(() => {
    return rekapList.filter(
      (p) =>
        p.nama.toLowerCase().includes(search.toLowerCase()) ||
        p.nip.toLowerCase().includes(search.toLowerCase()) ||
        (p.jabatan && p.jabatan.toLowerCase().includes(search.toLowerCase()))
    );
  }, [rekapList, search]);

  // Statistik Ringkasan
  const totalPegawai = rekapList.length;
  const sudahMengisi = rekapList.filter((p) => p.totalOutput > 0).length;
  const avgProgres =
    sudahMengisi > 0
      ? Math.round(
          rekapList.reduce((acc, curr) => acc + (curr.totalOutput > 0 ? curr.progresPersen : 0), 0) /
            sudahMengisi
        )
      : 0;
  const totalTargetSemua = rekapList.reduce((acc, curr) => acc + curr.totalTarget, 0);
  const totalCapaianSemua = rekapList.reduce((acc, curr) => acc + curr.totalCapaian, 0);

  // Setup Ekspor
  const exportColumns: ExportColumn[] = [
    { header: 'No', key: 'no', width: 6, align: 'center' },
    { header: 'Nama Pegawai', key: 'nama', width: 28, align: 'left' },
    { header: 'Username / NIP', key: 'nip', width: 20, align: 'left' },
    { header: 'Jabatan', key: 'jabatan', width: 24, align: 'left' },
    { header: 'Unit Kerja', key: 'unitKerja', width: 22, align: 'left' },
    { header: 'Jumlah Output', key: 'totalOutput', width: 15, align: 'center' },
    { header: 'Total Target', key: 'totalTarget', width: 14, align: 'center' },
    { header: 'Total Capaian', key: 'totalCapaian', width: 14, align: 'center' },
    { header: 'Progres (%)', key: 'progresPersen', width: 14, align: 'center' },
    { header: 'Status Capaian', key: 'status', width: 18, align: 'center' },
  ];

  const exportRows = useMemo(() => {
    return filtered.map((item, idx) => ({
      no: idx + 1,
      nama: item.nama,
      nip: item.nip,
      jabatan: item.jabatan || 'Pamong',
      unitKerja: item.unitKerja || 'Kalurahan Pengasih',
      totalOutput: `${item.totalOutput} Kegiatan`,
      totalTarget: item.totalTarget,
      totalCapaian: item.totalCapaian,
      progresPersen: `${item.progresPersen}%`,
      status: item.status,
    }));
  }, [filtered]);

  const getKopSettings = () => ({
    instansi: printSettings?.kopNamaPemda || printSettings?.kopInstansi || 'PEMERINTAH KABUPATEN KULON PROGO',
    kalurahan: printSettings?.kopNamaInstansi || printSettings?.kopKalurahan || 'KAPANEWON PENGASIH',
    alamat: printSettings?.kopAlamat || 'Jl. Pengasih No. 2, Pengasih, Kulon Progo, DIY 55652',
    ttdNama: printSettings?.ttdAtasanNama || 'DJOKO PURWANTO',
    ttdJabatan: printSettings?.ttdAtasanJabatan || 'Panewu Pengasih',
    ttdNip: !printSettings?.sembunyikanNipAtasan && printSettings?.ttdAtasanNip ? String(printSettings.ttdAtasanNip) : undefined,
  });

  const handleExportExcel = () => {
    setExportDropdownOpen(false);
    exportToExcel({
      filename: `Rekapitulasi_Laporan_Kinerja_${bulan}`,
      title: 'Rekapitulasi Laporan Kinerja & Capaian Target Pegawai',
      subtitle: `Periode: ${bulanLabel}`,
      columns: exportColumns,
      rows: exportRows,
    });
  };

  const handleExportCsv = () => {
    setExportDropdownOpen(false);
    exportToCsv({
      filename: `Rekapitulasi_Laporan_Kinerja_${bulan}`,
      title: 'Rekapitulasi Laporan Kinerja & Capaian Target Pegawai',
      subtitle: `Periode: ${bulanLabel}`,
      columns: exportColumns,
      rows: exportRows,
    });
  };

  const handleExportWord = () => {
    setExportDropdownOpen(false);
    exportToWord({
      filename: `Rekapitulasi_Laporan_Kinerja_${bulan}`,
      title: 'Rekapitulasi Laporan Kinerja & Capaian Target Pegawai',
      subtitle: `Periode: ${bulanLabel}`,
      columns: exportColumns,
      rows: exportRows,
      kopSettings: getKopSettings(),
    });
  };

  const handlePrint = () => {
    setExportDropdownOpen(false);
    exportToPdfPrint(`Rekapitulasi_Laporan_Kinerja_${bulan}`);
  };

  const getInitials = (nama: string) => {
    return nama
      .split(' ')
      .map((n) => n[0])
      .join('')
      .substring(0, 2)
      .toUpperCase();
  };

  const getProgressColor = (percent: number) => {
    if (percent >= 100) return '#059669'; // Emerald
    if (percent >= 75) return '#2563eb'; // Blue
    if (percent >= 50) return '#d97706'; // Amber
    if (percent > 0) return '#f59e0b'; // Yellow
    return '#94a3b8'; // Slate
  };

  return (
    <>
      {/* AREA TAMPILAN INTERAKTIF LAYAR (DISEMBUNYIKAN SAAT CETAK / NO-PRINT) */}
      <div className="no-print" style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>
      {/* Header Toolbar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h2 style={{ fontSize: '24px', fontWeight: '800', color: '#0f172a', marginBottom: '6px' }}>
            Rekapitulasi Laporan Kinerja
          </h2>
          <p style={{ color: '#64748b', fontSize: '13.5px' }}>
            Ringkasan capaian kinerja, target beban kerja, dan progres penyelesaian pamong
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          {/* Filter Bulan */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <label className="input-label" style={{ marginBottom: 0, color: '#334155', fontWeight: '700' }}>
              Periode:
            </label>
            <input
              type="month"
              className="input-field"
              value={bulan}
              onChange={(e) => setBulan(e.target.value)}
              style={{ width: '165px', background: '#ffffff', color: '#0f172a', fontWeight: '600' }}
            />
          </div>

          {/* Tombol Pratinjau Cetak (Live Preview Modal) */}
          <button
            type="button"
            onClick={() => setShowPreviewModal(true)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 14px',
              borderRadius: '8px',
              border: '1.5px solid #6366f1',
              background: '#eef2ff',
              color: '#4338ca',
              fontSize: '13px',
              fontWeight: '700',
              cursor: 'pointer',
              boxShadow: '0 1px 3px rgba(99,102,241,0.15)',
              transition: 'all 0.15s ease',
            }}
            title="Lihat Pratinjau Lembar Cetak Ber-KOP Resmi"
          >
            <span>📄 Pratinjau Cetak</span>
          </button>

          {/* Tombol Cetak Dokumen */}
          <button
            type="button"
            onClick={handlePrint}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 14px',
              borderRadius: '8px',
              border: '1.5px solid #2563eb',
              background: '#2563eb',
              color: '#ffffff',
              fontSize: '13px',
              fontWeight: '700',
              cursor: 'pointer',
              boxShadow: '0 2px 4px rgba(37,99,235,0.2)',
              transition: 'all 0.15s ease',
            }}
          >
            <IconPrinter size={16} />
            <span>Cetak</span>
          </button>

          {/* Tombol Ekspor dengan Dropdown Format */}
          <div style={{ position: 'relative' }} ref={exportMenuRef}>
            <button
              type="button"
              onClick={() => setExportDropdownOpen((prev) => !prev)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 14px',
                borderRadius: '8px',
                border: '1.5px solid #059669',
                background: '#059669',
                color: '#ffffff',
                fontSize: '13px',
                fontWeight: '700',
                cursor: 'pointer',
                boxShadow: '0 2px 4px rgba(5,150,105,0.2)',
                transition: 'all 0.15s ease',
              }}
            >
              <IconDownload size={16} />
              <span>Ekspor</span>
              <IconChevronDown size={14} />
            </button>

            {exportDropdownOpen && (
              <div
                style={{
                  position: 'absolute',
                  top: 'calc(100% + 6px)',
                  right: 0,
                  width: '210px',
                  background: '#ffffff',
                  borderRadius: '10px',
                  boxShadow: '0 10px 25px -5px rgba(0,0,0,0.15), 0 8px 10px -6px rgba(0,0,0,0.1)',
                  border: '1px solid #e2e8f0',
                  padding: '6px',
                  zIndex: 50,
                  animation: 'fadeIn 0.15s ease',
                }}
              >
                <div style={{ padding: '6px 10px', fontSize: '11px', fontWeight: '800', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Pilih Format Unduhan
                </div>
                <button
                  type="button"
                  onClick={handleExportExcel}
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '8px 10px',
                    borderRadius: '6px',
                    border: 'none',
                    background: 'transparent',
                    color: '#0f172a',
                    fontSize: '13px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    textAlign: 'left',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = '#f1f5f9')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                >
                  <span style={{ fontSize: '16px' }}>📊</span>
                  <div>
                    <div>Excel (.xlsx)</div>
                    <div style={{ fontSize: '10.5px', color: '#64748b', fontWeight: '400' }}>Lembar Kerja Spreadsheet</div>
                  </div>
                </button>
                <button
                  type="button"
                  onClick={handleExportCsv}
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '8px 10px',
                    borderRadius: '6px',
                    border: 'none',
                    background: 'transparent',
                    color: '#0f172a',
                    fontSize: '13px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    textAlign: 'left',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = '#f1f5f9')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                >
                  <span style={{ fontSize: '16px' }}>📑</span>
                  <div>
                    <div>CSV (.csv)</div>
                    <div style={{ fontSize: '10.5px', color: '#64748b', fontWeight: '400' }}>Format Standar Teks</div>
                  </div>
                </button>
                <button
                  type="button"
                  onClick={handleExportWord}
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '8px 10px',
                    borderRadius: '6px',
                    border: 'none',
                    background: 'transparent',
                    color: '#0f172a',
                    fontSize: '13px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    textAlign: 'left',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = '#f1f5f9')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                >
                  <span style={{ fontSize: '16px' }}>📝</span>
                  <div>
                    <div>Word (.doc)</div>
                    <div style={{ fontSize: '10.5px', color: '#64748b', fontWeight: '400' }}>Dokumen Resmi Ber-KOP</div>
                  </div>
                </button>
                <button
                  type="button"
                  onClick={handlePrint}
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '8px 10px',
                    borderRadius: '6px',
                    border: 'none',
                    background: 'transparent',
                    color: '#0f172a',
                    fontSize: '13px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    textAlign: 'left',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = '#f1f5f9')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                >
                  <span style={{ fontSize: '16px' }}>📄</span>
                  <div>
                    <div>PDF / Cetak</div>
                    <div style={{ fontSize: '10.5px', color: '#64748b', fontWeight: '400' }}>Simpan PDF / Print out</div>
                  </div>
                </button>
              </div>
            )}
          </div>
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
            {totalPegawai} <span style={{ fontSize: '13px', fontWeight: '500', color: '#64748b' }}>orang</span>
          </p>
        </div>

        {/* Sudah Mengisi */}
        <div className="stat-card" style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderLeft: '4px solid #059669' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#64748b' }}>
            <IconCheckCircle size={16} color="#059669" />
            <p style={{ fontSize: '11px', fontWeight: '700', textTransform: 'uppercase' }}>Sudah Mengisi</p>
          </div>
          <p style={{ fontSize: '24px', fontWeight: '800', color: '#059669', marginTop: '6px' }}>
            {sudahMengisi}{' '}
            <span style={{ fontSize: '13px', fontWeight: '500', color: '#64748b' }}>
              / {totalPegawai} orang
            </span>
          </p>
        </div>

        {/* Rata-rata Progres */}
        <div className="stat-card" style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderLeft: '4px solid #7c3aed' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#64748b' }}>
            <IconBarChart size={16} color="#7c3aed" />
            <p style={{ fontSize: '11px', fontWeight: '700', textTransform: 'uppercase' }}>Rata-Rata Progres</p>
          </div>
          <p style={{ fontSize: '24px', fontWeight: '800', color: '#7c3aed', marginTop: '6px' }}>
            {avgProgres}%
          </p>
          <div style={{ width: '100%', height: '5px', background: '#e2e8f0', borderRadius: '3px', marginTop: '4px', overflow: 'hidden' }}>
            <div style={{ width: `${avgProgres}%`, height: '100%', background: '#7c3aed', borderRadius: '3px' }} />
          </div>
        </div>

        {/* Total Target vs Realisasi */}
        <div className="stat-card" style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderLeft: '4px solid #d97706' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#64748b' }}>
            <IconClock size={16} color="#d97706" />
            <p style={{ fontSize: '11px', fontWeight: '700', textTransform: 'uppercase' }}>Akumulasi Kinerja</p>
          </div>
          <p style={{ fontSize: '24px', fontWeight: '800', color: '#d97706', marginTop: '6px' }}>
            {totalCapaianSemua}{' '}
            <span style={{ fontSize: '13px', fontWeight: '500', color: '#64748b' }}>
              / {totalTargetSemua} realisasi
            </span>
          </p>
        </div>
      </div>

      {/* Toolbar Pencarian & Toggle Tampilan */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px' }}>
        <div style={{ maxWidth: '380px', width: '100%' }}>
          <input
            type="text"
            className="input-field"
            placeholder="🔍 Cari nama, username, atau jabatan..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ width: '100%', background: '#ffffff' }}
          />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '12px', color: '#64748b', fontWeight: '600' }}>Tampilan:</span>
          <div style={{ display: 'inline-flex', background: '#f1f5f9', padding: '3px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
            <button
              type="button"
              onClick={() => setViewMode('table')}
              style={{
                padding: '6px 12px',
                borderRadius: '6px',
                border: 'none',
                background: viewMode === 'table' ? '#ffffff' : 'transparent',
                color: viewMode === 'table' ? '#0f172a' : '#64748b',
                fontWeight: '700',
                fontSize: '12px',
                cursor: 'pointer',
                boxShadow: viewMode === 'table' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
              }}
            >
              📋 Tabel
            </button>
            <button
              type="button"
              onClick={() => setViewMode('cards')}
              style={{
                padding: '6px 12px',
                borderRadius: '6px',
                border: 'none',
                background: viewMode === 'cards' ? '#ffffff' : 'transparent',
                color: viewMode === 'cards' ? '#0f172a' : '#64748b',
                fontWeight: '700',
                fontSize: '12px',
                cursor: 'pointer',
                boxShadow: viewMode === 'cards' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
              }}
            >
              🪪 Kartu
            </button>
          </div>
        </div>
      </div>

      {/* Konten Utama */}
      {loading ? (
        <div className="glass-card-static" style={{ padding: '48px 20px', textAlign: 'center' }}>
          <div className="spinner" style={{ margin: '0 auto 12px auto' }} />
          <p style={{ color: '#64748b', fontSize: '14px' }}>Memuat rekapitulasi laporan kinerja...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="glass-card-static" style={{ padding: '48px 20px', textAlign: 'center' }}>
          <p style={{ fontSize: '40px', marginBottom: '12px' }}>👥</p>
          <p style={{ color: '#64748b', fontSize: '14px' }}>
            {search ? 'Tidak ditemukan pegawai yang cocok dengan kata kunci' : 'Belum ada data laporan kinerja pada periode ini'}
          </p>
        </div>
      ) : viewMode === 'table' ? (
        /* FORMAT TABEL LENGKAP & MUDAH DIBACA */
        <div className="glass-card-static" style={{ padding: '4px', overflow: 'hidden' }}>
          <div className="table-container" style={{ borderRadius: '12px', border: '1px solid #eaedf2' }}>
            <table className="data-table" style={{ width: '100%', minWidth: '980px' }}>
              <thead>
                <tr>
                  <th style={{ width: '40px', textAlign: 'center', padding: '14px 14px' }}>No</th>
                  <th style={{ minWidth: '190px', padding: '14px 16px' }}>Nama Pamong</th>
                  <th style={{ minWidth: '120px', padding: '14px 14px' }}>Username</th>
                  <th style={{ minWidth: '160px', padding: '14px 16px' }}>Jabatan</th>
                  <th style={{ width: '100px', textAlign: 'center', padding: '14px 12px' }}>Jml Kegiatan</th>
                  <th style={{ width: '100px', textAlign: 'center', padding: '14px 12px' }}>Total Target</th>
                  <th style={{ width: '100px', textAlign: 'center', padding: '14px 12px' }}>Total Capaian</th>
                  <th style={{ minWidth: '160px', textAlign: 'center', padding: '14px 16px' }}>Total Progres (%)</th>
                  <th style={{ minWidth: '120px', textAlign: 'center', padding: '14px 14px' }}>Status</th>
                  <th style={{ width: '100px', textAlign: 'center', padding: '14px 14px' }}>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((item, idx) => {
                  const barColor = getProgressColor(item.progresPersen);
                  return (
                    <tr key={item.id}>
                      <td style={{ textAlign: 'center', color: '#64748b', fontWeight: '600', padding: '14px 14px' }}>
                        {idx + 1}
                      </td>

                      {/* Nama Pamong */}
                      <td style={{ padding: '14px 16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <div
                            style={{
                              width: '32px',
                              height: '32px',
                              borderRadius: '8px',
                              background: '#eff6ff',
                              color: '#2563eb',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontWeight: '800',
                              fontSize: '12px',
                              flexShrink: 0,
                            }}
                          >
                            {getInitials(item.nama)}
                          </div>
                          <div>
                            <div style={{ fontWeight: '700', color: '#0f172a', fontSize: '13.5px' }}>
                              {item.nama}
                            </div>
                            <div style={{ fontSize: '11.5px', color: '#64748b', marginTop: '1px' }}>
                              {item.unitKerja || 'Kalurahan Pengasih'}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Username */}
                      <td style={{ padding: '14px 14px', fontFamily: 'monospace', color: '#334155', fontWeight: '600', fontSize: '12.5px' }}>
                        {item.nip}
                      </td>

                      {/* Jabatan */}
                      <td style={{ padding: '14px 16px', color: '#475569', fontSize: '13px' }}>
                        {item.jabatan || 'Pamong Kalurahan'}
                      </td>

                      {/* Jumlah Output */}
                      <td style={{ textAlign: 'center', padding: '14px 12px' }}>
                        <span style={{ fontWeight: '700', color: '#0f172a', fontSize: '13px' }}>
                          {item.totalOutput}
                        </span>
                        <span style={{ fontSize: '11px', color: '#64748b', marginLeft: '3px' }}>item</span>
                      </td>

                      {/* Total Target */}
                      <td style={{ textAlign: 'center', padding: '14px 12px', fontWeight: '700', color: '#0f172a', fontSize: '13.5px' }}>
                        {item.totalTarget}
                      </td>

                      {/* Total Capaian */}
                      <td style={{ textAlign: 'center', padding: '14px 12px', fontWeight: '700', color: '#059669', fontSize: '13.5px' }}>
                        {item.totalCapaian}
                      </td>

                      {/* Total Progres (%) */}
                      <td style={{ padding: '14px 16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                          <span style={{ fontSize: '12px', fontWeight: '800', color: barColor }}>
                            {item.progresPersen}%
                          </span>
                          <span style={{ fontSize: '11px', color: '#64748b' }}>
                            {item.totalCapaian} / {item.totalTarget}
                          </span>
                        </div>
                        <div style={{ width: '100%', height: '7px', background: '#e2e8f0', borderRadius: '4px', overflow: 'hidden' }}>
                          <div
                            style={{
                              width: `${Math.min(100, item.progresPersen)}%`,
                              height: '100%',
                              background: barColor,
                              borderRadius: '4px',
                              transition: 'width 0.3s ease',
                            }}
                          />
                        </div>
                      </td>

                      {/* Status */}
                      <td style={{ textAlign: 'center', padding: '14px 14px' }}>
                        <span
                          style={{
                            display: 'inline-block',
                            padding: '4px 9px',
                            borderRadius: '20px',
                            fontSize: '11px',
                            fontWeight: '700',
                            background:
                              item.progresPersen >= 100
                                ? '#ecfdf5'
                                : item.progresPersen > 0
                                ? '#eff6ff'
                                : '#f8fafc',
                            color:
                              item.progresPersen >= 100
                                ? '#059669'
                                : item.progresPersen > 0
                                ? '#2563eb'
                                : '#64748b',
                            border: `1px solid ${
                              item.progresPersen >= 100
                                ? '#a7f3d0'
                                : item.progresPersen > 0
                                ? '#bfdbfe'
                                : '#e2e8f0'
                            }`,
                          }}
                        >
                          {item.status}
                        </span>
                      </td>

                      {/* Aksi */}
                      <td style={{ textAlign: 'center', padding: '14px 14px' }}>
                        <Link
                          href={`/admin/rekap-laporan/${item.id}`}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            padding: '6px 12px',
                            borderRadius: '7px',
                            background: '#eff6ff',
                            color: '#1d4ed8',
                            border: '1px solid #bfdbfe',
                            fontSize: '12px',
                            fontWeight: '700',
                            textDecoration: 'none',
                            transition: 'all 0.15s ease',
                          }}
                        >
                          <span>Detail</span>
                          <span style={{ fontSize: '13px' }}>→</span>
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* FORMAT KARTU / GRID */
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
            gap: '14px',
          }}
        >
          {filtered.map((p, i) => (
            <Link
              key={p.id}
              href={`/admin/rekap-laporan/${p.id}`}
              className="employee-card animate-slide-up"
              style={{ animationDelay: `${i * 0.02}s` }}
            >
              <div className="avatar">{getInitials(p.nama)}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <h3
                  style={{
                    fontSize: '15px',
                    fontWeight: '700',
                    color: '#0f172a',
                    marginBottom: '3px',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  {p.nama}
                </h3>
                <p
                  style={{
                    fontSize: '12px',
                    color: '#64748b',
                    fontFamily: 'monospace',
                    marginBottom: '6px',
                  }}
                >
                  Username: {p.nip}
                </p>

                {/* Progres Mini Bar di Kartu */}
                <div style={{ marginBottom: '8px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', marginBottom: '3px' }}>
                    <span style={{ fontWeight: '700', color: getProgressColor(p.progresPersen) }}>
                      Progres: {p.progresPersen}%
                    </span>
                    <span style={{ color: '#64748b' }}>
                      Target: {p.totalCapaian}/{p.totalTarget}
                    </span>
                  </div>
                  <div style={{ width: '100%', height: '5px', background: '#e2e8f0', borderRadius: '3px', overflow: 'hidden' }}>
                    <div
                      style={{
                        width: `${Math.min(100, p.progresPersen)}%`,
                        height: '100%',
                        background: getProgressColor(p.progresPersen),
                        borderRadius: '3px',
                      }}
                    />
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                  {p.jabatan && (
                    <span className="badge badge-info" style={{ fontSize: '10px' }}>
                      {p.jabatan}
                    </span>
                  )}
                  <span
                    className="badge"
                    style={{
                      fontSize: '10px',
                      background: p.totalOutput > 0 ? '#ecfdf5' : '#f1f5f9',
                      color: p.totalOutput > 0 ? '#059669' : '#64748b',
                    }}
                  >
                    {p.totalOutput} Output
                  </span>
                </div>
              </div>
              <span style={{ fontSize: '20px', color: '#94a3b8', flexShrink: 0 }}>
                →
              </span>
            </Link>
          ))}
        </div>
      )}
      </div>

      {/* ========================================================
          AREA KHUSUS CETAK DOKUMEN (PRINT-ONLY)
          ======================================================== */}
      <div className="print-only print-document" style={{ color: '#000000', fontFamily: "'Times New Roman', Times, serif" }}>
        {/* KOP Surat Resmi Standar Format Laporan */}
        <KopSurat settings={printSettings} mode="print" />

        {/* Judul Dokumen */}
        <div style={{ textAlign: 'center', marginBottom: '14px' }}>
          <div style={{ fontSize: '13pt', fontWeight: 'bold', textTransform: 'uppercase' }}>
            REKAPITULASI LAPORAN KINERJA DAN CAPAIAN TARGET PAMONG
          </div>
          <div style={{ fontSize: '11pt', marginTop: '2px' }}>
            Periode: <strong>{bulanLabel}</strong>
          </div>
        </div>

        {/* Tabel Data Cetak */}
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '9.5pt', marginBottom: '20px' }}>
          <thead>
            <tr style={{ background: '#f1f5f9' }}>
              <th style={{ border: '1px solid #000', padding: '6px 4px', textAlign: 'center', width: '32px' }}>No</th>
              <th style={{ border: '1px solid #000', padding: '6px 8px', textAlign: 'left' }}>Nama Pamong</th>
              <th style={{ border: '1px solid #000', padding: '6px 6px', textAlign: 'left' }}>Username/NIP</th>
              <th style={{ border: '1px solid #000', padding: '6px 8px', textAlign: 'left' }}>Jabatan</th>
              <th style={{ border: '1px solid #000', padding: '6px 4px', textAlign: 'center', width: '60px' }}>Jml Output</th>
              <th style={{ border: '1px solid #000', padding: '6px 4px', textAlign: 'center', width: '60px' }}>Target</th>
              <th style={{ border: '1px solid #000', padding: '6px 4px', textAlign: 'center', width: '60px' }}>Capaian</th>
              <th style={{ border: '1px solid #000', padding: '6px 4px', textAlign: 'center', width: '70px' }}>Progres (%)</th>
              <th style={{ border: '1px solid #000', padding: '6px 6px', textAlign: 'center', width: '90px' }}>Status</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((item, idx) => (
              <tr key={item.id}>
                <td style={{ border: '1px solid #000', padding: '5px 4px', textAlign: 'center' }}>{idx + 1}</td>
                <td style={{ border: '1px solid #000', padding: '5px 8px', fontWeight: 'bold' }}>{item.nama}</td>
                <td style={{ border: '1px solid #000', padding: '5px 6px', fontFamily: 'monospace' }}>{item.nip}</td>
                <td style={{ border: '1px solid #000', padding: '5px 8px' }}>{item.jabatan || 'Pamong'}</td>
                <td style={{ border: '1px solid #000', padding: '5px 4px', textAlign: 'center' }}>{item.totalOutput} item</td>
                <td style={{ border: '1px solid #000', padding: '5px 4px', textAlign: 'center' }}>{item.totalTarget}</td>
                <td style={{ border: '1px solid #000', padding: '5px 4px', textAlign: 'center', fontWeight: 'bold' }}>{item.totalCapaian}</td>
                <td style={{ border: '1px solid #000', padding: '5px 4px', textAlign: 'center', fontWeight: 'bold' }}>{item.progresPersen}%</td>
                <td style={{ border: '1px solid #000', padding: '5px 6px', textAlign: 'center' }}>{item.status}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Tanda Tangan Atasan */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '30px' }}>
          <div style={{ textAlign: 'center', minWidth: '220px' }}>
            <p style={{ margin: '0 0 2px 0', fontSize: '10pt' }}>
              {printSettings?.ttdTempat || 'Pengasih'}, {new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
            </p>
            <p style={{ margin: '0 0 2px 0', fontSize: '10pt' }}>
              {printSettings?.ttdAtasanStatus || 'Mengetahui,'}
            </p>
            <p style={{ margin: '0 0 54px 0', fontWeight: 'bold', fontSize: '10.5pt' }}>
              {printSettings?.ttdAtasanJabatan || 'Panewu Pengasih'}
            </p>
            <p style={{ margin: 0, fontWeight: 'bold', textDecoration: 'underline', fontSize: '10.5pt' }}>
              {printSettings?.ttdAtasanNama || 'Drs. H. Sukirno, M.Si'}
            </p>
            {!printSettings?.sembunyikanNipAtasan && printSettings?.ttdAtasanNip ? (
              <p style={{ margin: '2px 0 0 0', fontSize: '9.5pt' }}>
                NIP. {String(printSettings.ttdAtasanNip)}
              </p>
            ) : null}
          </div>
        </div>
      </div>

      {/* MODAL PRATINJAU CETAK (LIVE PREVIEW SESUAI TEMPLATE SUPERADMIN) */}
      <PrintPreviewModal
        isOpen={showPreviewModal}
        onClose={() => setShowPreviewModal(false)}
        onPrint={handlePrint}
        title="REKAPITULASI LAPORAN KINERJA DAN CAPAIAN TARGET PAMONG"
        subtitle={`Periode: ${bulanLabel}`}
        settings={printSettings}
        customTtd={
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '28px', fontSize: '10pt', pageBreakInside: 'avoid' }}>
            <div style={{ textAlign: 'center', minWidth: '220px' }}>
              <p style={{ margin: 0 }}>
                {printSettings?.ttdTempat || 'Pengasih'}, {new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
              </p>
              <p style={{ margin: '2px 0 0', fontSize: '10pt' }}>
                {printSettings?.ttdAtasanStatus || 'Mengetahui,'}
              </p>
              <p style={{ margin: '2px 0 0', fontWeight: 'bold' }}>
                {printSettings?.ttdAtasanJabatan || 'Panewu Pengasih'}
              </p>
              <div style={{ height: '50px' }} />
              <p style={{ margin: 0, fontWeight: 'bold', textDecoration: 'underline' }}>
                {printSettings?.ttdAtasanNama || 'Drs. H. Sukirno, M.Si'}
              </p>
              {!printSettings?.sembunyikanNipAtasan && printSettings?.ttdAtasanNip ? (
                <p style={{ margin: '2px 0 0', fontSize: '9pt' }}>
                  NIP. {String(printSettings.ttdAtasanNip)}
                </p>
              ) : null}
            </div>
          </div>
        }
      >
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '9pt', marginBottom: '14px' }}>
          <thead>
            <tr style={{ background: '#f1f5f9' }}>
              <th style={{ border: '1px solid #000', padding: '5px 4px', textAlign: 'center', width: '28px' }}>No</th>
              <th style={{ border: '1px solid #000', padding: '5px 6px', textAlign: 'left' }}>Nama Pamong</th>
              <th style={{ border: '1px solid #000', padding: '5px 6px', textAlign: 'left' }}>Username/NIP</th>
              <th style={{ border: '1px solid #000', padding: '5px 6px', textAlign: 'left' }}>Jabatan</th>
              <th style={{ border: '1px solid #000', padding: '5px 4px', textAlign: 'center' }}>Output</th>
              <th style={{ border: '1px solid #000', padding: '5px 4px', textAlign: 'center' }}>Target</th>
              <th style={{ border: '1px solid #000', padding: '5px 4px', textAlign: 'center' }}>Capaian</th>
              <th style={{ border: '1px solid #000', padding: '5px 4px', textAlign: 'center' }}>Progres</th>
              <th style={{ border: '1px solid #000', padding: '5px 4px', textAlign: 'center' }}>Status</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((item, idx) => (
              <tr key={item.id}>
                <td style={{ border: '1px solid #000', padding: '4px 3px', textAlign: 'center' }}>{idx + 1}</td>
                <td style={{ border: '1px solid #000', padding: '4px 6px', fontWeight: 'bold' }}>{item.nama}</td>
                <td style={{ border: '1px solid #000', padding: '4px 6px', fontFamily: 'monospace' }}>{item.nip}</td>
                <td style={{ border: '1px solid #000', padding: '4px 6px' }}>{item.jabatan || 'Pamong'}</td>
                <td style={{ border: '1px solid #000', padding: '4px 3px', textAlign: 'center' }}>{item.totalOutput}</td>
                <td style={{ border: '1px solid #000', padding: '4px 3px', textAlign: 'center' }}>{item.totalTarget}</td>
                <td style={{ border: '1px solid #000', padding: '4px 3px', textAlign: 'center', fontWeight: 'bold' }}>{item.totalCapaian}</td>
                <td style={{ border: '1px solid #000', padding: '4px 3px', textAlign: 'center', fontWeight: 'bold' }}>{item.progresPersen}%</td>
                <td style={{ border: '1px solid #000', padding: '4px 3px', textAlign: 'center' }}>{item.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </PrintPreviewModal>
    </>
  );
}
