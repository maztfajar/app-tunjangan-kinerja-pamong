#!/usr/bin/env node

// ==============================================================================
// SETUP-DB.JS - Wizard Interaktif Konfigurasi Database PostgreSQL
// Mendukung:
// 1. Database Lokal di Web Hosting (cPanel / VPS / Localhost)
// 2. Database Cloud Supabase (Supabase.com)
// 3. Database Cloud PostgreSQL Lainnya (Neon, Railway, dll)
// Otomatis: Uji koneksi, simpan ke .env, buat seluruh tabel & seeder awal
// Jalankan dengan: node setup-db.js atau npm run db:setup
// ==============================================================================

const fs = require('fs');
const path = require('path');
const readline = require('readline');
const { PrismaClient } = require('@prisma/client');
const { initDb } = require('./prisma/init-db');
const { seedDatabase } = require('./prisma/seed');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function ask(question, defaultValue = '') {
  const promptText = defaultValue ? `${question} [default: ${defaultValue}]: ` : `${question}: `;
  return new Promise((resolve) => {
    rl.question(promptText, (ans) => {
      const trimmed = ans.trim();
      resolve(trimmed || defaultValue);
    });
  });
}

function updateEnvFile(newDatabaseUrl) {
  const envPath = path.resolve(__dirname, '.env');
  const examplePath = path.resolve(__dirname, '.env.example');

  let content = '';
  if (fs.existsSync(envPath)) {
    content = fs.readFileSync(envPath, 'utf8');
  } else if (fs.existsSync(examplePath)) {
    content = fs.readFileSync(examplePath, 'utf8');
  } else {
    content = 'DATABASE_URL=""\nJWT_SECRET="ganti-dengan-string-rahasia-32-karakter"\nSUPERADMIN_USER="root"\nSUPERADMIN_PASS="root"\n';
  }

  // Ganti atau tambahkan DATABASE_URL
  const regex = /^DATABASE_URL=.*$/m;
  const newEntry = `DATABASE_URL="${newDatabaseUrl}"`;

  if (regex.test(content)) {
    content = content.replace(regex, newEntry);
  } else {
    content = `${newEntry}\n${content}`;
  }

  fs.writeFileSync(envPath, content, 'utf8');
  process.env.DATABASE_URL = newDatabaseUrl;
  console.log('✅ File .env berhasil diperbarui dengan DATABASE_URL baru.');
}

async function testAndMigrate(dbUrl) {
  console.log('\n----------------------------------------------------');
  console.log('⏳ Menguji koneksi ke database...');

  // Sensor password saat cetak
  let masked = dbUrl;
  try {
    const u = new URL(dbUrl);
    if (u.password) masked = dbUrl.replace(`:${u.password}@`, ':********@');
  } catch {
    masked = dbUrl.replace(/:\/\/([^:]+):([^@]+)@/, '://$1:********@');
  }
  console.log(`📡 Target: ${masked}`);

  const testPrisma = new PrismaClient({
    datasources: { db: { url: dbUrl } },
  });

  try {
    await testPrisma.$connect();
    console.log('✅ Berhasil terhubung ke server database PostgreSQL!');
  } catch (err) {
    console.error('\n❌ GAGAL TERHUBUNG KE DATABASE!');
    console.error(`   Pesan error: ${err.message}`);
    console.log('\n💡 Silakan periksa kembali Host, Port, Username, Password, dan nama Database Anda.');
    await testPrisma.$disconnect();
    return false;
  } finally {
    await testPrisma.$disconnect();
  }

  // Simpan ke .env
  updateEnvFile(dbUrl);

  // Buat tabel otomatis
  console.log('\n⏳ Membuat & memverifikasi struktur seluruh tabel database...');
  try {
    const result = await initDb({ silent: false });
    console.log(`✅ Sukses! ${result.count} instruksi struktur tabel berhasil dieksekusi.`);
  } catch (err) {
    console.error('❌ Gagal membuat tabel otomatis:', err.message);
    return false;
  }

  // Isi seeder data awal jika kosong
  console.log('\n⏳ Menyiapkan data awal (Admin, Pamong, Jam Kerja, Kop Dokumen)...');
  try {
    await seedDatabase({ silent: false });
    console.log('✅ Seeding data awal berhasil.');
  } catch (err) {
    console.warn('⚠️  Catatan seeding (data mungkin sudah ada):', err.message);
  }

  console.log('\n====================================================');
  console.log('🎉 SETUP DATABASE SELESAI & DATABASE SIAP DIGUNAKAN!');
  console.log('====================================================');
  console.log('Akun Default:');
  console.log('  • Admin NIP    : admin  | Password: 1234');
  console.log('  • Superadmin   : root   | Password: root (atau sesuai SUPERADMIN_PASS di .env)');
  console.log('  • Pegawai NIP  : 198501012010011001 | Password: 1234');
  console.log('====================================================\n');
  return true;
}

// ─── OPSI 1: Database Lokal Hosting (cPanel / VPS / Localhost) ─────────────────
async function handleOptionLocal() {
  console.log('\n--- [OPSI 1] Database Lokal Web Hosting / cPanel / VPS ---');
  console.log('Informasi: Di cPanel, buat Database & User via "PostgreSQL Databases" / "PostgreSQL Database Wizard".');

  const host = await ask('1. Database Host', 'localhost');
  const port = await ask('2. Database Port', '5432');
  const dbName = await ask('3. Nama Database (di cPanel contoh: cpaneluser_absensi)');
  if (!dbName) {
    console.error('❌ Nama database tidak boleh kosong!');
    return;
  }
  const user = await ask('4. Username Database (di cPanel contoh: cpaneluser_dbuser)');
  if (!user) {
    console.error('❌ Username database tidak boleh kosong!');
    return;
  }
  const pass = await ask('5. Password Database');

  const encodedPass = encodeURIComponent(pass);
  const dbUrl = `postgresql://${user}:${encodedPass}@${host}:${port}/${dbName}?schema=public`;

  await testAndMigrate(dbUrl);
}

// ─── OPSI 2: Database Cloud Supabase ──────────────────────────────────────────
async function handleOptionSupabase() {
  console.log('\n--- [OPSI 2] Database Cloud Supabase (Supabase.com) ---');
  console.log('Pilih metode pengisian data Supabase:');
  console.log('  [A] Salin-tempel Connection String URI Supabase langsung (Rekomendasi)');
  console.log('  [B] Masukkan Project Reference ID (atau URL) + Password Database');

  const subOpt = (await ask('Pilihan Anda (A/B)', 'A')).toUpperCase();

  if (subOpt === 'B') {
    let projectRef = await ask('1. Project Reference ID atau Project URL (contoh: xyzabcdefgh atau https://xyzabcdefgh.supabase.co)');
    if (!projectRef) {
      console.error('❌ Project Reference ID tidak boleh kosong!');
      return;
    }
    // Jika user memasukkan URL lengkap, ekstrak subdomain ID-nya
    if (projectRef.startsWith('http://') || projectRef.startsWith('https://')) {
      try {
        const u = new URL(projectRef);
        projectRef = u.hostname.split('.')[0];
      } catch {
        projectRef = projectRef.replace(/^https?:\/\//, '').split('.')[0];
      }
    }

    const pass = await ask('2. Database Password (password yang Anda buat saat membuat project di Supabase)');
    const region = await ask('3. Supabase Region Pooler (ap-southeast-1 = Singapore)', 'ap-southeast-1');

    const encodedPass = encodeURIComponent(pass);
    // Port 5432 session pooler: kompatibel sempurna dengan Prisma & serverless/standalone
    const dbUrl = `postgresql://postgres.${projectRef}:${encodedPass}@aws-0-${region}.pooler.supabase.com:5432/postgres?sslmode=require`;

    await testAndMigrate(dbUrl);
  } else {
    console.log('\nTips: Di dashboard Supabase, buka:');
    console.log('👉 Project Settings -> Database -> Connection string -> URI');
    console.log('👉 Pilih "Session" (port 5432) atau "Direct"');
    console.log('Contoh format:');
    console.log('postgresql://postgres.xxx:[YOUR-PASSWORD]@aws-0-ap-southeast-1.pooler.supabase.com:5432/postgres?sslmode=require\n');

    let dbUrl = await ask('Masukkan Connection String URI Supabase Anda');
    if (!dbUrl) {
      console.error('❌ Connection String tidak boleh kosong!');
      return;
    }

    // Pastikan sslmode=require terpasang
    if (!dbUrl.includes('sslmode=')) {
      const sep = dbUrl.includes('?') ? '&' : '?';
      dbUrl = `${dbUrl}${sep}sslmode=require`;
    }

    await testAndMigrate(dbUrl);
  }
}

// ─── OPSI 3: Database Cloud PostgreSQL Lainnya ────────────────────────────────
async function handleOptionOtherCloud() {
  console.log('\n--- [OPSI 3] Database Cloud PostgreSQL Lainnya (Neon, Railway, dll) ---');
  let dbUrl = await ask('Masukkan Connection String URI PostgreSQL');
  if (!dbUrl) {
    console.error('❌ Connection String tidak boleh kosong!');
    return;
  }

  if (!dbUrl.includes('sslmode=') && !dbUrl.includes('localhost') && !dbUrl.includes('127.0.0.1')) {
    const sep = dbUrl.includes('?') ? '&' : '?';
    dbUrl = `${dbUrl}${sep}sslmode=require`;
  }

  await testAndMigrate(dbUrl);
}

// ─── OPSI 4: Uji Database Saat Ini di .env ─────────────────────────────────────
async function handleOptionTestCurrent() {
  console.log('\n--- [OPSI 4] Uji Koneksi Database Saat Ini (.env) ---');
  const envPath = path.resolve(__dirname, '.env');
  if (!fs.existsSync(envPath)) {
    console.error('❌ File .env belum ditemukan!');
    return;
  }

  // Muat .env
  const envContent = fs.readFileSync(envPath, 'utf8');
  let currentUrl = '';
  envContent.split(/\r?\n/).forEach((line) => {
    const trimmed = line.trim();
    if (trimmed.startsWith('DATABASE_URL=')) {
      let v = trimmed.replace('DATABASE_URL=', '').trim();
      if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
        v = v.slice(1, -1);
      }
      currentUrl = v;
    }
  });

  if (!currentUrl) {
    console.error('❌ DATABASE_URL belum diatur di dalam file .env!');
    return;
  }

  await testAndMigrate(currentUrl);
}

// ─── MENU UTAMA ───────────────────────────────────────────────────────────────
async function main() {
  console.clear();
  console.log('====================================================');
  console.log('🛠️  WIZARD KONFIGURASI DATABASE (POSTGRESQL)');
  console.log('   App Tunjangan Kinerja Pamong - Kapanewon Pengasih');
  console.log('====================================================\n');
  console.log('Silakan pilih opsi database yang ingin Anda gunakan:');
  console.log('  [1] OPSI 1: Database Lokal di Web Hosting (cPanel / VPS / localhost)');
  console.log('  [2] OPSI 2: Database Cloud Supabase (Supabase.com - Postgres)');
  console.log('  [3] OPSI 3: Database Cloud PostgreSQL Lainnya (Neon, Railway, RDS)');
  console.log('  [4] OPSI 4: Uji Koneksi & Sinkronkan Database Saat Ini (.env)');
  console.log('  [0] Keluar\n');

  const choice = await ask('Pilihan Anda (0/1/2/3/4)', '4');

  switch (choice) {
    case '1':
      await handleOptionLocal();
      break;
    case '2':
      await handleOptionSupabase();
      break;
    case '3':
      await handleOptionOtherCloud();
      break;
    case '4':
      await handleOptionTestCurrent();
      break;
    case '0':
      console.log('Sampai jumpa!');
      break;
    default:
      console.log('Pilihan tidak valid.');
  }

  rl.close();
}

main().catch((err) => {
  console.error('\n❌ Terjadi kesalahan:', err);
  rl.close();
  process.exit(1);
});
