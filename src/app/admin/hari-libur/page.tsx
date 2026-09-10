'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { IconTrash, IconAlertTriangle, IconClose } from '@/components/ui/Icons';

interface HariLiburItem {
  id: string;
  tanggal: string;
  tanggalKey?: string;
  keterangan: string;
  sumber: string; // 'otomatis' | 'manual'
  isLibur: boolean;
  createdAt: string;
}

const BULAN_NAMES = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
];

const HARI_NAMES = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];

export default function HariLiburAdminPage() {
  const [items, setItems] = useState<HariLiburItem[]>([]);
  const now = new Date();
  const [tahun, setTahun] = useState<number>(now.getFullYear());
  const [bulan, setBulan] = useState<number>(now.getMonth() + 1); // 1-indexed

  // Form states & Date Selection
  const [tanggal, setTanggal] = useState<string>(() => {
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  });
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  });
  const [keterangan, setKeterangan] = useState('');
  const [tipeStatus, setTipeStatus] = useState<'libur' | 'masuk'>('libur');

  // View mode
  const [viewMode, setViewMode] = useState<'calendar' | 'table'>('calendar');
  const [filterStatus, setFilterStatus] = useState<'all' | 'libur' | 'masuk'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Loading & notification states
  const [loading, setLoading] = useState(false);
  const [syncLoading, setSyncLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Modal Pop-Up Konfirmasi Hapus Tanggal Penetapan
  const [deleteModal, setDeleteModal] = useState<{
    isOpen: boolean;
    id: string;
    keterangan: string;
    tanggal: string;
    isLibur: boolean;
  } | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const showNotification = (text: string, type: 'success' | 'error' = 'success') => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 4500);
  };

  // Fetch data libur untuk tahun yang sedang dipilih
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/hari-libur?tahun=${tahun}`);
      const data = await res.json();
      setItems(data.hariLibur || []);
    } catch (err) {
      console.error('Fetch hari libur error:', err);
    }
    setLoading(false);
  }, [tahun]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Map tanggal 'YYYY-MM-DD' ke HariLiburItem untuk akses instan O(1)
  const dateToHolidayMap = useMemo(() => {
    const map = new Map<string, HariLiburItem>();
    items.forEach((item) => {
      const key = item.tanggalKey || item.tanggal.slice(0, 10);
      map.set(key, item);
    });
    return map;
  }, [items]);

  // Info apakah tanggal yang dipilih di form sudah ada di database
  const selectedHoliday = useMemo(() => {
    return dateToHolidayMap.get(selectedDate) || null;
  }, [dateToHolidayMap, selectedDate]);

  // Efek sinkronisasi pre-fill form saat tanggal yang dipilih berubah
  useEffect(() => {
    const existing = dateToHolidayMap.get(selectedDate);
    if (existing) {
      setKeterangan(existing.keterangan);
      setTipeStatus(existing.isLibur ? 'libur' : 'masuk');
    } else {
      setKeterangan('');
      setTipeStatus('libur');
    }
  }, [selectedDate, dateToHolidayMap]);

  // Handler interaktif: Klik tanggal pada kalender
  const handleSelectDateFromCalendar = (dateStr: string) => {
    setSelectedDate(dateStr);
    setTanggal(dateStr);

    // Ambil info libur jika ada
    const existing = dateToHolidayMap.get(dateStr);
    if (existing) {
      setKeterangan(existing.keterangan);
      setTipeStatus(existing.isLibur ? 'libur' : 'masuk');
    } else {
      setKeterangan('');
      setTipeStatus('libur');
    }
  };

  // Handler interaktif: Mengubah input tanggal di form
  const handleDateInputChange = (val: string) => {
    setTanggal(val);
    setSelectedDate(val);

    if (val && val.length >= 10) {
      const y = Number(val.slice(0, 4));
      const m = Number(val.slice(5, 7));
      if (!isNaN(y) && y >= 2020 && y <= 2030 && y !== tahun) {
        setTahun(y);
      }
      if (!isNaN(m) && m >= 1 && m <= 12 && m !== bulan) {
        setBulan(m);
      }
    }
  };

  // Sinkronisasi otomatis dengan Libur Nasional Resmi (SKB 3 Menteri)
  const handleSyncNasional = async () => {
    setSyncLoading(true);
    try {
      const res = await fetch('/api/hari-libur/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tahun }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showNotification(data.message, 'success');
        await fetchData();
      } else {
        showNotification(data.error || 'Gagal sinkronisasi libur nasional', 'error');
      }
    } catch {
      showNotification('Terjadi kesalahan koneksi saat sinkronisasi', 'error');
    }
    setSyncLoading(false);
  };

  // Tambah atau Perbarui hari libur dari form
  const handleSimpan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tanggal || !keterangan.trim()) {
      showNotification('Tanggal dan keterangan wajib diisi', 'error');
      return;
    }

    setLoading(true);
    try {
      if (selectedHoliday) {
        // Mode update jika tanggal sudah ada
        const res = await fetch('/api/hari-libur', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: selectedHoliday.id,
            keterangan: keterangan.trim(),
            isLibur: tipeStatus === 'libur',
          }),
        });
        const data = await res.json();
        if (res.ok && data.success) {
          showNotification('✅ Data hari libur berhasil diperbarui', 'success');
          await fetchData();
        } else {
          showNotification(data.error || 'Gagal memperbarui data', 'error');
        }
      } else {
        // Mode tambah baru
        const res = await fetch('/api/hari-libur', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            tanggal,
            keterangan: keterangan.trim(),
            sumber: 'manual',
            isLibur: tipeStatus === 'libur',
          }),
        });
        const data = await res.json();
        if (res.ok && data.success) {
          showNotification(
            tipeStatus === 'libur'
              ? '✅ Berhasil menambahkan hari libur kalurahan'
              : '✅ Berhasil menetapkan hari masuk kerja',
            'success'
          );
          await fetchData();
        } else {
          showNotification(data.error || 'Gagal menyimpan hari libur', 'error');
        }
      }
    } catch {
      showNotification('Terjadi kesalahan saat menyimpan data', 'error');
    }
    setLoading(false);
  };

  // Toggle status libur <-> masuk kerja
  const handleToggleStatus = async (item: HariLiburItem) => {
    const newStatus = !item.isLibur;
    try {
      const res = await fetch('/api/hari-libur', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: item.id,
          isLibur: newStatus,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showNotification(
          newStatus
            ? `✅ Status diubah menjadi HARI LIBUR: "${item.keterangan}"`
            : `✅ Libur dibatalkan! Diubah menjadi HARI MASUK KERJA: "${item.keterangan}"`,
          'success'
        );
        await fetchData();
      } else {
        showNotification(data.error || 'Gagal mengubah status', 'error');
      }
    } catch {
      showNotification('Terjadi kesalahan koneksi', 'error');
    }
  };

  // Handler klik tombol sampah pada form
  const handleTrashClick = () => {
    if (selectedHoliday) {
      setDeleteModal({
        isOpen: true,
        id: selectedHoliday.id,
        keterangan: selectedHoliday.keterangan,
        tanggal: selectedHoliday.tanggalKey || selectedHoliday.tanggal,
        isLibur: selectedHoliday.isLibur,
      });
    } else if (keterangan.trim()) {
      // Bersihkan form isian jika belum disimpan
      setKeterangan('');
      setTipeStatus('libur');
      showNotification('Form isian tanggal telah dibersihkan', 'success');
    } else {
      showNotification('Pilih tanggal yang memiliki penetapan untuk dihapus dan dibersihkan', 'error');
    }
  };

  // Eksekusi Hapus & Bersihkan Tanggal dari Modal Konfirmasi
  const handleKonfirmasiHapus = async () => {
    if (!deleteModal) return;
    setDeleteLoading(true);
    try {
      const res = await fetch(`/api/hari-libur?id=${deleteModal.id}&tanggal=${deleteModal.tanggal}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showNotification(
          `✅ Penetapan tanggal ${formatDateDisplay(deleteModal.tanggal)} berhasil dihapus. Tanggal kembali bersih & normal.`,
          'success'
        );
        setKeterangan('');
        setTipeStatus('libur');
        setDeleteModal(null);
        await fetchData();
      } else {
        showNotification(data.error || 'Gagal menghapus data', 'error');
      }
    } catch {
      showNotification('Terjadi kesalahan koneksi saat menghapus data', 'error');
    }
    setDeleteLoading(false);
  };

  // Format tanggal helper
  const formatDateDisplay = (dStr: string) => {
    const [y, m, d] = dStr.slice(0, 10).split('-').map(Number);
    const dateObj = new Date(y, m - 1, d);
    return dateObj.toLocaleDateString('id-ID', {
      weekday: 'long',
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    });
  };

  // Perhitungan statistik
  const totalLiburAktif = useMemo(() => items.filter((i) => i.isLibur).length, [items]);
  const totalMasukKerja = useMemo(() => items.filter((i) => !i.isLibur).length, [items]);
  const totalOtomatis = useMemo(() => items.filter((i) => i.sumber === 'otomatis').length, [items]);
  const totalManual = useMemo(() => items.filter((i) => i.sumber === 'manual').length, [items]);

  // Filter items untuk table view
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const matchSearch =
        item.keterangan.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.tanggal.includes(searchQuery);

      if (!matchSearch) return false;

      if (filterStatus === 'libur') return item.isLibur;
      if (filterStatus === 'masuk') return !item.isLibur;
      return true;
    });
  }, [items, searchQuery, filterStatus]);

  // Calendar generation helpers
  const daysInSelectedMonth = new Date(tahun, bulan, 0).getDate();
  const firstDayOfMonth = new Date(tahun, bulan - 1, 1).getDay(); // 0 = Sunday, 1 = Monday, ...

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>
      {/* Header Utama & Kontrol Sinkronisasi */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '14px',
        }}
      >
        <div>
          <h2 style={{ fontSize: '24px', fontWeight: '800', color: '#0f172a', marginBottom: '6px' }}>
            Kalender Hari Libur
          </h2>
          <p style={{ color: '#64748b', fontSize: '14px' }}>
            Sinkronkan hari libur nasional resmi, tetapkan libur kalurahan, atau ubah hari libur menjadi <b>Hari Masuk Kerja</b>.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <select
            value={tahun}
            onChange={(e) => setTahun(Number(e.target.value))}
            className="input-field"
            style={{
              width: '130px',
              padding: '8px 12px',
              background: '#ffffff',
              color: '#0f172a',
              fontWeight: '700',
              fontSize: '14px',
            }}
          >
            {[2024, 2025, 2026, 2027, 2028].map((y) => (
              <option key={y} value={y}>Tahun {y}</option>
            ))}
          </select>

          <button
            onClick={handleSyncNasional}
            disabled={syncLoading}
            className="btn-primary"
            style={{
              padding: '8px 16px',
              fontSize: '13px',
              background: '#4f46e5',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
            title="Tarik data hari libur nasional resmi dari SKB 3 Menteri"
          >
            {syncLoading ? (
              <>
                <div className="spinner" style={{ width: '14px', height: '14px' }} />
                <span>Menyinkronkan...</span>
              </>
            ) : (
              <>
                <span>🔄</span>
                <span>Sinkronkan Libur Nasional</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Feedback Alert Message */}
      {message && (
        <div
          style={{
            padding: '12px 16px',
            borderRadius: '12px',
            background: message.type === 'success' ? '#ecfdf5' : '#fef2f2',
            border: `1px solid ${message.type === 'success' ? '#a7f3d0' : '#fecaca'}`,
            color: message.type === 'success' ? '#047857' : '#b91c1c',
            fontSize: '13px',
            fontWeight: '600',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <span>{message.type === 'success' ? '✅' : '⚠️'}</span>
          <span>{message.text}</span>
        </div>
      )}

      {/* Metric Cards Statistik */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '14px' }}>
        {/* Total Hari Libur Aktif */}
        <div className="glass-card-static" style={{ padding: '16px', borderLeft: '4px solid #dc2626' }}>
          <div style={{ fontSize: '11px', color: '#64748b', textTransform: 'uppercase', fontWeight: '700' }}>
            🔴 Hari Libur Aktif
          </div>
          <div style={{ fontSize: '26px', fontWeight: '800', color: '#dc2626', marginTop: '4px' }}>
            {totalLiburAktif} <span style={{ fontSize: '13px', fontWeight: '500', color: '#64748b' }}>Hari</span>
          </div>
          <div style={{ fontSize: '11px', color: '#64748b', marginTop: '4px' }}>
            Presensi pamong dinonaktifkan
          </div>
        </div>

        {/* Hari Masuk (Dibatalkan Libur) */}
        <div className="glass-card-static" style={{ padding: '16px', borderLeft: '4px solid #059669' }}>
          <div style={{ fontSize: '11px', color: '#64748b', textTransform: 'uppercase', fontWeight: '700' }}>
            🟢 Diubah Jadi Hari Masuk
          </div>
          <div style={{ fontSize: '26px', fontWeight: '800', color: '#059669', marginTop: '4px' }}>
            {totalMasukKerja} <span style={{ fontSize: '13px', fontWeight: '500', color: '#64748b' }}>Hari</span>
          </div>
          <div style={{ fontSize: '11px', color: '#64748b', marginTop: '4px' }}>
            Libur dibatalkan (wajib absen kerja)
          </div>
        </div>

        {/* Sinkronisasi Nasional */}
        <div className="glass-card-static" style={{ padding: '16px', borderLeft: '4px solid #4f46e5' }}>
          <div style={{ fontSize: '11px', color: '#64748b', textTransform: 'uppercase', fontWeight: '700' }}>
            🌐 Libur Nasional (SKB)
          </div>
          <div style={{ fontSize: '26px', fontWeight: '800', color: '#4f46e5', marginTop: '4px' }}>
            {totalOtomatis} <span style={{ fontSize: '13px', fontWeight: '500', color: '#64748b' }}>Agenda</span>
          </div>
          <div style={{ fontSize: '11px', color: '#64748b', marginTop: '4px' }}>
            Data resmi SKB 3 Menteri
          </div>
        </div>

        {/* Manual Kalurahan */}
        <div className="glass-card-static" style={{ padding: '16px', borderLeft: '4px solid #f59e0b' }}>
          <div style={{ fontSize: '11px', color: '#64748b', textTransform: 'uppercase', fontWeight: '700' }}>
            ✍️ Libur Khusus Kalurahan
          </div>
          <div style={{ fontSize: '26px', fontWeight: '800', color: '#f59e0b', marginTop: '4px' }}>
            {totalManual} <span style={{ fontSize: '13px', fontWeight: '500', color: '#64748b' }}>Agenda</span>
          </div>
          <div style={{ fontSize: '11px', color: '#64748b', marginTop: '4px' }}>
            Ditetapkan mandiri oleh Admin
          </div>
        </div>
      </div>

      {/* Grid Utama: Form Panel Kiri + Kalender/Tabel Panel Kanan */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(320px, 380px) 1fr', gap: '20px', alignItems: 'start' }}>
        {/* Kolom Kiri: Form Interaktif Terhubung dengan Kalender */}
        <div className="glass-card-static" style={{ padding: '22px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '18px' }}>{selectedHoliday ? '✏️' : '➕'}</span>
              <h3 style={{ fontSize: '15px', fontWeight: '700', color: '#0f172a' }}>
                {selectedHoliday ? 'Kelola Tanggal Terpilih' : 'Tambah Penetapan Hari'}
              </h3>
            </div>
            {selectedHoliday && (
              <span
                style={{
                  fontSize: '10px',
                  fontWeight: '700',
                  padding: '3px 8px',
                  borderRadius: '6px',
                  background: selectedHoliday.isLibur ? '#fee2e2' : '#d1fae5',
                  color: selectedHoliday.isLibur ? '#b91c1c' : '#047857',
                }}
              >
                {selectedHoliday.isLibur ? '🔴 Libur' : '🟢 Masuk Kerja'}
              </span>
            )}
          </div>

          <form onSubmit={handleSimpan} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <label className="input-label" style={{ marginBottom: 0 }}>Pilih Tanggal</label>
                <span style={{ fontSize: '11px', color: '#7c3aed', fontWeight: '600' }}>
                  {formatDateDisplay(tanggal)}
                </span>
              </div>
              <input
                type="date"
                className="input-field"
                value={tanggal}
                onChange={(e) => handleDateInputChange(e.target.value)}
                required
                style={{ background: '#ffffff', color: '#0f172a' }}
              />
              <p style={{ fontSize: '11px', color: '#64748b', marginTop: '4px' }}>
                💡 Mengubah tanggal akan otomatis mengarahkan kalender ke bulan & tanggal yang dimaksud.
              </p>
            </div>

            <div>
              <label className="input-label">Keterangan Kegiatan / Libur</label>
              <input
                type="text"
                className="input-field"
                value={keterangan}
                onChange={(e) => setKeterangan(e.target.value)}
                placeholder="Contoh: Merti Desa Pengasih, Pilkades Serentak, Kerja Bakti"
                required
                style={{ background: '#ffffff', color: '#0f172a' }}
              />
            </div>

            <div>
              <label className="input-label">Status Kehadiran Pamong</label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                <button
                  type="button"
                  onClick={() => setTipeStatus('libur')}
                  style={{
                    padding: '8px 12px',
                    borderRadius: '8px',
                    fontSize: '12px',
                    fontWeight: '700',
                    cursor: 'pointer',
                    background: tipeStatus === 'libur' ? '#dc2626' : '#f8fafc',
                    color: tipeStatus === 'libur' ? '#ffffff' : '#64748b',
                    border: `1px solid ${tipeStatus === 'libur' ? '#dc2626' : '#cbd5e1'}`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '4px',
                  }}
                >
                  <span>🔴</span>
                  <span>Hari Libur</span>
                </button>

                <button
                  type="button"
                  onClick={() => setTipeStatus('masuk')}
                  style={{
                    padding: '8px 12px',
                    borderRadius: '8px',
                    fontSize: '12px',
                    fontWeight: '700',
                    cursor: 'pointer',
                    background: tipeStatus === 'masuk' ? '#059669' : '#f8fafc',
                    color: tipeStatus === 'masuk' ? '#ffffff' : '#64748b',
                    border: `1px solid ${tipeStatus === 'masuk' ? '#059669' : '#cbd5e1'}`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '4px',
                  }}
                >
                  <span>🟢</span>
                  <span>Masuk Kerja</span>
                </button>
              </div>
              <p style={{ fontSize: '11px', color: '#64748b', marginTop: '6px' }}>
                {tipeStatus === 'libur'
                  ? 'ℹ️ Pamong libur (tidak dapat absen pada tanggal ini).'
                  : 'ℹ️ Pamong wajib presensi (misal: lembur akhir pekan atau libur yang dibatalkan).'}
              </p>
            </div>

            <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
              <button
                type="submit"
                disabled={loading}
                className="btn-primary"
                style={{
                  flex: 1,
                  padding: '10px',
                  fontSize: '13px',
                  justifyContent: 'center',
                  background: tipeStatus === 'libur' ? '#dc2626' : '#059669',
                }}
              >
                {loading
                  ? 'Menyimpan...'
                  : selectedHoliday
                  ? '💾 Simpan Perubahan'
                  : tipeStatus === 'libur'
                  ? '💾 Tetapkan Hari Libur'
                  : '💾 Tetapkan Hari Masuk'}
              </button>

              <button
                type="button"
                onClick={handleTrashClick}
                className="btn-outline"
                style={{
                  padding: '10px 14px',
                  color: selectedHoliday ? '#dc2626' : '#64748b',
                  borderColor: selectedHoliday ? '#fecaca' : '#cbd5e1',
                  background: selectedHoliday ? '#fef2f2' : '#f8fafc',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
                title={
                  selectedHoliday
                    ? 'Hapus penetapan & bersihkan tanggal ini'
                    : 'Bersihkan form isian tanggal'
                }
              >
                <IconTrash size={16} color={selectedHoliday ? '#dc2626' : '#64748b'} />
              </button>
            </div>
          </form>

          {/* Quick Action jika tanggal sudah terdaftar */}
          {selectedHoliday && (
            <div
              style={{
                marginTop: '16px',
                padding: '12px',
                borderRadius: '10px',
                background: selectedHoliday.isLibur ? '#fef2f2' : '#ecfdf5',
                border: `1px solid ${selectedHoliday.isLibur ? '#fecaca' : '#a7f3d0'}`,
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
              }}
            >
              <div style={{ fontSize: '12px', color: '#1e293b', fontWeight: '600' }}>
                Status Saat Ini: {selectedHoliday.isLibur ? '🔴 Ditetapkan Libur' : '🟢 Ditetapkan Masuk Kerja'}
              </div>
              <button
                type="button"
                onClick={() => handleToggleStatus(selectedHoliday)}
                className="btn-outline"
                style={{
                  width: '100%',
                  justifyContent: 'center',
                  padding: '8px',
                  fontSize: '12px',
                  fontWeight: '700',
                  color: selectedHoliday.isLibur ? '#059669' : '#dc2626',
                  borderColor: selectedHoliday.isLibur ? '#a7f3d0' : '#fecaca',
                  background: '#ffffff',
                }}
              >
                {selectedHoliday.isLibur
                  ? '🔄 Ubah Menjadi Hari Masuk Kerja'
                  : '🔴 Batalkan Masuk (Jadikan Libur)'}
              </button>
            </div>
          )}

          {/* Panduan Interaksi */}
          <div
            style={{
              marginTop: '18px',
              padding: '12px',
              borderRadius: '10px',
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              fontSize: '12px',
              color: '#475569',
              lineHeight: '1.5',
            }}
          >
            <div style={{ fontWeight: '700', color: '#0f172a', marginBottom: '4px' }}>
              🖱️ Navigasi Interaktif:
            </div>
            <ul style={{ paddingLeft: '16px', margin: 0 }}>
              <li>Klik tanggal mana pun pada <b>Kalender Bulanan</b> untuk langsung memilih tanggal dan melihat/mengedit statusnya di form ini.</li>
              <li style={{ marginTop: '4px' }}>Mengisi tanggal di form akan otomatis mengarahkan tampilan kalender ke bulan yang bersangkutan.</li>
            </ul>
          </div>
        </div>

        {/* Kolom Kanan: Tampilan Kalender Bulanan Interaktif & Daftar Tabel */}
        <div className="glass-card-static" style={{ padding: '22px' }}>
          {/* Header Switcher & Controls */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '12px',
              marginBottom: '18px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <button
                onClick={() => setViewMode('calendar')}
                className={viewMode === 'calendar' ? 'btn-primary' : 'btn-outline'}
                style={{ padding: '6px 12px', fontSize: '12px', gap: '4px' }}
              >
                📅 Kalender Bulanan
              </button>
              <button
                onClick={() => setViewMode('table')}
                className={viewMode === 'table' ? 'btn-primary' : 'btn-outline'}
                style={{ padding: '6px 12px', fontSize: '12px', gap: '4px' }}
              >
                📋 Daftar Tabel ({items.length})
              </button>
            </div>

            {viewMode === 'calendar' ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <select
                  value={bulan}
                  onChange={(e) => setBulan(Number(e.target.value))}
                  className="input-field"
                  style={{ width: '130px', padding: '6px 10px', background: '#ffffff', color: '#0f172a', fontWeight: '600' }}
                >
                  {BULAN_NAMES.map((bName, i) => (
                    <option key={i} value={i + 1}>{bName}</option>
                  ))}
                </select>
                <button
                  onClick={() => {
                    if (bulan === 1) {
                      setBulan(12);
                      setTahun(tahun - 1);
                    } else {
                      setBulan(bulan - 1);
                    }
                  }}
                  className="btn-outline"
                  style={{ padding: '6px 10px', fontSize: '12px' }}
                  title="Bulan Sebelumnya"
                >
                  ◀
                </button>
                <button
                  onClick={() => {
                    if (bulan === 12) {
                      setBulan(1);
                      setTahun(tahun + 1);
                    } else {
                      setBulan(bulan + 1);
                    }
                  }}
                  className="btn-outline"
                  style={{ padding: '6px 10px', fontSize: '12px' }}
                  title="Bulan Berikutnya"
                >
                  ▶
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <input
                  type="text"
                  placeholder="Cari keterangan..."
                  className="input-field"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{ width: '160px', padding: '6px 10px', fontSize: '12px', background: '#ffffff', color: '#0f172a' }}
                />
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value as 'all' | 'libur' | 'masuk')}
                  className="input-field"
                  style={{ width: '120px', padding: '6px 10px', fontSize: '12px', background: '#ffffff', color: '#0f172a' }}
                >
                  <option value="all">Semua Status</option>
                  <option value="libur">🔴 Libur Saja</option>
                  <option value="masuk">🟢 Masuk Saja</option>
                </select>
              </div>
            )}
          </div>

          {/* ===================== VIEW 1: KALENDER BULANAN INTERAKTIF ===================== */}
          {viewMode === 'calendar' && (
            <div>
              <div style={{ marginBottom: '14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '18px', fontWeight: '800', color: '#0f172a' }}>
                    {BULAN_NAMES[bulan - 1]} {tahun}
                  </span>
                  <span style={{ fontSize: '12px', color: '#64748b' }}>
                    ({items.filter((i) => (i.tanggalKey || i.tanggal).startsWith(`${tahun}-${String(bulan).padStart(2, '0')}`)).length} agenda)
                  </span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '14px', fontSize: '11px', flexWrap: 'wrap' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#dc2626', fontWeight: '600' }}>
                    <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#dc2626', display: 'inline-block' }} />
                    Hari Libur
                  </span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#059669', fontWeight: '600' }}>
                    <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#059669', display: 'inline-block' }} />
                    Hari Masuk
                  </span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#7c3aed', fontWeight: '600' }}>
                    <span style={{ width: '10px', height: '10px', borderRadius: '3px', border: '2px solid #7c3aed', display: 'inline-block' }} />
                    Dipilih (Klik)
                  </span>
                </div>
              </div>

              {/* Grid Kalender Hari */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(7, 1fr)',
                  gap: '6px',
                  textAlign: 'center',
                }}
              >
                {/* Header Nama Hari */}
                {HARI_NAMES.map((h, idx) => (
                  <div
                    key={h}
                    style={{
                      padding: '8px 4px',
                      fontSize: '12px',
                      fontWeight: '700',
                      color: idx === 0 || idx === 6 ? '#dc2626' : '#64748b',
                      background: '#f8fafc',
                      borderRadius: '6px',
                    }}
                  >
                    {h}
                  </div>
                ))}

                {/* Empty cells before month starts */}
                {Array.from({ length: firstDayOfMonth }).map((_, i) => (
                  <div key={`empty-${i}`} style={{ minHeight: '82px', opacity: 0.15 }} />
                ))}

                {/* Days of Month */}
                {Array.from({ length: daysInSelectedMonth }).map((_, i) => {
                  const dayNum = i + 1;
                  const dateStr = `${tahun}-${String(bulan).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
                  const holiday = dateToHolidayMap.get(dateStr);
                  const isWeekend = (firstDayOfMonth + i) % 7 === 0 || (firstDayOfMonth + i) % 7 === 6;
                  const isSelected = selectedDate === dateStr;

                  const isToday =
                    now.getDate() === dayNum &&
                    now.getMonth() + 1 === bulan &&
                    now.getFullYear() === tahun;

                  let cellBg = '#ffffff';
                  let borderColor = '#e2e8f0';

                  if (holiday) {
                    if (holiday.isLibur) {
                      cellBg = '#fef2f2';
                      borderColor = '#fecaca';
                    } else {
                      cellBg = '#ecfdf5';
                      borderColor = '#a7f3d0';
                    }
                  } else if (isWeekend) {
                    cellBg = '#fafafa';
                  }

                  if (isSelected) {
                    borderColor = '#7c3aed';
                    if (!holiday) cellBg = '#f5f3ff';
                  }

                  return (
                    <div
                      key={dayNum}
                      onClick={() => handleSelectDateFromCalendar(dateStr)}
                      style={{
                        minHeight: '82px',
                        padding: '6px',
                        borderRadius: '8px',
                        background: cellBg,
                        border: isSelected ? '2px solid #7c3aed' : `1px solid ${borderColor}`,
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                        textAlign: 'left',
                        position: 'relative',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease-in-out',
                        boxShadow: isSelected
                          ? '0 0 0 3px rgba(124, 58, 237, 0.25)'
                          : isToday
                          ? '0 0 0 2px rgba(99, 102, 241, 0.2)'
                          : undefined,
                      }}
                      title={`Klik untuk memilih tanggal ${dateStr}`}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span
                          style={{
                            fontSize: '13px',
                            fontWeight: isSelected || isToday ? '800' : '700',
                            color: holiday
                              ? holiday.isLibur
                                ? '#dc2626'
                                : '#059669'
                              : isWeekend
                              ? '#dc2626'
                              : '#0f172a',
                          }}
                        >
                          {dayNum}
                        </span>

                        <div style={{ display: 'flex', gap: '3px' }}>
                          {isToday && (
                            <span style={{ fontSize: '8px', background: '#3b82f6', color: '#fff', padding: '1px 3px', borderRadius: '3px', fontWeight: '700' }}>
                              Hari Ini
                            </span>
                          )}
                          {isSelected && (
                            <span style={{ fontSize: '8px', background: '#7c3aed', color: '#fff', padding: '1px 3px', borderRadius: '3px', fontWeight: '700' }}>
                              Dipilih
                            </span>
                          )}
                        </div>
                      </div>

                      {holiday ? (
                        <div style={{ marginTop: '2px' }}>
                          <div
                            style={{
                              fontSize: '10px',
                              fontWeight: '600',
                              color: holiday.isLibur ? '#991b1b' : '#065f46',
                              lineHeight: '1.2',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              display: '-webkit-box',
                              WebkitLineClamp: 2,
                              WebkitBoxOrient: 'vertical',
                            }}
                            title={holiday.keterangan}
                          >
                            {holiday.keterangan}
                          </div>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleToggleStatus(holiday);
                            }}
                            style={{
                              marginTop: '4px',
                              width: '100%',
                              padding: '2px 4px',
                              fontSize: '9px',
                              fontWeight: '700',
                              borderRadius: '4px',
                              border: 'none',
                              cursor: 'pointer',
                              background: holiday.isLibur ? '#fee2e2' : '#d1fae5',
                              color: holiday.isLibur ? '#b91c1c' : '#047857',
                            }}
                            title={holiday.isLibur ? 'Ubah jadi Hari Masuk Kerja' : 'Kembalikan jadi Hari Libur'}
                          >
                            {holiday.isLibur ? '🔄 Masuk' : '🔄 Libur'}
                          </button>
                        </div>
                      ) : (
                        <div style={{ fontSize: '10px', color: '#94a3b8' }}>
                          {isWeekend ? 'Akhir Pekan' : ''}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ===================== VIEW 2: DAFTAR TABEL ===================== */}
          {viewMode === 'table' && (
            <div>
              {filteredItems.length === 0 ? (
                <div style={{ textAlign: 'center', color: '#94a3b8', padding: '40px 0', fontSize: '14px' }}>
                  Belum ada data hari libur yang cocok untuk kriteria ini.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '480px', overflowY: 'auto' }}>
                  {filteredItems.map((item) => {
                    const itemDateKey = item.tanggalKey || item.tanggal.slice(0, 10);
                    const isSelected = selectedDate === itemDateKey;

                    return (
                      <div
                        key={item.id}
                        onClick={() => handleSelectDateFromCalendar(itemDateKey)}
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          padding: '12px 16px',
                          borderRadius: '10px',
                          background: item.isLibur ? '#ffffff' : '#f0fdf4',
                          border: isSelected ? '2px solid #7c3aed' : `1px solid ${item.isLibur ? '#e2e8f0' : '#bbf7d0'}`,
                          gap: '12px',
                          flexWrap: 'wrap',
                          cursor: 'pointer',
                        }}
                      >
                        <div style={{ flex: 1, minWidth: '200px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                            <span style={{ fontSize: '14px', fontWeight: '700', color: '#0f172a' }}>
                              {item.keterangan}
                            </span>
                            <span
                              className="badge"
                              style={{
                                fontSize: '10px',
                                background: item.isLibur ? '#fef2f2' : '#ecfdf5',
                                color: item.isLibur ? '#dc2626' : '#059669',
                                border: `1px solid ${item.isLibur ? '#fecaca' : '#a7f3d0'}`,
                              }}
                            >
                              {item.isLibur ? '🔴 Hari Libur' : '🟢 Hari Masuk Kerja'}
                            </span>
                            <span
                              className="badge"
                              style={{
                                fontSize: '9px',
                                background: item.sumber === 'otomatis' ? '#eff6ff' : '#fefce8',
                                color: item.sumber === 'otomatis' ? '#2563eb' : '#b45309',
                              }}
                            >
                              {item.sumber === 'otomatis' ? 'SKB 3 Menteri' : 'Manual Kalurahan'}
                            </span>
                            {isSelected && (
                              <span style={{ fontSize: '9px', background: '#7c3aed', color: '#fff', padding: '1px 5px', borderRadius: '4px', fontWeight: '700' }}>
                                Dipilih
                              </span>
                            )}
                          </div>
                          <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>
                            📅 {formatDateDisplay(itemDateKey)}
                          </div>
                        </div>

                        {/* Tombol Aksi */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }} onClick={(e) => e.stopPropagation()}>
                          <button
                            type="button"
                            onClick={() => handleToggleStatus(item)}
                            className="btn-outline"
                            style={{
                              padding: '6px 12px',
                              fontSize: '11px',
                              fontWeight: '600',
                              color: item.isLibur ? '#059669' : '#dc2626',
                              borderColor: item.isLibur ? '#a7f3d0' : '#fecaca',
                              background: item.isLibur ? '#ecfdf5' : '#fef2f2',
                            }}
                          >
                            {item.isLibur ? '🔄 Ganti Jadi Masuk' : '🔴 Batalkan Masuk'}
                          </button>

                          <button
                            type="button"
                            onClick={() => setDeleteModal({
                              isOpen: true,
                              id: item.id,
                              keterangan: item.keterangan,
                              tanggal: item.tanggalKey || item.tanggal,
                              isLibur: item.isLibur,
                            })}
                            className="btn-outline"
                            style={{
                              padding: '6px 10px',
                              fontSize: '12px',
                              color: '#dc2626',
                              borderColor: '#fecaca',
                              background: '#fff',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                            }}
                            title="Hapus penetapan & bersihkan tanggal ini"
                          >
                            <IconTrash size={14} color="#dc2626" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ===================== POP-UP MODAL KONFIRMASI HAPUS & BERSIHKAN TANGGAL ===================== */}
      {deleteModal && deleteModal.isOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(5px)',
            WebkitBackdropFilter: 'blur(5px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 99999,
            padding: '16px',
            animation: 'fadeIn 0.2s ease',
          }}
          onClick={() => !deleteLoading && setDeleteModal(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: '#ffffff',
              borderRadius: '16px',
              padding: '24px',
              maxWidth: '520px',
              width: '100%',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
              border: '1px solid #fee2e2',
            }}
          >
            {/* Header Modal */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div
                  style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '10px',
                    background: '#fee2e2',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <IconAlertTriangle size={22} color="#dc2626" />
                </div>
                <div>
                  <h3 style={{ fontSize: '17px', fontWeight: '800', color: '#0f172a' }}>
                    Konfirmasi Hapus & Bersihkan Tanggal
                  </h3>
                  <p style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>
                    Tindakan ini memerlukan kepastian Administrator.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => !deleteLoading && setDeleteModal(null)}
                style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: '4px' }}
                title="Tutup"
              >
                <IconClose size={18} color="#94a3b8" />
              </button>
            </div>

            {/* Info Tanggal yang Akan Dihapus */}
            <div
              style={{
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '12px',
                padding: '14px 16px',
              }}
            >
              <div style={{ fontSize: '11px', color: '#64748b', fontWeight: '700', textTransform: 'uppercase' }}>
                Tanggal Terpilih:
              </div>
              <div style={{ fontSize: '15px', fontWeight: '800', color: '#0f172a', marginTop: '2px' }}>
                📅 {formatDateDisplay(deleteModal.tanggal)}
              </div>
              <div style={{ fontSize: '13px', color: '#334155', fontWeight: '600', marginTop: '6px' }}>
                Keterangan: <span style={{ color: '#4361ee' }}>"{deleteModal.keterangan}"</span>
              </div>
              <div style={{ marginTop: '8px' }}>
                <span
                  style={{
                    fontSize: '11px',
                    fontWeight: '700',
                    padding: '3px 8px',
                    borderRadius: '6px',
                    background: deleteModal.isLibur ? '#fee2e2' : '#dcfce7',
                    color: deleteModal.isLibur ? '#b91c1c' : '#15803d',
                  }}
                >
                  Status Saat Ini: {deleteModal.isLibur ? '🔴 Ditetapkan Hari Libur' : '🟢 Ditetapkan Masuk Kerja'}
                </span>
              </div>
            </div>

            {/* Peringatan & Dampak Sistem */}
            <div
              style={{
                padding: '12px 14px',
                borderRadius: '10px',
                background: '#fffbeb',
                border: '1px solid #fef3c7',
                fontSize: '12px',
                color: '#92400e',
                lineHeight: '1.5',
              }}
            >
              ⚠️ <b>Dampak Penghapusan:</b> Penetapan hari libur/masuk ini akan dihapus permanen. Tanggal ini akan <b>kembali bersih menjadi kalender reguler</b> (hari kerja normal atau libur akhir pekan) dan <b>langsung tersinkronisasi</b> pada jadwal absensi pamong.
            </div>

            {/* Tombol Aksi */}
            <div style={{ display: 'flex', gap: '10px', marginTop: '6px' }}>
              <button
                type="button"
                disabled={deleteLoading}
                onClick={() => setDeleteModal(null)}
                className="btn-outline"
                style={{ flex: 1, padding: '10px', fontSize: '13px', justifyContent: 'center' }}
              >
                Batal (Kembali)
              </button>
              <button
                type="button"
                disabled={deleteLoading}
                onClick={handleKonfirmasiHapus}
                className="btn-danger"
                style={{
                  flex: 1.3,
                  padding: '10px',
                  fontSize: '13px',
                  justifyContent: 'center',
                  background: '#dc2626',
                  color: '#ffffff',
                  fontWeight: '700',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                {deleteLoading ? (
                  <>
                    <div className="spinner" style={{ width: '14px', height: '14px', borderWidth: '2px' }} />
                    <span>Menghapus...</span>
                  </>
                ) : (
                  <>
                    <IconTrash size={15} color="#ffffff" />
                    <span>Ya, Hapus & Bersihkan Tanggal</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
