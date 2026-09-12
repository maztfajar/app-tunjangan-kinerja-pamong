'use client';

import { useEffect, useState } from 'react';

interface Task {
  id: string;
  pemberiTugas: string;
  hal: string;
  keterangan: string | null;
  lokasi: string | null;
  waktu: string;
  status: string;
}

const statusColors: Record<string, string> = {
  'Belum Dikerjakan': 'badge-warning',
  Proses: 'badge-info',
  Selesai: 'badge-success',
  Ijin: 'badge-error',
};

export default function TaskPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTasks = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/task');
      if (res.ok) {
        const data = await res.json();
        setTasks(data.tasks || []);
      }
    } catch (err) {
      console.error('Fetch tasks error:', err);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchTasks();
  }, []);

  const updateStatus = async (id: string, status: string) => {
    try {
      await fetch('/api/task', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status }),
      });
      fetchTasks();
    } catch (err) {
      console.error('Update status error:', err);
    }
  };

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString('id-ID', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div>
        <h2 style={{ fontSize: '22px', fontWeight: '800', color: '#0f172a', marginBottom: '4px' }}>
          Log Aktivitas
        </h2>
        <p style={{ color: '#64748b', fontSize: '13px' }}>
          Riwayat semua aktivitas dan tugas kerja yang telah dicatat
        </p>
      </div>

      {/* Daftar Log */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        {loading ? (
          <div className="glass-card-static" style={{ padding: '48px 20px', textAlign: 'center' }}>
            <p style={{ color: '#64748b', fontSize: '14px' }}>Memuat data...</p>
          </div>
        ) : tasks.length === 0 ? (
          <div className="glass-card-static" style={{ padding: '48px 20px', textAlign: 'center' }}>
            <p style={{ fontSize: '40px', marginBottom: '12px' }}>📝</p>
            <p style={{ color: '#64748b', fontSize: '14px' }}>Belum ada log aktivitas tercatat</p>
            <p style={{ color: '#94a3b8', fontSize: '12px', marginTop: '4px' }}>
              Catat aktivitas harian Anda melalui menu <strong>Aktivitas Harian</strong>
            </p>
          </div>
        ) : (
          tasks.map((task) => (
            <div key={task.id} className="glass-card-static" style={{ padding: '18px 20px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {/* Judul & Status Badge */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '10px' }}>
                  <h3 style={{ fontSize: '15px', fontWeight: '700', color: '#0f172a', lineHeight: '1.4' }}>
                    {task.hal}
                  </h3>
                  <span className={`badge ${statusColors[task.status] || 'badge-info'}`}>
                    {task.status}
                  </span>
                </div>

                {/* Metadata */}
                <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', fontSize: '12px', color: '#64748b' }}>
                  <span>👤 Dari: <strong style={{ color: '#0f172a' }}>{task.pemberiTugas}</strong></span>
                  <span>📅 {formatDate(task.waktu)}</span>
                  {task.lokasi && (
                    <a
                      href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(task.lokasi)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ color: '#2563eb', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '4px', fontWeight: '600' }}
                      title="Buka titik lokasi di Google Maps"
                    >
                      📍 {task.lokasi} <span style={{ fontSize: '10px' }}>↗ Maps</span>
                    </a>
                  )}
                </div>

                {task.keterangan && (
                  <p style={{ fontSize: '13px', color: '#334155', lineHeight: '1.5', background: '#f8fafc', border: '1px solid #e2e8f0', padding: '10px 12px', borderRadius: '8px', margin: 0 }}>
                    {task.keterangan}
                  </p>
                )}

                {/* Status Dropdown */}
                <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '8px', paddingTop: '6px', borderTop: '1px solid #f1f5f9' }}>
                  <span style={{ fontSize: '11px', color: '#64748b', fontWeight: '600' }}>Ubah Status:</span>
                  <select
                    className="input-field"
                    value={task.status}
                    onChange={(e) => updateStatus(task.id, e.target.value)}
                    style={{ width: '150px', padding: '6px 10px', fontSize: '12px', minHeight: '36px', background: '#ffffff', color: '#0f172a' }}
                  >
                    <option value="Belum Dikerjakan">Belum Dikerjakan</option>
                    <option value="Proses">Proses</option>
                    <option value="Selesai">Selesai</option>
                    <option value="Ijin">Ijin</option>
                  </select>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
