// ==============================================================================
// PRISMA/SEED.JS - Seeder Database Mandiri (JavaScript Murni untuk Web Hosting)
// Dapat dijalankan langsung dengan: node prisma/seed.js
// Atau di-require sebagai modul: const { seedDatabase } = require('./prisma/seed');
// ==============================================================================

const fs = require('fs');
const path = require('path');

// 1. Fallback otomatis membaca .env jika belum dimuat oleh environment
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
    } catch {
      // Abaikan jika gagal baca
    }
  }
}

async function seedDatabase(options = {}) {
  const silent = !!options.silent;
  loadEnv();

  const { PrismaClient } = require('@prisma/client');
  const bcrypt = require('bcryptjs');
  const prisma = new PrismaClient();

  if (!silent) {
    console.log('🌱 Memulai seeding data awal database...');
  }

  try {
    // 1. Seed admin user default
    const hashedPassword = await bcrypt.hash('1234', 10);

    const admin = await prisma.user.upsert({
      where: { nip: 'admin' },
      update: {},
      create: {
        nip: 'admin',
        nama: 'Administrator',
        password: hashedPassword,
        jabatan: 'Admin Sistem',
        unitKerja: 'Kapanewon Pengasih',
        role: 'ADMIN',
      },
    });
    if (!silent) console.log('✅ Admin default siap (NIP: admin | Password: 1234)');

    // 2. Seed Superadmin jika ditentukan di .env
    const superUser = process.env.SUPERADMIN_USER || 'root';
    const superPass = process.env.SUPERADMIN_PASS || 'root';
    const superHashed = await bcrypt.hash(superPass, 10);

    await prisma.user.upsert({
      where: { nip: superUser },
      update: {},
      create: {
        nip: superUser,
        nama: 'Super Administrator',
        password: superHashed,
        jabatan: 'Super Admin',
        unitKerja: 'Pemerintah Kalurahan',
        role: 'SUPERADMIN',
      },
    });
    if (!silent) console.log(`✅ Superadmin siap (NIP: ${superUser})`);

    // 3. Seed lokasi kantor default (Kapanewon Pengasih)
    const lat = parseFloat(process.env.NEXT_PUBLIC_DEFAULT_LAT || '-7.841817942758396');
    const lng = parseFloat(process.env.NEXT_PUBLIC_DEFAULT_LNG || '110.1685866543569');

    const lokasi = await prisma.lokasiKantor.upsert({
      where: { id: 'default-lokasi' },
      update: {},
      create: {
        id: 'default-lokasi',
        namaLokasi: 'Kapanewon Pengasih',
        latitude: lat,
        longitude: lng,
        radius: 100,
      },
    });
    if (!silent) console.log(`✅ Lokasi kantor siap: ${lokasi.namaLokasi}`);

    // 4. Seed jam kerja default
    const jamMasuk = process.env.JAM_MASUK || '07:30';
    const jamPulang = process.env.JAM_PULANG || '15:45';

    const jamKerja = await prisma.jamKerja.upsert({
      where: { id: 'default-jam' },
      update: {},
      create: {
        id: 'default-jam',
        jamMasuk,
        jamPulang,
        toleransiSebelumMasuk: 30,
        toleransiKeterlambatan: 15,
        toleransiPulang: 120,
        durasiKerjaMenit: 495,
      },
    });
    if (!silent) console.log(`✅ Jam kerja default siap: ${jamKerja.jamMasuk} - ${jamKerja.jamPulang}`);

    // 5. Seed AppSettings default
    const appSettings = await prisma.appSettings.upsert({
      where: { id: 'default' },
      update: {},
      create: {
        id: 'default',
        namaApp: process.env.NEXT_PUBLIC_APP_NAME || 'E-KINERJA',
        namaKantor: 'Kalurahan',
        subJudul: 'Sistem Informasi Pamong',
        kopNamaPemda: 'Pemerintah Kabupaten Kulon Progo',
        kopNamaInstansi: 'Kapanewon Pengasih',
        kopAlamat: 'Jl. Pengasih No. 2, Pengasih, Kulon Progo, DIY 55652',
        kopKontak: 'Telp. (0274) 773422',
        ukuranKertas: 'A4',
        posisiDokumen: 'portrait',
        sembunyikanNip: false,
        ttdTempat: 'Pengasih',
        ttdJudulKiri: 'Yang Membuat Laporan',
        ttdAtasanStatus: 'Mengetahui,',
        ttdAtasanJabatan: 'Panewu Pengasih',
        ttdAtasanNama: '.................................',
        ttdAtasanNip: '.................................',
      },
    });
    if (!silent) console.log(`✅ Pengaturan cetak & kop dokumen siap: ${appSettings.namaApp}`);

    // 6. Seed sample pegawai
    const pegawaiPassword = await bcrypt.hash('1234', 10);

    const pegawai1 = await prisma.user.upsert({
      where: { nip: '198501012010011001' },
      update: {},
      create: {
        nip: '198501012010011001',
        nama: 'Budi Santoso',
        password: pegawaiPassword,
        jabatan: 'Staf Umum',
        unitKerja: 'Kapanewon Pengasih',
        role: 'PEGAWAI',
      },
    });

    const pegawai2 = await prisma.user.upsert({
      where: { nip: '199003152015012002' },
      update: {},
      create: {
        nip: '199003152015012002',
        nama: 'Siti Rahayu',
        password: pegawaiPassword,
        jabatan: 'Staf Keuangan',
        unitKerja: 'Kapanewon Pengasih',
        role: 'PEGAWAI',
      },
    });
    if (!silent) {
      console.log(`✅ Sample pegawai siap: ${pegawai1.nama}, ${pegawai2.nama}`);
      console.log('🎉 Seeding database selesai dengan sukses!');
    }

    return { success: true };
  } finally {
    await prisma.$disconnect();
  }
}

// Jika dipanggil via CLI: node prisma/seed.js
if (require.main === module) {
  seedDatabase({ silent: false })
    .then(() => process.exit(0))
    .catch((e) => {
      console.error('❌ Terjadi kesalahan saat seeding database:', e);
      process.exit(1);
    });
}

module.exports = { seedDatabase };
