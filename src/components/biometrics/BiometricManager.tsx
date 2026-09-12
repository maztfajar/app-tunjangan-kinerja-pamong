'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  IconFingerprint,
  IconCheckCircle,
  IconAlertTriangle,
  IconShield,
  IconTrash,
  IconArrowLeft,
  IconActivity,
} from '@/components/ui/Icons';

interface BiometricManagerProps {
  role: 'PAMONG' | 'ADMIN' | 'SUPERADMIN';
  backUrl: string;
  roleName: string;
}

interface DeviceItem {
  id: string;
  credentialId: string;
  deviceLabel: string | null;
  createdAt: string;
}

export default function BiometricManager({ role, backUrl, roleName }: BiometricManagerProps) {
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [hasRegistered, setHasRegistered] = useState(false);
  const [credentialCount, setCredentialCount] = useState(0);
  const [deviceList, setDeviceList] = useState<DeviceItem[]>([]);
  const [user, setUser] = useState<{ id: string; nip: string; nama: string; role: string } | null>(null);
  const [isPro, setIsPro] = useState<boolean | null>(null);
  const [biometricsEnabled, setBiometricsEnabled] = useState<boolean | null>(null);

  // Status Diagnostik Perangkat
  const [isSecureContext, setIsSecureContext] = useState(true);
  const [hasWebAuthnSupport, setHasWebAuthnSupport] = useState(false);
  const [hasPlatformSensor, setHasPlatformSensor] = useState<boolean | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);

  // Ambil Data Akun, Lisensi, dan Status Biometrik
  const loadStatus = useCallback(async () => {
    setLoading(true);
    try {
      // 1. Cek User
      const userRes = await fetch('/api/auth/me');
      if (userRes.ok) {
        const userData = await userRes.json();
        setUser(userData.user || null);
      }

      // 2. Cek Lisensi Mode Pro
      const licRes = await fetch('/api/license/status');
      if (licRes.ok) {
        const licData = await licRes.json();
        setIsPro(Boolean(licData.isPro));
        setBiometricsEnabled(Boolean(licData.features?.biometrics));
      }

      // 3. Cek Status Kredensial Terdaftar dari Database
      const checkRes = await fetch('/api/auth/biometric/check');
      if (checkRes.ok) {
        const checkData = await checkRes.json();
        setHasRegistered(Boolean(checkData.registered ?? checkData.hasBiometric));
        setCredentialCount(Number(checkData.count || 0));
        setDeviceList(Array.isArray(checkData.items) ? checkData.items : []);
      }

      // 4. Cek Lingkungan Browser & Sensor
      if (typeof window !== 'undefined') {
        const secure = window.isSecureContext || window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
        setIsSecureContext(secure);

        const webAuthn = Boolean(window.PublicKeyCredential);
        setHasWebAuthnSupport(webAuthn);

        if (webAuthn && window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable) {
          try {
            const available = await window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
            setHasPlatformSensor(available);
          } catch {
            setHasPlatformSensor(false);
          }
        } else {
          setHasPlatformSensor(false);
        }
      }
    } catch (err) {
      console.error('Error load biometric status:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadStatus();
  }, [loadStatus]);

  // Alur Pendaftaran Kunci Biometrik (WebAuthn / Passkeys)
  const handleRegister = async () => {
    try {
      setActionLoading(true);
      setFeedback(null);

      if (!isSecureContext && window.location.hostname !== 'localhost') {
        setFeedback({
          type: 'error',
          message: 'Autentikasi biometrik membutuhkan koneksi HTTPS (SSL). Browser memblokir sensor biometrik jika diakses via IP HTTP lokal non-secure (http://192.168.x.x). Gunakan domain HTTPS.',
        });
        setActionLoading(false);
        return;
      }

      if (!window.PublicKeyCredential) {
        setFeedback({
          type: 'error',
          message: 'Browser atau perangkat ini tidak mendukung standar WebAuthn biometrik.',
        });
        setActionLoading(false);
        return;
      }

      // 1. Minta challenge dari backend
      const res = await fetch('/api/auth/biometric/register');
      const data = await res.json();
      if (!res.ok || !data.options) {
        setFeedback({
          type: 'error',
          message: data.error || 'Gagal memulai pendaftaran kunci biometrik dari server.',
        });
        setActionLoading(false);
        return;
      }

      const { challenge, rp, user: bioUser, pubKeyCredParams, timeout } = data.options;

      // Konversi Base64URL Challenge ke Uint8Array
      const challengeBytes = Uint8Array.from(atob(challenge.replace(/-/g, '+').replace(/_/g, '/')), (c) =>
        c.charCodeAt(0)
      );

      // Konversi User ID ke Uint8Array
      let userIdBytes: Uint8Array;
      try {
        userIdBytes = Uint8Array.from(atob(bioUser.id.replace(/-/g, '+').replace(/_/g, '/')), (c) => c.charCodeAt(0));
      } catch {
        userIdBytes = new TextEncoder().encode(bioUser.id);
      }

      const cleanHost = window.location.hostname.trim().toLowerCase();
      const isIp = /^(\d{1,3}\.){3}\d{1,3}$/.test(cleanHost) || cleanHost.includes(':');

      const rpConfig: { name: string; id?: string } = {
        name: rp?.name || 'E-Kinerja Pamong Kalurahan',
      };
      if (!isIp) {
        rpConfig.id = cleanHost;
      }

      // 2. Memicu Dialog Sensor Biometrik Asli Perangkat (Face ID / Touch ID / Fingerprint)
      const credential = (await navigator.credentials.create({
        publicKey: {
          challenge: challengeBytes as unknown as BufferSource,
          rp: rpConfig,
          user: {
            id: userIdBytes as unknown as BufferSource,
            name: bioUser.name,
            displayName: bioUser.displayName,
          },
          pubKeyCredParams,
          authenticatorSelection: {
            authenticatorAttachment: 'platform', // Wajib sensor fisik bawaan HP/Laptop
            userVerification: 'required',        // Wajib verifikasi wajah atau sidik jari
            residentKey: 'preferred',            // 'preferred' agar kompatibel penuh di semua merk HP & passkey
          },
          timeout: timeout || 60000,
          attestation: 'none',
        },
      })) as PublicKeyCredential | null;

      if (!credential) {
        setFeedback({ type: 'error', message: 'Pemindaian sensor biometrik dibatalkan.' });
        setActionLoading(false);
        return;
      }

      // 3. Simpan Kredensial ke Server
      const postRes = await fetch('/api/auth/biometric/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          credentialId: credential.id,
          challenge,
          deviceLabel: /iPhone|iPad|iPod/i.test(navigator.userAgent)
            ? 'Apple Face/Touch ID'
            : /Android/i.test(navigator.userAgent)
            ? 'Android Biometric'
            : 'Perangkat Biometrik',
        }),
      });

      const postData = await postRes.json();
      if (!postRes.ok) {
        setFeedback({ type: 'error', message: postData.error || 'Gagal menyimpan kunci biometrik ke database.' });
      } else {
        setHasRegistered(true);
        setCredentialCount((prev) => prev + 1);
        setFeedback({
          type: 'success',
          message: '🎉 Berhasil! Kunci biometrik perangkat ini telah tersimpan. Anda kini bisa masuk langsung dari halaman login menggunakan sensor wajah atau sidik jari.',
        });
      }
    } catch (err: unknown) {
      const msg = (err as Error)?.message || '';
      console.warn('Register biometric error:', err);
      if (msg.includes('NotAllowedError') || msg.includes('canceled')) {
        setFeedback({ type: 'error', message: 'Pemindaian biometrik dibatalkan oleh pengguna.' });
      } else if (msg.includes('SecurityError')) {
        setFeedback({
          type: 'error',
          message: 'Akses sensor ditolak oleh browser. Pastikan website diakses menggunakan domain resmi dengan protokol HTTPS.',
        });
      } else {
        setFeedback({
          type: 'error',
          message: 'Gagal mengaktifkan biometrik. Pastikan kunci layar (PIN/Pola/Face ID/Sidik Jari) di pengaturan ponsel Anda telah aktif.',
        });
      }
    } finally {
      setActionLoading(false);
    }
  };

  // Alur Uji Coba Sensor Biometrik
  const handleTestSensor = async () => {
    try {
      setActionLoading(true);
      setFeedback(null);

      const challengeRes = await fetch('/api/auth/biometric/login');
      const challengeData = await challengeRes.json();
      if (!challengeRes.ok || !challengeData.options) {
        setFeedback({ type: 'error', message: 'Gagal memulai sesi pengujian sensor dari server.' });
        setActionLoading(false);
        return;
      }

      const { challenge } = challengeData.options;
      const challengeBytes = Uint8Array.from(atob(challenge.replace(/-/g, '+').replace(/_/g, '/')), (c) =>
        c.charCodeAt(0)
      );

      const cleanHost = window.location.hostname.trim().toLowerCase();
      const isIp = /^(\d{1,3}\.){3}\d{1,3}$/.test(cleanHost) || cleanHost.includes(':');

      const credential = (await navigator.credentials.get({
        publicKey: {
          challenge: challengeBytes as unknown as BufferSource,
          userVerification: 'required',
          timeout: 60000,
          ...(!isIp ? { rpId: cleanHost } : {}),
          ...({ hints: ['client-device'] } as Record<string, unknown>),
        },
      })) as PublicKeyCredential | null;

      if (credential) {
        setFeedback({
          type: 'success',
          message: '✓ Sensor biometrik berfungsi sempurna! Perangkat Anda siap digunakan untuk login.',
        });
      } else {
        setFeedback({ type: 'error', message: 'Pengujian sensor dibatalkan.' });
      }
    } catch (err: unknown) {
      const msg = (err as Error)?.message || '';
      if (msg.includes('NotAllowedError') || msg.includes('canceled')) {
        setFeedback({ type: 'info', message: 'Pengujian dibatalkan oleh pengguna.' });
      } else {
        setFeedback({
          type: 'error',
          message: 'Sensor tidak cocok atau pengujian gagal. Anda dapat mencoba mendaftarkan ulang kunci.',
        });
      }
    } finally {
      setActionLoading(false);
    }
  };

  // Hapus Satu Kunci Perangkat
  const handleRemoveSingle = async (id: string, label: string) => {
    if (!confirm(`Hapus kunci biometrik untuk perangkat "${label}" dari database?`)) {
      return;
    }

    try {
      setActionLoading(true);
      setFeedback(null);
      const res = await fetch(`/api/auth/biometric/check?id=${encodeURIComponent(id)}`, { method: 'DELETE' });
      const data = await res.json();
      if (res.ok) {
        setFeedback({ type: 'success', message: `Perangkat "${label}" berhasil dihapus dari database.` });
        loadStatus();
      } else {
        setFeedback({ type: 'error', message: data.error || 'Gagal menghapus perangkat dari database.' });
      }
    } catch {
      setFeedback({ type: 'error', message: 'Terjadi kesalahan jaringan saat menghapus perangkat.' });
    } finally {
      setActionLoading(false);
    }
  };

  // Edit / Ubah Nama Label Perangkat (Rename)
  const handleRenameDevice = async (id: string, currentLabel: string) => {
    const newName = prompt('Ubah nama perangkat biometrik ini:', currentLabel);
    if (!newName || !newName.trim() || newName.trim() === currentLabel) return;

    try {
      setActionLoading(true);
      setFeedback(null);
      const res = await fetch('/api/auth/biometric/check', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, deviceLabel: newName.trim() }),
      });
      const data = await res.json();
      if (res.ok) {
        setFeedback({ type: 'success', message: 'Nama perangkat berhasil diperbarui di database.' });
        loadStatus();
      } else {
        setFeedback({ type: 'error', message: data.error || 'Gagal mengubah nama perangkat.' });
      }
    } catch {
      setFeedback({ type: 'error', message: 'Terjadi kesalahan jaringan saat memperbarui nama perangkat.' });
    } finally {
      setActionLoading(false);
    }
  };

  // Alur Hapus Seluruh Kunci Biometrik Akun Ini
  const handleRemoveAll = async () => {
    if (!confirm('Apakah Anda yakin ingin menghapus SELURUH kunci biometrik yang terdaftar untuk akun ini? Setelah dihapus, Anda harus masuk dengan Username & Password.')) {
      return;
    }

    try {
      setActionLoading(true);
      setFeedback(null);
      const res = await fetch('/api/auth/biometric/check', { method: 'DELETE' });
      if (res.ok) {
        setHasRegistered(false);
        setCredentialCount(0);
        setDeviceList([]);
        setFeedback({
          type: 'success',
          message: 'Seluruh kunci biometrik berhasil dihapus dari akun ini.',
        });
      } else {
        setFeedback({ type: 'error', message: 'Gagal menghapus kunci biometrik dari database.' });
      }
    } catch {
      setFeedback({ type: 'error', message: 'Terjadi kesalahan jaringan saat menghapus biometrik.' });
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div style={{ padding: '24px 20px', maxWidth: '860px', margin: '0 auto' }}>
      {/* Header Navigasi Balik */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Link
            href={backUrl}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '38px',
              height: '38px',
              borderRadius: '10px',
              background: '#ffffff',
              border: '1px solid #e2e8f0',
              color: '#475569',
              textDecoration: 'none',
              boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
            }}
            title="Kembali ke Dashboard"
          >
            <IconArrowLeft size={18} />
          </Link>
          <div>
            <h1 style={{ fontSize: '20px', fontWeight: '800', color: '#0f172a', margin: 0 }}>
              Kunci Biometrik (Wajah / Sidik Jari)
            </h1>
            <p style={{ fontSize: '12px', color: '#64748b', margin: '2px 0 0 0' }}>
              Pengelolaan autentikasi biometrik perangkat untuk {roleName}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={loadStatus}
          disabled={loading || actionLoading}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            padding: '8px 14px',
            borderRadius: '8px',
            background: '#ffffff',
            border: '1px solid #cbd5e1',
            color: '#475569',
            fontSize: '12px',
            fontWeight: '600',
            cursor: 'pointer',
          }}
        >
          <IconActivity size={14} className={loading ? 'animate-spin' : ''} />
          <span>Segarkan</span>
        </button>
      </div>

      {/* Peringatan Mode Pro (Jika Belum Mode Pro) */}
      {!loading && biometricsEnabled === false && (
        <div
          style={{
            padding: '16px 18px',
            borderRadius: '12px',
            background: '#fffbeb',
            border: '1px solid #fef3c7',
            marginBottom: '20px',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '14px',
          }}
        >
          <div style={{ padding: '8px', borderRadius: '10px', background: '#fef3c7', color: '#b45309' }}>
            <IconShield size={22} />
          </div>
          <div style={{ flex: 1 }}>
            <h3 style={{ fontSize: '15px', fontWeight: '800', color: '#92400e', margin: '0 0 4px 0' }}>
              Fitur Kunci Biometrik Terkunci (Mode Standar)
            </h3>
            <p style={{ fontSize: '13px', color: '#78350f', margin: '0 0 10px 0', lineHeight: 1.5 }}>
              Sistem saat ini berstatus <strong>Mode Standar</strong>. Fitur pendaftaran kunci biometrik (Face ID &amp; Sidik Jari) merupakan fitur eksklusif <strong>Mode Pro</strong>.
            </p>
            {role === 'SUPERADMIN' ? (
              <Link
                href="/superadmin"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '7px 14px',
                  borderRadius: '8px',
                  background: '#d97706',
                  color: '#ffffff',
                  fontSize: '12px',
                  fontWeight: '700',
                  textDecoration: 'none',
                }}
              >
                <span>Aktivasi Serial Number di Super Admin →</span>
              </Link>
            ) : (
              <span style={{ fontSize: '12px', color: '#92400e', fontStyle: 'italic' }}>
                Silakan hubungi Super Administrator untuk memasukkan Serial Number resmi instansi.
              </span>
            )}
          </div>
        </div>
      )}

      {/* Peringatan HTTPS Non-Secure Context */}
      {!isSecureContext && (
        <div
          style={{
            padding: '14px 16px',
            borderRadius: '12px',
            background: '#fef2f2',
            border: '1px solid #fecaca',
            marginBottom: '20px',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '12px',
          }}
        >
          <IconAlertTriangle size={22} color="#dc2626" />
          <div style={{ flex: 1, fontSize: '12.5px', color: '#991b1b', lineHeight: 1.5 }}>
            <strong>Peringatan Koneksi HTTP (Non-Secure):</strong> Anda sedang mengakses aplikasi melalui alamat non-HTTPS (misal IP lokal: <code>http://192.168.x.x</code>). Browser Android &amp; iPhone memblokir sensor biometrik pada koneksi tidak aman. Untuk mendaftarkan &amp; memakai sensor biometrik, wajib menggunakan <strong>HTTPS (SSL)</strong> atau <strong>localhost</strong>.
          </div>
        </div>
      )}

      {/* Feedback Banner */}
      {feedback && (
        <div
          style={{
            padding: '12px 16px',
            borderRadius: '10px',
            marginBottom: '20px',
            fontSize: '13px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            background:
              feedback.type === 'success' ? '#f0fdf4' : feedback.type === 'error' ? '#fef2f2' : '#eff6ff',
            border: `1px solid ${
              feedback.type === 'success' ? '#bbf7d0' : feedback.type === 'error' ? '#fecaca' : '#bfdbfe'
            }`,
            color:
              feedback.type === 'success' ? '#15803d' : feedback.type === 'error' ? '#b91c1c' : '#1d4ed8',
          }}
        >
          {feedback.type === 'success' ? (
            <IconCheckCircle size={18} />
          ) : (
            <IconAlertTriangle size={18} />
          )}
          <span style={{ flex: 1 }}>{feedback.message}</span>
        </div>
      )}

      {/* Grid 2 Kolom: Status & Aksi Utama */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '18px', marginBottom: '24px' }}>
        {/* Card 1: Status Kunci Biometrik Akun */}
        <div
          style={{
            padding: '20px',
            borderRadius: '14px',
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
            <div
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '10px',
                background: hasRegistered ? '#ecfdf5' : '#eff6ff',
                color: hasRegistered ? '#10b981' : '#2563eb',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <IconFingerprint size={24} />
            </div>
            <div>
              <div style={{ fontSize: '15px', fontWeight: '800', color: '#0f172a' }}>
                Status Kunci Akun
              </div>
              <div style={{ fontSize: '12px', color: '#64748b' }}>
                {user ? `${user.nama} • Username: ${user.nip}` : 'Memuat data akun...'}
              </div>
            </div>
          </div>

          <div
            style={{
              padding: '12px',
              borderRadius: '10px',
              background: hasRegistered ? '#f0fdf4' : '#f8fafc',
              border: hasRegistered ? '1px solid #bbf7d0' : '1px solid #e2e8f0',
              marginBottom: '16px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span
                style={{
                  display: 'inline-block',
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  background: hasRegistered ? '#16a34a' : '#94a3b8',
                }}
              />
              <span
                style={{
                  fontSize: '13px',
                  fontWeight: '700',
                  color: hasRegistered ? '#166534' : '#475569',
                }}
              >
                {hasRegistered ? `✓ Kunci Biometrik Aktif (${credentialCount} Perangkat)` : 'Belum Ada Kunci Terdaftar'}
              </span>
            </div>
            <p style={{ fontSize: '12px', color: '#64748b', margin: '6px 0 0 0', lineHeight: 1.45 }}>
              {hasRegistered
                ? `Akun Anda memiliki ${credentialCount} kunci biometrik terdaftar di database. Anda dapat masuk langsung menggunakan sensor wajah / sidik jari tanpa perlu mengetik password.`
                : 'Perangkat ini belum didaftarkan sebagai kunci biometrik resmi untuk akun Anda. Daftarkan sekarang agar login berikutnya lebih cepat.'}
            </p>
          </div>

          {/* Daftar Kunci Perangkat yang Tersimpan di Database */}
          {deviceList.length > 0 && (
            <div style={{ marginBottom: '16px' }}>
              <div style={{ fontSize: '12px', fontWeight: '700', color: '#334155', marginBottom: '8px' }}>
                Daftar Kunci Tersimpan di Database:
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {deviceList.map((item, idx) => (
                  <div
                    key={item.id || idx}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '8px 10px',
                      borderRadius: '8px',
                      background: '#f8fafc',
                      border: '1px solid #e2e8f0',
                      fontSize: '12px',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden' }}>
                      <span style={{ fontSize: '15px' }}>📱</span>
                      <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        <strong style={{ color: '#0f172a' }}>{item.deviceLabel || 'Smartphone Biometrik'}</strong>
                        <div style={{ fontSize: '10.5px', color: '#64748b' }}>
                          Terdaftar: {new Date(item.createdAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexShrink: 0 }}>
                      <button
                        type="button"
                        onClick={() => handleRenameDevice(item.id, item.deviceLabel || 'Smartphone Biometrik')}
                        title="Ubah nama label perangkat"
                        disabled={actionLoading}
                        style={{
                          padding: '4px 8px',
                          borderRadius: '6px',
                          border: '1px solid #cbd5e1',
                          background: '#ffffff',
                          color: '#334155',
                          fontSize: '11px',
                          cursor: 'pointer',
                        }}
                      >
                        ✏️ Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRemoveSingle(item.id, item.deviceLabel || 'Smartphone Biometrik')}
                        title="Hapus kunci ini"
                        disabled={actionLoading}
                        style={{
                          padding: '4px 8px',
                          borderRadius: '6px',
                          border: '1px solid #fecaca',
                          background: '#fff1f2',
                          color: '#dc2626',
                          fontSize: '11px',
                          cursor: 'pointer',
                        }}
                      >
                        🗑️ Hapus
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Tombol Aksi Kunci */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <button
              type="button"
              disabled={actionLoading || loading || biometricsEnabled === false}
              onClick={handleRegister}
              style={{
                width: '100%',
                padding: '12px 18px',
                borderRadius: '10px',
                border: 'none',
                background: biometricsEnabled === false ? '#94a3b8' : 'linear-gradient(135deg, #2563eb, #1d4ed8)',
                color: '#ffffff',
                fontSize: '13.5px',
                fontWeight: '700',
                cursor: biometricsEnabled === false ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                boxShadow: biometricsEnabled === false ? 'none' : '0 4px 12px rgba(37, 99, 235, 0.25)',
              }}
            >
              <IconFingerprint size={18} />
              <span>
                {actionLoading
                  ? 'Menunggu Sensor Ponsel...'
                  : hasRegistered
                  ? 'Daftarkan Perangkat Baru / Ponsel Lain'
                  : 'Daftarkan Biometrik Ponsel Ini'}
              </span>
            </button>

            {hasRegistered && (
              <>
                <button
                  type="button"
                  disabled={actionLoading || loading || !biometricsEnabled}
                  onClick={handleTestSensor}
                  style={{
                    width: '100%',
                    padding: '10px 16px',
                    borderRadius: '8px',
                    border: '1px solid #bfdbfe',
                    background: '#eff6ff',
                    color: '#1d4ed8',
                    fontSize: '13px',
                    fontWeight: '700',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                  }}
                >
                  <IconFingerprint size={16} />
                  <span>{actionLoading ? 'Menguji Sensor...' : 'Uji Coba Sensor Biometrik'}</span>
                </button>

                <button
                  type="button"
                  disabled={actionLoading || loading}
                  onClick={handleRemoveAll}
                  style={{
                    width: '100%',
                    padding: '10px 16px',
                    borderRadius: '8px',
                    border: '1px solid #fecaca',
                    background: '#fff1f2',
                    color: '#dc2626',
                    fontSize: '13px',
                    fontWeight: '700',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                  }}
                >
                  <IconTrash size={15} />
                  <span>Hapus Seluruh Kunci Biometrik Akun Ini</span>
                </button>
              </>
            )}
          </div>

          {/* Catatan Cadangan Password jika HP Rusak */}
          <div
            style={{
              marginTop: '14px',
              padding: '10px 12px',
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '8px',
              fontSize: '11px',
              color: '#475569',
              lineHeight: '1.5',
            }}
          >
            💡 <strong>Jika Ponsel Rusak / Ganti HP Baru:</strong> Akun Anda tetap aman! Anda selalu dapat masuk menggunakan <strong>Username &amp; Password</strong> di perangkat baru, lalu daftarkan sensor ponsel baru Anda pada menu ini.
          </div>
        </div>

        {/* Card 2: Status Sensor Perangkat & Lisensi */}
        <div
          style={{
            padding: '20px',
            borderRadius: '14px',
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
            <div
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '10px',
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                color: '#475569',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <IconShield size={22} />
            </div>
            <div>
              <div style={{ fontSize: '15px', fontWeight: '800', color: '#0f172a' }}>
                Diagnostik Sistem
              </div>
              <div style={{ fontSize: '12px', color: '#64748b' }}>
                Pemeriksaan kesiapan perangkat &amp; lisensi
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '12.5px' }}>
            {/* Status Lisensi */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 10px', borderRadius: '8px', background: '#f8fafc' }}>
              <span style={{ color: '#64748b', fontWeight: '600' }}>Lisensi Sistem</span>
              <span style={{ fontWeight: '700', color: isPro ? '#16a34a' : '#d97706' }}>
                {isPro ? '✓ Mode Pro (Aktif)' : '● Mode Standar'}
              </span>
            </div>

            {/* Status Koneksi */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 10px', borderRadius: '8px', background: '#f8fafc' }}>
              <span style={{ color: '#64748b', fontWeight: '600' }}>Protokol Koneksi</span>
              <span style={{ fontWeight: '700', color: isSecureContext ? '#16a34a' : '#dc2626' }}>
                {isSecureContext ? '✓ HTTPS / Localhost (Aman)' : '✗ HTTP (Tidak Aman)'}
              </span>
            </div>

            {/* Status WebAuthn Browser */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 10px', borderRadius: '8px', background: '#f8fafc' }}>
              <span style={{ color: '#64748b', fontWeight: '600' }}>API WebAuthn</span>
              <span style={{ fontWeight: '700', color: hasWebAuthnSupport ? '#16a34a' : '#dc2626' }}>
                {hasWebAuthnSupport ? '✓ Didukung' : '✗ Tidak Didukung'}
              </span>
            </div>

            {/* Sensor Fisik Ponsel */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 10px', borderRadius: '8px', background: '#f8fafc' }}>
              <span style={{ color: '#64748b', fontWeight: '600' }}>Sensor Fisik Perangkat</span>
              <span style={{ fontWeight: '700', color: hasPlatformSensor ? '#16a34a' : hasPlatformSensor === false ? '#64748b' : '#3b82f6' }}>
                {hasPlatformSensor ? '✓ Tersedia (Face/Touch ID)' : hasPlatformSensor === false ? 'Belum Terdeteksi' : 'Memeriksa...'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Panduan Edukatif & Solusi Kendala Barcode iPhone & Android */}
      <div
        style={{
          padding: '22px',
          borderRadius: '14px',
          background: '#ffffff',
          border: '1px solid #e2e8f0',
          boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
        }}
      >
        <h3 style={{ fontSize: '16px', fontWeight: '800', color: '#0f172a', margin: '0 0 16px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span>💡</span>
          <span>Panduan Lengkap &amp; Solusi Kendala Penggunaan Biometrik</span>
        </h3>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {/* FAQ 1: Barcode iPhone */}
          <div style={{ padding: '14px', borderRadius: '10px', background: '#eff6ff', border: '1px solid #bfdbfe' }}>
            <div style={{ fontSize: '13.5px', fontWeight: '800', color: '#1e40af', marginBottom: '6px' }}>
              📱 Kenapa di iPhone muncul Barcode / Kode QR saat login?
            </div>
            <p style={{ fontSize: '12.5px', color: '#1e3a8a', margin: 0, lineHeight: 1.55 }}>
              Pada iOS 16 ke atas, Apple menerapkan standar <em>Passkeys</em>. Jika Anda menekan tombol <strong>Masuk dengan Biometrik</strong> sebelum mendaftarkan Face ID di website ini, Safari otomatis menampilkan modal Barcode dengan pesan <em>"Simpan atau gunakan kunci di perangkat lain"</em> karena iPhone menduga kunci Anda tersimpan di ponsel lain.
              <br />
              <strong>Solusinya:</strong> Masuk dulu dengan Username &amp; Password, lalu klik tombol <strong>Daftarkan Biometrik Ponsel Ini</strong> di halaman ini. Setelah terdaftar, iPhone akan langsung membuka sensor Face ID / Touch ID tanpa barcode lagi.
            </p>
          </div>

          {/* FAQ 2: Masalah di Android */}
          <div style={{ padding: '14px', borderRadius: '10px', background: '#f8fafc', border: '1px solid #e2e8f0' }}>
            <div style={{ fontSize: '13.5px', fontWeight: '800', color: '#0f172a', marginBottom: '6px' }}>
              🤖 Kenapa di Android tidak bisa atau muncul pesan error?
            </div>
            <ul style={{ fontSize: '12.5px', color: '#475569', margin: 0, paddingLeft: '20px', lineHeight: 1.6 }}>
              <li>
                <strong>Kunci Layar Wajib Aktif:</strong> Pastikan HP Android Anda sudah mengaktifkan kunci layar (PIN, Pola, atau Sidik Jari) di menu <em>Pengaturan HP &gt; Keamanan</em>.
              </li>
              <li>
                <strong>Browser Google Chrome:</strong> Gunakan browser resmi Google Chrome versi terbaru agar integrasi Google Password Manager berjalan mulus.
              </li>
              <li>
                <strong>Koneksi HTTPS:</strong> Sensor Android diblokir oleh Google Chrome jika website diakses lewat IP HTTP biasa.
              </li>
            </ul>
          </div>

          {/* FAQ 3: Syarat Wajib HTTPS */}
          <div style={{ padding: '14px', borderRadius: '10px', background: '#f8fafc', border: '1px solid #e2e8f0' }}>
            <div style={{ fontSize: '13.5px', fontWeight: '800', color: '#0f172a', marginBottom: '6px' }}>
              🔒 Mengapa WebAuthn Mewajibkan Koneksi Aman (HTTPS)?
            </div>
            <p style={{ fontSize: '12.5px', color: '#475569', margin: 0, lineHeight: 1.55 }}>
              Standar keamanan dunia W3C &amp; FIDO Alliance mewajibkan enkripsi HTTPS demi melindungi privasi data biometrik Anda dari pembajakan jaringan. Jika aplikasi dijalankan di hosting atau server VPS, pastikan sertifikat SSL (HTTPS) sudah aktif pada domain Anda.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
