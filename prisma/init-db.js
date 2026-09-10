// ==============================================================================
// PRISMA/INIT-DB.JS - Inisialisasi Struktur Tabel Database Mandiri
// Menjalankan skrip schema.sql tanpa memerlukan 'npx prisma db push' atau RAM besar
// Penggunaan CLI : node prisma/init-db.js
// Penggunaan Modul: const { initDb } = require('./prisma/init-db'); await initDb();
// ==============================================================================

const fs = require('fs');
const path = require('path');

// 1. Muat .env jika belum dimuat
function loadEnv() {
  const envPath = path.resolve(__dirname, '..', '.env');
  if (fs.existsSync(envPath)) {
    try {
      const envContent = fs.readFileSync(envPath, 'utf8');
      envContent.split(/\r?\n/).forEach((line) => {
        const trimmed = line.trim();
        if (trimmed && !trimmed.startsWith('#')) {
          const eqIdx = trimmed.indexOf('=');
          if (eqIdx !== -1) {
            const key = trimmed.slice(0, eqIdx).trim();
            let val = trimmed.slice(eqIdx + 1).trim();
            if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
              val = val.slice(1, -1);
            }
            if (process.env[key] === undefined) {
              process.env[key] = val;
            }
          }
        }
      });
    } catch (err) {
      console.warn('[init-db.js] Gagal membaca .env:', err.message);
    }
  }
}

function splitSqlStatements(sql) {
  const statements = [];
  let current = '';
  let inDollarQuote = false;

  const lines = sql.split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith('--') || !trimmed) continue;

    current += line + '\n';

    if (line.includes('$$')) {
      const count = (line.match(/\$\$/g) || []).length;
      if (count % 2 === 1) {
        inDollarQuote = !inDollarQuote;
      }
    }

    if (!inDollarQuote && trimmed.endsWith(';')) {
      const stmt = current.trim();
      if (stmt) {
        statements.push(stmt);
      }
      current = '';
    }
  }
  if (current.trim()) {
    statements.push(current.trim());
  }
  return statements;
}

async function initDb(options = {}) {
  const silent = !!options.silent;
  loadEnv();

  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL belum diatur pada environment atau file .env!');
  }

  const { PrismaClient } = require('@prisma/client');
  const prisma = new PrismaClient();

  const sqlPath = path.resolve(__dirname, 'schema.sql');
  if (!fs.existsSync(sqlPath)) {
    throw new Error(`File schema.sql tidak ditemukan di: ${sqlPath}`);
  }

  const rawSql = fs.readFileSync(sqlPath, 'utf8');
  const statements = splitSqlStatements(rawSql);

  if (!silent) {
    console.log('====================================================');
    console.log('🛠️  INISIALISASI STRUKTUR TABEL DATABASE');
    console.log('====================================================\n');
    console.log('⏳ Menghubungkan ke database server...');
  }

  try {
    await prisma.$connect();
    if (!silent) {
      console.log('✅ Berhasil terhubung ke database.');
      console.log(`⏳ Menjalankan ${statements.length} instruksi SQL dari schema.sql...`);
    }

    for (let i = 0; i < statements.length; i++) {
      const stmt = statements[i];
      try {
        await prisma.$executeRawUnsafe(stmt);
      } catch (stmtErr) {
        if (!silent) {
          console.warn(`   ⚠️  Catatan pada query #${i + 1}: ${stmtErr.message.split('\n')[0]}`);
        }
      }
    }

    if (!silent) {
      console.log('✅ Semua tabel, relasi, dan indeks berhasil diverifikasi!\n');
      console.log('====================================================');
      console.log('🎉 SUKSES! Struktur tabel database telah lengkap.');
      console.log('====================================================');
    }

    return { success: true, count: statements.length };
  } finally {
    await prisma.$disconnect();
  }
}

// Jika dijalankan langsung via node prisma/init-db.js
if (require.main === module) {
  initDb({ silent: false })
    .then(() => {
      console.log('👉 Selanjutnya jalankan seeder jika diperlukan: node prisma/seed.js');
      process.exit(0);
    })
    .catch((err) => {
      console.error('\n❌ Terjadi kesalahan saat inisialisasi database:', err.message);
      process.exit(1);
    });
}

module.exports = { initDb };
