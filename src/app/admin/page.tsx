'use client';

import { useEffect, useState } from 'react';
import { IconUsers, IconCheckCircle, IconClock, IconClose, IconClipboardCheck } from '@/components/ui/Icons';

interface Stats {
  totalPegawai: number;
  hadirHariIni: number;
  terlambatHariIni: number;
  belumAbsen: number;
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats>({
    totalPegawai: 0,
    hadirHariIni: 0,
    terlambatHariIni: 0,
    belumAbsen: 0,
  });
  const [recentPresensi, setRecentPresensi] = useState<Array<{
    id: string;
    user: { nama: string; nip: string };
    jamMasuk: string | null;
    jamPulang: string | null;
    statusMasuk: string | null;
    keterlambatan: number | null;
  }>>([]);

  const loadAdminData = async () => {
    try {
      const [pegawaiRes, presensiRes] = await Promise.all([
        fetch('/api/pegawai'),
        fetch('/api/presensi?all=true'),
      ]);
      const pegawaiData = await pegawaiRes.json();
      const presensiData = await presensiRes.json();

      const presensiList = presensiData.presensi || [];
      const totalPegawai = pegawaiData.pegawai?.length || 0;

      // Filter presensi hari ini
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayPresensi = presensiList.filter((p: { tanggal: string }) => {
        const d = new Date(p.tanggal);
        d.setHours(0, 0, 0, 0);
        return d.getTime() === today.getTime();
      });

      const hadirHariIni = todayPresensi.filter((p: { jamMasuk: string | null }) => p.jamMasuk).length;
      const terlambatHariIni = todayPresensi.filter((p: { statusMasuk: string | null }) => p.statusMasuk === 'Terlambat').length;

      setStats({
        totalPegawai,
        hadirHariIni,
        terlambatHariIni,
        belumAbsen: totalPegawai - hadirHariIni,
      });

      setRecentPresensi(presensiList.slice(0, 10));
    } catch (error) {
      console.error('Fetch admin data error:', error);
    }
  };

  useEffect(() => {
    loadAdminData();
  }, []);

  const statCards = [
    {
      label: 'Total Pegawai',
      value: stats.totalPegawai,
      icon: IconUsers,
      borderColor: '#4361ee',
      valueColor: '#4361ee',
      iconBg: '#eff6ff',
      iconColor: '#4361ee',
    },
    {
      label: 'Hadir Hari Ini',
      value: stats.hadirHariIni,
      icon: IconCheckCircle,
      borderColor: '#10b981',
      valueColor: '#10b981',
      iconBg: '#ecfdf5',
      iconColor: '#10b981',
    },
    {
      label: 'Terlambat',
      value: stats.terlambatHariIni,
      icon: IconClock,
      borderColor: '#f59e0b',
      valueColor: '#d97706',
      iconBg: '#fffbeb',
      iconColor: '#f59e0b',
    },
    {
      label: 'Belum Absen',
      value: stats.belumAbsen,
      icon: IconClose,
      borderColor: '#ef4444',
      valueColor: '#ef4444',
      iconBg: '#fef2f2',
      iconColor: '#ef4444',
    },
  ];

  const formatTime = (dateStr: string | null) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div>
      <div style={{ marginBottom: '24px' }}>
        <h2 style={{ fontSize: '22px', fontWeight: '800', color: '#0f172a', marginBottom: '4px' }}>
          Selamat Datang, Admin
        </h2>
        <p suppressHydrationWarning style={{ color: '#64748b', fontSize: '13px' }}>
          {new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
        </p>
      </div>

      {/* Stats Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: '16px',
        marginBottom: '28px',
      }}>
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
                borderRadius: '12px',
                padding: '18px 20px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
                animationDelay: `${i * 0.05}s`,
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <p style={{ fontSize: '11px', color: '#64748b', fontWeight: '700', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    {card.label}
                  </p>
                  <p style={{ fontSize: '30px', fontWeight: '800', color: card.valueColor, lineHeight: 1 }}>
                    {card.value}
                  </p>
                </div>
                <div
                  style={{
                    width: '44px',
                    height: '44px',
                    borderRadius: '10px',
                    background: card.iconBg,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <IconComp size={22} color={card.iconColor} />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Recent Attendance */}
      <div className="glass-card-static" style={{ padding: '20px', overflow: 'hidden' }}>
        <h3 style={{ fontSize: '15px', fontWeight: '700', color: '#0f172a', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <IconClipboardCheck size={18} color="#4361ee" /> Presensi Terbaru
        </h3>
        <div style={{ overflowX: 'auto' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Nama</th>
                <th>Username</th>
                <th>Jam Masuk</th>
                <th>Jam Pulang</th>
                <th>Status</th>
                <th>Keterlambatan</th>
              </tr>
            </thead>
            <tbody>
              {recentPresensi.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', color: '#94a3b8', padding: '40px' }}>
                    Belum ada data presensi
                  </td>
                </tr>
              ) : (
                recentPresensi.map((p) => (
                  <tr key={p.id}>
                    <td style={{ fontWeight: '600', color: '#0f172a' }}>{p.user.nama}</td>
                    <td style={{ color: '#475569' }}>{p.user.nip}</td>
                    <td style={{ color: '#059669', fontWeight: '600' }}>{formatTime(p.jamMasuk)}</td>
                    <td style={{ color: '#2563eb', fontWeight: '600' }}>{formatTime(p.jamPulang)}</td>
                    <td>
                      <span className={`badge ${p.statusMasuk === 'Tepat Waktu' ? 'badge-success' : 'badge-warning'}`}>
                        {p.statusMasuk || '-'}
                      </span>
                    </td>
                    <td style={{ color: p.keterlambatan ? '#dc2626' : '#64748b' }}>{p.keterlambatan ? `${p.keterlambatan} menit` : '-'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
