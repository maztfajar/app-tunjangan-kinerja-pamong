# 📖 Panduan Lengkap Deploy ke Web Hosting (cPanel / CloudLinux / Phusion Passenger)
### Aplikasi Absensi & Tunjangan Kinerja Pamong - Kapanewon Pengasih

Dokumen ini adalah panduan resmi langkah demi langkah untuk mengunggah, mengonfigurasi, dan menjalankan aplikasi ini pada web hosting yang memiliki fitur **"Setup Node.js App"** (CloudLinux / Phusion Passenger / cPanel).

> ⚡ **Karakteristik Paket Standalone:**
> - ✅ **Nol Dependensi Hosting**: Tidak memerlukan `npm install` atau build di server hosting.
> - ✅ **Hemat Memori (RAM < 120 MB)**: Sangat ringan, aman untuk shared hosting dengan limit RAM 512MB - 1GB.
> - ✅ **Bebas Error 508**: Menggunakan arsitektur native HTTP yang ramah Phusion Passenger dan CageFS CloudLinux.

---

## 📋 Prasyarat di Web Hosting

1. **Fitur "Setup Node.js App"**: Tersedia di cPanel hosting Anda.
2. **Versi Node.js**: Pilih versi **Node.js 20.x** *(disarankan)* atau **Node.js 18.x**.
3. **Database (PostgreSQL)**:
   - **Opsi 1 (Cloud PostgreSQL Gratis - Sangat Direkomendasikan)**: Gunakan **[Neon.tech](https://neon.tech)** atau **[Supabase](https://supabase.com)**. Aktif instan, tidak membebani kuota RAM hosting cPanel, dan mendukung pooling.
   - **Opsi 2 (PostgreSQL cPanel)**: Jika paket hosting Anda memiliki menu *"PostgreSQL Databases"*.

---

## 🚨 LANGKAH KHUSUS: Mengatasi Error 508 (Jika Hosting Saat Ini Terkunci)

Jika website Anda saat ini menampilkan tulisan **"508 Resource Limit Is Reached"**, lakukan pemulihan instan berikut:

1. Buka cPanel -> **Terminal**.
2. Ketik perintah berikut untuk mematikan proses Node.js yang tertahan/looping:
   ```bash
   pkill -u $USER -f node
   ```
3. Buka cPanel -> **Setup Node.js App** -> klik tombol **Stop** pada aplikasi Anda, lalu klik **Start**.
4. Tunggu sekitar 10–30 detik. Status limit CloudLinux akan langsung kembali normal (0%).
5. Unggah paket `cpanel-deploy.zip` versi terbaru sesuai langkah di bawah ini.

---

## 🚀 Langkah 1: Siapkan File Paket Upload

Semua file dan modul telah dikemas menjadi satu file arsip mandiri:
📁 **`cpanel-deploy.zip`**

> 💡 **Info:** Jika di kemudian hari Anda melakukan perubahan kode dan ingin membuat ulang paket zip ini di komputer lokal, cukup jalankan:
> ```bash
> ./pack-cpanel.sh -y
> ```
> *(atau `npm run cpanel:pack`)*.

---

## 🗄️ Langkah 2: Siapkan Database PostgreSQL

Pilih salah satu dari dua opsi berikut:

### Opsi A (Rekomendasi): Cloud Database Gratis Neon.tech
1. Buka **[https://neon.tech](https://neon.tech)** dan daftar gratis (bisa dengan akun Google/GitHub).
2. Buat Project baru, beri nama misalnya `tukin-pamong`.
3. Pada dashboard Neon, salin string **Connection string** (Direct atau Pooled), contohnya:
   ```env
   DATABASE_URL="postgresql://neondb_owner:password_acak@ep-xyz.ap-southeast-1.aws.neon.tech/neondb?sslmode=require"
   ```

### Opsi B: PostgreSQL Bawaan cPanel
1. Masuk ke cPanel -> menu **PostgreSQL Databases**.
2. Buat database baru (contoh: `usercp_tukin`).
3. Buat user database baru dan tentukan password.
4. Hubungkan user ke database dengan hak akses penuh (**All Privileges**).
5. Format `DATABASE_URL`:
   ```env
   DATABASE_URL="postgresql://usercp_tukinuser:PASSWORD@localhost:5432/usercp_tukin?schema=public"
   ```

---

## ⚙️ Langkah 3: Konfigurasi Aplikasi di cPanel Node.js

1. Masuk ke **cPanel** -> cari menu **Setup Node.js App**.
2. Jika sudah pernah membuat aplikasi sebelumnya:
   - Pastikan **Application startup file** diisi: `server.js` (atau `app.js`).
3. Jika baru pertama kali:
   - Klik **Create Application**.
   - **Node.js version**: `20.x` (atau `18.x`).
   - **Application mode**: `Production`.
   - **Application root**: `tukin-app` *(sesuai nama folder yang Anda inginkan)*.
   - **Application URL**: Pilih domain atau subdomain Anda.
   - **Application startup file**: `server.js` (atau `app.js`).
   - Klik **Create**.

---

## 📂 Langkah 4: Upload dan Ekstrak File Aplikasi

1. Buka menu **File Manager** di cPanel.
2. Masuk ke folder aplikasi Anda (misal: `public_html` atau `tukin-app`).
3. Hapus file dummy bawaan cPanel jika ada (seperti `app.js` default 1 baris).
4. Klik tombol **Upload** di bagian atas menu File Manager.
5. Unggah file **`cpanel-deploy.zip`** dari komputer lokal.
6. Setelah upload selesai (100% hijau), kembali ke File Manager.
7. Klik kanan pada **`cpanel-deploy.zip`** -> pilih **Extract** -> konfirmasi ekstrak ke folder aplikasi.
8. *(Opsional)* Hapus file `cpanel-deploy.zip` setelah terekstrak untuk menghemat ruang disk hosting.

---

## 🔐 Langkah 5: Buat File .env

1. Di File Manager dalam folder aplikasi, temukan file **`.env.example`**.
2. Salin atau ganti namanya (*Rename*) menjadi **`.env`**.
3. Klik kanan pada file `.env` -> pilih **Edit**.
4. Isi dan sesuaikan parameternya:
   ```env
   # Kredensial Database PostgreSQL (WAJIB)
   DATABASE_URL="postgresql://user:password@host:5432/dbname?sslmode=require"

   # Kunci Rahasia JWT (Minimal 32 karakter acak)
   JWT_SECRET="kunci_rahasia_super_aman_ganti_disini_minimal_32_karakter"

   # Akun Super Admin Awal
   SUPERADMIN_USER="root"
   SUPERADMIN_PASS="ganti_password_superadmin_disini"
   ```

> ⚠️ **PERINGATAN SANGAT PENTING MENGENAI PORT:**
> **JANGAN menambahkan baris `PORT=3000` di dalam file `.env`!**
> Phusion Passenger pada web hosting cPanel mengalokasikan port atau socket secara dinamis. Jika Anda memaksa `PORT=3000`, aplikasi akan mengalami crash loop dan memicu error 508.

---

## 🚫 Langkah 6: JANGAN KLIK "Run NPM Install"!

> 🛑 **DILARANG MENGKLIK TOMBOL "Run NPM Install" DI CPANEL!**
> Paket `cpanel-deploy.zip` ini adalah **Next.js Standalone Bundle**. Seluruh library, Prisma Client engine, dan aset yang dibutuhkan sudah tersedia lengkap di dalam paket.
> Menjalankan *NPM Install* di shared hosting akan memakan RAM 1–2 GB dan secara instan menyebabkan akun Anda terkena penalti **508 Resource Limit Is Reached**.

---

## 🗃️ Langkah 7: Inisialisasi Database via Terminal cPanel

1. Buka menu **Terminal** di cPanel.
2. Masuk ke folder aplikasi Anda:
   ```bash
   cd ~/tukin-app
   ```
   *(Ganti `tukin-app` dengan nama folder root aplikasi Anda jika berbeda)*.

3. **Uji Koneksi Database**:
   ```bash
   node check-db.js
   ```
   *Jika sukses, akan muncul pesan:* `✅ Terhubung ke database server dengan sukses!`

4. **Inisialisasi Tabel Otomatis**:
   ```bash
   node prisma/init-db.js
   ```
   *Perintah ini langsung mengeksekusi struktur tabel tanpa memakan RAM server.*

5. **Isi Data Awal (Seeder)**:
   ```bash
   node prisma/seed.js
   ```
   *Perintah ini membuat akun Administrator, Superadmin, lokasi kantor default, dan pengaturan jam kerja.*

---

## 🔄 Langkah 8: Restart Aplikasi & Selesai!

1. Masuk kembali ke menu **Setup Node.js App** di cPanel.
2. Klik tombol **Restart** di bagian atas formulir aplikasi.
3. Buka domain atau subdomain Anda di browser.
4. 🎉 **Aplikasi Anda sudah aktif dan online!**

### Kredensial Login Bawaan:
- **Admin Kantor**: NIP `admin` | Password `1234`
- **Superadmin**: NIP `root` | Password sesuai `SUPERADMIN_PASS` di `.env` (default: `root`)
- **Sample Pegawai**: NIP `198501012010011001` | Password `1234`

---

## 🔍 Cara Memeriksa Log Jika Terjadi Masalah

Jika web tidak memuat atau menampilkan error:
1. Buka **File Manager** di cPanel -> buka folder aplikasi Anda.
2. Cari dan buka file **`stderr.log`**.
3. File ini mencatat seluruh pesan error Node.js secara detail:
   - Jika error `DATABASE_URL belum terisi`: periksa penulisan di `.env`.
   - Jika error autentikasi database: periksa username/password di `.env`.
   - Jika error koneksi database cloud: pastikan menyertakan `?sslmode=require`.
