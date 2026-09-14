import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  // Seed admin user
  const hashedPassword = await bcrypt.hash('1234', 10);
  
  const admin = await prisma.user.upsert({
    where: { username: 'admin' },
    update: {},
    create: {
      username: 'admin',
      nama: 'Administrator',
      password: hashedPassword,
      jabatan: 'Admin Sistem',
      unitKerja: 'Kapanewon Pengasih',
      role: 'ADMIN',
    },
  });

  console.log('✅ Admin user created:', admin.username);

  // Seed lokasi kantor (Kapanewon Pengasih)
  const lokasi = await prisma.lokasiKantor.upsert({
    where: { id: 'default-lokasi' },
    update: {},
    create: {
      id: 'default-lokasi',
      namaLokasi: 'Kapanewon Pengasih',
      latitude: -7.841817942758396,
      longitude: 110.1685866543569,
      radius: 100,
    },
  });

  console.log('✅ Lokasi kantor created:', lokasi.namaLokasi);

  // Seed jam kerja default
  const jamKerja = await prisma.jamKerja.upsert({
    where: { id: 'default-jam' },
    update: {},
    create: {
      id: 'default-jam',
      jamMasuk: '07:30',
      jamPulang: '16:00',
    },
  });

  console.log('✅ Jam kerja default:', jamKerja.jamMasuk, '-', jamKerja.jamPulang);

  // Seed sample pegawai
  const pegawaiPassword = await bcrypt.hash('1234', 10);
  
  const pegawai1 = await prisma.user.upsert({
    where: { username: '198501012010011001' },
    update: {},
    create: {
      username: '198501012010011001',
      nama: 'Budi Santoso',
      password: pegawaiPassword,
      jabatan: 'Staf Umum',
      unitKerja: 'Kapanewon Pengasih',
      role: 'PEGAWAI',
    },
  });

  const pegawai2 = await prisma.user.upsert({
    where: { username: '199003152015012002' },
    update: {},
    create: {
      username: '199003152015012002',
      nama: 'Siti Rahayu',
      password: pegawaiPassword,
      jabatan: 'Staf Keuangan',
      unitKerja: 'Kapanewon Pengasih',
      role: 'PEGAWAI',
    },
  });

  console.log('✅ Sample pegawai created:', pegawai1.nama, ',', pegawai2.nama);
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
