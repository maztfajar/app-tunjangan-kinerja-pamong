'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  IconSettings,
  IconCheckCircle,
  IconInfo,
  IconCamera,
  IconEKinerjaLogo,
} from '@/components/ui/Icons';

export default function SuperAdminPengaturanPage() {
  const [form, setForm] = useState({
    namaApp: 'E-KINERJA',
    namaKantor: 'Kalurahan',
    subJudul: 'Sistem Informasi Pamong',
    logoUrl: '',
  });
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    fetch('/api/settings')
      .then((r) => r.json())
      .then((d) => {
        if (d.settings) {
          setForm({
            namaApp: d.settings.namaApp || 'E-KINERJA',
            namaKantor: d.settings.namaKantor || 'Kalurahan',
            subJudul: d.settings.subJudul || 'Sistem Informasi Pamong',
            logoUrl: d.settings.logoUrl || '',
          });
        }
      })
      .catch((err) => console.error(err))
      .finally(() => setFetching(false));
  }, []);

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Maksimal 2MB
    if (file.size > 2 * 1024 * 1024) {
      setMessage({ type: 'error', text: 'Ukuran file logo maksimal 2MB.' });
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setForm((prev) => ({ ...prev, logoUrl: reader.result as string }));
    };
    reader.readAsDataURL(file);
  };

  const handleHapusLogo = () => {
    setForm((prev) => ({ ...prev, logoUrl: '' }));
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
        setMessage({ type: 'error', text: data.error || 'Gagal menyimpan pengaturan.' });
      } else {
        setMessage({
          type: 'success',
          text: 'Pengaturan identitas web app & nama kantor berhasil diperbarui! Perubahan akan langsung tampil di seluruh dashboard.',
        });
      }
    } catch {
      setMessage({ type: 'error', text: 'Terjadi kesalahan jaringan saat menyimpan data.' });
    }
    setLoading(false);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', width: '100%' }}>
      {/* Header */}
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
            <IconSettings size={26} color="#0089d7" />
          </div>
          <div>
            <h2 style={{ fontSize: '22px', fontWeight: '800', color: '#0f172a' }}>
              Pengaturan Identitas Web App &amp; Nama Kantor
            </h2>
            <p style={{ fontSize: '14px', color: '#64748b', marginTop: '3px' }}>
              Ubah nama aplikasi, nama kantor/wilayah, dan logo yang akan tampil di seluruh dashboard secara real-time.
            </p>
          </div>
        </div>
        <Link href="/superadmin" className="btn-outline" style={{ fontSize: '13px', fontWeight: '700', padding: '8px 16px' }}>
          ← Kembali ke Dashboard
        </Link>
      </div>

      {/* Info Petunjuk */}
      <div
        style={{
          padding: '18px 22px',
          borderRadius: '14px',
          background: '#f0f9ff',
          border: '1px solid #bae6fd',
          color: '#0369a1',
          fontSize: '14px',
          lineHeight: '1.65',
        }}
      >
        <h4 style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: '800', fontSize: '15px', marginBottom: '8px', color: '#0284c7' }}>
          <IconInfo size={18} color="#0284c7" />
          Informasi Sinkronisasi Tampilan:
        </h4>
        <ul style={{ margin: '0 0 0 20px' }}>
          <li><b>Nama Kantor:</b> Ditampilkan di bagian bawah logo sidebar dan header top-navbar pada dashboard Pegawai, Admin, dan Super Admin.</li>
          <li><b>Nama Aplikasi:</b> Ditampilkan sebagai judul utama sistem (nilai bawaan: <i>E-KINERJA</i>).</li>
          <li><b>Logo Aplikasi:</b> Jika tidak mengunggah logo kustom, sistem otomatis menggunakan icon resmi grafis node geometris E-Kinerja.</li>
        </ul>
      </div>

      {/* Form Pengaturan */}
      <div
        className="glass-card-static animate-slide-up"
        style={{
          padding: '30px',
          background: '#ffffff',
          border: '1px solid #eaedf2',
          borderRadius: '16px',
        }}
      >
        {fetching ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#64748b', fontSize: '15px' }}>
            <div className="spinner" style={{ margin: '0 auto 12px', width: '28px', height: '28px' }} />
            Memuat data pengaturan saat ini...
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>
            {message && (
              <div
                style={{
                  padding: '14px 18px',
                  borderRadius: '12px',
                  background: message.type === 'success' ? '#ecfdf5' : '#fef2f2',
                  border: message.type === 'success' ? '1px solid #a7f3d0' : '1px solid #fecaca',
                  color: message.type === 'success' ? '#065f46' : '#991b1b',
                  fontSize: '14px',
                  fontWeight: '600',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                }}
              >
                {message.type === 'success' ? <IconCheckCircle size={20} color="#059669" /> : '⚠️'}
                <span>{message.text}</span>
              </div>
            )}

            {/* Nama Kantor */}
            <div>
              <label className="input-label" style={{ fontSize: '14px', fontWeight: '800', color: '#1e293b' }}>
                Nama Kantor / Instansi / Wilayah *
              </label>
              <input
                type="text"
                className="input-field"
                placeholder="Contoh: Kalurahan (atau nama kalurahan Anda)"
                value={form.namaKantor}
                onChange={(e) => setForm({ ...form, namaKantor: e.target.value })}
                required
                style={{ marginTop: '8px', fontSize: '15px', padding: '12px 16px' }}
              />
              <p style={{ fontSize: '13px', color: '#64748b', marginTop: '6px' }}>
                Nilai bawaan: <b>Kalurahan</b>. Teks ini akan tampil di seluruh dashboard baik pegawai maupun admin.
              </p>
            </div>

            {/* Nama Aplikasi */}
            <div>
              <label className="input-label" style={{ fontSize: '14px', fontWeight: '800', color: '#1e293b' }}>
                Nama Aplikasi Web *
              </label>
              <input
                type="text"
                className="input-field"
                placeholder="Contoh: E-KINERJA"
                value={form.namaApp}
                onChange={(e) => setForm({ ...form, namaApp: e.target.value })}
                required
                style={{ marginTop: '8px', fontSize: '15px', padding: '12px 16px' }}
              />
              <p style={{ fontSize: '13px', color: '#64748b', marginTop: '6px' }}>
                Nama brand yang tampil di sisi atas sidebar navigasi di semua tingkatan pengguna.
              </p>
            </div>

            {/* Sub Judul */}
            <div>
              <label className="input-label" style={{ fontSize: '14px', fontWeight: '800', color: '#1e293b' }}>
                Sub Judul Sistem
              </label>
              <input
                type="text"
                className="input-field"
                placeholder="Contoh: Sistem Informasi Pamong"
                value={form.subJudul}
                onChange={(e) => setForm({ ...form, subJudul: e.target.value })}
                style={{ marginTop: '8px', fontSize: '15px', padding: '12px 16px' }}
              />
              <p style={{ fontSize: '13px', color: '#64748b', marginTop: '6px' }}>
                Keterangan tambahan pendukung nama aplikasi.
              </p>
            </div>

            {/* Logo / Gambar */}
            <div>
              <label className="input-label" style={{ fontSize: '14px', fontWeight: '800', color: '#1e293b' }}>
                Logo Aplikasi
              </label>
              <div style={{ marginTop: '10px', display: 'flex', alignItems: 'center', gap: '20px', flexWrap: 'wrap' }}>
                {/* Preview Logo */}
                <div
                  style={{
                    width: '72px',
                    height: '72px',
                    borderRadius: '14px',
                    border: '1px solid #e2e8f0',
                    background: '#f8fafc',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    overflow: 'hidden',
                  }}
                >
                  {form.logoUrl ? (
                    <img src={form.logoUrl} alt="Logo Preview" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                  ) : (
                    <IconEKinerjaLogo size={52} />
                  )}
                </div>

                {/* Upload Buttons */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <label
                    className="btn-outline"
                    style={{
                      fontSize: '13px',
                      fontWeight: '700',
                      padding: '10px 18px',
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '8px',
                    }}
                  >
                    <IconCamera size={16} color="#0089d7" />
                    <span>Pilih Logo Baru (PNG / JPG)</span>
                    <input type="file" accept="image/*" onChange={handleLogoUpload} style={{ display: 'none' }} />
                  </label>
                  {form.logoUrl && (
                    <button
                      type="button"
                      onClick={handleHapusLogo}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: '#ef4444',
                        fontSize: '12px',
                        cursor: 'pointer',
                        textAlign: 'left',
                        fontWeight: '700',
                      }}
                    >
                      ✕ Hapus Logo Kustom (Gunakan Bawaan E-Kinerja)
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Live Preview Kotak Brand Sidebar */}
            <div style={{ marginTop: '10px', padding: '16px 20px', borderRadius: '14px', background: '#f8fafc', border: '1px solid #e2e8f0' }}>
              <span style={{ fontSize: '12px', fontWeight: '800', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Pratinjau Tampilan Header Sidebar:
              </span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '12px', background: '#ffffff', padding: '14px 18px', borderRadius: '12px', border: '1px solid #eaedf2', width: 'fit-content' }}>
                {form.logoUrl ? (
                  <img src={form.logoUrl} alt="Preview" style={{ width: '40px', height: '40px', objectFit: 'contain' }} />
                ) : (
                  <IconEKinerjaLogo size={40} />
                )}
                <div>
                  <div style={{ fontSize: '18px', fontWeight: '800', color: '#1e293b', letterSpacing: '-0.02em', lineHeight: '1.2' }}>
                    {form.namaApp || 'E-KINERJA'}
                  </div>
                  <div style={{ fontSize: '11px', fontWeight: '800', color: '#64748b', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                    {form.namaKantor || 'Kalurahan'}
                  </div>
                </div>
              </div>
            </div>

            {/* Submit Button */}
            <div style={{ marginTop: '14px', display: 'flex', gap: '12px' }}>
              <button
                type="submit"
                disabled={loading}
                className="btn-primary"
                style={{
                  background: '#0089d7',
                  padding: '14px 28px',
                  fontSize: '14px',
                  fontWeight: '800',
                  gap: '8px',
                }}
              >
                {loading ? 'Menyimpan Pengaturan...' : '💾 Simpan Perubahan Pengaturan'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
