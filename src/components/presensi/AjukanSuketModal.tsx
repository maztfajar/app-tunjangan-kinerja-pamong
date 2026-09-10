'use client';

import { useState, useEffect, useMemo } from 'react';
import { IconFileText, IconClose } from '@/components/ui/Icons';

interface PresensiInfo {
  id?: string;
  jamMasuk?: string | null;
  jamPulang?: string | null;
  keterlambatan?: number | null;
  mendahului?: number | null;
  suket?: string | null;
}

interface AjukanSuketModalProps {
  isOpen: boolean;
  onClose: () => void;
  tanggal: Date | null;
  presensi: PresensiInfo | null;
  onSuccess?: () => void;
}

const JENIS_SUKET_OPTIONS = [
  'Tugas Luar / Dinas Luar',
  'Lupa Absen',
  'Kendala Jaringan / Error Sistem',
  'Izin Kepentingan Dinas',
  'Izin Kepentingan Mendesak',
  'Sakit (Dengan Keterangan)',
  'Lainnya',
];

export default function AjukanSuketModal({
  isOpen,
  onClose,
  tanggal,
  presensi,
  onSuccess,
}: AjukanSuketModalProps) {
  const [jenisSuket, setJenisSuket] = useState('');
  const [keterangan, setKeterangan] = useState('');
  const [tipeSuket, setTipeSuket] = useState<'masuk' | 'pulang' | 'seharian' | 'koreksi'>('seharian');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Tentukan default tipe suket berdasarkan kondisi presensi
  useEffect(() => {
    if (!isOpen || !tanggal) return;

    setErrorMsg('');
    if (presensi?.suket) {
      try {
        const parsed = JSON.parse(presensi.suket);
        if (parsed.jenisSuket) setJenisSuket(parsed.jenisSuket);
        if (parsed.alasan) setKeterangan(parsed.alasan);
        if (parsed.tipeSuket) setTipeSuket(parsed.tipeSuket);
        return;
      } catch {}
    }

    setJenisSuket('');
    setKeterangan('');

    const adaMasuk = !!presensi?.jamMasuk;
    const adaPulang = !!presensi?.jamPulang;

    if (adaMasuk && !adaPulang) {
      setTipeSuket('pulang');
    } else if (!adaMasuk && adaPulang) {
      setTipeSuket('masuk');
    } else if (!adaMasuk && !adaPulang) {
      setTipeSuket('seharian');
    } else {
      setTipeSuket('koreksi');
    }
  }, [isOpen, tanggal, presensi]);

  // Format tanggal Indonesia lengkap dengan nama hari
  const formattedDate = useMemo(() => {
    if (!tanggal) return '';
    return tanggal.toLocaleDateString('id-ID', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  }, [tanggal]);

  if (!isOpen || !tanggal) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!jenisSuket || jenisSuket === 'Pilih jenis Suket') {
      setErrorMsg('Silakan pilih jenis suket.');
      return;
    }
    if (!keterangan.trim()) {
      setErrorMsg('Keterangan alasan tidak boleh kosong.');
      return;
    }

    setLoading(true);
    setErrorMsg('');

    try {
      const y = tanggal.getFullYear();
      const m = String(tanggal.getMonth() + 1).padStart(2, '0');
      const d = String(tanggal.getDate()).padStart(2, '0');
      const tanggalStr = `${y}-${m}-${d}`;

      const res = await fetch('/api/presensi/suket', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tanggal: tanggalStr,
          jenisSuket,
          keterangan: keterangan.trim(),
          tipeSuket,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Gagal mengajukan suket');
      }

      if (onSuccess) onSuccess();
      onClose();
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Terjadi kesalahan saat mengajukan suket');
    } finally {
      setLoading(false);
    }
  };

  const adaMasuk = !!presensi?.jamMasuk;
  const adaPulang = !!presensi?.jamPulang;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.45)',
        backdropFilter: 'blur(4px)',
        WebkitBackdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        padding: '16px',
        animation: 'fadeIn 0.2s ease',
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: '#ffffff',
          borderRadius: '16px',
          padding: '24px 28px',
          maxWidth: '480px',
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
              <IconFileText size={20} color="#2563eb" />
              <h3 style={{ fontSize: '18px', fontWeight: '800', color: '#0f172a' }}>
                Ajukan Suket
              </h3>
            </div>
            <p style={{ fontSize: '13px', color: '#64748b', marginTop: '4px' }}>
              Tanggal: {formattedDate}
            </p>
          </div>
          <button
            onClick={onClose}
            disabled={loading}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#64748b',
              cursor: loading ? 'not-allowed' : 'pointer',
              padding: '4px',
              borderRadius: '6px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            title="Tutup"
          >
            <IconClose size={18} color="#64748b" />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Tipe Suket / Keterangan Presensi (Sesuai Mockup) */}
          <div
            style={{
              padding: '10px 14px',
              borderRadius: '10px',
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              fontSize: '13px',
            }}
          >
            <input
              type="checkbox"
              id="tipeSuketCheck"
              checked={true}
              readOnly
              style={{
                accentColor: '#2563eb',
                width: '16px',
                height: '16px',
                cursor: 'default',
              }}
            />
            <label htmlFor="tipeSuketCheck" style={{ fontWeight: '600', color: '#1e293b', cursor: 'default' }}>
              {adaMasuk && !adaPulang && 'Suket Pulang'}
              {!adaMasuk && adaPulang && 'Suket Masuk'}
              {!adaMasuk && !adaPulang && 'Suket Seharian (Masuk & Pulang)'}
              {adaMasuk && adaPulang && 'Suket Keterlambatan / Pulang Cepat'}
            </label>
            <span style={{ fontSize: '11.5px', color: '#94a3b8', fontStyle: 'italic', marginLeft: 'auto' }}>
              {adaMasuk && !adaPulang && 'Presensi masuk sudah ada'}
              {!adaMasuk && adaPulang && 'Presensi pulang sudah ada'}
              {!adaMasuk && !adaPulang && 'Belum ada presensi'}
              {adaMasuk && adaPulang && 'Presensi lengkap (koreksi)'}
            </span>
          </div>

          {/* Dropdown Jenis Suket */}
          <div>
            <label
              style={{
                display: 'block',
                fontSize: '13px',
                fontWeight: '600',
                color: '#334155',
                marginBottom: '6px',
              }}
            >
              Jenis Suket
            </label>
            <select
              value={jenisSuket}
              onChange={(e) => setJenisSuket(e.target.value)}
              required
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                background: '#ffffff',
                color: '#0f172a',
                fontSize: '13.5px',
                outline: 'none',
                cursor: 'pointer',
                fontFamily: 'inherit',
              }}
            >
              <option value="">Pilih jenis Suket</option>
              {JENIS_SUKET_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </div>

          {/* Textarea Keterangan */}
          <div>
            <label
              style={{
                display: 'block',
                fontSize: '13px',
                fontWeight: '600',
                color: '#334155',
                marginBottom: '6px',
              }}
            >
              Keterangan <span style={{ color: '#dc2626' }}>*</span>
            </label>
            <textarea
              value={keterangan}
              onChange={(e) => setKeterangan(e.target.value)}
              placeholder="Jelaskan alasan tidak bisa melakukan presensi..."
              rows={4}
              required
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                fontSize: '13px',
                color: '#0f172a',
                outline: 'none',
                resize: 'vertical',
                fontFamily: 'inherit',
                lineHeight: '1.5',
              }}
            />
          </div>

          {errorMsg && (
            <div
              style={{
                padding: '10px 12px',
                borderRadius: '8px',
                background: '#fef2f2',
                border: '1px solid #fecaca',
                color: '#dc2626',
                fontSize: '12.5px',
              }}
            >
              {errorMsg}
            </div>
          )}

          {/* Tombol Aksi (Batal & Ajukan Suket) */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '8px' }}>
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              style={{
                padding: '9px 18px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                background: '#ffffff',
                color: '#475569',
                fontSize: '13px',
                fontWeight: '600',
                cursor: loading ? 'not-allowed' : 'pointer',
              }}
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={loading}
              style={{
                padding: '9px 20px',
                borderRadius: '8px',
                border: 'none',
                background: '#1d4ed8',
                color: '#ffffff',
                fontSize: '13px',
                fontWeight: '700',
                cursor: loading ? 'not-allowed' : 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                boxShadow: '0 2px 8px rgba(29, 78, 216, 0.3)',
              }}
            >
              {loading && <div className="spinner" style={{ width: '14px', height: '14px' }} />}
              <span>Ajukan Suket</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
