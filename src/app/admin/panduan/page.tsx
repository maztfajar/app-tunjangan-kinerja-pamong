'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  IconBook,
  IconMapPin,
  IconUsers,
  IconClock,
  IconCalendar,
  IconClipboardCheck,
  IconFileText,
  IconCheckCircle,
  IconInfo,
  IconChevronDown,
} from '@/components/ui/Icons';

interface SectionGuide {
  id: string;
  category: string;
  title: string;
  subtitle: string;
  icon: React.ComponentType<{ size?: number; color?: string }>;
  badge: string;
  steps: Array<{
    nomor: string;
    judul: string;
    deskripsi: string;
    tips?: string;
  }>;
  ketentuan?: string[];
  faqs?: Array<{ tanya: string; jawab: string }>;
}

const CATEGORIES = [
  { id: 'all', label: 'Semua Panduan' },
  { id: 'lokasi', label: 'Radius Lokasi GPS' },
  { id: 'pegawai', label: 'Data Pegawai / Pamong' },
  { id: 'jam-kerja', label: 'Pengaturan Jam Kerja' },
  { id: 'hari-libur', label: 'Kalender Hari Libur' },
  { id: 'rekap-absen', label: 'Rekap Absensi GPS' },
  { id: 'rekap-laporan', label: 'Rekap Kinerja Bulanan' },
  { id: 'faq', label: 'Tanya Jawab (FAQ)' },
];

export default function BukuPanduanAdminPage() {
  const [activeCategory, setActiveCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);

  const guides: SectionGuide[] = [
    {
      id: 'lokasi',
      category: 'lokasi',
      title: 'Titik Lokasi & Radius GPS Kantor (Wewenang Super Admin)',
      subtitle: 'Penetapan koordinat latitude/longitude kantor kalurahan dan batas jarak toleransi (radius meter) presensi pamong kini dikelola terpusat oleh Super Administrator karena bersifat infrastruktur vital.',
      icon: IconMapPin,
      badge: 'Infrastruktur Vital',
      steps: [
        {
          nomor: '01',
          judul: 'Wewenang Terpusat Super Admin',
          deskripsi: 'Penentuan titik koordinat lokasi kantor dikelola langsung melalui dashboard Super Administrator (/superadmin/lokasi).',
          tips: 'Pemisahan ini dilakukan untuk menjaga validitas presensi agar titik kantor tidak terubah secara tidak sengaja.',
        },
        {
          nomor: '02',
          judul: 'Koordinasi Perubahan Titik Kantor',
          deskripsi: 'Jika kantor kalurahan berpindah lokasi atau membutuhkan penyesuaian radius toleransi GPS, hubungi Super Administrator.',
          tips: 'Format koordinat Latitude dan Longitude dapat diambil akurat dari Google Maps atau GPS ponsel.',
        },
        {
          nomor: '03',
          judul: 'Radius Presensi Pamong',
          deskripsi: 'Pamong yang berada di luar batas radius meter yang ditentukan otomatis tidak dapat melakukan absensi masuk maupun pulang.',
          tips: 'Rekomendasi radius adalah 50 s/d 100 meter untuk mengantisipasi deviasi sinyal GPS saat pamong berada di dalam ruangan.',
        },
      ],
      ketentuan: [
        'Konfigurasi titik koordinat kantor dan radius presensi merupakan wewenang penuh Super Administrator.',
        'Sistem menghitung jarak presensi menggunakan Haversine Formula dengan akurasi tinggi.',
      ],
    },
    {
      id: 'pegawai',
      category: 'pegawai',
      title: 'Manajemen Data Pegawai / Pamong Kalurahan',
      subtitle: 'Mengelola basis data pamong: menambah pamong baru, mengupdate data jabatan/pangkat, dan mereset password akun pamong.',
      icon: IconUsers,
      badge: 'Kelola Pamong',
      steps: [
        {
          nomor: '01',
          judul: 'Buka Menu Data Pegawai',
          deskripsi: 'Akses menu "Data Pegawai" (/admin/pegawai) untuk melihat seluruh daftar pamong yang aktif di kalurahan.',
        },
        {
          nomor: '02',
          judul: 'Menambahkan Pamong Baru',
          deskripsi: 'Klik tombol "+ Tambah Pegawai". Masukkan Username (digunakan sebagai akun login pamong), Nama Lengkap, Jabatan, Golongan/Pangkat, dan Nomor WhatsApp. Password awal otomatis diset "1234".',
          tips: 'Pastikan username login tidak ada yang ganda di database.',
        },
        {
          nomor: '03',
          judul: 'Edit Data Pamong',
          deskripsi: 'Klik tombol "Edit" pada baris pamong untuk memperbarui nama, jabatan, golongan, atau nomor kontak jika ada penyesuaian promosi/mutasi.',
        },
        {
          nomor: '04',
          judul: 'Reset Password Pamong yang Lupa',
          deskripsi: 'Apabila seorang pamong lupa password akunnya, klik tombol "Reset Password". Password pamong bersangkutan akan langsung dikembalikan ke bawaan "1234" sehingga pamong dapat login kembali.',
          tips: 'Ingatkan pamong untuk segera memperbarui password mereka setelah login pertama kali.',
        },
        {
          nomor: '05',
          judul: 'Menghapus Data Pamong',
          deskripsi: 'Gunakan tombol "Hapus" hanya jika pamong tersebut sudah pensiun atau mutasi keluar kalurahan.',
        },
      ],
      ketentuan: [
        'Akun admin tidak bisa membuat akun Admin lain di menu ini; pembuatan akun Admin hanya dapat dilakukan oleh Super Admin.',
      ],
    },
    {
      id: 'jam-kerja',
      category: 'jam-kerja',
      title: 'Pengaturan Jam Kerja & Batas Toleransi',
      subtitle: 'Mengonfigurasi jam masuk, jam pulang, batas toleransi keterlambatan, dan durasi kerja efektif per hari.',
      icon: IconClock,
      badge: 'Aturan Kerja',
      steps: [
        {
          nomor: '01',
          judul: 'Buka Menu Jam Kerja',
          deskripsi: 'Akses menu "Jam Kerja" (/admin/jam-kerja).',
        },
        {
          nomor: '02',
          judul: 'Atur Jam Masuk & Toleransi Keterlambatan',
          deskripsi: 'Jam masuk standar adalah 07:30 WIB. Anda dapat menentukan toleransi keterlambatan (misalnya 15 menit hingga 07:45 WIB).',
          tips: 'Pamong yang absen antara 07:31 s/d 07:45 tetap tercatat masuk namun menit keterlambatan akan diakumulasikan.',
        },
        {
          nomor: '03',
          judul: 'Atur Jam Pulang & Durasi Wajib (495 Menit)',
          deskripsi: 'Jam pulang standar adalah 15:45 WIB dengan durasi kerja wajib 495 menit (8 jam 15 menit). Jam pulang sistem otomatis bergeser jika pamong datang terlambat.',
        },
        {
          nomor: '04',
          judul: 'Simpan Perubahan Aturan',
          deskripsi: 'Klik "Simpan Aturan Jam Kerja". Berlaku mulai hari kerja berikutnya atau hari yang bersangkutan.',
        },
      ],
    },
    {
      id: 'hari-libur',
      category: 'hari-libur',
      title: 'Kalender & Sinkronisasi Hari Libur Nasional',
      subtitle: 'Sinkronisasi otomatis hari libur nasional resmi, menambah hari libur kalurahan sendiri, dan mengubah hari libur menjadi hari kerja fleksibel.',
      icon: IconCalendar,
      badge: 'Kalender Libur',
      steps: [
        {
          nomor: '01',
          judul: 'Buka Menu Hari Libur',
          deskripsi: 'Akses menu "Hari Libur" (/admin/hari-libur). Halaman menampilkan kalender interaktif dan tabel daftar libur tahun berjalan.',
        },
        {
          nomor: '02',
          judul: 'Sinkronkan Libur Nasional Otomatis',
          deskripsi: 'Klik tombol "Sinkronkan Libur Nasional". Sistem akan mengambil daftar hari libur resmi pemerintah Indonesia dari API publik dan menyimpannya langsung ke database kalurahan.',
          tips: 'Jalankan sinkronisasi ini setiap awal tahun atau saat ada pengumuman cuti bersama baru dari pemerintah.',
        },
        {
          nomor: '03',
          judul: 'Tambah Hari Libur Kalurahan / Lokal',
          deskripsi: 'Jika ada kegiatan lokal kalurahan yang diliburkan (misal: acara adat/desa), isi formulir Tambah Hari Libur dengan memilih tanggal dan mengisi keterangan libur, lalu klik "Simpan".',
          tips: 'Anda juga bisa langsung mengklik salah satu tanggal di kalender interaktif untuk otomatis mengisi kolom tanggal!',
        },
        {
          nomor: '04',
          judul: 'Mengganti Hari Libur Menjadi Masuk Kerja',
          deskripsi: 'Jika ada hari libur nasional atau cuti bersama yang di Kalurahan tetap diwajibkan piket/masuk, klik tombol "Ubah Jadi Masuk Kerja" pada baris hari libur tersebut. Statusnya akan berubah menjadi hari kerja aktif.',
        },
        {
          nomor: '05',
          judul: 'Hapus Hari Libur Tambahan',
          deskripsi: 'Klik tombol "Hapus" pada hari libur khusus yang ingin dibatalkan.',
        },
      ],
      ketentuan: [
        'Tanggal yang berstatus Hari Libur tidak akan memotong persentase kehadiran pamong dan tidak dianggap mangkir/alpha.',
      ],
    },
    {
      id: 'rekap-absen',
      category: 'rekap-absen',
      title: 'Rekapitulasi Presensi & Kedisiplinan Pamong',
      subtitle: 'Memantau data kehadiran seluruh pamong, keterlambatan menit, jam masuk/pulang, dan mencetak rekapitulasi presensi.',
      icon: IconClipboardCheck,
      badge: 'Rekap Presensi',
      steps: [
        {
          nomor: '01',
          judul: 'Buka Menu Rekap Absensi',
          deskripsi: 'Akses menu "Rekap Absensi" (/admin/rekap) untuk melihat seluruh rekaman log absensi pamong.',
        },
        {
          nomor: '02',
          judul: 'Gunakan Filter Rentang Tanggal & Pegawai',
          deskripsi: 'Pilih bulan, tahun, atau tentukan rentang tanggal tertentu. Anda juga dapat memfilter berdasarkan pamong tertentu untuk memeriksa rincian kehadiran individual.',
        },
        {
          nomor: '03',
          judul: 'Periksa Status & Menit Kedisiplinan',
          deskripsi: 'Sistem menampilkan indikator: Hadir Tepat Waktu (Hijau), Terlambat (Kuning), Pulang Cepat (Oranye), dan Tanpa Keterangan (Merah).',
          tips: 'Akumulasi menit terlambat dan pulang cepat disinkronkan dengan standar pemotongan tunjangan kinerja.',
        },
        {
          nomor: '04',
          judul: 'Cetak & Export Laporan Presensi',
          deskripsi: 'Klik tombol "Cetak Laporan" atau "Export Excel/PDF" untuk kebutuhan arsip dan lampiran pencairan dana tunjangan kinerja pamong.',
        },
      ],
    },
    {
      id: 'rekap-laporan',
      category: 'rekap-laporan',
      title: 'Rekapitulasi Laporan Kinerja & Log Kegiatan Bulanan',
      subtitle: 'Verifikasi lembar laporan kinerja pamong, pengecekan log kegiatan harian beserta foto lampiran, dan pengesahan laporan.',
      icon: IconFileText,
      badge: 'Verifikasi Kinerja',
      steps: [
        {
          nomor: '01',
          judul: 'Buka Menu Rekap Laporan',
          deskripsi: 'Akses menu "Rekap Laporan" (/admin/rekap-laporan).',
        },
        {
          nomor: '02',
          judul: 'Pilih Periode Bulan & Pamong',
          deskripsi: 'Tentukan bulan penilaian yang ingin diperiksa. Daftar pamong akan menampilkan status apakah laporan kinerja sudah dikirim atau belum.',
        },
        {
          nomor: '03',
          judul: 'Periksa Uraian Kegiatan & Foto Bukti Fisik',
          deskripsi: 'Klik rincian laporan pamong untuk memeriksa uraian pekerjaan harian, durasi menit kerja yang dihasilkan, serta lampiran foto kegiatan pamong.',
          tips: 'Foto bukti kegiatan membantu memastikan keabsahan pekerjaan lapangan pamong.',
        },
        {
          nomor: '04',
          judul: 'Verifikasi & Cetak Lembar Kinerja',
          deskripsi: 'Setelah dinilai sesuai, klik tombol verifikasi / setujui, lalu cetak lembar rekapitulasi penilaian kinerja pamong.',
        },
      ],
    },
    {
      id: 'faq',
      category: 'faq',
      title: 'Tanya Jawab Seputar Admin Operasional (FAQ)',
      subtitle: 'Pertanyaan yang sering diajukan mengenai teknis operasional harian Admin Kalurahan.',
      icon: IconInfo,
      badge: 'FAQ Admin',
      steps: [],
      faqs: [
        {
          tanya: 'Bagaimana jika pamong komplain tidak bisa absen masuk karena GPS di luar radius?',
          jawab: 'Pastikan pamong benar-benar berada di lingkungan kantor kalurahan dan fitur GPS di ponselnya dalam mode Akurasi Tinggi. Jika pamong sudah berada di kantor namun GPS ponselnya mendeteksi selisih jarak sedikit (misal 55 meter), Admin dapat menaikkan radius toleransi di menu Setting Lokasi dari 50 meter menjadi misal 100 meter.',
        },
        {
          tanya: 'Apakah Admin bisa mereset atau menghapus seluruh database?',
          jawab: 'TIDAK. Fitur Reset Database dan penghapusan massal hanya dimiliki oleh Super Admin (Root) demi keamanan dan mencegah penghapusan data secara tidak sengaja.',
        },
        {
          tanya: 'Bagaimana jika ada pamong yang berganti nomor WhatsApp?',
          jawab: 'Buka menu Data Pegawai, cari nama pamong tersebut, klik "Edit", lalu perbarui kolom Nomor Telepon/WhatsApp dan klik Simpan.',
        },
        {
          tanya: 'Bagaimana jika hari libur nasional jatuh pada hari Minggu?',
          jawab: 'Sistem secara otomatis telah menandai hari Sabtu dan Minggu sebagai akhir pekan non-kerja. Jika ada cuti bersama pada hari Senin berikutnya, fitur Sinkronisasi Libur Nasional akan otomatis mencatatnya sebagai hari libur.',
        },
      ],
    },
  ];

  const filteredGuides = guides.filter((guide) => {
    const matchCategory = activeCategory === 'all' || guide.category === activeCategory;
    const matchSearch =
      searchQuery.trim() === '' ||
      guide.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      guide.subtitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
      guide.steps.some(
        (s) =>
          s.judul.toLowerCase().includes(searchQuery.toLowerCase()) ||
          s.deskripsi.toLowerCase().includes(searchQuery.toLowerCase())
      ) ||
      (guide.faqs &&
        guide.faqs.some(
          (f) =>
            f.tanya.toLowerCase().includes(searchQuery.toLowerCase()) ||
            f.jawab.toLowerCase().includes(searchQuery.toLowerCase())
        ));
    return matchCategory && matchSearch;
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', width: '100%' }}>
      {/* 1. Header Banner Admin (Modern Emerald/Blue Gradient) */}
      <div
        className="glass-card-static animate-slide-up"
        style={{
          padding: '28px 32px',
          background: 'linear-gradient(90deg, #1e3a8a 0%, #2563eb 50%, #3b82f6 100%)',
          borderRadius: '16px',
          color: '#ffffff',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '20px',
          boxShadow: '0 8px 24px -4px rgba(37, 99, 235, 0.3)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '18px' }}>
          <div
            style={{
              width: '56px',
              height: '56px',
              borderRadius: '14px',
              background: 'rgba(255, 255, 255, 0.2)',
              backdropFilter: 'blur(8px)',
              border: '1px solid rgba(255, 255, 255, 0.35)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <IconBook size={28} color="#ffffff" />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
              <h1 style={{ fontSize: '24px', fontWeight: '800', letterSpacing: '-0.02em', margin: 0 }}>
                Buku Panduan Admin Operasional
              </h1>
              <span
                style={{
                  background: 'rgba(255, 255, 255, 0.25)',
                  border: '1px solid rgba(255, 255, 255, 0.4)',
                  fontSize: '12px',
                  fontWeight: '800',
                  padding: '3px 12px',
                  borderRadius: '9999px',
                }}
              >
                Administrator Kalurahan
              </span>
            </div>
            <p style={{ color: 'rgba(255, 255, 255, 0.9)', fontSize: '14px', marginTop: '6px' }}>
              Pedoman teknis pengelolaan lokasi GPS, jam kerja, kalender hari libur, data pegawai pamong, dan rekapitulasi kehadiran serta kinerja.
            </p>
          </div>
        </div>

        <Link
          href="/admin"
          style={{
            background: '#ffffff',
            color: '#1e3a8a',
            fontSize: '13px',
            fontWeight: '800',
            padding: '10px 20px',
            borderRadius: '10px',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            textDecoration: 'none',
            boxShadow: '0 2px 6px rgba(0,0,0,0.1)',
          }}
        >
          <span>← Kembali ke Dashboard Admin</span>
        </Link>
      </div>

      {/* 2. Petunjuk Utama Admin Box */}
      <div
        style={{
          padding: '20px 24px',
          borderRadius: '14px',
          background: '#eff6ff',
          border: '1px solid #bfdbfe',
          color: '#1e40af',
          fontSize: '14px',
          lineHeight: '1.65',
        }}
      >
        <h4 style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: '800', fontSize: '15px', marginBottom: '8px', color: '#1d4ed8' }}>
          <IconInfo size={20} color="#1d4ed8" />
          Fokus Tugas Utama Administrator Kalurahan:
        </h4>
        <ul style={{ margin: '0 0 0 22px' }}>
          <li>
            <b>Validasi GPS:</b> Menjaga titik lokasi kantor dan radius presensi tetap akurat agar pamong dapat absen dengan lancar.
          </li>
          <li>
            <b>Integritas Master Pamong:</b> Memastikan seluruh pamong terdaftar dengan username, jabatan, dan nomor WhatsApp yang aktif.
          </li>
          <li>
            <b>Kalender Libur Nasional:</b> Memastikan sinkronisasi libur nasional dilakukan sehingga pamong tidak terpotong absensinya di hari libur resmi.
          </li>
          <li>
            <b>Verifikasi Laporan:</b> Memeriksa kebenaran log kegiatan harian dan lembar laporan bulanan pamong sebelum disahkan untuk pencairan tunjangan.
          </li>
        </ul>
      </div>

      {/* 3. Search & Filter Bar */}
      <div
        className="glass-card-static"
        style={{
          padding: '18px 24px',
          background: '#ffffff',
          borderRadius: '16px',
          border: '1px solid #eaedf2',
          display: 'flex',
          flexDirection: 'column',
          gap: '14px',
        }}
      >
        <input
          type="text"
          className="input-field"
          placeholder="🔍 Cari panduan Admin (contoh: setting gps, tambah pegawai, sinkron libur, rekapitulasi absensi)..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{ fontSize: '14px', padding: '12px 16px' }}
        />

        <div style={{ display: 'flex', gap: '10px', overflowX: 'auto', paddingBottom: '4px' }}>
          {CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              style={{
                padding: '8px 16px',
                borderRadius: '10px',
                fontSize: '13px',
                fontWeight: activeCategory === cat.id ? '800' : '600',
                border: activeCategory === cat.id ? '1px solid #2563eb' : '1px solid #e2e8f0',
                background: activeCategory === cat.id ? '#2563eb' : '#ffffff',
                color: activeCategory === cat.id ? '#ffffff' : '#475569',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                transition: 'all 0.15s ease',
              }}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* 4. Daftar Panduan Admin */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {filteredGuides.length === 0 ? (
          <div
            className="glass-card-static"
            style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}
          >
            <p style={{ fontSize: '15px', fontWeight: '600' }}>Tidak ada panduan admin yang cocok dengan kata kunci Anda.</p>
            <button
              onClick={() => {
                setSearchQuery('');
                setActiveCategory('all');
              }}
              className="btn-outline"
              style={{ marginTop: '12px', fontSize: '13px' }}
            >
              Reset Pencarian
            </button>
          </div>
        ) : (
          filteredGuides.map((guide) => {
            const IconComp = guide.icon;
            return (
              <div
                key={guide.id}
                className="glass-card-static animate-slide-up"
                style={{
                  padding: '26px 30px',
                  background: '#ffffff',
                  border: '1px solid #eaedf2',
                  borderRadius: '16px',
                }}
              >
                {/* Header Panduan */}
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '14px', marginBottom: '18px', flexWrap: 'wrap' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                    <div
                      style={{
                        width: '46px',
                        height: '46px',
                        borderRadius: '12px',
                        background: '#eff6ff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#2563eb',
                        flexShrink: 0,
                      }}
                    >
                      <IconComp size={24} color="#2563eb" />
                    </div>
                    <div>
                      <h2 style={{ fontSize: '18px', fontWeight: '800', color: '#0f172a', margin: 0 }}>
                        {guide.title}
                      </h2>
                      <p style={{ fontSize: '14px', color: '#64748b', marginTop: '4px' }}>
                        {guide.subtitle}
                      </p>
                    </div>
                  </div>

                  <span
                    style={{
                      background: '#eff6ff',
                      color: '#2563eb',
                      border: '1px solid #bfdbfe',
                      fontSize: '12px',
                      fontWeight: '800',
                      padding: '4px 12px',
                      borderRadius: '8px',
                    }}
                  >
                    {guide.badge}
                  </span>
                </div>

                {/* Steps Section */}
                {guide.steps.length > 0 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginTop: '14px' }}>
                    {guide.steps.map((step) => (
                      <div
                        key={step.nomor}
                        style={{
                          padding: '16px 20px',
                          borderRadius: '12px',
                          background: '#f8fafc',
                          border: '1px solid #f1f5f9',
                          display: 'flex',
                          gap: '16px',
                          alignItems: 'flex-start',
                        }}
                      >
                        <span
                          style={{
                            width: '32px',
                            height: '32px',
                            borderRadius: '8px',
                            background: '#2563eb',
                            color: '#ffffff',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '13px',
                            fontWeight: '800',
                            flexShrink: 0,
                          }}
                        >
                          {step.nomor}
                        </span>
                        <div style={{ flex: 1 }}>
                          <h4 style={{ fontSize: '15px', fontWeight: '800', color: '#1e293b', margin: 0 }}>
                            {step.judul}
                          </h4>
                          <p style={{ fontSize: '14px', color: '#475569', marginTop: '6px', lineHeight: '1.6', whiteSpace: 'pre-line' }}>
                            {step.deskripsi}
                          </p>
                          {step.tips && (
                            <div
                              style={{
                                marginTop: '8px',
                                padding: '8px 12px',
                                borderRadius: '8px',
                                background: '#eff6ff',
                                border: '1px solid #bfdbfe',
                                fontSize: '13px',
                                color: '#1e40af',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px',
                              }}
                            >
                              <span>💡</span>
                              <span><b>Tips:</b> {step.tips}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Ketentuan Section */}
                {guide.ketentuan && guide.ketentuan.length > 0 && (
                  <div
                    style={{
                      marginTop: '16px',
                      padding: '14px 18px',
                      borderRadius: '10px',
                      background: '#fffbeb',
                      border: '1px solid #fde68a',
                      color: '#92400e',
                      fontSize: '13px',
                      lineHeight: '1.6',
                    }}
                  >
                    <b style={{ display: 'block', marginBottom: '4px' }}>📌 Catatan Regulasi &amp; Standar Operasional:</b>
                    <ul style={{ margin: '0 0 0 18px' }}>
                      {guide.ketentuan.map((k, i) => (
                        <li key={i}>{k}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* FAQ Section */}
                {guide.faqs && guide.faqs.length > 0 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '10px' }}>
                    {guide.faqs.map((faq, idx) => {
                      const isOpen = expandedFaq === idx;
                      return (
                        <div
                          key={idx}
                          style={{
                            border: '1px solid #e2e8f0',
                            borderRadius: '12px',
                            overflow: 'hidden',
                          }}
                        >
                          <button
                            type="button"
                            onClick={() => setExpandedFaq(isOpen ? null : idx)}
                            style={{
                              width: '100%',
                              padding: '16px 20px',
                              background: isOpen ? '#f8fafc' : '#ffffff',
                              border: 'none',
                              textAlign: 'left',
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              cursor: 'pointer',
                              gap: '12px',
                            }}
                          >
                            <span style={{ fontSize: '15px', fontWeight: '800', color: '#1e293b' }}>
                              ❓ {faq.tanya}
                            </span>
                            <IconChevronDown
                              size={18}
                              color="#64748b"
                              style={{
                                transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                                transition: 'transform 0.2s ease',
                              }}
                            />
                          </button>
                          {isOpen && (
                            <div
                              style={{
                                padding: '16px 20px',
                                background: '#f8fafc',
                                borderTop: '1px solid #f1f5f9',
                                fontSize: '14px',
                                color: '#475569',
                                lineHeight: '1.65',
                              }}
                            >
                              {faq.jawab}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
