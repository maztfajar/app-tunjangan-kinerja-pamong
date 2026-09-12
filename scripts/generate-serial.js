#!/usr/bin/env node

/**
 * GENERATOR SERIAL NUMBER RESMI - E-KINERJA PAMONG
 * 
 * Penggunaan:
 *   1. Uji Coba Sementara 30 Hari (Bebas Domain):
 *      node scripts/generate-serial.js --client "Kalurahan Sumberarum" --days 30
 * 
 *   2. Lisensi Permanen Terkunci ke Domain Resmi Kalurahan:
 *      node scripts/generate-serial.js --client "Kalurahan Sumberarum" --domain "sumberarum.desa.id"
 * 
 *   3. Lisensi Multi-Domain (Domain Resmi + Subdomain / Localhost):
 *      node scripts/generate-serial.js --client "Kalurahan Sumberarum" --domain "sumberarum.desa.id,localhost"
 * 
 *   4. Dengan Batas Tanggal Tertentu & Domain:
 *      node scripts/generate-serial.js --client "Kalurahan Sumberarum" --exp 2027-12-31 --domain "sumberarum.desa.id"
 */

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

// Baca MASTER_SALT dari .env jika ada khusus LICENSE_SECRET
let masterSalt = 'TKP-PAMONG-MASTER-KEY-2026-X99';
try {
  const envPath = path.resolve(__dirname, '../.env');
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8');
    const match = envContent.match(/^LICENSE_SECRET=(.*)$/m);
    if (match && match[1]) {
      masterSalt = match[1].trim().replace(/^["']|["']$/g, '');
    }
  }
} catch {}

// Parse argumen CLI
const args = process.argv.slice(2);
let clientName = 'Kalurahan / Instansi Resmi';
let expiryDate = null;
let maxUsers = -1; // unlimited
const domains = [];

for (let i = 0; i < args.length; i++) {
  if (args[i] === '--client' && args[i + 1]) {
    clientName = args[i + 1];
    i++;
  } else if (args[i] === '--exp' && args[i + 1]) {
    expiryDate = args[i + 1];
    i++;
  } else if (args[i] === '--days' && args[i + 1]) {
    const days = parseInt(args[i + 1], 10);
    if (!isNaN(days) && days > 0) {
      const targetDate = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
      expiryDate = targetDate.toISOString().slice(0, 10);
    }
    i++;
  } else if ((args[i] === '--domain' || args[i] === '--domains') && args[i + 1]) {
    const rawList = args[i + 1].split(',').map((d) => d.trim().toLowerCase()).filter(Boolean);
    domains.push(...rawList);
    i++;
  } else if (args[i] === '--max' && args[i + 1]) {
    maxUsers = parseInt(args[i + 1], 10);
    i++;
  }
}

// 1. Generate Block Serial (Praktis, 16 karakter acak yang divalidasi tanda tangan)
const prefixRandom = crypto.randomBytes(4).toString('hex').toUpperCase(); // 8 char hex -> 2 blocks of 4
const block1 = prefixRandom.slice(0, 4);
const block2 = prefixRandom.slice(4, 8);
const seed = `TKP-BLOCK-${block1}-${block2}`;
const hmacSuffix = crypto
  .createHmac('sha256', masterSalt)
  .update(seed)
  .digest('hex')
  .slice(0, 8)
  .toUpperCase();
const block3 = hmacSuffix.slice(0, 4);
const block4 = hmacSuffix.slice(4, 8);
const blockSerial = `TKP-PRO-${block1}-${block2}-${block3}-${block4}`;

// 2. Generate Token Serial (Membawa metadata Klien, Tanggal Kadaluarsa, & Domain Binding)
const todayStr = new Date().toISOString().slice(0, 10);
const payloadObj = {
  client: clientName,
  tier: 'PRO',
  maxUsers: maxUsers,
  iat: todayStr,
  exp: expiryDate || null,
  ...(domains.length > 0 ? { domains: domains } : {}),
};
const payloadB64 = Buffer.from(JSON.stringify(payloadObj)).toString('base64url');
const tokenSig = crypto
  .createHmac('sha256', masterSalt)
  .update(payloadB64)
  .digest('hex')
  .slice(0, 16)
  .toUpperCase();
const tokenSerial = `TKP-PRO-${payloadB64}.${tokenSig}`;

console.log('================================================================');
console.log('🔑  GENERATOR SERIAL NUMBER - SISTEM TUNJANGAN KINERJA PAMONG');
console.log('================================================================');
console.log(`📌 Klien Terdaftar : ${clientName}`);
console.log(`📌 Tipe Lisensi    : PRO (Fitur Ekstensi Penuh)`);
console.log(`📌 Kuota Pegawai   : ${maxUsers === -1 ? 'Tanpa Batas (Unlimited)' : `${maxUsers} orang`}`);
console.log(`📌 Masa Berlaku    : ${expiryDate ? `Sampai ${expiryDate}` : 'Permanen (Seumur Hidup / Lifetime)'}`);
console.log(`📌 Kunci Domain    : ${domains.length > 0 ? domains.join(', ') : 'Bebas / Fleksibel (Dapat digunakan di semua domain / IP)'}`);
console.log('----------------------------------------------------------------');
console.log('🌟 8 FITUR PRO YANG DIAKTIFKAN:');
console.log('  1. Presensi Biometrik (Sidik Jari HP / WebAuthn)');
console.log('  2. Pegawai diatas 50 orang (Unlimited Pegawai)');
console.log('  3. Kalender Libur Nasional Otomatis (Admin)');
console.log('  4. Tambah Penetapan Hari & Kalender Kerja Fleksibel');
console.log('  5. Custom Kop Surat, Format Tanda Tangan & Pilihan Kertas (A4/F4 & Portrait/Landscape)');
console.log('  6. Fitur Backup & Restore Database (Super Admin)');
console.log('  7. Fitur Ajukan Suket (Pegawai & Admin)');
console.log('  8. Fitur Agenda Kegiatan (Pegawai & Admin)');
console.log('----------------------------------------------------------------');
if (domains.length === 0) {
  console.log('PILIHAN 1: SERIAL NUMBER PRAKTIS (Format Blok):');
  console.log(`👉  ${blockSerial}`);
  console.log('');
}
console.log(domains.length > 0 ? 'PILIHAN SERIAL NUMBER TERKUNCI DOMAIN:' : 'PILIHAN 2: SERIAL NUMBER IDENTITAS RESMI (Rekomendasi):');
console.log(`👉  ${tokenSerial}`);
console.log('================================================================');
console.log('💡 Cara Aktivasi:');
console.log('1. Masuk ke halaman Super Admin (Ringkasan Sistem).');
console.log('2. Temukan card "Serial Number" (tepat di bawah Reset Database).');
console.log('3. Tempelkan salah satu Serial Number di atas, lalu klik Simpan.');
console.log('================================================================\n');
