'use client';

import { useEffect, useState, useCallback } from 'react';

interface TaskItem {
  id: string;
  pemberiTugas: string;
  hal: string;
  keterangan: string | null;
  lokasi: string | null;
  waktu: string;
  status: string;
  createdAt: string;
  user: {
    nama: string;
    nip: string;
    jabatan: string | null;
    unitKerja: string | null;
  };
}

const statusBadge: Record<string, { bg: string; color: string; label: string }> = {
  'Belum Dikerjakan': { bg: '#fef3c7', color: '#92400e', label: 'Belum' },
  Proses: { bg: '#dbeafe', color: '#1e40af', label: 'Proses' },
  Selesai: { bg: '#dcfce7', color: '#166534', label: 'Selesai' },
  Ijin: { bg: '#fee2e2', color: '#991b1b', label: 'Ijin' },
};

export default function RekapAktivitasPage() {
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [bulan, setBulan] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/rekap-aktivitas?bulan=${bulan}`);
      const data = await res.json();
      setTasks(data.tasks || []);
    } catch (err) {
      console.error('Fetch rekap aktivitas error:', err);
    }
    setLoading(false);
  }, [bulan]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const filtered = tasks.filter((t) => {
    const q = search.toLowerCase();
    return (
      t.user.nama.toLowerCase().includes(q) ||
      t.user.nip.includes(q) ||
      t.hal.toLowerCase().includes(q) ||
      t.pemberiTugas.toLowerCase().includes(q)
    );
  });

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString('id-ID', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

  const bulanLabel = (() => {
    const [y, m] = bulan.split('-');
    return new Date(parseInt(y), parseInt(m) - 1).toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });
  })();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div>
        <h2 style={{ fontSize: '24px', fontWeight: '800', color: '#0f172a', marginBottom: '6px' }}>
          Rekap Log Aktivitas 📝
        </h2>
        <p style={{ color: '#64748b', fontSize: '13px' }}>
          Rekapitulasi log aktivitas seluruh pegawai — {bulanLabel}
        </p>
      </div>

      {/* Filter Bar */}
      <div
        className="glass-card-static"
        style={{
          padding: '16px 20px',
          display: 'flex',
          gap: '12px',
          flexWrap: 'wrap',
          alignItems: 'center',
        }}
      >
        <div style={{ flex: '1 1 200px' }}>
          <label className="input-label" style={{ fontSize: '12px' }}>Cari Nama / NIP / Perihal</label>
          <input
            type="text"
            className="input-field"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Ketik untuk mencari..."
            style={{ fontSize: '13px' }}
          />
        </div>
        <div style={{ flex: '0 0 180px' }}>
          <label className="input-label" style={{ fontSize: '12px' }}>Bulan</label>
          <input
            type="month"
            className="input-field"
            value={bulan}
            onChange={(e) => setBulan(e.target.value)}
            style={{ fontSize: '13px' }}
          />
        </div>
        <div style={{ flex: '0 0 auto', alignSelf: 'flex-end' }}>
          <span
            style={{
              display: 'inline-block',
              background: '#eff6ff',
              border: '1px solid #bfdbfe',
              color: '#1e40af',
              fontSize: '12px',
              fontWeight: '700',
              padding: '8px 14px',
              borderRadius: '8px',
            }}
          >
            📊 {filtered.length} data
          </span>
        </div>
      </div>

      {/* Tabel */}
      <div
        className="glass-card-static"
        style={{ padding: '0', overflow: 'hidden' }}
      >
        <div style={{ overflowX: 'auto' }}>
          <table
            style={{
              width: '100%',
              borderCollapse: 'collapse',
              fontSize: '13px',
              minWidth: '900px',
            }}
          >
            <thead>
              <tr
                style={{
                  background: 'linear-gradient(135deg, #4f46e5 0%, #6366f1 100%)',
                  color: '#ffffff',
                }}
              >
                <th style={{ padding: '14px 16px', textAlign: 'center', fontWeight: '700', fontSize: '12px', width: '50px' }}>No</th>
                <th style={{ padding: '14px 16px', textAlign: 'left', fontWeight: '700', fontSize: '12px' }}>Nama Pegawai</th>
                <th style={{ padding: '14px 16px', textAlign: 'left', fontWeight: '700', fontSize: '12px' }}>NIP</th>
                <th style={{ padding: '14px 16px', textAlign: 'left', fontWeight: '700', fontSize: '12px' }}>Pemberi Tugas</th>
                <th style={{ padding: '14px 16px', textAlign: 'left', fontWeight: '700', fontSize: '12px' }}>Hal / Perihal</th>
                <th style={{ padding: '14px 16px', textAlign: 'left', fontWeight: '700', fontSize: '12px' }}>Keterangan</th>
                <th style={{ padding: '14px 16px', textAlign: 'left', fontWeight: '700', fontSize: '12px' }}>Lokasi</th>
                <th style={{ padding: '14px 16px', textAlign: 'left', fontWeight: '700', fontSize: '12px' }}>Waktu</th>
                <th style={{ padding: '14px 16px', textAlign: 'center', fontWeight: '700', fontSize: '12px' }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={9} style={{ padding: '48px 20px', textAlign: 'center', color: '#64748b' }}>
                    Memuat data...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={9} style={{ padding: '48px 20px', textAlign: 'center', color: '#64748b' }}>
                    <div style={{ fontSize: '32px', marginBottom: '8px' }}>📝</div>
                    Tidak ada data log aktivitas {search ? 'yang cocok' : `pada ${bulanLabel}`}
                  </td>
                </tr>
              ) : (
                filtered.map((t, idx) => {
                  const badge = statusBadge[t.status] || { bg: '#e2e8f0', color: '#334155', label: t.status };
                  return (
                    <tr
                      key={t.id}
                      style={{
                        background: idx % 2 === 0 ? '#ffffff' : '#f8fafc',
                        borderBottom: '1px solid #f1f5f9',
                        transition: 'background 0.15s ease',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = '#eff6ff')}
                      onMouseLeave={(e) => (e.currentTarget.style.background = idx % 2 === 0 ? '#ffffff' : '#f8fafc')}
                    >
                      <td style={{ padding: '12px 16px', textAlign: 'center', color: '#64748b', fontWeight: '600' }}>
                        {idx + 1}
                      </td>
                      <td style={{ padding: '12px 16px', fontWeight: '600', color: '#0f172a' }}>
                        <div>{t.user.nama}</div>
                        {t.user.jabatan && (
                          <div style={{ fontSize: '11px', color: '#64748b', fontWeight: '400', marginTop: '2px' }}>
                            {t.user.jabatan}
                          </div>
                        )}
                      </td>
                      <td style={{ padding: '12px 16px', color: '#334155', fontFamily: 'monospace', fontSize: '12px' }}>
                        {t.user.nip}
                      </td>
                      <td style={{ padding: '12px 16px', color: '#334155' }}>
                        {t.pemberiTugas}
                      </td>
                      <td style={{ padding: '12px 16px', color: '#0f172a', fontWeight: '600', maxWidth: '220px' }}>
                        <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {t.hal}
                        </div>
                      </td>
                      <td style={{ padding: '12px 16px', color: '#64748b', maxWidth: '200px' }}>
                        <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {t.keterangan || '-'}
                        </div>
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        {t.lokasi ? (
                          <a
                            href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(t.lokasi)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{ color: '#2563eb', textDecoration: 'none', fontSize: '12px', fontWeight: '600' }}
                          >
                            📍 {t.lokasi.length > 25 ? t.lokasi.slice(0, 25) + '...' : t.lokasi}
                          </a>
                        ) : (
                          <span style={{ color: '#94a3b8' }}>-</span>
                        )}
                      </td>
                      <td style={{ padding: '12px 16px', color: '#334155', fontSize: '12px', whiteSpace: 'nowrap' }}>
                        {formatDate(t.waktu)}
                      </td>
                      <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                        <span
                          style={{
                            display: 'inline-block',
                            background: badge.bg,
                            color: badge.color,
                            fontSize: '11px',
                            fontWeight: '700',
                            padding: '4px 10px',
                            borderRadius: '6px',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {badge.label}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
