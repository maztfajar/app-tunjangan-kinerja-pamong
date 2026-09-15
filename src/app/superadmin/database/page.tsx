"use client";

import { useState, useRef, useEffect } from "react";
import {
  IconDatabase,
  IconFileText,
  IconUploadCloud,
  IconSettings,
  IconCheckCircle,
  IconAlertTriangle,
  IconClose,
} from "@/components/ui/Icons";

function IconGoogleDriveLogo({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 87.3 78" xmlns="http://www.w3.org/2000/svg">
      <path d="m6.6 66.85 3.85 6.65c.8 1.4 1.95 2.5 3.3 3.3l13.75-23.8h-27.5c0 1.55.4 3.1 1.2 4.5z" fill="#0066da"/>
      <path d="m43.65 25-13.75-23.8c-1.35.8-2.5 1.9-3.3 3.3l-25.4 44c-.8 1.4-1.2 2.95-1.2 4.5h27.5z" fill="#00ac47"/>
      <path d="m73.55 76.8c1.35-.8 2.5-1.9 3.3-3.3l1.6-2.75 7.65-13.25c.8-1.4 1.2-2.95 1.2-4.5h-27.502l5.852 11.5z" fill="#ea4335"/>
      <path d="m43.65 25 13.75-23.8c-1.35-.8-2.9-1.2-4.5-1.2h-18.5c-1.6 0-3.15.45-4.5 1.25z" fill="#00832d"/>
      <path d="m59.8 53h-32.3l-13.75 23.8c1.35.8 2.9 1.2 4.5 1.2h50.8c1.6 0 3.15-.45 4.5-1.25z" fill="#2684fc"/>
      <path d="m73.4 26.5-12.7-22c-.8-1.4-1.95-2.5-3.3-3.3l-13.75 23.8 16.15 28h27.45c0-1.55-.4-3.1-1.2-4.5z" fill="#ffba00"/>
    </svg>
  );
}

interface GDriveStatus {
  configured: boolean;
  clientId?: string;
  maskedClientSecret?: string;
  maskedRefreshToken?: string;
  folderId?: string;
  folderName?: string;
  cronSecret?: string;
  retentionDays?: number;
  lastBackupAt?: string | null;
  lastBackupStatus?: string | null;
  lastBackupFileName?: string | null;
  lastBackupFileUrl?: string | null;
}

interface DriveFolder {
  id: string;
  name: string;
  parentId?: string;
}

export default function KelolaDatabasePage() {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [restoring, setRestoring] = useState(false);
  const [progress, setProgress] = useState(0);
  const [message, setMessage] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isBackupEnabled, setIsBackupEnabled] = useState(false);

  // State untuk Google Drive Backup
  const [gdriveConfig, setGdriveConfig] = useState<GDriveStatus | null>(null);
  const [loadingConfig, setLoadingConfig] = useState(false);
  const [backingUpDrive, setBackingUpDrive] = useState(false);
  const [driveActionMsg, setDriveActionMsg] = useState<{ text: string; isError?: boolean } | null>(null);

  // State Modal Konfigurasi
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [formClientId, setFormClientId] = useState('');
  const [formClientSecret, setFormClientSecret] = useState('');
  const [formRefreshToken, setFormRefreshToken] = useState('');
  const [formFolderId, setFormFolderId] = useState('');
  const [formFolderName, setFormFolderName] = useState('');
  const [formCronSecret, setFormCronSecret] = useState('backup-secret-key');
  const [formRetention, setFormRetention] = useState(7);
  const [testingDrive, setTestingDrive] = useState(false);
  const [savingDrive, setSavingDrive] = useState(false);
  const [modalFeedback, setModalFeedback] = useState<{ text: string; isError?: boolean } | null>(null);

  // State Folder Picker
  const [loadingFolders, setLoadingFolders] = useState(false);
  const [driveFolders, setDriveFolders] = useState<DriveFolder[]>([]);
  const [showFolderPicker, setShowFolderPicker] = useState(false);
  const [folderSearch, setFolderSearch] = useState('');
  const [folderPickerError, setFolderPickerError] = useState<string | null>(null);

  const fetchGDriveConfig = () => {
    setLoadingConfig(true);
    fetch('/api/superadmin/database/gdrive-config')
      .then((res) => {
        if (!res.ok) throw new Error();
        return res.json();
      })
      .then((data: GDriveStatus) => {
        setGdriveConfig(data);
        if (data) {
          setFormClientId(data.clientId || '');
          setFormClientSecret(data.maskedClientSecret || '');
          setFormRefreshToken(data.maskedRefreshToken || '');
          setFormFolderId(data.folderId || '');
          setFormFolderName(data.folderName || '');
          setFormCronSecret(data.cronSecret || 'backup-secret-key');
          setFormRetention(data.retentionDays || 7);
        }
      })
      .catch(() => {})
      .finally(() => setLoadingConfig(false));
  };

  useEffect(() => {
    fetch('/api/license/status')
      .then((res) => res.json())
      .then((data) => {
        if (data?.features?.backupRestore) {
          setIsBackupEnabled(true);
          fetchGDriveConfig();
        }
      })
      .catch(() => {});
  }, []);

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
      const fname = `ekinerja-backup-${now.toISOString().slice(0, 19).replace(/[:T]/g, '-')}.json`;
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
      if (!json || typeof json !== 'object') throw new Error('Format file tidak dikenali (bukan JSON objek).');
      const known = [
        'users',
        'masterJabatan',
        'masterUnitKerja',
        'presensi',
        'aktifitas',
        'laporan',
        'laporanKinerja',
        'agenda',
        'hariLibur',
        'appSettings',
        'jamKerja',
        'tasks',
        'kegiatanJabatan',
        'rencanaKegiatan',
        'outputKegiatan',
        'biometricCredential',
      ];
      const hasKnown = Object.keys(json).some((k) => known.includes(k));
      if (!hasKnown) throw new Error('File JSON tidak berisi struktur data yang dikenali sistem.');

      setRestoring(true);
      setProgress(5);
      setSuccess(false);
      setMessage('Memulai proses restore...');

      const controller = new AbortController();
      const signal = controller.signal;

      const tick = setInterval(() => setProgress((p) => Math.min(95, p + Math.random() * 10)), 500);

      const res = await fetch('/api/superadmin/database/restore', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-superadmin-secret':
            (process.env.NEXT_PUBLIC_SUPERADMIN_RESTORE_SECRET as string) || 'dev-secret',
        },
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
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Trigger Backup Instan ke Google Drive
  const handleBackupToDriveNow = async () => {
    if (!gdriveConfig?.configured) {
      setShowConfigModal(true);
      return;
    }
    setBackingUpDrive(true);
    setDriveActionMsg(null);
    try {
      const res = await fetch('/api/superadmin/database/backup-drive', {
        method: 'POST',
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Gagal memproses backup ke Google Drive.');
      }
      setDriveActionMsg({
        text: `Sukses! Backup tersimpan ke Google Drive: ${data.fileName} (Otomatis dibersihkan jika > ${gdriveConfig.retentionDays || 7} data).`,
        isError: false,
      });
      fetchGDriveConfig();
    } catch (err: unknown) {
      setDriveActionMsg({
        text: (err as Error).message || 'Gagal memproses backup Google Drive.',
        isError: true,
      });
    } finally {
      setBackingUpDrive(false);
    }
  };

  // Uji koneksi modal
  const handleTestDriveConnection = async () => {
    setTestingDrive(true);
    setModalFeedback(null);
    try {
      const res = await fetch('/api/superadmin/database/gdrive-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId: formClientId,
          clientSecret: formClientSecret,
          refreshToken: formRefreshToken,
          folderId: formFolderId,
          testOnly: true,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Koneksi gagal');
      setModalFeedback({
        text: data.message || 'Berhasil terhubung ke Google Drive!',
        isError: false,
      });
    } catch (err: unknown) {
      setModalFeedback({
        text: (err as Error).message || 'Koneksi ke Google Drive gagal.',
        isError: true,
      });
    } finally {
      setTestingDrive(false);
    }
  };

  // Simpan konfigurasi modal
  const handleSaveDriveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingDrive(true);
    setModalFeedback(null);
    try {
      const res = await fetch('/api/superadmin/database/gdrive-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId: formClientId,
          clientSecret: formClientSecret,
          refreshToken: formRefreshToken,
          folderId: formFolderId,
          folderName: formFolderName,
          cronSecret: formCronSecret,
          retentionDays: formRetention,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Gagal menyimpan konfigurasi');
      setModalFeedback({
        text: 'Konfigurasi Google Drive berhasil disimpan.',
        isError: false,
      });
      setTimeout(() => {
        setShowConfigModal(false);
        fetchGDriveConfig();
      }, 1000);
    } catch (err: unknown) {
      setModalFeedback({
        text: (err as Error).message || 'Gagal menyimpan pengaturan.',
        isError: true,
      });
    } finally {
      setSavingDrive(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* 1. Cadangan Manual JSON (Download / Upload) */}
      {isBackupEnabled && (
        <div style={{ padding: 24, borderRadius: 12, background: '#fff', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ padding: 10, borderRadius: 10, background: '#ecf8ff' }}>
              <IconFileText size={22} color="#0369a1" />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: '#0f172a' }}>Backup &amp; Restore Database Manual</h3>
              <p style={{ margin: '6px 0 0', color: '#475569', fontSize: 14 }}>
                Cadangkan seluruh basis data ke file JSON komputer lokal, atau pulihkan data kapan saja dari file cadangan yang valid.
              </p>
            </div>
          </div>

          <div style={{ marginTop: 16, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <button onClick={handleBackup} className="btn-outline" style={{ padding: '10px 18px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
              <IconFileText size={16} color="#0369a1" /> Unduh Backup JSON
            </button>

            <button onClick={handleChooseFile} className="btn-primary" style={{ padding: '10px 18px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
              <IconUploadCloud size={16} color="#fff" /> Pulihkan (Restore) Data
            </button>

            <input ref={fileInputRef} type="file" accept="application/json" style={{ display: 'none' }} onChange={handleFileChange} />
          </div>

          {restoring || progress > 0 ? (
            <div style={{ marginTop: 14 }}>
              <div style={{ height: 10, background: '#f1f5f9', borderRadius: 6, overflow: 'hidden' }}>
                <div style={{ width: `${progress}%`, height: '100%', background: success && progress === 100 ? '#10b981' : '#06b6d4', transition: 'width 300ms ease, background 200ms ease' }} />
              </div>
              <div style={{ marginTop: 6, fontSize: 13, color: success && progress === 100 ? '#065f46' : '#475569', display: 'flex', alignItems: 'center', gap: 8 }}>
                {success && progress === 100 ? (
                  <>
                    <strong style={{ color: '#065f46' }}>Sukses:</strong>
                    <span style={{ fontSize: 13, color: '#065f46' }}>{message}</span>
                  </>
                ) : (
                  <>{Math.round(progress)}% — {message}</>
                )}
              </div>
            </div>
          ) : null}

          {message && !restoring && progress === 0 && (
            <div style={{ marginTop: 12, padding: '10px 14px', borderRadius: 8, background: '#f8fafc', border: '1px solid #e2e8f0', color: '#334155', fontSize: 13 }}>
              {message}
            </div>
          )}
        </div>
      )}

      {/* 2. Otomatisasi Cloud Backup (Google Drive) - Fitur PRO */}
      {isBackupEnabled && (
        <div style={{ padding: 24, borderRadius: 12, background: '#fff', border: '1px solid #e0e7ff', boxShadow: '0 2px 6px rgba(79, 70, 229, 0.06)' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ padding: 10, borderRadius: 10, background: '#f0fdf4', border: '1px solid #bbf7d0' }}>
                <IconGoogleDriveLogo size={24} />
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <h3 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: '#0f172a' }}>
                    Otomatisasi Backup Cloud (Google Drive)
                  </h3>
                  <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 999, background: '#e0e7ff', color: '#4338ca' }}>
                    PRO
                  </span>
                </div>
                <p style={{ margin: '6px 0 0', color: '#475569', fontSize: 14 }}>
                  Pencadangan otomatis setiap malam pukul <strong>00:00 WIB</strong> (format JSON). Sistem otomatis menyimpan <strong>{gdriveConfig?.retentionDays || 7} data terakhir</strong> dan memangkas file lama agar penyimpanan Google Drive tetap hemat.
                </p>
              </div>
            </div>

            <div>
              {gdriveConfig?.configured ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 999, background: '#ecfdf5', color: '#047857', fontSize: 13, fontWeight: 700, border: '1px solid #a7f3d0' }}>
                    <IconCheckCircle size={14} color="#059669" /> Terhubung &amp; Aktif
                  </span>
                  <span style={{ fontSize: 12, color: '#475569', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                    📁 Folder: <strong>{gdriveConfig.folderName || (gdriveConfig.folderId ? 'Folder Khusus' : 'My Drive (Root)')}</strong>
                  </span>
                </div>
              ) : (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 999, background: '#fefce8', color: '#a16207', fontSize: 13, fontWeight: 700, border: '1px solid #fef08a' }}>
                  <IconAlertTriangle size={14} color="#ca8a04" /> Belum Dikonfigurasi
                </span>
              )}
            </div>
          </div>

          {/* Status Backup Terakhir */}
          {gdriveConfig?.lastBackupAt && (
            <div style={{ marginTop: 18, padding: '12px 16px', borderRadius: 10, background: '#f8fafc', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
              <div style={{ fontSize: 13, color: '#334155' }}>
                <span style={{ color: '#64748b' }}>Backup Terakhir: </span>
                <strong>{new Date(gdriveConfig.lastBackupAt).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })} WIB</strong>
                {gdriveConfig.lastBackupFileName && (
                  <span style={{ marginLeft: 8, color: '#0369a1', fontFamily: 'monospace' }}>
                    ({gdriveConfig.lastBackupFileName})
                  </span>
                )}
                <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>
                  Status: <span style={{ color: gdriveConfig.lastBackupStatus?.includes('Gagal') ? '#dc2626' : '#16a34a' }}>{gdriveConfig.lastBackupStatus || 'Sukses'}</span>
                </div>
              </div>

              {gdriveConfig.lastBackupFileUrl && (
                <a
                  href={gdriveConfig.lastBackupFileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ fontSize: 13, fontWeight: 700, color: '#2563eb', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 4 }}
                >
                  Buka di Google Drive ↗
                </a>
              )}
            </div>
          )}

          {/* Action Message Feedback */}
          {driveActionMsg && (
            <div
              style={{
                marginTop: 14,
                padding: '10px 14px',
                borderRadius: 8,
                background: driveActionMsg.isError ? '#fef2f2' : '#f0fdf4',
                border: `1px solid ${driveActionMsg.isError ? '#fecaca' : '#bbf7d0'}`,
                color: driveActionMsg.isError ? '#b91c1c' : '#15803d',
                fontSize: 13,
                fontWeight: 600,
              }}
            >
              {driveActionMsg.text}
            </div>
          )}

          {/* Tombol Aksi */}
          <div style={{ marginTop: 18, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <button
              onClick={handleBackupToDriveNow}
              disabled={backingUpDrive}
              className="btn-primary"
              style={{
                padding: '10px 18px',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                background: '#4338ca',
                opacity: backingUpDrive ? 0.7 : 1,
              }}
            >
              <IconUploadCloud size={16} color="#fff" />
              {backingUpDrive ? 'Sedang Mencadangkan ke Drive...' : '⚡ Backup ke Google Drive Sekarang'}
            </button>

            <button
              onClick={() => {
                setModalFeedback(null);
                setShowConfigModal(true);
              }}
              className="btn-outline"
              style={{
                padding: '10px 18px',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                borderColor: '#c7d2fe',
                color: '#3730a3',
              }}
            >
              <IconSettings size={16} color="#4338ca" /> Pengaturan Google Drive &amp; Cron
            </button>
          </div>
        </div>
      )}

      {/* 3. Reset & Pembersihan Database */}
      <div style={{ padding: 24, borderRadius: 12, background: '#fff', border: '1px solid #fee2e2', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ padding: 10, borderRadius: 10, background: '#fff2f2' }}>
            <IconDatabase size={22} color="#ef4444" />
          </div>
          <div>
            <h3 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: '#0f172a' }}>Reset &amp; Pembersihan Database</h3>
            <p style={{ margin: '6px 0 0', color: '#475569', fontSize: 14 }}>
              Menu pembersihan data selektif berdasarkan rentang waktu. Hati-hati — operasi ini permanen dan memerlukan konfirmasi ketat.
            </p>
          </div>
        </div>

        <div style={{ marginTop: 16 }}>
          <a href="/superadmin/database/reset" className="btn-danger" style={{ padding: '10px 18px', fontWeight: 700, textDecoration: 'none', display: 'inline-block' }}>
            Buka Menu Reset Data →
          </a>
        </div>
      </div>

      {/* MODAL PENGATURAN GOOGLE DRIVE OAUTH2 */}
      {showConfigModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: 16,
          }}
        >
          <div
            style={{
              background: '#fff',
              borderRadius: 16,
              width: '100%',
              maxWidth: 640,
              maxHeight: '90vh',
              overflowY: 'auto',
              boxShadow: '0 20px 25px -5px rgba(0,0,0,0.2), 0 8px 10px -6px rgba(0,0,0,0.2)',
              border: '1px solid #e2e8f0',
            }}
          >
            {/* Modal Header */}
            <div
              style={{
                padding: '20px 24px',
                borderBottom: '1px solid #e2e8f0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <IconGoogleDriveLogo size={24} />
                <h3 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: '#0f172a' }}>
                  Pengaturan Auto-Backup Google Drive
                </h3>
              </div>
              <button
                onClick={() => setShowConfigModal(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: 6,
                  borderRadius: 6,
                  color: '#64748b',
                }}
              >
                <IconClose size={20} />
              </button>
            </div>

            {/* Modal Body / Form */}
            <form onSubmit={handleSaveDriveConfig} style={{ padding: '20px 24px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {/* Petunjuk info */}
                <div style={{ padding: '12px 14px', borderRadius: 10, background: '#eff6ff', border: '1px solid #bfdbfe', fontSize: 13, color: '#1e40af' }}>
                  <strong>ℹ️ Catatan Sistem:</strong> Jika Client ID &amp; Secret belum dimasukkan, fitur auto-backup tidak akan bekerja dan <em>sama sekali tidak mengganggu sistem yang sedang berjalan</em>.
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#334155', marginBottom: 6 }}>
                    Google OAuth2 Client ID <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formClientId}
                    onChange={(e) => setFormClientId(e.target.value)}
                    placeholder="xxxxxxxxx.apps.googleusercontent.com"
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      borderRadius: 8,
                      border: '1px solid #cbd5e1',
                      fontSize: 14,
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#334155', marginBottom: 6 }}>
                    Google OAuth2 Client Secret <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <input
                    type="password"
                    required
                    value={formClientSecret}
                    onChange={(e) => setFormClientSecret(e.target.value)}
                    placeholder="GOCSPX-xxxxxxxxxxxxxxxx"
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      borderRadius: 8,
                      border: '1px solid #cbd5e1',
                      fontSize: 14,
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#334155', marginBottom: 6 }}>
                    OAuth2 Refresh Token <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <input
                    type="password"
                    required
                    value={formRefreshToken}
                    onChange={(e) => setFormRefreshToken(e.target.value)}
                    placeholder="1//xxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      borderRadius: 8,
                      border: '1px solid #cbd5e1',
                      fontSize: 14,
                    }}
                  />
                  <span style={{ fontSize: 12, color: '#64748b', marginTop: 4, display: 'block' }}>
                    Token permanen untuk izin unggah ke Google Drive tanpa perlu login ulang setiap hari.
                  </span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#334155', marginBottom: 6 }}>
                      Target Folder Google Drive
                    </label>

                    {/* Folder Picker UI */}
                    <div style={{ display: 'flex', gap: 8, alignItems: 'stretch' }}>
                      <div
                        style={{
                          flex: 1,
                          padding: '10px 14px',
                          borderRadius: 8,
                          border: '1px solid #cbd5e1',
                          fontSize: 14,
                          background: formFolderId ? '#f0fdf4' : '#f8fafc',
                          color: formFolderId ? '#166534' : '#94a3b8',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 8,
                          minHeight: 42,
                          cursor: 'default',
                          overflow: 'hidden',
                        }}
                      >
                        {formFolderId ? (
                          <>
                            <span style={{ fontSize: 16 }}>📁</span>
                            <span style={{ fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {formFolderName || formFolderId}
                            </span>
                          </>
                        ) : (
                          <span style={{ fontSize: 13 }}>My Drive (Root) — belum dipilih</span>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={async () => {
                          // Validasi dulu sebelum fetch folder
                          const hasCredentials =
                            formClientId &&
                            formClientSecret && !formClientSecret.includes('••') &&
                            formRefreshToken && !formRefreshToken.includes('••');
                          const hasSavedCredentials = gdriveConfig?.configured;

                          if (!hasCredentials && !hasSavedCredentials) {
                            setFolderPickerError('Isi Client ID, Client Secret, dan Refresh Token terlebih dahulu sebelum memilih folder.');
                            setShowFolderPicker(true);
                            return;
                          }

                          setLoadingFolders(true);
                          setFolderPickerError(null);
                          setFolderSearch('');
                          setShowFolderPicker(true);
                          try {
                            const res = await fetch('/api/superadmin/database/gdrive-folders', {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({
                                clientId: formClientId,
                                clientSecret: formClientSecret,
                                refreshToken: formRefreshToken,
                              }),
                            });
                            const data = await res.json();
                            if (!res.ok) throw new Error(data.error || 'Gagal mengambil daftar folder');
                            setDriveFolders(data.folders || []);
                          } catch (e: unknown) {
                            setFolderPickerError((e as Error).message);
                            setDriveFolders([]);
                          } finally {
                            setLoadingFolders(false);
                          }
                        }}
                        style={{
                          padding: '8px 12px',
                          borderRadius: 8,
                          border: '1px solid #c7d2fe',
                          background: '#eff6ff',
                          color: '#3730a3',
                          fontWeight: 700,
                          fontSize: 13,
                          cursor: 'pointer',
                          whiteSpace: 'nowrap',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 6,
                        }}
                      >
                        📂 Pilih Folder
                      </button>
                    </div>

                    {/* Tombol hapus pilihan folder */}
                    {formFolderId && (
                      <button
                        type="button"
                        onClick={() => { setFormFolderId(''); setFormFolderName(''); }}
                        style={{
                          marginTop: 6,
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          color: '#ef4444',
                          fontSize: 12,
                          padding: 0,
                          fontWeight: 600,
                        }}
                      >
                        ✕ Hapus pilihan (gunakan My Drive Root)
                      </button>
                    )}

                    {/* Dropdown Folder Picker Panel */}
                    {showFolderPicker && (
                      <div
                        style={{
                          position: 'absolute',
                          zIndex: 1000,
                          marginTop: 4,
                          width: 320,
                          maxHeight: 320,
                          background: '#fff',
                          border: '1px solid #c7d2fe',
                          borderRadius: 12,
                          boxShadow: '0 8px 24px rgba(67, 56, 202, 0.15)',
                          display: 'flex',
                          flexDirection: 'column',
                          overflow: 'hidden',
                        }}
                      >
                        {/* Header picker */}
                        <div style={{ padding: '12px 14px', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <span style={{ fontWeight: 700, fontSize: 13, color: '#334155' }}>📁 Pilih Folder Tujuan</span>
                          <button
                            type="button"
                            onClick={() => setShowFolderPicker(false)}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', fontSize: 16, lineHeight: 1, padding: '2px 6px' }}
                          >
                            ✕
                          </button>
                        </div>

                        {/* Search box */}
                        {!loadingFolders && !folderPickerError && (
                          <div style={{ padding: '8px 12px', borderBottom: '1px solid #f1f5f9' }}>
                            <input
                              type="text"
                              value={folderSearch}
                              onChange={(e) => setFolderSearch(e.target.value)}
                              placeholder="Cari nama folder..."
                              autoFocus
                              style={{
                                width: '100%',
                                padding: '7px 10px',
                                borderRadius: 6,
                                border: '1px solid #cbd5e1',
                                fontSize: 13,
                              }}
                            />
                          </div>
                        )}

                        {/* Content */}
                        <div style={{ overflowY: 'auto', flex: 1 }}>
                          {loadingFolders ? (
                            <div style={{ padding: '24px 0', textAlign: 'center', color: '#64748b', fontSize: 13 }}>
                              <div style={{ marginBottom: 6 }}>⏳ Memuat daftar folder Google Drive...</div>
                            </div>
                          ) : folderPickerError ? (
                            <div style={{ padding: '16px 14px', color: '#dc2626', fontSize: 13 }}>
                              <strong>Gagal:</strong> {folderPickerError}
                            </div>
                          ) : (
                            <>
                              {/* Opsi My Drive Root */}
                              <div
                                onClick={() => {
                                  setFormFolderId('');
                                  setFormFolderName('');
                                  setShowFolderPicker(false);
                                }}
                                style={{
                                  padding: '10px 14px',
                                  cursor: 'pointer',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: 10,
                                  background: !formFolderId ? '#f0fdf4' : 'transparent',
                                  borderBottom: '1px solid #f1f5f9',
                                  fontSize: 13,
                                  fontWeight: !formFolderId ? 700 : 400,
                                  color: !formFolderId ? '#15803d' : '#334155',
                                }}
                              >
                                <span style={{ fontSize: 18 }}>🏠</span>
                                <div>
                                  <div style={{ fontWeight: 700 }}>My Drive (Root)</div>
                                  <div style={{ fontSize: 11, color: '#64748b' }}>Simpan langsung di folder utama Google Drive</div>
                                </div>
                                {!formFolderId && <span style={{ marginLeft: 'auto', color: '#16a34a' }}>✓</span>}
                              </div>

                              {/* Daftar folder */}
                              {driveFolders
                                .filter((f) => f.name.toLowerCase().includes(folderSearch.toLowerCase()))
                                .map((folder) => (
                                  <div
                                    key={folder.id}
                                    onClick={() => {
                                      setFormFolderId(folder.id);
                                      setFormFolderName(folder.name);
                                      setShowFolderPicker(false);
                                    }}
                                    style={{
                                      padding: '10px 14px',
                                      cursor: 'pointer',
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: 10,
                                      background: formFolderId === folder.id ? '#eff6ff' : 'transparent',
                                      borderBottom: '1px solid #f8fafc',
                                      fontSize: 13,
                                      fontWeight: formFolderId === folder.id ? 700 : 400,
                                      color: formFolderId === folder.id ? '#3730a3' : '#334155',
                                    }}
                                    onMouseEnter={(e) => {
                                      if (formFolderId !== folder.id)
                                        (e.currentTarget as HTMLDivElement).style.background = '#f8fafc';
                                    }}
                                    onMouseLeave={(e) => {
                                      if (formFolderId !== folder.id)
                                        (e.currentTarget as HTMLDivElement).style.background = 'transparent';
                                    }}
                                  >
                                    <span style={{ fontSize: 18 }}>📁</span>
                                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{folder.name}</span>
                                    {formFolderId === folder.id && (
                                      <span style={{ marginLeft: 'auto', color: '#4338ca' }}>✓</span>
                                    )}
                                  </div>
                                ))
                              }

                              {driveFolders.filter((f) => f.name.toLowerCase().includes(folderSearch.toLowerCase())).length === 0 && folderSearch && (
                                <div style={{ padding: '16px 14px', color: '#94a3b8', fontSize: 13, textAlign: 'center' }}>
                                  Tidak ada folder dengan nama &quot;{folderSearch}&quot;
                                </div>
                              )}

                              {driveFolders.length === 0 && !folderSearch && (
                                <div style={{ padding: '16px 14px', color: '#94a3b8', fontSize: 13, textAlign: 'center' }}>
                                  Tidak ada folder di Google Drive Anda. Buat folder baru di Google Drive terlebih dahulu.
                                </div>
                              )}
                            </>
                          )}
                        </div>

                        {/* Footer info */}
                        {!loadingFolders && !folderPickerError && driveFolders.length > 0 && (
                          <div style={{ padding: '8px 14px', borderTop: '1px solid #e2e8f0', fontSize: 11, color: '#94a3b8' }}>
                            {driveFolders.length} folder ditemukan di Google Drive Anda
                          </div>
                        )}
                      </div>
                    )}

                    <span style={{ fontSize: 11, color: '#64748b', marginTop: 4, display: 'block' }}>
                      Klik <strong>Pilih Folder</strong> untuk memilih langsung dari Google Drive. Kosongkan untuk simpan di My Drive (Root).
                    </span>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#334155', marginBottom: 6 }}>
                      Maksimal Retensi (Hari / Data)
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={30}
                      value={formRetention}
                      onChange={(e) => setFormRetention(parseInt(e.target.value) || 7)}
                      style={{
                        width: '100%',
                        padding: '10px 14px',
                        borderRadius: 8,
                        border: '1px solid #cbd5e1',
                        fontSize: 14,
                      }}
                    />
                    <span style={{ fontSize: 11, color: '#64748b', marginTop: 4, display: 'block' }}>
                      Standar: <strong>7 data</strong> (data tertua otomatis dihapus setelah 7 hari).
                    </span>
                  </div>
                </div>

                {/* Token Cron VPS */}
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#334155', marginBottom: 6 }}>
                    Token Keamanan Cron VPS (Otomatisasi Jam 00:00)
                  </label>
                  <input
                    type="text"
                    value={formCronSecret}
                    onChange={(e) => setFormCronSecret(e.target.value)}
                    placeholder="backup-secret-key"
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      borderRadius: 8,
                      border: '1px solid #cbd5e1',
                      fontSize: 14,
                      fontFamily: 'monospace',
                    }}
                  />
                  <div style={{ marginTop: 8, padding: 10, background: '#f8fafc', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 12, color: '#475569' }}>
                    <div style={{ fontWeight: 700, marginBottom: 4 }}>Perintah Crontab VPS (Jalan tiap pukul 00:00 malam):</div>
                    <code style={{ background: '#e2e8f0', padding: '3px 6px', borderRadius: 4, display: 'block', wordBreak: 'break-all' }}>
                      0 0 * * * curl -s -X POST &quot;http://localhost:3000/api/cron/backup?secret={formCronSecret}&quot; &gt; /dev/null 2&gt;&amp;1
                    </code>
                  </div>
                </div>

                {/* Feedback Modal */}
                {modalFeedback && (
                  <div
                    style={{
                      padding: '10px 14px',
                      borderRadius: 8,
                      background: modalFeedback.isError ? '#fef2f2' : '#f0fdf4',
                      border: `1px solid ${modalFeedback.isError ? '#fecaca' : '#bbf7d0'}`,
                      color: modalFeedback.isError ? '#b91c1c' : '#15803d',
                      fontSize: 13,
                      fontWeight: 600,
                    }}
                  >
                    {modalFeedback.text}
                  </div>
                )}
              </div>

              {/* Modal Footer Actions */}
              <div
                style={{
                  marginTop: 24,
                  paddingTop: 16,
                  borderTop: '1px solid #e2e8f0',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: 10,
                }}
              >
                <button
                  type="button"
                  onClick={handleTestDriveConnection}
                  disabled={testingDrive || !formClientId || !formClientSecret || !formRefreshToken}
                  className="btn-outline"
                  style={{ padding: '9px 16px', fontSize: 13, fontWeight: 700 }}
                >
                  {testingDrive ? 'Menguji Koneksi...' : '🔍 Uji Koneksi Google'}
                </button>

                <div style={{ display: 'flex', gap: 10 }}>
                  <button
                    type="button"
                    onClick={() => setShowConfigModal(false)}
                    style={{
                      padding: '9px 16px',
                      borderRadius: 8,
                      border: '1px solid #cbd5e1',
                      background: '#fff',
                      color: '#475569',
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    Batal
                  </button>

                  <button
                    type="submit"
                    disabled={savingDrive}
                    className="btn-primary"
                    style={{ padding: '9px 20px', fontWeight: 700 }}
                  >
                    {savingDrive ? 'Menyimpan...' : 'Simpan Pengaturan'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
