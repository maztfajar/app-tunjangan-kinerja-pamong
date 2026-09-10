'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState, useEffect, useRef } from 'react';
import {
  IconEKinerjaLogo,
  IconHome,
  IconMapPin,
  IconBarChart,
  IconClipboardCheck,

  IconClock,
  IconFileText,
  IconCalendar,
  IconBook,
  IconUser,
  IconLogout,
  IconMenu,
  IconClose,
  IconFingerprint,
} from '@/components/ui/Icons';

// Urutan menu berlaku di website (sidebar) dan smartphone (bottom nav):
// 1. Beranda, 2. Presensi, 3. Aktivitas, 4. Laporan Kinerja, 5. Rekapan Absensi, 6. Log Aktivitas, 7. Agenda Kegiatan
const menuItems = [
  { href: '/dashboard', label: 'Beranda', icon: IconHome },
  { href: '/dashboard/presensi', label: 'Presensi', icon: IconMapPin },
  { href: '/dashboard/aktifitas', label: 'Aktivitas Harian', icon: IconClock },
  { href: '/dashboard/laporan', label: 'Laporan Kinerja', icon: IconFileText },
  { href: '/dashboard/rekap', label: 'Rekapan Absensi', icon: IconBarChart },
  { href: '/dashboard/task', label: 'Log Aktivitas', icon: IconClipboardCheck },
  { href: '/dashboard/agenda', label: 'Agenda Kegiatan', icon: IconCalendar },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<{
    nama: string;
    nip: string;
    jabatan: string | null;
    unitKerja: string | null;
  } | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [settings, setSettings] = useState<{ namaApp: string; namaKantor: string; logoUrl?: string | null }>({
    namaApp: 'E-KINERJA',
    namaKantor: 'Kalurahan',
  });
  const [isMobile, setIsMobile] = useState(false);
  const [supportsBiometric, setSupportsBiometric] = useState(false);
  const [hasBiometricRegistered, setHasBiometricRegistered] = useState(false);
  const [biometricActionLoading, setBiometricActionLoading] = useState(false);
  const [biometricFeedback, setBiometricFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [showBiometricPrompt, setShowBiometricPrompt] = useState(true);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const mobileCheck =
        /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
        (window.innerWidth <= 1024 && (navigator.maxTouchPoints > 0 || /iPhone|iPad|iPod|Android/i.test(navigator.userAgent))) ||
        window.innerWidth <= 768;
      setIsMobile(mobileCheck);

      if (mobileCheck && window.PublicKeyCredential) {
        window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable()
          .then((available) => setSupportsBiometric(available))
          .catch(() => setSupportsBiometric(false));
      }
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
          timeout: 60000,
          attestation: 'none',
        },
      })) as PublicKeyCredential | null;

      if (!credential) {
        setBiometricFeedback({ type: 'error', message: 'Pendaftaran biometrik dibatalkan.' });
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
          message: 'Gagal mengaktifkan biometrik. Pastikan kunci layar (PIN/Wajah/Sidik Jari) di ponsel aktif.',
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

  // Tutup drawer mobile saat route berubah dan scroll item aktif ke viewport
  const bottomNavRef = useRef<HTMLElement>(null);
  useEffect(() => {
    setSidebarOpen(false);
    if (bottomNavRef.current) {
      const activeEl = bottomNavRef.current.querySelector<HTMLElement>('.bottom-nav-item.active');
      if (activeEl) {
        activeEl.scrollIntoView({ inline: 'center', block: 'nearest', behavior: 'smooth' });
      }
    }
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

  // Cek apakah halaman saat ini adalah menu sekunder (Rekap, Laporan, Agenda, Panduan)
  const isSecondaryPage = ['/dashboard/rekap', '/dashboard/laporan', '/dashboard/agenda', '/dashboard/panduan'].includes(pathname);

  return (
    <div className="app-container" suppressHydrationWarning>
      {/* Mobile Backdrop saat Drawer terbuka */}
      {sidebarOpen && (
        <div
          className="mobile-backdrop"
          onClick={() => setSidebarOpen(false)}
          aria-label="Tutup menu samping"
          role="button"
          tabIndex={-1}
        />
      )}

      {/* Clean White Responsive Sidebar Drawer (Style BKN E-Kinerja) */}
      <aside
        className={['app-sidebar', sidebarOpen && 'open', sidebarCollapsed && 'collapsed'].filter(Boolean).join(' ')}
        style={{
          padding: sidebarCollapsed ? '20px 8px' : '16px 14px',
        }}
      >
        {/* Header Logo E-Kinerja */}
        <div
          className="sidebar-header-logo"
          style={{
            display: 'flex',
            justifyContent: sidebarCollapsed ? 'center' : 'flex-start',
            alignItems: 'center',
            marginBottom: '14px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0, justifyContent: sidebarCollapsed ? 'center' : 'flex-start' }}>
            {settings.logoUrl ? (
              <img
                src={settings.logoUrl}
                alt="Logo"
                style={{ width: '34px', height: '34px', objectFit: 'contain', borderRadius: '8px', flexShrink: 0 }}
              />
            ) : (
              <IconEKinerjaLogo size={34} />
            )}
            <div className="sidebar-header-text" style={{ minWidth: 0 }}>
              <div style={{ fontSize: '15px', fontWeight: '800', color: '#1e293b', letterSpacing: '-0.02em', lineHeight: '1.2', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {settings.namaApp || 'E-KINERJA'}
              </div>
              <div style={{ fontSize: '9px', fontWeight: '700', color: '#94a3b8', letterSpacing: '0.06em', textTransform: 'uppercase', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {settings.namaKantor || 'Kalurahan'}
              </div>
            </div>
          </div>
        </div>

        {/* Buku Panduan Quick Link (Style BKN E-Kinerja) */}
        <div style={{ marginBottom: '10px' }}>
          <Link
            href="/dashboard/panduan"
            prefetch={false}
            className={`sidebar-link ${pathname === '/dashboard/panduan' ? 'active' : ''}`}
            data-tooltip="Buku Panduan"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              padding: '8px 12px',
              borderRadius: '8px',
              fontSize: '13px',
              color: pathname === '/dashboard/panduan' ? '#4361ee' : '#475569',
              background: pathname === '/dashboard/panduan' ? '#eff6ff' : 'transparent',
              border: pathname === '/dashboard/panduan' ? '1px solid #bfdbfe' : '1px solid transparent',
              textDecoration: 'none',
              fontWeight: pathname === '/dashboard/panduan' ? '700' : '600',
              transition: 'all 0.15s ease',
            }}
          >
            <IconBook size={18} color={pathname === '/dashboard/panduan' ? '#4361ee' : '#64748b'} />
            <span>Buku Panduan</span>
          </Link>
        </div>

        {/* MAIN MENU Label */}
        <div className="sidebar-section-label" style={{ padding: '0 12px', marginBottom: '6px' }}>
          <span style={{ fontSize: '10px', fontWeight: '800', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            MAIN MENU
          </span>
        </div>

        {/* Menu Navigation */}
        <nav style={{ flex: 1, overflowY: 'auto' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
            {menuItems.map((item) => {
              const IconComponent = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  prefetch={false}
                  className={`sidebar-link ${isActive ? 'active' : ''}`}
                  data-tooltip={item.label}
                >
                  <IconComponent size={18} color={isActive ? '#4361ee' : '#64748b'} />
                  <span style={{ flex: 1 }}>{item.label}</span>
                </Link>
              );
            })}
            {isMobile && (
              <button
                type="button"
                onClick={() => {
                  setSidebarOpen(false);
                  if (hasBiometricRegistered) {
                    handleRemoveBiometric();
                  } else {
                    setProfileOpen(true);
                  }
                }}
                className="sidebar-link"
                style={{
                  width: '100%',
                  textAlign: 'left',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: hasBiometricRegistered ? '#c2410c' : '#2563eb',
                  fontFamily: 'inherit',
                  padding: '9px 12px',
                  borderRadius: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  fontSize: '13px',
                  fontWeight: '600',
                }}
              >
                <IconFingerprint size={18} color={hasBiometricRegistered ? '#ea580c' : '#2563eb'} />
                <span>{hasBiometricRegistered ? 'Hapus Biometrik' : 'Kunci Biometrik'}</span>
              </button>
            )}
          </div>
        </nav>

        {/* Profil Card Pamong di Bawah Sidebar */}
        <div
          className="sidebar-profile-card"
          data-tooltip={`${user?.nama || 'Pamong'} (${user?.nip || '-'})`}
          style={{
            marginTop: '10px',
            marginBottom: '10px',
            padding: '10px 12px',
            borderRadius: '10px',
            background: '#f8fafc',
            border: '1px solid #eaedf2',
            position: 'relative',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '34px',
                height: '34px',
                borderRadius: '8px',
                background: '#4361ee',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#ffffff',
                flexShrink: 0,
              }}
            >
              <IconUser size={17} color="#ffffff" />
            </div>
            <div className="sidebar-profile-info" style={{ overflow: 'hidden', minWidth: 0 }}>
              <div
                style={{
                  fontSize: '13px',
                  fontWeight: '700',
                  color: '#0f172a',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
                title={user?.nama || 'Pegawai Pamong'}
              >
                {user?.nama || 'Pamong'}
              </div>
              <p style={{ fontSize: '11px', color: '#64748b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {user?.jabatan || 'Pamong Kalurahan'}
              </p>
            </div>
          </div>
        </div>

        {/* Footer Logout */}
        <div style={{ paddingTop: '8px', borderTop: '1px solid #eaedf2' }}>
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
          <div className="top-navbar-left">
            {/* Hamburger Button: toggle collapse on desktop, toggle drawer on mobile */}
            <button
              onClick={handleToggleSidebar}
              className="hamburger-btn"
              title={sidebarCollapsed ? 'Perluas Menu Samping' : 'Sembunyikan Menu Samping'}
              aria-label="Toggle navigasi samping"
            >
              <IconMenu size={20} color="#334155" />
            </button>

            {/* Back Button di Mobile jika di halaman sekunder */}
            {isSecondaryPage && (
              <button
                onClick={() => router.push('/dashboard')}
                className="top-navbar-back-btn"
                title="Kembali ke Beranda"
                aria-label="Kembali ke Beranda"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#4361ee" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M19 12H5M12 19l-7-7 7-7" />
                </svg>
                <span>Beranda</span>
              </button>
            )}

            {/* Office Brand Badge */}
            <div className="top-navbar-brand-badge">
              <span className="top-navbar-brand-dot" />
              <span className="top-navbar-brand-title">
                {settings.namaKantor ? `Kalurahan ${settings.namaKantor}` : 'Kalurahan Pengasih'}
              </span>
            </div>
          </div>

          {/* User Profile Button / Status */}
          <button
            type="button"
            onClick={() => setProfileOpen(true)}
            className="top-navbar-right"
            style={{
              background: 'none',
              border: 'none',
              padding: '2px 4px',
              borderRadius: '10px',
              cursor: 'pointer',
              touchAction: 'manipulation',
              WebkitTapHighlightColor: 'transparent',
            }}
            title="Buka Menu Profil & Akun"
            aria-label="Menu Profil Pamong"
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <div
                style={{
                  width: '32px',
                  height: '32px',
                  minWidth: '32px',
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #818cf8 0%, #6366f1 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#ffffff',
                  boxShadow: '0 2px 4px rgba(99, 102, 241, 0.25)',
                }}
              >
                <IconUser size={16} color="#ffffff" />
              </div>
              <span
                className="top-navbar-greeting-text"
                style={{
                  fontSize: '11px',
                  fontWeight: '800',
                  color: '#334155',
                  letterSpacing: '0.02em',
                  whiteSpace: 'nowrap',
                }}
              >
                {user?.nama?.split(' ')[0]?.toUpperCase() || 'PAMONG'}
              </span>
            </div>
            <span
              className="badge badge-success"
              style={{ fontSize: '10px', padding: '3px 7px', display: 'inline-flex', alignItems: 'center', gap: '4px', whiteSpace: 'nowrap' }}
            >
              <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: '#10b981', flexShrink: 0 }} />
              <span className="top-navbar-greeting-text">Online</span>
            </span>
          </button>
        </header>

        {/* Page Content Container */}
        <div className="app-content animate-fade-in">
          {/* Banner Ajakan Registrasi Biometrik Pertama Kali di Ponsel */}
          {isMobile && !hasBiometricRegistered && showBiometricPrompt && (
            <div
              style={{
                marginBottom: '16px',
                padding: '12px 14px',
                borderRadius: '12px',
                background: 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)',
                border: '1px solid #bfdbfe',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '12px',
                boxShadow: '0 2px 6px rgba(37,99,235,0.08)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
                <div
                  style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '10px',
                    background: '#2563eb',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  <IconFingerprint size={20} color="#ffffff" />
                </div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: '13px', fontWeight: '800', color: '#1e3a8a' }}>
                    Aktifkan Face ID / Sidik Jari?
                  </div>
                  <div style={{ fontSize: '11px', color: '#3b82f6', lineHeight: 1.3 }}>
                    Login berikutnya bisa langsung tatap wajah tanpa ketik password.
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
                <button
                  type="button"
                  onClick={handleRegisterBiometric}
                  disabled={biometricActionLoading}
                  style={{
                    padding: '7px 12px',
                    background: '#2563eb',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '11px',
                    fontWeight: '700',
                    cursor: 'pointer',
                  }}
                >
                  {biometricActionLoading ? 'Memproses...' : 'Aktifkan'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowBiometricPrompt(false)}
                  style={{
                    padding: '7px 9px',
                    background: '#ffffff',
                    color: '#64748b',
                    border: '1px solid #cbd5e1',
                    borderRadius: '8px',
                    fontSize: '11px',
                    cursor: 'pointer',
                  }}
                >
                  Nanti
                </button>
              </div>
            </div>
          )}

          {children}
        </div>
      </main>

      {/* =========================================================
          BOTTOM NAVIGATION BAR (Lengkap Sesuai Urutan Menu + Hapus Biometrik di Bawah Sendiri)
          ========================================================= */}
      <nav ref={bottomNavRef} className="bottom-nav" aria-label="Navigasi bawah mobile">
        {menuItems.map((item) => {
          const IconComponent = item.icon;
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              prefetch={false}
              className={`bottom-nav-item ${isActive ? 'active' : ''}`}
            >
              <IconComponent size={24} color={isActive ? '#4361ee' : '#64748b'} />
              <span>{item.label}</span>
            </Link>
          );
        })}

        {/* Menu Hapus Biometrik di Bagian Bawah Sendiri (Rightmost Bottom Item) */}
        {isMobile && (
          <button
            type="button"
            onClick={() => {
              if (hasBiometricRegistered) {
                handleRemoveBiometric();
              } else {
                setProfileOpen(true);
              }
            }}
            className="bottom-nav-item"
            style={{
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              color: hasBiometricRegistered ? '#c2410c' : '#2563eb',
            }}
            title={hasBiometricRegistered ? 'Hapus Kunci Biometrik Ponsel' : 'Daftarkan Kunci Biometrik'}
          >
            <IconFingerprint size={24} color={hasBiometricRegistered ? '#ea580c' : '#2563eb'} />
            <span style={{ color: hasBiometricRegistered ? '#c2410c' : '#2563eb', fontWeight: '700' }}>
              {hasBiometricRegistered ? 'Hapus Biometrik' : 'Biometrik'}
            </span>
          </button>
        )}
      </nav>

      {/* =========================================================
          MODAL / BOTTOM SHEET PROFIL & MENU PAMONG
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
            {/* Header Profil Pamong */}
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
                    {user?.nama || 'Pegawai Pamong'}
                  </div>
                  <p style={{ fontSize: '11px', color: '#64748b', marginTop: '1px' }}>
                    Username: <span style={{ fontFamily: 'monospace', fontWeight: '600' }}>{user?.nip || '-'}</span>
                  </p>
                  <p style={{ fontSize: '11px', color: '#4361ee', fontWeight: '700', marginTop: '1px' }}>
                    {user?.jabatan || 'Pamong Kalurahan'}
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

            {/* Menu Tambahan */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '16px' }}>
              <Link
                href="/dashboard/panduan"
                prefetch={false}
                onClick={() => setProfileOpen(false)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '11px 14px',
                  borderRadius: '10px',
                  background: pathname === '/dashboard/panduan' ? '#eff6ff' : '#f8fafc',
                  border: pathname === '/dashboard/panduan' ? '1px solid #bfdbfe' : '1px solid #e2e8f0',
                  color: pathname === '/dashboard/panduan' ? '#4361ee' : '#334155',
                  textDecoration: 'none',
                  fontSize: '13px',
                  fontWeight: '600',
                  touchAction: 'manipulation',
                }}
              >
                <IconBook size={18} color={pathname === '/dashboard/panduan' ? '#4361ee' : '#64748b'} />
                <span style={{ flex: 1 }}>Buku Panduan Pamong</span>
              </Link>
              <Link
                href="/dashboard/laporan"
                prefetch={false}
                onClick={() => setProfileOpen(false)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '11px 14px',
                  borderRadius: '10px',
                  background: pathname === '/dashboard/laporan' ? '#eff6ff' : '#f8fafc',
                  border: pathname === '/dashboard/laporan' ? '1px solid #bfdbfe' : '1px solid #e2e8f0',
                  color: pathname === '/dashboard/laporan' ? '#4361ee' : '#334155',
                  textDecoration: 'none',
                  fontSize: '13px',
                  fontWeight: '600',
                  touchAction: 'manipulation',
                }}
              >
                <IconFileText size={18} color={pathname === '/dashboard/laporan' ? '#4361ee' : '#64748b'} />
                <span style={{ flex: 1 }}>Laporan Kinerja Bulanan</span>
              </Link>
              <Link
                href="/dashboard/agenda"
                prefetch={false}
                onClick={() => setProfileOpen(false)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '11px 14px',
                  borderRadius: '10px',
                  background: pathname === '/dashboard/agenda' ? '#eff6ff' : '#f8fafc',
                  border: pathname === '/dashboard/agenda' ? '1px solid #bfdbfe' : '1px solid #e2e8f0',
                  color: pathname === '/dashboard/agenda' ? '#4361ee' : '#334155',
                  textDecoration: 'none',
                  fontSize: '13px',
                  fontWeight: '600',
                  touchAction: 'manipulation',
                }}
              >
                <IconCalendar size={18} color={pathname === '/dashboard/agenda' ? '#4361ee' : '#64748b'} />
                <span style={{ flex: 1 }}>Agenda Kegiatan Kalurahan</span>
              </Link>
            </div>

            {/* Menu Biometrik Ponsel (Hanya smartphone, tidak muncul di PC/Laptop) */}
            {isMobile && (
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
