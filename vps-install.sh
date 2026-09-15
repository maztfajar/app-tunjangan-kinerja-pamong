#!/bin/bash

# ==============================================================================
# VPS INSTALL SCRIPT - App Tunjangan Kinerja Pamong
# Kapanewon Pengasih
# ==============================================================================
# Script satu-perintah untuk instalasi di VPS Linux (Ubuntu/Debian/AlmaLinux)
# Aplikasi dijalankan 24/7 menggunakan PM2 — tetap aktif meskipun terminal ditutup.
#
# CARA PAKAI:
#   1. Upload seluruh folder aplikasi ke VPS
#   2. Masuk ke folder aplikasi: cd /path/ke/aplikasi
#   3. Jalankan: chmod +x vps-install.sh && bash vps-install.sh
#
# Setelah selesai, aplikasi otomatis berjalan di background (PM2).
# ==============================================================================

set -e

# ─── Warna & Helper ──────────────────────────────────────────────────────────
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

step()   { echo -e "\n${BLUE}${BOLD}▶ $1${NC}"; }
ok()     { echo -e "${GREEN}✓ $1${NC}"; }
warn()   { echo -e "${YELLOW}⚠ $1${NC}"; }
fail()   { echo -e "${RED}✗ $1${NC}"; exit 1; }
info()   { echo -e "${CYAN}  $1${NC}"; }

APP_NAME="tukin-pamong"
APP_DIR="$(cd "$(dirname "$0")" && pwd)"

echo -e "${CYAN}${BOLD}"
echo "=================================================================="
echo "   INSTALASI VPS - Tunjangan Kinerja & Absensi Pamong           "
echo "   Kapanewon Pengasih                                             "
echo "   Aplikasi akan berjalan 24/7 menggunakan PM2                   "
echo "=================================================================="
echo -e "${NC}"
echo -e "  ${BOLD}Direktori Aplikasi:${NC} $APP_DIR"
echo ""

# ─── 1. Cek dan Install Node.js ──────────────────────────────────────────────
step "Memeriksa instalasi Node.js..."

if ! command -v node > /dev/null 2>&1; then
    warn "Node.js belum terinstal. Menginstal Node.js 20 LTS via NodeSource..."

    # Deteksi OS
    if command -v apt-get > /dev/null 2>&1; then
        # Ubuntu / Debian
        curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
        sudo apt-get install -y nodejs
    elif command -v dnf > /dev/null 2>&1; then
        # RHEL / AlmaLinux / CentOS 8+
        curl -fsSL https://rpm.nodesource.com/setup_20.x | sudo bash -
        sudo dnf install -y nodejs
    elif command -v yum > /dev/null 2>&1; then
        # CentOS 7
        curl -fsSL https://rpm.nodesource.com/setup_20.x | sudo bash -
        sudo yum install -y nodejs
    else
        fail "Sistem operasi tidak dikenali. Instal Node.js 20 LTS secara manual: https://nodejs.org"
    fi
fi

NODE_VER=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VER" -lt 18 ]; then
    fail "Node.js versi 18+ diperlukan. Versi saat ini: $(node -v). Update dulu: https://nodejs.org"
fi
ok "Node.js $(node -v) terdeteksi."

# ─── 2. Cek dan Install PM2 ──────────────────────────────────────────────────
step "Memeriksa instalasi PM2 (Process Manager)..."

if ! command -v pm2 > /dev/null 2>&1; then
    warn "PM2 belum terinstal. Menginstal..."
    npm install -g pm2
fi
PM2_VER=$(pm2 -v 2>/dev/null || echo "?")
ok "PM2 v${PM2_VER} terdeteksi."

# ─── 3. Cek .env ─────────────────────────────────────────────────────────────
step "Memeriksa file konfigurasi .env..."

cd "$APP_DIR"

if [ ! -f .env ]; then
    if [ -f .env.example ]; then
        cp .env.example .env
        warn "File .env dibuat dari .env.example."
    else
        fail "File .env tidak ditemukan! Buat file .env terlebih dahulu."
    fi
fi

# Tampilkan petunjuk edit .env jika masih kosong/default
DB_URL_VAL=$(grep -E '^[[:space:]]*DATABASE_URL=' .env | head -n 1 | cut -d '=' -f2- | tr -d '"' | tr -d "'" | tr -d '[:space:]')
JWT_VAL=$(grep -E '^[[:space:]]*JWT_SECRET=' .env | head -n 1 | cut -d '=' -f2- | tr -d '"' | tr -d "'")

if [[ -z "$DB_URL_VAL" ]]; then
    echo ""
    echo -e "${YELLOW}${BOLD}⚠  DATABASE_URL belum diisi di file .env!${NC}"
    echo -e "   Edit file .env sekarang dan isi salah satu:"
    echo -e "   ${BOLD}nano $APP_DIR/.env${NC}"
    echo ""
    echo -e "   Opsi 1 (SQLite otomatis, tidak perlu setup DB server):"
    echo -e "   ${BOLD}DATABASE_URL=\"\"${NC}"
    echo ""
    echo -e "   Opsi 2 (PostgreSQL lokal VPS):"
    echo -e "   ${BOLD}DATABASE_URL=\"postgresql://user:password@localhost:5432/namadb\"${NC}"
    echo ""
    echo -e "   Opsi 3 (Supabase / Neon / Railway Cloud):"
    echo -e "   ${BOLD}DATABASE_URL=\"postgresql://...\"${NC} (salin dari dashboard cloud Anda)"
    echo ""
    read -rp "Tekan Enter setelah selesai mengedit .env, atau Ctrl+C untuk batalkan..."
    echo ""
fi

if echo "$JWT_VAL" | grep -q "ganti-dengan"; then
    warn "JWT_SECRET masih nilai default! Sangat disarankan diganti sebelum go-live."
    info "Buat secret baru: openssl rand -base64 32"
fi

ok "File .env siap."

# ─── 4. Install Dependencies ─────────────────────────────────────────────────
step "Menginstal dependensi aplikasi (npm ci)..."

if [ ! -d node_modules ]; then
    npm ci --omit=dev 2>/dev/null || npm install --omit=dev
else
    warn "node_modules sudah ada. Memperbarui dependensi..."
    npm ci --omit=dev 2>/dev/null || npm install --omit=dev
fi
ok "Dependensi terinstal."

# ─── 5. Sinkronisasi Database ─────────────────────────────────────────────────
step "Menyinkronkan skema database Prisma..."

DB_URL_FINAL=$(grep -E '^[[:space:]]*DATABASE_URL=' .env | head -n 1 | cut -d '=' -f2- | tr -d '"' | tr -d "'" | tr -d '[:space:]')

if [[ "$DB_URL_FINAL" == postgres* ]]; then
    info "Mode PostgreSQL terdeteksi."
    npx prisma db push --skip-generate
    npx prisma generate
    info "Menjalankan seeder data awal..."
    npx tsx prisma/seed.ts 2>/dev/null \
        || npx ts-node --esm prisma/seed.ts 2>/dev/null \
        || node prisma/seed.js 2>/dev/null \
        || warn "Seeder dilewati (data mungkin sudah ada)."
else
    info "Mode SQLite (storage/database.sqlite) terdeteksi."
    mkdir -p storage
    if [ ! -f storage/database.sqlite ] && [ -f storage/database.sqlite.default ]; then
        cp storage/database.sqlite.default storage/database.sqlite
        ok "storage/database.sqlite disalin dari template bawaan."
    SQLITE_DATABASE_URL="file:./storage/database.sqlite" npx prisma db push --schema=prisma/schema.sqlite.prisma --skip-generate 2>/dev/null || true
    SQLITE_DATABASE_URL="file:./storage/database.sqlite" npx prisma generate --schema=prisma/schema.sqlite.prisma
fi
ok "Skema database tersinkronisasi."

# ─── 6. Build Production ──────────────────────────────────────────────────────
step "Membangun aplikasi untuk Production (npm run build)..."

npm run build
if [ $? -ne 0 ]; then
    fail "Build gagal! Periksa error di atas sebelum melanjutkan."
fi
ok "Build production berhasil."

# ─── 7. Jalankan dengan PM2 ──────────────────────────────────────────────────
step "Menjalankan aplikasi dengan PM2..."

# Hentikan proses lama jika ada
pm2 stop "$APP_NAME" 2>/dev/null || true
pm2 delete "$APP_NAME" 2>/dev/null || true

# Jalankan aplikasi Next.js production dengan PM2
pm2 start npm --name "$APP_NAME" -- start -- --port 3000
ok "Aplikasi berhasil dijalankan oleh PM2!"

# ─── 8. Simpan Konfigurasi PM2 & Startup Otomatis ────────────────────────────
step "Mendaftarkan PM2 startup otomatis saat VPS reboot..."

pm2 save
pm2 startup 2>/dev/null | grep "sudo " | bash 2>/dev/null || {
    warn "Tidak dapat mendaftarkan startup PM2 secara otomatis (mungkin butuh sudo)."
    STARTUP_CMD=$(pm2 startup 2>/dev/null | grep "sudo " | head -n 1)
    if [ -n "$STARTUP_CMD" ]; then
        warn "Jalankan perintah ini secara manual untuk mengaktifkan startup otomatis:"
        echo -e "  ${BOLD}${STARTUP_CMD}${NC}"
    fi
}
pm2 save
ok "Konfigurasi PM2 disimpan. Aplikasi akan aktif otomatis setelah VPS reboot."

# ─── 9. Pasang Cron Job Auto-Backup Google Drive (Opsional) ───────────────────
step "Menyiapkan Cron Job Auto-Backup Google Drive (pukul 00:00 malam)..."

# Baca cron secret dari AppSettings atau gunakan default
CRON_SECRET=$(grep -E 'CRON_SECRET=' .env | head -n 1 | cut -d '=' -f2- | tr -d '"' | tr -d "'")
CRON_SECRET="${CRON_SECRET:-backup-secret-key}"

CRON_LINE="0 0 * * * curl -s -X POST \"http://localhost:3000/api/cron/backup?secret=${CRON_SECRET}\" > /dev/null 2>&1"

if crontab -l 2>/dev/null | grep -q "api/cron/backup"; then
    warn "Cron job auto-backup sudah ada, melewati."
else
    (crontab -l 2>/dev/null; echo "$CRON_LINE") | crontab -
    ok "Cron job auto-backup ditambahkan ke crontab."
fi

# ─── 10. Selesai - Tampilkan Informasi ───────────────────────────────────────
LOCAL_IP=$(hostname -I 2>/dev/null | awk '{print $1}')
[ -z "$LOCAL_IP" ] && LOCAL_IP="<IP-VPS-Anda>"

echo ""
echo -e "${GREEN}${BOLD}=================================================================="
echo "   ✅ INSTALASI VPS BERHASIL!"
echo "=================================================================="
echo -e "${NC}"

echo -e "${CYAN}Status Aplikasi PM2:${NC}"
pm2 status

echo ""
echo -e "${CYAN}Informasi Akses:${NC}"
echo -e "  🌐 Port Default    : ${BOLD}http://${LOCAL_IP}:3000${NC}"
echo -e "  🔒 Dengan Domain   : Setup Nginx + Certbot SSL (lihat PANDUAN_VPS.md)"
echo ""
echo -e "${CYAN}Perintah PM2 yang Berguna:${NC}"
echo -e "  ${BOLD}pm2 status${NC}                  → Lihat status semua proses"
echo -e "  ${BOLD}pm2 logs ${APP_NAME}${NC}    → Lihat log real-time"
echo -e "  ${BOLD}pm2 restart ${APP_NAME}${NC} → Restart aplikasi"
echo -e "  ${BOLD}pm2 stop ${APP_NAME}${NC}    → Hentikan aplikasi"
echo -e "  ${BOLD}pm2 reload ${APP_NAME}${NC}  → Reload tanpa downtime"
echo ""
echo -e "${CYAN}Cron Job Auto-Backup Google Drive (Pukul 00:00):${NC}"
echo -e "  Aktif: ${BOLD}0 0 * * * curl -X POST http://localhost:3000/api/cron/backup?secret=${CRON_SECRET}${NC}"
echo -e "  Lihat crontab  : ${BOLD}crontab -l${NC}"
echo ""
echo -e "${CYAN}Konfigurasi Google Drive Backup:${NC}"
echo -e "  Masuk ke aplikasi → Super Admin → Kelola Database → Pengaturan Google Drive"
echo ""
echo -e "${YELLOW}Akun Login Default:${NC}"
echo -e "  Admin   → Username: ${BOLD}admin${NC}               | Password: ${BOLD}1234${NC}"
echo -e "  Pegawai → Username: ${BOLD}198501012010011001${NC}  | Password: ${BOLD}1234${NC}"
echo ""
echo -e "${RED}⚠ PENTING: Ganti password default setelah login pertama!${NC}"
echo -e "${RED}⚠ Baca PANDUAN_VPS.md untuk setup Nginx + SSL (HTTPS) agar GPS dan WebAuthn bekerja.${NC}"
echo ""
