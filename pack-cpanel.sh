#!/bin/bash

# ==============================================================================
# SCRIPT PEMBUATAN PAKET STANDALONE UNTUK WEB HOSTING CPANEL
# App Tunjangan Kinerja Pamong - Mode: Next.js Standalone
# 
# KEUNGGULAN PAKET INI:
# ✅ TIDAK PERLU "npm install" di server hosting
# ✅ Semua dependensi sudah terpaket di dalam (node_modules ~140MB)
# ✅ Ukuran paket lebih kecil dari paket npm install penuh (~400MB)
# ✅ Aman dari error disk quota saat npm install di hosting
# ==============================================================================

set -e

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$DIR"

ZIP_NAME="cpanel-deploy.zip"
AUTO_YES=false
if [[ "$1" == "-y" || "$1" == "--yes" ]]; then
  AUTO_YES=true
fi

echo "================================================================="
echo "📦 MEMPERSIAPKAN PAKET STANDALONE UPLOAD WEB HOSTING / CPANEL"
echo "   (Tidak perlu npm install di hosting!)"
echo "================================================================="
echo ""

# 1. Pastikan file-file penting ada
if [ ! -f "server.js" ] || [ ! -f "app.js" ]; then
  echo "❌ Error: server.js atau app.js tidak ditemukan!"
  exit 1
fi

# 2. Build terlebih dahulu
echo "🔨 Memeriksa build production Next.js (mode standalone)..."
if [ ! -d ".next/standalone" ]; then
  echo "⚡ Folder .next/standalone belum ada. Menjalankan 'npm run build'..."
  npm run build
else
  echo "✅ Folder build .next/standalone sudah ada."
  if [ "$AUTO_YES" = true ]; then
    echo "⚡ Menjalankan fresh 'npm run build' (mode auto)..."
    npm run build
  else
    read -p "Apakah Anda ingin rebuild ulang dari awal? (y/N): " -n 1 -r REPLY_BUILD
    echo ""
    if [[ "$REPLY_BUILD" =~ ^[Yy]$ ]]; then
      echo "⚡ Menjalankan fresh 'npm run build'..."
      npm run build
    fi
  fi
fi

# 3. Verifikasi folder standalone terbuat
if [ ! -d ".next/standalone" ]; then
  echo "❌ Error: Folder .next/standalone tidak ditemukan setelah build!"
  echo "   Pastikan next.config.ts sudah memiliki: output: 'standalone'"
  exit 1
fi

# 4. Salin file static & public ke dalam standalone (diperlukan untuk serving file)
echo ""
echo "📋 Menyalin file statis ke folder standalone..."
mkdir -p .next/standalone/.next/static
cp -r .next/static/. .next/standalone/.next/static/
if [ -d "public" ]; then
  mkdir -p .next/standalone/public
  cp -r public/. .next/standalone/public/
  echo "   ✅ Folder 'public' disalin."
fi
echo "   ✅ File statis Next.js disalin."

# 5. Salin file utilitas ke dalam standalone
echo ""
echo "📋 Menyalin file konfigurasi, storage, dan skrip utilitas..."
cp server.js         .next/standalone/server.js
cp app.js            .next/standalone/app.js
cp check-db.js       .next/standalone/check-db.js
cp setup-db.js       .next/standalone/setup-db.js
cp .env.example      .next/standalone/.env.example
# JANGAN menyalin ke .env agar file .env produksi di hosting tidak tertimpa saat extract!
cp -r prisma         .next/standalone/prisma/
if [ -d "scripts" ]; then
  cp -r scripts      .next/standalone/scripts/
fi

# Salin folder storage (database.sqlite bawaan untuk instant publish)
mkdir -p .next/standalone/storage
if [ -d "storage" ]; then
  cp -r storage/. .next/standalone/storage/
  echo "   ✅ Folder 'storage/' (database.sqlite) disalin untuk instant publish."
fi

# Salin bcryptjs agar node prisma/seed.js bisa berjalan mandiri di hosting
if [ -d "node_modules/bcryptjs" ]; then
  mkdir -p .next/standalone/node_modules/bcryptjs
  cp -r node_modules/bcryptjs/. .next/standalone/node_modules/bcryptjs/
  echo "   ✅ Modul 'bcryptjs' disalin (untuk seeder mandiri)."
fi

# Salin modul @prisma/client-sqlite untuk fallback database hosting
if [ -d "node_modules/@prisma/client-sqlite" ]; then
  mkdir -p .next/standalone/node_modules/@prisma/client-sqlite
  cp -r node_modules/@prisma/client-sqlite/. .next/standalone/node_modules/@prisma/client-sqlite/
  echo "   ✅ Modul '@prisma/client-sqlite' disalin."
fi

# Pastikan binary target engine PostgreSQL juga lengkap di standalone
if [ -d "node_modules/.prisma/client" ]; then
  mkdir -p .next/standalone/node_modules/.prisma/client
  cp -r node_modules/.prisma/client/. .next/standalone/node_modules/.prisma/client/
  echo "   ✅ Modul '.prisma/client' disalin (engine PostgreSQL cPanel/VPS/Cloud)."
fi

echo "   ✅ Seluruh file konfigurasi dan engine database disalin."


# 6. Buat paket ZIP dari folder standalone dengan kompresi maksimal (zip -9)
echo ""
echo "📦 Mengompresi folder standalone menjadi $ZIP_NAME..."
rm -f "$ZIP_NAME"

cd .next/standalone
zip -9 -r "../../$ZIP_NAME" . \
  --exclude ".env" \
  --exclude "*.log" \
  --exclude "*/.DS_Store" \
  --exclude "*/__pycache__/*" \
  --exclude "*.tsbuildinfo" \
  --exclude "*/README.md" \
  --exclude "*/CHANGELOG.md"
cd "$DIR"

ZIP_SIZE=$(du -h "$ZIP_NAME" | cut -f1)

echo ""
echo "================================================================="
echo "🎉 PAKET STANDALONE BERHASIL DIBUAT: $ZIP_NAME ($ZIP_SIZE)"
echo "================================================================="
echo ""
echo "LANGKAH UPLOAD KE CPANEL:"
echo "-----------------------------------------------------------------"
echo "1. cPanel -> Setup Node.js App -> Create Application"
echo "   - Node.js version : 20.x (atau 18.x)"
echo "   - Application mode: Production"
echo "   - Application root: tukin-app (sesuai nama folder Anda)"
echo "   - Application URL : domain/subdomain Anda"
echo "   - Startup file    : server.js (atau app.js)"
echo "   - Klik 'Create'"
echo ""
echo "2. File Manager -> Folder tukin-app -> Upload $ZIP_NAME -> Extract"
echo ""
echo "3. PILIHAN KONFIGURASI DATABASE:"
echo "   Cara A (Wizard Otomatis via Terminal):"
echo "     node setup-db.js"
echo "     (Pilih Opsi 1 untuk DB Lokal cPanel atau Opsi 2 untuk Supabase Cloud)"
echo ""
echo "   Cara B (Manual Edit .env via File Manager):"
echo "     cp .env.example .env lalu edit:"
echo "     - Opsi 1 (Lokal): DATABASE_URL='postgresql://user:pass@localhost:5432/dbname?schema=public'"
echo "     - Opsi 2 (Supabase): DATABASE_URL='postgresql://postgres.ref:pass@aws-0-pooler...:5432/postgres?sslmode=require'"
echo "     - JWT_SECRET & SUPERADMIN_PASS"
echo "     (JANGAN menambahkan PORT=3000 pada file .env!)"
echo ""
echo "4. PEMBUATAN TABEL DATABASE (OTOMATIS):"
echo "   ✅ TABEL DIBUAT SECARA OTOMATIS saat Anda klik 'Restart' aplikasi!"
echo "   (Opsional diagnosa: 'node check-db.js')"
echo ""
echo "5. Setup Node.js App -> Klik 'Restart' -> Buka website Anda!"
echo "================================================================="
