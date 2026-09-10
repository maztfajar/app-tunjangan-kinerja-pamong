// ==============================================================================
// SERVER.JS - Entry Point Standalone untuk cPanel Shared Hosting & Phusion Passenger
// Mode: Next.js Standalone (output: 'standalone')
// Bebas dari pemanggilan 'lsof', bebas dari loop restart cepat (Anti-508)
// Fitur: Auto-Initialization Database (Otomatis Buat Tabel saat Pertama Kali Dijalankan)
// ==============================================================================

const http = require('http');
const path = require('path');
const fs = require('fs');

// 1. Tangkap exception yang tidak tertangani agar tercatat di log dan tidak mematikan server secara agresif
process.on('uncaughtException', (err) => {
  console.error('[server.js] Uncaught Exception:', err);
});
process.on('unhandledRejection', (reason) => {
  console.error('[server.js] Unhandled Rejection:', reason);
});

// 2. Baca file .env secara mandiri (Phusion Passenger di cPanel sering tidak menginjeksi env)
function loadEnv(filePath) {
  if (fs.existsSync(filePath)) {
    try {
      const envContent = fs.readFileSync(filePath, 'utf8');
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
      console.log(`[server.js] Berhasil memuat variabel lingkungan dari: ${path.basename(filePath)}`);
    } catch (err) {
      console.warn(`[server.js] Peringatan membaca ${path.basename(filePath)}:`, err.message);
    }
  }
}
loadEnv(path.resolve(__dirname, '.env'));
loadEnv(path.resolve(__dirname, '.env.local'));

// 3. Set environment production & direktori kerja
process.env.NODE_ENV = 'production';
process.chdir(__dirname);

// 4. Injeksi konfigurasi Next.js standalone dari required-server-files.json
const requiredServerFilesPath = path.join(__dirname, '.next/required-server-files.json');
let nextConfig = {};
if (fs.existsSync(requiredServerFilesPath)) {
  try {
    const requiredFiles = JSON.parse(fs.readFileSync(requiredServerFilesPath, 'utf8'));
    nextConfig = requiredFiles.config || {};
    process.env.__NEXT_PRIVATE_STANDALONE_CONFIG = JSON.stringify(nextConfig);
  } catch (err) {
    console.warn('[server.js] Peringatan membaca required-server-files.json:', err.message);
  }
}

// 5. Tentukan target listen (port TCP atau Unix domain socket dari Phusion Passenger)
const rawPort = process.env.PORT || '3000';
const isNumericPort = /^\d+$/.test(rawPort);
const listenTarget = isNumericPort ? parseInt(rawPort, 10) : rawPort;

if (!process.env.DATABASE_URL) {
  console.warn('[server.js] ⚠️  PERINGATAN: DATABASE_URL belum terisi di file .env!');
}

// 6. Buat HTTP server native Node.js
let nextHandler = null;
let nextUpgradeHandler = null;
let initError = null;
let initResolver = null;
const initPromise = new Promise((resolve) => {
  initResolver = resolve;
});

const server = http.createServer(async (req, res) => {
  try {
    if (!nextHandler) {
      if (initError) {
        res.statusCode = 500;
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        return res.end(`
          <div style="font-family: sans-serif; padding: 2rem; max-width: 600px; margin: auto;">
            <h2>500 - Server Initialization Error</h2>
            <p>Aplikasi gagal menginisialisasi rute Next.js.</p>
            <pre style="background: #f4f4f4; padding: 1rem; border-radius: 6px;">${initError.message}</pre>
            <p>Silakan periksa <code>stderr.log</code> di folder root aplikasi Anda melalui File Manager cPanel.</p>
          </div>
        `);
      }

      // Tunggu hingga Next.js siap (maks 15 detik)
      await Promise.race([
        initPromise,
        new Promise((_, reject) => setTimeout(() => reject(new Error('Server boot timeout')), 15000))
      ]);
    }

    if (nextHandler) {
      return await nextHandler(req, res);
    } else {
      res.statusCode = 503;
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      return res.end(`
        <div style="font-family: sans-serif; padding: 2rem; text-align: center;">
          <h2>503 - Aplikasi Sedang Memulai</h2>
          <p>Sedang memuat sistem dan dependensi. Silakan segarkan (refresh) halaman ini dalam beberapa detik...</p>
        </div>
      `);
    }
  } catch (err) {
    console.error('[server.js] Request handling error:', err);
    if (!res.headersSent) {
      res.statusCode = 500;
      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      res.end('500 Internal Server Error');
    }
  }
});

// Penanganan WebSocket / Upgrade requests
server.on('upgrade', (req, socket, head) => {
  if (nextUpgradeHandler) {
    try {
      nextUpgradeHandler(req, socket, head);
    } catch (err) {
      console.error('[server.js] WebSocket upgrade error:', err);
      socket.destroy();
    }
  } else {
    socket.destroy();
  }
});

// Penanganan error listen
server.on('error', (err) => {
  console.error('[server.js] ❌ HTTP Server Listen Error:', err);
});

// Penanganan sinyal shutdown yang ramah (Graceful Shutdown)
const gracefulShutdown = (signal) => {
  console.log(`[server.js] Menerima sinyal ${signal}. Menutup server secara aman...`);
  server.close(() => {
    console.log('[server.js] Server berhasil ditutup.');
    process.exit(0);
  });
  setTimeout(() => process.exit(0), 5000).unref();
};
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// 7. Mulai mendengarkan (CRITICAL: Jangan menyertakan argumen '0.0.0.0' agar Phusion Passenger bisa me-routing IPC/socket)
server.listen(listenTarget, () => {
  console.log(`[server.js] ✅ Server aktif dan mendengarkan di: ${listenTarget}`);
  console.log(`[server.js] Mode: Next.js Standalone (Passenger Compatible)`);
});

// 8. Inisialisasi Next.js Request Handlers di latar belakang
(async () => {
  try {
    let startServerModule;
    try {
      startServerModule = require('next/dist/server/lib/start-server');
    } catch (e) {
      startServerModule = require(path.join(__dirname, 'node_modules/next/dist/server/lib/start-server'));
    }

    const handlers = await startServerModule.getRequestHandlers({
      dir: __dirname,
      port: isNumericPort ? listenTarget : 3000,
      isDev: false,
      server,
      hostname: 'localhost',
      minimalMode: false,
      quiet: true,
    });

    nextHandler = handlers.requestHandler;
    nextUpgradeHandler = handlers.upgradeHandler;
    initResolver();
    console.log('[server.js] 🚀 Next.js engine berhasil diinisialisasi & siap melayani!');

    // Jalankan auto-inisialisasi database di latar belakang setelah Next.js siap
    autoInitDatabase();
  } catch (err) {
    initError = err;
    initResolver();
    console.error('[server.js] ❌ Gagal menginisialisasi Next.js:', err);
  }
})();

// 9. Auto-Inisialisasi Database Otomatis (Zero-Touch: Otomatis Buat Tabel & Akun Default)
async function autoInitDatabase() {
  if (!process.env.DATABASE_URL) {
    console.warn('[server.js] ⚠️  Auto-Init Database dilewati: DATABASE_URL belum diatur pada .env.');
    return;
  }

  try {
    console.log('[server.js] 🔍 Memeriksa status tabel database...');
    const { PrismaClient } = require('@prisma/client');
    const prisma = new PrismaClient();

    let needsInit = false;
    let userCount = 0;

    try {
      await prisma.$connect();
      userCount = await prisma.user.count();
    } catch (dbErr) {
      const msg = dbErr.message || '';
      if (msg.includes('does not exist') || msg.includes('relation') || msg.includes('P2021')) {
        needsInit = true;
      } else {
        console.warn('[server.js] ⚠️  Peringatan query awal database:', msg.split('\n')[0]);
      }
    }

    if (needsInit) {
      console.log('[server.js] ⚡ Tabel belum terdeteksi. Memulai pembuatan struktur tabel otomatis...');
      try {
        const { initDb } = require('./prisma/init-db');
        await initDb({ silent: true });
        console.log('[server.js] ✅ Seluruh tabel database berhasil dibuat secara otomatis!');
      } catch (initErr) {
        console.warn('[server.js] ⚠️  Gagal menjalankan initDb otomatis:', initErr.message);
      }

      // Seeding akun awal & pengaturan default
      try {
        const { seedDatabase } = require('./prisma/seed');
        await seedDatabase({ silent: true });
        console.log('[server.js] ✅ Akun default (Admin & Pamong) dan pengaturan kop berhasil disematkan!');
      } catch (seedErr) {
        console.warn('[server.js] ⚠️  Catatan seeder otomatis:', seedErr.message);
      }
    } else {
      console.log(`[server.js] ✅ Database aktif & normal (Terdeteksi ${userCount} pengguna).`);

      // Pastikan tabel baru (jika ada pembaruan versi) dan kolom baru tersinkronisasi
      try {
        const { initDb } = require('./prisma/init-db');
        await initDb({ silent: true });
      } catch {
        // Abaikan jika sudah tersinkronisasi
      }
    }

    await prisma.$disconnect();
  } catch (err) {
    console.warn('[server.js] ⚠️  Peringatan saat auto-init database:', err.message);
  }
}
