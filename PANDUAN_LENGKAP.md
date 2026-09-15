# PANDUAN LENGKAP PENGGUNAAN, INSTALASI & PEMELIHARAAN SISTEM
## Aplikasi Tunjangan Kinerja & Presensi Pamong Kalurahan / Kapanewon
**Dokumen Resmi Panduan Teknis & Operasional Sistem**

---

## DAFTAR ISI

1. [Spesifikasi & Arsitektur Sistem](#1-spesifikasi--arsitektur-sistem)
2. [Konfigurasi File Environment (.env)](#2-konfigurasi-file-environment-env)
3. [Manajemen Lisensi & Serial Number (Fitur PRO)](#3-manajemen-lisensi--serial-number-fitur-pro)
4. [Panduan Instalasi di VPS Linux (Ubuntu/Debian)](#4-panduan-instalasi-di-vps-linux-ubuntudebian)
5. [Panduan Instalasi di Web Hosting (cPanel)](#5-panduan-instalasi-di-web-hosting-cpanel)
6. [Konfigurasi Database (SQLite Bawaan vs PostgreSQL Cloud)](#6-konfigurasi-database-sqlite-bawaan-vs-postgresql-cloud)
7. [Panduan Migrasi Database dari SQLite ke Cloud (Sumopod / Supabase)](#7-panduan-migrasi-database-dari-sqlite-ke-cloud-sumopod--supabase)
8. [Panduan Auto-Backup Google Drive (Fitur PRO)](#8-panduan-auto-backup-google-drive-fitur-pro)
9. [Panduan Restart, Pemeliharaan & Troubleshooting](#9-panduan-restart-pemeliharaan--troubleshooting)

---

## 1. SPESIFIKASI & ARSITEKTUR SISTEM

### A. Teknologi yang Digunakan
- **Framework Utama**: Next.js 16 (App Router) & React 19
- **Bahasa Pemrograman**: TypeScript 5
- **ORM & Skema Database**: Prisma ORM v6
- **Dukungan Database Ganda (Hybrid)**:
  - **SQLite Bawaan**: Langsung aktif tanpa konfigurasi database server luar (`storage/database.sqlite`).
  - **PostgreSQL Cloud**: Mendukung Supabase, Sumopod (Sumobase), Neon, Railway, atau PostgreSQL lokal VPS.
- **Autentikasi**: JSON Web Token (JWT) dengan Cookie HttpOnly aman & Enkripsi Kata Sandi Bcrypt.
- **Fitur Keamanan**: Cloudflare Turnstile Anti-bot Protection, Hak Akses Berjenjang (Superadmin, Admin Instansi, Pegawai).

### B. Kebutuhan Server Minimum
- **Node.js**: Versi 18.18.0 atau 20 LTS ke atas.
- **RAM**: Minimal 1 GB (Direkomendasikan 2 GB).
- **CPU**: 1 vCPU atau lebih.
- **Penyimpanan**: Minimal 5 GB SSD.
- **Koneksi Jaringan**: Wajib memiliki Domain dan Sertifikat SSL (HTTPS) agar fitur GPS Geofencing dan Biometrik WebAuthn di smartphone pegawai dapat berjalan.

---

## 2. KONFIGURASI FILE ENVIRONMENT (.ENV)

File `.env` terletak di root direktori aplikasi. Berikut adalah penjelasan menyeluruh setiap variabel:

```env
# ==============================================================================
# 1. DATABASE (PILIH SALAH SATU)
# ==============================================================================
# OPSI A: SQLite Bawaan (Biarkan kosong, sistem otomatis membuat file storage/database.sqlite)
DATABASE_URL=""

# OPSI B: PostgreSQL Cloud (Sumopod / Supabase / Neon / VPS PostgreSQL)
# Contoh Sumopod (Gunakan Tab Direct Connection Port 5432):
# DATABASE_URL="postgresql://uazuSleyutH953G5A.jkt1_003:b56aabd50b51c19d747f830f@pgsql-dbas-jkt1-003.sumobase.my.id:5432/db658b2889efac70aa"

# ==============================================================================
# 2. KEAMANAN & AUTENTIKASI (WAJIB DIISI)
# ==============================================================================
# Kunci enkripsi token login (minimal 32 karakter acak yang kuat)
JWT_SECRET="isi-dengan-kombinasi-huruf-angka-acak-minimal-32-karakter"

# Akun Super Administrator (Root) Utama
SUPERADMIN_USER="root"
SUPERADMIN_PASS="root12345"

# ==============================================================================
# 3. PENGATURAN INSTANSI & KOORDINAT KANTOR
# ==============================================================================
NEXT_PUBLIC_APP_NAME="Absensi & Tunjangan Kinerja Pamong"
NEXT_PUBLIC_DEFAULT_LAT="-7.841817942758396"
NEXT_PUBLIC_DEFAULT_LNG="110.1685866543569"

JAM_MASUK="07:30"
JAM_PULANG="15:45"

# ==============================================================================
# 4. CLOUDFLARE TURNSTILE (ANTI-BOT)
# ==============================================================================
# Jika dikosongkan, sistem otomatis menggunakan Smart Fallback
NEXT_PUBLIC_TURNSTILE_SITE_KEY="0x4AAAAAAEw9VEEW3AyWqzvS"
TURNSTILE_SECRET_KEY="0x4AAAAAAEw9VB6jHfXMLEOFU4OwQ8PX4CY"
```

---

## 3. MANAJEMEN LISENSI & SERIAL NUMBER (FITUR PRO)

Aplikasi memiliki sistem lisensi berjenjang untuk membedakan mode **Standard** dan mode **PRO**.

### A. Perbandingan Fitur Lisensi

| Fitur Aplikasi | Versi Standar | Versi PRO |
|---|:---:|:---:|
| Presensi Online & Foto Selfie | ✅ Ya | ✅ Ya |
| Laporan Kinerja Harian & Bulanan | ✅ Ya | ✅ Ya |
| Rekapitulasi Tukin Otomatis | ✅ Ya | ✅ Ya |
| Ekspor Laporan Excel & PDF | ✅ Ya | ✅ Ya |
| **Backup Cloud Otomatis (Google Drive)** | ❌ Terkunci | ✅ **Aktif** |
| **Restore / Pemulihan Database Lengkap** | ❌ Terkunci | ✅ **Aktif** |
| **Presensi Sidik Jari (Biometrik WebAuthn)** | ❌ Terkunci | ✅ **Aktif** |
| **Geofencing GPS Multi-Radius Presisi** | ❌ Terkunci | ✅ **Aktif** |
| **Multi-Admin Instansi Tanpa Batas** | ❌ Terkunci | ✅ **Aktif** |

### B. Format Serial Number
Serial number lisensi resmi memiliki format standar:
```
TUKIN-PRO-XXXX-XXXX-XXXX
```
Contoh: `TUKIN-PRO-9842-7105-3381`

### C. Langkah Aktivasi Serial Number
1. Buka aplikasi di peramban web dan login dengan akun **Super Admin**.
2. Klik menu **Super Admin** di bilah navigasi samping, lalu pilih **Pengaturan Lisensi** (atau buka menu **Pengaturan Sistem**).
3. Pada kolom **Serial Number Lisensi**, masukkan serial number PRO Anda.
4. Klik tombol **Aktivasi Lisensi**.
5. Sistem akan memverifikasi integritas kunci dan status lisensi akan langsung berubah menjadi **PRO (Aktif)**. Seluruh fitur proteksi cadangan cloud, pemulihan, dan biometrik akan langsung terbuka seketika.

---

## 4. PANDUAN INSTALASI DI VPS LINUX (UBUNTU/DEBIAN)

Instalasi di VPS Linux merupakan metode yang sangat direkomendasikan untuk stabilitas 24/7 dan performa tinggi.

### Langkah 1: Persiapan Server VPS
1. Hubungkan terminal laptop Anda ke VPS via SSH:
   ```bash
   ssh root@ip-vps-anda
   ```
2. Pastikan paket Linux terbaru:
   ```bash
   sudo apt update && sudo apt upgrade -y
   ```

### Langkah 2: Upload File Aplikasi ke VPS
Anda dapat mengunggah folder aplikasi (tanpa menyertakan folder `node_modules` dan `.next`):
- Letakkan di direktori: `/opt/ekinerja` atau `/home/ekinerja`

### Langkah 3: Eksekusi Script Instalasi 1-Klik (`vps-install.sh`)
Aplikasi telah dilengkapi script instalasi otomatis yang mengurus instalasi Node.js, PM2, Prisma, build produksi, hingga daemon 24/7:
```bash
cd /opt/ekinerja
chmod +x vps-install.sh
bash vps-install.sh
```

**Apa saja yang dikerjakan secara otomatis oleh script ini?**
1. Memeriksa dan menginstal Node.js 20 LTS jika belum tersedia.
2. Memeriksa dan menginstal Process Manager **PM2**.
3. Memeriksa konfigurasi `.env`.
4. Menjalankan `npm ci` untuk menginstal seluruh dependensi.
5. Mensinkronkan skema database Prisma (PostgreSQL / SQLite).
6. Mengkompilasi build produksi Next.js (`npm run build`).
7. Mendaftarkan aplikasi ke daemon PM2 dengan nama `tukin-pamong`.
8. Memasang perintah startup otomatis agar aplikasi langsung hidup saat VPS reboot.
9. Memasang jadwal Cron Job harian pukul **00:00 WIB** untuk auto-backup Google Drive.

### Langkah 4: Konfigurasi Nginx Reverse Proxy & SSL HTTPS
Agar aplikasi dapat diakses publik melalui domain resmi (misal: `kinerja.desa.id`):

1. **Install Nginx**:
   ```bash
   sudo apt install -y nginx
   ```
2. **Buat file konfigurasi virtual host**:
   ```bash
   sudo nano /etc/nginx/sites-available/ekinerja
   ```
   Isi dengan konfigurasi berikut (ganti domain dengan domain Anda):
   ```nginx
   server {
       listen 80;
       server_name kinerja.desa.id www.kinerja.desa.id;

       client_max_body_size 50M;

       location / {
           proxy_pass http://127.0.0.1:3000;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_set_header X-Real-IP $remote_addr;
           proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
           proxy_set_header X-Forwarded-Proto $scheme;
           proxy_cache_bypass $http_upgrade;
       }
   }
   ```
3. **Aktifkan konfigurasi & restart Nginx**:
   ```bash
   sudo ln -s /etc/nginx/sites-available/ekinerja /etc/nginx/sites-enabled/
   sudo nginx -t
   sudo systemctl restart nginx
   ```
4. **Pasang SSL HTTPS Gratis (Certbot)**:
   > ⚠️ **Penting**: Fitur GPS Presensi dan Biometrik smartphone WAJIB membutuhkan koneksi HTTPS.
   ```bash
   sudo apt install -y certbot python3-certbot-nginx
   sudo certbot --nginx -d kinerja.desa.id -d www.kinerja.desa.id
   ```

---

## 5. PANDUAN INSTALASI DI WEB HOSTING (CPANEL)

Jika instansi Anda menggunakan Web Hosting cPanel dengan fitur CloudLinux / Node.js Selector:

### Langkah 1: Siapkan Arsip ZIP Aplikasi
1. Di komputer lokal Anda, kompres seluruh folder aplikasi ke format `.zip`.
   *(PENTING: Jangan sertakan folder `node_modules` dan folder `.next` agar ukuran file kecil).*

### Langkah 2: Upload & Ekstrak di cPanel
1. Buka dashboard cPanel hosting Anda.
2. Masuk ke **File Manager**.
3. Buat folder baru di luar `public_html` (misal: `/home/usercpanel/app-ekinerja`).
4. Upload file `.zip` tadi ke folder tersebut lalu klik **Extract**.

### Langkah 3: Setup Node.js Application di cPanel
1. Di cPanel, cari menu **Setup Node.js App**.
2. Klik tombol **Create Application**.
3. Isi kolom konfigurasi sebagai berikut:
   - **Node.js version**: Pilih versi **18.x** atau **20.x**.
   - **Application mode**: Pilih **Production**.
   - **Application root**: Isi nama folder tempat ekstrak tadi (misal: `app-ekinerja`).
   - **Application URL**: Pilih subdomain atau domain utama (misal: `kinerja.desa.id`).
   - **Application startup file**: Ketik `server.js` (aplikasi sudah menyediakan starter cPanel).
4. Klik tombol **Create**.

### Langkah 4: Install Dependensi & Build
1. Di halaman detail Node.js App cPanel, salin baris perintah *Enter to the virtual environment* (misal: `source /home/usercpanel/nodevenv/app-ekinerja/20/bin/activate && cd /home/usercpanel/app-ekinerja`).
2. Masuk ke menu **Terminal** di cPanel, tempel perintah tadi lalu tekan Enter.
3. Jalankan perintah instalasi dependensi dan build:
   ```bash
   npm install --omit=dev
   npm run build
   ```
4. Pastikan file `.env` sudah diisi dengan benar (menggunakan SQLite bawaan atau database luar).
5. Kembali ke menu **Setup Node.js App** di cPanel dan klik tombol **Restart**.
6. Aplikasi Anda siap diakses melalui web browser!

---

## 6. KONFIGURASI DATABASE (SQLITE VS POSTGRESQL CLOUD)

### Opsi 1: SQLite Bawaan (Paling Mudah, Nol Konfigurasi Server)
- **Cara Mengaktifkan**: Cukup kosongkan variabel `DATABASE_URL=""` pada file `.env`.
- **Lokasi Penyimpanan**: Database akan otomatis dibuat di file `storage/database.sqlite`.
- **Keunggulan**: Sangat ringan, tidak membutuhkan langganan database server, sangat cocok untuk instansi kalurahan skala kecil-menengah.

### Opsi 2: PostgreSQL Cloud (Sumopod / Supabase / Neon)
- **Cara Mengaktifkan**: Masukkan URL koneksi ke variabel `DATABASE_URL` di file `.env`.
- **Rekomendasi Format URL Khusus Sumopod (Sesuai Dashboard Sumopod)**:
  - Di dashboard Sumopod, pilih tab **Direct Connection** (Port **5432**).
  - Contoh:
    ```env
    DATABASE_URL="postgresql://uazuSleyutH953G5A.jkt1_003:b56aabd50b51c19d747f830f@pgsql-dbas-jkt1-003.sumobase.my.id:5432/db658b2889efac70aa"
    ```
  - *Catatan*: Jika terpaksa menggunakan tab *Transaction Pooler* (Port **6432**), tambahkan parameter `?pgbouncer=true` di akhir URL.

### Cara Pembuatan & Sinkronisasi Struktur Tabel Baru:
Jika Anda baru pertama kali menghubungkan database baru, jalankan perintah sinkronisasi tabel berikut:
- **Untuk PostgreSQL (Sumopod/Supabase)**:
  ```bash
  npx prisma db push
  ```
- **Untuk SQLite Bawaan**:
  ```bash
  SQLITE_DATABASE_URL="file:./storage/database.sqlite" npx prisma db push --schema=prisma/schema.sqlite.prisma
  ```
- **Atau gunakan Wizard Interaktif Otomatis**:
  ```bash
  node setup-db.js
  ```

---

## 7. PANDUAN MIGRASI DATABASE DARI SQLITE KE CLOUD (SUMOPOD / SUPABASE)

Jika pada awalnya Anda memakai SQLite bawaan, kemudian setelah beberapa waktu ingin beralih menggunakan server database PostgreSQL luar (seperti Sumopod atau Supabase), **seluruh data lama dapat dipindahkan secara utuh tanpa ada yang hilang**:

```
 ┌─────────────────────────┐       ┌────────────────────────┐       ┌────────────────────────┐
 │ 1. SQLite Masih Aktif   │       │ 2. Pindah Koneksi .env │       │ 3. Database Cloud Aktif│
 │ Superadmin -> Database  │ ────> │ Isi URL Sumopod        │ ────> │ Superadmin -> Database │
 │ Klik: Unduh Backup JSON │       │ Jalankan prisma db push│       │ Klik: Pulihkan Database│
 └─────────────────────────┘       └────────────────────────┘       └────────────────────────┘
```

### Langkah Demi Langkah:

#### Langkah 1: Unduh File Cadangan Lengkap (Backup JSON)
1. Buka aplikasi di web browser saat masih berjalan di SQLite.
2. Login dengan akun **Super Admin**.
3. Buka menu **Super Admin** → **Kelola Database** (`/superadmin/database`).
4. Pada kartu **Export & Backup Database**, klik tombol **"📥 Unduh Backup (.json)"**.
5. File `.json` akan tersimpan di komputer Anda. File ini memuat data pegawai, jabatan, presensi, koordinat, laporan kegiatan, biometrik, hingga setting aplikasi.

#### Langkah 2: Ubah URL Database di File `.env`
1. Buka file `.env` di VPS atau Hosting Anda.
2. Ubah baris `DATABASE_URL` menjadi Connection String dari Sumopod / Supabase:
   ```env
   DATABASE_URL="postgresql://uazuSleyutH953G5A.jkt1_003:b56aabd50b51c19d747f830f@pgsql-dbas-jkt1-003.sumobase.my.id:5432/db658b2889efac70aa"
   ```

#### Langkah 3: Bangun Struktur Tabel di Server Sumopod
Buka terminal dan jalankan satu perintah berikut:
```bash
npx prisma db push
```
*(Perintah ini akan langsung membentuk seluruh tabel yang diperlukan di database Sumopod secara otomatis).*

#### Langkah 4: Restart Aplikasi
- Di VPS (PM2):
  ```bash
  pm2 restart tukin-pamong
  ```
- Di cPanel:
  Klik tombol **Restart** di menu Setup Node.js App.

#### Langkah 5: Pulihkan Seluruh Data ke Database Cloud
1. Buka kembali aplikasi web di browser.
2. Login sebagai **Super Admin**.
3. Masuk ke menu **Super Admin** → **Kelola Database**.
4. Di kartu **Restore / Pemulihan Database**, klik **Pilih File Backup (.json)** dan pilih file yang diunduh pada Langkah 1 tadi.
5. Klik tombol **"Pulihkan Database"**.
6. **Selesai!** Seluruh data pegawai, presensi, dan aktivitas kini 100% aktif di database cloud Sumopod.

---

## 8. PANDUAN AUTO-BACKUP GOOGLE DRIVE (FITUR PRO)

Fitur ini secara otomatis mencadangkan seluruh data setiap malam pukul **00:00 WIB** ke akun Google Drive Anda dalam format JSON dan mempertahankan 7 file backup terakhir (file ke-8 otomatis dihapus agar hemat ruang).

### A. Mendapatkan Kredensial OAuth2 Google
1. Kunjungi [Google Cloud Console](https://console.cloud.google.com/).
2. Buat Project baru (misal: `Backup E-Kinerja`).
3. Buka **APIs & Services** → **Library** → Cari **Google Drive API** → Klik **Enable**.
4. Buka **APIs & Services** → **Credentials** → Klik **Create Credentials** → Pilih **OAuth client ID**.
   - Application Type: **Web application**.
   - Authorized redirect URIs: Tambahkan `https://developers.google.com/oauthplayground`
5. Salin dan simpan **Client ID** dan **Client Secret**.

### B. Mendapatkan Refresh Token
1. Buka [OAuth 2.0 Playground](https://developers.google.com/oauthplayground/).
2. Klik ikon gerigi ⚙️ (Settings) di pojok kanan atas → Centang **Use your own OAuth credentials**.
3. Masukkan *Client ID* dan *Client Secret* Anda → Klik Close.
4. Di panel kiri, scroll ke **Google Drive API v3** → Centang scope `https://www.googleapis.com/auth/drive`.
5. Klik **Authorize APIs** → Login dengan akun Google Drive target.
6. Klik **Exchange authorization code for tokens**.
7. Salin nilai **Refresh Token**.

### C. Menghubungkan Google Drive di Aplikasi Web
1. Login sebagai **Super Admin** di aplikasi.
2. Masuk ke **Kelola Database** → Pada kartu Google Drive, klik **⚙️ Pengaturan Google Drive & Cron**.
3. Masukkan:
   - Client ID
   - Client Secret
   - Refresh Token
4. **Pemilihan Folder Tujuan (Interaktif)**:
   - Klik tombol **📂 Pilih Folder**.
   - Sistem akan otomatis mengambil dan menampilkan daftar folder di Google Drive Anda.
   - Anda dapat mencari nama folder yang diinginkan atau memilih **🏠 My Drive (Root)**.
5. Klik **🔍 Uji Koneksi Google** untuk memastikan status sukses.
6. Klik **Simpan Pengaturan**.
7. Anda dapat menekan **☁️ Backup Sekarang ke Drive** untuk langsung mencoba backup perdana.

---

## 9. PANDUAN RESTART, PEMELIHARAAN & TROUBLESHOOTING

### A. Cara Melakukan Restart Aplikasi

#### 1. Jika di Lingkungan VPS (Menggunakan PM2):
Aplikasi dijalankan 24 jam via PM2. Untuk mengelola proses:
```bash
# Melakukan Restart aplikasi:
pm2 restart tukin-pamong

# Melihat status aplikasi (CPU, RAM, Uptime):
pm2 status

# Melihat log aktivitas sistem secara langsung (live log):
pm2 logs tukin-pamong

# Melihat 100 baris log terakhir:
pm2 logs tukin-pamong --lines 100

# Menghentikan sementara aplikasi:
pm2 stop tukin-pamong

# Menyalakan kembali aplikasi:
pm2 start tukin-pamong
```

#### 2. Jika di Lingkungan cPanel Hosting:
1. Buka cPanel → Masuk ke menu **Setup Node.js App**.
2. Cari nama aplikasi Anda di daftar.
3. Klik tombol aksi **Restart** (ikon panah melingkar).

#### 3. Jika Dijalankan Manual via Terminal:
- Tekan tombol **Ctrl + C** untuk menghentikan aplikasi.
- Jalankan kembali dengan:
  ```bash
  bash start.sh          # Mode Dev
  # atau
  bash start.sh --prod   # Mode Produksi
  ```

---

### B. Pemeliharaan dan Update Aplikasi ke Versi Baru
Jika terdapat update kode dari pengembang:
1. Masuk ke direktori aplikasi di VPS:
   ```bash
   cd /opt/ekinerja
   ```
2. Upload file kode baru (tanpa menimpa file `.env` dan `storage/`).
3. Jalankan pembaruan dependensi dan build:
   ```bash
   npm install --omit=dev
   npm run build
   ```
4. Reload aplikasi tanpa downtime (*Zero-downtime reload*):
   ```bash
   pm2 reload tukin-pamong
   ```

---

### C. Troubleshooting Masalah Umum

#### 1. Masalah: "Port 3000 already in use" (Port Bentrok)
- **Penyebab**: Terdapat proses lama yang masih mengunci port 3000.
- **Solusi**:
  ```bash
  sudo lsof -i :3000
  # Matikan proses yang bentrok:
  sudo kill -9 <PID_PROSES>
  pm2 restart tukin-pamong
  ```

#### 2. Masalah: "Permission denied on storage/database.sqlite"
- **Penyebab**: Izin akses folder `storage/` tidak dapat ditulis oleh user Node.js.
- **Solusi**:
  ```bash
  chmod -R 775 storage/
  ```

#### 3. Masalah: GPS Presensi atau Biometrik Tidak Muncul di HP Pegawai
- **Penyebab**: Browser modern (Chrome, Safari) memblokir fitur sensor GPS dan WebAuthn jika situs tidak berjalan di protokol aman HTTPS.
- **Solusi**: Pastikan domain sudah terpasang sertifikat SSL aktif (HTTPS). Jika di VPS, jalankan `sudo certbot --nginx`.

#### 4. Masalah: Koneksi Database Cloud Time Out
- **Penyebab**: Provider database membatasi IP atau URL koneksi salah.
- **Solusi**:
  - Pastikan IP VPS tidak diblokir di whitelist firewall database cloud Anda (setel ke `0.0.0.0/0` jika diizinkan).
  - Gunakan port **5432 (Direct Connection)** bukan port pooler 6432.

---
**Pemerintah Kapanewon Pengasih — Sistem Manajemen Kinerja & Absensi Pamong**
*Dokumen ini diterbitkan sebagai standar operasional prosedur teknis resmi aplikasi.*
