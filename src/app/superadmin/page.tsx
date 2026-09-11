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
  }, []);

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

        {/* Card 3: Reset & Pembersihan Database */}
        {/* Card 3: Backup & Restory Database */}
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
                3. Reset &amp; Pembersihan Database
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

        {/* Card 4: Buku Panduan Super Admin */}
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
                4. Buku Panduan Super Admin
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
    </div>
  );
}
