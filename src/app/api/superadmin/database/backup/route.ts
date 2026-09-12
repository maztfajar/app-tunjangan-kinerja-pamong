import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { getLicenseInfo } from '@/lib/license';

export async function GET() {
  try {
    const session = await getSession();
    if (!session || session.role !== 'SUPERADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const license = await getLicenseInfo();
    if (!license.features.backupRestore) {
      return NextResponse.json({ error: 'Fitur Backup Database hanya tersedia pada lisensi PRO.' }, { status: 403 });
    }
    // Collect main tables
    const [users, masterJabatan, masterUnitKerja, presensi, aktifitas, laporan, laporanKinerja, agenda, hariLibur, appSettings, jamKerja, tasks, kegiatanJabatan, rencanaKegiatan, outputKegiatan, biometricCredential] = await Promise.all([
      prisma.user.findMany(),
      prisma.masterJabatan.findMany(),
      prisma.masterUnitKerja.findMany(),
      prisma.presensi.findMany(),
      prisma.aktifitas.findMany(),
      prisma.laporan.findMany(),
      prisma.laporanKinerja.findMany(),
      prisma.agenda.findMany(),
      prisma.hariLibur.findMany(),
      // AppSettings is single row with id 'default'
      prisma.appSettings.findUnique({ where: { id: 'default' } }),
      prisma.jamKerja.findMany(),
      prisma.task.findMany(),
      prisma.kegiatanJabatan.findMany(),
      prisma.rencanaKegiatan.findMany(),
      prisma.outputKegiatan.findMany(),
      prisma.biometricCredential.findMany(),
    ]);

    const payload = {
      users,
      masterJabatan,
      masterUnitKerja,
      presensi,
      aktifitas,
      laporan,
      laporanKinerja,
      agenda,
      hariLibur,
      appSettings,
      jamKerja,
      tasks,
      kegiatanJabatan,
      rencanaKegiatan,
      outputKegiatan,
      biometricCredential,
      exportedAt: new Date().toISOString(),
    };

    return NextResponse.json(payload, { status: 200 });
  } catch (err) {
    console.error('Backup error', err);
    return NextResponse.json({ error: 'Gagal membuat backup' }, { status: 500 });
  }
}
