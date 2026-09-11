'use client';
/* eslint-disable @next/next/no-img-element */

import { Fragment, useCallback, useEffect, useMemo, useState, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { InputKinerjaModal } from './InputKinerjaModal';
import { IconFileText, IconEdit, IconTrash } from '@/components/ui/Icons';

export interface OutputItem {
  id: number;
  kodeHuruf: string;
  output: string;
  pedomanPengisian: string | null;
  noUrut: number;
  laporan: {
    id?: number;
    target: string | null;
    capaian: string | null;
    keterangan: string | null;
    status?: string;
  }[];
}

export interface RencanaItem {
  id: number;
  noUrut: number;
  rencanaKegiatan: string;
  outputs: OutputItem[];
}

export interface LaporanKinerjaData {
  data: RencanaItem[];
  totalKegiatan: number;
  sudahDiisi: number;
  periode?: string;
  jabatan?: { id: string; nama: string } | null;
  jabatanList?: { id: string; nama: string }[];
  user?: {
    id: string;
    nama: string;
    nip: string;
    jabatan: string | null;
    unitKerja: string | null;
    role?: string;
  };
}

interface LaporanKinerjaTableProps {
  initialData?: LaporanKinerjaData;
  initialPeriode?: string;
}

function currentPeriode() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

function formatPeriodeIndo(periode: string) {
  if (!periode) return '-';
  const [year, month] = periode.split('-');
  const months = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
  ];
  const mIndex = parseInt(month, 10) - 1;
  return `${months[mIndex] || month} ${year}`;
}

export function hitungPersenCapaian(
  targetStr?: string | null,
  capaianStr?: string | null
): number | null {
  if (capaianStr === undefined || capaianStr === null) return null;
  const trimmedCapaian = String(capaianStr).trim();
  if (trimmedCapaian === '' || trimmedCapaian === '-') return null;

  // 1. Jika capaian langsung berupa persen (contoh: "100%", "85%")
  const directPercentMatch = trimmedCapaian.match(/^(-?\d+(?:[.,]\d+)?)\s*%$/);
  if (directPercentMatch) {
    const val = parseFloat(directPercentMatch[1].replace(',', '.'));
    return isNaN(val) ? null : Math.round(val * 10) / 10;
  }

  // 2. Helper ekstraksi angka
  const extractNumber = (str?: string | null) => {
    if (!str) return null;
    const cleaned = String(str).replace(',', '.');
    const match = cleaned.match(/-?\d+(?:\.\d+)?/);
    if (!match) return null;
    const parsed = parseFloat(match[0]);
    return isNaN(parsed) ? null : parsed;
  };

  const numCapaian = extractNumber(trimmedCapaian);
  const numTarget = extractNumber(targetStr);

  // Jika capaian dan target memiliki angka valid
  if (numCapaian !== null && numTarget !== null && numTarget > 0) {
    const pct = (numCapaian / numTarget) * 100;
    return Math.round(pct * 10) / 10;
  }

  // Jika capaian berupa angka tetapi target 0 / tidak memiliki angka
  if (numCapaian !== null && (numTarget === null || numTarget === 0)) {
    return 100;
  }

  // Jika capaian diisi teks non-angka (misal: "Terlaksana", "Ada", "Selesai")
  return 100;
}

export function LaporanKinerjaTable({
  initialData,
  initialPeriode,
}: LaporanKinerjaTableProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [periode, setPeriode] = useState(
    initialPeriode || searchParams.get('periode') || currentPeriode()
  );
  const [selectedJabatanId, setSelectedJabatanId] = useState(
    searchParams.get('jabatanId') || initialData?.jabatan?.id || ''
  );

  const [dataState, setDataState] = useState<LaporanKinerjaData>(
    initialData || { data: [], totalKegiatan: 0, sudahDiisi: 0 }
  );
  const [loading, setLoading] = useState(false);

  // State untuk popup modal input
  const [showModal, setShowModal] = useState(false);
  const [activeRencanaId, setActiveRencanaId] = useState<number | undefined>(undefined);
  const [activeOutputId, setActiveOutputId] = useState<number | undefined>(undefined);

  // Floating toast persis screenshot
  const [greenToast, setGreenToast] = useState<string | null>(null);
  const [printSettings, setPrintSettings] = useState<Record<string, string> | null>(null);
  const lastFetchedKeyRef = useRef<string>('');

  const triggerToast = (msg: string) => {
    setGreenToast(msg);
    setTimeout(() => setGreenToast(null), 4000);
  };

  const loadData = useCallback(async () => {
    const currentKey = `${periode}-${selectedJabatanId}`;
    if (lastFetchedKeyRef.current === currentKey && selectedJabatanId) {
      return; // Lewati jika data periode dan jabatan ini sudah baru saja dimuat
    }
    lastFetchedKeyRef.current = currentKey;

    setLoading(true);
    try {
      const params = new URLSearchParams({ periode });
      if (selectedJabatanId) params.set('jabatanId', selectedJabatanId);

      const [resLaporan, resSettings] = await Promise.all([
        fetch(`/api/laporan-kinerja?${params.toString()}`),
        fetch('/api/settings'),
      ]);

      if (resLaporan.ok) {
        const json = await resLaporan.json();
        setDataState(json);
        if (json.jabatan?.id) {
          lastFetchedKeyRef.current = `${periode}-${json.jabatan.id}`;
          if (!selectedJabatanId) {
            setSelectedJabatanId(json.jabatan.id);
          }
        }
      }

      if (resSettings.ok) {
        const settingsJson = await resSettings.json();
        if (settingsJson.settings) setPrintSettings(settingsJson.settings);
      }
    } catch (err) {
      console.error('Error load data laporan:', err);
    }
    setLoading(false);
  }, [periode, selectedJabatanId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handlePeriodeChange = (newVal: string) => {
    lastFetchedKeyRef.current = '';
    setPeriode(newVal);
    const params = new URLSearchParams(searchParams.toString());
    params.set('periode', newVal);
    router.replace(`/dashboard/laporan?${params.toString()}`);
  };

  const handleJabatanChange = (newJabatanId: string) => {
    lastFetchedKeyRef.current = '';
    setSelectedJabatanId(newJabatanId);
    const params = new URLSearchParams(searchParams.toString());
    params.set('jabatanId', newJabatanId);
    router.replace(`/dashboard/laporan?${params.toString()}`);
  };


  const handleResetRow = (output: OutputItem) => {
    if (!confirm(`Hapus isian kinerja untuk butir "${output.kodeHuruf}. ${output.output}"?`)) return;

    // 1. Optimistic UI Update: Langsung bersihkan di memori seketika (0ms)
    const backupData = dataState;
    setDataState((prev) => ({
      ...prev,
      data: prev.data.map((rencana) => ({
        ...rencana,
        outputs: rencana.outputs.map((out) => {
          if (out.id === output.id) {
            return {
              ...out,
              laporan: [],
            };
          }
          return out;
        }),
      })),
      sudahDiisi: Math.max(0, prev.sudahDiisi - 1),
    }));

    triggerToast('Aktivitas berhasil dihapus');

    // 2. Kirim permintaan DELETE ke server di latar belakang tanpa memblokir antarmuka
    fetch(`/api/laporan-kinerja/${output.id}?periode=${periode}`, {
      method: 'DELETE',
    })
      .then((res) => {
        if (!res.ok) {
          setDataState(backupData);
          alert('Gagal menghapus isian dari server. Data dikembalikan.');
        }
      })
      .catch((err) => {
        console.error('Error delete background:', err);
        setDataState(backupData);
        alert('Gagal menghubungi server. Data dikembalikan.');
      });
  };

  // Perhitungan statistik: Total Target & Rata-rata Persentase Capaian
  const { totalTargetCount, rataRataPersentase } = useMemo(() => {
    let totalTarget = 0;
    let sumPercentage = 0;

    dataState.data.forEach((rencana) => {
      rencana.outputs.forEach((output) => {
        totalTarget += 1;
        const lap = output.laporan?.[0];
        const persen = hitungPersenCapaian(lap?.target, lap?.capaian);
        if (persen !== null) {
          sumPercentage += persen;
        }
      });
    });

    const avg = totalTarget > 0 ? sumPercentage / totalTarget : 0;
    return {
      totalTargetCount: totalTarget,
      rataRataPersentase: Math.round(avg * 10) / 10,
    };
  }, [dataState.data]);

  const handleOpenModal = (rencanaId?: number, outputId?: number) => {
    setActiveRencanaId(rencanaId);
    setActiveOutputId(outputId);
    setShowModal(true);
  };

  const handlePrint = () => {
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
      @page { size: ${pageSize}; margin: ${isLandscape ? '12mm 15mm' : '15mm 15mm'} !important; } 
      *, *::before, *::after { box-shadow: none !important; text-shadow: none !important; filter: none !important; }
      html, body, .app-container, .app-main, .app-content { background: #ffffff !important; background-color: #ffffff !important; box-shadow: none !important; }
      body { padding: 0 !important; margin: 0 !important; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
      ${isLandscape ? 'body, .print-only, .laporan-table { width: 100% !important; max-width: 100% !important; }' : ''}
      .laporan-table-card, .laporan-table-wrapper { box-shadow: none !important; border: none !important; border-radius: 0 !important; background: #ffffff !important; background-color: #ffffff !important; }
      .laporan-table { border: 1px solid #444444 !important; border-collapse: collapse !important; font-family: 'Times New Roman', Times, 'Liberation Serif', serif !important; font-size: 11pt !important; width: 100% !important; background-color: #ffffff !important; background: #ffffff !important; }
      .laporan-table th { background-color: #ffffff !important; background: #ffffff !important; color: #000000 !important; font-weight: 700 !important; font-size: 11pt !important; border: 1px solid #444444 !important; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
      .laporan-table td { border: 1px solid #444444 !important; color: #000000 !important; font-size: 11pt !important; background-color: #ffffff !important; background: #ffffff !important; }
      .laporan-table td.td-rencana { font-weight: 700 !important; color: #000000 !important; }
      .list-item { padding-left: 16px !important; text-indent: -16px !important; margin: 0 !important; font-family: 'Times New Roman', Times, 'Liberation Serif', serif !important; font-size: 11pt !important; color: #000000 !important; }
      .laporan-table tfoot { display: table-footer-group !important; }
      .laporan-table tfoot td { padding: 0 !important; margin: 0 !important; height: 1px !important; border: none !important; border-bottom: 1px solid #444444 !important; background: #ffffff !important; }
    }`;
    document.head.appendChild(styleEl);

    // Hilangkan document.title sementara agar browser tidak mencetak judul & URL di header/footer
    const originalTitle = document.title;
    document.title = '';

    window.print();

    const cleanup = () => {
      document.title = originalTitle;
      document.body.classList.remove('print-landscape');
      document.getElementById('dynamic-print-page-size')?.remove();
      window.removeEventListener('afterprint', cleanup);
    };

    window.addEventListener('afterprint', cleanup);
    setTimeout(cleanup, 1500);
  };

  const todayDateStr = new Date().toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  return (
    <div style={{ fontFamily: 'var(--font-sans)', display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* ========================================================
          FLOATING GREEN TOAST (Persis seperti screenshot di pojok kanan atas)
         ======================================================== */}
      {greenToast && (
        <div
          style={{
            position: 'fixed',
            top: '20px',
            right: '24px',
            zIndex: 9999,
            background: '#84cc16',
            color: '#ffffff',
            padding: '10px 18px',
            borderRadius: '10px',
            boxShadow: '0 4px 14px rgba(132, 204, 22, 0.35)',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            fontSize: '13.5px',
            fontWeight: '600',
            letterSpacing: '0.01em',
          }}
          className="no-print animate-fade-in"
        >
          <span>{greenToast}</span>
          <button
            onClick={() => setGreenToast(null)}
            style={{
              background: 'none',
              border: 'none',
              color: '#ffffff',
              cursor: 'pointer',
              fontSize: '14px',
              padding: 0,
              display: 'flex',
              alignItems: 'center',
            }}
          >
            ✕
          </button>
        </div>
      )}

      {/* ========================================================
          HEADER & 2 WHITE STAT CARDS (PERSIS SEPERTI LAMPIRAN USER)
         ======================================================== */}
      <div className="no-print" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {/* Symmetrical Periode & Jabatan Grid */}
        <div className="laporan-filter-grid">
          {/* Kolom Periode */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <label
              style={{
                display: 'block',
                fontSize: '11px',
                fontWeight: '700',
                color: '#64748b',
                textTransform: 'uppercase',
                letterSpacing: '0.04em',
              }}
            >
              Periode
            </label>
            <input
              type="month"
              value={periode}
              onChange={(e) => handlePeriodeChange(e.target.value)}
              style={{
                background: '#ffffff',
                border: '1px solid #d1d5db',
                borderRadius: '8px',
                padding: '8px 12px',
                fontSize: '13.5px',
                fontWeight: '500',
                color: '#1e293b',
                outline: 'none',
                cursor: 'pointer',
                width: '100%',
                height: '42px',
                boxSizing: 'border-box',
              }}
            />
          </div>

          {/* Kolom Jabatan */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <label
              style={{
                display: 'block',
                fontSize: '11px',
                fontWeight: '700',
                color: '#64748b',
                textTransform: 'uppercase',
                letterSpacing: '0.04em',
              }}
            >
              Jabatan
            </label>
            <div
              style={{
                background: '#ffffff',
                border: '1px solid #d1d5db',
                borderRadius: '8px',
                padding: '8px 12px',
                fontSize: '13.5px',
                fontWeight: '600',
                color: '#1e293b',
                height: '42px',
                display: 'flex',
                alignItems: 'center',
                width: '100%',
                boxSizing: 'border-box',
                overflow: 'hidden',
              }}
              title={dataState.user?.jabatan || dataState.jabatan?.nama || '-'}
            >
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {dataState.user?.jabatan || dataState.jabatan?.nama || '-'}
              </span>
            </div>
          </div>
        </div>

        {/* 2 WHITE CARDS: Total Target Output & Progres */}
        <div className="laporan-stat-grid">
          {/* Card 1: Total Target Output */}
          <div className="laporan-stat-card">
            <div
              className="stat-icon-wrap"
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '8px',
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '16px',
                color: '#64748b',
                fontWeight: 'bold',
                flexShrink: 0,
              }}
            >
              ✓
            </div>
            <div>
              <div className="stat-label" style={{ fontSize: '12px', fontWeight: '500', color: '#64748b' }}>
                Total Target Output
              </div>
              <div className="stat-value" style={{ fontSize: '24px', fontWeight: '700', color: '#1e293b', marginTop: '2px' }}>
                {totalTargetCount}
              </div>
            </div>
          </div>

          {/* Card 2: Progres */}
          <div className="laporan-stat-card">
            <div
              className="stat-icon-wrap"
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '8px',
                background: '#f0fdf4',
                border: '1px solid #dcfce7',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '15px',
                color: '#16a34a',
                fontWeight: 'bold',
                flexShrink: 0,
              }}
            >
              %
            </div>
            <div>
              <div className="stat-label" style={{ fontSize: '12px', fontWeight: '500', color: '#64748b' }}>
                Progres
              </div>
              <div
                className="stat-value"
                style={{
                  fontSize: '24px',
                  fontWeight: '700',
                  color: rataRataPersentase >= 100 ? '#16a34a' : rataRataPersentase >= 75 ? '#2563eb' : rataRataPersentase > 0 ? '#d97706' : '#1e293b',
                  marginTop: '2px',
                }}
              >
                {rataRataPersentase % 1 === 0 ? `${rataRataPersentase}%` : `${rataRataPersentase.toFixed(1)}%`}
              </div>
            </div>
          </div>
        </div>

        {/* Action Button: + Tambah Aktivitas persis seperti screenshot */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '6px', marginBottom: '4px' }}>
          <button
            type="button"
            onClick={() => handleOpenModal()}
            style={{
              background: '#ffffff',
              color: '#4361ee',
              border: '1.5px solid #a5b4fc',
              borderRadius: '8px',
              padding: '10px 22px',
              fontSize: '14px',
              fontWeight: '600',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              boxShadow: '0 1px 3px rgba(67, 97, 238, 0.08)',
              transition: 'all 0.15s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = '#f8fafc';
              e.currentTarget.style.borderColor = '#6366f1';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = '#ffffff';
              e.currentTarget.style.borderColor = '#a5b4fc';
            }}
          >
            <span style={{ fontSize: '18px', fontWeight: 'bold', lineHeight: 1 }}>+</span>
            <span>Isi Laporan Kinerja</span>
          </button>

          <button
            type="button"
            onClick={handlePrint}
            style={{
              background: '#1e293b',
              color: '#ffffff',
              border: 'none',
              borderRadius: '8px',
              padding: '10px 20px',
              fontSize: '14px',
              fontWeight: '600',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              boxShadow: '0 2px 4px rgba(0, 0, 0, 0.08)',
              transition: 'background 0.15s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = '#0f172a';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = '#1e293b';
            }}
          >
            <IconFileText size={17} />
            <span>Cetak Dokumen</span>
          </button>
        </div>
      </div>

      {/* ========================================================
          POP UP MODAL INPUT KINERJA (MODAL DIALOG BERSIH)
         ======================================================== */}
      {showModal && (
        <InputKinerjaModal
          rencanaList={dataState.data}
          initialRencanaId={activeRencanaId}
          initialOutputId={activeOutputId}
          periode={periode}
          jabatanId={selectedJabatanId}
          onClose={() => setShowModal(false)}
          onSaved={(keepOpen) => {
            triggerToast('Aktivitas disimpan');
            loadData();
            if (!keepOpen) {
              setShowModal(false);
            }
          }}
        />
      )}

      {/* ========================================================
          PRINT VIEW: KOP SURAT KALURAHAN & BIODATA PAMONG
         ======================================================== */}
      <div className="print-only" style={{ color: '#000000', fontFamily: "'Times New Roman', Times, 'Liberation Serif', serif" }}>
        {/* KOP RESMI: Logo di samping kiri, Teks terpusat di tengah dengan spacer kanan */}
        <div style={{ position: 'relative', marginBottom: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 0, paddingBottom: '6px' }}>
            {/* Logo di kiri */}
            <div style={{ width: '90px', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {printSettings?.kopLogoUrl ? (
                <img
                  src={printSettings.kopLogoUrl}
                  alt="Logo Kop"
                  style={{ width: '75px', height: '75px', objectFit: 'contain' }}
                />
              ) : (
                <div style={{ width: '75px', height: '75px' }} />
              )}
            </div>

            {/* Teks KOP — Terpusat di tengah halaman */}
            <div style={{ flex: 1, textAlign: 'center', padding: '0 8px', minWidth: 0 }}>
              <h2 style={{ fontSize: '13pt', fontWeight: 'bold', margin: '0 0 2px 0', textTransform: 'uppercase', color: '#000000', letterSpacing: '0.5px', fontFamily: "'Times New Roman', Times, serif", lineHeight: 1.2 }}>
                {printSettings?.kopNamaPemda || 'PEMERINTAH KABUPATEN KULON PROGO'}
              </h2>
              <h1 style={{ fontSize: '15pt', fontWeight: 'bold', margin: '2px 0 3px 0', textTransform: 'uppercase', color: '#000000', letterSpacing: '0.5px', fontFamily: "'Times New Roman', Times, serif", lineHeight: 1.2, whiteSpace: 'pre-line' }}>
                {printSettings?.kopNamaInstansi || 'KALURAHAN KARANGSARI, KAPANEWON PENGASIH'}
              </h1>
              {printSettings?.kopAksaraUrl && (
                <div style={{ textAlign: 'center', margin: '3px 0 4px 0' }}>
                  <img
                    src={printSettings.kopAksaraUrl}
                    alt="Aksara Jawa"
                    style={{ height: '36px', maxWidth: '85%', objectFit: 'contain', display: 'inline-block' }}
                  />
                </div>
              )}
              <p style={{ fontSize: '9.5pt', margin: '4px 0 0 0', color: '#000000', lineHeight: 1.35, fontWeight: 'normal', fontFamily: "'Times New Roman', Times, serif" }}>
                {printSettings?.kopAlamat || 'Jl. Tentara Pelajar No.05, Kopat, Karangsari, Pengasih, Kulon Progo, DIY 55652'}
              </p>
              {printSettings?.kopKontak && (
                <p style={{ fontSize: '9pt', margin: '1px 0 0 0', color: '#000000', lineHeight: 1.35, fontWeight: 'normal', fontFamily: "'Times New Roman', Times, serif" }}>
                  {printSettings.kopKontak}
                </p>
              )}
            </div>

            {/* Spacer kanan — sama lebar kolom logo agar teks benar-benar simetris di tengah halaman */}
            <div style={{ width: '90px', flexShrink: 0 }} />
          </div>

          {/* Garis pemisah ganda khas KOP kedinasan: tebal di atas, tipis di bawah */}
          <hr style={{ border: 'none', borderTop: '2.5px solid #000000', margin: '0 0 2px 0' }} />
          <hr style={{ border: 'none', borderTop: '0.75px solid #000000', margin: '0 0 14px 0' }} />
        </div>

        <div style={{ textAlign: 'center', marginBottom: '16px' }}>
          <h3 className="laporan-doc-title">
            LAPORAN CAPAIAN KINERJA BULANAN
          </h3>
          <p className="laporan-doc-subtitle">
            Periode: {formatPeriodeIndo(periode)}
          </p>
        </div>

        <table style={{ width: '100%', fontSize: '11pt', marginBottom: '14px', borderCollapse: 'collapse', color: '#000000', lineHeight: '1.5', fontFamily: "'Times New Roman', Times, serif" }}>
          <tbody>
            <tr>
              {/* Kolom Kiri: Nama Pamong & Unit Kerja */}
              <td style={{ width: '55%', verticalAlign: 'top', padding: 0 }}>
                <table style={{ borderCollapse: 'collapse', color: '#000000', lineHeight: '1.5', fontFamily: "'Times New Roman', Times, serif" }}>
                  <tbody>
                    <tr>
                      <td style={{ width: '115px', padding: '3px 0', color: '#000000', fontWeight: 'bold' }}>Nama Pamong</td>
                      <td style={{ width: '15px', textAlign: 'center', color: '#000000', fontWeight: 'bold' }}>:</td>
                      <td style={{ color: '#000000', fontWeight: 'bold' }}>{dataState.user?.nama || '-'}</td>
                    </tr>
                    <tr>
                      <td style={{ padding: '3px 0', color: '#000000', fontWeight: 'bold' }}>Unit Kerja</td>
                      <td style={{ textAlign: 'center', color: '#000000', fontWeight: 'bold' }}>:</td>
                      <td style={{ color: '#000000', fontWeight: 'bold' }}>{dataState.user?.unitKerja || 'Pemerintah Kalurahan'}</td>
                    </tr>
                  </tbody>
                </table>
              </td>

              {/* Kolom Kanan: Jabatan digeser ke arah kanan disesuaikan tepi kanan tabel */}
              <td style={{ width: '45%', verticalAlign: 'top', padding: 0, textAlign: 'right' }}>
                <table style={{ marginLeft: 'auto', borderCollapse: 'collapse', color: '#000000', lineHeight: '1.5', fontFamily: "'Times New Roman', Times, serif", textAlign: 'left' }}>
                  <tbody>
                    <tr>
                      <td style={{ width: '75px', padding: '3px 0', color: '#000000', fontWeight: 'bold' }}>Jabatan</td>
                      <td style={{ width: '15px', textAlign: 'center', color: '#000000', fontWeight: 'bold' }}>:</td>
                      <td style={{ color: '#000000', fontWeight: 'bold' }}>{dataState.jabatan?.nama || dataState.user?.jabatan || '-'}</td>
                    </tr>
                  </tbody>
                </table>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* ========================================================
          TABEL UTAMA LAPORAN KINERJA
         ======================================================== */}
      <div className="laporan-table-card">
        {loading ? (
          <div style={{ padding: '60px 20px', textAlign: 'center' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                border: '3px solid #4361ee',
                borderTopColor: 'transparent',
                borderRadius: '50%',
                margin: '0 auto 14px auto',
                animation: 'spin 0.8s linear infinite',
              }}
            />
            <p style={{ fontSize: '14px', color: '#64748b', fontWeight: '500' }}>
              Memuat data aktivitas kinerja...
            </p>
          </div>
        ) : (
          <div>
            <div className="laporan-table-wrapper">
              <table className="laporan-table">
                <colgroup className="laporan-colgroup">
                  {/* 1. NO */}
                  <col className="col-no" />
                  {/* 2. RENCANA KEGIATAN */}
                  <col className="col-rencana" />
                  {/* 3. OUTPUT */}
                  <col className="col-output" />
                  {/* 4. TARGET */}
                  <col className="col-target" />
                  {/* 5. CAPAIAN */}
                  <col className="col-capaian" />
                  {/* 6. KETERANGAN PELAKSANAAN KEGIATAN */}
                  <col className="col-keterangan" />
                  {/* 7. PEDOMAN PENGISIAN */}
                  <col className="col-pedoman" />
                  {/* 8. STATUS */}
                  <col className="col-status" />
                  {/* 9. AKSI */}
                  <col className="col-aksi" />
                </colgroup>

                {/* HEADER TABEL: 7 KOLOM RESMI CETAK + 2 KOLOM LAYAR */}
                <thead>
                  <tr className="laporan-table-thead-tr">
                    <th className="th-no" style={{ textAlign: 'center' }}>
                      NO
                    </th>
                    <th className="th-rencana" style={{ textAlign: 'center' }}>
                      RENCANA KEGIATAN
                    </th>
                    <th className="th-output" style={{ textAlign: 'center' }}>
                      OUTPUT
                    </th>
                    <th className="th-target" style={{ textAlign: 'center' }}>
                      TARGET
                    </th>
                    <th className="th-capaian" style={{ textAlign: 'center' }}>
                      CAPAIAN
                    </th>
                    <th className="th-keterangan" style={{ textAlign: 'center' }}>
                      KETERANGAN PELAKSANAAN KEGIATAN
                    </th>
                    <th className="th-pedoman" style={{ textAlign: 'center' }}>
                      PEDOMAN PENGISIAN
                    </th>
                    <th className="th-status" style={{ textAlign: 'center' }}>
                      STATUS
                    </th>
                    <th className="th-aksi" style={{ textAlign: 'center' }}>
                      AKSI
                    </th>
                  </tr>
                </thead>

                {/* TFOOT KHUSUS CETAK: GARIS PENUTUP DI BAGIAN BAWAH SEBELUM HALAMAN BERIKUTNYA */}
                <tfoot className="print-only">
                  <tr>
                    <td
                      colSpan={7}
                      style={{
                        padding: 0,
                        margin: 0,
                        height: '1px',
                        border: 'none',
                        borderBottom: '1px solid #444444',
                      }}
                    />
                  </tr>
                </tfoot>

              {/* BODY TABEL: RENCANA KEGIATAN & OUTPUT MASUK DALAM KOLOM DENGAN ROWSPAN */}
              <tbody>
                {dataState.data.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="no-print" style={{ padding: '56px 20px', textAlign: 'center', color: '#94a3b8', border: 'none' }}>
                      <p style={{ fontSize: '15px', fontWeight: '600', marginBottom: '8px', color: '#64748b' }}>
                        Belum ada template rencana & output kegiatan untuk jabatan &quot;{dataState.jabatan?.nama || 'ini'}&quot;.
                      </p>
                      <button
                        onClick={() => handleOpenModal()}
                        style={{
                          background: '#ffffff',
                          color: '#4361ee',
                          border: '1.5px solid #a5b4fc',
                          borderRadius: '8px',
                          padding: '10px 20px',
                          fontSize: '14px',
                          fontWeight: '600',
                          cursor: 'pointer',
                        }}
                      >
                        + Isi Laporan Kinerja
                      </button>
                    </td>
                    <td colSpan={7} className="print-only" style={{ padding: '20px', textAlign: 'center', color: '#64748b', border: '1px solid #000' }}>
                      Belum ada data laporan kinerja untuk periode ini.
                    </td>
                  </tr>
                ) : (
                  dataState.data.map((rencana, rIdx) => {
                    const outputCount = rencana.outputs.length;

                    if (outputCount === 0) {
                      return (
                        <tr
                          key={`rencana-empty-${rencana.id}`}
                          className="laporan-row"
                          style={{
                            borderTop: rIdx > 0 ? '2px solid #e2e8f0' : 'none',
                          }}
                        >
                          <td
                            className="td-no"
                            style={{
                              textAlign: 'center',
                              color: '#64748b',
                              fontWeight: '600',
                              verticalAlign: 'top',
                            }}
                          >
                            {rencana.noUrut || rIdx + 1}
                          </td>
                          <td
                            className="td-rencana"
                            style={{
                              textAlign: 'left',
                              color: '#1e293b',
                              fontWeight: '600',
                              verticalAlign: 'top',
                            }}
                          >
                            {rencana.rencanaKegiatan}
                          </td>
                          <td
                            colSpan={7}
                            className="no-print"
                            style={{
                              padding: '16px 20px',
                              color: '#94a3b8',
                              fontStyle: 'italic',
                              border: 'none',
                            }}
                          >
                            Belum ada butir output di bawah rencana kegiatan ini
                          </td>
                          <td
                            colSpan={5}
                            className="print-only"
                            style={{
                              padding: '16px 20px',
                              color: '#94a3b8',
                              fontStyle: 'italic',
                              border: '1px solid #000',
                            }}
                          >
                            Belum ada butir output di bawah rencana kegiatan ini
                          </td>
                        </tr>
                      );
                    }

                    return (
                      <Fragment key={`rencana-group-${rencana.id}`}>
                        {rencana.outputs.map((output, idx) => {
                          const lap = output.laporan?.[0];
                          const persen = hitungPersenCapaian(lap?.target, lap?.capaian);
                          const isFilled = persen !== null;

                          return (
                            <tr
                              key={`out-${output.id}`}
                              className="laporan-row"
                              style={{
                                borderTop: idx === 0 && rIdx > 0 ? '2px solid #e2e8f0' : idx > 0 ? '1px solid #f1f5f9' : 'none',
                              }}
                            >
                              {/* 1. NO & 2. RENCANA KEGIATAN (Hanya pada row pertama grup dengan rowSpan) */}
                              {idx === 0 && (
                                <>
                                  <td
                                    rowSpan={outputCount}
                                    className="td-no"
                                    style={{
                                      textAlign: 'center',
                                      color: '#64748b',
                                      fontWeight: '600',
                                      verticalAlign: 'top',
                                    }}
                                  >
                                    {rencana.noUrut || rIdx + 1}
                                  </td>
                                  <td
                                    rowSpan={outputCount}
                                    className="td-rencana"
                                    style={{
                                      textAlign: 'left',
                                      color: '#1e293b',
                                      fontWeight: '600',
                                      verticalAlign: 'top',
                                      wordBreak: 'break-word',
                                    }}
                                  >
                                    {rencana.rencanaKegiatan}
                                  </td>
                                </>
                              )}

                              {/* 3. OUTPUT (List kode a., b., dll warna font hitam) */}
                              <td
                                className="td-output"
                                style={{
                                  textAlign: 'left',
                                  color: '#1e293b',
                                  fontWeight: '500',
                                  wordBreak: 'break-word',
                                  verticalAlign: 'top',
                                }}
                              >
                                <div
                                  className="output-item-wrap"
                                  style={{
                                    display: 'flex',
                                    alignItems: 'flex-start',
                                    gap: '6px',
                                    width: '100%',
                                  }}
                                >
                                  <span
                                    className="output-kode"
                                    style={{
                                      flexShrink: 0,
                                      width: '18px',
                                      minWidth: '18px',
                                      fontWeight: '600',
                                      color: '#1e293b',
                                      textAlign: 'left',
                                      lineHeight: '1.5',
                                    }}
                                  >
                                    {output.kodeHuruf}.
                                  </span>
                                  <span
                                    className="output-text"
                                    style={{
                                      flex: 1,
                                      color: '#1e293b',
                                      lineHeight: '1.5',
                                      wordBreak: 'break-word',
                                    }}
                                  >
                                    {output.output}
                                  </span>
                                </div>
                              </td>

                              {/* 4. TARGET */}
                              <td
                                className="td-target"
                                style={{
                                  textAlign: 'center',
                                  color: '#334155',
                                  whiteSpace: 'nowrap',
                                  verticalAlign: 'top',
                                }}
                              >
                                {lap?.target || '-'}
                              </td>

                              {/* 5. CAPAIAN */}
                              <td
                                className="td-capaian"
                                style={{
                                  textAlign: 'center',
                                  color: '#0f172a',
                                  fontWeight: '700',
                                  whiteSpace: 'nowrap',
                                  verticalAlign: 'top',
                                }}
                              >
                                {lap?.capaian || '-'}
                              </td>

                              {/* 6. KETERANGAN PELAKSANAAN KEGIATAN */}
                              <td
                                className="td-keterangan"
                                style={{
                                  textAlign: lap?.keterangan?.trim() ? 'left' : 'center',
                                  color: '#334155',
                                  wordBreak: 'break-word',
                                  verticalAlign: 'top',
                                }}
                              >
                                {lap?.keterangan?.trim() ? (
                                  lap.keterangan
                                ) : (
                                  <span style={{ color: '#94a3b8' }}>-</span>
                                )}
                              </td>

                              {/* 7. PEDOMAN PENGISIAN */}
                              <td
                                className="td-pedoman"
                                style={{
                                  textAlign: 'left',
                                  color: '#94a3b8',
                                  fontStyle: 'italic',
                                  wordBreak: 'break-word',
                                  verticalAlign: 'top',
                                }}
                              >
                                {output.pedomanPengisian || '-'}
                              </td>

                              {/* 8. STATUS */}
                              <td
                                className="td-status"
                                style={{
                                  textAlign: 'center',
                                  whiteSpace: 'nowrap',
                                  verticalAlign: 'top',
                                }}
                              >
                                {isFilled ? (
                                  <span
                                    className="laporan-badge-status"
                                    style={{
                                      background: persen >= 100 ? '#dcfce7' : persen >= 75 ? '#eff6ff' : '#fef3c7',
                                      color: persen >= 100 ? '#15803d' : persen >= 75 ? '#1d4ed8' : '#b45309',
                                      border: `1px solid ${persen >= 100 ? '#bbf7d0' : persen >= 75 ? '#bfdbfe' : '#fde68a'}`,
                                      fontWeight: '700',
                                    }}
                                  >
                                    {persen % 1 === 0 ? `${persen}%` : `${persen.toFixed(1)}%`}
                                  </span>
                                ) : (
                                  <span className="laporan-badge-status pending">
                                    BELUM DIISI
                                  </span>
                                )}
                              </td>

                              {/* 9. AKSI */}
                              <td
                                className="td-aksi"
                                style={{
                                  textAlign: 'center',
                                  verticalAlign: 'top',
                                }}
                              >
                                 <div
                                   style={{
                                     display: 'flex',
                                     flexDirection: 'column',
                                     gap: '4px',
                                     alignItems: 'center',
                                     justifyContent: 'center',
                                   }}
                                 >
                                   {/* Tombol Kotak Edit */}
                                   <button
                                     type="button"
                                     className="laporan-action-btn"
                                     onClick={() => handleOpenModal(rencana.id, output.id)}
                                     title="Edit / Ubah isian"
                                     style={{
                                       background: '#4f46e5',
                                       color: '#ffffff',
                                       boxShadow: '0 2px 4px rgba(79, 70, 229, 0.25)',
                                     }}
                                   >
                                     <IconEdit size={16} color="#ffffff" />
                                   </button>

                                   {/* Tombol Kotak Hapus */}
                                   {isFilled && (
                                     <button
                                       type="button"
                                       className="laporan-action-btn"
                                       onClick={() => handleResetRow(output)}
                                       title="Hapus isian"
                                       style={{
                                         background: '#ef4444',
                                         color: '#ffffff',
                                         boxShadow: '0 2px 4px rgba(239, 68, 68, 0.25)',
                                       }}
                                     >
                                       <IconTrash size={16} color="#ffffff" />
                                     </button>
                                   )}
                                 </div>
                              </td>
                            </tr>
                          );
                        })}
                      </Fragment>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>

      {/* ========================================================
          PRINT FOOTER: TANDA TANGAN
         ======================================================== */}
      {/* ========================================================
          PRINT FOOTER: TANDA TANGAN DUA BELAH PIHAK
         ======================================================== */}
      <div className="print-only" style={{ marginTop: '28px', pageBreakInside: 'avoid', fontFamily: "'Times New Roman', Times, 'Liberation Serif', serif", color: '#000000' }}>
        <table style={{ width: '100%', fontSize: '11pt', textAlign: 'center', borderCollapse: 'collapse', color: '#000000', fontFamily: "'Times New Roman', Times, serif" }}>
          <tbody>
            <tr>
              <td style={{ width: '50%', paddingBottom: '75px', verticalAlign: 'top', color: '#000000' }}>
                <div style={{ lineHeight: 1.5 }}>
                  <span style={{ fontSize: '11pt', fontWeight: '600', color: '#000000' }}>
                    {printSettings?.ttdAtasanStatus || 'Mengetahui,'}
                  </span>
                  <br />
                  <strong style={{ fontSize: '11.5pt', fontWeight: 'bold', textTransform: 'uppercase', color: '#000000' }}>
                    {(() => {
                      if (printSettings?.ttdAtasanJabatan) {
                        const j = printSettings.ttdAtasanJabatan.toLowerCase().trim();
                        if (j === 'lurah' && printSettings?.kopNamaInstansi) {
                          const kal = printSettings.kopNamaInstansi.replace(/kalurahan\s*/i, '').replace(/kapanewon\s*[\w\s]+/i, '').replace(/,.*/, '').trim().toUpperCase();
                          return `LURAH ${kal}`;
                        }
                        return printSettings.ttdAtasanJabatan.toUpperCase();
                      }
                      if (printSettings?.kopNamaInstansi) {
                        const kal = printSettings.kopNamaInstansi.replace(/kalurahan\s*/i, '').replace(/kapanewon\s*[\w\s]+/i, '').replace(/,.*/, '').trim().toUpperCase();
                        return `LURAH ${kal}`;
                      }
                      return 'LURAH';
                    })()}
                  </strong>
                </div>
              </td>
              <td style={{ width: '50%', paddingBottom: '75px', verticalAlign: 'top', color: '#000000' }}>
                <div style={{ lineHeight: 1.5 }}>
                  <span style={{ fontSize: '11pt', fontWeight: '600', color: '#000000' }}>
                    {printSettings?.ttdTempat || 'Karangsari'}, {todayDateStr}
                  </span>
                  <br />
                  <span style={{ fontSize: '11pt', fontWeight: '600', color: '#000000' }}>
                    {printSettings?.ttdJudulKiri || 'Pegawai yang Bersangkutan'},
                  </span>
                </div>
              </td>
            </tr>
            <tr>
              <td style={{ verticalAlign: 'top', color: '#000000' }}>
                <strong style={{ textDecoration: 'underline', fontSize: '11.5pt', fontWeight: 'bold', color: '#000000' }}>
                  {printSettings?.ttdAtasanNama || printSettings?.ttdKananNama || 'DJOKO PURWANTO'}
                </strong>
                <br />
                {!printSettings?.sembunyikanNipAtasan && (printSettings?.ttdAtasanNip || printSettings?.ttdKananNip) && !['admisi', 'admin', 'pamong', '-'].includes(String(printSettings?.ttdAtasanNip || printSettings?.ttdKananNip).toLowerCase().trim()) ? (
                  <div style={{ fontSize: '10.5pt', fontWeight: '600', color: '#000000', marginTop: '2px' }}>
                    NIP. {printSettings.ttdAtasanNip || printSettings.ttdKananNip}
                  </div>
                ) : null}
              </td>
              <td style={{ verticalAlign: 'top', color: '#000000' }}>
                <strong style={{ textDecoration: 'underline', fontSize: '11.5pt', fontWeight: 'bold', color: '#000000' }}>
                  {dataState.user?.nama || '................................'}
                </strong>
                <br />
                <div style={{ fontSize: '11pt', fontWeight: '600', color: '#000000', marginTop: '2px' }}>
                  {dataState.jabatan?.nama || dataState.user?.jabatan || 'Pamong Kalurahan'}
                </div>
                {!printSettings?.sembunyikanNip && dataState.user?.nip && !['admisi', 'admin', 'pamong', '-'].includes(String(dataState.user.nip).toLowerCase().trim()) ? (
                  <div style={{ fontSize: '10.5pt', fontWeight: '600', color: '#000000', marginTop: '2px' }}>
                    NIP. {dataState.user.nip}
                  </div>
                ) : null}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}