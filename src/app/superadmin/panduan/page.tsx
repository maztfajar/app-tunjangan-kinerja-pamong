'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  IconBook,
  IconShield,
  IconSettings,
  IconUsers,
  IconTrash,
  IconServer,
  IconCheckCircle,
  IconInfo,
  IconChevronDown,
  IconLock,
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
  { id: 'lisensi', label: 'Serial Number & Ekstensi Fitur' },
  { id: 'identitas', label: 'Identitas & Logo Web App' },
  { id: 'admin', label: 'Manajemen User Admin' },
  { id: 'database', label: 'Kelola Database' },
  { id: 'hosting', label: 'Hosting & Konfigurasi .env' },
  { id: 'faq', label: 'Tanya Jawab (FAQ)' },
];

export default function BukuPanduanSuperAdminPage() {
  const [activeCategory, setActiveCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);

  const guides: SectionGuide[] = [
    {
      id: 'lisensi',
      category: 'lisensi',
      title: 'Aktivasi Serial Number & Rincian Fitur Ekstensi (PRO)',
      subtitle: 'Panduan lengkap pengelolaan status lisensi sistem, tata cara aktivasi serial number resmi, serta rincian 8 fitur ekstensi yang terbuka.',
      icon: IconShield,
      badge: 'Lisensi & Kapasitas',
      steps: [
        {
          nomor: '01',
          judul: 'Memahami Mode Standar vs Mode Ekstensi (PRO)',
          deskripsi: 'Sistem aplikasi ini memiliki 2 tingkatan operasional:\n• Versi Standar (Bawaan): Dibatasi maksimal 50 akun pegawai, preview/cetak dokumen terkunci pada ukuran F4 dengan orientasi Landscape, dan fokus pada presensi GPS serta laporan kinerja dasar.\n• Fitur Ekstensi Penuh (PRO): Mengaktifkan seluruh kapasitas tanpa batas (unlimited pegawai), kebebasan memilih ukuran kertas (A4 & F4) serta orientasi (Portrait & Landscape), dan 8 modul lanjutan.',
          tips: 'Aplikasi tidak menampilkan tulisan "PRO" yang mencolok pada antarmuka pengguna agar sistem tetap terlihat elegan dan rapi.',
        },
        {
          nomor: '02',
          judul: 'Tata Cara Aktivasi Serial Number',
          deskripsi: '1. Buka halaman utama Super Admin (Ringkasan Sistem).\n2. Temukan card "Serial Number" yang terletak tepat di bawah card "Reset & Pembersihan Database".\n3. Klik tombol "Masukkan Serial Number".\n4. Tempelkan serial number resmi yang Anda peroleh (misal: format blok TKP-PRO-XXXX-XXXX-XXXX-XXXX atau token resmi instansi).\n5. Klik "Simpan & Verifikasi". Sistem akan memvalidasi tanda tangan kriptografis secara lokal dan langsung mengaktifkan status terverifikasi.',
          tips: 'Aktivasi bekerja 100% offline dan tidak memerlukan koneksi internet ke server lisensi eksternal.',
        },
        {
          nomor: '03',
          judul: 'Daftar 8 Fitur Ekstensi Sistem yang Terbuka',
          deskripsi: 'Setelah serial number terverifikasi, sistem otomatis membuka 8 fitur berikut:\n1. Presensi Biometrik (Sidik Jari HP / WebAuthn): Pamong dan Super Admin dapat login & absen menggunakan sensor sidik jari / FaceID perangkat ponsel.\n2. Unlimited Pegawai: Kapasitas pendaftaran pamong terbuka penuh melebihi batas standar 50 orang.\n3. Kalender Libur Nasional Otomatis: Admin dapat menyinkronkan hari libur resmi nasional dari API pemerintah secara otomatis.\n4. Tambah Penetapan Hari: Menu kalender hari libur & penetapan hari masuk/libur khusus kalurahan tersedia lengkap di dashboard Admin.\n5. Custom Kop Surat & Format Cetak Lengkap: Menu Format Laporan & Kop terbuka di Super Admin untuk bebas memilih kertas A4/F4, orientasi Portrait/Landscape, logo kop pemda, dan tanda tangan pejabat.\n6. Fitur Backup & Restore Database: Super Admin dapat mengekspor seluruh basis data ke JSON dan merestore kembali kapan saja.\n7. Fitur Ajukan Suket: Pamong dapat mengajukan surat keterangan (Sakit, Izin, Cuti, Tugas Luar) langsung di halaman presensi dan disetujui admin.\n8. Fitur Agenda Kegiatan: Menu penjadwalan agenda rapat dan acara kalurahan aktif di dashboard pamong dan admin.',
          tips: 'Seluruh fitur di atas terintegrasi mulus tanpa merubah skema dasar data aplikasi.',
        },
        {
          nomor: '04',
          judul: 'Mereset atau Menghapus Serial Number',
          deskripsi: 'Jika ingin mengganti lisensi atau mengembalikan ke kapasitas standar, Anda dapat langsung mengklik tombol merah "Hapus Serial Number" yang muncul di samping tombol Kelola Serial Number pada dashboard, atau klik "Reset ke Standar" di dalam modal.',
          tips: 'Mereset atau menghapus lisensi tidak menghapus data presensi, pegawai, maupun laporan yang sudah tersimpan di database.',
        },
      ],
      ketentuan: [
        'Serial number diterbitkan khusus per instansi dan diverifikasi melalui algoritma HMAC-SHA256.',
        'Jika kuota pegawai di versi standar mencapai 50 orang, sistem akan menolak pendaftaran akun baru hingga serial number dimasukkan.',
        'Format cetak pada versi standar otomatis dikunci pada ukuran F4 Landscape untuk menjaga kepatuhan tata letak dokumen instansi.',
      ],
    },
    {
      id: 'identitas',
      category: 'identitas',
      title: 'Pengaturan Identitas Web App, Nama Kantor & Logo',
      subtitle: 'Tata cara mengubah nama instansi/kalurahan, judul aplikasi, dan logo visual sistem yang berlaku secara real-time di seluruh dashboard.',
      icon: IconSettings,
      badge: 'Branding Sistem',
      steps: [
        {
          nomor: '01',
          judul: 'Buka Menu Pengaturan Web & Logo',
          deskripsi: 'Pada sidebar Super Admin atau dari dashboard ringkasan sistem, pilih menu "Pengaturan Web & Logo" (/superadmin/pengaturan).',
          tips: 'Halaman ini dibuat dengan layout rentang penuh sehingga mudah dipantau pada monitor resolusi tinggi.',
        },
        {
          nomor: '02',
          judul: 'Ubah Nama Kantor / Wilayah',
          deskripsi: 'Isikan nama instansi atau wilayah Anda pada kolom "Nama Kantor / Instansi / Wilayah". Teks bawaan adalah "Kalurahan". Anda dapat melengkapinya menjadi misalnya "Kalurahan Pengasih" atau nama kalurahan Anda.',
          tips: 'Nama kantor ini akan langsung muncul di sidebar dan navbar seluruh pengguna (Pegawai, Admin, dan Super Admin).',
        },
        {
          nomor: '03',
          judul: 'Ubah Nama Aplikasi & Sub Judul',
          deskripsi: 'Ketik nama branding aplikasi (misal: "E-KINERJA") dan sub-judul (misal: "Sistem Informasi Pamong & Tunjangan Kinerja").',
          tips: 'Nama aplikasi ini muncul di bagian atas sidebar dan title tab browser.',
        },
        {
          nomor: '04',
          judul: 'Unggah Logo Kustom atau Gunakan Default',
          deskripsi: 'Klik "Pilih File Logo" untuk mengunggah logo lambang kalurahan (format PNG/JPG/WEBP/SVG, maksimal 2MB). Sistem otomatis memproses gambar menjadi Base64 yang tersimpan langsung di database. Jika ingin kembali ke logo asli, klik "Gunakan Logo Default Sistem".',
          tips: 'Gunakan gambar logo berlatar belakang transparan (PNG) untuk hasil tampilan terbaik.',
        },
        {
          nomor: '05',
          judul: 'Simpan Perubahan',
          deskripsi: 'Klik tombol "Simpan Perubahan". Sistem akan menampilkan notifikasi hijau sukses dan memperbarui logo serta teks di sidebar tanpa perlu merestart server.',
        },
      ],
      ketentuan: [
        'Perubahan identitas dan logo tersimpan di tabel database SystemSetting dan otomatis dibaca oleh semua halaman.',
        'Ukuran logo disarankan proporsional (1:1 atau rasio logo resmi instansi) agar tidak terdistorsi.',
      ],
    },
    {
      id: 'admin',
      category: 'admin',
      title: 'Manajemen Akun User Admin',
      subtitle: 'Membuat akun Admin baru, mengatur hak operasional, mengubah password, dan mengontrol hak akses level administrator.',
      icon: IconUsers,
      badge: 'Otoritas Akses',
      steps: [
        {
          nomor: '01',
          judul: 'Buka Menu Kelola User Admin',
          deskripsi: 'Akses menu "Kelola User Admin" (/superadmin/admins). Halaman ini menampilkan seluruh akun yang memiliki hak akses sebagai Administrator Operasional.',
          tips: 'Pamong/pegawai biasa TIDAK terdaftar di sini, melainkan dikelola oleh Admin di menu Data Pegawai.',
        },
        {
          nomor: '02',
          judul: 'Tambah Akun Admin Baru',
          deskripsi: 'Klik tombol "+ Tambah Admin Baru". Isi formulir dengan Username, Nama Lengkap, Nomor HP/WhatsApp, dan Password awal.',
          tips: 'Gunakan username unik tanpa spasi (huruf kecil dan angka disarankan).',
        },
        {
          nomor: '03',
          judul: 'Ubah Data atau Reset Password Admin',
          deskripsi: 'Jika seorang Admin lupa password atau ada mutasi petugas admin, Super Admin dapat mengklik tombol "Edit" atau "Reset Password" pada baris akun yang bersangkutan.',
          tips: 'Password admin baru langsung aktif seketika setelah disimpan.',
        },
        {
          nomor: '04',
          judul: 'Nonaktifkan atau Hapus Admin',
          deskripsi: 'Super Admin berhak menghapus akun admin yang sudah tidak bertugas dengan mengklik tombol "Hapus". Tindakan ini aman dan tidak menghapus data presensi pegawai yang sebelumnya pernah di-rekap.',
        },
      ],
      ketentuan: [
        'Pembuatan akun Admin eksklusif HANYA ada di Super Admin untuk mencegah penyalahgunaan hak akses.',
        'Akun Super Admin itu sendiri (root) tidak tercantum di tabel database publik, melainkan diamankan via environment server.',
      ],
    },
    {
      id: 'database',
      category: 'database',
      title: 'Reset & Pembersihan Database Fleksibel',
      subtitle: 'Fitur pembersihan data transaksi (Presensi GPS, Laporan Kinerja, Log Kegiatan, Tugas Atasan, Agenda) dengan filter rentang waktu: Semua, Tahunan, Bulanan, Mingguan, atau Harian.',
      icon: IconTrash,
      badge: 'Pembersihan Data',
      steps: [
        {
          nomor: '01',
          judul: 'Buka Menu Kelola Database',
          deskripsi: 'Akses menu "Kelola Database" (/superadmin/database). Halaman ini menampilkan ringkasan jumlah baris data yang ada saat ini.',
          tips: 'Layout halaman ini telah diperlebar penuh (full width) dengan ukuran font yang jelas dan kontras tinggi.',
        },
        {
          nomor: '02',
          judul: 'Pilih Cakupan / Rentang Waktu Pembersihan',
          deskripsi: 'Pilih salah satu mode rentang waktu:\n• Reset Semua: Menghapus seluruh riwayat data terpilih tanpa batasan waktu.\n• Rentang Tahun: Menghapus data spesifik pada 1 tahun kalender (misal: Tahun 2024 saja).\n• Rentang Bulan: Menghapus data pada 1 bulan tertentu (misal: Januari 2025 saja).\n• Rentang Mingguan: Menghapus data pada rentang tanggal mulai s/d tanggal selesai pilihan Anda.\n• Harian: Menghapus data hanya pada 1 hari kerja spesifik.',
          tips: 'Pilihan rentang waktu memastikan Anda tidak perlu menghapus seluruh data jika hanya ingin membersihkan bulan atau hari uji coba tertentu.',
        },
        {
          nomor: '03',
          judul: 'Pilih Kategori Data yang Ingin Direset',
          deskripsi: 'Beri tanda centang pada kategori data yang ingin dibersihkan:\n☑ Data Rekapitulasi Presensi & Absensi GPS\n☑ Data Rekapitulasi Laporan Kinerja Bulanan\n☑ Data Aktivitas Harian\n☑ Data Agenda Jadwal Kegiatan\n\nAnda dapat mencentang satu kategori saja atau mengklik "Pilih Semua". Setiap baris menampilkan jumlah baris data yang terkena dampak.',
        },
        {
          nomor: '04',
          judul: 'Jalankan Pembersihan & Konfirmasi Keamanan',
          deskripsi: 'Klik tombol merah "Jalankan Pembersihan Database". Sistem akan memunculkan jendela modal konfirmasi dengan rincian rentang waktu dan daftar kategori yang akan dihapus. Ketik teks persetujuan "RESET DATA" lalu klik "Konfirmasi Hapus Sekarang".',
          tips: 'Modal konfirmasi mencegah terjadinya klik yang tidak disengaja.',
        },
        {
          nomor: '05',
          judul: 'Hasil Eksekusi & Pembaruan Statistik',
          deskripsi: 'Setelah pembersihan sukses, notifikasi hijau menampilkan rincian berapa baris data yang berhasil dibersihkan pada setiap tabel, dan counter statistik langsung diperbarui.',
        },
      ],
      ketentuan: [
        'Data Akun Pengguna (User Pamong & User Admin) TIDAK AKAN PERNAH DIHAPUS oleh fitur reset database.',
        'Data Master Pengaturan (Radius Lokasi GPS, Master Jam Kerja, Hari Libur Nasional) TIDAK DIHAPUS.',
        'Tindakan pembersihan data bersifat permanen (tidak dapat di-undo), pastikan telah mencetak rekapitulasi yang diperlukan sebelum mereset.',
      ],
    },
    {
      id: 'hosting',
      category: 'hosting',
      title: 'Hosting, Rebuild & Konfigurasi .env',
      subtitle: 'Panduan teknis pengelolaan kredensial Super Admin di hosting (VPS, cPanel, Cloud, Docker) dan cara rebuild environment.',
      icon: IconServer,
      badge: 'Infrastruktur Server',
      steps: [
        {
          nomor: '01',
          judul: 'Lokasi File Konfigurasi .env',
          deskripsi: 'File .env terletak di direktori utama (root) aplikasi web pada server hosting Anda.',
          tips: 'File .env tidak diikutsertakan ke repositori Git publik demi keamanan kredensial rahasia.',
        },
        {
          nomor: '02',
          judul: 'Kredensial Super Admin Bawaan',
          deskripsi: 'Variabel kredensial Super Admin didefinisikan sebagai:\n• SUPERADMIN_USERNAME=root\n• SUPERADMIN_PASSWORD=root\n\nUntuk produksi publik, sangat disarankan mengubah password root menjadi kombinasi yang kuat.',
        },
        {
          nomor: '03',
          judul: 'Mengubah Kredensial di Hosting',
          deskripsi: 'Buka terminal SSH atau File Manager hosting Anda, buka file `.env`, lalu ganti nilai SUPERADMIN_USERNAME dan SUPERADMIN_PASSWORD sesuai keinginan Anda.',
        },
        {
          nomor: '04',
          judul: 'Rebuild & Restart Aplikasi di Hosting',
          deskripsi: 'Apakah di hosting bisa di-rebuild? YA, sangat bisa:\n• Di VPS / Cloud (PM2 / Systemd): Jalankan perintah `npm run build && pm2 restart all`.\n• Di Docker: Jalankan `docker compose up -d --build`.\n• Di cPanel Node.js Selector: Klik tombol "Restart Application" pada menu Node.js App.',
          tips: 'Next.js membaca variabel server saat inisialisasi, sehingga restart proses Node.js akan langsung menerapkan kredensial baru.',
        },
      ],
      ketentuan: [
        'Jangan membagikan kredensial Super Admin root kepada pengguna biasa.',
        'Gunakan protokol HTTPS (SSL) pada domain hosting agar transmisi login terenkripsi.',
      ],
    },
    {
      id: 'faq',
      category: 'faq',
      title: 'Tanya Jawab Seputar Super Admin (FAQ)',
      subtitle: 'Pertanyaan teknis yang sering diajukan mengenai hak akses Super Admin dan keamanan sistem.',
      icon: IconShield,
      badge: 'Bantuan Teknis',
      steps: [],
      faqs: [
        {
          tanya: 'Apa perbedaan mendasar antara Super Admin dan Admin biasa?',
          jawab: 'Super Admin (Root) memegang hak tertinggi atas sistem infrastruktur vital: mengontrol identitas/logo aplikasi, mengatur titik lokasi GPS kantor & radius presensi kalurahan, membuat akun user Admin, mereset database dengan filter waktu, dan mengonfigurasi environment hosting. Sementara Admin biasa bertugas menjalankan operasional harian: mengatur jam kerja kantor, kalender hari libur, data pegawai pamong, dan memverifikasi rekap presensi serta laporan bulanan pamong.',
        },
        {
          tanya: 'Apakah mereset database akan membuat pamong atau admin tidak bisa login?',
          jawab: 'TIDAK. Fitur reset database dirancang secara aman hanya untuk menghapus data riwayat transaksi (absensi, log harian, lembar laporan, tugas atasan). Seluruh akun login Pamong dan Admin tetap ada dan tidak tersentuh sama sekali.',
        },
        {
          tanya: 'Jika saya menghapus presensi bulan lalu, apakah presensi bulan ini ikut terhapus?',
          jawab: 'TIDAK jika Anda memilih mode "Rentang Bulan" atau "Rentang Mingguan/Harian". Hanya data pada bulan/tanggal yang Anda pilih yang akan dihapus.',
        },
        {
          tanya: 'Bagaimana jika logo baru yang saya unggah tidak langsung muncul di browser pamong?',
          jawab: 'Logo tersimpan langsung di database dan disajikan lewat endpoint API setting. Jika pamong masih melihat logo lama, cukup minta pamong untuk melakukan refresh halaman (Ctrl + F5 atau reload browser) untuk membersihkan cache browser lokal mereka.',
        },
        {
          tanya: 'Di mana saya bisa mengganti password akun root Super Admin?',
          jawab: 'Password Super Admin diatur melalui file konfigurasi `.env` pada server hosting (variabel SUPERADMIN_PASSWORD). Hal ini menjamin keamanan tingkat server karena tidak bisa diubah sembarangan dari formulir web biasa tanpa akses fisik/SSH ke server.',
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
      {/* 1. Header Banner Super Admin (Biru Laut Gradient) */}
      <div
        className="glass-card-static animate-slide-up"
        style={{
          padding: '28px 32px',
          background: 'linear-gradient(90deg, #0077b6 0%, #0089d7 45%, #00a9ef 100%)',
          borderRadius: '16px',
          color: '#ffffff',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '20px',
          boxShadow: '0 8px 24px -4px rgba(0, 137, 215, 0.35)',
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
                Buku Panduan Super Admin
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
                Tingkat Sistem (Root)
              </span>
            </div>
            <p style={{ color: 'rgba(255, 255, 255, 0.9)', fontSize: '14px', marginTop: '6px' }}>
              Pedoman teknis pengelolaan identitas web, logo, otorisasi admin, reset database fleksibel, dan konfigurasi hosting.
            </p>
          </div>
        </div>

        <Link
          href="/superadmin"
          style={{
            background: '#ffffff',
            color: '#0077b6',
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
          <span>← Kembali ke Ringkasan</span>
        </Link>
      </div>

      {/* 2. Petunjuk Penting Super Admin Box */}
      <div
        style={{
          padding: '20px 24px',
          borderRadius: '14px',
          background: '#f0f9ff',
          border: '1px solid #bae6fd',
          color: '#0369a1',
          fontSize: '14px',
          lineHeight: '1.65',
        }}
      >
        <h4 style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: '800', fontSize: '15px', marginBottom: '8px', color: '#0284c7' }}>
          <IconInfo size={20} color="#0284c7" />
          Perhatian &amp; Tanggung Jawab Utama Super Admin:
        </h4>
        <ul style={{ margin: '0 0 0 22px' }}>
          <li>
            <b>Hak Otoritas Tertinggi:</b> Anda memiliki kendali penuh atas identitas aplikasi, pembuatan user Admin, dan pembersihan database.
          </li>
          <li>
            <b>Keamanan Data Akun:</b> Fitur reset database dirancang aman dan <b>tidak akan pernah menghapus data akun pengguna (Pamong / Admin)</b>.
          </li>
          <li>
            <b>Konfigurasi Hosting:</b> Kredensial root Super Admin tersimpan di file server <code>.env</code> sehingga terisolasi aman dari database publik.
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
          placeholder="🔍 Cari panduan Super Admin (contoh: ubah logo, tambah admin, rentang waktu reset, .env hosting)..."
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
                border: activeCategory === cat.id ? '1px solid #0089d7' : '1px solid #e2e8f0',
                background: activeCategory === cat.id ? '#0089d7' : '#ffffff',
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

      {/* 4. Daftar Panduan */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {filteredGuides.length === 0 ? (
          <div
            className="glass-card-static"
            style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}
          >
            <p style={{ fontSize: '15px', fontWeight: '600' }}>Tidak ada panduan yang cocok dengan kata kunci pencarian.</p>
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
                        background: '#e0f2fe',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#0089d7',
                        flexShrink: 0,
                      }}
                    >
                      <IconComp size={24} color="#0089d7" />
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
                      background: '#f0f9ff',
                      color: '#0284c7',
                      border: '1px solid #bae6fd',
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
                            background: '#0089d7',
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
                                color: '#1d4ed8',
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
                    <b style={{ display: 'block', marginBottom: '4px' }}>📌 Catatan Regulasi &amp; Ketentuan:</b>
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
