'use client';

import { useEffect, useState, useMemo } from 'react';
import { IconAlertTriangle, IconClose, IconTrash } from '@/components/ui/Icons';

interface Pegawai {
  id: string;
  nip: string;
  nama: string;
  jabatan: string | null;
  unitKerja: string | null;
  createdAt: string;
}

interface MasterOption {
  id: string;
  nama: string;
  kategori?: string | null;
}

export default function PegawaiPage() {
  const [pegawai, setPegawai] = useState<Pegawai[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({ nip: '', nama: '', jabatan: '', unitKerja: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Modal Konfirmasi Hapus Pegawai
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [pegawaiToDelete, setPegawaiToDelete] = useState<Pegawai | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Master Data Dropdown Options
  const [jabatanOptions, setJabatanOptions] = useState<MasterOption[]>([]);
  const [unitKerjaOptions, setUnitKerjaOptions] = useState<MasterOption[]>([]);

  // Sub-modal / Drawer Kelola Opsi Kategori langsung di Pop-Up Pendaftaran
  const [manageModal, setManageModal] = useState<{
    isOpen: boolean;
    type: 'jabatan' | 'unitKerja';
    newNama: string;
    loading: boolean;
    error: string;
  } | null>(null);

  const fetchPegawai = async () => {
    const res = await fetch('/api/pegawai');
    const data = await res.json();
    setPegawai(data.pegawai || []);
  };

  const fetchMasterData = async () => {
    try {
      const res = await fetch('/api/admin/jabatan');
      const data = await res.json();
      if (res.ok && data.success) {
        setJabatanOptions(data.jabatan || []);
        setUnitKerjaOptions(data.unitKerja || []);
      }
    } catch (err) {
      console.error('Error fetching master data:', err);
    }
  };

  useEffect(() => {
    fetchPegawai();
    fetchMasterData();
  }, []);

  const openModal = (p?: Pegawai) => {
    if (p) {
      setEditId(p.id);
      setForm({
        nip: p.nip,
        nama: p.nama,
        jabatan: p.jabatan || (jabatanOptions[0]?.nama || ''),
        unitKerja: p.unitKerja || (unitKerjaOptions[0]?.nama || 'Pemerintah Kalurahan'),
        password: '',
      });
    } else {
      setEditId(null);
      setForm({
        nip: '',
        nama: '',
        jabatan: jabatanOptions[0]?.nama || '',
        unitKerja: unitKerjaOptions[0]?.nama || 'Pemerintah Kalurahan',
        password: '',
      });
    }
    setMessage('');
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    try {
      if (editId) {
        const res = await fetch(`/api/pegawai/${editId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(form),
        });
        const data = await res.json();
        if (!res.ok) {
          setMessage(data.error);
          setLoading(false);
          return;
        }
      } else {
        if (!form.password) {
          setMessage('Password wajib diisi untuk pendaftaran akun pegawai baru.');
          setLoading(false);
          return;
        }
        const res = await fetch('/api/pegawai', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(form),
        });
        const data = await res.json();
        if (!res.ok) {
          setMessage(data.error);
          setLoading(false);
          return;
        }
      }

      setShowModal(false);
      fetchPegawai();
      setMessage('');
    } catch {
      setMessage('Terjadi kesalahan jaringan saat menyimpan data.');
    }
    setLoading(false);
  };

  const handleOpenDeleteModal = (p: Pegawai) => {
    setPegawaiToDelete(p);
    setShowDeleteModal(true);
  };

  const handleConfirmDelete = async () => {
    if (!pegawaiToDelete) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/pegawai/${pegawaiToDelete.id}`, { method: 'DELETE' });
      if (res.ok) {
        setShowDeleteModal(false);
        setPegawaiToDelete(null);
        fetchPegawai();
        setMessage(`Data pegawai berhasil dihapus.`);
      } else {
        setMessage('Gagal menghapus data pegawai.');
      }
    } catch {
      setMessage('Terjadi kesalahan jaringan saat menghapus pegawai.');
    }
    setDeleting(false);
  };

  // Handler Tambah Opsi Kategori Baru langsung dari Pop-Up
  const handleAddOption = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manageModal || !manageModal.newNama.trim()) return;

    const type = manageModal.type;
    const cleanNama = manageModal.newNama.trim();

    setManageModal((prev) => (prev ? { ...prev, loading: true, error: '' } : null));
    try {
      const res = await fetch('/api/admin/jabatan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type,
          nama: cleanNama,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        // Otomatis pilih opsi yang baru dibuat di dropdown form
        if (type === 'jabatan') {
          setForm((f) => ({ ...f, jabatan: cleanNama }));
        } else {
          setForm((f) => ({ ...f, unitKerja: cleanNama }));
        }
        await fetchMasterData();
        setManageModal(null);
      } else {
        setManageModal((prev) => (prev ? { ...prev, loading: false, error: data.error || 'Gagal menambahkan opsi' } : null));
      }
    } catch {
      setManageModal((prev) => (prev ? { ...prev, loading: false, error: 'Terjadi kesalahan koneksi' } : null));
    }
  };

  // Handler Hapus Opsi Kategori dari Sub-Modal Pop-Up
  const handleDeleteOption = async (type: 'jabatan' | 'unitKerja', id: string, nama: string) => {
    try {
      const res = await fetch(`/api/admin/jabatan?type=${type}&id=${id}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (res.ok && data.success) {
        // Jika opsi yang terpilih di form dihapus, reset pilihannya
        if (type === 'jabatan' && form.jabatan === nama) {
          setForm((f) => ({ ...f, jabatan: '' }));
        } else if (type === 'unitKerja' && form.unitKerja === nama) {
          setForm((f) => ({ ...f, unitKerja: '' }));
        }
        await fetchMasterData();
      } else {
        alert(data.error || 'Gagal menghapus opsi');
      }
    } catch {
      alert('Terjadi kesalahan koneksi');
    }
  };

  const filteredPegawai = useMemo(() => {
    if (!searchQuery.trim()) return pegawai;
    const q = searchQuery.toLowerCase();
    return pegawai.filter(
      (p) =>
        p.nama.toLowerCase().includes(q) ||
        p.nip.toLowerCase().includes(q) ||
        (p.jabatan && p.jabatan.toLowerCase().includes(q))
    );
  }, [pegawai, searchQuery]);

  return (
    <div>
      {/* Header & Button */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h2 style={{ fontSize: '24px', fontWeight: '800', color: '#0f172a', marginBottom: '6px' }}>
            Pendaftaran & Manajemen Akun Pegawai
          </h2>
          <p style={{ color: '#64748b', fontSize: '14px' }}>
            Kelola data pegawai serta buat username & password akun pengguna sistem
          </p>
        </div>
        <button onClick={() => openModal()} className="btn-primary" style={{ padding: '12px 20px' }}>
          ➕ Daftarkan Pegawai Baru
        </button>
      </div>

      {/* Info Banner: Registrasi Eksklusif Lewat Admin */}
      <div
        className="glass-card-static"
        style={{
          padding: '16px 20px',
          marginBottom: '24px',
          background: '#eff6ff',
          border: '1px solid #bfdbfe',
          display: 'flex',
          alignItems: 'center',
          gap: '14px',
        }}
      >
        <span style={{ fontSize: '24px' }}>🔐</span>
        <div style={{ fontSize: '13px', color: '#1e3a8a', lineHeight: '1.5' }}>
          <b style={{ color: '#1d4ed8' }}>Pemberitahuan Sistem:</b> Akun pengguna (Pegawai) hanya dapat didaftarkan melalui Dashboard Administrator ini.
          Username login ditentukan pada formulir pendaftaran di bawah, dan password dapat diatur sesuai kebutuhan.
        </div>
      </div>

      {/* Search Bar */}
      <div style={{ marginBottom: '20px', display: 'flex', gap: '12px' }}>
        <input
          type="text"
          className="input-field"
          placeholder="🔍 Cari pegawai berdasarkan Nama, Username, atau Jabatan..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{ maxWidth: '400px', background: '#ffffff', color: '#0f172a' }}
        />
        {searchQuery && (
          <button onClick={() => setSearchQuery('')} className="btn-outline" style={{ padding: '8px 14px' }}>
            Reset
          </button>
        )}
      </div>

      {/* Tabel Data Pegawai */}
      <div className="glass-card-static" style={{ padding: '4px', overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>No</th>
                <th>Username</th>
                <th>Nama Lengkap</th>
                <th>Jabatan</th>
                <th>Unit Kerja</th>
                <th style={{ textAlign: 'center' }}>Aksi Akun</th>
              </tr>
            </thead>
            <tbody>
              {filteredPegawai.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', color: '#94a3b8', padding: '40px' }}>
                    {searchQuery ? 'Tidak ada pegawai yang cocok dengan pencarian' : 'Belum ada data pegawai terdaftar'}
                  </td>
                </tr>
              ) : (
                filteredPegawai.map((p, i) => (
                  <tr key={p.id}>
                    <td>{i + 1}</td>
                    <td>
                      <span
                        style={{
                          fontFamily: 'monospace',
                          fontSize: '13px',
                          background: '#eff6ff',
                          border: '1px solid #dbeafe',
                          padding: '3px 8px',
                          borderRadius: '6px',
                          color: '#2563eb',
                          fontWeight: '600',
                        }}
                      >
                        {p.nip}
                      </span>
                    </td>
                    <td style={{ fontWeight: '600', color: '#0f172a' }}>{p.nama}</td>
                    <td style={{ color: '#475569' }}>{p.jabatan || '-'}</td>
                    <td style={{ color: '#475569' }}>{p.unitKerja || '-'}</td>
                    <td style={{ textAlign: 'center' }}>
                      <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                        <button onClick={() => openModal(p)} className="btn-outline" style={{ padding: '6px 12px' }}>
                          ✏️ Edit / Reset Pass
                        </button>
                        <button onClick={() => handleOpenDeleteModal(p)} className="btn-danger" style={{ padding: '6px 12px' }}>
                          🗑️ Hapus
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Pendaftaran / Edit Pegawai */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '520px' }}>
            <h3 style={{ fontSize: '18px', fontWeight: '700', color: '#0f172a', marginBottom: '8px' }}>
              {editId ? '✏️ Edit Data & Kredensial Pegawai' : '➕ Pendaftaran Akun Pegawai Baru'}
            </h3>
            <p style={{ fontSize: '13px', color: '#64748b', marginBottom: '20px' }}>
              {editId
                ? 'Ubah informasi pegawai atau perbarui password akun login pengguna.'
                : 'Daftarkan pegawai baru. Tentukan username dan password untuk login ke sistem.'}
            </p>

            <form onSubmit={handleSubmit}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div>
                  <label className="input-label">Username Login *</label>
                  <input
                    type="text"
                    className="input-field"
                    value={form.nip}
                    onChange={(e) => setForm({ ...form, nip: e.target.value })}
                    required
                    placeholder="Contoh: user123, nama_pegawai, dsb."
                  />
                  <span style={{ fontSize: '11px', color: '#64748b', marginTop: '4px', display: 'block' }}>
                    Digunakan oleh pegawai untuk masuk ke portal sistem.
                  </span>
                </div>

                <div>
                  <label className="input-label">Nama Lengkap Pegawai *</label>
                  <input
                    type="text"
                    className="input-field"
                    value={form.nama}
                    onChange={(e) => setForm({ ...form, nama: e.target.value })}
                    required
                    placeholder="Nama lengkap beserta gelar (jika ada)"
                  />
                </div>

                {/* Dropdown Kategori Jabatan & Unit Kerja */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                      <label className="input-label" style={{ marginBottom: 0 }}>Jabatan *</label>
                      <button
                        type="button"
                        onClick={() => setManageModal({ isOpen: true, type: 'jabatan', newNama: '', loading: false, error: '' })}
                        style={{
                          background: '#eff6ff',
                          border: '1px solid #bfdbfe',
                          color: '#2563eb',
                          fontSize: '11px',
                          fontWeight: '700',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '3px',
                          padding: '2px 7px',
                        }}
                        title="Tambah jabatan baru atau hapus opsi"
                      >
                        <span>⚙️ + Opsi Baru</span>
                      </button>
                    </div>
                    <select
                      className="input-field"
                      value={form.jabatan}
                      onChange={(e) => setForm({ ...form, jabatan: e.target.value })}
                      style={{ background: '#ffffff', color: '#0f172a', fontWeight: '600' }}
                      required
                    >
                      <option value="">-- Pilih Jabatan --</option>
                      {jabatanOptions.map((j) => (
                        <option key={j.id} value={j.nama}>
                          {j.nama}
                        </option>
                      ))}
                      {form.jabatan && !jabatanOptions.some((j) => j.nama === form.jabatan) && (
                        <option value={form.jabatan}>{form.jabatan} (Kustom)</option>
                      )}
                    </select>
                  </div>

                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                      <label className="input-label" style={{ marginBottom: 0 }}>Unit Kerja *</label>
                      <button
                        type="button"
                        onClick={() => setManageModal({ isOpen: true, type: 'unitKerja', newNama: '', loading: false, error: '' })}
                        style={{
                          background: '#eff6ff',
                          border: '1px solid #bfdbfe',
                          color: '#2563eb',
                          fontSize: '11px',
                          fontWeight: '700',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '3px',
                          padding: '2px 7px',
                        }}
                        title="Tambah unit kerja baru atau hapus opsi"
                      >
                        <span>⚙️ + Opsi Baru</span>
                      </button>
                    </div>
                    <select
                      className="input-field"
                      value={form.unitKerja}
                      onChange={(e) => setForm({ ...form, unitKerja: e.target.value })}
                      style={{ background: '#ffffff', color: '#0f172a', fontWeight: '600' }}
                      required
                    >
                      <option value="">-- Pilih Unit Kerja --</option>
                      {unitKerjaOptions.map((u) => (
                        <option key={u.id} value={u.nama}>
                          {u.nama}
                        </option>
                      ))}
                      {form.unitKerja && !unitKerjaOptions.some((u) => u.nama === form.unitKerja) && (
                        <option value={form.unitKerja}>{form.unitKerja} (Kustom)</option>
                      )}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="input-label">
                    Password Akun Login {editId ? '(Kosongkan jika tidak ingin diubah)' : '*'}
                  </label>
                  <input
                    type="password"
                    className="input-field"
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                    required={!editId}
                    placeholder={editId ? 'Masukkan password baru' : 'Masukkan password untuk akun ini'}
                  />
                  <span style={{ fontSize: '11px', color: '#64748b', marginTop: '4px', display: 'block' }}>
                    Password yang diberikan kepada pegawai untuk masuk ke akun mereka.
                  </span>
                </div>

                {message && (
                  <div
                    style={{
                      padding: '10px 14px',
                      borderRadius: '10px',
                      background: 'rgba(244,63,94,0.1)',
                      border: '1px solid rgba(244,63,94,0.3)',
                      color: '#fb7185',
                      fontSize: '13px',
                    }}
                  >
                    ⚠️ {message}
                  </div>
                )}

                <div style={{ display: 'flex', gap: '12px', marginTop: '12px' }}>
                  <button
                    type="button"
                    onClick={() => {
                      setShowModal(false);
                      setMessage('');
                    }}
                    className="btn-outline"
                    style={{ flex: 1, justifyContent: 'center', padding: '12px' }}
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="btn-primary"
                    style={{ flex: 1, justifyContent: 'center', padding: '12px' }}
                  >
                    {loading ? 'Menyimpan...' : editId ? 'Simpan Perubahan' : 'Daftarkan Akun'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Konfirmasi Hapus Akun Pegawai */}
      {showDeleteModal && pegawaiToDelete && (
        <div className="modal-overlay" onClick={() => !deleting && setShowDeleteModal(false)}>
          <div
            className="modal-content"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: '520px', padding: '28px' }}
          >
            {/* Header Modal */}
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div
                  style={{
                    width: '44px',
                    height: '44px',
                    borderRadius: '12px',
                    background: '#fee2e2',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#dc2626',
                    flexShrink: 0,
                  }}
                >
                  <IconAlertTriangle size={24} color="#dc2626" />
                </div>
                <div>
                  <h3 style={{ fontSize: '18px', fontWeight: '800', color: '#0f172a', margin: 0 }}>
                    Konfirmasi Hapus Akun Pegawai
                  </h3>
                  <p style={{ fontSize: '13px', color: '#64748b', margin: '3px 0 0 0' }}>
                    Pastikan keputusan sebelum menonaktifkan akun pegawai.
                  </p>
                </div>
              </div>
              <button
                onClick={() => !deleting && setShowDeleteModal(false)}
                style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: '4px' }}
                aria-label="Tutup modal"
              >
                <IconClose size={20} color="#64748b" />
              </button>
            </div>

            {/* Target Pegawai Card */}
            <div
              style={{
                padding: '16px',
                borderRadius: '12px',
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
              }}
            >
              <div style={{ fontSize: '12px', color: '#64748b', fontWeight: '700' }}>
                PEGAWAI YANG AKAN DIHAPUS:
              </div>
              <div style={{ fontSize: '16px', fontWeight: '800', color: '#0f172a' }}>
                {pegawaiToDelete.nama}
              </div>
              <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', fontSize: '13px', color: '#475569' }}>
                <div>
                  Username: <b style={{ fontFamily: 'monospace', color: '#2563eb' }}>{pegawaiToDelete.nip}</b>
                </div>
                <div>
                  Jabatan: <b>{pegawaiToDelete.jabatan || '-'}</b>
                </div>
              </div>
            </div>

            {/* Warning Message & Reassurance */}
            <div
              style={{
                padding: '14px 16px',
                borderRadius: '10px',
                background: '#fff1f2',
                border: '1px solid #fecaca',
                color: '#991b1b',
                fontSize: '13px',
                lineHeight: '1.6',
              }}
            >
              <b>⚠️ Perhatian:</b> Akun pegawai ini akan dinonaktifkan dan dihapus dari sistem. Pegawai yang bersangkutan tidak akan dapat melakukan presensi atau mengirim laporan lagi.
            </div>

            <div
              style={{
                padding: '12px 16px',
                borderRadius: '10px',
                background: '#eff6ff',
                border: '1px solid #bfdbfe',
                color: '#1e40af',
                fontSize: '13px',
                lineHeight: '1.5',
              }}
            >
              <b>💡 Saran Administrator:</b> Pastikan Anda telah mengunduh/mencetak rekapitulasi presensi dan lembar laporan kinerja pegawai ini untuk arsip kalurahan sebelum dihapus.
            </div>

            {/* Action Buttons */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '6px' }}>
              <button
                type="button"
                disabled={deleting}
                onClick={() => setShowDeleteModal(false)}
                className="btn-outline"
                style={{ padding: '10px 20px', fontSize: '13px', fontWeight: '700' }}
              >
                Batal (Kembali)
              </button>
              <button
                type="button"
                disabled={deleting}
                onClick={handleConfirmDelete}
                className="btn-danger"
                style={{ padding: '10px 22px', fontSize: '13px', fontWeight: '800' }}
              >
                {deleting ? 'Menghapus...' : 'Ya, Hapus Akun Pegawai'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===================== SUB-MODAL KELOLA OPSI JABATAN / UNIT KERJA DI DALAM POP-UP ===================== */}
      {manageModal && manageModal.isOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.7)',
            backdropFilter: 'blur(5px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 999999,
            padding: '16px',
            animation: 'fadeIn 0.15s ease',
          }}
          onClick={() => !manageModal.loading && setManageModal(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: '#ffffff',
              borderRadius: '16px',
              padding: '22px',
              maxWidth: '460px',
              width: '100%',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.3)',
              display: 'flex',
              flexDirection: 'column',
              gap: '14px',
              border: '1px solid #bfdbfe',
            }}
          >
            {/* Header Sub-Modal */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ fontSize: '16px', fontWeight: '800', color: '#0f172a' }}>
                  ⚙️ Kelola Opsi {manageModal.type === 'jabatan' ? 'Jabatan' : 'Unit Kerja'}
                </h3>
                <p style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>
                  Tambah opsi baru atau hapus kategori dari daftar dropdown
                </p>
              </div>
              <button
                type="button"
                onClick={() => !manageModal.loading && setManageModal(null)}
                style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: '4px' }}
                title="Tutup"
              >
                <IconClose size={18} color="#94a3b8" />
              </button>
            </div>

            {/* Form Tambah Opsi Cepat */}
            <form onSubmit={handleAddOption} style={{ display: 'flex', gap: '8px' }}>
              <input
                type="text"
                autoFocus
                required
                placeholder={`Ketik nama ${manageModal.type === 'jabatan' ? 'jabatan' : 'unit kerja'} baru...`}
                className="input-field"
                value={manageModal.newNama}
                onChange={(e) =>
                  setManageModal((prev) => (prev ? { ...prev, newNama: e.target.value } : null))
                }
                style={{ flex: 1, background: '#ffffff', color: '#0f172a', padding: '8px 12px', fontSize: '13px' }}
              />
              <button
                type="submit"
                disabled={manageModal.loading || !manageModal.newNama.trim()}
                className="btn-primary"
                style={{ padding: '8px 14px', fontSize: '12px', fontWeight: '700', whiteSpace: 'nowrap' }}
              >
                {manageModal.loading ? '...' : '➕ Tambah'}
              </button>
            </form>

            {manageModal.error && (
              <div style={{ fontSize: '12px', color: '#dc2626', background: '#fef2f2', padding: '6px 10px', borderRadius: '6px' }}>
                ⚠️ {manageModal.error}
              </div>
            )}

            {/* List Opsi yang Tersedia */}
            <div>
              <div style={{ fontSize: '11px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', marginBottom: '8px' }}>
                Daftar Opsi Tersedia ({manageModal.type === 'jabatan' ? jabatanOptions.length : unitKerjaOptions.length}):
              </div>
              <div
                style={{
                  maxHeight: '220px',
                  overflowY: 'auto',
                  border: '1px solid #e2e8f0',
                  borderRadius: '10px',
                  padding: '6px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '4px',
                }}
              >
                {(manageModal.type === 'jabatan' ? jabatanOptions : unitKerjaOptions).length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '16px', fontSize: '12px', color: '#94a3b8' }}>
                    Belum ada opsi. Silakan tambahkan melalui form di atas.
                  </div>
                ) : (
                  (manageModal.type === 'jabatan' ? jabatanOptions : unitKerjaOptions).map((item) => (
                    <div
                      key={item.id}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '6px 10px',
                        background: '#f8fafc',
                        borderRadius: '6px',
                        fontSize: '12px',
                        fontWeight: '600',
                        color: '#0f172a',
                      }}
                    >
                      <span>{item.nama}</span>
                      <button
                        type="button"
                        onClick={() => handleDeleteOption(manageModal.type, item.id, item.nama)}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          color: '#dc2626',
                          cursor: 'pointer',
                          padding: '2px 4px',
                          display: 'flex',
                          alignItems: 'center',
                        }}
                        title={`Hapus "${item.nama}"`}
                      >
                        <IconTrash size={13} color="#dc2626" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '4px' }}>
              <button
                type="button"
                onClick={() => setManageModal(null)}
                className="btn-primary"
                style={{ padding: '8px 16px', fontSize: '12px' }}
              >
                Selesai
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
