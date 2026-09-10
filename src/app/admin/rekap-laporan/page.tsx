'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';

interface Pegawai {
  id: string;
  nip: string;
  nama: string;
  jabatan: string | null;
  unitKerja: string | null;
}

export default function RekapLaporanPage() {
  const [pegawai, setPegawai] = useState<Pegawai[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchPegawai = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/pegawai');
      const data = await res.json();
      setPegawai(data.pegawai || []);
    } catch (err) {
      console.error('Fetch pegawai error:', err);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchPegawai();
  }, [fetchPegawai]);

  const filtered = pegawai.filter(
    (p) =>
      p.nama.toLowerCase().includes(search.toLowerCase()) ||
      p.nip.includes(search)
  );

  const getInitials = (nama: string) => {
    return nama
      .split(' ')
      .map((n) => n[0])
      .join('')
      .substring(0, 2)
      .toUpperCase();
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div>
        <h2
          style={{
            fontSize: '24px',
            fontWeight: '800',
            color: '#0f172a',
            marginBottom: '6px',
          }}
        >
          Rekapitulasi Laporan Kinerja
        </h2>
        <p style={{ color: '#64748b', fontSize: '14px' }}>
          Pilih pegawai untuk melihat dan mencetak laporan kinerja
        </p>
      </div>

      {/* Search */}
      <div style={{ maxWidth: '400px' }}>
        <input
          type="text"
          className="input-field"
          placeholder="🔍 Cari nama atau username pamong..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Employee Count Badge */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <span
          className="badge badge-info"
          style={{ fontSize: '12px', padding: '5px 12px' }}
        >
          👥 {filtered.length} Pegawai
        </span>
      </div>

      {/* Employee List */}
      {loading ? (
        <div
          className="glass-card-static"
          style={{ padding: '48px 20px', textAlign: 'center' }}
        >
          <div className="spinner" style={{ margin: '0 auto 12px auto' }} />
          <p style={{ color: '#64748b', fontSize: '14px' }}>
            Memuat data pegawai...
          </p>
        </div>
      ) : filtered.length === 0 ? (
        <div
          className="glass-card-static"
          style={{ padding: '48px 20px', textAlign: 'center' }}
        >
          <p style={{ fontSize: '40px', marginBottom: '12px' }}>👥</p>
          <p style={{ color: '#64748b', fontSize: '14px' }}>
            {search
              ? 'Tidak ditemukan pegawai dengan kata kunci tersebut'
              : 'Belum ada data pegawai terdaftar'}
          </p>
        </div>
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
            gap: '14px',
          }}
        >
          {filtered.map((p, i) => (
            <Link
              key={p.id}
              href={`/admin/rekap-laporan/${p.id}`}
              className="employee-card animate-slide-up"
              style={{ animationDelay: `${i * 0.03}s` }}
            >
              <div className="avatar">{getInitials(p.nama)}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <h3
                  style={{
                    fontSize: '15px',
                    fontWeight: '700',
                    color: '#0f172a',
                    marginBottom: '3px',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  {p.nama}
                </h3>
                <p
                  style={{
                    fontSize: '12px',
                    color: '#64748b',
                    fontFamily: 'monospace',
                    marginBottom: '4px',
                  }}
                >
                  Username: {p.nip}
                </p>
                <div
                  style={{
                    display: 'flex',
                    gap: '6px',
                    flexWrap: 'wrap',
                  }}
                >
                  {p.jabatan && (
                    <span
                      className="badge badge-info"
                      style={{ fontSize: '10px' }}
                    >
                      {p.jabatan}
                    </span>
                  )}
                  {p.unitKerja && (
                    <span
                      className="badge badge-success"
                      style={{ fontSize: '10px' }}
                    >
                      🏛️ {p.unitKerja}
                    </span>
                  )}
                </div>
              </div>
              <span
                style={{
                  fontSize: '20px',
                  color: '#94a3b8',
                  flexShrink: 0,
                }}
              >
                →
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
