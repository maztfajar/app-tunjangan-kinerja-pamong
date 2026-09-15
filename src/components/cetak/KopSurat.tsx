import React from 'react';

export interface KopSuratData {
  kopLogoUrl?: string | null;
  logoUrl?: string | null;
  kopAksaraUrl?: string | null;
  kopNamaPemda?: string | null;
  kopInstansi?: string | null;
  kopNamaInstansi?: string | null;
  kopKalurahan?: string | null;
  namaKantor?: string | null;
  kopAlamat?: string | null;
  kopKontak?: string | null;
}

interface KopSuratProps {
  settings?: KopSuratData | null;
  mode?: 'screen' | 'print' | 'preview';
}

/**
 * Komponen Standar KOP Surat Resmi Kedinasan
 * Disesuaikan 100% dengan Live Preview pada menu Format Laporan Superadmin
 */
export default function KopSurat({ settings, mode = 'print' }: KopSuratProps) {
  const logo = settings?.kopLogoUrl || settings?.logoUrl || '';
  const aksara = settings?.kopAksaraUrl || '';
  const namaPemda = settings?.kopNamaPemda || settings?.kopInstansi || 'PEMERINTAH KABUPATEN KULON PROGO';
  const namaInstansi = settings?.kopNamaInstansi || settings?.kopKalurahan || settings?.namaKantor || 'KAPANEWON PENGASIH';
  const alamat = settings?.kopAlamat || 'Jl. Pengasih No. 2, Pengasih, Kulon Progo, DIY 55652';
  const kontak = settings?.kopKontak || 'Telp. (0274) 773422';

  const isPrint = mode === 'print';

  return (
    <div
      className="kop-surat-wrapper"
      style={{
        position: 'relative',
        marginBottom: isPrint ? '12px' : '0',
        fontFamily: "'Times New Roman', Times, 'Liberation Serif', serif",
        color: '#000000',
        width: '100%',
      }}
    >
      {/* Baris Utama: Logo Kiri | Teks KOP Tengah | Spacer Kanan */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 0,
          paddingBottom: '2px',
        }}
      >
        {/* Kolom Logo di Kiri — Presisi dan Terpusat Secara Vertikal */}
        <div
          style={{
            width: isPrint ? '85px' : '80px',
            flexShrink: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            alignSelf: 'center',
            marginTop: isPrint ? '-6px' : '-8px',
          }}
        >
          {logo ? (
            <img
              src={logo}
              alt="Logo Instansi"
              style={{
                width: isPrint ? '75px' : '70px',
                height: isPrint ? '75px' : '70px',
                objectFit: 'contain',
              }}
            />
          ) : (
            <div
              style={{
                width: isPrint ? '75px' : '70px',
                height: isPrint ? '75px' : '70px',
                border: '1.5px dashed #cbd5e1',
                borderRadius: '4px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <span
                style={{
                  fontSize: '8px',
                  color: '#94a3b8',
                  textAlign: 'center',
                  fontFamily: 'sans-serif',
                  lineHeight: 1.2,
                }}
              >
                Logo<br />Instansi
              </span>
            </div>
          )}
        </div>

        {/* Teks KOP Surat — 100% Simetris di Tengah Halaman */}
        <div
          style={{
            flex: 1,
            textAlign: 'center',
            padding: '2px 8px',
            minWidth: 0,
          }}
        >
          {/* Nama Pemerintah Daerah */}
          <p
            style={{
              fontSize: isPrint ? '11.5pt' : '11px',
              fontWeight: 700,
              textTransform: 'uppercase',
              margin: 0,
              letterSpacing: '0.5px',
              lineHeight: 1.2,
              color: '#000000',
            }}
          >
            {namaPemda}
          </p>

          {/* Nama Instansi Utama */}
          <p
            style={{
              fontSize: isPrint ? '15pt' : '15px',
              fontWeight: 900,
              textTransform: 'uppercase',
              margin: '2px 0 0 0',
              lineHeight: 1.2,
              letterSpacing: '0.3px',
              whiteSpace: 'pre-line',
              color: '#000000',
            }}
          >
            {namaInstansi}
          </p>

          {/* Aksara Jawa (Jika Diunggah di Format Laporan Superadmin) */}
          {aksara && (
            <div
              style={{
                display: 'flex',
                justifyContent: 'center',
                margin: isPrint ? '3px 0 2px 0' : '3px 0 2px 0',
              }}
            >
              <img
                src={aksara}
                alt="Aksara Jawa"
                style={{
                  height: isPrint ? '28px' : '25px',
                  maxWidth: '85%',
                  objectFit: 'contain',
                }}
              />
            </div>
          )}

          {/* Alamat Kantor Lengkap */}
          <p
            style={{
              fontSize: isPrint ? '9pt' : '8.5px',
              margin: '3px 0 0 0',
              lineHeight: 1.35,
              color: '#000000',
            }}
          >
            {alamat}
          </p>

          {/* Kontak Telepon / Email */}
          {kontak && (
            <p
              style={{
                fontSize: isPrint ? '8.5pt' : '8px',
                margin: '1px 0 0 0',
                lineHeight: 1.35,
                color: '#000000',
              }}
            >
              {kontak}
            </p>
          )}
        </div>

        {/* Spacer Kanan — Sama Lebar dengan Kolom Logo untuk Menjaga Keseimbangan Teks di Tengah */}
        <div style={{ width: isPrint ? '85px' : '80px', flexShrink: 0 }} />
      </div>

      {/* Garis Pemisah Ganda Khas Dinas: Tebal di Atas, Tipis di Bawah */}
      <hr
        style={{
          border: 'none',
          borderTop: isPrint ? '2.5px solid #000000' : '2.5px solid #000000',
          margin: '0 0 2px 0',
        }}
      />
      <hr
        style={{
          border: 'none',
          borderTop: isPrint ? '0.75px solid #000000' : '0.75px solid #000000',
          margin: isPrint ? '0 0 10px 0' : '0 0 8px 0',
        }}
      />
    </div>
  );
}
