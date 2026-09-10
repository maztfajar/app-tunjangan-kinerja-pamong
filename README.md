# Aplikasi Presensi & Tunjangan Kinerja Pamong

Sistem Informasi Manajemen Presensi Berbasis Lokasi (Geolocation), Biometrik (WebAuthn), dan Perhitungan Tunjangan Kinerja Pamong / Perangkat Desa berbasis Next.js 15 & Prisma ORM.

---

## 🌟 Fitur Utama

- **Presensi Geolocation & Biometrik (WebAuthn / Sidik Jari)**: Presensi masuk & pulang dengan validasi radius GPS kantor dan verifikasi biometrik perangkat.
- **Manajemen Kinerja & Tugas Harian**: Pengisian laporan output kinerja harian, verifikasi atasan/admin, dan monitoring capaian bulanan.
- **Perhitungan Tunjangan Kinerja Otomatis**: Rumus otomatis pemotongan tunjangan berdasarkan keterlambatan, pulang cepat, atau ketidakhadiran sesuai regulasi.
- **Manajemen Administrasi Lengkap**:
  - Master Jabatan & Besaran Tunjangan
  - Master Pegawai & Penugasan
  - Jadwal Jam Kerja Khusus (Hari Kerja & Jam Ramadan)
  - Kalender Libur Nasional & Cuti Bersama (sinkronisasi API otomatis)
  - Pengajuan Surat Keterangan (Sakit, Izin, Cuti, Tugas Luar)
- **Rekapitulasi & Ekspor Laporan**: Rekap bulanan per pegawai atau seluruh instansi, siap cetak / PDF.
- **Multi-Role Access Control**:
  - `Super Administrator`: Manajemen database, reset data, pengaturan instansi & koordinat.
  - `Admin`: Verifikasi laporan kinerja, pengelolaan pegawai, persetujuan suket, rekap absensi.
  - `Pegawai / Pamong`: Presensi, input agenda kegiatan, laporan kinerja, dan riwayat tunjangan.

---

## 🚀 Teknologi yang Digunakan

- **Framework**: [Next.js](https://nextjs.org/) (App Router, React 19, TypeScript)
- **Database ORM**: [Prisma ORM](https://www.prisma.io/)
- **Database Engine**: PostgreSQL (Dukungan Supabase, Neon, cPanel Hosting, atau Localhost)
- **Autentikasi**: JWT (JSON Web Token) dengan HttpOnly Cookies & WebAuthn / SimpleWebAuthn
- **Peta & Geolokasi**: Leaflet & OpenStreetMap
- **Keamanan Tambahan**: Cloudflare Turnstile (Anti-Bot) & In-Memory Rate Limiting

---

## 🛠️ Panduan Instalasi Lokal

### 1. Klon Repositori
```bash
git clone git@github.com:maztfajar/app-tunjangan-kinerja-pamong.git
cd app-tunjangan-kinerja-pamong
```

### 2. Pasang Dependensi
```bash
npm install
```

### 3. Konfigurasi Lingkungan (.env)
Salin berkas template `.env.example`:
```bash
cp .env.example .env
```
Sesuaikan konfigurasi di dalam file `.env`:
- `DATABASE_URL`: URL koneksi database PostgreSQL Anda.
- `JWT_SECRET`: Kunci rahasia minimal 32 karakter (buat via `openssl rand -base64 32`).
- `SUPERADMIN_USER` & `SUPERADMIN_PASS`: Kredensial untuk akses Superadmin.

### 4. Setup Database & Migrasi
Jalankan migrasi Prisma untuk membuat tabel di database:
```bash
npx prisma db push
# atau jalankan wizard interaktif
node setup-db.js
```

### 5. Jalankan Server Development
```bash
npm run dev
```
Buka [http://localhost:3000](http://localhost:3000) di peramban Anda.

---

## 📦 Panduan Deployment ke Hosting / cPanel

Untuk panduan deploy ke web hosting cPanel atau server VPS mandiri, silakan baca dokumentasi khusus yang disertakan:
- [PANDUAN_CPANEL.md](PANDUAN_CPANEL.md)
- [PANDUAN_HOSTING.md](PANDUAN_HOSTING.md)

Tersedia juga script otomatis pembuatan paket rilis zip untuk cPanel:
```bash
bash pack-cpanel.sh
```

---

## 📄 Lisensi
Hak Cipta © 2026. Dikembangkan untuk Pemerintah Kalurahan / Desa.
