import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getLicenseInfo } from '@/lib/license';

const EXPECTED_KEYS = new Set([
  'users',
  'masterJabatan',
  'masterUnitKerja',
  'presensi',
  'aktifitas',
  'laporan',
  'laporanKinerja',
  'agenda',
  'hariLibur',
  'appSettings',
  'jamKerja',
  'tasks',
  'kegiatanJabatan',
  'rencanaKegiatan',
  'outputKegiatan',
  'biometricCredential',
]);

function verifySecret(req: Request) {
  const provided = req.headers.get('x-superadmin-secret') || '';
  const expected = process.env.SUPERADMIN_RESTORE_SECRET || 'dev-secret';
  return provided === expected;
}

export async function POST(req: Request) {
  if (!verifySecret(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const license = await getLicenseInfo();
  if (!license.features.backupRestore) {
    return NextResponse.json({ error: 'Fitur Restore Database hanya tersedia pada lisensi PRO.' }, { status: 403 });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  if (!body || typeof body !== 'object') return NextResponse.json({ error: 'Payload harus berupa objek JSON' }, { status: 400 });

  // Validate there's at least one expected key
  const keys = Object.keys(body);
  const ok = keys.some(k => EXPECTED_KEYS.has(k));
  if (!ok) return NextResponse.json({ error: 'Tidak ada struktur data yang dikenali' }, { status: 400 });

  try {
    // Perform inserts in safe, non-destructive manner: createMany with skipDuplicates where possible
    const results: Record<string, unknown> = {};

    if (body.masterJabatan && Array.isArray(body.masterJabatan) && body.masterJabatan.length) {
      results.masterJabatan = await prisma.masterJabatan.createMany({ data: body.masterJabatan as never, skipDuplicates: true });
    }
    if (body.masterUnitKerja && Array.isArray(body.masterUnitKerja) && body.masterUnitKerja.length) {
      results.masterUnitKerja = await prisma.masterUnitKerja.createMany({ data: body.masterUnitKerja as never, skipDuplicates: true });
    }
    if (body.appSettings && typeof body.appSettings === 'object') {
      // upsert app settings
      await prisma.appSettings.upsert({ where: { id: 'default' }, update: body.appSettings as never, create: { ...(body.appSettings as object), id: 'default' } as never });
      results.appSettings = 1;
    }
    if (body.jamKerja && Array.isArray(body.jamKerja) && body.jamKerja.length) {
      results.jamKerja = await prisma.jamKerja.createMany({ data: body.jamKerja as never, skipDuplicates: true });
    }

    // Users and relational data — create users first
    if (body.users && Array.isArray(body.users) && body.users.length) {
      // Use createMany to preserve ids where possible
      results.users = await prisma.user.createMany({ data: body.users as never, skipDuplicates: true });
    }

    const manyMap: [string, unknown, { createMany: (args: { data: unknown; skipDuplicates: boolean }) => Promise<unknown> }][] = [
      ['presensi', body.presensi, prisma.presensi as never],
      ['aktifitas', body.aktifitas, prisma.aktifitas as never],
      ['tasks', body.tasks, prisma.task as never],
      ['laporan', body.laporan, prisma.laporan as never],
      ['laporanKinerja', body.laporanKinerja, prisma.laporanKinerja as never],
      ['agenda', body.agenda, prisma.agenda as never],
      ['kegiatanJabatan', body.kegiatanJabatan, prisma.kegiatanJabatan as never],
      ['rencanaKegiatan', body.rencanaKegiatan, prisma.rencanaKegiatan as never],
      ['outputKegiatan', body.outputKegiatan, prisma.outputKegiatan as never],
      ['hariLibur', body.hariLibur, prisma.hariLibur as never],
      ['biometricCredential', body.biometricCredential, prisma.biometricCredential as never],
    ];

    for (const [key, arr, model] of manyMap) {
      if (arr && Array.isArray(arr) && arr.length) {
        try {
          results[key] = await model.createMany({ data: arr, skipDuplicates: true });
        } catch (e) {
          results[key] = { error: String(e) };
        }
      }
    }

    return NextResponse.json({ ok: true, message: 'Data berhasil diproses (insert/skipDuplicates). Periksa log server untuk detail.', results });
  } catch (err) {
    console.error('Restore error', err);
    return NextResponse.json({ error: 'Terjadi kesalahan saat merestore data' }, { status: 500 });
  }
}
