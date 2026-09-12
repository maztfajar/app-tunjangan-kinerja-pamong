'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import {
  IconEKinerjaLogo,
  IconBarChart,
  IconSettings,
  IconMapPin,
  IconUsers,
  IconUser,
  IconLogout,
  IconMenu,
  IconBook,
  IconDatabase,
  IconFileText,
  IconLock,
  IconClose,
  IconFingerprint,
} from '@/components/ui/Icons';

const superAdminMenuItems = [
  { href: '/superadmin', label: 'Ringkasan Sistem', icon: IconBarChart },
  { href: '/superadmin/pengaturan', label: 'Pengaturan Web & Logo', icon: IconSettings },
  { href: '/superadmin/lokasi', label: 'Setting Lokasi Kantor', icon: IconMapPin },
  { href: '/superadmin/format-laporan', label: 'Format Laporan & Kop', icon: IconFileText },
  { href: '/superadmin/admins', label: 'Manajemen User Admin', icon: IconUsers },
  { href: '/superadmin/database', label: 'Kelola Database', icon: IconDatabase },
  { href: '/superadmin/biometrik', label: 'Kunci Biometrik', icon: IconFingerprint },
  { href: '/superadmin/ganti-password', label: 'Ganti Password Root', icon: IconLock },
  { href: '/superadmin/panduan', label: 'Buku Panduan Super Admin', icon: IconBook },
];

export default function SuperAdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<{
    nama: string;
    nip: string;
    jabatan: string | null;
    unitKerja: string | null;
  } | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false); // mobile drawer
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false); // desktop collapse
  const [profileOpen, setProfileOpen] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);
  const [settings, setSettings] = useState<{ namaApp: string; namaKantor: string; logoUrl?: string | null }>({
    namaApp: 'E-KINERJA',
    namaKantor: 'Kalurahan',
  });
  const [isMobile, setIsMobile] = useState(false);
  const [hasBiometricRegistered, setHasBiometricRegistered] = useState(false);
  const [biometricActionLoading, setBiometricActionLoading] = useState(false);
  const [biometricFeedback, setBiometricFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [licenseFeatures, setLicenseFeatures] = useState<{ customKop?: boolean; biometrics?: boolean } | null>(null);

  useEffect(() => {
    fetch('/api/license/status')
      .then((res) => res.json())
      .then((data) => {
        if (data?.features) setLicenseFeatures(data.features);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const mobileCheck =
        /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
        (window.innerWidth <= 1024 && (navigator.maxTouchPoints > 0 || /iPhone|iPad|iPod|Android/i.test(navigator.userAgent))) ||
        window.innerWidth <= 768;
      setIsMobile(mobileCheck);
    }
  }, []);

  useEffect(() => {
    if (isMobile && licenseFeatures?.biometrics) {
      fetch('/api/auth/biometric/check')
        .then((res) => res.json())
        .then((data) => {
          if (data.registered !== undefined) {
            setHasBiometricRegistered(Boolean(data.registered));
          } else if (data.hasBiometric !== undefined) {
            setHasBiometricRegistered(Boolean(data.hasBiometric));
          }
        })
        .catch(() => {});
    }
  }, [isMobile, licenseFeatures?.biometrics, profileOpen]);

  const handleRegisterBiometric = async () => {
    try {
      setBiometricActionLoading(true);
      setBiometricFeedback(null);

      const res = await fetch('/api/auth/biometric/register');
      const data = await res.json();
      if (!res.ok || !data.options) {
        setBiometricFeedback({ type: 'error', message: data.error || 'Gagal memulai pendaftaran biometrik.' });
        setBiometricActionLoading(false);
        return;
      }

      const { challenge, rp, user: bioUser, pubKeyCredParams, authenticatorSelection, timeout } = data.options;
      const challengeBytes = Uint8Array.from(atob(challenge.replace(/-/g, '+').replace(/_/g, '/')), (c) =>
        c.charCodeAt(0)
      );
      const userIdBytes = new TextEncoder().encode(bioUser.id);

      const credential = (await navigator.credentials.create({
        publicKey: {
          challenge: challengeBytes,
          rp: {
            name: rp?.name || 'E-Kinerja Pamong Kalurahan',
            id: window.location.hostname,
          },
          user: {
            id: userIdBytes,
            name: bioUser.name,
            displayName: bioUser.displayName,
          },
          pubKeyCredParams,
          authenticatorSelection: {
            authenticatorAttachment: 'platform',
            userVerification: 'required',
            residentKey: 'required',
          },
          timeout: timeout || 60000,
          attestation: 'none',
        },
      })) as PublicKeyCredential | null;

      if (!credential) {
        setBiometricFeedback({ type: 'error', message: 'Pendaftaran dibatalkan.' });
        setBiometricActionLoading(false);
        return;
      }

      const postRes = await fetch('/api/auth/biometric/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          credentialId: credential.id,
          challenge,
          deviceLabel: /iPhone|iPad|iPod/i.test(navigator.userAgent) ? 'Apple Face/Touch ID' : 'Android Biometric',
        }),
      });

      const postData = await postRes.json();
      if (!postRes.ok) {
        setBiometricFeedback({ type: 'error', message: postData.error || 'Gagal menyimpan kunci biometrik.' });
      } else {
        setHasBiometricRegistered(true);
        setBiometricFeedback({
          type: 'success',
          message: 'Biometrik ponsel berhasil diaktifkan! Anda kini bisa masuk dengan wajah / sidik jari.',
        });
      }
    } catch (err: unknown) {
      const msg = (err as Error)?.message || '';
      if (msg.includes('NotAllowedError') || msg.includes('canceled')) {
        setBiometricFeedback({ type: 'error', message: 'Pemindaian biometrik dibatalkan.' });
      } else {
        setBiometricFeedback({
          type: 'error',
          message: 'Gagal mengaktifkan biometrik. Pastikan kunci layar di ponsel aktif.',
        });
      }
    } finally {
      setBiometricActionLoading(false);
    }
  };

  const handleRemoveBiometric = async () => {
    if (!confirm('Apakah Anda yakin ingin menonaktifkan biometrik di ponsel ini?')) return;
    try {
      setBiometricActionLoading(true);
      setBiometricFeedback(null);
      const res = await fetch('/api/auth/biometric/check', { method: 'DELETE' });
      if (res.ok) {
        setHasBiometricRegistered(false);
        setBiometricFeedback({ type: 'success', message: 'Biometrik berhasil dinonaktifkan dari ponsel ini.' });
      } else {
        setBiometricFeedback({ type: 'error', message: 'Gagal menghapus biometrik.' });
      }
    } catch {
      setBiometricFeedback({ type: 'error', message: 'Terjadi kesalahan jaringan.' });
    } finally {
      setBiometricActionLoading(false);
    }
  };

  useEffect(() => {
    fetch('/api/auth/me')
      .then((r) => r.json())
      .then((d) => {
        if (!d.user || d.user.role !== 'SUPERADMIN') {
          router.push('/login');
        } else {
          setUser(d.user);
          setAuthChecked(true);
        }
      })
      .catch(() => router.push('/login'));

    fetch('/api/settings')
      .then((r) => r.json())
      .then((d) => {
        if (d.settings) setSettings(d.settings);
      })
      .catch(() => {});
  }, [router]);

  useEffect(() => {
    setSidebarOpen(false);
    setProfileOpen(false);
  }, [pathname]);

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
  };

  const handleToggleSidebar = () => {
    // Desktop: toggle collapsed, Mobile: toggle drawer
    if (typeof window !== 'undefined' && window.innerWidth >= 1024) {
      setSidebarCollapsed((prev) => !prev);
    } else {
      setSidebarOpen((prev) => !prev);
    }
  };

  if (!authChecked) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8fafc' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
          <div className="spinner" style={{ width: '32px', height: '32px' }} />
          <span style={{ fontSize: '13px', color: '#64748b', fontWeight: '600' }}>Memverifikasi Hak Akses Super Admin...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="app-container">
      {/* Mobile Backdrop */}
      {sidebarOpen && (
        <div
          className="mobile-backdrop"
          onClick={() => setSidebarOpen(false)}
          aria-label="Tutup menu samping"
        />
      )}

      {/* Clean White Responsive Sidebar Drawer */}
      <aside
        className={['app-sidebar', sidebarOpen && 'open', sidebarCollapsed && 'collapsed'].filter(Boolean).join(' ')}
        style={{ padding: sidebarCollapsed ? '20px 8px' : '20px 16px' }}
      >
        {/* Header Sidebar */}
        <div
          className="sidebar-header-logo"
          style={{
            display: 'flex',
            justifyContent: sidebarCollapsed ? 'center' : 'flex-start',
            alignItems: 'center',
            marginBottom: '16px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', justifyContent: sidebarCollapsed ? 'center' : 'flex-start' }}>
            {settings.logoUrl ? (
              <img
                src={settings.logoUrl}
                alt="Logo"
                style={{ width: '36px', height: '36px', objectFit: 'contain', borderRadius: '8px', flexShrink: 0 }}
              />
            ) : (
              <IconEKinerjaLogo size={36} />
            )}
            <div className="sidebar-header-text">
              <div style={{ fontSize: '16px', fontWeight: '800', color: '#1e293b', letterSpacing: '-0.02em', lineHeight: '1.2' }}>
                {settings.namaApp || 'E-KINERJA'}
              </div>
              <div style={{ fontSize: '9px', fontWeight: '800', color: '#7c3aed', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                SUPER ADMINISTRATOR
              </div>
            </div>
          </div>
        </div>

        {/* MAIN MENU Section Header */}
        <div className="sidebar-section-label" style={{ padding: '0 12px', marginBottom: '8px' }}>
          <span style={{ fontSize: '11px', fontWeight: '800', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            SUPER ADMIN MENU
          </span>
        </div>

        {/* Navigation */}
        <nav style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {superAdminMenuItems
              .filter((item) => {
                if (item.href === '/superadmin/format-laporan' && !licenseFeatures?.customKop) {
                  return false;
                }
                if (item.href === '/superadmin/biometrik' && !licenseFeatures?.biometrics) {
                  return false;
                }
                return true;
              })
              .map((item) => {
              const IconComponent = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  prefetch={false}
                  className={`sidebar-link ${isActive ? 'active' : ''}`}
                  data-tooltip={item.label}
                  onClick={() => setSidebarOpen(false)}
                >
                  <IconComponent size={18} color={isActive ? '#4361ee' : '#64748b'} />
                  <span style={{ flex: 1 }}>{item.label}</span>
                </Link>
              );
            })}
          </div>
        </nav>

        {/* Root Badge Card */}
        <div
          className="sidebar-badge-card"
          style={{
            marginTop: '12px',
            marginBottom: '12px',
            padding: '12px',
            borderRadius: '12px',
            background: 'linear-gradient(135deg, #0077b6 0%, #0089d7 50%, #00a9ef 100%)',
            color: '#ffffff',
            boxShadow: '0 4px 12px rgba(0, 137, 215, 0.3)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '34px',
                height: '34px',
                borderRadius: '8px',
                background: 'rgba(255, 255, 255, 0.25)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#ffffff',
                flexShrink: 0,
              }}
            >
              <IconUser size={18} color="#ffffff" />
            </div>
            <div style={{ overflow: 'hidden' }}>
              <div style={{ fontSize: '12px', fontWeight: '800', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
                ROOT (Super Admin)
              </div>
              <div style={{ fontSize: '10px', color: '#e0f2fe', fontWeight: '600' }}>
                Akses Penuh Sistem (.env)
              </div>
            </div>
          </div>
        </div>

        {/* Footer Logout (Dengan safe-area padding ekstra agar tidak tertutup Google Chrome mobile) */}
        <div
          style={{
            paddingTop: '10px',
            paddingBottom: 'calc(24px + env(safe-area-inset-bottom, 14px))',
            borderTop: '1px solid #eaedf2',
            marginTop: 'auto',
            flexShrink: 0,
          }}
        >
          <button
            onClick={handleLogout}
            className="sidebar-link"
            data-tooltip="Keluar (Logout)"
            style={{
              width: '100%',
              border: '1px solid #fee2e2',
              background: '#fff1f2',
              cursor: 'pointer',
              color: '#ef4444',
              fontFamily: 'inherit',
              justifyContent: 'center',
              fontWeight: '600',
              gap: '8px',
              touchAction: 'manipulation',
            }}
          >
            <IconLogout size={16} color="#ef4444" />
            <span className="sidebar-logout-text">Keluar (Logout)</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className={['app-main', sidebarCollapsed && 'sidebar-collapsed'].filter(Boolean).join(' ')}>
        {/* Top Navbar */}
        <header className="top-navbar">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <button
              onClick={handleToggleSidebar}
              style={{
                background: '#ffffff',
                border: '1px solid #cbd5e1',
                borderRadius: '8px',
                color: '#334155',
                width: '36px',
                height: '36px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
                transition: 'all 0.15s ease',
              }}
              title={sidebarCollapsed ? 'Perluas Menu' : 'Sembunyikan Menu'}
              aria-label="Toggle sidebar"
            >
              <IconMenu size={18} color="#334155" />
            </button>
            <div>
              <h1 style={{ fontSize: '15px', fontWeight: '700', color: '#0f172a' }}>
                {superAdminMenuItems.find((item) => item.href === pathname)?.label || 'Super Admin'}
              </h1>
              <p style={{ fontSize: '11px', color: '#64748b' }}>
                {settings.namaKantor || 'Kalurahan'} • Hak Akses Root
              </p>
            </div>
          </div>

          {/* Right Header: Greeting & Role (Klik untuk buka Menu Profil & Logout) */}
          <button
            type="button"
            onClick={() => setProfileOpen(true)}
            className="top-navbar-right"
            style={{
              background: 'none',
              border: 'none',
              padding: '4px 8px',
              borderRadius: '10px',
              cursor: 'pointer',
              touchAction: 'manipulation',
              WebkitTapHighlightColor: 'transparent',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
            }}
            title="Buka Menu Profil & Logout"
            aria-label="Menu Profil Super Admin"
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div
                style={{
                  width: '32px',
                  height: '32px',
                  minWidth: '32px',
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #7c3aed 0%, #4338ca 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#ffffff',
                  boxShadow: '0 2px 4px rgba(124, 58, 237, 0.3)',
                }}
              >
                <IconUser size={16} color="#ffffff" />
              </div>
              <span
                className="top-navbar-greeting-text"
                style={{
                  fontSize: '12px',
                  fontWeight: '800',
                  color: '#334155',
                  letterSpacing: '0.02em',
                  whiteSpace: 'nowrap',
                }}
              >
                {user?.nama ? `HI, ${user.nama.split(' ')[0].toUpperCase()}` : 'HI, SUPER ADMIN'}
              </span>
            </div>
            <span
              className="badge"
              style={{
                background: 'linear-gradient(135deg, #f5f3ff 0%, #ede9fe 100%)',
                color: '#6d28d9',
                border: '1px solid #c4b5fd',
                fontSize: '11px',
                fontWeight: '800',
                padding: '4px 10px',
                borderRadius: '9999px',
                letterSpacing: '0.04em',
                whiteSpace: 'nowrap',
              }}
            >
              ROOT
            </span>
          </button>
        </header>

        {/* Page Content */}
        <div className="app-content animate-fade-in">
          {children}
        </div>
      </main>

      {/* =========================================================
          MODAL / DROPDOWN PROFIL & LOGOUT SUPER ADMIN
          ========================================================= */}
      {profileOpen && (
        <>
          <div
            className="profile-modal-backdrop"
            onClick={() => setProfileOpen(false)}
            role="button"
            tabIndex={-1}
            aria-label="Tutup menu profil"
          />
          <div className="profile-modal-content">
            {/* Header Profil Super Admin */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
                <div
                  style={{
                    width: '46px',
                    height: '46px',
                    minWidth: '46px',
                    borderRadius: '12px',
                    background: 'linear-gradient(135deg, #7c3aed 0%, #4338ca 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#ffffff',
                    boxShadow: '0 4px 12px rgba(124, 58, 237, 0.3)',
                    flexShrink: 0,
                  }}
                >
                  <IconUser size={24} color="#ffffff" />
                </div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: '15px', fontWeight: '800', color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {user?.nama || 'Super Administrator'}
                  </div>
                  <p style={{ fontSize: '11px', color: '#64748b', marginTop: '1px' }}>
                    Username / Root: <span style={{ fontFamily: 'monospace', fontWeight: '600' }}>{user?.nip || 'superadmin'}</span>
                  </p>
                  <p style={{ fontSize: '11px', color: '#7c3aed', fontWeight: '700', marginTop: '1px' }}>
                    Super Admin (Hak Akses Root)
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setProfileOpen(false)}
                style={{
                  background: '#f1f5f9',
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                  width: '32px',
                  height: '32px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  flexShrink: 0,
                }}
                aria-label="Tutup"
              >
                <IconClose size={16} color="#64748b" />
              </button>
            </div>

            {/* Menu Tambahan Super Admin */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '16px' }}>
              <Link
                href="/superadmin/panduan"
                prefetch={false}
                onClick={() => setProfileOpen(false)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '11px 14px',
                  borderRadius: '10px',
                  background: pathname === '/superadmin/panduan' ? '#eff6ff' : '#f8fafc',
                  border: pathname === '/superadmin/panduan' ? '1px solid #bfdbfe' : '1px solid #e2e8f0',
                  color: pathname === '/superadmin/panduan' ? '#7c3aed' : '#334155',
                  textDecoration: 'none',
                  fontSize: '13px',
                  fontWeight: '600',
                  touchAction: 'manipulation',
                }}
              >
                <IconBook size={18} color={pathname === '/superadmin/panduan' ? '#7c3aed' : '#64748b'} />
                <span style={{ flex: 1 }}>Buku Panduan Super Admin</span>
              </Link>
            </div>

            {/* Menu Biometrik Ponsel (Hanya smartphone & jika fitur aktif) */}
            {isMobile && licenseFeatures?.biometrics && (
              <div
                style={{
                  marginBottom: '16px',
                  padding: '12px 14px',
                  borderRadius: '10px',
                  background: hasBiometricRegistered ? '#f0fdf4' : '#eff6ff',
                  border: hasBiometricRegistered ? '1px solid #bbf7d0' : '1px solid #bfdbfe',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                  <IconFingerprint size={18} color={hasBiometricRegistered ? '#16a34a' : '#7c3aed'} />
                  <span
                    style={{
                      fontSize: '13px',
                      fontWeight: '700',
                      color: hasBiometricRegistered ? '#15803d' : '#6d28d9',
                    }}
                  >
                    Kunci Biometrik (Wajah / Sidik Jari)
                  </span>
                </div>
                <p style={{ fontSize: '11px', color: '#64748b', margin: '0 0 10px 0', lineHeight: 1.4 }}>
                  {hasBiometricRegistered
                    ? 'Ponsel ini terdaftar untuk login biometrik. Anda dapat masuk langsung menggunakan sensor wajah atau sidik jari ponsel.'
                    : 'Daftarkan sensor wajah atau sidik jari ponsel ini agar login berikutnya tidak perlu mengetik password.'}
                </p>

                {biometricFeedback && (
                  <div
                    style={{
                      padding: '8px 10px',
                      borderRadius: '6px',
                      fontSize: '11px',
                      marginBottom: '10px',
                      background: biometricFeedback.type === 'success' ? '#dcfce7' : '#fee2e2',
                      color: biometricFeedback.type === 'success' ? '#166534' : '#991b1b',
                    }}
                  >
                    {biometricFeedback.message}
                  </div>
                )}

                {hasBiometricRegistered ? (
                  <button
                    type="button"
                    disabled={biometricActionLoading}
                    onClick={handleRemoveBiometric}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: '8px',
                      border: '1px solid #fecaca',
                      background: '#ffffff',
                      color: '#dc2626',
                      fontSize: '12px',
                      fontWeight: '600',
                      cursor: 'pointer',
                    }}
                  >
                    {biometricActionLoading ? 'Memproses...' : 'Hapus Biometrik Dari Ponsel Ini'}
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled={biometricActionLoading}
                    onClick={handleRegisterBiometric}
                    style={{
                      width: '100%',
                      padding: '9px 12px',
                      borderRadius: '8px',
                      border: 'none',
                      background: '#7c3aed',
                      color: '#ffffff',
                      fontSize: '12px',
                      fontWeight: '600',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px',
                    }}
                  >
                    <IconFingerprint size={16} color="#ffffff" />
                    {biometricActionLoading ? 'Menunggu Sensor Ponsel...' : 'Daftarkan Biometrik Ponsel Ini'}
                  </button>
                )}
              </div>
            )}

            {/* Menu Hapus Biometrik di Bagian Bawah Sendiri */}
            {isMobile && (
              <button
                type="button"
                onClick={handleRemoveBiometric}
                disabled={biometricActionLoading}
                style={{
                  width: '100%',
                  padding: '11px 14px',
                  marginBottom: '10px',
                  borderRadius: '10px',
                  border: '1px solid #fed7aa',
                  background: '#fff7ed',
                  color: '#c2410c',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  fontSize: '13px',
                  fontWeight: '700',
                  cursor: 'pointer',
                  touchAction: 'manipulation',
                }}
              >
                <IconFingerprint size={17} color="#c2410c" />
                <span>{biometricActionLoading ? 'Memproses...' : 'Hapus Kunci Biometrik Ponsel'}</span>
              </button>
            )}

            {/* Logout Button */}
            <button
              type="button"
              onClick={handleLogout}
              style={{
                width: '100%',
                padding: '12px',
                borderRadius: '10px',
                border: '1px solid #fee2e2',
                background: '#fff1f2',
                color: '#dc2626',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                fontSize: '13px',
                fontWeight: '700',
                cursor: 'pointer',
                touchAction: 'manipulation',
              }}
            >
              <IconLogout size={17} color="#dc2626" />
              <span>Keluar (Logout)</span>
            </button>
          </div>
        </>
      )}
    </div>
  );
}
