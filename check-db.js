// ==============================================================================
// CHECK-DB.JS - Alat Diagnostik Komprehensif Database PostgreSQL
// Memeriksa status koneksi, provider (Local / Supabase / Neon), dan seluruh tabel
// Jalankan via Terminal hosting: node check-db.js
// ==============================================================================

const fs = require('fs');
const path = require('path');

console.log('====================================================');
console.log('🔍 DIAGNOSTIK KONEKSI & TABEL DATABASE POSTGRESQL');
console.log('   App Tunjangan Kinerja Pamong - Kapanewon Pengasih');
console.log('====================================================\n');

// 1. Baca file .env
const envPath = path.resolve(__dirname, '.env');
if (fs.existsSync(envPath)) {
  console.log('✅ File .env ditemukan.');
  try {
    const envContent = fs.readFileSync(envPath, 'utf8');
    envContent.split(/\r?\n/).forEach((line) => {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#')) {
        const eqIdx = trimmed.indexOf('=');
        if (eqIdx !== -1) {
          const key = trimmed.slice(0, eqIdx).trim();
          let val = trimmed.slice(eqIdx + 1).trim();
          if (
            (val.startsWith('"') && val.endsWith('"')) ||
            (val.startsWith("'") && val.endsWith("'"))
          ) {
            val = val.slice(1, -1);
          }
          if (process.env[key] === undefined) {
            process.env[key] = val;
          }
        }
      }
    });
  } catch (err) {
    console.warn('⚠️  Peringatan: Gagal membaca isi .env:', err.message);
  }
} else {
  console.warn('⚠️  Peringatan: File .env belum ditemukan di direktori aplikasi!');
  console.warn('   Gunakan wizard untuk konfigurasi otomatis: node setup-db.js');
}

// 2. Periksa DATABASE_URL
const dbUrl = process.env.DATABASE_URL;
if (!dbUrl) {
  console.log('ℹ️  DATABASE_URL tidak diset di .env.');
  console.log('📁 Menjalankan diagnostik untuk Mode File Storage Hosting (SQLite: storage/database.sqlite)...\n');
  
  const storageDir = path.resolve(__dirname, 'storage');
  const dbPath = path.resolve(storageDir, 'database.sqlite');
  if (!fs.existsSync(dbPath)) {
    const defaultDb = path.resolve(storageDir, 'database.sqlite.default');
    if (fs.existsSync(defaultDb)) {
      fs.copyFileSync(defaultDb, dbPath);
      console.log('✅ Berhasil menyalin database.sqlite dari template bawaan.');
    } else {
      console.error('❌ File storage/database.sqlite belum ada.');
      process.exit(1);
    }
  }

  let SqliteClient;
  try {
    SqliteClient = require('@prisma/client-sqlite').PrismaClient;
  } catch {
    SqliteClient = require('@prisma/client').PrismaClient;
  }
  const prismaSqlite = new SqliteClient({
    datasources: { db: { url: `file:${dbPath}` } }
  });

  (async () => {
    try {
      await prismaSqlite.$connect();
      console.log('✅ Terhubung ke storage/database.sqlite dengan sukses!\n');
      const userCount = await prismaSqlite.user.count();
      const settings = await prismaSqlite.appSettings.findFirst();
      const jam = await prismaSqlite.jamKerja.findFirst();
      const lokasi = await prismaSqlite.lokasiKantor.findFirst();

      console.log('📊 STATUS STORAGE DATABASE SQLITE:');
      console.log(`   ✓ Pengguna Terdaftar : ${userCount} akun`);
      console.log(`   ✓ Nama Aplikasi      : ${settings?.namaApp || 'E-KINERJA'}`);
      console.log(`   ✓ Jam Kerja          : ${jam?.jamMasuk || '07:30'} - ${jam?.jamPulang || '15:45'}`);
      console.log(`   ✓ Lokasi Kantor      : ${lokasi?.namaLokasi || 'Kapanewon Pengasih'}`);
      console.log('\n====================================================');
      console.log('🎉 SEMUA PEMERIKSAAN SUKSES! APLIKASI SIAP DIGUNAKAN.');
      console.log('====================================================');
    } catch (e) {
      console.error('❌ Terjadi kesalahan saat memeriksa SQLite:', e.message);
    } finally {
      await prismaSqlite.$disconnect();
    }
  })();
  return;
}

// Sensor password pada URL saat dicetak ke layar
let maskedUrl = dbUrl;
let hostName = 'unknown';
try {
  const urlObj = new URL(dbUrl);
  hostName = urlObj.hostname;
  if (urlObj.password) {
    maskedUrl = dbUrl.replace(`:${urlObj.password}@`, ':********@');
  }
} catch {
  maskedUrl = dbUrl.replace(/:\/\/([^:]+):([^@]+)@/, '://$1:********@');
}

// Deteksi Provider Database
let providerName = 'PostgreSQL Server';
if (hostName === 'localhost' || hostName === '127.0.0.1') {
  providerName = 'Database Lokal di Hosting (Localhost / cPanel / VPS)';
} else if (hostName.includes('supabase')) {
  providerName = 'Supabase Cloud PostgreSQL (supabase.com)';
} else if (hostName.includes('neon.tech')) {
  providerName = 'Neon Cloud PostgreSQL (neon.tech)';
} else if (hostName.includes('railway')) {
  providerName = 'Railway Cloud PostgreSQL';
}

console.log(`📌 Tipe Provider : ${providerName}`);
console.log(`📡 URL Target    : ${maskedUrl}\n`);

// Deteksi potensi masalah karakter khusus '@' pada password
const atCount = (dbUrl.split('?')[0].match(/@/g) || []).length;
if (atCount > 1) {
  console.warn('⚠️  PERINGATAN FORMAT URL:');
  console.warn('   Terdeteksi lebih dari 1 tanda "@" sebelum tanda tanya (?) pada DATABASE_URL.');
  console.warn('   Jika password database Anda mengandung karakter "@", harap ubah menjadi "%40" (URL encode).');
  console.warn('   Contoh: jika password "rahasia@123", tulis "rahasia%40123" di dalam URL.\n');
}

// 3. Tes Koneksi menggunakan Prisma Client
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkAllTables() {
  const checks = [
    { name: 'User', fn: () => prisma.user.count() },
    { name: 'LokasiKantor', fn: () => prisma.lokasiKantor.count() },
    { name: 'JamKerja', fn: () => prisma.jamKerja.count() },
    { name: 'Presensi', fn: () => prisma.presensi.count() },
    { name: 'Aktifitas', fn: () => prisma.aktifitas.count() },
    { name: 'Task', fn: () => prisma.task.count() },
    { name: 'Laporan', fn: () => prisma.laporan.count() },
    { name: 'Agenda', fn: () => prisma.agenda.count() },
    { name: 'HariLibur', fn: () => prisma.hariLibur.count() },
    { name: 'AppSettings', fn: () => prisma.appSettings.count() },
    { name: 'MasterJabatan', fn: () => prisma.masterJabatan.count() },
    { name: 'MasterUnitKerja', fn: () => prisma.masterUnitKerja.count() },
    { name: 'KegiatanJabatan', fn: () => prisma.kegiatanJabatan.count() },
    { name: 'm_rencana_kegiatan', fn: () => prisma.rencanaKegiatan.count() },
    { name: 'm_output_kegiatan', fn: () => prisma.outputKegiatan.count() },
    { name: 't_laporan_kinerja', fn: () => prisma.laporanKinerja.count() },
    { name: 'BiometricCredential', fn: () => prisma.biometricCredential.count() },
  ];

  let missingTables = [];
  let tableStats = [];

  for (const item of checks) {
    try {
      const count = await item.fn();
      tableStats.push({ name: item.name, count, ok: true });
    } catch (err) {
      const msg = err.message || '';
      if (msg.includes('does not exist') || msg.includes('relation') || msg.includes('P2021')) {
        missingTables.push(item.name);
      }
      tableStats.push({ name: item.name, count: 0, ok: false, error: msg.split('\n')[0] });
    }
  }

  return { missingTables, tableStats };
}

async function testConnection() {
  try {
    console.log('⏳ Menghubungkan ke database server...');
    await prisma.$connect();
    console.log('✅ Terhubung ke database server dengan sukses!\n');

    console.log('⏳ Memverifikasi seluruh tabel skema aplikasi...');
    const { missingTables, tableStats } = await checkAllTables();

    if (missingTables.length === 0) {
      console.log('✅ SELURUH 17 TABEL APLIKASI TERDETEKSI LENGKAP:');
      tableStats.forEach((t) => {
        console.log(`   ✓ Tabel '${t.name.padEnd(20)}': ${t.count} baris data`);
      });

      console.log('\n====================================================');
      console.log('🎉 SEMUA PEMERIKSAAN SUKSES! DATABASE SIAP DIGUNAKAN.');
      console.log('====================================================');
    } else {
      console.warn(`\n⚠️  PERINGATAN: ${missingTables.length} tabel belum ditemukan di database:`);
      missingTables.forEach((t) => console.warn(`   ✗ ${t}`));

      console.log('\n⚡ INGIN MEMBUAT TABEL SECARA OTOMATIS SEKARANG?');
      console.log('   Jalankan salah satu dari perintah berikut di terminal:');
      console.log('   👉 node prisma/init-db.js  (buat tabel mandiri)');
      console.log('   👉 node setup-db.js        (wizard konfigurasi lengkap)');
    }
  } catch (err) {
    console.error('\n❌ GAGAL TERHUBUNG KE DATABASE!');
    console.error(`   Pesan error: ${err.message}\n`);

    console.log('💡 SARAN TROUBLESHOOTING:');
    if (
      err.message.includes('Authentication failed') ||
      err.message.includes('password authentication failed') ||
      err.message.includes('P1000')
    ) {
      console.log('   👉 Username atau Password database salah.');
      console.log('   👉 Periksa kembali user dan password di cPanel / Supabase.');
    } else if (
      (err.message.includes('database') && err.message.includes('does not exist')) ||
      err.message.includes('P1003')
    ) {
      console.log('   👉 Nama database tidak ditemukan.');
      console.log('   👉 Di cPanel, nama database biasanya diawali prefix username, misal: usercpanel_tukin');
    } else if (
      err.message.includes("Can't reach database server") ||
      err.message.includes('ETIMEDOUT') ||
      err.message.includes('ECONNREFUSED') ||
      err.message.includes('P1001')
    ) {
      console.log('   👉 Server database tidak dapat dijangkau.');
      console.log('   👉 Jika di hosting cPanel, pastikan menggunakan host "localhost" atau "127.0.0.1".');
      console.log('   👉 Jika menggunakan cloud (Supabase/Neon), pastikan menyertakan "?sslmode=require".');
    } else {
      console.log('   👉 Periksa format DATABASE_URL di file .env.');
    }
    console.log('\n💡 Untuk mengatur ulang URL database dengan mudah, jalankan: node setup-db.js\n');
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

testConnection();
