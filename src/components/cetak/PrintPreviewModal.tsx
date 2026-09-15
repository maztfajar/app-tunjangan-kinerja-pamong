'use client';

import React from 'react';
import KopSurat, { KopSuratData } from './KopSurat';
import { IconPrinter, IconClose } from '@/components/ui/Icons';

export interface PrintPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPrint: () => void;
  title: string;
  subtitle?: string;
  settings?: KopSuratData & {
    ukuranKertas?: string;
    posisiDokumen?: string;
    sembunyikanNip?: boolean;
    sembunyikanNipAtasan?: boolean;
    ttdTempat?: string;
    ttdJudulKiri?: string;
    ttdAtasanStatus?: string;
    ttdAtasanJabatan?: string;
    ttdAtasanNama?: string;
    ttdAtasanNip?: string;
  };
  children: React.ReactNode;
  customTtd?: React.ReactNode;
}

export default function PrintPreviewModal({
  isOpen,
  onClose,
  onPrint,
  title,
  subtitle,
  settings,
  children,
  customTtd,
}: PrintPreviewModalProps) {
  if (!isOpen) return null;

  const isLandscape = settings?.posisiDokumen === 'landscape';
  const paperSize = settings?.ukuranKertas === 'F4' ? 'F4 (215×330 mm)' : 'A4 (210×297 mm)';
  const orientation = isLandscape ? 'Landscape' : 'Portrait';

  const todayStr = new Date().toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 99999,
        background: 'rgba(15, 23, 42, 0.75)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'flex-start',
        padding: '16px',
        overflowY: 'auto',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      {/* Container Dialog */}
      <div
        style={{
          background: '#ffffff',
          borderRadius: '16px',
          width: '100%',
          maxWidth: isLandscape ? '960px' : '780px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          border: '1px solid #e2e8f0',
          display: 'flex',
          flexDirection: 'column',
          margin: 'auto',
          overflow: 'hidden',
        }}
      >
        {/* Header Modal Bar */}
        <div
          style={{
            padding: '14px 20px',
            borderBottom: '1px solid #e2e8f0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: '#f8fafc',
            flexWrap: 'wrap',
            gap: '10px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span
              style={{
                fontSize: '14px',
                fontWeight: 800,
                color: '#0f172a',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <span>📄</span> Pratinjau Dokumen Cetak (Live Preview)
            </span>
            <span
              style={{
                fontSize: '11px',
                padding: '3px 8px',
                borderRadius: '999px',
                background: isLandscape ? '#ecfdf5' : '#eff6ff',
                color: isLandscape ? '#047857' : '#1d4ed8',
                border: `1px solid ${isLandscape ? '#a7f3d0' : '#bfdbfe'}`,
                fontWeight: 700,
              }}
            >
              {paperSize} · {orientation}
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              type="button"
              onClick={onPrint}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '7px 16px',
                borderRadius: '8px',
                background: '#2563eb',
                color: '#ffffff',
                border: 'none',
                fontWeight: 700,
                fontSize: '13px',
                cursor: 'pointer',
                boxShadow: '0 2px 6px rgba(37,99,235,0.3)',
              }}
            >
              <IconPrinter size={16} />
              <span>Cetak Sekarang (Print)</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              style={{
                background: '#f1f5f9',
                border: '1px solid #cbd5e1',
                borderRadius: '8px',
                padding: '7px 12px',
                cursor: 'pointer',
                color: '#475569',
                fontSize: '13px',
                fontWeight: 600,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
              }}
            >
              <IconClose size={16} />
              <span>Tutup</span>
            </button>
          </div>
        </div>

        {/* Simulasi Kertas Cetak (Sesuai Tampilan Live Preview di Superadmin) */}
        <div
          style={{
            background: '#e2e8f0',
            padding: '24px 16px',
            display: 'flex',
            justifyContent: 'center',
            overflowX: 'auto',
          }}
        >
          <div
            style={{
              background: '#ffffff',
              border: '1px solid #cbd5e1',
              borderRadius: '3px',
              boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.15)',
              padding: isLandscape ? '28px 36px' : '36px 32px',
              fontFamily: "'Times New Roman', Times, 'Liberation Serif', serif",
              color: '#000000',
              width: '100%',
              maxWidth: isLandscape ? '860px' : '620px',
              minHeight: '400px',
              boxSizing: 'border-box',
            }}
          >
            {/* KOP Surat Resmi */}
            <KopSurat settings={settings} mode="preview" />

            {/* Judul Dokumen Cetak */}
            <div style={{ textAlign: 'center', margin: '14px 0 16px' }}>
              <div
                style={{
                  fontSize: '13pt',
                  fontWeight: 'bold',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  color: '#000000',
                }}
              >
                {title}
              </div>
              {subtitle && (
                <div style={{ fontSize: '10.5pt', marginTop: '2px', color: '#000000' }}>
                  {subtitle}
                </div>
              )}
            </div>

            {/* Konten Isi Tabel / Dokumen */}
            <div style={{ width: '100%', overflowX: 'auto' }}>{children}</div>

            {/* Tanda Tangan Atasan & Pembuat */}
            {customTtd ? (
              customTtd
            ) : (
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'flex-end',
                  marginTop: '28px',
                  fontSize: '10pt',
                  pageBreakInside: 'avoid',
                }}
              >
                <div style={{ textAlign: 'center', minWidth: '220px' }}>
                  <p style={{ margin: 0 }}>
                    {settings?.ttdTempat || 'Pengasih'}, {todayStr}
                  </p>
                  <p style={{ margin: '2px 0 0', fontWeight: 'bold' }}>
                    {settings?.ttdAtasanJabatan || 'Lurah Pengasih'}
                  </p>
                  <div style={{ height: '54px' }} />
                  <p
                    style={{
                      margin: 0,
                      fontWeight: 'bold',
                      textDecoration: 'underline',
                    }}
                  >
                    {settings?.ttdAtasanNama || 'DJOKO PURWANTO'}
                  </p>
                  {!settings?.sembunyikanNipAtasan && settings?.ttdAtasanNip ? (
                    <p style={{ margin: '2px 0 0', fontSize: '9pt' }}>
                      NIP. {String(settings.ttdAtasanNip)}
                    </p>
                  ) : null}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
