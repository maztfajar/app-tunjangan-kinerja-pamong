'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  IconBriefcase,
  IconUsers,
  IconTrash,
  IconAlertTriangle,
  IconClose,
} from '@/components/ui/Icons';

interface MasterItem {
  id: string;
  nama: string;
  kategori?: string | null;
  totalPegawai: number;
  createdAt: string;
}

export default function AdminJabatanPage() {
  const [activeTab, setActiveTab] = useState<'jabatan' | 'unitKerja'>('jabatan');
  const [jabatanList, setJabatanList] = useState<MasterItem[]>([]);
  const [unitKerjaList, setUnitKerjaList] = useState<MasterItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Form Tambah Baru
  const [showAddModal, setShowAddModal] = useState(false);
  const [addNama, setAddNama] = useState('');
  const [addKategori, setAddKategori] = useState('');
  const [adding, setAdding] = useState(false);

  // Modal Konfirmasi Hapus
  const [deleteModal, setDeleteModal] = useState<{
    isOpen: boolean;
    type: 'jabatan' | 'unitKerja';
    id: string;
    nama: string;
    totalPegawai: number;
  } | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Notifikasi Toast
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setNotification({ type, text });
    setTimeout(() => setNotification(null), 4000);
  };

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/jabatan');
      const data = await res.json();
      if (res.ok && data.success) {
        setJabatanList(data.jabatan || []);
        setUnitKerjaList(data.unitKerja || []);
      }
    } catch (err) {
      console.error('Error fetching master data:', err);
      showToast('Gagal memuat data master jabatan', 'error');
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Handler Tambah Kategori Baru
  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addNama.trim()) return;

    setAdding(true);
    try {
      const res = await fetch('/api/admin/jabatan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: activeTab,
          nama: addNama.trim(),
          kategori: addKategori.trim() || (activeTab === 'jabatan' ? 'Pamong' : 'Kalurahan'),
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        showToast(data.message, 'success');
        setAddNama('');
        setAddKategori('');
        setShowAddModal(false);
        await fetchData();
      } else {
        showToast(data.error || 'Gagal menambahkan kategori', 'error');
      }
    } catch {
      showToast('Terjadi kesalahan koneksi', 'error');
    }
    setAdding(false);
  };

  // Handler Hapus Kategori
  const handleConfirmDelete = async () => {
    if (!deleteModal) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/admin/jabatan?type=${deleteModal.type}&id=${deleteModal.id}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showToast(data.message, 'success');
        setDeleteModal(null);
        await fetchData();
      } else {
        showToast(data.error || 'Gagal menghapus data', 'error');
      }
    } catch {
      showToast('Terjadi kesalahan koneksi', 'error');
    }
    setDeleting(false);
  };

  // Filter list
  const currentList = activeTab === 'jabatan' ? jabatanList : unitKerjaList;
  const filteredList = useMemo(() => {
    if (!searchQuery.trim()) return currentList;
    const q = searchQuery.toLowerCase();
    return currentList.filter(
      (item) =>
        item.nama.toLowerCase().includes(q) ||
        (item.kategori && item.kategori.toLowerCase().includes(q))
    );
  }, [currentList, searchQuery]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>
      {/* Header Halaman */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '16px',
        }}
      >
        <div>
          <h2 style={{ fontSize: '24px', fontWeight: '800', color: '#0f172a', marginBottom: '6px' }}>
            Kelola Jabatan & Unit Kerja 📁
          </h2>
          <p style={{ color: '#64748b', fontSize: '14px' }}>
            Atur master kategori jabatan pamong dan unit kerja kalurahan untuk memudahkan pemilihan dropdown saat pendaftaran pegawai.
          </p>
        </div>

        <button
          onClick={() => {
            setAddNama('');
            setAddKategori(activeTab === 'jabatan' ? 'Pamong' : 'Kalurahan');
            setShowAddModal(true);
          }}
          className="btn-primary"
          style={{ padding: '10px 18px', display: 'flex', alignItems: 'center', gap: '8px' }}
        >
          <span>➕</span>
          <span>Tambah {activeTab === 'jabatan' ? 'Jabatan Baru' : 'Unit Kerja Baru'}</span>
        </button>
      </div>

      {/* Toast Notification */}
      {notification && (
        <div
          style={{
            padding: '12px 16px',
            borderRadius: '12px',
            background: notification.type === 'success' ? '#ecfdf5' : '#fef2f2',
            border: `1px solid ${notification.type === 'success' ? '#a7f3d0' : '#fecaca'}`,
            color: notification.type === 'success' ? '#047857' : '#b91c1c',
            fontSize: '13px',
            fontWeight: '600',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <span>{notification.type === 'success' ? '✅' : '⚠️'}</span>
          <span>{notification.text}</span>
        </div>
      )}

      {/* Tab Switcher & Search Bar */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '14px',
        }}
      >
        {/* Tab Buttons */}
        <div
          style={{
            display: 'inline-flex',
            padding: '4px',
            background: '#f1f5f9',
            borderRadius: '12px',
            border: '1px solid #e2e8f0',
          }}
        >
          <button
            type="button"
            onClick={() => {
              setActiveTab('jabatan');
              setSearchQuery('');
            }}
            style={{
              padding: '8px 18px',
              borderRadius: '9px',
              fontSize: '13px',
              fontWeight: '700',
              border: 'none',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
              background: activeTab === 'jabatan' ? '#ffffff' : 'transparent',
              color: activeTab === 'jabatan' ? '#4361ee' : '#64748b',
              boxShadow: activeTab === 'jabatan' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <IconBriefcase size={15} color={activeTab === 'jabatan' ? '#4361ee' : '#64748b'} />
            <span>Master Jabatan ({jabatanList.length})</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab('unitKerja');
              setSearchQuery('');
            }}
            style={{
              padding: '8px 18px',
              borderRadius: '9px',
              fontSize: '13px',
              fontWeight: '700',
              border: 'none',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
              background: activeTab === 'unitKerja' ? '#ffffff' : 'transparent',
              color: activeTab === 'unitKerja' ? '#4361ee' : '#64748b',
              boxShadow: activeTab === 'unitKerja' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <IconUsers size={15} color={activeTab === 'unitKerja' ? '#4361ee' : '#64748b'} />
            <span>Master Unit Kerja ({unitKerjaList.length})</span>
          </button>
        </div>

        {/* Search Field */}
        <input
          type="text"
          placeholder={`Cari ${activeTab === 'jabatan' ? 'jabatan' : 'unit kerja'}...`}
          className="input-field"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{ maxWidth: '280px', background: '#ffffff', color: '#0f172a', padding: '8px 14px' }}
        />
      </div>

      {/* Grid Kartu Kategori */}
      <div className="glass-card-static" style={{ padding: '4px', overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th style={{ width: '60px' }}>No</th>
                <th>Nama {activeTab === 'jabatan' ? 'Jabatan' : 'Unit Kerja'}</th>
                <th>Kelompok / Kategori</th>
                <th>Pegawai Aktif</th>
                <th style={{ width: '120px', textAlign: 'center' }}>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} style={{ textAlign: 'center', padding: '40px 0', color: '#64748b' }}>
                    <div className="spinner" style={{ margin: '0 auto 8px', width: '24px', height: '24px' }} />
                    <span>Memuat data master...</span>
                  </td>
                </tr>
              ) : filteredList.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ textAlign: 'center', padding: '40px 0', color: '#94a3b8' }}>
                    Belum ada data yang cocok dengan pencarian Anda.
                  </td>
                </tr>
              ) : (
                filteredList.map((item, index) => (
                  <tr key={item.id}>
                    <td>{index + 1}</td>
                    <td style={{ fontWeight: '700', color: '#0f172a' }}>
                      {item.nama}
                    </td>
                    <td>
                      <span
                        className="badge"
                        style={{
                          background: '#f1f5f9',
                          color: '#475569',
                          border: '1px solid #e2e8f0',
                          fontSize: '11px',
                        }}
                      >
                        {item.kategori || (activeTab === 'jabatan' ? 'Pamong' : 'Kalurahan')}
                      </span>
                    </td>
                    <td>
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          padding: '3px 8px',
                          borderRadius: '6px',
                          fontSize: '12px',
                          fontWeight: '700',
                          background: item.totalPegawai > 0 ? '#eff6ff' : '#f8fafc',
                          color: item.totalPegawai > 0 ? '#2563eb' : '#94a3b8',
                          border: `1px solid ${item.totalPegawai > 0 ? '#bfdbfe' : '#e2e8f0'}`,
                        }}
                      >
                        <IconUsers size={13} />
                        <span>{item.totalPegawai} Pamong</span>
                      </span>
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <button
                        type="button"
                        onClick={() =>
                          setDeleteModal({
                            isOpen: true,
                            type: activeTab,
                            id: item.id,
                            nama: item.nama,
                            totalPegawai: item.totalPegawai,
                          })
                        }
                        className="btn-outline"
                        style={{
                          padding: '6px 10px',
                          fontSize: '11px',
                          color: '#dc2626',
                          borderColor: '#fecaca',
                          background: '#fff',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                        }}
                        title={`Hapus ${item.nama}`}
                      >
                        <IconTrash size={13} color="#dc2626" />
                        <span>Hapus</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Tambah Kategori Baru */}
      {showAddModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.6)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '16px',
          }}
          onClick={() => !adding && setShowAddModal(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: '#ffffff',
              borderRadius: '16px',
              padding: '24px',
              maxWidth: '460px',
              width: '100%',
              boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <IconBriefcase size={20} color="#4361ee" />
                <h3 style={{ fontSize: '17px', fontWeight: '800', color: '#0f172a' }}>
                  Tambah {activeTab === 'jabatan' ? 'Jabatan Baru' : 'Unit Kerja Baru'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => !adding && setShowAddModal(false)}
                style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: '4px' }}
              >
                <IconClose size={18} color="#94a3b8" />
              </button>
            </div>

            <form onSubmit={handleAddSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label className="input-label">
                  Nama {activeTab === 'jabatan' ? 'Jabatan' : 'Unit Kerja'} *
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  placeholder={activeTab === 'jabatan' ? 'Contoh: Kaur Keuangan' : 'Contoh: Seksi Kesejahteraan'}
                  className="input-field"
                  value={addNama}
                  onChange={(e) => setAddNama(e.target.value)}
                  style={{ background: '#ffffff', color: '#0f172a' }}
                />
              </div>

              <div>
                <label className="input-label">Kelompok / Kategori</label>
                <input
                  type="text"
                  placeholder={activeTab === 'jabatan' ? 'Contoh: Pamong, Pimpinan, Staf' : 'Contoh: Kalurahan, Padukuhan'}
                  className="input-field"
                  value={addKategori}
                  onChange={(e) => setAddKategori(e.target.value)}
                  style={{ background: '#ffffff', color: '#0f172a' }}
                />
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '6px' }}>
                <button
                  type="button"
                  disabled={adding}
                  onClick={() => setShowAddModal(false)}
                  className="btn-outline"
                  style={{ flex: 1, padding: '10px', justifyContent: 'center' }}
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={adding || !addNama.trim()}
                  className="btn-primary"
                  style={{ flex: 1.2, padding: '10px', justifyContent: 'center' }}
                >
                  {adding ? 'Menyimpan...' : '💾 Simpan Opsi'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Konfirmasi Hapus Kategori */}
      {deleteModal && deleteModal.isOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(5px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 99999,
            padding: '16px',
          }}
          onClick={() => !deleting && setDeleteModal(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: '#ffffff',
              borderRadius: '16px',
              padding: '24px',
              maxWidth: '480px',
              width: '100%',
              boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
              border: '1px solid #fee2e2',
            }}
          >
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
                  Hapus {deleteModal.type === 'jabatan' ? 'Master Jabatan' : 'Master Unit Kerja'}
                </h3>
                <p style={{ fontSize: '12px', color: '#64748b' }}>
                  Konfirmasi penghapusan kategori master.
                </p>
              </div>
            </div>

            <div
              style={{
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '12px',
                padding: '12px 16px',
              }}
            >
              <div style={{ fontSize: '11px', color: '#64748b', fontWeight: '700', textTransform: 'uppercase' }}>
                Kategori yang Dihapus:
              </div>
              <div style={{ fontSize: '16px', fontWeight: '800', color: '#0f172a', marginTop: '2px' }}>
                "{deleteModal.nama}"
              </div>
              {deleteModal.totalPegawai > 0 && (
                <div style={{ marginTop: '8px', fontSize: '12px', color: '#b45309', fontWeight: '600' }}>
                  ⚠️ Saat ini terdapat <b>{deleteModal.totalPegawai} pegawai</b> yang menggunakan {deleteModal.type === 'jabatan' ? 'jabatan' : 'unit kerja'} ini.
                </div>
              )}
            </div>

            <p style={{ fontSize: '13px', color: '#64748b', lineHeight: '1.5' }}>
              Opsi ini tidak akan lagi muncul pada dropdown pendaftaran pegawai baru. Apakah Anda yakin ingin melanjutkan?
            </p>

            <div style={{ display: 'flex', gap: '10px', marginTop: '6px' }}>
              <button
                type="button"
                disabled={deleting}
                onClick={() => setDeleteModal(null)}
                className="btn-outline"
                style={{ flex: 1, padding: '10px', justifyContent: 'center' }}
              >
                Batal
              </button>
              <button
                type="button"
                disabled={deleting}
                onClick={handleConfirmDelete}
                className="btn-danger"
                style={{
                  flex: 1.2,
                  padding: '10px',
                  justifyContent: 'center',
                  background: '#dc2626',
                  color: '#ffffff',
                  fontWeight: '700',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                {deleting ? (
                  <>
                    <div className="spinner" style={{ width: '14px', height: '14px' }} />
                    <span>Menghapus...</span>
                  </>
                ) : (
                  <>
                    <IconTrash size={15} color="#ffffff" />
                    <span>Ya, Hapus Kategori</span>
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
