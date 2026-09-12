'use client';

import { useEffect, useState } from 'react';

interface JamKerjaData {
  jamMasuk: string;
  jamPulang: string;
  toleransiSebelumMasuk: number;
  toleransiKeterlambatan: number;
  toleransiPulang: number;
  durasiKerjaMenit: number;
  isJumatKhusus: boolean;
  jamMasukJumat: string;
  jamPulangJumat: string;
  durasiKerjaJumatMenit: number;
}

function TimePicker24({
  label,
  value,
  onChange,
  helperText,
  disabled = false,
}: {
  label: string;
  value: string;
  onChange: (val: string) => void;
  helperText?: string;
  disabled?: boolean;
}) {
  const [rawH, rawM] = (value || '00:00').split(':');
  const selectedH = String(Number(rawH) || 0).padStart(2, '0');
  const selectedM = String(Number(rawM) || 0).padStart(2, '0');

  const hours = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'));
  const minutes = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, '0'));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', opacity: disabled ? 0.6 : 1 }}>
      <label
        style={{
          fontSize: '12px',
          fontWeight: '700',
          color: '#334155',
          textTransform: 'uppercase',
          letterSpacing: '0.04em',
        }}
      >
        {label}
      </label>

      {/* Modern Clock Container */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          background: '#f8fafc',
          borderRadius: '14px',
          border: '1.5px solid #e2e8f0',
          padding: '8px 14px',
          gap: '10px',
          transition: 'all 0.2s ease',
        }}
      >
        {/* Kolom Jam (00 - 23) */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <span style={{ fontSize: '10px', fontWeight: '600', color: '#94a3b8', letterSpacing: '0.08em', marginBottom: '3px' }}>
            JAM
          </span>
          <select
            value={selectedH}
            disabled={disabled}
            onChange={(e) => onChange(`${e.target.value}:${selectedM}`)}
            style={{
              width: '100%',
              background: '#ffffff',
              border: '1px solid #cbd5e1',
              borderRadius: '8px',
              padding: '7px 10px',
              textAlign: 'center',
              fontSize: '15px',
              fontWeight: '400',
              color: '#0f172a',
              cursor: disabled ? 'not-allowed' : 'pointer',
              outline: 'none',
              boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
            }}
          >
            {hours.map((hr) => (
              <option key={hr} value={hr}>
                {hr}
              </option>
            ))}
          </select>
        </div>

        {/* Separator Titik Dua */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', paddingTop: '15px' }}>
          <span style={{ fontSize: '16px', fontWeight: '500', color: '#64748b' }}>:</span>
        </div>

        {/* Kolom Menit (00 - 59) */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <span style={{ fontSize: '10px', fontWeight: '600', color: '#94a3b8', letterSpacing: '0.08em', marginBottom: '3px' }}>
            MENIT
          </span>
          <select
            value={selectedM}
            disabled={disabled}
            onChange={(e) => onChange(`${selectedH}:${e.target.value}`)}
            style={{
              width: '100%',
              background: '#ffffff',
              border: '1px solid #cbd5e1',
              borderRadius: '8px',
              padding: '7px 10px',
              textAlign: 'center',
              fontSize: '15px',
              fontWeight: '400',
              color: '#0f172a',
              cursor: disabled ? 'not-allowed' : 'pointer',
              outline: 'none',
              boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
            }}
          >
            {minutes.map((mn) => (
              <option key={mn} value={mn}>
                {mn}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Sub Info & Badge Waktu */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 2px' }}>
        <span style={{ fontSize: '11px', color: '#64748b' }}>
          {helperText || `Waktu standar: ${value} WIB`}
        </span>
        <span
          style={{
            fontSize: '12px',
            fontWeight: '800',
            color: '#4338ca',
            background: '#e0e7ff',
            padding: '2px 8px',
            borderRadius: '6px',
          }}
        >
          {value} WIB
        </span>
      </div>
    </div>
  );
}

export default function JamKerjaPage() {
  const [data, setData] = useState<JamKerjaData>({
    jamMasuk: '07:30',
    jamPulang: '15:45',
    toleransiSebelumMasuk: 30,
    toleransiKeterlambatan: 15,
    toleransiPulang: 120,
    durasiKerjaMenit: 495,
    isJumatKhusus: true,
    jamMasukJumat: '07:30',
    jamPulangJumat: '15:30',
    durasiKerjaJumatMenit: 480,
  });
  const [timelineTab, setTimelineTab] = useState<'reguler' | 'jumat'>('reguler');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const fetchJamKerja = async () => {
    try {
      const res = await fetch('/api/jam-kerja');
      const result = await res.json();
      if (result.jamKerja) {
        setData({
          jamMasuk: result.jamKerja.jamMasuk || '07:30',
          jamPulang: result.jamKerja.jamPulang || '15:45',
          toleransiSebelumMasuk: result.jamKerja.toleransiSebelumMasuk ?? 30,
          toleransiKeterlambatan: result.jamKerja.toleransiKeterlambatan ?? 15,
          toleransiPulang: result.jamKerja.toleransiPulang ?? 120,
          durasiKerjaMenit: result.jamKerja.durasiKerjaMenit ?? 495,
          isJumatKhusus: result.jamKerja.isJumatKhusus ?? true,
          jamMasukJumat: result.jamKerja.jamMasukJumat || '07:30',
          jamPulangJumat: result.jamKerja.jamPulangJumat || '15:30',
          durasiKerjaJumatMenit: result.jamKerja.durasiKerjaJumatMenit ?? 480,
        });
      }
    } catch (err) {
      console.error('Gagal memuat jam kerja:', err);
    }
  };

  useEffect(() => {
    fetchJamKerja();
  }, []);

  // Auto-compute durasi reguler dari jamMasuk & jamPulang
  useEffect(() => {
    const [mH, mM] = data.jamMasuk.split(':').map(Number);
    const [pH, pM] = data.jamPulang.split(':').map(Number);
    if (!isNaN(mH) && !isNaN(mM) && !isNaN(pH) && !isNaN(pM)) {
      const durasi = (pH * 60 + pM) - (mH * 60 + mM);
      if (durasi > 0) {
        setData((prev) => ({ ...prev, durasiKerjaMenit: durasi }));
      }
    }
  }, [data.jamMasuk, data.jamPulang]);

  // Auto-compute durasi Jumat dari jamMasukJumat & jamPulangJumat
  useEffect(() => {
    const [mH, mM] = data.jamMasukJumat.split(':').map(Number);
    const [pH, pM] = data.jamPulangJumat.split(':').map(Number);
    if (!isNaN(mH) && !isNaN(mM) && !isNaN(pH) && !isNaN(pM)) {
      const durasi = (pH * 60 + pM) - (mH * 60 + mM);
      if (durasi > 0) {
        setData((prev) => ({ ...prev, durasiKerjaJumatMenit: durasi }));
      }
    }
  }, [data.jamMasukJumat, data.jamPulangJumat]);

  const handleSave = async () => {
    setLoading(true);
    setMessage('');
    try {
      const res = await fetch('/api/jam-kerja', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const result = await res.json();
      if (result.success) {
        setMessage('✅ Setting jam kerja & jadwal Jumat berhasil disimpan!');
      } else {
        setMessage('❌ Gagal menyimpan: ' + (result.error || ''));
      }
    } catch {
      setMessage('❌ Terjadi kesalahan saat menyimpan pengaturan');
    }
    setLoading(false);
    setTimeout(() => setMessage(''), 4000);
  };

  // Helper: compute display times Reguler
  const computeBukaAbsen = () => {
    const [h, m] = data.jamMasuk.split(':').map(Number);
    const totalMin = h * 60 + m - data.toleransiSebelumMasuk;
    const bH = Math.floor(totalMin / 60);
    const bM = totalMin % 60;
    return `${String(bH).padStart(2, '0')}:${String(bM).padStart(2, '0')}`;
  };

  const computeBatasToleransi = () => {
    const [h, m] = data.jamMasuk.split(':').map(Number);
    const totalMin = h * 60 + m + data.toleransiKeterlambatan;
    const bH = Math.floor(totalMin / 60);
    const bM = totalMin % 60;
    return `${String(bH).padStart(2, '0')}:${String(bM).padStart(2, '0')}`;
  };

  const computeBatasPulang = () => {
    const [h, m] = data.jamPulang.split(':').map(Number);
    const totalMin = h * 60 + m + data.toleransiPulang;
    const bH = Math.floor(totalMin / 60);
    const bM = totalMin % 60;
    return `${String(bH).padStart(2, '0')}:${String(bM).padStart(2, '0')}`;
  };

  // Helper: compute display times Jumat
  const computeBukaAbsenJumat = () => {
    const [h, m] = data.jamMasukJumat.split(':').map(Number);
    const totalMin = h * 60 + m - data.toleransiSebelumMasuk;
    const bH = Math.floor(totalMin / 60);
    const bM = totalMin % 60;
    return `${String(bH).padStart(2, '0')}:${String(bM).padStart(2, '0')}`;
  };

  const computeBatasToleransiJumat = () => {
    const [h, m] = data.jamMasukJumat.split(':').map(Number);
    const totalMin = h * 60 + m + data.toleransiKeterlambatan;
    const bH = Math.floor(totalMin / 60);
    const bM = totalMin % 60;
    return `${String(bH).padStart(2, '0')}:${String(bM).padStart(2, '0')}`;
  };

  const computeBatasPulangJumat = () => {
    const [h, m] = data.jamPulangJumat.split(':').map(Number);
    const totalMin = h * 60 + m + data.toleransiPulang;
    const bH = Math.floor(totalMin / 60);
    const bM = totalMin % 60;
    return `${String(bH).padStart(2, '0')}:${String(bM).padStart(2, '0')}`;
  };

  const formatDurasi = (menit: number) => {
    const jam = Math.floor(menit / 60);
    const min = menit % 60;
    return `${jam} Jam ${min} Menit`;
  };

  return (
    <div>
      <div style={{ marginBottom: '28px' }}>
        <h2 style={{ fontSize: '24px', fontWeight: '800', color: '#0f172a', marginBottom: '8px' }}>
          Setting Jam Kerja & Toleransi
        </h2>
        <p style={{ color: '#64748b', fontSize: '14px' }}>
          Atur jam kerja reguler (Senin–Kamis), jam kerja khusus hari Jumat, toleransi keterlambatan, dan batas buka/tutup presensi.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
        {/* Kolom 1: Jam Kerja Reguler (Senin - Kamis) */}
        <div className="glass-card-static" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '18px' }}>
            <h3 style={{ fontSize: '15px', fontWeight: '700', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
              <span>🕐</span> Jam Kerja Reguler
            </h3>
            <span style={{ fontSize: '11px', fontWeight: '700', color: '#2563eb', background: '#eff6ff', padding: '3px 8px', borderRadius: '6px' }}>
              Senin – Kamis
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
            <TimePicker24
              label="Jam Masuk Standar"
              value={data.jamMasuk}
              onChange={(val) => setData({ ...data, jamMasuk: val })}
              helperText={`Pukul ${data.jamMasuk} WIB (Buka: ${computeBukaAbsen()} WIB)`}
            />

            <TimePicker24
              label="Jam Pulang Standar"
              value={data.jamPulang}
              onChange={(val) => setData({ ...data, jamPulang: val })}
              helperText={`Pukul ${data.jamPulang} WIB (Tutup: ${computeBatasPulang()} WIB)`}
            />

            <div style={{
              padding: '14px',
              borderRadius: '12px',
              background: '#eff6ff',
              border: '1px solid #bfdbfe',
            }}>
              <p style={{ color: '#1d4ed8', fontSize: '12px', fontWeight: '700', marginBottom: '4px' }}>
                ℹ️ Durasi Kerja Reguler
              </p>
              <p style={{ color: '#0f172a', fontSize: '19px', fontWeight: '800' }}>
                {formatDurasi(data.durasiKerjaMenit)}
              </p>
              <p style={{ color: '#64748b', fontSize: '11px', marginTop: '4px' }}>
                = {data.durasiKerjaMenit} menit (100% kehadiran penuh harian)
              </p>
            </div>
          </div>
        </div>

        {/* Kolom 2: Jam Kerja Khusus Jumat */}
        <div className="glass-card-static" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '18px' }}>
            <h3 style={{ fontSize: '15px', fontWeight: '700', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
              <span>🕌</span> Jam Kerja Khusus
            </h3>
            <span style={{ fontSize: '11px', fontWeight: '700', color: '#059669', background: '#ecfdf5', padding: '3px 8px', borderRadius: '6px' }}>
              Hari Jumat
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
            <TimePicker24
              label="Jam Masuk Hari Jumat"
              value={data.jamMasukJumat}
              onChange={(val) => setData({ ...data, jamMasukJumat: val })}
              helperText={`Pukul ${data.jamMasukJumat} WIB (Buka: ${computeBukaAbsenJumat()} WIB)`}
            />

            <TimePicker24
              label="Jam Pulang Hari Jumat"
              value={data.jamPulangJumat}
              onChange={(val) => setData({ ...data, jamPulangJumat: val })}
              helperText={`Pukul ${data.jamPulangJumat} WIB (Tutup: ${computeBatasPulangJumat()} WIB)`}
            />

            <div style={{
              padding: '14px',
              borderRadius: '12px',
              background: '#f0fdf4',
              border: '1px solid #bbf7d0',
            }}>
              <p style={{ color: '#15803d', fontSize: '12px', fontWeight: '700', marginBottom: '4px' }}>
                ℹ️ Durasi Kerja Jumat
              </p>
              <p style={{ color: '#0f172a', fontSize: '19px', fontWeight: '800' }}>
                {formatDurasi(data.durasiKerjaJumatMenit)}
              </p>
              <p style={{ color: '#64748b', fontSize: '11px', marginTop: '4px' }}>
                = {data.durasiKerjaJumatMenit} menit (100% penuh di hari Jumat, tidak ada potongan)
              </p>
            </div>
          </div>
        </div>

        {/* Kolom 3: Toleransi Presensi */}
        <div className="glass-card-static" style={{ padding: '24px' }}>
          <h3 style={{ fontSize: '15px', fontWeight: '700', color: '#0f172a', marginBottom: '18px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>⚙️</span> Toleransi Presensi
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label className="input-label">Toleransi Sebelum Jam Masuk (menit)</label>
              <input
                type="number"
                className="input-field"
                value={data.toleransiSebelumMasuk}
                onChange={(e) => setData({ ...data, toleransiSebelumMasuk: Number(e.target.value) })}
                min={0}
                max={120}
                style={{ background: '#ffffff', color: '#0f172a' }}
              />
              <p style={{ fontSize: '11px', color: '#64748b', marginTop: '4px' }}>
                Absen masuk dibuka mulai <b>{computeBukaAbsen()}</b> WIB (Reguler) / <b>{computeBukaAbsenJumat()}</b> WIB (Jumat)
              </p>
            </div>

            <div>
              <label className="input-label">Toleransi Keterlambatan (menit)</label>
              <input
                type="number"
                className="input-field"
                value={data.toleransiKeterlambatan}
                onChange={(e) => setData({ ...data, toleransiKeterlambatan: Number(e.target.value) })}
                min={0}
                max={120}
                style={{ background: '#ffffff', color: '#0f172a' }}
              />
              <p style={{ fontSize: '11px', color: '#64748b', marginTop: '4px' }}>
                Masuk s.d. <b>{computeBatasToleransi()}</b> (Reguler) / <b>{computeBatasToleransiJumat()}</b> (Jumat) = &quot;Telat dlm toleransi&quot; (jam pulang mundur)
              </p>
            </div>

            <div>
              <label className="input-label">Batas Tutup Absen Pulang (menit setelah target pulang)</label>
              <input
                type="number"
                className="input-field"
                value={data.toleransiPulang}
                onChange={(e) => setData({ ...data, toleransiPulang: Number(e.target.value) })}
                min={0}
                max={480}
                style={{ background: '#ffffff', color: '#0f172a' }}
              />
              <p style={{ fontSize: '11px', color: '#64748b', marginTop: '4px' }}>
                Ditutup pukul <b>{computeBatasPulang()}</b> (Reguler) / <b>{computeBatasPulangJumat()}</b> (Jumat)
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Timeline Alur Jam Kerja dengan Tab Reguler vs Jumat */}
      <div className="glass-card-static" style={{ padding: '24px', marginTop: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
          <h3 style={{ fontSize: '15px', fontWeight: '700', color: '#0f172a', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>📋</span> Alur Waktu Presensi Harian
          </h3>

          {/* Tab selector */}
          <div style={{ display: 'flex', gap: '6px', background: '#f1f5f9', padding: '4px', borderRadius: '10px' }}>
            <button
              type="button"
              onClick={() => setTimelineTab('reguler')}
              style={{
                padding: '6px 14px',
                borderRadius: '8px',
                border: 'none',
                background: timelineTab === 'reguler' ? '#ffffff' : 'transparent',
                color: timelineTab === 'reguler' ? '#2563eb' : '#64748b',
                fontSize: '12.5px',
                fontWeight: timelineTab === 'reguler' ? '700' : '500',
                cursor: 'pointer',
                boxShadow: timelineTab === 'reguler' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                transition: 'all 0.15s ease',
              }}
            >
              Senin – Kamis (Reguler)
            </button>
            <button
              type="button"
              onClick={() => setTimelineTab('jumat')}
              style={{
                padding: '6px 14px',
                borderRadius: '8px',
                border: 'none',
                background: timelineTab === 'jumat' ? '#ffffff' : 'transparent',
                color: timelineTab === 'jumat' ? '#059669' : '#64748b',
                fontSize: '12.5px',
                fontWeight: timelineTab === 'jumat' ? '700' : '500',
                cursor: 'pointer',
                boxShadow: timelineTab === 'jumat' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                transition: 'all 0.15s ease',
              }}
            >
              Jumat (Khusus)
            </button>
          </div>
        </div>

        {/* Timeline Items */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center' }}>
          {(timelineTab === 'reguler'
            ? [
                { time: computeBukaAbsen(), label: 'Buka Absen Masuk', color: '#2563eb', bg: '#eff6ff' },
                { time: data.jamMasuk, label: 'Jam Masuk Standar', color: '#059669', bg: '#ecfdf5' },
                { time: computeBatasToleransi(), label: 'Batas Toleransi', color: '#d97706', bg: '#fffbeb' },
                { time: data.jamPulang, label: 'Jam Pulang Standar', color: '#7c3aed', bg: '#f5f3ff' },
                { time: computeBatasPulang(), label: 'Tutup Absen Pulang', color: '#dc2626', bg: '#fef2f2' },
              ]
            : [
                { time: computeBukaAbsenJumat(), label: 'Buka Absen Masuk', color: '#2563eb', bg: '#eff6ff' },
                { time: data.jamMasukJumat, label: 'Jam Masuk Jumat', color: '#059669', bg: '#ecfdf5' },
                { time: computeBatasToleransiJumat(), label: 'Batas Toleransi', color: '#d97706', bg: '#fffbeb' },
                { time: data.jamPulangJumat, label: 'Jam Pulang Jumat', color: '#7c3aed', bg: '#f5f3ff' },
                { time: computeBatasPulangJumat(), label: 'Tutup Absen Pulang', color: '#dc2626', bg: '#fef2f2' },
              ]
          ).map((item, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              {i > 0 && <span style={{ color: '#cbd5e1', fontSize: '16px' }}>→</span>}
              <div style={{
                padding: '8px 14px',
                borderRadius: '10px',
                background: item.bg,
                border: `1px solid ${item.color}22`,
                textAlign: 'center',
              }}>
                <div style={{ fontSize: '16px', fontWeight: '800', color: item.color }}>{item.time}</div>
                <div style={{ fontSize: '10px', color: '#64748b', marginTop: '2px' }}>{item.label}</div>
              </div>
            </div>
          ))}
        </div>

        <div style={{ marginTop: '16px', padding: '14px', borderRadius: '10px', background: '#fefce8', border: '1px solid #fde68a' }}>
          <p style={{ fontSize: '12px', color: '#92400e', lineHeight: '1.6', margin: 0 }}>
            <b>💡 Catatan Perumusan Logika:</b><br />
            • <b>Target Harian Jumat 100%:</b> Di hari Jumat, target durasi kerja disesuaikan menjadi <b>{formatDurasi(data.isJumatKhusus ? data.durasiKerjaJumatMenit : data.durasiKerjaMenit)}</b> sehingga pamong tetap mendapat capaian 100% penuh tanpa potongan.<br />
            • <b>Akumulasi Rekap Bulanan:</b> Total target jam kerja wajib bulanan dihitung dinamis: <code>(Jumlah Hari Senin–Kamis × {data.durasiKerjaMenit}m) + (Jumlah Hari Jumat × {data.isJumatKhusus ? data.durasiKerjaJumatMenit : data.durasiKerjaMenit}m)</code>.<br />
            • <b>Penggeseran Target Pulang:</b> Jika terlambat masuk <i>M</i> menit, target jam pulang digeser mundur <i>M</i> menit agar durasi kerja harian tetap terpenuhi.
          </p>
        </div>
      </div>

      {/* Tombol Simpan & Feedback */}
      <div style={{ marginTop: '20px', maxWidth: '500px' }}>
        {message && (
          <div style={{
            padding: '12px 16px',
            borderRadius: '12px',
            background: message.includes('✅') ? '#ecfdf5' : '#fef2f2',
            border: `1px solid ${message.includes('✅') ? '#a7f3d0' : '#fecaca'}`,
            color: message.includes('✅') ? '#047857' : '#dc2626',
            fontSize: '14px',
            marginBottom: '12px',
          }}>
            {message}
          </div>
        )}

        <button
          onClick={handleSave}
          disabled={loading}
          className="btn-primary"
          style={{ width: '100%', justifyContent: 'center', padding: '14px' }}
        >
          {loading ? 'Menyimpan...' : '💾 Simpan Setting Jam Kerja'}
        </button>
      </div>
    </div>
  );
}
