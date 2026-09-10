'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  IconFileText,
  IconCheckCircle,
  IconInfo,
  IconCamera,
  IconTrash,
  IconUser,
  IconBuilding,
} from '@/components/ui/Icons';

interface PejabatUser {
  id: string;
  nip: string;
  nama: string;
  jabatan: string | null;
  unitKerja: string | null;
  role: string;
}

export default function SuperAdminFormatLaporanPage() {
  const [form, setForm] = useState({
    // Kop Laporan
    kopLogoUrl: '',
    kopNamaPemda: 'Pemerintah Kabupaten Kulon Progo',
    kopNamaInstansi: 'Kapanewon Pengasih',
    kopAlamat: 'Jl. Pengasih No. 2, Pengasih, Kulon Progo, DIY 55652',
    kopKontak: 'Telp. (0274) 773422',

    // Ukuran Kertas & Posisi Dokumen
    ukuranKertas: 'A4' as 'A4' | 'F4',
    posisiDokumen: 'portrait' as 'portrait' | 'landscape',
    sembunyikanNip: false,

    // Tanda Tangan
    ttdTempat: 'Pengasih',
    ttdJudulKiri: 'Yang Membuat Laporan',
    ttdAtasanUserId: '',
    ttdAtasanStatus: 'Mengetahui,',
    ttdAtasanJabatan: 'Panewu Pengasih',
    ttdAtasanNama: 'Drs. H. Sukirno, M.Si',
    ttdAtasanNip: '19720315 199803 1 005',
  });

  const [pejabatList, setPejabatList] = useState<PejabatUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    // Fetch Settings
    Promise.all([
      fetch('/api/settings').then((r) => r.json()),
      fetch('/api/superadmin/pejabat-list').then((r) => r.json()),
    ])
      .then(([settingsData, pejabatData]) => {
        if (settingsData.settings) {
          const s = settingsData.settings;
          setForm({
            kopLogoUrl: s.kopLogoUrl || s.logoUrl || '',
            kopNamaPemda: s.kopNamaPemda || 'Pemerintah Kabupaten Kulon Progo',
            kopNamaInstansi: s.kopNamaInstansi || s.namaKantor || 'Kapanewon Pengasih',
            kopAlamat: s.kopAlamat || 'Jl. Pengasih No. 2, Pengasih, Kulon Progo, DIY 55652',
            kopKontak: s.kopKontak || 'Telp. (0274) 773422',

            ukuranKertas: (s.ukuranKertas === 'F4' ? 'F4' : 'A4') as 'A4' | 'F4',
            posisiDokumen: (s.posisiDokumen === 'landscape' ? 'landscape' : 'portrait') as 'portrait' | 'landscape',
            sembunyikanNip: Boolean(s.sembunyikanNip),

            ttdTempat: s.ttdTempat || 'Pengasih',
            ttdJudulKiri: s.ttdJudulKiri || 'Yang Membuat Laporan',
            ttdAtasanUserId: s.ttdAtasanUserId || '',
            ttdAtasanStatus: s.ttdAtasanStatus || 'Mengetahui,',
            ttdAtasanJabatan: s.ttdAtasanJabatan || 'Panewu Pengasih',
            ttdAtasanNama: s.ttdAtasanNama || '.................................',
            ttdAtasanNip: s.ttdAtasanNip || '.................................',
          });
        }

        if (pejabatData.users) {
          setPejabatList(pejabatData.users);
        }
      })
      .catch((err) => console.error('Load data error:', err))
      .finally(() => setFetching(false));
  }, []);

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      setMessage({ type: 'error', text: 'Ukuran file logo kop surat maksimal 2MB.' });
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setForm((prev) => ({ ...prev, kopLogoUrl: reader.result as string }));
    };
    reader.readAsDataURL(file);
  };

  const handleHapusLogo = () => {
    setForm((prev) => ({ ...prev, kopLogoUrl: '' }));
  };

  const handleSelectAtasan = (userId: string) => {
    const selected = pejabatList.find((p) => p.id === userId);
    if (selected) {
      setForm((prev) => ({
        ...prev,
        ttdAtasanUserId: selected.id,
        ttdAtasanNama: selected.nama,
        ttdAtasanNip: selected.nip,
        ttdAtasanJabatan: selected.jabatan || prev.ttdAtasanJabatan || 'Panewu Pengasih',
      }));
    } else {
      setForm((prev) => ({
        ...prev,
        ttdAtasanUserId: '',
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();

      if (!res.ok) {
        setMessage({ type: 'error', text: data.error || 'Gagal menyimpan format laporan.' });
      } else {
        setMessage({
          type: 'success',
          text: 'Format Kop Laporan & Template Tanda Tangan Atasan berhasil diperbarui! Seluruh lembar cetak pegawai dan admin kini otomatis menggunakan format baru ini.',
        });
      }
    } catch {
      setMessage({ type: 'error', text: 'Terjadi kesalahan jaringan saat menyimpan data.' });
    }
    setLoading(false);
  };

  const todayFormatted = new Date().toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

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
            <IconFileText size={26} color="#0089d7" />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h2 style={{ fontSize: '20px', fontWeight: '800', color: '#0f172a', letterSpacing: '-0.02em', margin: 0 }}>
                Format & Kop Dokumen Cetak
              </h2>
              <span className="badge badge-info" style={{ fontSize: '11px', padding: '2px 8px' }}>
                SUPER ADMIN
              </span>
            </div>
            <p style={{ fontSize: '13px', color: '#64748b', margin: '4px 0 0 0' }}>
              Atur format Kop Surat kedinasan, logo, serta template tanda tangan & penunjukan atasan yang menyetujui dokumen.
            </p>
          </div>
        </div>

        <Link href="/superadmin" className="btn-outline" style={{ fontSize: '13px', padding: '8px 16px' }}>
          ← Kembali ke Ringkasan
        </Link>
      </div>

      {/* Alert Notifikasi */}
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
          <p style={{ color: '#64748b', fontSize: '14px', fontWeight: '500' }}>Memuat data pengaturan format cetak...</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(340px, 1.15fr) minmax(360px, 1fr)', gap: '24px', alignItems: 'start' }}>
          {/* KOLOM KIRI: FORM PENGATURAN */}
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {/* 1. KOP SURAT */}
            <div
              className="glass-card-static"
              style={{
                padding: '24px',
                background: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: '16px',
                display: 'flex',
                flexDirection: 'column',
                gap: '18px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', borderBottom: '1px solid #f1f5f9', paddingBottom: '14px' }}>
                <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#f0fdf4', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <IconBuilding size={18} color="#16a34a" />
                </div>
                <div>
                  <h3 style={{ fontSize: '16px', fontWeight: '700', color: '#0f172a', margin: 0 }}>
                    1. Pengaturan Kop Surat (Header)
                  </h3>
                  <p style={{ fontSize: '12px', color: '#64748b', margin: '2px 0 0 0' }}>
                    Kop surat resmi yang tercetak di bagian teratas dokumen PDF/Print
                  </p>
                </div>
              </div>

              {/* Upload Logo Kop */}
              <div>
                <label className="input-label" style={{ fontWeight: '700' }}>Logo Kop Surat</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginTop: '6px' }}>
                  <div
                    style={{
                      width: '74px',
                      height: '74px',
                      borderRadius: '10px',
                      border: '2px dashed #cbd5e1',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      background: '#f8fafc',
                      overflow: 'hidden',
                      position: 'relative',
                      flexShrink: 0,
                    }}
                  >
                    {form.kopLogoUrl ? (
                      <img
                        src={form.kopLogoUrl}
                        alt="Logo Kop"
                        style={{ width: '100%', height: '100%', objectFit: 'contain', padding: '4px' }}
                      />
                    ) : (
                      <span style={{ fontSize: '10px', color: '#94a3b8', textAlign: 'center', padding: '4px' }}>
                        Tidak ada logo
                      </span>
                    )}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                      <label
                        className="btn-outline"
                        style={{
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          fontSize: '12px',
                          padding: '6px 12px',
                        }}
                      >
                        <IconCamera size={14} color="#0089d7" />
                        <span>Pilih Logo Kop</span>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleLogoUpload}
                          style={{ display: 'none' }}
                        />
                      </label>
                      {form.kopLogoUrl && (
                        <button
                          type="button"
                          onClick={handleHapusLogo}
                          className="btn-outline"
                          style={{
                            borderColor: '#fecaca',
                            color: '#dc2626',
                            fontSize: '12px',
                            padding: '6px 12px',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                          }}
                        >
                          <IconTrash size={14} color="#dc2626" />
                          Hapus
                        </button>
                      )}
                    </div>
                    <span style={{ fontSize: '11px', color: '#64748b' }}>
                      Format PNG/JPG/SVG transparan, disarankan lambang Garuda / Pemda (Maks 2MB).
                    </span>
                  </div>
                </div>
              </div>

              {/* Baris 1: Pemda */}
              <div>
                <label className="input-label" style={{ fontWeight: '600' }}>
                  Baris 1: Pemerintah Daerah / Provinsi / Kabupaten
                </label>
                <input
                  type="text"
                  className="input-field"
                  placeholder="Contoh: PEMERINTAH KABUPATEN KULON PROGO"
                  value={form.kopNamaPemda}
                  onChange={(e) => setForm({ ...form, kopNamaPemda: e.target.value })}
                  required
                />
              </div>

              {/* Baris 2: Instansi */}
              <div>
                <label className="input-label" style={{ fontWeight: '600' }}>
                  Baris 2: Nama Kapanewon / Kalurahan / Instansi
                </label>
                <input
                  type="text"
                  className="input-field"
                  placeholder="Contoh: KAPANEWON PENGASIH"
                  value={form.kopNamaInstansi}
                  onChange={(e) => setForm({ ...form, kopNamaInstansi: e.target.value })}
                  required
                />
              </div>

              {/* Baris 3: Alamat */}
              <div>
                <label className="input-label" style={{ fontWeight: '600' }}>
                  Baris 3: Alamat Kantor
                </label>
                <input
                  type="text"
                  className="input-field"
                  placeholder="Contoh: Jl. Pengasih No. 2, Pengasih, Kulon Progo, DIY 55652"
                  value={form.kopAlamat}
                  onChange={(e) => setForm({ ...form, kopAlamat: e.target.value })}
                />
              </div>

              {/* Baris 4: Kontak */}
              <div>
                <label className="input-label" style={{ fontWeight: '600' }}>
                  Baris 4: Kontak Telepon, Email / Pos-el
                </label>
                <input
                  type="text"
                  className="input-field"
                  placeholder="Contoh: Telp. (0274) 773422 | Pos-el: kapanewonpengasih@kulonprogokab.go.id"
                  value={form.kopKontak}
                  onChange={(e) => setForm({ ...form, kopKontak: e.target.value })}
                />
              </div>
            </div>

            {/* SECTION: UKURAN KERTAS & POSISI DOKUMEN CETAK */}
            <div
              className="glass-card-static"
              style={{
                padding: '24px',
                background: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: '16px',
                display: 'flex',
                flexDirection: 'column',
                gap: '20px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', borderBottom: '1px solid #f1f5f9', paddingBottom: '14px' }}>
                <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#fef3c7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span style={{ fontSize: '16px' }}>📐</span>
                </div>
                <div>
                  <h3 style={{ fontSize: '16px', fontWeight: '700', color: '#0f172a', margin: 0 }}>
                    2. Ukuran Kertas &amp; Posisi Dokumen Cetak
                  </h3>
                  <p style={{ fontSize: '12px', color: '#64748b', margin: '2px 0 0 0' }}>
                    Konfigurasi ukuran kertas, orientasi dokumen (Landscape/Potrait), dan opsi NIP Kalurahan
                  </p>
                </div>
              </div>

              {/* Sub 1: Ukuran Kertas */}
              <div>
                <label className="input-label" style={{ fontWeight: '700', marginBottom: '8px', display: 'block' }}>
                  A. Ukuran Kertas Cetak
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  {/* Pilihan A4 */}
                  <button
                    type="button"
                    onClick={() => setForm({ ...form, ukuranKertas: 'A4' })}
                    style={{
                      border: form.ukuranKertas === 'A4' ? '2px solid #0089d7' : '2px solid #e2e8f0',
                      borderRadius: '12px',
                      padding: '14px',
                      background: form.ukuranKertas === 'A4' ? '#eff6ff' : '#f8fafc',
                      cursor: 'pointer',
                      textAlign: 'left',
                      transition: 'all 0.2s ease',
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '12px',
                    }}
                  >
                    <div
                      style={{
                        width: '26px',
                        height: '36px',
                        background: form.ukuranKertas === 'A4' ? '#0089d7' : '#cbd5e1',
                        borderRadius: '3px',
                        flexShrink: 0,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <span style={{ color: '#fff', fontSize: '8px', fontWeight: '700', fontFamily: 'sans-serif' }}>A4</span>
                    </div>
                    <div>
                      <p style={{ margin: 0, fontWeight: '700', fontSize: '13px', color: form.ukuranKertas === 'A4' ? '#0089d7' : '#374151' }}>
                        Kertas A4
                      </p>
                      <p style={{ margin: '2px 0 0 0', fontSize: '11px', color: '#64748b' }}>
                        210 × 297 mm
                      </p>
                      {form.ukuranKertas === 'A4' && (
                        <span style={{ marginTop: '5px', display: 'inline-block', fontSize: '9px', background: '#0089d7', color: '#fff', padding: '1px 6px', borderRadius: '10px', fontWeight: '700' }}>
                          ✓ Dipilih
                        </span>
                      )}
                    </div>
                  </button>

                  {/* Pilihan F4 */}
                  <button
                    type="button"
                    onClick={() => setForm({ ...form, ukuranKertas: 'F4' })}
                    style={{
                      border: form.ukuranKertas === 'F4' ? '2px solid #d97706' : '2px solid #e2e8f0',
                      borderRadius: '12px',
                      padding: '14px',
                      background: form.ukuranKertas === 'F4' ? '#fef3c7' : '#f8fafc',
                      cursor: 'pointer',
                      textAlign: 'left',
                      transition: 'all 0.2s ease',
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '12px',
                    }}
                  >
                    <div
                      style={{
                        width: '26px',
                        height: '42px',
                        background: form.ukuranKertas === 'F4' ? '#d97706' : '#cbd5e1',
                        borderRadius: '3px',
                        flexShrink: 0,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <span style={{ color: '#fff', fontSize: '8px', fontWeight: '700', fontFamily: 'sans-serif' }}>F4</span>
                    </div>
                    <div>
                      <p style={{ margin: 0, fontWeight: '700', fontSize: '13px', color: form.ukuranKertas === 'F4' ? '#d97706' : '#374151' }}>
                        Kertas F4 (Folio)
                      </p>
                      <p style={{ margin: '2px 0 0 0', fontSize: '11px', color: '#64748b' }}>
                        215 × 330 mm
                      </p>
                      {form.ukuranKertas === 'F4' && (
                        <span style={{ marginTop: '5px', display: 'inline-block', fontSize: '9px', background: '#d97706', color: '#fff', padding: '1px 6px', borderRadius: '10px', fontWeight: '700' }}>
                          ✓ Dipilih
                        </span>
                      )}
                    </div>
                  </button>
                </div>
              </div>

              {/* Sub 2: Posisi Dokumen (Landscape / Portrait) */}
              <div>
                <label className="input-label" style={{ fontWeight: '700', marginBottom: '8px', display: 'block' }}>
                  B. Posisi Dokumen (Orientasi Halaman)
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  {/* Pilihan Potrait */}
                  <button
                    type="button"
                    onClick={() => setForm({ ...form, posisiDokumen: 'portrait' })}
                    style={{
                      border: form.posisiDokumen === 'portrait' ? '2px solid #0089d7' : '2px solid #e2e8f0',
                      borderRadius: '12px',
                      padding: '14px',
                      background: form.posisiDokumen === 'portrait' ? '#eff6ff' : '#f8fafc',
                      cursor: 'pointer',
                      textAlign: 'left',
                      transition: 'all 0.2s ease',
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '12px',
                    }}
                  >
                    <div
                      style={{
                        width: '24px',
                        height: '34px',
                        border: form.posisiDokumen === 'portrait' ? '2px solid #0089d7' : '2px solid #94a3b8',
                        background: form.posisiDokumen === 'portrait' ? '#bfdbfe' : '#e2e8f0',
                        borderRadius: '3px',
                        flexShrink: 0,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <span style={{ fontSize: '10px' }}>📄</span>
                    </div>
                    <div>
                      <p style={{ margin: 0, fontWeight: '700', fontSize: '13px', color: form.posisiDokumen === 'portrait' ? '#0089d7' : '#374151' }}>
                        Potrait (Tegak)
                      </p>
                      <p style={{ margin: '2px 0 0 0', fontSize: '11px', color: '#64748b', lineHeight: '1.3' }}>
                        Orientasi vertikal dokumen standar dinas
                      </p>
                      {form.posisiDokumen === 'portrait' && (
                        <span style={{ marginTop: '5px', display: 'inline-block', fontSize: '9px', background: '#0089d7', color: '#fff', padding: '1px 6px', borderRadius: '10px', fontWeight: '700' }}>
                          ✓ Aktif
                        </span>
                      )}
                    </div>
                  </button>

                  {/* Pilihan Landscape */}
                  <button
                    type="button"
                    onClick={() => setForm({ ...form, posisiDokumen: 'landscape' })}
                    style={{
                      border: form.posisiDokumen === 'landscape' ? '2px solid #10b981' : '2px solid #e2e8f0',
                      borderRadius: '12px',
                      padding: '14px',
                      background: form.posisiDokumen === 'landscape' ? '#ecfdf5' : '#f8fafc',
                      cursor: 'pointer',
                      textAlign: 'left',
                      transition: 'all 0.2s ease',
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '12px',
                    }}
                  >
                    <div
                      style={{
                        width: '34px',
                        height: '24px',
                        border: form.posisiDokumen === 'landscape' ? '2px solid #10b981' : '2px solid #94a3b8',
                        background: form.posisiDokumen === 'landscape' ? '#a7f3d0' : '#e2e8f0',
                        borderRadius: '3px',
                        flexShrink: 0,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <span style={{ fontSize: '10px' }}>📋</span>
                    </div>
                    <div>
                      <p style={{ margin: 0, fontWeight: '700', fontSize: '13px', color: form.posisiDokumen === 'landscape' ? '#059669' : '#374151' }}>
                        Landscap (Mendatar)
                      </p>
                      <p style={{ margin: '2px 0 0 0', fontSize: '11px', color: '#64748b', lineHeight: '1.3' }}>
                        Mendatar — Sangat pas untuk Laporan Kinerja dengan banyak tabel
                      </p>
                      {form.posisiDokumen === 'landscape' && (
                        <span style={{ marginTop: '5px', display: 'inline-block', fontSize: '9px', background: '#10b981', color: '#fff', padding: '1px 6px', borderRadius: '10px', fontWeight: '700' }}>
                          ✓ Aktif (Lebar)
                        </span>
                      )}
                    </div>
                  </button>
                </div>
              </div>

              {/* Sub 3: Checklist Sembunyikan NIP Kalurahan */}
              <div
                style={{
                  background: form.sembunyikanNip ? '#fffbeb' : '#f8fafc',
                  border: `1.5px solid ${form.sembunyikanNip ? '#fcd34d' : '#e2e8f0'}`,
                  borderRadius: '12px',
                  padding: '14px 16px',
                  transition: 'all 0.2s ease',
                }}
              >
                <label style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={form.sembunyikanNip}
                    onChange={(e) => setForm({ ...form, sembunyikanNip: e.target.checked })}
                    style={{ width: '18px', height: '18px', marginTop: '2px', accentColor: '#d97706', cursor: 'pointer' }}
                  />
                  <div>
                    <span style={{ fontSize: '13.5px', fontWeight: '700', color: form.sembunyikanNip ? '#92400e' : '#1e293b' }}>
                      Sembunyikan NIP (Hidden)
                    </span>
                    <span style={{ display: 'block', fontSize: '11.5px', color: '#64748b', marginTop: '2px', lineHeight: '1.4' }}>
                      Centang opsi ini karena di Kalurahan perangkat/pamong tidak menggunakan NIP. Teks NIP akan otomatis dihilangkan dari tabel identitas pegawai dan tanda tangan.
                    </span>
                  </div>
                </label>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '10px 12px', background: '#f0fdf4', borderRadius: '8px', border: '1px solid #bbf7d0' }}>
                <span style={{ fontSize: '14px' }}>ℹ️</span>
                <span style={{ fontSize: '12px', color: '#166534' }}>
                  Format: Kertas <strong>{form.ukuranKertas}</strong> · Posisi <strong>{form.posisiDokumen === 'landscape' ? 'Landscap' : 'Potrait'}</strong> · NIP: <strong>{form.sembunyikanNip ? 'Disembunyikan (Hidden)' : 'Ditampilkan'}</strong>.
                </span>
              </div>
            </div>

            {/* 3. TEMPLATE TANDA TANGAN & ATASAN */}
            <div
              className="glass-card-static"
              style={{
                padding: '24px',
                background: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: '16px',
                display: 'flex',
                flexDirection: 'column',
                gap: '18px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', borderBottom: '1px solid #f1f5f9', paddingBottom: '14px' }}>
                <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#f5f3ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <IconUser size={18} color="#7c3aed" />
                </div>
                <div>
                  <h3 style={{ fontSize: '16px', fontWeight: '700', color: '#0f172a', margin: 0 }}>
                    3. Template Kolom Tanda Tangan & Atasan
                  </h3>
                  <p style={{ fontSize: '12px', color: '#64748b', margin: '2px 0 0 0' }}>
                    Format tanda tangan pembuat dokumen dan atasan yang menyetujui
                  </p>
                </div>
              </div>

              {/* Tempat Penetapan */}
              <div>
                <label className="input-label" style={{ fontWeight: '600' }}>
                  Tempat / Kota Penetapan Tanggal
                </label>
                <input
                  type="text"
                  className="input-field"
                  placeholder="Contoh: Pengasih"
                  value={form.ttdTempat}
                  onChange={(e) => setForm({ ...form, ttdTempat: e.target.value })}
                  required
                />
                <span style={{ fontSize: '11px', color: '#64748b', marginTop: '4px', display: 'block' }}>
                  Akan tercetak di sisi kanan atas tanda tangan atasan: <em>{form.ttdTempat || 'Pengasih'}, {todayFormatted}</em>
                </span>
              </div>

              {/* Sisi Kiri (Pembuat Laporan) */}
              <div style={{ background: '#f8fafc', padding: '14px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                <label className="input-label" style={{ fontWeight: '700', color: '#334155' }}>
                  Kolom Kiri: Pembuat Dokumen / Laporan
                </label>
                <div style={{ marginTop: '8px' }}>
                  <label className="input-label" style={{ fontSize: '12px' }}>Label Judul Penandatangan Kiri</label>
                  <input
                    type="text"
                    className="input-field"
                    placeholder="Contoh: Yang Membuat Laporan atau Yang Bersangkutan"
                    value={form.ttdJudulKiri}
                    onChange={(e) => setForm({ ...form, ttdJudulKiri: e.target.value })}
                  />
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '8px', color: '#0369a1', fontSize: '12px' }}>
                  <IconInfo size={14} color="#0369a1" />
                  <span>
                    Nama & NIP kolom kiri akan otomatis terisi nama pegawai yang membuat laporan (atau nama admin jika admin yang mencetak).
                  </span>
                </div>
              </div>

              {/* Sisi Kanan: Persetujuan Atasan */}
              <div style={{ background: '#eff6ff', padding: '16px', borderRadius: '12px', border: '1px solid #bfdbfe' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                  <label className="input-label" style={{ fontWeight: '700', color: '#1e3a8a', marginBottom: 0 }}>
                    Kolom Kanan Bawah: Tanda Tangan Atasan (Approval)
                  </label>
                  <span className="badge badge-info" style={{ fontSize: '10px' }}>Wajib Ada</span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  {/* Dropdown Pilih Atasan dari Daftar Pegawai */}
                  <div>
                    <label className="input-label" style={{ fontSize: '12px', color: '#1e40af', fontWeight: '700' }}>
                      👤 Pilih Pejabat / Atasan dari Daftar Pegawai
                    </label>
                    <select
                      className="input-field"
                      style={{ background: '#ffffff', borderColor: '#93c5fd', fontWeight: '600', color: '#0f172a' }}
                      value={form.ttdAtasanUserId}
                      onChange={(e) => handleSelectAtasan(e.target.value)}
                    >
                      <option value="">-- Pilih dari Daftar Pegawai / Admin --</option>
                      {pejabatList.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.nama} ({p.jabatan || 'Pamong'}) — NIP: {p.nip} [{p.role}]
                        </option>
                      ))}
                    </select>
                    <span style={{ fontSize: '11px', color: '#2563eb', marginTop: '4px', display: 'block' }}>
                      💡 Memilih pegawai di atas akan otomatis mengisi Nama, NIP, dan Jabatan atasan di bawah ini.
                    </span>
                  </div>

                  {/* Status Approval */}
                  <div>
                    <label className="input-label" style={{ fontSize: '12px' }}>Status Persetujuan</label>
                    <input
                      type="text"
                      className="input-field"
                      placeholder="Contoh: Mengetahui, atau Menyetujui,"
                      value={form.ttdAtasanStatus}
                      onChange={(e) => setForm({ ...form, ttdAtasanStatus: e.target.value })}
                    />
                  </div>

                  {/* Jabatan Atasan */}
                  <div>
                    <label className="input-label" style={{ fontSize: '12px' }}>Jabatan Atasan Penandatangan</label>
                    <input
                      type="text"
                      className="input-field"
                      placeholder="Contoh: Panewu Pengasih atau Lurah Pengasih"
                      value={form.ttdAtasanJabatan}
                      onChange={(e) => setForm({ ...form, ttdAtasanJabatan: e.target.value })}
                      required
                    />
                  </div>

                  {/* Nama Atasan */}
                  <div>
                    <label className="input-label" style={{ fontSize: '12px' }}>Nama Lengkap & Gelar Atasan</label>
                    <input
                      type="text"
                      className="input-field"
                      placeholder="Contoh: Drs. H. Sukirno, M.Si"
                      value={form.ttdAtasanNama}
                      onChange={(e) => setForm({ ...form, ttdAtasanNama: e.target.value })}
                      required
                    />
                  </div>

                  {/* NIP Atasan */}
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <label className="input-label" style={{ fontSize: '12px' }}>NIP Atasan</label>
                      {form.sembunyikanNip && (
                        <span style={{ fontSize: '11px', color: '#d97706', fontWeight: '600' }}>
                          Opsional (NIP disembunyikan)
                        </span>
                      )}
                    </div>
                    <input
                      type="text"
                      className="input-field"
                      placeholder="Contoh: 19720315 199803 1 005 (Kosongkan jika Lurah / tanpa NIP)"
                      value={form.ttdAtasanNip}
                      onChange={(e) => setForm({ ...form, ttdAtasanNip: e.target.value })}
                    />
                    <span style={{ fontSize: '11px', color: '#64748b', marginTop: '3px', display: 'block' }}>
                      Jika atasan berstatus Pamong/Lurah atau Kalurahan tidak menggunakan NIP, kolom ini dapat dikosongkan.
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Tombol Simpan */}
            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                type="submit"
                disabled={loading}
                className="btn-primary"
                style={{
                  flex: 1,
                  padding: '14px 24px',
                  fontSize: '15px',
                  fontWeight: '700',
                  borderRadius: '12px',
                  boxShadow: '0 4px 14px rgba(0, 137, 215, 0.3)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                }}
              >
                {loading ? (
                  <>
                    <div className="spinner" style={{ width: '18px', height: '18px' }} />
                    <span>Menyimpan Pengaturan Format...</span>
                  </>
                ) : (
                  <>
                    <IconCheckCircle size={18} color="#ffffff" />
                    <span>Simpan Format Laporan</span>
                  </>
                )}
              </button>
            </div>
          </form>

          {/* KOLOM KANAN: LIVE INTERACTIVE PREVIEW */}
          <div style={{ position: 'sticky', top: '24px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
              <span style={{ fontSize: '13px', fontWeight: '700', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                📄 Live Preview Lembar Cetak
              </span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                {/* Checklist Cepat NIP di Toolbar Preview */}
                <label
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    cursor: 'pointer',
                    padding: '4px 10px',
                    borderRadius: '8px',
                    background: form.sembunyikanNip ? '#fef3c7' : '#f1f5f9',
                    border: `1px solid ${form.sembunyikanNip ? '#f59e0b' : '#cbd5e1'}`,
                    fontSize: '11px',
                    fontWeight: '700',
                    color: form.sembunyikanNip ? '#92400e' : '#475569',
                    transition: 'all 0.15s ease',
                  }}
                  title="Klik untuk menyembunyikan / memunculkan NIP di pratinjau"
                >
                  <input
                    type="checkbox"
                    checked={form.sembunyikanNip}
                    onChange={(e) => setForm({ ...form, sembunyikanNip: e.target.checked })}
                    style={{ cursor: 'pointer', accentColor: '#d97706' }}
                  />
                  <span>Sembunyikan NIP (Hidden)</span>
                </label>

                {/* Badge ukuran & orientasi aktif */}
                <span
                  className="badge"
                  style={{
                    fontSize: '11px',
                    padding: '3px 10px',
                    background: form.ukuranKertas === 'F4' ? '#fef3c7' : '#eff6ff',
                    color: form.ukuranKertas === 'F4' ? '#92400e' : '#1e40af',
                    border: `1px solid ${form.ukuranKertas === 'F4' ? '#fcd34d' : '#93c5fd'}`,
                    borderRadius: '20px',
                    fontWeight: '700',
                  }}
                >
                  {form.ukuranKertas === 'F4' ? '📋 F4' : '📄 A4'} · {form.posisiDokumen === 'landscape' ? 'Landscap (Mendatar)' : 'Potrait (Tegak)'}
                </span>
                <span className="badge badge-success" style={{ fontSize: '11px' }}>
                  Pratinjau Nyata
                </span>
              </div>
            </div>

            {/* Kertas Simulasi - proporsi dan lebar berubah sesuai ukuran & orientasi */}
            {/* Portrait: A4 = 210/297, F4 = 215/330 | Landscape: A4 = 297/210, F4 = 330/215 */}
            <div
              style={{
                background: '#f0f4f8',
                borderRadius: '10px',
                padding: '12px',
                display: 'flex',
                justifyContent: 'center',
                overflowX: 'auto',
              }}
            >
            <div
              style={{
                background: '#ffffff',
                border: '1px solid #cbd5e1',
                borderRadius: '4px',
                boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.18), 0 8px 10px -6px rgba(0, 0, 0, 0.12)',
                padding: form.posisiDokumen === 'landscape' ? '28px 32px' : '36px 28px',
                fontFamily: "'Times New Roman', Times, serif",
                color: '#000000',
                width: '100%',
                maxWidth: form.posisiDokumen === 'landscape' ? '680px' : '480px',
                aspectRatio: form.posisiDokumen === 'landscape'
                  ? (form.ukuranKertas === 'F4' ? '330 / 215' : '297 / 210')
                  : (form.ukuranKertas === 'F4' ? '215 / 330' : '210 / 297'),
                position: 'relative',
                transition: 'all 0.3s ease',
                overflow: 'hidden',
              }}
            >
              {/* Label ukuran kertas & orientasi di pojok kanan atas preview */}
              <div
                style={{
                  position: 'absolute',
                  top: '8px',
                  right: '8px',
                  background: form.posisiDokumen === 'landscape' ? '#ecfdf5' : form.ukuranKertas === 'F4' ? '#fef3c7' : '#dbeafe',
                  color: form.posisiDokumen === 'landscape' ? '#047857' : form.ukuranKertas === 'F4' ? '#92400e' : '#1e40af',
                  fontSize: '9px',
                  fontWeight: '800',
                  padding: '2px 8px',
                  borderRadius: '10px',
                  fontFamily: 'sans-serif',
                  letterSpacing: '0.04em',
                  border: `1px solid ${form.posisiDokumen === 'landscape' ? '#a7f3d0' : '#cbd5e1'}`,
                }}
              >
                {form.ukuranKertas === 'F4' ? 'F4 · 215×330 mm' : 'A4 · 210×297 mm'} ({form.posisiDokumen === 'landscape' ? 'Landscap' : 'Potrait'})
              </div>

              {/* KOP PREVIEW */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '14px',
                  borderBottom: '3px double #000000',
                  paddingBottom: '12px',
                  marginBottom: '16px',
                  textAlign: 'center',
                }}
              >
                {form.kopLogoUrl && (
                  <img
                    src={form.kopLogoUrl}
                    alt="Logo Kop"
                    style={{ width: '60px', height: '60px', objectFit: 'contain', flexShrink: 0 }}
                  />
                )}
                <div style={{ flex: 1 }}>
                  <h4 style={{ fontSize: '14px', fontWeight: '800', textTransform: 'uppercase', margin: 0, letterSpacing: '0.5px' }}>
                    {form.kopNamaPemda || 'PEMERINTAH DAERAH'}
                  </h4>
                  <h3 style={{ fontSize: '13px', fontWeight: '800', textTransform: 'uppercase', margin: '2px 0 0 0' }}>
                    {form.kopNamaInstansi || 'NAMA INSTANSI'}
                  </h3>
                  <p style={{ fontSize: '10px', margin: '2px 0 0 0', lineHeight: '1.3' }}>
                    {form.kopAlamat || 'Alamat Kantor Lengkap'}
                  </p>
                  <p style={{ fontSize: '9px', margin: '1px 0 0 0' }}>
                    {form.kopKontak || 'Kontak Telepon & Pos-el'}
                  </p>
                </div>
              </div>

              {/* JUDUL DOKUMEN PREVIEW */}
              <div style={{ textAlign: 'center', marginBottom: '14px' }}>
                <div style={{ fontSize: '13px', fontWeight: '700', textDecoration: 'underline', textTransform: 'uppercase' }}>
                  LAPORAN REKAPITULASI KINERJA PAMONG
                </div>
              </div>

              {/* INFO PEGAWAI PREVIEW (NIP disembunyikan jika checklist aktif) */}
              <div style={{ fontSize: '10px', marginBottom: '12px' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <tbody>
                    <tr>
                      <td style={{ width: '80px', padding: '1px 0' }}>Nama</td>
                      <td style={{ width: '10px' }}>:</td>
                      <td style={{ fontWeight: '700' }}>Nama Pegawai / Pamong</td>
                    </tr>
                    {!form.sembunyikanNip && (
                      <tr>
                        <td style={{ padding: '1px 0' }}>NIP</td>
                        <td>:</td>
                        <td>19850101 201001 1 001</td>
                      </tr>
                    )}
                    <tr>
                      <td style={{ padding: '1px 0' }}>Jabatan</td>
                      <td>:</td>
                      <td>Jagabaya / Carik</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* MINI TABEL PREVIEW (Menyesuaikan Landscape / Portrait) */}
              {form.posisiDokumen === 'landscape' ? (
                /* TABEL FORMAT LANDSCAPE (8 Kolom Nyata) */
                <table
                  style={{
                    width: '100%',
                    borderCollapse: 'collapse',
                    fontSize: '8.5px',
                    marginBottom: '20px',
                    textAlign: 'left',
                  }}
                >
                  <thead>
                    <tr style={{ background: '#f1f5f9' }}>
                      <th style={{ border: '1px solid #000', padding: '3px', textAlign: 'center', width: '24px' }}>No</th>
                      <th style={{ border: '1px solid #000', padding: '3px' }}>Bulan</th>
                      <th style={{ border: '1px solid #000', padding: '3px' }}>Rencana Kegiatan</th>
                      <th style={{ border: '1px solid #000', padding: '3px' }}>Output</th>
                      <th style={{ border: '1px solid #000', padding: '3px', textAlign: 'center' }}>Target</th>
                      <th style={{ border: '1px solid #000', padding: '3px', textAlign: 'center' }}>Capaian</th>
                      <th style={{ border: '1px solid #000', padding: '3px' }}>Keterangan Pelaksanaan</th>
                      <th style={{ border: '1px solid #000', padding: '3px' }}>Pedoman Pengisian</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td style={{ border: '1px solid #000', padding: '3px', textAlign: 'center' }}>1</td>
                      <td style={{ border: '1px solid #000', padding: '3px', whiteSpace: 'nowrap' }}>September 2026</td>
                      <td style={{ border: '1px solid #000', padding: '3px' }}>Pelayanan administrasi kependudukan</td>
                      <td style={{ border: '1px solid #000', padding: '3px' }}>Dokumen Pelayanan</td>
                      <td style={{ border: '1px solid #000', padding: '3px', textAlign: 'center' }}>25</td>
                      <td style={{ border: '1px solid #000', padding: '3px', textAlign: 'center', fontWeight: '700', color: '#059669' }}>25 (100%)</td>
                      <td style={{ border: '1px solid #000', padding: '3px' }}>Pelayanan harian warga berjalan lancar</td>
                      <td style={{ border: '1px solid #000', padding: '3px', color: '#64748b', fontStyle: 'italic' }}>-Diisi jumlah kegiatan</td>
                    </tr>
                  </tbody>
                </table>
              ) : (
                /* TABEL FORMAT POTRAIT (6 Kolom Ringkas) */
                <table
                  style={{
                    width: '100%',
                    borderCollapse: 'collapse',
                    fontSize: '9px',
                    marginBottom: '20px',
                    textAlign: 'left',
                  }}
                >
                  <thead>
                    <tr style={{ background: '#f1f5f9' }}>
                      <th style={{ border: '1px solid #000', padding: '4px', textAlign: 'center' }}>No</th>
                      <th style={{ border: '1px solid #000', padding: '4px' }}>Bulan</th>
                      <th style={{ border: '1px solid #000', padding: '4px' }}>Rencana Tugas</th>
                      <th style={{ border: '1px solid #000', padding: '4px', textAlign: 'center' }}>Target</th>
                      <th style={{ border: '1px solid #000', padding: '4px', textAlign: 'center' }}>Realisasi</th>
                      <th style={{ border: '1px solid #000', padding: '4px', textAlign: 'center' }}>%</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td style={{ border: '1px solid #000', padding: '4px', textAlign: 'center' }}>1</td>
                      <td style={{ border: '1px solid #000', padding: '4px' }}>September 2026</td>
                      <td style={{ border: '1px solid #000', padding: '4px' }}>Pelayanan administrasi kependudukan</td>
                      <td style={{ border: '1px solid #000', padding: '4px', textAlign: 'center' }}>25</td>
                      <td style={{ border: '1px solid #000', padding: '4px', textAlign: 'center' }}>25</td>
                      <td style={{ border: '1px solid #000', padding: '4px', textAlign: 'center', fontWeight: '700' }}>100%</td>
                    </tr>
                  </tbody>
                </table>
              )}

              {/* TANDA TANGAN PREVIEW */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  marginTop: '24px',
                  fontSize: '10px',
                  pageBreakInside: 'avoid',
                }}
              >
                {/* Kolom Kiri: Pembuat Laporan */}
                <div style={{ textAlign: 'center', minWidth: '150px' }}>
                  <p style={{ margin: 0, fontWeight: '500' }}>{form.ttdJudulKiri || 'Yang Membuat Laporan'},</p>
                  <p style={{ margin: '1px 0 0 0', color: '#64748b', fontSize: '9px' }}>[Pembuat Dokumen]</p>
                  <div style={{ height: form.posisiDokumen === 'landscape' ? '38px' : '48px' }} />
                  <p style={{ margin: 0, fontWeight: '700', textDecoration: 'underline' }}>
                    Nama Pegawai / Pamong
                  </p>
                  {!form.sembunyikanNip ? (
                    <p style={{ margin: 0, fontSize: '9px' }}>
                      NIP. 19850101 201001 1 001
                    </p>
                  ) : (
                    <p style={{ margin: 0, fontSize: '9px', color: '#475569' }}>
                      Pamong Kalurahan
                    </p>
                  )}
                </div>

                {/* Kolom Kanan: Atasan */}
                <div style={{ textAlign: 'center', minWidth: '150px' }}>
                  <p style={{ margin: 0 }}>
                    {form.ttdTempat || 'Pengasih'}, {todayFormatted}
                  </p>
                  <p style={{ margin: '1px 0 0 0' }}>{form.ttdAtasanStatus || 'Mengetahui,'}</p>
                  <p style={{ margin: '1px 0 0 0', fontWeight: '700' }}>{form.ttdAtasanJabatan || 'Panewu Pengasih'}</p>
                  <div style={{ height: form.posisiDokumen === 'landscape' ? '32px' : '40px' }} />
                  <p style={{ margin: 0, fontWeight: '700', textDecoration: 'underline' }}>
                    {form.ttdAtasanNama || '.................................'}
                  </p>
                  {!form.sembunyikanNip && form.ttdAtasanNip ? (
                    <p style={{ margin: 0, fontSize: '9px' }}>
                      NIP. {form.ttdAtasanNip}
                    </p>
                  ) : null}
                </div>
              </div>
            </div>
            </div>

            <div style={{ padding: '10px 14px', background: '#f8fafc', borderRadius: '10px', border: '1px solid #e2e8f0', fontSize: '12px', color: '#64748b' }}>
              💡 Dokumen cetak otomatis menggunakan format <strong>{form.ukuranKertas}</strong> dengan posisi <strong>{form.posisiDokumen === 'landscape' ? 'Landscap (Mendatar)' : 'Potrait (Tegak)'}</strong>. {form.sembunyikanNip ? 'Teks NIP disembunyikan sesuai standar Pamong Kalurahan.' : 'Teks NIP tetap ditampilkan.'}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
