"use client";

import { useState, useRef } from "react";
import { IconDatabase, IconFileText, IconUploadCloud } from "@/components/ui/Icons";

export default function KelolaDatabasePage() {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [restoring, setRestoring] = useState(false);
  const [progress, setProgress] = useState(0);
  const [message, setMessage] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleBackup = async () => {
    setMessage(null);
    try {
      const res = await fetch('/api/superadmin/database/backup');
      if (!res.ok) throw new Error('Gagal membuat backup');
      const data = await res.json();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const now = new Date();
      const fname = `ekinerja-backup-${now.toISOString().slice(0,19).replace(/[:T]/g,'-')}.json`;
      a.href = url;
      a.download = fname;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      setMessage('Backup berhasil diunduh. Simpan file JSON ini dengan aman.');
    } catch (err) {
      setMessage((err as Error).message || 'Backup gagal.');
    }
  };

  const handleChooseFile = () => {
    setMessage(null);
    setProgress(0);
    setSuccess(false);
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setMessage(null);
    try {
      const text = await file.text();
      const json = JSON.parse(text);
      // basic validation: must be object and contain at least one known key
      if (!json || typeof json !== 'object') throw new Error('Format file tidak dikenali (bukan JSON objek).');
      const known = ['users','masterJabatan','masterUnitKerja','presensi','aktifitas','laporan','laporanKinerja','agenda','hariLibur','appSettings','jamKerja','tasks','kegiatanJabatan','rencanaKegiatan','outputKegiatan','biometricCredential'];
      const hasKnown = Object.keys(json).some(k => known.includes(k));
      if (!hasKnown) throw new Error('File JSON tidak berisi struktur data yang dikenali sistem.');

      // start restore
      setRestoring(true);
      setProgress(5);
      setSuccess(false);
      setMessage('Memulai proses restore...');

      const controller = new AbortController();
      const signal = controller.signal;

      // show fake progress until server responds
      const tick = setInterval(() => setProgress(p => Math.min(95, p + Math.random() * 10)), 500);

      const res = await fetch('/api/superadmin/database/restore', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-superadmin-secret': (process.env.NEXT_PUBLIC_SUPERADMIN_RESTORE_SECRET as string) || 'dev-secret' },
        body: JSON.stringify(json),
        signal,
      });
      clearInterval(tick);
      if (!res.ok) {
        const err = await res.text();
        setMessage(`Restore gagal: ${err}`);
        setProgress(0);
        setSuccess(false);
      } else {
        const data = await res.json();
        setProgress(100);
        setSuccess(true);
        setMessage(data.message || 'Selesai.');
      }
    } catch (err) {
      setMessage((err as Error).message || 'Terjadi kesalahan saat membaca file.');
      setProgress(0);
      setSuccess(false);
    } finally {
      setRestoring(false);
      // reset file input
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ padding: 24, borderRadius: 12, background: '#fff', border: '1px solid #e2e8f0' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ padding: 10, borderRadius: 10, background: '#ecf8ff' }}>
            <IconFileText size={22} color="#0369a1" />
          </div>
          <div>
            <h3 style={{ margin: 0, fontSize: 18, fontWeight: 800 }}>Backup &amp; Restory Database</h3>
            <p style={{ margin: '6px 0 0', color: '#475569' }}>
              Backup seluruh data aplikasi ke file JSON yang mudah dibaca. Gunakan fungsi Restore untuk memasukkan kembali data yang valid.
            </p>
          </div>
        </div>

        <div style={{ marginTop: 16, display: 'flex', gap: 10 }}>
          <button onClick={handleBackup} className="btn-outline" style={{ padding: '10px 16px', fontWeight: 700 }}>
            <IconFileText size={16} color="#0369a1" />&nbsp; Backup
          </button>

          <button onClick={handleChooseFile} className="btn-primary" style={{ padding: '10px 16px', fontWeight: 700 }}>
            <IconUploadCloud size={16} color="#fff" />&nbsp; Restory
          </button>

          <input ref={fileInputRef} type="file" accept="application/json" style={{ display: 'none' }} onChange={handleFileChange} />
        </div>

        {restoring || progress > 0 ? (
          <div style={{ marginTop: 14 }}>
            <div style={{ height: 10, background: '#f1f5f9', borderRadius: 6, overflow: 'hidden' }}>
              {/* If success and fully completed, show green bar */}
              <div style={{ width: `${progress}%`, height: '100%', background: success && progress === 100 ? '#10b981' : '#06b6d4', transition: 'width 300ms ease, background 200ms ease' }} />
            </div>
            <div style={{ marginTop: 6, fontSize: 13, color: success && progress === 100 ? '#065f46' : '#475569', display: 'flex', alignItems: 'center', gap: 8 }}>
              {success && progress === 100 ? (
                <>
                  <strong style={{ color: '#065f46' }}>Sukses</strong>
                  <span style={{ fontSize: 13, color: '#065f46' }}>{message}</span>
                </>
              ) : (
                <>{Math.round(progress)}% — {message}</>
              )}
            </div>
          </div>
        ) : null}

        {message && !restoring && progress === 0 && (
          <div style={{ marginTop: 12, color: '#334155' }}>{message}</div>
        )}
      </div>

      {/* Existing Reset & Pembersihan Database placeholder (keamanan tinggi, implementasi terpisah) */}
      <div style={{ padding: 24, borderRadius: 12, background: '#fff', border: '1px solid #fee2e2' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ padding: 10, borderRadius: 10, background: '#fff2f2' }}>
            <IconDatabase size={22} color="#ef4444" />
          </div>
          <div>
            <h3 style={{ margin: 0, fontSize: 18, fontWeight: 800 }}>Reset &amp; Pembersihan Database</h3>
            <p style={{ margin: '6px 0 0', color: '#475569' }}>
              Menu pembersihan data selektif berdasarkan rentang waktu. Hati-hati — operasi ini permanen dan memerlukan konfirmasi kuat.
            </p>
          </div>
        </div>

        <div style={{ marginTop: 16 }}>
          <a href="/superadmin/database/reset" className="btn-danger" style={{ padding: '10px 16px', fontWeight: 700 }}>Buka Menu Reset Data →</a>
        </div>
      </div>
    </div>
  );
}
