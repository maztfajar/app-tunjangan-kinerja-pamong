'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  IconUsers,
  IconSettings,
  IconMapPin,
  IconTrash,
  IconDatabase,
  IconBarChart,
  IconFileText,
  IconClock,
  IconCheckCircle,
  IconInfo,
  IconShield,
  IconClose,
} from '@/components/ui/Icons';

interface StatsData {
  totalAdmins: number;
  totalPegawai: number;
  totalPresensi: number;
  totalLaporan: number;
  totalAktifitas: number;
  totalTasks: number;
  totalAgenda: number;
}

export default function SuperAdminDashboard() {
  const [stats, setStats] = useState<StatsData>({
    totalAdmins: 0,
    totalPegawai: 0,
    totalPresensi: 0,
    totalLaporan: 0,
    totalAktifitas: 0,
    totalTasks: 0,
    totalAgenda: 0,
  });
  const [settings, setSettings] = useState<{ namaApp: string; namaKantor: string; subJudul: string } | null>(null);
  const [loading, setLoading] = useState(true);

  // State Lisensi & Serial Number
  const [licenseData, setLicenseData] = useState<{
    isPro: boolean;
    tier: string;
    clientName?: string;
    serialNumber?: string;
    maxUsers: number;
    features: Record<string, boolean>;
    expiresAt?: string | null;
    daysRemaining?: number | null;
    allowedDomains?: string[];
  } | null>(null);

  const [showSerialModal, setShowSerialModal] = useState(false);
  const [serialInput, setSerialInput] = useState('');
  const [serialLoading, setSerialLoading] = useState(false);
  const [serialMsg, setSerialMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fetchLicense = async () => {
    try {
      const res = await fetch('/api/superadmin/license');
      const data = await res.json();
      if (data.license) setLicenseData(data.license);
    } catch (err) {
      console.error('Error fetching license:', err);
    }
  };

  const fetchStats = async () => {
    try {
      const res = await fetch('/api/superadmin/stats');
      const data = await res.json();
      if (data.stats) setStats(data.stats);
      if (data.settings) setSettings(data.settings);
    } catch (err) {
      console.error('Error fetching superadmin stats:', err);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchStats();
    fetchLicense();
  }, []);

  const handleSaveSerial = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!serialInput.trim()) {
      setSerialMsg({ type: 'error', text: 'Serial Number wajib diisi.' });
      return;
    }
    setSerialLoading(true);
    setSerialMsg(null);
    try {
      const res = await fetch('/api/superadmin/license', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ serialNumber: serialInput.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setSerialMsg({ type: 'error', text: data.error || 'Serial Number tidak valid.' });
      } else {
        setSerialMsg({ type: 'success', text: data.message || 'Serial Number berhasil diaktifkan!' });
        await fetchLicense();
        setTimeout(() => {
          setShowSerialModal(false);
          setSerialMsg(null);
        }, 1200);
      }
    } catch {
      setSerialMsg({ type: 'error', text: 'Terjadi kesalahan server.' });
    }
    setSerialLoading(false);
  };

  const handleResetSerial = async () => {
    if (!confirm('Kembalikan sistem ke mode standar?')) return;
    setSerialLoading(true);
    try {
      const res = await fetch('/api/superadmin/license', { method: 'DELETE' });
      if (res.ok) {
        setSerialInput('');
        await fetchLicense();
        setShowSerialModal(false);
      }
    } catch {}
    setSerialLoading(false);
  };

  const statCards = [
    {
      label: 'User Administrator',
      value: stats.totalAdmins,
      sub: 'Dikelola oleh Super Admin',
      icon: IconUsers,
      borderColor: '#4361ee',
      valueColor: '#4361ee',
      bg: '#eff6ff',
      href: '/superadmin/admins',
    },
    {
      label: 'User Pegawai / Pamong',
      value: stats.totalPegawai,
      sub: 'Dikelola oleh Admin',
      icon: IconUsers,
      borderColor: '#10b981',
      valueColor: '#10b981',
      bg: '#ecfdf5',
      href: '#',
    },
    {
      label: 'Catatan Presensi GPS',
      value: stats.totalPresensi,
      sub: 'Record presensi seluruh pamong',
      icon: IconClock,
      borderColor: '#f59e0b',
      valueColor: '#d97706',
      bg: '#fffbeb',
      href: '/superadmin/database',
    },
    {
      label: 'Rekap Laporan Kinerja',
      value: stats.totalLaporan,
      sub: 'Dokumen kinerja bulanan',
      icon: IconFileText,
      borderColor: '#8b5cf6',
      valueColor: '#7c3aed',
      bg: '#f5f3ff',
      href: '/superadmin/database',
    },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', width: '100%' }}>
      {/* Welcome Banner Super Admin - Vibrant Ocean Blue Theme */}
      <div
        className="glass-card-static animate-slide-up"
        style={{
          padding: '28px 32px',
          background: 'linear-gradient(90deg, #0077b6 0%, #0089d7 45%, #00a9ef 100%)',
          color: '#ffffff',
          borderRadius: '18px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '20px',
          boxShadow: '0 10px 25px -5px rgba(0, 137, 215, 0.35)',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span
              style={{
                background: 'rgba(255, 255, 255, 0.22)',
                backdropFilter: 'blur(4px)',
                padding: '5px 14px',
                borderRadius: '9999px',
                fontSize: '12px',
                fontWeight: '800',
                letterSpacing: '0.06em',
                border: '1px solid rgba(255, 255, 255, 0.3)',
              }}
            >
              HAK AKSES PENUH (ROOT SUPER ADMIN)
            </span>
            <span style={{ fontSize: '13px', color: '#e0f2fe', fontWeight: '600' }}>
              Level 1 dari 3 Tingkatan Hirarki
            </span>
          </div>
          <h2 style={{ fontSize: '26px', fontWeight: '800', marginTop: '10px', letterSpacing: '-0.02em' }}>
            Panel Kendali Super Administrator
          </h2>
          <p style={{ color: '#f0f9ff', fontSize: '15px', marginTop: '6px', fontWeight: '500' }}>
            Sistem: <b>{settings?.namaApp || 'E-KINERJA'}</b> • Wilayah / Instansi: <b>{settings?.namaKantor || 'Kalurahan'}</b>
          </p>
        </div>

        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <Link
            href="/superadmin/pengaturan"
            style={{
              background: '#ffffff',
              color: '#0077b6',
              border: 'none',
              fontSize: '14px',
              fontWeight: '700',
              padding: '12px 20px',
              borderRadius: '10px',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
              textDecoration: 'none',
              transition: 'all 0.15s ease',
            }}
          >
            <IconSettings size={18} color="#0077b6" />
            <span>Ubah Nama &amp; Logo</span>
          </Link>
          <Link
            href="/superadmin/lokasi"
            style={{
              background: 'rgba(255, 255, 255, 0.22)',
              color: '#ffffff',
              border: '1px solid rgba(255, 255, 255, 0.35)',
              fontSize: '14px',
              fontWeight: '700',
              padding: '12px 20px',
              borderRadius: '10px',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
              textDecoration: 'none',
              transition: 'all 0.15s ease',
            }}
          >
            <IconMapPin size={18} color="#ffffff" />
            <span>Titik Lokasi Kantor</span>
          </Link>
          <Link
            href="/superadmin/database"
            style={{
              background: '#ef4444',
              color: '#ffffff',
              border: 'none',
              fontSize: '14px',
              fontWeight: '700',
              padding: '12px 20px',
              borderRadius: '10px',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              boxShadow: '0 4px 12px rgba(239, 68, 68, 0.3)',
              textDecoration: 'none',
              transition: 'all 0.15s ease',
            }}
          >
            <IconTrash size={18} color="#ffffff" />
            <span>Reset Database</span>
          </Link>
        </div>
      </div>

      {/* Grid Statistik Sistem */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '16px',
        }}
      >
        {statCards.map((card, i) => {
          const IconComp = card.icon;
          return (
            <div
              key={i}
              className="stat-card animate-slide-up"
              style={{
                background: '#ffffff',
                border: '1px solid #e2e8f0',
                borderLeft: `4px solid ${card.borderColor}`,
                borderRadius: '14px',
                padding: '18px 20px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <p style={{ fontSize: '13px', color: '#475569', fontWeight: '800', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    {card.label}
                  </p>
                  <p style={{ fontSize: '36px', fontWeight: '800', color: card.valueColor, lineHeight: 1.1 }}>
                    {loading ? '...' : card.value}
                  </p>
                  <p style={{ fontSize: '13px', color: '#64748b', marginTop: '6px', fontWeight: '500' }}>
                    {card.sub}
                  </p>
                </div>
                <div
                  style={{
                    width: '48px',
                    height: '48px',
                    borderRadius: '12px',
                    background: card.bg,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <IconComp size={24} color={card.borderColor} />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* 4 Menu Utama Super Admin */}
      <div className="responsive-grid-2">
        {/* Card 1: Pengaturan Identitas Aplikasi */}
        <div
          className="glass-card-static animate-slide-up"
          style={{
            padding: '26px',
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '16px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            gap: '18px',
            boxShadow: '0 2px 6px rgba(0,0,0,0.02)',
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '10px' }}>
              <div style={{ padding: '10px', borderRadius: '10px', background: '#eff6ff' }}>
                <IconSettings size={22} color="#0089d7" />
              </div>
              <h3 style={{ fontSize: '18px', fontWeight: '800', color: '#0f172a' }}>
                1. Pengaturan Identitas Web App
              </h3>
            </div>
            <p style={{ fontSize: '14px', color: '#475569', lineHeight: '1.65' }}>
              Ubah <b>Nama Aplikasi</b>, <b>Nama Kantor</b>, dan <b>Logo</b> instansi. Perubahan ini akan langsung diperbarui secara otomatis di seluruh dashboard (Pegawai, Admin, dan Super Admin).
            </p>
          </div>
          <Link
            href="/superadmin/pengaturan"
            className="btn-outline"
            style={{ alignSelf: 'flex-start', fontSize: '13px', fontWeight: '700', padding: '10px 18px', gap: '6px' }}
          >
            Kelola Pengaturan Web →
          </Link>
        </div>

        {/* Card 2: Manajemen Akun Administrator */}
        <div
          className="glass-card-static animate-slide-up"
          style={{
            padding: '26px',
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '16px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            gap: '18px',
            boxShadow: '0 2px 6px rgba(0,0,0,0.02)',
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '10px' }}>
              <div style={{ padding: '10px', borderRadius: '10px', background: '#ecfdf5' }}>
                <IconUsers size={22} color="#10b981" />
              </div>
              <h3 style={{ fontSize: '18px', fontWeight: '800', color: '#0f172a' }}>
                2. Manajemen User Admin
              </h3>
            </div>
            <p style={{ fontSize: '14px', color: '#475569', lineHeight: '1.65' }}>
              Hak pembuatan dan penghapusan akun <b>Admin</b> dibatasi secara khusus hanya untuk Super Admin. User Admin memiliki akses operasional harian tetapi tidak dapat membuat sesama admin.
            </p>
          </div>
          <Link
            href="/superadmin/admins"
            className="btn-outline"
            style={{ alignSelf: 'flex-start', fontSize: '13px', fontWeight: '700', padding: '10px 18px', gap: '6px' }}
          >
            Kelola Akun Admin ({stats.totalAdmins}) →
          </Link>
        </div>

        {/* Card: Backup & Restory Database (Hanya tampil jika fitur aktif) */}
        {licenseData?.features?.backupRestore && (
          <div
            className="glass-card-static animate-slide-up"
            style={{
              padding: '26px',
              background: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: '16px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              gap: '18px',
              boxShadow: '0 2px 6px rgba(0,0,0,0.02)',
            }}
          >
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '10px' }}>
                <div style={{ padding: '10px', borderRadius: '10px', background: '#ecf8ff' }}>
                  <IconDatabase size={22} color="#0369a1" />
                </div>
                <h3 style={{ fontSize: '18px', fontWeight: '800', color: '#0f172a' }}>
                  3. Backup &amp; Restory Database
                </h3>
              </div>
              <p style={{ fontSize: '14px', color: '#475569', lineHeight: '1.65' }}>
                Unduh seluruh data aplikasi dalam format JSON yang dapat digunakan untuk restore aman. Gunakan halaman ini untuk menyimpan salinan data atau mengembalikan data dari file JSON yang valid.
              </p>
            </div>
            <Link
              href="/superadmin/database"
              className="btn-outline"
              style={{ alignSelf: 'flex-start', fontSize: '13px', fontWeight: '700', padding: '10px 18px', gap: '6px' }}
            >
              Kelola Backup/Restore →
            </Link>
          </div>
        )}

        {/* Card: Reset & Pembersihan Database */}
        <div
          className="glass-card-static animate-slide-up"
          style={{
            padding: '26px',
            background: '#ffffff',
            border: '1px solid #fee2e2',
            borderRadius: '16px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            gap: '18px',
            boxShadow: '0 2px 6px rgba(0,0,0,0.02)',
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '10px' }}>
              <div style={{ padding: '10px', borderRadius: '10px', background: '#fef2f2' }}>
                <IconDatabase size={22} color="#ef4444" />
              </div>
              <h3 style={{ fontSize: '18px', fontWeight: '800', color: '#0f172a' }}>
                {licenseData?.features?.backupRestore ? '4.' : '3.'} Reset &amp; Pembersihan Database
              </h3>
            </div>
            <p style={{ fontSize: '14px', color: '#475569', lineHeight: '1.65' }}>
              Pembersihan database dengan pilihan cakupan waktu fleksibel (Semua Data, Rentang Tahun, Bulan, Minggu, maupun Harian) serta pilihan kriteria data selektif.
            </p>
          </div>
          <Link
            href="/superadmin/database"
            className="btn-danger"
            style={{ alignSelf: 'flex-start', fontSize: '13px', fontWeight: '700', padding: '10px 18px', gap: '6px' }}
          >
            Buka Menu Reset Data →
          </Link>
        </div>

        {/* Card: Serial Number (Tepat di bawah Reset & Pembersihan Database) */}
        <div
          className="glass-card-static animate-slide-up"
          style={{
            padding: '26px',
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '16px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            gap: '18px',
            boxShadow: '0 2px 6px rgba(0,0,0,0.02)',
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '10px' }}>
              <div style={{ padding: '10px', borderRadius: '10px', background: licenseData?.isPro ? '#ecfdf5' : '#f8fafc', border: '1px solid #e2e8f0' }}>
                <IconShield size={22} color={licenseData?.isPro ? '#10b981' : '#64748b'} />
              </div>
              <div>
                <h3 style={{ fontSize: '18px', fontWeight: '800', color: '#0f172a', margin: 0 }}>
                  Serial Number
                </h3>
                <span style={{ fontSize: '12px', fontWeight: '600', color: licenseData?.isPro ? '#059669' : '#64748b' }}>
                  {licenseData?.isPro
                    ? `● Status: Terverifikasi ${licenseData?.daysRemaining !== undefined && licenseData?.daysRemaining !== null ? `(Sisa ${licenseData.daysRemaining} hari)` : '(Permanen)'}`
                    : '● Status: Standar'}
                </span>
              </div>
            </div>
            <p style={{ fontSize: '14px', color: '#475569', lineHeight: '1.65' }}>
              Kelola status aktivasi dan ekstensi sistem aplikasi. Masukkan serial number resmi untuk membuka kapasitas pengguna dan konfigurasi lanjutan instansi.
            </p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', alignSelf: 'flex-start' }}>
            <button
              type="button"
              onClick={() => {
                setShowSerialModal(true);
                setSerialInput(licenseData?.serialNumber || '');
                setSerialMsg(null);
              }}
              className="btn-outline"
              style={{ fontSize: '13px', fontWeight: '700', padding: '10px 18px', gap: '6px', cursor: 'pointer' }}
            >
              {licenseData?.isPro ? 'Kelola Serial Number →' : 'Masukkan Serial Number →'}
            </button>

            {licenseData?.serialNumber && (
              <button
                type="button"
                onClick={handleResetSerial}
                disabled={serialLoading}
                className="btn-outline"
                style={{
                  fontSize: '13px',
                  fontWeight: '700',
                  padding: '10px 16px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  cursor: 'pointer',
                  color: '#dc2626',
                  borderColor: '#fca5a5',
                  background: '#fef2f2',
                }}
                title="Hapus serial number dan kembalikan sistem ke mode standar"
              >
                <IconTrash size={15} color="#dc2626" />
                <span>{serialLoading ? 'Menghapus...' : 'Hapus Serial Number'}</span>
              </button>
            )}
          </div>
        </div>

        {/* Card: Buku Panduan Super Admin */}
        <div
          className="glass-card-static animate-slide-up"
          style={{
            padding: '26px',
            background: '#ffffff',
            border: '1px solid #e0f2fe',
            borderRadius: '16px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            gap: '18px',
            boxShadow: '0 2px 6px rgba(0,0,0,0.02)',
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '10px' }}>
              <div style={{ padding: '10px', borderRadius: '10px', background: '#e0f2fe' }}>
                <IconInfo size={22} color="#0089d7" />
              </div>
              <h3 style={{ fontSize: '18px', fontWeight: '800', color: '#0f172a' }}>
                Buku Panduan Super Admin
              </h3>
            </div>
            <p style={{ fontSize: '14px', color: '#475569', lineHeight: '1.65' }}>
              Pelajari tata cara pengelolaan hak akses Root, kustomisasi identitas aplikasi, manajemen user Admin, reset selektif database, serta panduan konfigurasi hosting.
            </p>
          </div>
          <Link
            href="/superadmin/panduan"
            className="btn-outline"
            style={{ alignSelf: 'flex-start', fontSize: '13px', fontWeight: '700', padding: '10px 18px', gap: '6px', color: '#0089d7', borderColor: '#bae6fd' }}
          >
            Buka Panduan Super Admin →
          </Link>
        </div>
      </div>

      {/* Modal Aktivasi Serial Number */}
      {showSerialModal && (
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
            padding: '20px',
          }}
        >
          <div
            className="glass-card animate-scale-up"
            style={{
              width: '100%',
              maxWidth: '540px',
              background: '#ffffff',
              borderRadius: '20px',
              padding: '28px',
              boxShadow: '0 20px 40px rgba(0,0,0,0.2)',
              border: '1px solid #e2e8f0',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ padding: '8px', borderRadius: '10px', background: licenseData?.isPro ? '#ecfdf5' : '#eff6ff' }}>
                  <IconShield size={20} color={licenseData?.isPro ? '#10b981' : '#4361ee'} />
                </div>
                <h3 style={{ fontSize: '18px', fontWeight: '800', color: '#0f172a', margin: 0 }}>
                  Aktivasi Serial Number
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowSerialModal(false)}
                style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#94a3b8', padding: '4px' }}
              >
                <IconClose size={20} />
              </button>
            </div>

            {/* Status box */}
            <div
              style={{
                padding: '14px 16px',
                borderRadius: '12px',
                background: licenseData?.isPro ? '#f0fdf4' : '#f8fafc',
                border: `1px solid ${licenseData?.isPro ? '#bbf7d0' : '#e2e8f0'}`,
                marginBottom: '18px',
              }}
            >
              <div style={{ fontSize: '13px', fontWeight: '700', color: licenseData?.isPro ? '#166534' : '#334155', marginBottom: '4px' }}>
                {licenseData?.isPro ? '✓ Sistem Terdaftar & Terverifikasi' : 'Mode Sistem Standar'}
              </div>
              <div style={{ fontSize: '12px', color: '#64748b', lineHeight: '1.5' }}>
                {licenseData?.isPro ? (
                  <>
                    Instansi: <b>{licenseData.clientName || 'Instansi Terdaftar'}</b>
                    <br />
                    Kapasitas: <b>Tanpa Batas Kuota Pegawai</b>
                    {licenseData.expiresAt && (
                      <>
                        <br />
                        Masa Berlaku: <b>Sampai {licenseData.expiresAt} {licenseData.daysRemaining !== null && licenseData.daysRemaining !== undefined ? `(Sisa ${licenseData.daysRemaining} hari lagi)` : ''}</b>
                      </>
                    )}
                    {licenseData.allowedDomains && licenseData.allowedDomains.length > 0 && (
                      <>
                        <br />
                        Kunci Domain: <b>{licenseData.allowedDomains.join(', ')}</b>
                      </>
                    )}
                  </>
                ) : (
                  'Aplikasi berjalan dalam mode kapasitas standar (maksimal 50 pegawai, format cetak F4 Landscape). Masukkan serial number resmi untuk membuka kapasitas dan ekstensi sistem.'
                )}
              </div>
            </div>

            {serialMsg && (
              <div
                style={{
                  padding: '10px 14px',
                  borderRadius: '10px',
                  fontSize: '13px',
                  fontWeight: '600',
                  marginBottom: '14px',
                  background: serialMsg.type === 'success' ? '#ecfdf5' : '#fef2f2',
                  color: serialMsg.type === 'success' ? '#065f46' : '#991b1b',
                  border: `1px solid ${serialMsg.type === 'success' ? '#a7f3d0' : '#fecaca'}`,
                }}
              >
                {serialMsg.text}
              </div>
            )}

            <form onSubmit={handleSaveSerial}>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>
                  Kunci Serial Number
                </label>
                <textarea
                  rows={3}
                  value={serialInput}
                  onChange={(e) => setSerialInput(e.target.value)}
                  placeholder="Contoh: TKP-PRO-XXXX-XXXX-XXXX-XXXX"
                  style={{
                    width: '100%',
                    padding: '12px 14px',
                    borderRadius: '10px',
                    border: '1px solid #cbd5e1',
                    fontSize: '13px',
                    fontFamily: 'monospace',
                    color: '#0f172a',
                    background: '#f8fafc',
                    resize: 'none',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px', marginTop: '20px' }}>
                {licenseData?.isPro ? (
                  <button
                    type="button"
                    onClick={handleResetSerial}
                    disabled={serialLoading}
                    style={{
                      padding: '10px 14px',
                      borderRadius: '10px',
                      background: '#fff',
                      border: '1px solid #fca5a5',
                      color: '#dc2626',
                      fontSize: '12px',
                      fontWeight: '700',
                      cursor: 'pointer',
                    }}
                  >
                    Reset ke Standar
                  </button>
                ) : <span />}

                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    type="button"
                    onClick={() => setShowSerialModal(false)}
                    className="btn-outline"
                    style={{ padding: '10px 16px', fontSize: '13px', fontWeight: '600' }}
                  >
                    Tutup
                  </button>
                  <button
                    type="submit"
                    disabled={serialLoading}
                    className="btn-primary"
                    style={{ padding: '10px 18px', fontSize: '13px', fontWeight: '700' }}
                  >
                    {serialLoading ? 'Memproses...' : 'Simpan & Verifikasi'}
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
