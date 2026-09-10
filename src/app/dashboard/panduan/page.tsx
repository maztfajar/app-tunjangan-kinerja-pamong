'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  IconBook,
  IconMapPin,
  IconClock,
  IconCheckCircle,
  IconFileText,
  IconClipboardCheck,
  IconCamera,
  IconCalendar,
  IconUser,
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
  { id: 'presensi', label: 'Presensi GPS & Jam Kerja' },
  { id: 'kegiatan', label: 'Log Kegiatan Harian' },
  { id: 'monitoring', label: 'Monitoring Kedisiplinan' },
  { id: 'tugas', label: 'Log Aktivitas' },
  { id: 'laporan', label: 'Laporan & Cetak' },
  { id: 'faq', label: 'Tanya Jawab (FAQ)' },
];

export default function BukuPanduanPage() {
  const [activeCategory, setActiveCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);

  const guides: SectionGuide[] = [
    {
      id: 'presensi',
      category: 'presensi',
      title: 'Presensi Mandiri (GPS) & Pengaturan Jam Kerja',
      subtitle: 'Tata cara melakukan absensi masuk dan pulang terintegrasi validasi radius GPS kantor serta penyesuaian jam kerja.',
      icon: IconMapPin,
      badge: 'Utama',
      steps: [
        {
          nomor: '01',
          judul: 'Buka Menu Beranda atau Peta GPS',
          deskripsi: 'Akses halaman Beranda atau menu Peta Presensi GPS. Sistem akan secara otomatis meminta izin akses lokasi (GPS) pada perangkat Anda.',
          tips: 'Pastikan fitur Lokasi / GPS di ponsel Anda dalam keadaan aktif dan browser diizinkan mengakses lokasi.',
        },
        {
          nomor: '02',
          judul: 'Pastikan Berada Dalam Radius Kantor',
          deskripsi: 'Indikator status GPS akan menampilkan status Anda. Tombol absen masuk akan aktif apabila Anda terdeteksi berada di dalam radius kantor kalurahan.',
          tips: 'Jika jarak terdeteksi di luar radius, dekatkan diri ke titik kantor kalurahan lalu klik tombol "Refresh GPS".',
        },
        {
          nomor: '03',
          judul: 'Lakukan Absen Masuk Pagi',
          deskripsi: 'Klik tombol hijau "Absen Masuk". Jam masuk resmi adalah pukul 07:30 WIB dengan toleransi keterlambatan hingga 15 menit (07:45 WIB).',
          tips: 'Absen masuk dapat dilakukan mulai 30 menit sebelum jam kerja resmi dibuka (mulai 07:00 WIB).',
        },
        {
          nomor: '04',
          judul: 'Perhatikan Target Jam Pulang',
          deskripsi: 'Jam pulang standar adalah pukul 15:45 WIB dengan durasi kerja wajib 495 menit (8 jam 15 menit). Apabila Anda datang terlambat, sistem otomatis menggeser target jam pulang mundur sesuai jumlah menit keterlambatan.',
          tips: 'Contoh: Anda absen masuk pukul 07:35 WIB (telat 5 menit). Target jam pulang Anda otomatis bergeser menjadi 15:50 WIB.',
        },
        {
          nomor: '05',
          judul: 'Lakukan Absen Pulang Sore',
          deskripsi: 'Setelah menyelesaikan seluruh jam kerja wajib, klik tombol merah "Absen Pulang". Absen pulang dapat dilakukan hingga batas toleransi 120 menit setelah target pulang.',
          tips: 'Apabila Anda mendahului pulang sebelum target jam kerja selesai, sistem akan menampilkan notifikasi konfirmasi potongan menit mendahului.',
        },
      ],
      ketentuan: [
        'Hari kerja resmi pamong adalah Senin s/d Jumat (Sabtu dan Minggu libur).',
        'Tanggal yang bertepatan dengan Hari Libur Nasional tidak dihitung sebagai kewajiban hari kerja efektif.',
        'Durasi kerja standar per hari adalah 495 menit (8 jam 15 menit) = 100% kehadiran penuh.',
      ],
    },
    {
      id: 'kegiatan',
      category: 'kegiatan',
      title: 'Pencatatan Log Kegiatan Harian',
      subtitle: 'Panduan merekam uraian pekerjaan dan dokumentasi bukti pelaksanaan tugas harian sebagai dasar tunjangan kinerja.',
      icon: IconFileText,
      badge: 'Harian',
      steps: [
        {
          nomor: '01',
          judul: 'Akses Form Input Kegiatan',
          deskripsi: 'Pada halaman Beranda (kolom kanan) atau melalui menu "Log Aktifitas", Anda akan menemukan formulir pencatatan kegiatan harian.',
        },
        {
          nomor: '02',
          judul: 'Isi Uraian Kegiatan dengan Rinci',
          deskripsi: 'Tuliskan deskripsi tugas atau pekerjaan yang Anda lakukan secara jelas, seperti pelayanan masyarakat, rapat koordinasi, penyusunan berkas, atau tugas lapangan.',
          tips: 'Gunakan uraian yang ringkas dan informatif agar mudah diverifikasi oleh atasan/lurah.',
        },
        {
          nomor: '03',
          judul: 'Unggah Foto Bukti Dokumentasi (Opsional)',
          deskripsi: 'Pilih foto kegiatan dari kamera handphone atau file galeri Anda sebagai bukti dokumentasi pelaksanaan tugas.',
        },
        {
          nomor: '04',
          judul: 'Simpan Kegiatan',
          deskripsi: 'Tekan tombol "Simpan Kegiatan". Kegiatan yang tersimpan akan langsung muncul pada daftar log harian lengkap dengan catatan waktu pencatatan (WIB).',
        },
      ],
      ketentuan: [
        'Setiap pamong dianjurkan mencatat seluruh aktifitas pekerjaan yang terlaksana setiap hari kerja.',
        'Kegiatan yang keliru dapat dihapus menggunakan tombol icon tempat sampah merah pada daftar kegiatan hari ini.',
      ],
    },
    {
      id: 'monitoring',
      category: 'monitoring',
      title: 'Monitoring Kedisiplinan & Hukuman Disiplin (PP 94/2021)',
      subtitle: 'Memahami akumulasi menit keterlambatan, pulang mendahului, serta status hukuman disiplin tahunan.',
      icon: IconCheckCircle,
      badge: 'Disiplin',
      steps: [
        {
          nomor: '01',
          judul: 'Buka Modal Monitoring Kedisiplinan',
          deskripsi: 'Klik tombol "Monitoring Kedisiplinan" yang tersedia pada Beranda atau halaman Rekap Absensi.',
        },
        {
          nomor: '02',
          judul: 'Pilih Tahun Periode',
          deskripsi: 'Gunakan filter dropdown tahun [ 📅 2026 ▾ ] untuk melihat data akumulasi kedisiplinan pada tahun anggaran yang diinginkan.',
        },
        {
          nomor: '03',
          judul: 'Cermati 4 Kartu Indikator Utama',
          deskripsi: 'Lihat ringkasan Total Terlambat (menit), Total Mendahului (menit), Total Keseluruhan (menit), dan Status Hukdis saat ini.',
        },
        {
          nomor: '04',
          judul: 'Pantau Rekap 12 Bulan',
          deskripsi: 'Pada bagian "Rekap Per Bulan", terdapat 12 kartu bulan (Januari s/d Desember). Bulan yang memiliki pelanggaran menit akan ditandai dengan angka total berwarna merah tebal.',
        },
      ],
      ketentuan: [
        'Akumulasi s/d 1.350 menit (kurang lebih 3 hari kerja): Status "Tidak Melanggar" (Bebas hukdis).',
        'Akumulasi 1.351 s/d 2.250 menit: Dijatuhi "Teguran Lisan".',
        'Akumulasi 2.251 s/d 3.150 menit: Dijatuhi "Teguran Tertulis".',
        'Akumulasi di atas 3.150 menit: Dijatuhi "Pernyataan Tidak Puas".',
      ],
    },
    {
      id: 'tugas',
      category: 'tugas',
      title: 'Pengelolaan Log Aktivitas',
      subtitle: 'Memantau arahan, instruksi penugasan kerja, dan memperbarui status progres tugas yang diberikan pimpinan.',
      icon: IconClipboardCheck,
      badge: 'Disposisi',
      steps: [
        {
          nomor: '01',
          judul: 'Buka Menu Log Aktivitas',
          deskripsi: 'Klik menu "Log Aktivitas" pada navigasi untuk melihat daftar perintah tugas yang didelegasikan oleh Lurah atau Carik.',
        },
        {
          nomor: '02',
          judul: 'Tinjau Rincian Hal & Waktu',
          deskripsi: 'Periksa perihal tugas, batas waktu pelaksanaan, lokasi kegiatan, serta catatan instruksi khusus yang disertakan oleh pemberi tugas.',
        },
        {
          nomor: '03',
          judul: 'Perbarui Status Pengerjaan',
          deskripsi: 'Ubah status dari "Pending" menjadi "Dalam Proses" saat tugas mulai dikerjakan, dan ubah menjadi "Selesai" jika tugas telah tuntas dilaksanakan.',
        },
      ],
    },
    {
      id: 'laporan',
      category: 'laporan',
      title: 'Laporan Kinerja Bulanan & Pencetakan Dokumen',
      subtitle: 'Meninjau rekapitulasi kehadiran, persentase capaian kinerja, dan mencetak dokumen laporan resmi.',
      icon: IconFileText,
      badge: 'Dokumen',
      steps: [
        {
          nomor: '01',
          judul: 'Masuk ke Menu Laporan Kinerja',
          deskripsi: 'Pilih menu "Laporan Kinerja" pada sidebar navigasi.',
        },
        {
          nomor: '02',
          judul: 'Pilih Periode Bulan & Tahun',
          deskripsi: 'Tentukan bulan dan tahun yang hendak dibuatkan rekapitulasi laporannya.',
        },
        {
          nomor: '03',
          judul: 'Verifikasi Data Rekap',
          deskripsi: 'Pastikan jumlah hari kerja efektif, total jam kerja, persentase potongan disiplin, dan persentase kehadiran telah sesuai dengan riwayat kegiatan Anda.',
        },
        {
          nomor: '04',
          judul: 'Cetak Dokumen Resmi',
          deskripsi: 'Klik tombol "Cetak Dokumen". Sistem akan menampilkan lembar laporan resmi berformat surat dinas lengkap dengan kop instansi, tanda tangan pegawai, dan atasan langsung yang siap dicetak ke printer atau disimpan sebagai PDF.',
        },
      ],
    },
    {
      id: 'faq',
      category: 'faq',
      title: 'Tanya Jawab (FAQ) & Penyelesaian Kendala Teknis',
      subtitle: 'Jawaban atas kendala umum yang sering dihadapi oleh pegawai saat menggunakan sistem.',
      icon: IconInfo,
      badge: 'Solusi',
      steps: [],
      faqs: [
        {
          tanya: 'Mengapa tombol Presensi Masuk tidak dapat diklik atau GPS bertuliskan "Di Luar Radius"?',
          jawab: 'Hal ini terjadi jika koordinat GPS perangkat Anda berada lebih jauh dari radius toleransi kantor kalurahan (misal 50–100 meter). Silakan mendekat ke area kantor kalurahan, pastikan GPS HP akurasi tinggi aktif, lalu tekan tombol "Refresh GPS".',
        },
        {
          tanya: 'Bagaimana jika browser memblokir izin lokasi (GPS)?',
          jawab: 'Buka pengaturan peramban (Chrome/Safari) > klik icon gembok atau Pengaturan Situs di sebelah bilah alamat URL > pilih "Izin Lokasi" > ubah menjadi "Izinkan" (Allow), kemudian muat ulang (refresh) halaman.',
        },
        {
          tanya: 'Apakah jam pulang saya akan bergeser jika saya datang terlambat?',
          jawab: 'Ya, benar. Konsep sistem presensi berbasis pemenuhan jam kerja wajib 495 menit. Jika Anda datang telat M menit (walau masih dalam toleransi), target jam pulang digeser mundur M menit agar waktu kerja Anda genap 100%.',
        },
        {
          tanya: 'Bagaimana jika saya harus melakukan dinas luar / tugas lapangan seharian?',
          jawab: 'Pilih opsi lokasi tugas "Dinas Luar" atau lengkapi dengan nomor surat tugas / surat keterangan (Suket) pada saat absen, serta catat aktifitas pelaksanaan dinas luar pada menu Log Kegiatan Harian.',
        },
        {
          tanya: 'Apakah hari libur nasional atau akhir pekan memotong tunjangan kehadiran?',
          jawab: 'Tidak. Sabtu, Minggu, dan tanggal yang terdaftar pada Hari Libur Nasional secara otomatis dikecualikan dari hari kerja efektif, sehingga tidak akan memotong persentase kinerja.',
        },
      ],
    },
  ];

  const filteredGuides = guides.filter((g) => {
    const matchCat = activeCategory === 'all' || g.category === activeCategory;
    const matchSearch =
      searchQuery.trim() === '' ||
      g.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      g.subtitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
      g.steps.some((s) => s.judul.toLowerCase().includes(searchQuery.toLowerCase()) || s.deskripsi.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (g.faqs && g.faqs.some((f) => f.tanya.toLowerCase().includes(searchQuery.toLowerCase()) || f.jawab.toLowerCase().includes(searchQuery.toLowerCase())));
    return matchCat && matchSearch;
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* 1. Header Banner Panduan (Gaya E-Kinerja BKN) */}
      <div
        className="glass-card-static animate-slide-up"
        style={{
          padding: '24px 28px',
          background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
          border: '1px solid #eaedf2',
          borderRadius: '16px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '18px',
          boxShadow: '0 2px 6px rgba(0,0,0,0.03)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div
            style={{
              width: '52px',
              height: '52px',
              borderRadius: '14px',
              background: 'linear-gradient(135deg, #4361ee 0%, #3a0ca3 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ffffff',
              flexShrink: 0,
              boxShadow: '0 4px 10px rgba(67, 97, 238, 0.25)',
            }}
          >
            <IconBook size={26} color="#ffffff" />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <h1 style={{ fontSize: '20px', fontWeight: '800', color: '#0f172a', letterSpacing: '-0.02em' }}>
                Buku Panduan Pegawai / Pamong
              </h1>
              <span
                style={{
                  background: '#eff6ff',
                  color: '#4361ee',
                  border: '1px solid #bfdbfe',
                  fontSize: '11px',
                  fontWeight: '700',
                  padding: '2px 10px',
                  borderRadius: '9999px',
                }}
              >
                Pegawai / Pamong Kalurahan
              </span>
            </div>
            <p style={{ color: '#64748b', fontSize: '13px', marginTop: '4px' }}>
              Pedoman teknis operasional sistem presensi GPS, perekaman kegiatan, monitoring kedisiplinan, dan pelaporan kinerja bagi seluruh pamong/pegawai.
            </p>
          </div>
        </div>

        <Link
          href="/dashboard"
          className="btn-outline"
          style={{
            fontSize: '12px',
            padding: '8px 16px',
            borderRadius: '8px',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            fontWeight: '600',
          }}
        >
          <span>← Kembali ke Beranda</span>
        </Link>
      </div>

      {/* 2. Petunjuk Utama Box (Style Image 2 E-Kinerja BKN) */}
      <div className="petunjuk-panel">
        <h4 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <IconInfo size={18} color="#0284c7" />
          Petunjuk Penting bagi Pamong / Pegawai:
        </h4>
        <ul>
          <li>
            <b>Presensi Harian:</b> Wajib dilakukan setiap hari kerja Senin–Jumat langsung dari lokasi kantor kalurahan yang terverifikasi radius GPS.
          </li>
          <li>
            <b>Durasi Kerja:</b> Setiap pamong wajib memenuhi durasi kerja <b>495 menit (8 jam 15 menit)</b> per hari untuk mendapatkan persentase kehadiran 100%.
          </li>
          <li>
            <b>Pencatatan Kinerja:</b> Input seluruh uraian pekerjaan harian pada modul <b>Log Kegiatan Harian</b> sebagai lampiran verifikasi pencairan tunjangan kinerja.
          </li>
          <li>
            <b>Kedisiplinan:</b> Hindari keterlambatan dan pulang mendahului agar akumulasi menit tidak melampaui batas toleransi <b>1.350 menit/tahun</b> (Standar PP No. 94/2021).
          </li>
        </ul>
      </div>

      {/* 3. Search & Kategori Tab Bar */}
      <div
        className="glass-card-static"
        style={{
          padding: '14px 18px',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
        }}
      >
        {/* Search Input */}
        <div>
          <input
            type="text"
            className="input-field"
            placeholder="🔍 Cari panduan (contoh: cara absen, jam pulang, toleransi, hukdis, foto kegiatan)..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ fontSize: '13px', padding: '10px 14px' }}
          />
        </div>

        {/* Categories Badges */}
        <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '4px' }}>
          {CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              style={{
                padding: '6px 14px',
                borderRadius: '8px',
                fontSize: '12px',
                fontWeight: activeCategory === cat.id ? '700' : '600',
                border: activeCategory === cat.id ? '1px solid #4361ee' : '1px solid #e2e8f0',
                background: activeCategory === cat.id ? '#4361ee' : '#ffffff',
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

      {/* 4. Daftar Panduan Berdasarkan Kategori */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
        {filteredGuides.length === 0 ? (
          <div
            className="glass-card-static"
            style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}
          >
            <p style={{ fontSize: '15px', fontWeight: '600' }}>Tidak ada panduan yang cocok dengan kata kunci Anda.</p>
            <button
              onClick={() => {
                setSearchQuery('');
                setActiveCategory('all');
              }}
              className="btn-outline"
              style={{ marginTop: '12px', fontSize: '12px' }}
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
                  padding: '24px',
                  background: '#ffffff',
                  border: '1px solid #eaedf2',
                  borderRadius: '16px',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
                }}
              >
                {/* Header Bab Panduan */}
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px', marginBottom: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div
                      style={{
                        width: '40px',
                        height: '40px',
                        borderRadius: '10px',
                        background: '#eff6ff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#4361ee',
                        flexShrink: 0,
                      }}
                    >
                      <IconComp size={22} color="#4361ee" />
                    </div>
                    <div>
                      <h3 style={{ fontSize: '16px', fontWeight: '800', color: '#0f172a' }}>
                        {guide.title}
                      </h3>
                      <p style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>
                        {guide.subtitle}
                      </p>
                    </div>
                  </div>
                  <span
                    style={{
                      fontSize: '11px',
                      fontWeight: '700',
                      padding: '4px 10px',
                      borderRadius: '9999px',
                      background: '#f8fafc',
                      color: '#475569',
                      border: '1px solid #e2e8f0',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {guide.badge}
                  </span>
                </div>

                {/* Steps List */}
                {guide.steps.length > 0 && (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '14px', marginBottom: '16px' }}>
                    {guide.steps.map((step, idx) => (
                      <div
                        key={idx}
                        style={{
                          background: '#f8fafc',
                          border: '1px solid #eaedf2',
                          borderRadius: '12px',
                          padding: '16px',
                          display: 'flex',
                          flexDirection: 'column',
                          justifyContent: 'space-between',
                          gap: '8px',
                        }}
                      >
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                            <span
                              style={{
                                width: '26px',
                                height: '26px',
                                borderRadius: '6px',
                                background: '#4361ee',
                                color: '#ffffff',
                                fontSize: '11px',
                                fontWeight: '800',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                              }}
                            >
                              {step.nomor}
                            </span>
                            <span style={{ fontSize: '13px', fontWeight: '700', color: '#0f172a' }}>
                              {step.judul}
                            </span>
                          </div>
                          <p style={{ fontSize: '12px', color: '#475569', lineHeight: '1.5' }}>
                            {step.deskripsi}
                          </p>
                        </div>
                        {step.tips && (
                          <div
                            style={{
                              marginTop: '6px',
                              padding: '8px 10px',
                              borderRadius: '6px',
                              background: '#eff6ff',
                              borderLeft: '3px solid #4361ee',
                              fontSize: '11px',
                              color: '#1e40af',
                              lineHeight: '1.4',
                            }}
                          >
                            💡 <b>Tips:</b> {step.tips}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* Ketentuan Khusus Box */}
                {guide.ketentuan && guide.ketentuan.length > 0 && (
                  <div
                    style={{
                      padding: '14px 18px',
                      borderRadius: '10px',
                      background: '#f0fdf4',
                      border: '1px solid #bbf7d0',
                      marginBottom: '10px',
                    }}
                  >
                    <div style={{ fontSize: '12px', fontWeight: '700', color: '#166534', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <IconCheckCircle size={15} color="#166534" />
                      Ketentuan & Aturan yang Berlaku:
                    </div>
                    <ul style={{ paddingLeft: '20px', margin: 0, fontSize: '12px', color: '#15803d', lineHeight: '1.6' }}>
                      {guide.ketentuan.map((k, i) => (
                        <li key={i}>{k}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* FAQ List jika ada */}
                {guide.faqs && guide.faqs.length > 0 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '10px' }}>
                    {guide.faqs.map((f, fIdx) => {
                      const isOpen = expandedFaq === fIdx;
                      return (
                        <div
                          key={fIdx}
                          style={{
                            border: '1px solid #eaedf2',
                            borderRadius: '10px',
                            background: isOpen ? '#f8fafc' : '#ffffff',
                            overflow: 'hidden',
                            transition: 'all 0.15s ease',
                          }}
                        >
                          <button
                            onClick={() => setExpandedFaq(isOpen ? null : fIdx)}
                            style={{
                              width: '100%',
                              padding: '14px 16px',
                              background: 'transparent',
                              border: 'none',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              cursor: 'pointer',
                              textAlign: 'left',
                              gap: '10px',
                            }}
                          >
                            <span style={{ fontSize: '13px', fontWeight: '700', color: '#0f172a' }}>
                              ❓ {f.tanya}
                            </span>
                            <span
                              style={{
                                transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                                transition: 'transform 0.2s ease',
                                color: '#64748b',
                              }}
                            >
                              <IconChevronDown size={16} />
                            </span>
                          </button>
                          {isOpen && (
                            <div
                              style={{
                                padding: '0 16px 14px 16px',
                                fontSize: '12px',
                                color: '#475569',
                                lineHeight: '1.6',
                                borderTop: '1px solid #f1f5f9',
                                paddingTop: '10px',
                              }}
                            >
                              {f.jawab}
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

      {/* Footer Hak Cipta & Info Instansi */}
      <div style={{ textAlign: 'center', padding: '16px 0', color: '#94a3b8', fontSize: '12px' }}>
        2026 © Pemerintah Kalurahan • Sistem Informasi Pamong E-Kinerja
      </div>
    </div>
  );
}
