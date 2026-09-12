'use client';

import { useEffect, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { IconEdit, IconTrash } from '@/components/ui/Icons';

interface TaskItem {
  id: string;
  pemberiTugas: string;
  hal: string;
  keterangan: string | null;
  lokasi: string | null;
  waktu: string;
  status: string;
  createdAt: string;
}

export default function AktifitasPage() {
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [pemberiTugas, setPemberiTugas] = useState('');
  const [hal, setHal] = useState('');
  const [keterangan, setKeterangan] = useState('');
  const [lokasi, setLokasi] = useState('');
  const [waktu, setWaktu] = useState('');
  const [loading, setLoading] = useState(false);
  const [locating, setLocating] = useState(false);
  const [locationStatus, setLocationStatus] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const fetchTodayTasks = useCallback(async () => {
    try {
      const res = await fetch('/api/task?today=true');
      const data = await res.json();
      setTasks(data.tasks || []);
    } catch (err) {
      console.error('Fetch tasks error:', err);
    }
  }, []);

  useEffect(() => {
    fetchTodayTasks();
  }, [fetchTodayTasks]);

  // Pre-warm GPS
  const prewarmGps = useCallback(() => {
    if (typeof window === 'undefined' || !navigator.geolocation) return;
    try {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          try {
            sessionStorage.setItem('last_user_lat', String(pos.coords.latitude));
            sessionStorage.setItem('last_user_lng', String(pos.coords.longitude));
          } catch {}
        },
        () => {},
        { enableHighAccuracy: false, timeout: 4000, maximumAge: 300000 }
      );
    } catch {}
  }, []);

  useEffect(() => {
    prewarmGps();
  }, [prewarmGps]);

  const resetForm = () => {
    setEditingId(null);
    setPemberiTugas('');
    setHal('');
    setKeterangan('');
    setLokasi('');
    setWaktu(new Date().toISOString().slice(0, 16));
    setLocationStatus(null);
  };

  const handleOpenAdd = () => {
    resetForm();
    setShowModal(true);
    prewarmGps();
  };

  const handleOpenEdit = (item: TaskItem) => {
    setEditingId(item.id);
    setPemberiTugas(item.pemberiTugas);
    setHal(item.hal);
    setKeterangan(item.keterangan || '');
    setLokasi(item.lokasi || '');
    setWaktu(new Date(item.waktu).toISOString().slice(0, 16));
    setLocationStatus(null);
    setShowModal(true);
    prewarmGps();
  };

  const [deleteTarget, setDeleteTarget] = useState<TaskItem | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const executeDelete = async (id: string) => {
    setDeleteLoading(true);
    try {
      const res = await fetch(`/api/task?id=${id}`, { method: 'DELETE' });
      if (res.ok) {
        setDeleteTarget(null);
        fetchTodayTasks();
      } else {
        const d = await res.json();
        alert(d.error || 'Gagal menghapus aktivitas');
      }
    } catch (err) {
      console.error('Delete error:', err);
      alert('Terjadi kesalahan saat menghapus aktivitas');
    }
    setDeleteLoading(false);
  };

  const handleGetLocation = () => {
    if (typeof window === 'undefined' || !navigator.geolocation) {
      setLocationStatus('⚠️ Perangkat/browser tidak mendukung fitur GPS.');
      return;
    }

    setLocating(true);
    setLocationStatus('🛰️ Mengambil titik koordinat...');

    let applied = false;
    try {
      const cachedLat = sessionStorage.getItem('last_user_lat');
      const cachedLng = sessionStorage.getItem('last_user_lng');
      if (cachedLat && cachedLng) {
        const cLat = parseFloat(cachedLat);
        const cLng = parseFloat(cachedLng);
        if (!isNaN(cLat) && !isNaN(cLng)) {
          const coordStr = `${cLat.toFixed(6)}, ${cLng.toFixed(6)}`;
          setLokasi(coordStr);
          applied = true;
          setLocating(false);
          setLocationStatus(`⚡ Koordinat terdeteksi: ${coordStr} (memperbarui...)`);
        }
      }
    } catch {}

    const safetyTimer = setTimeout(() => {
      setLocating(false);
    }, 35000);

    const applyPosition = (pos: GeolocationPosition) => {
      clearTimeout(safetyTimer);
      const lat = pos.coords.latitude;
      const lng = pos.coords.longitude;
      const coordStr = `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
      setLokasi(coordStr);
      setLocating(false);
      setLocationStatus(`✅ Titik koordinat berhasil didapatkan: ${coordStr}`);
      try {
        sessionStorage.setItem('last_user_lat', String(lat));
        sessionStorage.setItem('last_user_lng', String(lng));
      } catch {}
    };

    try {
      navigator.geolocation.getCurrentPosition(
        (fastPos) => {
          applyPosition(fastPos);
          try {
            navigator.geolocation.getCurrentPosition(
              (finePos) => applyPosition(finePos),
              () => {},
              { enableHighAccuracy: true, timeout: 30000, maximumAge: 5000 }
            );
          } catch {}
        },
        () => {
          navigator.geolocation.getCurrentPosition(
            (pos) => applyPosition(pos),
            (err) => {
              clearTimeout(safetyTimer);
              setLocating(false);
              if (!applied) {
                if (err.code === err.PERMISSION_DENIED) {
                  setLocationStatus('⚠️ Izin GPS ditolak oleh browser/ponsel. Aktifkan izin lokasi.');
                } else if (err.code === err.TIMEOUT) {
                  setLocationStatus('⚠️ Waktu pencarian habis. Coba lagi.');
                } else {
                  setLocationStatus('⚠️ Gagal mengambil koordinat. Pastikan GPS ponsel aktif.');
                }
              }
            },
            { enableHighAccuracy: true, timeout: 35000, maximumAge: 10000 }
          );
        },
        { enableHighAccuracy: false, timeout: 30000, maximumAge: 300000 }
      );
    } catch (e) {
      clearTimeout(safetyTimer);
      setLocating(false);
      console.error('Geolocation call error:', e);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const method = editingId ? 'PUT' : 'POST';
      const body = editingId
        ? { id: editingId, pemberiTugas, hal, keterangan: keterangan || null, lokasi: lokasi || null, waktu }
        : { pemberiTugas, hal, keterangan: keterangan || null, lokasi: lokasi || null, waktu };

      const res = await fetch('/api/task', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json();
        alert(data.error || 'Gagal menyimpan aktivitas');
      } else {
        setShowModal(false);
        resetForm();
        fetchTodayTasks();
      }
    } catch (err) {
      console.error('Submit error:', err);
      alert('Terjadi kesalahan saat menyimpan aktivitas');
    }
    setLoading(false);
  };

  const formatDateTime = (d: string) =>
    new Date(d).toLocaleDateString('id-ID', {
      weekday: 'short',
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

  const todayLabel = new Date().toLocaleDateString('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px' }}>
        <div>
          <h2 style={{ fontSize: '22px', fontWeight: '800', color: '#0f172a', marginBottom: '4px' }}>
            Aktivitas Harian
          </h2>
          <p style={{ color: '#64748b', fontSize: '13px' }}>
            Pencatatan aktivitas pekerjaan hari ini — {todayLabel}
          </p>
        </div>
        <button onClick={handleOpenAdd} className="btn-primary" style={{ padding: '10px 16px', fontSize: '13px' }}>
          ➕ Catat Aktivitas
        </button>
      </div>

      {/* List Aktivitas Hari Ini */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {tasks.length === 0 ? (
          <div className="glass-card-static" style={{ padding: '48px 20px', textAlign: 'center' }}>
            <p style={{ fontSize: '38px', marginBottom: '12px' }}>📋</p>
            <p style={{ color: '#64748b', fontSize: '14px' }}>Belum ada aktivitas harian tercatat hari ini</p>
          </div>
        ) : (
          tasks.map((t) => (
            <div key={t.id} className="glass-card-static" style={{ padding: '18px 20px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    <p style={{ fontSize: '11px', color: '#64748b', margin: 0 }}>
                      🕐 {formatDateTime(t.waktu)} WIB
                    </p>
                    {t.lokasi && (
                      <a
                        href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(t.lokasi)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="badge badge-info"
                        style={{
                          fontSize: '11.5px',
                          textDecoration: 'none',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '5px',
                          cursor: 'pointer',
                          padding: '4px 10px',
                          borderRadius: '6px',
                          fontWeight: '600',
                        }}
                        title="Klik untuk membuka titik lokasi di Google Maps"
                      >
                        <span>📍</span>
                        <span>{t.lokasi}</span>
                        <span style={{ fontSize: '11px', color: '#2563eb', fontWeight: '700' }}>↗ Maps</span>
                      </a>
                    )}
                  </div>

                  {/* Tombol Edit & Hapus */}
                  <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                    <button
                      type="button"
                      className="laporan-action-btn"
                      onClick={() => handleOpenEdit(t)}
                      title="Edit Aktivitas"
                      style={{
                        background: '#4f46e5',
                        color: '#ffffff',
                        boxShadow: '0 2px 4px rgba(79, 70, 229, 0.25)',
                      }}
                    >
                      <IconEdit size={16} color="#ffffff" />
                    </button>
                    <button
                      type="button"
                      className="laporan-action-btn"
                      onClick={() => setDeleteTarget(t)}
                      title="Hapus Aktivitas"
                      style={{
                        background: '#ef4444',
                        color: '#ffffff',
                        boxShadow: '0 2px 4px rgba(239, 68, 68, 0.25)',
                      }}
                    >
                      <IconTrash size={16} color="#ffffff" />
                    </button>
                  </div>
                </div>

                {/* Info Tugas */}
                <div>
                  <h3 style={{ fontSize: '15px', fontWeight: '700', color: '#0f172a', margin: '0 0 4px 0' }}>{t.hal}</h3>
                  <p style={{ fontSize: '12px', color: '#64748b', margin: 0 }}>
                    👤 Pemberi Tugas: <strong style={{ color: '#0f172a' }}>{t.pemberiTugas}</strong>
                  </p>
                </div>

                {t.keterangan && (
                  <p style={{
                    fontSize: '13px', color: '#334155', lineHeight: '1.5',
                    background: '#f8fafc', border: '1px solid #e2e8f0',
                    padding: '10px 12px', borderRadius: '8px', margin: 0,
                  }}>
                    {t.keterangan}
                  </p>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Modal Form Catat Aktivitas */}
      {showModal && mounted && createPortal(
        <div className="modal-overlay" onClick={() => { setShowModal(false); resetForm(); }}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="sheet-handle" />
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '16px',
                position: 'sticky',
                top: 0,
                background: '#ffffff',
                paddingBottom: '8px',
                borderBottom: '1px solid #f1f5f9',
                zIndex: 15,
              }}
            >
              <h3 style={{ fontSize: '17px', fontWeight: '800', color: '#0f172a', margin: 0 }}>
                {editingId ? '✏️ Ubah Aktivitas' : '➕ Catat Aktivitas'}
              </h3>
              <button
                type="button"
                onClick={() => { setShowModal(false); resetForm(); }}
                style={{
                  width: '32px', height: '32px', borderRadius: '8px',
                  background: '#f1f5f9', border: 'none',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: 'pointer', color: '#475569', fontSize: '15px', fontWeight: '700',
                }}
                title="Tutup"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div>
                  <label className="input-label">Pemberi Tugas</label>
                  <input
                    type="text"
                    className="input-field"
                    value={pemberiTugas}
                    onChange={(e) => setPemberiTugas(e.target.value)}
                    required
                    placeholder="Nama atasan / Panewu / Lurah"
                  />
                </div>
                <div>
                  <label className="input-label">Hal / Perihal</label>
                  <input
                    type="text"
                    className="input-field"
                    value={hal}
                    onChange={(e) => setHal(e.target.value)}
                    required
                    placeholder="Perihal tugas / kegiatan dinas"
                  />
                </div>
                <div>
                  <label className="input-label">Keterangan Tambahan</label>
                  <textarea
                    className="input-field"
                    value={keterangan}
                    onChange={(e) => setKeterangan(e.target.value)}
                    placeholder="Uraian pekerjaan, instruksi, atau catatan kegiatan..."
                    style={{ minHeight: '100px' }}
                  />
                </div>

                {/* Lokasi + GPS */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px', flexWrap: 'wrap', gap: '6px' }}>
                    <label className="input-label" style={{ marginBottom: 0 }}>Lokasi</label>
                    <button
                      type="button"
                      onClick={handleGetLocation}
                      disabled={locating}
                      style={{
                        background: '#eff6ff', border: '1px solid #bfdbfe',
                        color: '#2563eb', fontSize: '12px', fontWeight: '700',
                        borderRadius: '6px', cursor: 'pointer',
                        display: 'inline-flex', alignItems: 'center', gap: '5px',
                        padding: '5px 12px',
                      }}
                    >
                      <span>📍</span>
                      <span>{locating ? 'Mencari GPS...' : 'Ambil Titik GPS'}</span>
                    </button>
                  </div>
                  <input
                    type="text"
                    className="input-field"
                    value={lokasi}
                    onChange={(e) => setLokasi(e.target.value)}
                    placeholder="Klik 'Ambil Titik GPS' atau ketik nama lokasi..."
                  />
                  {locationStatus && (
                    <span
                      style={{
                        fontSize: '11.5px',
                        color: locationStatus.startsWith('✅') ? '#059669'
                          : locationStatus.startsWith('⚡') ? '#2563eb'
                          : '#d97706',
                        marginTop: '4px', display: 'block', fontWeight: '600',
                      }}
                    >
                      {locationStatus}
                    </span>
                  )}
                </div>

                <div>
                  <label className="input-label">Waktu Pelaksanaan</label>
                  <input
                    type="datetime-local"
                    className="input-field"
                    value={waktu}
                    onChange={(e) => setWaktu(e.target.value)}
                    required
                  />
                </div>

                {/* Tombol Submit */}
                <div
                  style={{
                    display: 'flex', gap: '10px', marginTop: '8px',
                    paddingTop: '12px', borderTop: '1px solid #f1f5f9',
                    position: 'sticky', bottom: 0, background: '#ffffff', zIndex: 15,
                  }}
                >
                  <button
                    type="button"
                    onClick={() => { setShowModal(false); resetForm(); }}
                    className="btn-outline"
                    style={{ flex: 1, justifyContent: 'center', minHeight: '44px', fontSize: '13.5px' }}
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="btn-primary"
                    style={{ flex: 1, justifyContent: 'center', minHeight: '44px', fontSize: '13.5px' }}
                  >
                    {loading ? 'Menyimpan...' : (editingId ? 'Simpan Perubahan' : 'Simpan Aktivitas')}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* Modal Konfirmasi Hapus */}
      {deleteTarget && mounted && createPortal(
        <div className="modal-overlay" onClick={() => setDeleteTarget(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '440px' }}>
            <div className="sheet-handle" />
            <div style={{ textAlign: 'center', padding: '10px 0 16px 0' }}>
              <div style={{ fontSize: '42px', marginBottom: '10px' }}>🗑️</div>
              <h3 style={{ fontSize: '18px', fontWeight: '800', color: '#0f172a', marginBottom: '8px' }}>
                Hapus Aktivitas Harian?
              </h3>
              <p style={{ fontSize: '13px', color: '#64748b', lineHeight: '1.5', margin: '0 0 16px 0' }}>
                Aktivitas <strong>&quot;{deleteTarget.hal.length > 50 ? deleteTarget.hal.slice(0, 50) + '...' : deleteTarget.hal}&quot;</strong> akan dihapus permanen.
              </p>
              <div style={{ display: 'flex', gap: '10px', marginTop: '16px' }}>
                <button
                  type="button"
                  onClick={() => setDeleteTarget(null)}
                  className="btn-outline"
                  style={{ flex: 1, justifyContent: 'center' }}
                >
                  Batal
                </button>
                <button
                  type="button"
                  disabled={deleteLoading}
                  onClick={() => executeDelete(deleteTarget.id)}
                  style={{
                    flex: 1, justifyContent: 'center',
                    background: '#ef4444', color: '#ffffff', border: 'none',
                    borderRadius: '8px', padding: '10px 16px', fontWeight: '700',
                    cursor: 'pointer', opacity: deleteLoading ? 0.7 : 1,
                  }}
                >
                  {deleteLoading ? 'Menghapus...' : 'Ya, Hapus'}
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
