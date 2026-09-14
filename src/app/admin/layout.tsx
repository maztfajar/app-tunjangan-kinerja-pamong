'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import {
  IconEKinerjaLogo,
  IconBarChart,
  IconMapPin,
  IconUsers,
  IconBriefcase,
  IconClipboardCheck,
  IconFileText,
  IconClock,
  IconCalendar,
  IconBook,
  IconUser,
  IconLogout,
  IconMenu,
  IconClose,
  IconFingerprint,
} from '@/components/ui/Icons';

const adminMenuItems = [
  { href: '/admin', label: 'Dashboard', icon: IconBarChart },
  { href: '/admin/pegawai', label: 'Data Pegawai', icon: IconUsers },
  { href: '/admin/jabatan', label: 'Jabatan & Unit Kerja', icon: IconBriefcase },
  { href: '/admin/master-kinerja', label: 'Master Kinerja Jabatan', icon: IconClipboardCheck },
  { href: '/admin/rekap', label: 'Rekap Absensi', icon: IconClipboardCheck },
  { href: '/admin/rekap-aktivitas', label: 'Rekap Log Aktivitas', icon: IconClipboardCheck },
  { href: '/admin/rekap-laporan', label: 'Rekap Laporan', icon: IconFileText },
  { href: '/admin/jam-kerja', label: 'Jam Kerja', icon: IconClock },
  { href: '/admin/hari-libur', label: 'Hari Libur', icon: IconCalendar },
  { href: '/admin/biometrik', label: 'Kunci Biometrik', icon: IconFingerprint },
  { href: '/admin/panduan', label: 'Buku Panduan Admin', icon: IconBook },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<{
    nama: string;
    username?: string;
    nip: string;
    jabatan: string | null;
    unitKerja: string | null;
    role?: string | null;
  } | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [settings, setSettings] = useState<{ namaApp: string; namaKantor: string; logoUrl?: string | null }>({
    namaApp: 'E-KINERJA',
    namaKantor: 'Kalurahan',
  });
  const [isMobile, setIsMobile] = useState(false);
  const [hasBiometricRegistered, setHasBiometricRegistered] = useState(false);
  const [biometricActionLoading, setBiometricActionLoading] = useState(false);
  const [biometricFeedback, setBiometricFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [pendingSuketCount, setPendingSuketCount] = useState(0);
  const [licenseFeatures, setLicenseFeatures] = useState<{ holidayCalendar?: boolean; suket?: boolean; biometrics?: boolean } | null>(null);

  useEffect(() => {
    fetch('/api/license/status')
      .then((res) => res.json())
      .then((data) => {
        if (data?.features) setLicenseFeatures(data.features);
      })
      .catch(() => {});
  }, []);

  // Ambil jumlah pengajuan suket yang menunggu tindakan (hanya jika fitur suket aktif)
  useEffect(() => {
    if (licenseFeatures?.suket) {
      fetch('/api/admin/suket')
        .then((res) => res.json())
        .then((data) => {
          if (data.pendingCount !== undefined) {
            setPendingSuketCount(data.pendingCount);
          }
        })
        .catch(() => {});
    }
  }, [pathname, licenseFeatures?.suket]);

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
    if (isMobile) {
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
  }, [profileOpen, isMobile]);

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
        if (d.user) setUser(d.user);
      })
      .catch(() => {});

    fetch('/api/settings')
      .then((r) => r.json())
      .then((d) => {
        if (d.settings) setSettings(d.settings);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    setSidebarOpen(false);
    setProfileOpen(false);
  }, [pathname]);

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
  };

  const handleToggleSidebar = () => {
    if (typeof window !== 'undefined' && window.innerWidth >= 1024) {
      setSidebarCollapsed((prev) => !prev);
    } else {
      setSidebarOpen((prev) => !prev);
    }
  };

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

      {/* Clean White Responsive Sidebar Drawer (Style BKN E-Kinerja) */}
      <aside
        className={['app-sidebar', sidebarOpen && 'open', sidebarCollapsed && 'collapsed'].filter(Boolean).join(' ')}
        style={{ padding: sidebarCollapsed ? '20px 8px' : '20px 16px' }}
      >
        {/* Header Drawer */}
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
              <div style={{ fontSize: '9px', fontWeight: '700', color: '#4361ee', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                {settings.namaKantor || 'Kalurahan'} • ADMIN
              </div>
            </div>
          </div>
        </div>

        {/* MAIN MENU Section Header */}
        <div className="sidebar-section-label" style={{ padding: '0 12px', marginBottom: '8px' }}>
          <span style={{ fontSize: '11px', fontWeight: '800', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            MAIN MENU
          </span>
        </div>

        {/* Navigation */}
        <nav style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
            {adminMenuItems
              .filter((item) => {
                if (item.href === '/admin/hari-libur' && !licenseFeatures?.holidayCalendar) {
                  return false;
                }
                if (item.href === '/admin/biometrik' && !licenseFeatures?.biometrics) {
                  return false;
                }
                return true;
              })
              .map((item) => {
              const IconComponent = item.icon;
              const isActive = pathname === item.href;
              const isRekap = item.href === '/admin/rekap';
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
                  {isRekap && pendingSuketCount > 0 && (
                    <span
                      style={{
                        background: '#f59e0b',
                        color: '#ffffff',
                        borderRadius: '10px',
                        padding: '1px 6px',
                        fontSize: '10px',
                        fontWeight: '800',
                        lineHeight: '1.4',
                      }}
                    >
                      {pendingSuketCount}
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
        </nav>

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
              title={sidebarCollapsed ? 'Perluas Menu' : 'Sembunyikan Menu (Hanya Ikon)'}
              aria-label="Menu navigasi admin"
            >
              <IconMenu size={18} color="#334155" />
            </button>
            <div>
              <h1 style={{ fontSize: '15px', fontWeight: '700', color: '#0f172a' }}>
                {adminMenuItems.find((item) => item.href === pathname)?.label || 'Panel Admin'}
              </h1>
              <p style={{ fontSize: '11px', color: '#64748b' }}>
                {settings.namaKantor || 'Kalurahan'} • Panel Administrator
              </p>
            </div>
          </div>

          {/* Right Header: Avatar & Greeting (Klik untuk buka Menu Profil & Logout) */}
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
            aria-label="Menu Profil Admin"
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div
                style={{
                  width: '32px',
                  height: '32px',
                  minWidth: '32px',
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #4361ee 0%, #3a0ca3 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#ffffff',
                  boxShadow: '0 2px 4px rgba(67, 97, 238, 0.25)',
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
                {user?.nama ? `HI, ${user.nama.split(' ')[0].toUpperCase()}` : 'HI, ADMINISTRATOR'}
              </span>
            </div>
            <span
              className="badge"
              style={{
                background: '#eff6ff',
                color: '#4361ee',
                border: '1px solid #bfdbfe',
                fontSize: '11px',
                fontWeight: '700',
                padding: '4px 10px',
                borderRadius: '9999px',
                whiteSpace: 'nowrap',
              }}
            >
              ADMIN
            </span>
          </button>
        </header>

        {/* Page Content */}
        <div className="app-content animate-fade-in">
          {children}
        </div>
      </main>

      {/* =========================================================
          MODAL / DROPDOWN PROFIL & LOGOUT ADMIN
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
            {/* Header Profil Admin */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
                <div
                  style={{
                    width: '46px',
                    height: '46px',
                    minWidth: '46px',
                    borderRadius: '12px',
                    background: 'linear-gradient(135deg, #4361ee 0%, #3a0ca3 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#ffffff',
                    boxShadow: '0 4px 12px rgba(67, 97, 238, 0.25)',
                    flexShrink: 0,
                  }}
                >
                  <IconUser size={24} color="#ffffff" />
                </div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: '15px', fontWeight: '800', color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {user?.nama || 'Administrator'}
                  </div>
                  <p style={{ fontSize: '11px', color: '#64748b', marginTop: '1px' }}>
                    Username: <span style={{ fontFamily: 'monospace', fontWeight: '600' }}>{user?.username || user?.nip || 'admin'}</span>
                  </p>
                  <p style={{ fontSize: '11px', color: '#4361ee', fontWeight: '700', marginTop: '1px' }}>
                    {user?.jabatan || 'Administrator Sistem'}
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

            {/* Menu Tambahan Admin */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '16px' }}>
              <Link
                href="/admin/panduan"
                prefetch={false}
                onClick={() => setProfileOpen(false)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '11px 14px',
                  borderRadius: '10px',
                  background: pathname === '/admin/panduan' ? '#eff6ff' : '#f8fafc',
                  border: pathname === '/admin/panduan' ? '1px solid #bfdbfe' : '1px solid #e2e8f0',
                  color: pathname === '/admin/panduan' ? '#4361ee' : '#334155',
                  textDecoration: 'none',
                  fontSize: '13px',
                  fontWeight: '600',
                  touchAction: 'manipulation',
                }}
              >
                <IconBook size={18} color={pathname === '/admin/panduan' ? '#4361ee' : '#64748b'} />
                <span style={{ flex: 1 }}>Buku Panduan Admin</span>
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
                  <IconFingerprint size={18} color={hasBiometricRegistered ? '#16a34a' : '#2563eb'} />
                  <span
                    style={{
                      fontSize: '13px',
                      fontWeight: '700',
                      color: hasBiometricRegistered ? '#15803d' : '#1d4ed8',
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
                      background: '#2563eb',
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
