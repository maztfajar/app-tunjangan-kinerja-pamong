#!/bin/bash

# ==============================================================================
# Script Menjalankan Aplikasi Tunjangan Kinerja Pamong
# Kapanewon Pengasih
# ==============================================================================
# Penggunaan:
#   bash start.sh            → Mode Development (localhost, hot-reload)
#   bash start.sh --prod     → Mode Production  (build + start, untuk VPS/hosting)
#   bash start.sh --https    → Mode Dev HTTPS   (untuk akses HP di jaringan lokal)
# ==============================================================================

# Warna output terminal
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m' # No Color

echo -e "${CYAN}${BOLD}"
echo "=========================================================="
echo "    MEMULAI SISTEM TUNJANGAN KINERJA & ABSENSI PAMONG    "
echo "                  KAPANEWON PENGASIH                      "
echo "=========================================================="
echo -e "${NC}"

# 1. Cek Node.js
echo -e "${BLUE}[1/5] Memeriksa Node.js...${NC}"
if ! command -v node > /dev/null 2>&1; then
    echo -e "${RED}✗ Node.js tidak ditemukan! Instal Node.js 18+ terlebih dahulu.${NC}"
    echo -e "${YELLOW}  → https://nodejs.org${NC}"
    exit 1
fi
NODE_VERSION=$(node -v)
echo -e "${GREEN}✓ Node.js terdeteksi: ${NODE_VERSION}${NC}"

# 2. Cek PostgreSQL
echo -e "\n${BLUE}[2/5] Memeriksa status PostgreSQL...${NC}"
if command -v pg_isready > /dev/null 2>&1; then
    if pg_isready -q; then
        echo -e "${GREEN}✓ PostgreSQL aktif dan siap menerima koneksi.${NC}"
    else
        echo -e "${YELLOW}⚠ PostgreSQL belum aktif. Mencoba menyalakan service postgresql...${NC}"
        sudo systemctl start postgresql 2>/dev/null || systemctl start postgresql 2>/dev/null || true
        sleep 2
        if pg_isready -q; then
            echo -e "${GREEN}✓ PostgreSQL berhasil dinyalakan.${NC}"
        else
            echo -e "${RED}✗ PostgreSQL gagal diakses. Pastikan database server aktif di port 5432.${NC}"
            echo -e "${YELLOW}Silakan jalankan: sudo systemctl start postgresql${NC}"
            exit 1
        fi
    fi
else
    echo -e "${YELLOW}pg_isready tidak ditemukan. Melewati pengecekan service postgresql.${NC}"
fi

# 3. Pastikan file .env ada
echo -e "\n${BLUE}[3/5] Memeriksa konfigurasi Environment (.env)...${NC}"
if [ ! -f .env ]; then
    if [ -f .env.example ]; then
        echo -e "${YELLOW}⚠ File .env tidak ditemukan. Menyalin dari .env.example...${NC}"
        cp .env.example .env
        echo -e "${RED}⚠ PENTING: Edit file .env dan sesuaikan DATABASE_URL dan JWT_SECRET sebelum melanjutkan!${NC}"
        echo -e "${YELLOW}  Buka file: nano .env${NC}"
        read -p "Tekan Enter untuk melanjutkan setelah mengedit .env, atau Ctrl+C untuk membatalkan..."
    else
        echo -e "${RED}✗ File .env tidak ditemukan!${NC}"
        echo -e "${YELLOW}Salin .env.example ke .env dan sesuaikan konfigurasi:${NC}"
        echo -e "  cp .env.example .env && nano .env"
        exit 1
    fi
else
    echo -e "${GREEN}✓ File .env terdeteksi.${NC}"
fi

# 4. Install dependencies jika node_modules belum ada
if [ ! -d node_modules ]; then
    echo -e "\n${BLUE}[4/5] Menginstal dependencies (npm install)...${NC}"
    npm ci --omit=dev 2>/dev/null || npm install --omit=dev
    echo -e "${GREEN}✓ Dependencies terinstal.${NC}"
else
    echo -e "\n${BLUE}[4/5] node_modules sudah ada, melewati install.${NC}"
fi

# 5. Sinkronisasi Skema Database Prisma & Seeding Awal
echo -e "\n${BLUE}[5/5] Sinkronisasi skema database Prisma...${NC}"
DB_URL_VAL=$(grep -E '^[[:space:]]*DATABASE_URL=' .env | head -n 1 | cut -d '=' -f2- | tr -d '"' | tr -d "'" | tr -d '[:space:]')

if [[ "$DB_URL_VAL" == postgres* ]]; then
    echo -e "${GREEN}✓ Mode PostgreSQL terdeteksi.${NC}"
    npx prisma db push --skip-generate
    npx prisma generate
    echo -e "${BLUE}Menyiapkan data awal (admin & pamong default)...${NC}"
    npx tsx prisma/seed.ts 2>/dev/null || npx ts-node --esm prisma/seed.ts 2>/dev/null || echo -e "${YELLOW}Data seed sudah ada atau dilewati.${NC}"
else
    echo -e "${GREEN}✓ Mode SQLite Bawaan (storage/database.sqlite) terdeteksi.${NC}"
    mkdir -p storage
    if [ ! -f storage/database.sqlite ] && [ -f storage/database.sqlite.default ]; then
        cp storage/database.sqlite.default storage/database.sqlite
        echo -e "${GREEN}✓ storage/database.sqlite berhasil disalin dari template bawaan.${NC}"
    fi
    mkdir -p node_modules/@prisma/client/runtime
    [ -f node_modules/@prisma/client/runtime/library.d.mts ] && cp -n node_modules/@prisma/client/runtime/library.d.mts node_modules/@prisma/client/runtime/library.d.ts 2>/dev/null || true
    [ -f node_modules/@prisma/client/runtime/client.d.mts ] && cp -n node_modules/@prisma/client/runtime/client.d.mts node_modules/@prisma/client/runtime/client.d.ts 2>/dev/null || true
    [ -f node_modules/@prisma/client/runtime/index-browser.d.mts ] && cp -n node_modules/@prisma/client/runtime/index-browser.d.mts node_modules/@prisma/client/runtime/index-browser.d.ts 2>/dev/null || true
    SQLITE_DATABASE_URL="file:./storage/database.sqlite" npx prisma generate --schema=prisma/schema.sqlite.prisma
fi

LOCAL_IP=$(hostname -I 2>/dev/null | awk '{print $1}')
if [ -z "$LOCAL_IP" ]; then
    LOCAL_IP="localhost"
fi

# 6. Tampilkan Informasi Login & Jalankan Aplikasi
echo -e "\n${GREEN}${BOLD}==========================================================${NC}"
echo -e "${GREEN}${BOLD}  APLIKASI SIAP DIJALANKAN!                              ${NC}"
echo -e "${GREEN}${BOLD}==========================================================${NC}"
echo -e "${CYAN}Informasi Akses Sistem:${NC}"
echo -e "  💻 Di Laptop / PC  : ${BOLD}http://localhost:3000${NC}"
echo -e "  📱 Di Smartphone   : ${BOLD}http://${LOCAL_IP}:3000${NC}"
echo -e "     (Tips GPS HP    : Gunakan tombol 'Simulasi Titik Kantor' atau jalankan via HTTPS)"
echo -e "  🔒 Mode HTTPS HP   : ${BOLD}npm run dev:https${NC} -> ${BOLD}https://${LOCAL_IP}:3000${NC}"
echo -e ""
echo -e "${YELLOW}Akun Login Default (Username / NIP):${NC}"
echo -e "  👤 ${BOLD}Administrator${NC}:"
echo -e "     Username/NIP : ${BOLD}admin${NC}"
echo -e "     Password     : ${BOLD}1234${NC}"
echo -e "     Akses        : Kelola Pegawai, Jam Kerja, Radius Lokasi"
echo -e ""
echo -e "  👤 ${BOLD}Pamong / Pegawai 1${NC}:"
echo -e "     Username/NIP : ${BOLD}198501012010011001${NC} (Budi Santoso)"
echo -e "     Password     : ${BOLD}1234${NC}"
echo -e "     Akses        : Absensi Online (GPS), Kegiatan Harian, Laporan Kinerja"
echo -e "${GREEN}----------------------------------------------------------${NC}"

if [ "$1" == "--prod" ]; then
    echo -e "${CYAN}Membangun aplikasi untuk production (npm run build)...${NC}\n"
    npm run build
    if [ $? -ne 0 ]; then
        echo -e "${RED}✗ Build gagal! Periksa error di atas.${NC}"
        exit 1
    fi
    echo -e "${GREEN}✓ Build berhasil!${NC}"
    echo -e "${CYAN}Menjalankan server Production (port 3000)...${NC}\n"
    npm run start
elif [ "$1" == "--https" ]; then
    echo -e "${GREEN}Menjalankan server dalam Mode HTTPS untuk akses smartphone...${NC}"
    npm run dev:https
else
    echo -e "${CYAN}Menjalankan server Next.js (tekan CTRL+C untuk berhenti)...${NC}\n"
    npm run dev
fi
