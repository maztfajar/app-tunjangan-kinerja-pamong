#!/bin/bash

# ==============================================================================
# DEPLOY SCRIPT - Pertama Kali Setup di Server/VPS Baru
# App Tunjangan Kinerja Pamong - Kapanewon Pengasih
# ==============================================================================
# Jalankan SEKALI saat pertama kali upload ke server:
#   chmod +x deploy.sh && bash deploy.sh
#
# Setelah deploy berhasil, gunakan start.sh untuk menjalankan ulang:
#   bash start.sh --prod
# ==============================================================================

set -e  # Hentikan script jika ada perintah yang gagal

GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

step() { echo -e "\n${BLUE}${BOLD}▶ $1${NC}"; }
ok()   { echo -e "${GREEN}✓ $1${NC}"; }
warn() { echo -e "${YELLOW}⚠ $1${NC}"; }
fail() { echo -e "${RED}✗ $1${NC}"; exit 1; }

echo -e "${CYAN}${BOLD}"
echo "============================================================"
echo "   DEPLOY - Tunjangan Kinerja & Absensi Pamong             "
echo "   Kapanewon Pengasih                                       "
echo "============================================================"
echo -e "${NC}"

# ─── Cek Prerequisites ────────────────────────────────────────────────────────
step "Memeriksa prerequisites..."

if ! command -v node > /dev/null 2>&1; then
    fail "Node.js tidak ditemukan! Instal Node.js 18 LTS: https://nodejs.org"
fi
NODE_VER=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VER" -lt 18 ]; then
    fail "Node.js versi 18+ diperlukan. Versi saat ini: $(node -v)"
fi
ok "Node.js $(node -v)"

if ! command -v npm > /dev/null 2>&1; then
    fail "npm tidak ditemukan!"
fi
ok "npm $(npm -v)"

if ! command -v psql > /dev/null 2>&1; then
    warn "psql (PostgreSQL client) tidak ditemukan. Pastikan PostgreSQL sudah terinstal."
fi

# ─── Setup .env ───────────────────────────────────────────────────────────────
step "Menyiapkan file konfigurasi .env..."
if [ ! -f .env ]; then
    if [ -f .env.example ]; then
        cp .env.example .env
        warn "File .env dibuat dari .env.example."
        echo ""
        echo -e "${RED}${BOLD}WAJIB DILAKUKAN SEKARANG:${NC}"
        echo -e "Edit file .env dan sesuaikan:"
        echo -e "  1. ${BOLD}DATABASE_URL${NC} → URL koneksi PostgreSQL Anda"
        echo -e "  2. ${BOLD}JWT_SECRET${NC}   → String rahasia unik (buat dengan: openssl rand -base64 32)"
        echo -e "  3. ${BOLD}SUPERADMIN_PASS${NC} → Password superadmin yang kuat"
        echo ""
        echo -e "Contoh edit: ${BOLD}nano .env${NC}"
        echo ""
        read -p "Tekan Enter setelah selesai mengedit .env, atau Ctrl+C untuk membatalkan..."
    else
        fail "File .env dan .env.example tidak ditemukan! Buat file .env terlebih dahulu."
    fi
else
    ok "File .env sudah ada."
fi

# Validasi isi .env
if ! grep -q "DATABASE_URL" .env; then
    fail "DATABASE_URL tidak ada di .env!"
fi
if grep -q "ganti-dengan-string-rahasia" .env; then
    warn "JWT_SECRET masih menggunakan nilai default! Ganti sebelum go-live."
fi

# ─── Install Dependencies ─────────────────────────────────────────────────────
step "Menginstal dependencies (npm ci)..."
npm ci
ok "Dependencies terinstal."

# ─── Database Setup ───────────────────────────────────────────────────────────
step "Menjalankan Prisma migrate/push untuk membuat tabel database..."
npx prisma db push
ok "Skema database tersinkronisasi."

step "Generate Prisma Client..."
npx prisma generate
ok "Prisma client berhasil di-generate."

step "Menyemai data awal (seed database)..."
npx tsx prisma/seed.ts && ok "Data awal berhasil dibuat." || warn "Seed dilewati (data mungkin sudah ada)."

# ─── Production Build ─────────────────────────────────────────────────────────
step "Membangun aplikasi untuk production (npm run build)..."
npm run build
ok "Build production berhasil!"

# ─── Selesai ──────────────────────────────────────────────────────────────────
echo ""
echo -e "${GREEN}${BOLD}============================================================${NC}"
echo -e "${GREEN}${BOLD}  ✅ DEPLOY BERHASIL!                                       ${NC}"
echo -e "${GREEN}${BOLD}============================================================${NC}"
echo ""
echo -e "${CYAN}Cara menjalankan aplikasi:${NC}"
echo -e "  ${BOLD}npm run start${NC}          → Jalankan langsung di port 3000"
echo -e "  ${BOLD}bash start.sh --prod${NC}   → Jalankan dengan cek otomatis"
echo ""
echo -e "${CYAN}Untuk production yang stabil, gunakan PM2:${NC}"
echo -e "  npm install -g pm2"
echo -e "  pm2 start npm --name 'tukin-app' -- run start"
echo -e "  pm2 save && pm2 startup"
echo ""
echo -e "${YELLOW}Akun Default:${NC}"
echo -e "  Admin NIP: admin  | Password: 1234"
echo -e "  Pegawai NIP: 198501012010011001 | Password: 1234"
echo ""
echo -e "${RED}⚠ Jangan lupa ganti password default setelah login pertama kali!${NC}"
