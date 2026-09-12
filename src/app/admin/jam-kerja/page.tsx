'use client';

import { useEffect, useState } from 'react';

interface JamKerjaData {
  jamMasuk: string;
  jamPulang: string;
  toleransiSebelumMasuk: number;
  toleransiKeterlambatan: number;
  toleransiPulang: number;
  durasiKerjaMenit: number;
}

export default function JamKerjaPage() {
  const [data, setData] = useState<JamKerjaData>({
    jamMasuk: '07:30',
    jamPulang: '15:45',
    toleransiSebelumMasuk: 30,
    toleransiKeterlambatan: 15,
    toleransiPulang: 120,
    durasiKerjaMenit: 495,
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const fetchJamKerja = async () => {
    const res = await fetch('/api/jam-kerja');
    const result = await res.json();
    if (result.jamKerja) {
      setData({
        jamMasuk: result.jamKerja.jamMasuk,
        jamPulang: result.jamKerja.jamPulang,
        toleransiSebelumMasuk: result.jamKerja.toleransiSebelumMasuk ?? 30,
        toleransiKeterlambatan: result.jamKerja.toleransiKeterlambatan ?? 15,
        toleransiPulang: result.jamKerja.toleransiPulang ?? 120,
        durasiKerjaMenit: result.jamKerja.durasiKerjaMenit ?? 495,
      });
    }
  };

  useEffect(() => {
    fetchJamKerja();
  }, []);

  // Auto-compute durasi from jamMasuk & jamPulang
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
        setMessage('✅ Setting jam kerja berhasil disimpan!');
      } else {
        setMessage('❌ Gagal menyimpan: ' + (result.error || ''));
      }
    } catch {
      setMessage('❌ Terjadi kesalahan');
    }
    setLoading(false);
    setTimeout(() => setMessage(''), 4000);
  };

  // Helper: compute display times
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
          Atur jam kerja standar, toleransi keterlambatan, dan batas presensi pamong.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '20px' }}>
        {/* Kolom 1: Jam Kerja Standar */}
        <div className="glass-card-static" style={{ padding: '28px' }}>
          <h3 style={{ fontSize: '15px', fontWeight: '700', color: '#0f172a', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            🕐 Jam Kerja Standar
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label className="input-label">Jam Masuk</label>
              <input
                type="time"
                className="input-field"
                value={data.jamMasuk}
                onChange={(e) => setData({ ...data, jamMasuk: e.target.value })}
                style={{ background: '#ffffff', color: '#0f172a' }}
              />
            </div>

            <div>
              <label className="input-label">Jam Pulang</label>
              <input
                type="time"
                className="input-field"
                value={data.jamPulang}
                onChange={(e) => setData({ ...data, jamPulang: e.target.value })}
                style={{ background: '#ffffff', color: '#0f172a' }}
              />
            </div>

            <div style={{
              padding: '14px',
              borderRadius: '12px',
              background: '#eff6ff',
              border: '1px solid #bfdbfe',
            }}>
              <p style={{ color: '#1d4ed8', fontSize: '12px', fontWeight: '700', marginBottom: '4px' }}>
                ℹ️ Durasi Kerja Standar
              </p>
              <p style={{ color: '#0f172a', fontSize: '20px', fontWeight: '800' }}>
                {formatDurasi(data.durasiKerjaMenit)}
              </p>
              <p style={{ color: '#64748b', fontSize: '11px', marginTop: '4px' }}>
                = {data.durasiKerjaMenit} menit (100% per hari)
              </p>
            </div>
          </div>
        </div>

        {/* Kolom 2: Toleransi Presensi */}
        <div className="glass-card-static" style={{ padding: '28px' }}>
          <h3 style={{ fontSize: '15px', fontWeight: '700', color: '#0f172a', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            ⚙️ Toleransi Presensi
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
                Absen masuk dibuka mulai pukul <b>{computeBukaAbsen()}</b> WIB
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
                Masuk s.d. <b>{computeBatasToleransi()}</b> = &quot;Telat dalam toleransi&quot; (bukan pelanggaran, tapi jam pulang mundur)
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
                Absen pulang ditutup paling lambat pukul <b>{computeBatasPulang()}</b> WIB (dari jam pulang standar)
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Timeline Alur Jam Kerja */}
      <div className="glass-card-static" style={{ padding: '24px', marginTop: '20px' }}>
        <h3 style={{ fontSize: '15px', fontWeight: '700', color: '#0f172a', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          📋 Alur Waktu Presensi Harian
        </h3>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center' }}>
          {[
            { time: computeBukaAbsen(), label: 'Buka Absen Masuk', color: '#2563eb', bg: '#eff6ff' },
            { time: data.jamMasuk, label: 'Jam Masuk Standar', color: '#059669', bg: '#ecfdf5' },
            { time: computeBatasToleransi(), label: 'Batas Toleransi', color: '#d97706', bg: '#fffbeb' },
            { time: data.jamPulang, label: 'Jam Pulang Standar', color: '#7c3aed', bg: '#f5f3ff' },
            { time: computeBatasPulang(), label: 'Tutup Absen Pulang', color: '#dc2626', bg: '#fef2f2' },
          ].map((item, i) => (
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
          <p style={{ fontSize: '12px', color: '#92400e', lineHeight: '1.6' }}>
            <b>💡 Catatan Penting:</b><br />
            • Jika terlambat masuk <b>M</b> menit (baik dalam toleransi maupun di luar), jam pulang target <b>mundur M menit</b> agar total durasi kerja tetap {formatDurasi(data.durasiKerjaMenit)}.<br />
            • Keterlambatan <b>di luar toleransi</b> dicatat sebagai pelanggaran dan dihitung potongan: <code>(M ÷ {data.durasiKerjaMenit}) × 100%</code>.<br />
            • Pulang sebelum target jam pulang = <b>Pulang Cepat</b>, dihitung potongan mendahului.<br />
            • Sabtu &amp; Minggu serta tanggal yang tercatat di Kalender Hari Libur <b>tidak direkam</b>.
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
