'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import TurnstileWidget from '@/components/auth/TurnstileWidget';

function LoginForm() {
  const searchParams = useSearchParams();
  const urlError = searchParams.get('error');
  const isExpired = searchParams.get('expired') === '1';

  const [nip, setNip] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(urlError || '');
  const [loading, setLoading] = useState(false);
  const [botToken, setBotToken] = useState('');
  const [isMobile, setIsMobile] = useState(false);
  const [supportsBiometric, setSupportsBiometric] = useState(false);
  const [biometricFeatureActive, setBiometricFeatureActive] = useState(false);
  const [biometricLoading, setBiometricLoading] = useState(false);
  const [branding, setBranding] = useState({
    namaApp: 'Tunjangan Kinerja & Absensi',
    namaKantor: 'Kalurahan',
    subJudul: 'Sistem Informasi Pamong',
    logoUrl: '',
  });

  useEffect(() => {
    if (urlError) {
      setError(decodeURIComponent(urlError));
    }
  }, [urlError]);

  // Helper konversi Base64URL ke Uint8Array yang aman untuk WebAuthn allowCredentials
  const safeBase64UrlToUint8Array = (str: string): Uint8Array => {
    try {
      let base64 = str.replace(/-/g, '+').replace(/_/g, '/');
      while (base64.length % 4 !== 0) {
        base64 += '=';
      }
      const binary = atob(base64);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
      }
      return bytes;
    } catch {
      return new TextEncoder().encode(str);
    }
  };

  useEffect(() => {
    // 1. Selalu ambil status lisensi dari server untuk mendeteksi apakah Web App berstatus Pro
    const domainQuery = typeof window !== 'undefined' && window.location.hostname
      ? `?domain=${encodeURIComponent(window.location.hostname)}`
      : '';

    fetch(`/api/license/status${domainQuery}`)
      .then((r) => {
        if (!r.ok) throw new Error('Status ' + r.status);
        return r.json();
      })
      .then((lic) => {
        // HANYA jika lisensi PRO dan fitur biometrik aktif
        const isProWithBio = Boolean(lic?.isPro && lic?.features?.biometrics);
        setBiometricFeatureActive(isProWithBio);
      })
      .catch((err) => {
        console.warn('License status check notice:', err);
        setBiometricFeatureActive(false);
      });

    // 2. Deteksi dukungan WebAuthn & perangkat
    if (typeof window !== 'undefined') {
      const hasWebAuthn = Boolean(window.PublicKeyCredential);
      setSupportsBiometric(hasWebAuthn);

      const mobileCheck =
        /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
        (window.innerWidth <= 1024 && (navigator.maxTouchPoints > 0 || /iPhone|iPad|iPod|Android/i.test(navigator.userAgent))) ||
        window.innerWidth <= 768;
      setIsMobile(mobileCheck);
    }
  }, []);

  useEffect(() => {
    fetch('/api/settings')
      .then((res) => res.json())
      .then((data) => {
        if (data?.settings) {
          setBranding({
            namaApp: data.settings.namaApp || 'Tunjangan Kinerja & Absensi',
            namaKantor: data.settings.namaKantor || 'Kalurahan',
            subJudul: data.settings.subJudul || 'Sistem Informasi Pamong',
            logoUrl: data.settings.logoUrl || '',
          });
        }
      })
      .catch(() => {});
  }, []);

  // Alur Login Biometrik Terverifikasi per Username
  const handleBiometricLogin = async () => {
    setError('');

    const inputNip = ((document.getElementById('input-nip') as HTMLInputElement)?.value || nip).trim();

    if (!inputNip) {
      setError('Silakan masukkan Username Anda terlebih dahulu pada kolom Username di atas.');
      document.getElementById('input-nip')?.focus();
      return;
    }

    setBiometricLoading(true);

    try {
      if (typeof window !== 'undefined' && !window.isSecureContext && window.location.hostname !== 'localhost') {
        setError('Autentikasi biometrik memerlukan koneksi aman (HTTPS / SSL). Browser memblokir sensor biometrik ponsel jika dibuka melalui HTTP lokal (contoh: http://192.168.x.x). Gunakan domain HTTPS.');
        setBiometricLoading(false);
        return;
      }

      if (!window.PublicKeyCredential) {
        setError('Perangkat / browser ini tidak mendukung standar autentikasi biometrik (WebAuthn). Gunakan Google Chrome versi terbaru.');
        setBiometricLoading(false);
        return;
      }

      // 1. Pencarian ke backend: apakah username ini sudah mendaftarkan biometrik?
      const challengeRes = await fetch(`/api/auth/biometric/login?username=${encodeURIComponent(inputNip)}`);
      const challengeData = await challengeRes.json();

      if (!challengeRes.ok || !challengeData.options) {
        if (challengeData.needsPassword) {
          setError('Akun Anda belum mendaftarkan biometrik di perangkat ini. Silahkan mendaftar di menu Kunci Biometrik di dalam dashboard.');
          document.getElementById('input-password')?.focus();
        } else {
          setError(challengeData.error || 'Gagal memeriksa status biometrik akun ini.');
        }
        setBiometricLoading(false);
        return;
      }

      const { challenge, allowCredentials: rawAllowCreds } = challengeData.options;

      // Ubah base64url challenge menjadi Uint8Array
      const challengeBytes = safeBase64UrlToUint8Array(challenge);

      const cleanHost = window.location.hostname.trim().toLowerCase();
      const isIp = /^(\d{1,3}\.){3}\d{1,3}$/.test(cleanHost) || cleanHost.includes(':');

      const publicKeyReq: PublicKeyCredentialRequestOptions = {
        challenge: challengeBytes as unknown as BufferSource,
        userVerification: 'required',
        timeout: 60000,
        ...(!isIp ? { rpId: cleanHost } : {}),
        ...({ hints: ['client-device'] } as Record<string, unknown>),
      };

      // Tautkan kunci biometrik khusus milik Username ini (Pemisahan Akun 100% Aman)
      if (rawAllowCreds && Array.isArray(rawAllowCreds) && rawAllowCreds.length > 0) {
        publicKeyReq.allowCredentials = rawAllowCreds.map((c: { id: string; type: string }) => ({
          id: safeBase64UrlToUint8Array(c.id) as unknown as BufferSource,
          type: (c.type || 'public-key') as PublicKeyCredentialType,
        }));
      }

      // 2. Minta verifikasi biometrik asli dari OS ponsel / perangkat (Wajah / Sidik Jari)
      const credential = (await navigator.credentials.get({
        publicKey: publicKeyReq,
      })) as PublicKeyCredential | null;

      if (!credential) {
        setError('Pemindaian biometrik dibatalkan. Silakan masukkan Password jika ingin masuk tanpa sensor.');
        setBiometricLoading(false);
        return;
      }

      // 3. Kirim hasil pemindaian ke server dengan verifikasi ketat Username
      const verifyRes = await fetch('/api/auth/biometric/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          credentialId: credential.id,
          challenge,
          expectedUsername: inputNip,
        }),
      });

      const verifyData = await verifyRes.json();
      if (!verifyRes.ok) {
        setError(verifyData.error || 'Autentikasi biometrik tidak cocok.');
        setBiometricLoading(false);
        return;
      }

      // Login berhasil langsung arahkan ke rute dashboard
      window.location.replace(verifyData.redirect || '/dashboard');
    } catch (err: unknown) {
      const errorMsg = (err as Error)?.message || '';
      console.warn('Biometric login error:', err);
      if (errorMsg.includes('NotAllowedError') || errorMsg.includes('canceled')) {
        setError('Pemindaian biometrik dibatalkan atau waktu habis. Jika sensor bermasalah, Anda dapat masuk langsung menggunakan Password.');
      } else {
        setError('Kunci biometrik belum cocok atau belum terdaftar pada perangkat ini. Silakan masuk menggunakan Password terlebih dahulu.');
      }
      setBiometricLoading(false);
    }
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const nipVal = ((document.getElementById('input-nip') as HTMLInputElement)?.value || nip).trim();
    const passVal = (document.getElementById('input-password') as HTMLInputElement)?.value || password;

    if (!nipVal || !passVal) {
      setError('Username dan Password wajib diisi');
      return;
    }

    if (!botToken) {
      setError('Silakan selesaikan verifikasi anti-bot (Cloudflare Turnstile) terlebih dahulu.');
      return;
    }

    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({ nip: nipVal, password: passVal, botToken }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Login gagal. Periksa kembali username dan password.');
        setLoading(false);
        return;
      }

      // Berhasil login - navigasi hard reload ke rute dashboard
      window.location.replace(data.redirect);
    } catch (err) {
      console.warn('AJAX login fetch failed, falling back to native form submission...', err);
      const formEl = document.getElementById('login-form') as HTMLFormElement;
      if (formEl) {
        formEl.submit();
      } else {
        setError('Koneksi terganggu. Silakan tekan tombol Masuk kembali.');
        setLoading(false);
      }
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
        background: '#f8fafc',
        position: 'relative',
      }}
    >
      <div
        className="animate-slide-up"
        style={{
          width: '100%',
          maxWidth: '440px',
          position: 'relative',
          zIndex: 1,
        }}
      >
        {/* Logo / Header */}
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          {branding.logoUrl ? (
            <div
              style={{
                width: '64px',
                height: '64px',
                borderRadius: '16px',
                overflow: 'hidden',
                margin: '0 auto 16px',
                boxShadow: '0 4px 12px rgba(37, 99, 235, 0.25)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: '#fff',
              }}
            >
              <img
                src={branding.logoUrl}
                alt="Logo"
                style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
              />
            </div>
          ) : (
            <div
              style={{
                width: '64px',
                height: '64px',
                borderRadius: '16px',
                background: 'linear-gradient(135deg, #2563eb, #1d4ed8)',
                margin: '0 auto 16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 4px 12px rgba(37, 99, 235, 0.25)',
              }}
            >
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2">
                <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
              </svg>
            </div>
          )}
          <h1
            style={{
              fontSize: '22px',
              fontWeight: '800',
              color: '#0f172a',
              marginBottom: '4px',
              letterSpacing: '-0.025em',
            }}
          >
            {branding.namaApp}
          </h1>
          <p style={{ fontSize: '13px', color: '#64748b' }}>
            {branding.subJudul} • <strong>{branding.namaKantor}</strong>
          </p>
        </div>

        {/* Card Form */}
        <div
          suppressHydrationWarning
          style={{
            background: '#ffffff',
            borderRadius: '16px',
            border: '1px solid #e2e8f0',
            boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.05), 0 8px 10px -6px rgba(0, 0, 0, 0.01)',
            padding: '32px',
          }}
        >
          <div style={{ marginBottom: '24px' }}>
            <h2 style={{ fontSize: '18px', fontWeight: '700', color: '#0f172a', marginBottom: '6px' }}>
              Masuk ke Akun Anda
            </h2>
            <p style={{ fontSize: '13px', color: '#64748b' }}>
              Masukkan kredensial yang telah terdaftar
            </p>
          </div>

          {isExpired && (
            <div
              className="animate-fade-in"
              style={{
                background: '#fffbeb',
                border: '1px solid #fcd34d',
                borderRadius: '8px',
                padding: '12px 14px',
                marginBottom: '16px',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
              }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              <span style={{ fontSize: '13px', color: '#92400e', fontWeight: '500' }}>
                Sesi Anda telah berakhir karena tidak aktif. Silakan masuk kembali.
              </span>
            </div>
          )}

          {error && (
            <div
              className="animate-fade-in"
              style={{
                background: '#fef2f2',
                border: '1px solid #fecaca',
                borderRadius: '8px',
                padding: '12px 14px',
                marginBottom: '20px',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
              }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              <span style={{ fontSize: '13px', color: '#dc2626', fontWeight: '500' }}>{error}</span>
            </div>
          )}

          <form id="login-form" action="/api/auth/login" method="POST" onSubmit={handleSubmit} suppressHydrationWarning>
            {/* 1. Input Username */}
            <div style={{ marginBottom: biometricFeatureActive ? '14px' : '18px' }}>
              <label
                style={{
                  display: 'block',
                  fontSize: '13px',
                  fontWeight: '600',
                  color: '#334155',
                  marginBottom: '8px',
                }}
              >
                Username
              </label>
              <input
                id="input-nip"
                type="text"
                name="nip"
                value={nip}
                onChange={(e) => setNip(e.target.value)}
                placeholder="Masukkan username"
                required
                autoComplete="username"
                suppressHydrationWarning
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  fontSize: '14px',
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            {/* 2. Tombol Biometrik - Tepat di Bawah Input Username (Hanya Muncul Jika Web App Sudah PRO) */}
            {biometricFeatureActive && (
              <div style={{ marginBottom: '20px' }}>
                <button
                  type="button"
                  onClick={handleBiometricLogin}
                  disabled={biometricLoading || loading}
                  suppressHydrationWarning
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    padding: '11px 16px',
                    borderRadius: '8px',
                    border: '1px solid #bfdbfe',
                    background: '#eff6ff',
                    color: '#1d4ed8',
                    fontSize: '13.5px',
                    fontWeight: '700',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                    boxShadow: '0 2px 5px rgba(37, 99, 235, 0.08)',
                  }}
                >
                  {biometricLoading ? (
                    <>
                      <div className="spinner" style={{ width: '16px', height: '16px', borderWidth: '2px' }} />
                      <span>Memeriksa Kunci Biometrik...</span>
                    </>
                  ) : (
                    <>
                      <span style={{ fontSize: '17px' }}>📱</span>
                      <span>
                        {nip.trim()
                          ? `Masuk dengan Biometrik (${nip.trim()})`
                          : 'Masuk dengan Biometrik (Sidik Jari / Wajah)'}
                      </span>
                    </>
                  )}
                </button>

                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    marginTop: '16px',
                  }}
                >
                  <div style={{ flex: 1, height: '1px', background: '#e2e8f0' }} />
                  <span style={{ fontSize: '11px', color: '#94a3b8', fontWeight: '700' }}>
                    ATAU MASUK DENGAN PASSWORD
                  </span>
                  <div style={{ flex: 1, height: '1px', background: '#e2e8f0' }} />
                </div>
              </div>
            )}

            {/* 3. Input Password */}
            <div style={{ marginBottom: '20px' }}>
              <label
                style={{
                  display: 'block',
                  fontSize: '13px',
                  fontWeight: '600',
                  color: '#334155',
                  marginBottom: '8px',
                }}
              >
                Password
              </label>
              <input
                id="input-password"
                type="password"
                name="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Masukkan password"
                required
                autoComplete="current-password"
                suppressHydrationWarning
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  fontSize: '14px',
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            {/* Hidden Input botToken for native form submission fallback */}
            <input type="hidden" name="botToken" value={botToken || ''} suppressHydrationWarning />

            {/* Cloudflare Turnstile Anti-Bot Widget */}
            <div style={{ marginBottom: '20px' }} suppressHydrationWarning>
              <TurnstileWidget
                onVerify={(token) => {
                  setBotToken(token);
                  setError('');
                }}
                onExpire={() => {
                  setBotToken('');
                  setError('Verifikasi keamanan kedaluwarsa. Silakan centang kembali.');
                }}
                onError={() => {
                  console.warn('Turnstile widget error');
                }}
              />
            </div>

            {/* 4. Tombol Login Masuk ke Sistem */}
            <button
              type="submit"
              disabled={loading || !botToken}
              suppressHydrationWarning
              style={{
                width: '100%',
                padding: '12px',
                background: !botToken
                  ? '#94a3b8'
                  : loading
                  ? '#93c5fd'
                  : 'linear-gradient(135deg, #2563eb, #1d4ed8)',
                color: '#ffffff',
                border: 'none',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: '600',
                cursor: !botToken || loading ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                boxShadow: botToken && !loading ? '0 4px 12px rgba(37, 99, 235, 0.2)' : 'none',
                transition: 'all 0.2s ease',
              }}
            >
              {loading ? (
                <>
                  <div className="spinner" style={{ width: '16px', height: '16px', borderWidth: '2px' }} />
                  <span>Memproses Masuk...</span>
                </>
              ) : !botToken ? (
                <span>Menunggu Verifikasi Keamanan...</span>
              ) : (
                <span>Masuk ke Sistem</span>
              )}
            </button>
          </form>

          {/* Info Status Biometrik & Admin Notice */}
          <div
            style={{
              marginTop: '22px',
              padding: '12px 14px',
              borderRadius: '10px',
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              textAlign: 'center',
              fontSize: '12px',
              color: '#64748b',
              lineHeight: '1.5',
            }}
          >
            🔒 <b>Keamanan Terproteksi:</b> Dilengkapi Anti-Bot & Autentikasi Biometrik Smartphone.
          </div>
        </div>

        <p
          style={{
            textAlign: 'center',
            marginTop: '24px',
            color: '#64748b',
            fontSize: '12px',
          }}
        >
          © 2026 {branding.namaApp} • {branding.namaKantor}
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="spinner" style={{ width: '32px', height: '32px' }} />
      </div>
    }>
      <LoginForm />
    </Suspense>
  );
}
