# Panduan Lengkap Pemasangan di VPS (Ubuntu/Debian)

Panduan ini mencakup instalasi aplikasi **E-Kinerja Pamong** di VPS (Virtual Private Server) Linux, konfigurasi Nginx + SSL HTTPS gratis, manajemen PM2, dan setup otomatisasi backup ke Google Drive.

---

## Prasyarat

| Kebutuhan | Versi Minimal |
|---|---|
| OS VPS | Ubuntu 20.04+ / Debian 11+ / AlmaLinux 8+ |
| RAM | 512 MB (Direkomendasikan 1 GB+) |
| Storage | 5 GB tersedia |
| Node.js | 18 LTS atau 20 LTS |
| PM2 | 5.x+ (otomatis terinstal oleh script) |

---

## Langkah 1 — Upload Aplikasi ke VPS

Dari komputer lokal Anda, upload folder aplikasi ke VPS menggunakan `scp` atau `rsync`:

```bash
# Contoh dengan rsync (lebih cepat untuk folder besar)
rsync -avz --exclude='node_modules' --exclude='.next' --exclude='storage' \
  /path/lokal/aplikasi/ root@IP-VPS-ANDA:/opt/ekinerja/

# Atau dengan scp (zip dulu bisa lebih mudah)
scp aplikasi.zip root@IP-VPS-ANDA:/opt/ekinerja/
```

Setelah upload, masuk ke VPS via SSH:

```bash
ssh root@IP-VPS-ANDA
cd /opt/ekinerja
```

---

## Langkah 2 — Jalankan Script Instalasi Otomatis

```bash
chmod +x vps-install.sh && bash vps-install.sh
```

Script ini secara otomatis:
- ✅ Memeriksa / menginstal Node.js 20 LTS
- ✅ Menginstal PM2 (Process Manager) secara global
- ✅ Membuat file `.env` dari `.env.example` jika belum ada
- ✅ Menginstal dependensi (`npm ci`)
- ✅ Menyinkronkan skema database Prisma
- ✅ Membangun aplikasi production (`npm run build`)
- ✅ Menjalankan aplikasi dengan PM2 di latar belakang
- ✅ Mendaftarkan startup PM2 agar aplikasi hidup kembali setelah VPS reboot
- ✅ Menambahkan Cron Job auto-backup jam 00:00 malam

> [!IMPORTANT]
> Saat script berjalan, Anda akan diminta mengisi **DATABASE_URL** di `.env` jika belum diisi. Bisa memilih mode SQLite (tanpa setup server database) atau PostgreSQL.

---

## Langkah 3 — Konfigurasi Nginx (Reverse Proxy)

Agar aplikasi dapat diakses melalui domain/subdomain (misal `kinerja.desa.id`) dan mendukung HTTPS untuk GPS & WebAuthn:

### 3.1 Install Nginx

```bash
sudo apt update && sudo apt install -y nginx
```

### 3.2 Buat Konfigurasi Virtual Host

```bash
sudo nano /etc/nginx/sites-available/ekinerja
```

Salin konfigurasi berikut (ganti `kinerja.desa.id` dengan domain Anda):

```nginx
server {
    listen 80;
    server_name kinerja.desa.id www.kinerja.desa.id;

    # Batas ukuran upload (untuk logo kop surat, dll)
    client_max_body_size 20M;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 120s;
    }
}
```

### 3.3 Aktifkan Konfigurasi

```bash
sudo ln -s /etc/nginx/sites-available/ekinerja /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

---

## Langkah 4 — SSL/HTTPS Gratis dengan Certbot (Let's Encrypt)

> [!IMPORTANT]
> HTTPS **wajib** ada agar fitur GPS Presensi dan Biometrik (WebAuthn sidik jari) dapat berfungsi di smartphone.

```bash
# Install Certbot
sudo apt install -y certbot python3-certbot-nginx

# Dapatkan sertifikat SSL (ganti dengan domain Anda)
sudo certbot --nginx -d kinerja.desa.id -d www.kinerja.desa.id

# Certbot akan otomatis memodifikasi konfigurasi Nginx dan mengaktifkan HTTPS
```

Certbot otomatis memperbarui sertifikat setiap 90 hari. Verifikasi pembaruan otomatis:

```bash
sudo systemctl status certbot.timer
# atau
sudo certbot renew --dry-run
```

---

## Manajemen Aplikasi dengan PM2

| Perintah | Fungsi |
|---|---|
| `pm2 status` | Lihat status semua proses |
| `pm2 logs tukin-pamong` | Lihat log real-time |
| `pm2 logs tukin-pamong --lines 200` | Lihat 200 baris log terakhir |
| `pm2 restart tukin-pamong` | Restart aplikasi |
| `pm2 reload tukin-pamong` | Reload zero-downtime (untuk update) |
| `pm2 stop tukin-pamong` | Hentikan aplikasi |
| `pm2 delete tukin-pamong` | Hapus proses dari PM2 |
| `pm2 save` | Simpan konfigurasi PM2 saat ini |
| `pm2 startup` | Generate perintah startup otomatis |
| `pm2 monit` | Monitor resource (CPU, RAM) interaktif |

### Update Aplikasi (Deploy Ulang)

Jika ada pembaruan kode:

```bash
cd /opt/ekinerja

# Upload file baru (tanpa node_modules)
# Lalu jalankan:
npm ci --omit=dev
npm run build
pm2 reload tukin-pamong   # Zero-downtime reload
pm2 save
```

---

## Setup Auto-Backup Google Drive

### Mendapatkan Kredensial OAuth2 Google

1. Buka [Google Cloud Console](https://console.cloud.google.com/)
2. Buat Project baru atau pilih project yang sudah ada
3. Aktifkan **Google Drive API**: Menu **APIs & Services → Library → Google Drive API → Enable**
4. Buat **OAuth 2.0 Client ID**: Menu **APIs & Services → Credentials → Create Credentials → OAuth client ID**
   - Pilih Application type: **Web application**
   - Tambahkan Authorized redirect URI: `https://developers.google.com/oauthplayground`
5. Catat **Client ID** dan **Client Secret**

### Mendapatkan Refresh Token

1. Buka [OAuth 2.0 Playground](https://developers.google.com/oauthplayground/)
2. Klik ikon ⚙️ (Settings) → centang **Use your own OAuth credentials**
3. Masukkan Client ID dan Client Secret Anda → Close
4. Di panel kiri, cari dan pilih scope: **Google Drive API v3 → `.../auth/drive`** atau `.../auth/drive.file`
5. Klik **Authorize APIs** → Login dengan akun Google target
6. Klik **Exchange authorization code for tokens**
7. Salin nilai **Refresh Token**

### Konfigurasi di Aplikasi (Mudah & Interaktif)

1. Login sebagai **Super Admin** di aplikasi
2. Buka menu **Super Admin → Kelola Database**
3. Di kartu **Otomatisasi Backup Cloud (Google Drive)**, klik **⚙️ Pengaturan Google Drive & Cron**
4. Masukkan:
   - **Client ID**
   - **Client Secret**
   - **Refresh Token**
5. **Pemilihan Folder Tujuan (Interaktif):**
   - Klik tombol **📂 Pilih Folder** di sebelah target folder.
   - Sistem akan otomatis membaca folder-folder di Google Drive Anda.
   - Anda bisa mencari nama folder lewat kolom pencarian lalu klik folder yang diinginkan, atau pilih **🏠 My Drive (Root)** jika ingin disimpan di direktori utama Google Drive.
6. Klik **🔍 Uji Koneksi Google** untuk memastikan izin akses sudah tepat.
7. Klik **Simpan Pengaturan**.

> [!TIP]
> Anda juga dapat langsung menguji backup instan dengan menekan tombol **☁️ Backup Sekarang ke Drive** di halaman Database setelah menyimpan konfigurasi.

### Cron Job di VPS (Sudah Otomatis Terpasang)

Script `vps-install.sh` sudah menambahkan cron job berikut secara otomatis:

```bash
# Cek crontab yang aktif
crontab -l

# Hasil: Backup setiap pukul 00:00 malam
0 0 * * * curl -s -X POST "http://localhost:3000/api/cron/backup?secret=CRON_SECRET" > /dev/null 2>&1
```

> [!NOTE]
> Backup akan **otomatis dilewati dengan aman** jika kredensial Google Drive belum diisi. Tidak ada error yang memengaruhi sistem.

Untuk memicu backup manual dari terminal VPS (misalnya untuk testing):

```bash
curl -X POST "http://localhost:3000/api/cron/backup?secret=backup-secret-key"
```

---

## Firewall (UFW)

```bash
# Aktifkan UFW
sudo ufw enable

# Izinkan SSH (penting! jangan sampai terkunci keluar)
sudo ufw allow 22/tcp

# Izinkan HTTP dan HTTPS
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Opsional: Jika mengakses port 3000 secara langsung (tanpa Nginx)
# sudo ufw allow 3000/tcp

# Cek status
sudo ufw status
```

---

## Troubleshooting

### Aplikasi tidak bisa diakses
```bash
pm2 logs tukin-pamong --lines 50   # Lihat log error
pm2 restart tukin-pamong            # Coba restart
```

### Database error setelah update
```bash
cd /opt/ekinerja
npx prisma db push    # Sinkron ulang skema
pm2 restart tukin-pamong
```

### SSL expired / tidak bisa diperbarui
```bash
sudo certbot renew
sudo systemctl reload nginx
```

### Backup Google Drive gagal
Periksa log endpoint cron:
```bash
curl -v "http://localhost:3000/api/cron/backup?secret=CRON_SECRET_ANDA"
```

### PM2 tidak menyala setelah reboot
```bash
pm2 startup   # Ikuti petunjuk perintah yang ditampilkan
pm2 save
```

---

## Ringkasan Arsitektur di VPS

```
Internet → Nginx (port 443 HTTPS) → Next.js/PM2 (port 3000) → PostgreSQL/SQLite
                                          ↓
                              Cron Job 00:00 setiap hari
                                          ↓
                              API /api/cron/backup
                                          ↓
                              Google Drive (JSON, max 7 file)
```

---

*Panduan ini khusus untuk VPS. Untuk web hosting cPanel, lihat file `PANDUAN_CPANEL.md`.*
