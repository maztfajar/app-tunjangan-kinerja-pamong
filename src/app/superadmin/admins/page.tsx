'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  IconUsers,
  IconCheckCircle,
  IconClose,
  IconTrash,
  IconInfo,
  IconAlertTriangle,
} from '@/components/ui/Icons';

interface AdminUser {
  id: string;
  nip: string;
  nama: string;
  jabatan: string | null;
  unitKerja: string | null;
  createdAt: string;
}

export default function SuperAdminAdminsPage() {
  const [admins, setAdmins] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Modal Konfirmasi Hapus User
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [adminToDelete, setAdminToDelete] = useState<AdminUser | null>(null);
  const [deleting, setDeleting] = useState(false);

  const [form, setForm] = useState({
    nip: '',
    nama: '',
    password: '',
    jabatan: 'Admin',
    unitKerja: 'Pemerintah Kalurahan',
  });

  const fetchAdmins = async () => {
    try {
      const res = await fetch('/api/superadmin/admins');
      const data = await res.json();
      if (data.admins) setAdmins(data.admins);
    } catch (err) {
      console.error('Fetch admins error:', err);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchAdmins();
  }, []);

  const handleCreateAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);

    try {
      const res = await fetch('/api/superadmin/admins', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, jabatan: 'Admin' }),
      });
      const data = await res.json();

      if (!res.ok) {
        setMessage({ type: 'error', text: data.error || 'Gagal membuat admin baru.' });
      } else {
        setMessage({ type: 'success', text: `User Admin "${form.nama}" (${form.nip}) berhasil dibuat!` });
        setShowModal(false);
        setForm({
          nip: '',
          nama: '',
          password: '',
          jabatan: 'Admin',
          unitKerja: 'Pemerintah Kalurahan',
        });
        fetchAdmins();
      }
    } catch {
      setMessage({ type: 'error', text: 'Terjadi kesalahan jaringan.' });
    }
    setSaving(false);
  };

  const handleConfirmDeleteAdmin = async () => {
    if (!adminToDelete) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/superadmin/admins?id=${adminToDelete.id}`, {
        method: 'DELETE',
      });
      const data = await res.json();

      if (!res.ok) {
        setMessage({ type: 'error', text: data.error || 'Gagal menghapus admin.' });
      } else {
        setMessage({ type: 'success', text: `User Admin "${adminToDelete.nama}" (${adminToDelete.nip}) berhasil dihapus dari sistem.` });
        setShowDeleteModal(false);
        setAdminToDelete(null);
        fetchAdmins();
      }
    } catch {
      setMessage({ type: 'error', text: 'Terjadi kesalahan jaringan saat menghapus admin.' });
    }
    setDeleting(false);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', width: '100%' }}>
      {/* Header */}
      <div
        className="glass-card-static animate-slide-up"
        style={{
          padding: '24px 28px',
          background: '#ffffff',
          border: '1px solid #eaedf2',
          borderRadius: '16px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '16px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div
            style={{
              width: '48px',
              height: '48px',
              borderRadius: '12px',
              background: '#ecfdf5',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#10b981',
            }}
          >
            <IconUsers size={26} color="#10b981" />
          </div>
          <div>
            <h2 style={{ fontSize: '22px', fontWeight: '800', color: '#0f172a' }}>
              Manajemen Pengguna Administrator
            </h2>
            <p style={{ fontSize: '14px', color: '#64748b', marginTop: '3px' }}>
              Hanya Super Admin yang memiliki wewenang untuk membuat atau menghapus akun Administrator operasional.
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '12px' }}>
          <button
            onClick={() => setShowModal(true)}
            className="btn-primary"
            style={{
              fontSize: '14px',
              padding: '10px 20px',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              fontWeight: '800',
              background: '#0089d7',
            }}
          >
            <span>+ Tambah Admin Baru</span>
          </button>
          <Link href="/superadmin" className="btn-outline" style={{ fontSize: '13px', fontWeight: '700', padding: '10px 16px' }}>
            ← Kembali ke Dashboard
          </Link>
        </div>
      </div>

      {/* Petunjuk info */}
      <div className="petunjuk-panel">
        <h4 style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <IconInfo size={16} color="#0284c7" />
          Struktur Hak Akses Pengguna:
        </h4>
        <ul>
          <li><b>Super Admin (Root):</b> Berhak mengelola web, database, dan membuat akun Admin.</li>
          <li><b>Admin:</b> Bertugas mengelola data operasional pamong, lokasi GPS, jam kerja, hari libur, dan rekap laporan. Admin <u>tidak memiliki hak</u> membuat sesama admin.</li>
          <li><b>Pegawai / Pamong:</b> Melakukan absensi mandiri GPS, log kinerja, dan memantau tugas.</li>
          <li><b>Jabatan Admin (Locked):</b> Untuk menjaga konsistensi akses, kolom jabatan saat pembuatan admin baru dikunci otomatis sebagai <i>Admin</i> dan tidak dapat diubah.</li>
        </ul>
      </div>

      {message && (
        <div
          style={{
            padding: '12px 16px',
            borderRadius: '10px',
            background: message.type === 'success' ? '#ecfdf5' : '#fef2f2',
            border: message.type === 'success' ? '1px solid #a7f3d0' : '1px solid #fecaca',
            color: message.type === 'success' ? '#065f46' : '#991b1b',
            fontSize: '13px',
            fontWeight: '600',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          {message.type === 'success' ? <IconCheckCircle size={18} color="#059669" /> : '⚠️'}
          <span>{message.text}</span>
        </div>
      )}

      {/* Table of Admins */}
      <div className="glass-card-static" style={{ padding: '4px', overflow: 'hidden' }}>
        <div style={{ padding: '14px 18px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '14px', fontWeight: '800', color: '#0f172a' }}>
            Daftar User Administrator Aktif ({admins.length})
          </span>
        </div>

        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>NIP / Username</th>
                <th>Nama Lengkap</th>
                <th>Jabatan</th>
                <th>Unit Kerja</th>
                <th>Terdaftar Sejak</th>
                <th style={{ textAlign: 'center' }}>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '30px', color: '#64748b' }}>
                    Memuat daftar administrator...
                  </td>
                </tr>
              ) : admins.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '30px', color: '#94a3b8' }}>
                    Belum ada akun Administrator. Klik tombol &quot;+ Tambah Admin Baru&quot; di atas.
                  </td>
                </tr>
              ) : (
                admins.map((adm) => (
                  <tr key={adm.id}>
                    <td>
                      <span style={{ fontFamily: 'monospace', fontWeight: '700', color: '#4361ee' }}>
                        {adm.nip}
                      </span>
                    </td>
                    <td style={{ fontWeight: '700', color: '#0f172a' }}>{adm.nama}</td>
                    <td style={{ color: '#475569', fontWeight: '600' }}>{adm.jabatan || 'Admin'}</td>
                    <td style={{ color: '#475569' }}>{adm.unitKerja || '-'}</td>
                    <td style={{ color: '#64748b', fontSize: '12px' }}>
                      {new Date(adm.createdAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <button
                        onClick={() => {
                          setAdminToDelete(adm);
                          setShowDeleteModal(true);
                        }}
                        className="btn-danger"
                        style={{ padding: '6px 12px', fontSize: '12px', gap: '6px', display: 'inline-flex', alignItems: 'center', fontWeight: '700' }}
                        title="Hapus user admin ini"
                      >
                        <IconTrash size={14} color="#ffffff" />
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

      {/* Modal Tambah Admin Baru */}
      {showModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.45)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '16px',
          }}
          onClick={() => setShowModal(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: '#ffffff',
              borderRadius: '16px',
              padding: '24px 28px',
              maxWidth: '520px',
              width: '100%',
              boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <IconUsers size={20} color="#4361ee" />
                <h3 style={{ fontSize: '17px', fontWeight: '800', color: '#0f172a' }}>
                  Tambah User Administrator Baru
                </h3>
              </div>
              <button
                onClick={() => setShowModal(false)}
                style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: '4px' }}
              >
                <IconClose size={18} color="#64748b" />
              </button>
            </div>

            <form onSubmit={handleCreateAdmin} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label className="input-label" style={{ fontSize: '13px', fontWeight: '800', color: '#1e293b' }}>
                  NIP / Username Login *
                </label>
                <input
                  type="text"
                  className="input-field"
                  placeholder="Contoh: admin2 atau 19850101..."
                  value={form.nip}
                  onChange={(e) => setForm({ ...form, nip: e.target.value })}
                  required
                  style={{ marginTop: '6px', fontSize: '14px', padding: '10px 14px' }}
                />
              </div>

              <div>
                <label className="input-label" style={{ fontSize: '13px', fontWeight: '800', color: '#1e293b' }}>
                  Nama Lengkap Administrator *
                </label>
                <input
                  type="text"
                  className="input-field"
                  placeholder="Contoh: Budi Santoso, S.Kom."
                  value={form.nama}
                  onChange={(e) => setForm({ ...form, nama: e.target.value })}
                  required
                  style={{ marginTop: '6px', fontSize: '14px', padding: '10px 14px' }}
                />
              </div>

              <div>
                <label className="input-label" style={{ fontSize: '13px', fontWeight: '800', color: '#1e293b' }}>
                  Password Akun *
                </label>
                <input
                  type="password"
                  className="input-field"
                  placeholder="Masukkan password login admin"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  required
                  style={{ marginTop: '6px', fontSize: '14px', padding: '10px 14px' }}
                />
              </div>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <label className="input-label" style={{ fontSize: '13px', fontWeight: '800', color: '#1e293b' }}>
                    Jabatan
                  </label>
                  <span style={{ fontSize: '11px', color: '#0284c7', fontWeight: '700', background: '#e0f2fe', padding: '2px 8px', borderRadius: '6px' }}>
                    🔒 Terkunci (Default)
                  </span>
                </div>
                <input
                  type="text"
                  className="input-field"
                  value="Admin"
                  readOnly
                  disabled
                  style={{
                    marginTop: '6px',
                    background: '#f1f5f9',
                    color: '#334155',
                    cursor: 'not-allowed',
                    fontWeight: '800',
                    fontSize: '14px',
                    border: '1px solid #cbd5e1',
                    padding: '10px 14px',
                  }}
                />
                <p style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>
                  Jabatan otomatis disetel sebagai <b>Admin</b> dan formulir tidak dapat diubah.
                </p>
              </div>

              <div>
                <label className="input-label" style={{ fontSize: '13px', fontWeight: '800', color: '#1e293b' }}>
                  Unit Kerja
                </label>
                <input
                  type="text"
                  className="input-field"
                  placeholder="Contoh: Pemerintah Kalurahan"
                  value={form.unitKerja}
                  onChange={(e) => setForm({ ...form, unitKerja: e.target.value })}
                  style={{ marginTop: '6px', fontSize: '14px', padding: '10px 14px' }}
                />
              </div>

              <div style={{ marginTop: '12px', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="btn-outline"
                  style={{ padding: '10px 18px', fontSize: '13px', fontWeight: '700' }}
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="btn-primary"
                  style={{ padding: '10px 22px', fontSize: '13px', fontWeight: '800', background: '#0089d7' }}
                >
                  {saving ? 'Menyimpan...' : 'Simpan User Admin'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Konfirmasi Hapus User Administrator */}
      {showDeleteModal && adminToDelete && (
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
            padding: '16px',
          }}
          onClick={() => !deleting && setShowDeleteModal(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: '#ffffff',
              borderRadius: '16px',
              padding: '28px 30px',
              maxWidth: '520px',
              width: '100%',
              boxShadow: '0 25px 50px -12px rgba(0,0,0,0.35)',
              display: 'flex',
              flexDirection: 'column',
              gap: '18px',
            }}
          >
            {/* Header Modal */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
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
                    Konfirmasi Hapus User Administrator
                  </h3>
                  <p style={{ fontSize: '13px', color: '#64748b', margin: '3px 0 0 0' }}>
                    Tindakan ini memerlukan kepastian Super Administrator.
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

            {/* Target Admin Card */}
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
                AKUN ADMIN YANG AKAN DIHAPUS:
              </div>
              <div style={{ fontSize: '16px', fontWeight: '800', color: '#0f172a' }}>
                {adminToDelete.nama}
              </div>
              <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', fontSize: '13px', color: '#475569' }}>
                <div>
                  Username / NIP: <b style={{ fontFamily: 'monospace', color: '#0284c7' }}>{adminToDelete.nip}</b>
                </div>
                <div>
                  Jabatan: <b>{adminToDelete.jabatan || 'Admin'}</b>
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
              <b>⚠️ Perhatian:</b> Akun ini akan dihapus secara permanen dari server. Pengguna bersangkutan <b>tidak akan dapat login kembali</b> ke sistem admin.
            </div>

            <div
              style={{
                padding: '12px 16px',
                borderRadius: '10px',
                background: '#ecfdf5',
                border: '1px solid #a7f3d0',
                color: '#065f46',
                fontSize: '13px',
                lineHeight: '1.5',
              }}
            >
              <b>🛡️ Jaminan Sistem:</b> Seluruh data presensi dan rekapitulasi pegawai pamong yang sebelumnya pernah diproses oleh admin ini <b>tetap aman di database</b>.
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
                Batal (Jangan Hapus)
              </button>
              <button
                type="button"
                disabled={deleting}
                onClick={handleConfirmDeleteAdmin}
                className="btn-danger"
                style={{ padding: '10px 22px', fontSize: '13px', fontWeight: '800' }}
              >
                {deleting ? 'Menghapus...' : 'Ya, Hapus User Admin'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
