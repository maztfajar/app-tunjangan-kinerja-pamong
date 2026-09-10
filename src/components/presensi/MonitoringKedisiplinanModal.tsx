'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { IconCalendar, IconClock, IconCheckCircle, IconClose } from '@/components/ui/Icons';

interface PresensiItem {
  id: string;
  tanggal: string;
  jamMasuk?: string | null;
  jamPulang?: string | null;
  targetJamPulang?: string | null;
  statusMasuk?: string | null;
  keterangan?: string | null;
  keterlambatan: number | null;
  mendahului: number | null;
}

// Helper: Telat dalam toleransi yang sudah digenapi jam pulangnya tidak dihitung sebagai hukdis
function isTelatToleransiTerpenuhi(p: PresensiItem): boolean {
  if (p.statusMasuk === 'Telat dalam toleransi') {
    if (p.jamPulang && p.targetJamPulang) {
      return new Date(p.jamPulang).getTime() >= new Date(p.targetJamPulang).getTime();
    }
  }
  return false;
}

interface MonitoringKedisiplinanModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialYear?: number;
}

const BULAN_NAMES = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
];

export default function MonitoringKedisiplinanModal({
  isOpen,
  onClose,
  initialYear = new Date().getFullYear(),
}: MonitoringKedisiplinanModalProps) {
  const [selectedYear, setSelectedYear] = useState<number>(initialYear);
  const [presensiList, setPresensiList] = useState<PresensiItem[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchYearlyData = useCallback(async (year: number) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/presensi?tahun=${year}`);
      const data = await res.json();
      setPresensiList(data.presensi || []);
    } catch (err) {
      console.error('Error fetching yearly presensi for monitoring:', err);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (isOpen) {
      fetchYearlyData(selectedYear);
    }
  }, [isOpen, selectedYear, fetchYearlyData]);

  // Hitung agregasi data per bulan
  const monthlyData = useMemo(() => {
    return Array.from({ length: 12 }, (_, index) => {
      const monthIndex = index;
      const filtered = presensiList.filter((p) => {
        const d = new Date(p.tanggal);
        return d.getMonth() === monthIndex;
      });

      const terlambat = filtered.reduce((acc, curr) => {
        if (isTelatToleransiTerpenuhi(curr)) return acc;
        return acc + (curr.keterlambatan || 0);
      }, 0);
      const mendahului = filtered.reduce((acc, curr) => acc + (curr.mendahului || 0), 0);
      const total = terlambat + mendahului;

      return {
        monthName: BULAN_NAMES[monthIndex],
        terlambat,
        mendahului,
        total,
      };
    });
  }, [presensiList]);

  // Total tahunan
  const totalTerlambat = useMemo(() => {
    return monthlyData.reduce((sum, m) => sum + m.terlambat, 0);
  }, [monthlyData]);

  const totalMendahului = useMemo(() => {
    return monthlyData.reduce((sum, m) => sum + m.mendahului, 0);
  }, [monthlyData]);

  const totalKeseluruhan = totalTerlambat + totalMendahului;

  // Status Hukdis berdasarkan akumulasi menit (Standar PP 94 / 2021)
  const hukdis = useMemo(() => {
    if (totalKeseluruhan <= 1350) {
      return {
        status: 'Tidak Melanggar',
        subtitle: 'Dalam batas 1350 menit',
        color: '#16a34a',
      };
    } else if (totalKeseluruhan <= 2250) {
      return {
        status: 'Teguran Lisan',
        subtitle: 'Melebihi batas 1350 menit',
        color: '#d97706',
      };
    } else if (totalKeseluruhan <= 3150) {
      return {
        status: 'Teguran Tertulis',
        subtitle: 'Melebihi batas 2250 menit',
        color: '#ea580c',
      };
    } else {
      return {
        status: 'Pernyataan Tidak Puas',
        subtitle: 'Melebihi batas 3150 menit',
        color: '#dc2626',
      };
    }
  }, [totalKeseluruhan]);

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.45)',
        backdropFilter: 'blur(4px)',
        WebkitBackdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        padding: '16px',
        animation: 'fadeIn 0.2s ease',
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: '#ffffff',
          borderRadius: '16px',
          padding: '24px 28px',
          maxWidth: '890px',
          width: '100%',
          maxHeight: '90vh',
          overflowY: 'auto',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          display: 'flex',
          flexDirection: 'column',
          gap: '18px',
        }}
      >
        {/* Header Modal */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <IconCalendar size={20} color="#4361ee" />
            <h3 style={{ fontSize: '17px', fontWeight: '800', color: '#0f172a' }}>
              Monitoring Kedisiplinan
            </h3>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#64748b',
              cursor: 'pointer',
              padding: '4px',
              borderRadius: '6px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '18px',
            }}
            title="Tutup"
          >
            <IconClose size={18} color="#64748b" />
          </button>
        </div>

        {/* Filter Dropdown Tahun dengan Icon Kalender */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              border: '1px solid #e2e8f0',
              borderRadius: '8px',
              padding: '6px 12px',
              background: '#ffffff',
              boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
            }}
          >
            <IconCalendar size={15} color="#64748b" />
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              style={{
                border: 'none',
                background: 'transparent',
                fontWeight: '700',
                fontSize: '13px',
                color: '#0f172a',
                outline: 'none',
                cursor: 'pointer',
                fontFamily: 'inherit',
              }}
            >
              {[2024, 2025, 2026, 2027, 2028].map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </div>

          {loading && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#64748b' }}>
              <div className="spinner" style={{ width: '14px', height: '14px' }} />
              <span>Memuat data {selectedYear}...</span>
            </div>
          )}
        </div>

        {/* 4 Kartu Ringkasan (Exact Replica Image 1) */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            gap: '14px',
          }}
        >
          {/* Card 1: Total Terlambat */}
          <div
            style={{
              background: '#ffffff',
              border: '1px solid #eaedf2',
              borderRadius: '14px',
              padding: '18px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#475569' }}>
              <IconClock size={15} color="#64748b" />
              <span style={{ fontSize: '13px', fontWeight: '600' }}>Total Terlambat</span>
            </div>
            <div style={{ marginTop: '14px' }}>
              <div style={{ fontSize: '32px', fontWeight: '800', color: '#0f172a', lineHeight: '1' }}>
                {totalTerlambat}
              </div>
              <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '4px' }}>menit</div>
            </div>
          </div>

          {/* Card 2: Total Mendahului */}
          <div
            style={{
              background: '#ffffff',
              border: '1px solid #eaedf2',
              borderRadius: '14px',
              padding: '18px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#475569' }}>
              <IconClock size={15} color="#64748b" />
              <span style={{ fontSize: '13px', fontWeight: '600' }}>Total Mendahului</span>
            </div>
            <div style={{ marginTop: '14px' }}>
              <div style={{ fontSize: '32px', fontWeight: '800', color: '#0f172a', lineHeight: '1' }}>
                {totalMendahului}
              </div>
              <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '4px' }}>menit</div>
            </div>
          </div>

          {/* Card 3: Total Keseluruhan */}
          <div
            style={{
              background: '#ffffff',
              border: '1px solid #eaedf2',
              borderRadius: '14px',
              padding: '18px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#475569' }}>
              <IconClock size={15} color="#64748b" />
              <span style={{ fontSize: '13px', fontWeight: '600' }}>Total Keseluruhan</span>
            </div>
            <div style={{ marginTop: '14px' }}>
              <div style={{ fontSize: '32px', fontWeight: '800', color: '#0f172a', lineHeight: '1' }}>
                {totalKeseluruhan}
              </div>
              <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '4px' }}>menit</div>
            </div>
          </div>

          {/* Card 4: Status Hukdis */}
          <div
            style={{
              background: '#ffffff',
              border: '1px solid #eaedf2',
              borderRadius: '14px',
              padding: '18px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#16a34a' }}>
              <IconCheckCircle size={15} color="#16a34a" />
              <span style={{ fontSize: '13px', fontWeight: '700' }}>Status Hukdis</span>
            </div>
            <div style={{ marginTop: '12px' }}>
              <div
                style={{
                  fontSize: '22px',
                  fontWeight: '800',
                  color: hukdis.color,
                  lineHeight: '1.2',
                }}
              >
                {hukdis.status}
              </div>
              <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '4px' }}>
                {hukdis.subtitle}
              </div>
            </div>
          </div>
        </div>

        {/* Section Rekap Per Bulan (Exact Replica Image 1) */}
        <div>
          <h4 style={{ fontSize: '15px', fontWeight: '800', color: '#0f172a', marginBottom: '14px' }}>
            Rekap Per Bulan
          </h4>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
              gap: '14px',
            }}
          >
            {monthlyData.map((m) => (
              <div
                key={m.monthName}
                style={{
                  background: '#ffffff',
                  border: '1px solid #eaedf2',
                  borderRadius: '14px',
                  padding: '16px 18px',
                  boxShadow: '0 1px 2px rgba(0,0,0,0.02)',
                }}
              >
                {/* Judul Bulan */}
                <div style={{ fontSize: '14px', fontWeight: '800', color: '#0f172a', marginBottom: '12px' }}>
                  {m.monthName}
                </div>

                {/* Terlambat */}
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '6px',
                    fontSize: '12px',
                  }}
                >
                  <span style={{ color: '#64748b' }}>Terlambat:</span>
                  <span style={{ fontWeight: '600', color: '#0f172a' }}>{m.terlambat} menit</span>
                </div>

                {/* Mendahului */}
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '10px',
                    fontSize: '12px',
                  }}
                >
                  <span style={{ color: '#64748b' }}>Mendahului:</span>
                  <span style={{ fontWeight: '600', color: '#0f172a' }}>{m.mendahului} menit</span>
                </div>

                {/* Divider Line */}
                <div style={{ borderTop: '1px solid #f1f5f9', margin: '8px 0' }} />

                {/* Total */}
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    fontSize: '12px',
                    fontWeight: '800',
                  }}
                >
                  <span style={{ color: '#0f172a' }}>Total:</span>
                  <span style={{ color: m.total > 0 ? '#dc2626' : '#0f172a' }}>
                    {m.total} menit
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
