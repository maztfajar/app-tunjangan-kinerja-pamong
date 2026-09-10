# Panduan Deployment & Hosting Aplikasi Tunjangan Kinerja Pamong

Panduan ini berisi instruksi lengkap langkah demi langkah untuk meng-hosting aplikasi web **Tunjangan Kinerja Pamong** pada server **Node.js** (cPanel Shared Hosting, VPS Linux, atau Cloud Server).

---

## 📋 Ikhtisar Pilihan Database

Aplikasi ini menggunakan ORM Prisma dengan mesin PostgreSQL. Anda memiliki **2 opsi database** yang didukung penuh:

| Kriteria | Opsi 1: Database Lokal di Web Hosting | Opsi 2: Database Cloud Supabase |
| :--- | :--- | :--- |
| **Lokasi** | Server Hosting yang sama (localhost) | Cloud Supabase (*supabase.com*) |
| **Kebutuhan Server** | Hosting harus mendukung PostgreSQL | Hosting tipe apa saja (hanya perlu Node.js) |
| **Beban RAM Hosting** | Sedikit lebih besar (menjalankan DB lokal) | Sangat ringan (DB di-offload ke Cloud) |
| **Koneksi (.env)** | `postgresql://user:pass@localhost:5432/dbname?schema=public` | `postgresql://postgres.ref:pass@aws-0-pooler...:5432/postgres?sslmode=require` |
| **Pembuatan Tabel** | **100% Otomatis** saat server boot | **100% Otomatis** saat server boot |

---

## 🛠️ Wizard Konfigurasi Otomatis (`setup-db.js`)

Aplikasi dilengkapi wizard interaktif berbahasa Indonesia untuk mempermudah setup database:

```bash
# Jalankan via terminal di root project:
node setup-db.js
# atau
npm run db:setup
```

Wizard ini akan memandu Anda memilih opsi database, menguji koneksi secara langsung, menulis ke `.env`, dan **langsung membuat seluruh tabel database beserta akun default**.

---

## 🌐 Opsi 1: Database Lokal di Web Hosting (cPanel / VPS)

### A. Jika menggunakan cPanel Shared Hosting:
1. Buka cPanel Anda.
2. Masuk ke menu **PostgreSQL Databases** (atau **PostgreSQL Database Wizard**).
3. Buat database baru, contoh: `cpaneluser_absensi`.
4. Buat user database baru, contoh: `cpaneluser_tukin` dengan password yang kuat.
5. Hubungkan user ke database dengan mencentang **ALL PRIVILEGES**.
6. Atur `DATABASE_URL` di file `.env`:
   ```env
   DATABASE_URL="postgresql://cpaneluser_tukin:PasswordAnda@localhost:5432/cpaneluser_absensi?schema=public"
   ```

### B. Jika menggunakan VPS Linux (Ubuntu / Debian):
1. Install PostgreSQL:
   ```bash
   sudo apt update && sudo apt install -y postgresql postgresql-contrib
   ```
2. Buat database dan user:
   ```bash
   sudo -u postgres psql -c "CREATE USER tukin_user WITH PASSWORD 'PasswordKuat123';"
   sudo -u postgres psql -c "CREATE DATABASE absensi_db OWNER tukin_user;"
   ```
3. Atur `DATABASE_URL` di file `.env`:
   ```env
   DATABASE_URL="postgresql://tukin_user:PasswordKuat123@localhost:5432/absensi_db?schema=public"
   ```

---

## ☁️ Opsi 2: Database Cloud Supabase (Supabase.com)

Gunakan opsi ini jika web hosting Anda tidak menyediakan PostgreSQL, atau Anda ingin database terpisah di cloud gratis yang cepat dan andal.

### Langkah-langkah di Supabase:
1. Buka [https://supabase.com](https://supabase.com) dan buat akun / login.
2. Klik **New Project**:
   - Beri nama project (contoh: `tukin-pamong`).
   - Masukkan **Database Password** yang kuat (catat password ini!).
   - Pilih Region terdekat: **Singapore (ap-southeast-1)**.
3. Setelah project selesai dibuat (± 1 menit), buka menu:
   👉 **Project Settings** (ikon gear di pojok kiri bawah) -> **Database**.
4. Gulir ke bawah ke bagian **Connection string**, pilih tab **URI**, dan pilih mode **Session** (Port 5432):
   - Salin URI tersebut, contoh formatnya:
     ```text
     postgresql://postgres.xyzabcdefghijklm:[YOUR-PASSWORD]@aws-0-ap-southeast-1.pooler.supabase.com:5432/postgres
     ```
5. Ganti `[YOUR-PASSWORD]` dengan password database yang Anda buat di Langkah 2.
6. **PENTING**: Tambahkan `?sslmode=require` di akhir URI.
7. Masukkan ke file `.env` Anda:
   ```env
   DATABASE_URL="postgresql://postgres.xyzabcdefghijklm:PasswordSaya123@aws-0-ap-southeast-1.pooler.supabase.com:5432/postgres?sslmode=require"
   ```

> [!TIP]
> **Tips Karakter Password:**
> Jika password database Anda mengandung karakter `@`, gantilah dengan `%40` di dalam URL koneksi. Contoh: `p@ssword` ditulis menjadi `p%40ssword`.

---

## ⚡ Pembuatan Tabel Database Otomatis (Zero-Touch)

Anda **TIDAK PERLU** menjalankan file SQL secara manual via phpPgAdmin ataupun console PostgreSQL!

1. **Auto-Init di Server Startup**:
   Setiap kali aplikasi dijalankan (`server.js` di cPanel atau `npm start` di VPS), sistem secara otomatis:
   - Memeriksa koneksi database.
   - Mendeteksi apakah 17 tabel aplikasi sudah dibuat atau belum.
   - Menjalankan pembuatan tabel lengkap (`CREATE TABLE IF NOT EXISTS`, relasi, indeks, dan kolom baru).
   - Menyemai (seed) data awal akun default jika pengguna masih kosong.
2. **Diagnostik Status Tabel**:
   Untuk memeriksa kelengkapan tabel secara instan, jalankan:
   ```bash
   node check-db.js
   ```

---

## 🚀 Panduan Upload ke cPanel (Node.js Selector)

Aplikasi telah dilengkapi fitur pemaketan otomatis (**Next.js Standalone Packaging**) sehingga Anda **tidak perlu menjalankan `npm install` di hosting cPanel** (bebas dari error kehabisan kuota disk RAM / inode limit).

### 1. Buat Paket Standalone di Komputer Lokal:
Jalankan perintah berikut:
```bash
npm run cpanel:pack
# atau
bash pack-cpanel.sh --yes
```
Perintah ini akan membuat file zip siap upload: **`cpanel-deploy.zip`** (ukuran sangat hemat, sekitar ~140MB lengkap dengan node_modules internal).

### 2. Pengaturan di cPanel:
1. Masuk ke cPanel -> **Setup Node.js App** -> **Create Application**:
   - **Node.js version**: `20.x` (atau `18.x`)
   - **Application mode**: `Production`
   - **Application root**: `tukin-app` (nama folder Anda)
   - **Application URL**: Pilih domain atau subdomain Anda
   - **Application startup file**: `server.js` (atau `app.js`)
   - Klik **Create**.
2. Masuk ke **File Manager** cPanel:
   - Buka folder `tukin-app`.
   - Upload file **`cpanel-deploy.zip`**.
   - Klik kanan file zip -> **Extract**.
3. Buat file `.env` di dalam folder `tukin-app`:
   - Salin `.env.example` menjadi `.env`.
   - Isi `DATABASE_URL` (pilih Opsi 1 Lokal atau Opsi 2 Supabase).
   - Isi `JWT_SECRET` (string acak minimal 32 karakter).
   - Isi `SUPERADMIN_PASS`.
   - *(Catatan: Jangan menambahkan PORT=3000 pada .env cPanel)*.
4. Inisialisasi Otomatis:
   - Kembali ke **Setup Node.js App** -> Klik tombol **Restart**.
   - Buka domain Anda di browser! Tabel database dan data awal akan langsung siap secara otomatis.

---

## 🖥️ Panduan Deploy di VPS Linux (PM2)

Jika menggunakan VPS Linux:

```bash
# 1. Clone repository atau upload source code ke VPS:
git clone <repo_url> tukin-app && cd tukin-app

# 2. Setup konfigurasi database:
cp .env.example .env
nano .env # atau jalankan: node setup-db.js

# 3. Jalankan deploy script otomatis:
bash deploy.sh

# 4. Jalankan aplikasi dengan PM2 di background:
npm install -g pm2
pm2 start npm --name "tukin-app" -- start
pm2 save
pm2 startup
```

---

## 🔑 Akun Login Default Bawaan Sistem

Setelah inisialisasi database berhasil, akun berikut siap digunakan:

| Tipe Akun | NIP / Username | Password Default | Hak Akses |
| :--- | :--- | :--- | :--- |
| **Administrator** | `admin` | `1234` | Kelola Pegawai, Master Jam Kerja, Radius Kantor, Rekap Presensi & Kinerja |
| **Super Administrator** | `root` | `root` *(atau sesuai SUPERADMIN_PASS)* | Kelola Administrator, Format Laporan Kop Surat, Reset & Maintenance |
| **Pegawai Pamong** | `198501012010011001` | `1234` | Presensi GPS Smartphone, Input Log Aktivitas Harian, Laporan Kinerja |

> [!IMPORTANT]
> Harap segera ubah password default akun Admin dan Superadmin setelah Anda berhasil login pertama kali demi keamanan sistem.
