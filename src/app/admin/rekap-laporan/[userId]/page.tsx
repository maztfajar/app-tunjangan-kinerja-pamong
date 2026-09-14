'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';

interface LaporanItem {
  id: string;
  bulan: string;
  rencana: string;
  output: string;
  target: string | number;
  capaian: string | number;
  satuan: string;
  keterangan: string | null;
  pedomanPengisian?: string | null;
}

interface PegawaiInfo {
  id: string;
  nip: string;
  nama: string;
  jabatan: string | null;
  unitKerja: string | null;
}

export default function DetailLaporanPegawaiPage() {
  const params = useParams();
  const router = useRouter();
  const userId = params.userId as string;

  const [pegawai, setPegawai] = useState<PegawaiInfo | null>(null);
  const [laporan, setLaporan] = useState<LaporanItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [adminUser, setAdminUser] = useState<{ nama: string; nip: string; jabatan?: string | null } | null>(null);
  const [penandatanganKiri, setPenandatanganKiri] = useState<'PEGAWAI' | 'ADMIN'>('PEGAWAI');
  const [printSettings, setPrintSettings] = useState<any>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [resLaporan, resAuth, resSettings] = await Promise.all([
        fetch(`/api/laporan/admin?userId=${userId}`),
        fetch('/api/auth/me'),
        fetch('/api/settings'),
      ]);

      if (!resLaporan.ok) {
        router.push('/admin/rekap-laporan');
        return;
      }

      const dataLaporan = await resLaporan.json();
      setPegawai(dataLaporan.user || null);
      setLaporan(dataLaporan.laporan || []);

      const dataAuth = await resAuth.json();
      if (dataAuth.user) setAdminUser(dataAuth.user);

      const dataSettings = await resSettings.json();
      if (dataSettings.settings) setPrintSettings(dataSettings.settings);
    } catch (err) {
      console.error('Fetch detail error:', err);
    }
    setLoading(false);
  }, [userId, router]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const parseNumber = (value: string | number) => {
    const n = typeof value === 'number' ? value : parseFloat(String(value).replace(',', '.'));
    return Number.isFinite(n) ? n : NaN;
  };

  const getCapaianPersen = (target: string | number, capaian: string | number) => {
    const t = parseNumber(target);
    const c = parseNumber(capaian);
    if (!t || Number.isNaN(t) || Number.isNaN(c)) return 0;
    return Math.round((c / t) * 100);
  };

  const formatBulan = (bulan: string) => {
    if (!bulan) return '-';
    const [year, month] = bulan.split('-');
    const months = [
      'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
      'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
    ];
    return `${months[parseInt(month) - 1]} ${year}`;
  };

  const handlePrint = () => {
    // Inject dynamic @page size and orientation based on settings
    const paperSize = printSettings?.ukuranKertas === 'F4' ? 'F4' : 'A4';
    const isLandscape = printSettings?.posisiDokumen === 'landscape';
    const baseSize = paperSize === 'F4' ? '215mm 330mm' : 'A4';
    const orientation = isLandscape ? 'landscape' : 'portrait';
    const pageSize = `${baseSize} ${orientation}`;
    const margin = isLandscape ? '10mm 15mm' : '12mm 15mm';

    if (isLandscape) {
      document.body.classList.add('print-landscape');
    }

    const styleEl = document.createElement('style');
    styleEl.id = 'dynamic-print-page-size';
    styleEl.textContent = `@media print { 
      @page { size: ${pageSize}; margin: 0 !important; } 
      *, *::before, *::after { box-shadow: none !important; text-shadow: none !important; filter: none !important; }
      html, body, .app-container, .app-main, .app-content { background: #ffffff !important; background-color: #ffffff !important; box-shadow: none !important; }
      body { padding: ${margin} !important; margin: 0 !important; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
      .print-document, .print-table { background: #ffffff !important; background-color: #ffffff !important; box-shadow: none !important; }
      .print-document .print-table th { background: #ffffff !important; background-color: #ffffff !important; }
      ${isLandscape ? 'body, .print-document, .print-table { width: 100% !important; max-width: 100% !important; }' : ''}
    }`;
    document.head.appendChild(styleEl);

    const originalTitle = document.title;
    document.title = '';

    window.print();

    // Cleanup setelah cetak
    const cleanup = () => {
      document.title = originalTitle;
      document.body.classList.remove('print-landscape');
      const el = document.getElementById('dynamic-print-page-size');
      if (el) el.remove();
      window.removeEventListener('afterprint', cleanup);
    };

    window.addEventListener('afterprint', cleanup);
    setTimeout(cleanup, 1500);
  };

  const rataCapaian =
    laporan.length > 0
      ? Math.round(
          laporan.reduce(
            (sum, l) => sum + getCapaianPersen(l.target, l.capaian),
            0
          ) / laporan.length
        )
      : 0;

  const today = new Date().toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  if (loading) {
    return (
      <div
        className="glass-card-static"
        style={{ padding: '48px 20px', textAlign: 'center' }}
      >
        <div className="spinner" style={{ margin: '0 auto 12px auto' }} />
        <p style={{ color: '#64748b', fontSize: '14px' }}>
          Memuat data laporan kinerja...
        </p>
      </div>
    );
  }

  return (
    <>
      {/* ======= SCREEN VIEW (hidden when printing) ======= */}
      <div className="no-print" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {/* Back + Title */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            flexWrap: 'wrap',
            gap: '14px',
          }}
        >
          <div>
            <Link
              href="/admin/rekap-laporan"
              style={{
                fontSize: '13px',
                color: '#2563eb',
                textDecoration: 'none',
                fontWeight: '600',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                marginBottom: '10px',
              }}
            >
              ← Kembali ke Daftar Pegawai
            </Link>
            <h2
              style={{
                fontSize: '22px',
                fontWeight: '800',
                color: '#0f172a',
                marginBottom: '4px',
              }}
            >
              Laporan Kinerja — {pegawai?.nama || '-'}
            </h2>
            <p style={{ color: '#64748b', fontSize: '13px' }}>
              {pegawai?.jabatan || 'Pamong Kalurahan'} ·{' '}
              {pegawai?.unitKerja || 'Pemerintah Kalurahan'}
            </p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                background: '#f8fafc',
                padding: '6px 12px',
                borderRadius: '10px',
                border: '1px solid #e2e8f0',
              }}
            >
              <label style={{ fontSize: '12px', color: '#475569', fontWeight: '600' }}>
                Ttd Pembuat:
              </label>
              <select
                className="input-field"
                style={{ padding: '6px 10px', fontSize: '12px', width: 'auto', background: '#ffffff', color: '#0f172a' }}
                value={penandatanganKiri}
                onChange={(e) => setPenandatanganKiri(e.target.value as 'PEGAWAI' | 'ADMIN')}
              >
                <option value="PEGAWAI">👤 Pegawai Terkait ({pegawai?.nama || 'Pegawai'})</option>
                <option value="ADMIN">🛡️ Admin Pencetak ({adminUser?.nama || 'Admin'})</option>
              </select>
            </div>
            <button
              onClick={handlePrint}
              className="btn-primary"
              style={{ padding: '10px 20px', fontSize: '13px' }}
            >
              🖨️ Cetak Laporan
            </button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="responsive-grid-3">
          <div
            className="stat-card"
            style={{
              background: '#ffffff',
              border: '1px solid #e2e8f0',
              borderLeft: '4px solid #2563eb',
            }}
          >
            <p
              style={{
                fontSize: '11px',
                color: '#64748b',
                fontWeight: '700',
                textTransform: 'uppercase',
              }}
            >
              Total Laporan
            </p>
            <p
              style={{
                fontSize: '26px',
                fontWeight: '800',
                color: '#2563eb',
                marginTop: '4px',
              }}
            >
              {laporan.length}{' '}
              <span
                style={{
                  fontSize: '14px',
                  fontWeight: '500',
                  color: '#64748b',
                }}
              >
                Item
              </span>
            </p>
          </div>
          <div
            className="stat-card"
            style={{
              background: '#ffffff',
              border: '1px solid #e2e8f0',
              borderLeft: '4px solid #10b981',
            }}
          >
            <p
              style={{
                fontSize: '11px',
                color: '#64748b',
                fontWeight: '700',
                textTransform: 'uppercase',
              }}
            >
              Rata-Rata Capaian
            </p>
            <p
              style={{
                fontSize: '26px',
                fontWeight: '800',
                color: rataCapaian >= 100 ? '#059669' : rataCapaian >= 75 ? '#d97706' : '#dc2626',
                marginTop: '4px',
              }}
            >
              {rataCapaian}%
            </p>
          </div>
          <div
            className="stat-card"
            style={{
              background: '#ffffff',
              border: '1px solid #e2e8f0',
              borderLeft: '4px solid #8b5cf6',
            }}
          >
            <p
              style={{
                fontSize: '11px',
                color: '#64748b',
                fontWeight: '700',
                textTransform: 'uppercase',
              }}
            >
              Capai Target 100%
            </p>
            <p
              style={{
                fontSize: '26px',
                fontWeight: '800',
                color: '#7c3aed',
                marginTop: '4px',
              }}
            >
              {laporan.filter((l) => getCapaianPersen(l.target, l.capaian) >= 100).length}{' '}
              <span
                style={{
                  fontSize: '14px',
                  fontWeight: '500',
                  color: '#64748b',
                }}
              >
                / {laporan.length}
              </span>
            </p>
          </div>
        </div>

        {/* Data Table */}
        {laporan.length === 0 ? (
          <div
            className="glass-card-static"
            style={{ padding: '48px 20px', textAlign: 'center' }}
          >
            <p style={{ fontSize: '40px', marginBottom: '12px' }}>📄</p>
            <p style={{ color: '#64748b', fontSize: '14px' }}>
              Pegawai ini belum memiliki data laporan kinerja
            </p>
          </div>
        ) : (
          <div
            className="glass-card-static"
            style={{ padding: '4px', overflow: 'hidden' }}
          >
            <div
              style={{
                padding: '12px 16px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <span
                style={{
                  fontSize: '12px',
                  fontWeight: '700',
                  color: '#64748b',
                  textTransform: 'uppercase',
                }}
              >
                Daftar Laporan Kinerja ({laporan.length})
              </span>
              <span style={{ fontSize: '11px', color: '#94a3b8' }}>
                👈 Geser tabel di layar hp 👉
              </span>
            </div>
            <div className="table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>No</th>
                    <th>Bulan</th>
                    <th>Rencana Kegiatan</th>
                    <th>Output</th>
                    <th>Target</th>
                    <th>Capaian</th>
                    <th>Keterangan Pelaksanaan</th>
                    <th>Pedoman Pengisian</th>
                  </tr>
                </thead>
                <tbody>
                  {laporan.map((l, i) => (
                    <tr key={l.id}>
                      <td>{i + 1}</td>
                      <td style={{ fontWeight: '700', color: '#0f172a' }}>
                        {formatBulan(l.bulan)}
                      </td>
                      <td className="cell-wrap" style={{ color: '#1e293b' }}>{l.rencana}</td>
                      <td className="cell-wrap" style={{ color: '#475569' }}>{l.output}</td>
                      <td style={{ textAlign: 'center', color: '#64748b' }}>
                        {l.target}
                      </td>
                      <td
                        style={{
                          textAlign: 'center',
                          fontWeight: '700',
                          color: '#2563eb',
                        }}
                      >
                        {l.capaian || '-'}
                      </td>
                      <td className="cell-wrap" style={{ color: '#64748b' }}>
                        {l.keterangan || '-'}
                      </td>
                      <td className="cell-wrap" style={{ color: '#64748b' }}>
                        {l.pedomanPengisian || '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* ======= PRINT VIEW (only visible when printing) ======= */}
      <div className="print-document">
        {/* Kop Surat */}
        <div className="print-header">
          {printSettings?.kopLogoUrl ? (
            <img src={printSettings.kopLogoUrl} alt="Logo Kop" className="print-header-logo" />
          ) : (
            <div style={{ width: '72px', height: '72px' }} />
          )}
          <div className="print-header-text">
            <h1>{printSettings?.kopNamaPemda || 'Pemerintah Kabupaten Kulon Progo'}</h1>
            <h2>{printSettings?.kopNamaInstansi || 'Kapanewon Pengasih'}</h2>
            {printSettings?.kopAksaraUrl && (
              <div style={{ textAlign: 'center', margin: '3px 0 5px 0' }}>
                <img src={printSettings.kopAksaraUrl} alt="Aksara Jawa" style={{ height: '36px', maxWidth: '90%', objectFit: 'contain', display: 'inline-block' }} />
              </div>
            )}
            <p>{printSettings?.kopAlamat || 'Jl. Pengasih No. 2, Pengasih, Kulon Progo, DIY 55652'}</p>
            <p>{printSettings?.kopKontak || 'Telp. (0274) 773422'}</p>
          </div>
          {/* Spacer kanan agar teks KOP benar-benar presisi di tengah halaman */}
          <div style={{ width: '72px', flexShrink: 0 }} />
        </div>

        {/* Judul Dokumen */}
        <div className="print-title">
          <h3>Laporan Rekapitulasi Kinerja Pamong</h3>
        </div>

        {/* Info Pegawai */}
        <div className="print-info">
          <table>
            <tbody>
              <tr>
                <td>Nama</td>
                <td>:</td>
                <td><strong>{pegawai?.nama || '-'}</strong></td>
              </tr>

              <tr>
                <td>Jabatan</td>
                <td>:</td>
                <td>{pegawai?.jabatan || '-'}</td>
              </tr>
              <tr>
                <td>Unit Kerja</td>
                <td>:</td>
                <td>{pegawai?.unitKerja || '-'}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Tabel Kinerja */}
        <table className="print-table">
          <thead>
            <tr>
              <th style={{ width: '30px' }}>No</th>
              <th>Bulan</th>
              <th>Rencana Kegiatan</th>
              <th>Output</th>
              <th>Target</th>
              <th>Capaian</th>
              <th>Keterangan Pelaksanaan Kinerja</th>
              <th>Pedoman Pengisian</th>
            </tr>
          </thead>
          <tbody>
            {laporan.map((l, i) => (
              <tr key={l.id}>
                <td className="center">{i + 1}</td>
                <td>{formatBulan(l.bulan)}</td>
                <td>{l.rencana}</td>
                <td>{l.output}</td>
                <td className="center">{l.target}</td>
                <td className="center">{l.capaian || '-'}</td>
                <td>{l.keterangan || '-'}</td>
                <td>{l.pedomanPengisian || '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Tanda Tangan: Kiri Pembuat Laporan, Kanan Atasan */}
        <div className="print-signature">
          {/* Sisi Kiri: Pembuat Laporan (Pegawai / Admin) */}
          <div className="sign-box">
            <p>{printSettings?.ttdJudulKiri || 'Yang Membuat Laporan'},</p>
            <div className="sign-space"></div>
            <p className="sign-name">
              {penandatanganKiri === 'ADMIN' ? (adminUser?.nama || 'Admin') : (pegawai?.nama || '-')}
            </p>
            <p>{penandatanganKiri === 'ADMIN' ? (adminUser?.jabatan || 'Admin') : (pegawai?.jabatan || 'Pamong Kalurahan')}</p>
          </div>

          {/* Sisi Kanan: Persetujuan Atasan */}
          <div className="sign-box">
            <p>{printSettings?.ttdTempat || 'Pengasih'}, {today}</p>
            <p>{printSettings?.ttdAtasanStatus || 'Mengetahui,'}</p>
            <p style={{ fontWeight: 700 }}>{printSettings?.ttdAtasanJabatan || 'Panewu Pengasih'}</p>
            <div className="sign-space"></div>
            <p className="sign-name">{printSettings?.ttdAtasanNama || '.................................'}</p>
            {!printSettings?.sembunyikanNipAtasan && printSettings?.ttdAtasanNip ? (
              <p>NIP. {printSettings.ttdAtasanNip}</p>
            ) : null}
          </div>
        </div>
      </div>
    </>
  );
}
