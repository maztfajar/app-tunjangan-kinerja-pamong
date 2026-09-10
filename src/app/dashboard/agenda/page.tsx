'use client';

import { useEffect, useState, useCallback } from 'react';

interface AgendaItem {
  id: string;
  judul: string;
  tanggal: string;
  lokasi: string | null;
  catatan: string | null;
}

export default function AgendaPage() {
  const [agenda, setAgenda] = useState<AgendaItem[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ judul: '', tanggal: '', lokasi: '', catatan: '' });
  const [loading, setLoading] = useState(false);
  const [selectedDay, setSelectedDay] = useState<number | null>(() => new Date().getDate());
  const [currentMonth, setCurrentMonth] = useState(() => {
    const d = new Date();
    return { year: d.getFullYear(), month: d.getMonth() };
  });

  const fetchAgenda = useCallback(async () => {
    try {
      const res = await fetch('/api/agenda');
      const data = await res.json();
      setAgenda(data.agenda || []);
    } catch (err) {
      console.error('Fetch agenda error:', err);
    }
  }, []);

  useEffect(() => {
    fetchAgenda();
  }, [fetchAgenda]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await fetch('/api/agenda', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      setShowModal(false);
      setForm({ judul: '', tanggal: '', lokasi: '', catatan: '' });
      fetchAgenda();
    } catch (err) {
      console.error('Submit agenda error:', err);
    }
    setLoading(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Hapus agenda ini?')) return;
    try {
      await fetch(`/api/agenda?id=${id}`, { method: 'DELETE' });
      fetchAgenda();
    } catch (err) {
      console.error('Delete agenda error:', err);
    }
  };

  // Calendar helpers
  const getDaysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
  const getFirstDayOfMonth = (year: number, month: number) => new Date(year, month, 1).getDay();

  const daysInMonth = getDaysInMonth(currentMonth.year, currentMonth.month);
  const firstDay = getFirstDayOfMonth(currentMonth.year, currentMonth.month);
  const monthNames = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
  ];
  const dayNames = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];

  const getAgendaForDay = (day: number) => {
    return agenda.filter((a) => {
      const d = new Date(a.tanggal);
      return (
        d.getDate() === day &&
        d.getMonth() === currentMonth.month &&
        d.getFullYear() === currentMonth.year
      );
    });
  };

  const prevMonth = () => {
    setCurrentMonth((prev) => {
      if (prev.month === 0) return { year: prev.year - 1, month: 11 };
      return { ...prev, month: prev.month - 1 };
    });
    setSelectedDay(null);
  };

  const nextMonth = () => {
    setCurrentMonth((prev) => {
      if (prev.month === 11) return { year: prev.year + 1, month: 0 };
      return { ...prev, month: prev.month + 1 };
    });
    setSelectedDay(null);
  };

  const today = new Date();
  const isToday = (day: number) =>
    today.getDate() === day &&
    today.getMonth() === currentMonth.month &&
    today.getFullYear() === currentMonth.year;

  // Agenda filtered by selected day or month
  const displayedAgenda = selectedDay
    ? getAgendaForDay(selectedDay)
    : agenda.filter((a) => {
        const d = new Date(a.tanggal);
        return d.getMonth() === currentMonth.month && d.getFullYear() === currentMonth.year;
      });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px' }}>
        <div>
          <h2 style={{ fontSize: '22px', fontWeight: '800', color: '#0f172a', marginBottom: '4px' }}>
            Agenda Kalender 📅
          </h2>
          <p style={{ color: '#64748b', fontSize: '13px' }}>Jadwal kegiatan pamong Kapanewon Pengasih</p>
        </div>
        <button onClick={() => setShowModal(true)} className="btn-primary" style={{ padding: '10px 16px', fontSize: '13px' }}>
          ➕ Tambah Agenda
        </button>
      </div>

      {/* Calendar Card */}
      <div className="glass-card-static" style={{ padding: '18px 14px' }}>
        {/* Header Navigasi Bulan */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
          <button onClick={prevMonth} className="btn-outline" style={{ padding: '6px 14px', minHeight: '36px' }}>
            ◀
          </button>
          <h3 style={{ fontSize: '17px', fontWeight: '700', color: '#0f172a' }}>
            {monthNames[currentMonth.month]} {currentMonth.year}
          </h3>
          <button onClick={nextMonth} className="btn-outline" style={{ padding: '6px 14px', minHeight: '36px' }}>
            ▶
          </button>
        </div>

        {/* Nama Hari */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px', marginBottom: '6px' }}>
          {dayNames.map((d) => (
            <div
              key={d}
              style={{
                textAlign: 'center',
                fontSize: '11px',
                fontWeight: '700',
                color: '#64748b',
                padding: '4px 0',
                textTransform: 'uppercase',
              }}
            >
              {d}
            </div>
          ))}
        </div>

        {/* Grid Kalender */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px' }}>
          {/* Empty cells */}
          {Array.from({ length: firstDay }, (_, i) => (
            <div key={`empty-${i}`} style={{ minHeight: '44px' }} />
          ))}

          {/* Days */}
          {Array.from({ length: daysInMonth }, (_, i) => {
            const day = i + 1;
            const dayAgenda = getAgendaForDay(day);
            const isSel = selectedDay === day;
            const isTod = isToday(day);

            return (
              <div
                key={day}
                onClick={() => setSelectedDay(day)}
                style={{
                  minHeight: '46px',
                  padding: '4px',
                  borderRadius: '8px',
                  background: isSel
                    ? '#eff6ff'
                    : isTod
                    ? '#f0fdf4'
                    : '#ffffff',
                  border: isSel
                    ? '1.5px solid #2563eb'
                    : isTod
                    ? '1.5px solid #16a34a'
                    : '1px solid #e2e8f0',
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  transition: 'all 0.15s ease',
                  boxShadow: isSel ? '0 2px 4px rgba(37,99,235,0.15)' : 'none',
                }}
              >
                <span
                  style={{
                    fontSize: '12px',
                    fontWeight: isTod || isSel ? '800' : '600',
                    color: isSel ? '#1d4ed8' : isTod ? '#15803d' : '#334155',
                  }}
                >
                  {day}
                </span>

                {/* Dot Indicator jika ada agenda di tanggal ini */}
                {dayAgenda.length > 0 && (
                  <div style={{ display: 'flex', gap: '2px', marginTop: '3px' }}>
                    {dayAgenda.slice(0, 3).map((a) => (
                      <span
                        key={a.id}
                        style={{
                          width: '6px',
                          height: '6px',
                          borderRadius: '50%',
                          background: '#2563eb',
                          display: 'inline-block',
                        }}
                      />
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Rincian Agenda Hari Ini / Terpilih */}
      <div className="glass-card-static" style={{ padding: '18px 20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
          <h3 style={{ fontSize: '15px', fontWeight: '700', color: '#0f172a' }}>
            {selectedDay
              ? `📅 Agenda Tanggal ${selectedDay} ${monthNames[currentMonth.month]}`
              : `📋 Agenda Bulan ${monthNames[currentMonth.month]}`}
          </h3>
          {selectedDay && (
            <button
              onClick={() => setSelectedDay(null)}
              className="btn-outline"
              style={{ fontSize: '11px', padding: '3px 8px', minHeight: '28px' }}
            >
              Tampilkan Semua Bulan Ini
            </button>
          )}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {displayedAgenda.length === 0 ? (
            <div style={{ padding: '24px 0', textAlign: 'center', color: '#64748b', fontSize: '13px' }}>
              Tidak ada agenda kegiatan pada tanggal ini
            </div>
          ) : (
            displayedAgenda.map((a) => (
              <div
                key={a.id}
                style={{
                  padding: '14px',
                  borderRadius: '10px',
                  background: '#ffffff',
                  border: '1px solid #e2e8f0',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  gap: '12px',
                }}
              >
                <div style={{ flex: 1 }}>
                  <h4 style={{ fontSize: '14px', fontWeight: '700', color: '#0f172a', marginBottom: '4px' }}>
                    {a.judul}
                  </h4>
                  <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', fontSize: '12px', color: '#64748b' }}>
                    <span>
                      ⏰{' '}
                      {new Date(a.tanggal).toLocaleTimeString('id-ID', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}{' '}
                      WIB
                    </span>
                    {a.lokasi && <span>📍 {a.lokasi}</span>}
                  </div>
                  {a.catatan && (
                    <p style={{ fontSize: '12px', color: '#475569', marginTop: '6px', lineHeight: '1.4', background: '#f8fafc', padding: '6px 10px', borderRadius: '6px', border: '1px solid #f1f5f9' }}>
                      {a.catatan}
                    </p>
                  )}
                </div>
                <button
                  onClick={() => handleDelete(a.id)}
                  className="btn-danger"
                  style={{ padding: '4px 8px', fontSize: '11px', minHeight: '30px' }}
                  title="Hapus agenda"
                >
                  🗑️
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Modal / Mobile Bottom Sheet Tambah Agenda */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="sheet-handle" />
            <h3 style={{ fontSize: '17px', fontWeight: '700', color: '#0f172a', marginBottom: '18px' }}>
              ➕ Tambah Jadwal Agenda
            </h3>
            <form onSubmit={handleSubmit}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div>
                  <label className="input-label">Judul Agenda</label>
                  <input
                    type="text"
                    className="input-field"
                    value={form.judul}
                    onChange={(e) => setForm({ ...form, judul: e.target.value })}
                    required
                    placeholder="Contoh: Rapat Koordinasi Pamong Kalurahan"
                  />
                </div>
                <div>
                  <label className="input-label">Waktu & Tanggal</label>
                  <input
                    type="datetime-local"
                    className="input-field"
                    value={form.tanggal}
                    onChange={(e) => setForm({ ...form, tanggal: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <label className="input-label">Lokasi (Opsional)</label>
                  <input
                    type="text"
                    className="input-field"
                    value={form.lokasi}
                    onChange={(e) => setForm({ ...form, lokasi: e.target.value })}
                    placeholder="Pendopo / Ruang Rapat Kapanewon"
                  />
                </div>
                <div>
                  <label className="input-label">Catatan Tambahan (Opsional)</label>
                  <textarea
                    className="input-field"
                    value={form.catatan}
                    onChange={(e) => setForm({ ...form, catatan: e.target.value })}
                    placeholder="Agenda pembahasan dan dokumen yang dibawa..."
                    style={{ minHeight: '80px' }}
                  />
                </div>
                <div style={{ display: 'flex', gap: '10px', marginTop: '6px' }}>
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="btn-outline"
                    style={{ flex: 1, justifyContent: 'center' }}
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="btn-primary"
                    style={{ flex: 1, justifyContent: 'center' }}
                  >
                    {loading ? 'Menyimpan...' : 'Simpan Agenda'}
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
