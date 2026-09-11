import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

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

  let body: any;
  try {
    body = await req.json();
  } catch (err) {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  if (!body || typeof body !== 'object') return NextResponse.json({ error: 'Payload harus berupa objek JSON' }, { status: 400 });

  // Validate there's at least one expected key
  const keys = Object.keys(body);
  const ok = keys.some(k => EXPECTED_KEYS.has(k));
  if (!ok) return NextResponse.json({ error: 'Tidak ada struktur data yang dikenali' }, { status: 400 });

  try {
    // Perform inserts in safe, non-destructive manner: createMany with skipDuplicates where possible
    const results: any = {};

    if (body.masterJabatan && Array.isArray(body.masterJabatan) && body.masterJabatan.length) {
      results.masterJabatan = await prisma.masterJabatan.createMany({ data: body.masterJabatan, skipDuplicates: true });
    }
    if (body.masterUnitKerja && Array.isArray(body.masterUnitKerja) && body.masterUnitKerja.length) {
      results.masterUnitKerja = await prisma.masterUnitKerja.createMany({ data: body.masterUnitKerja, skipDuplicates: true });
    }
    if (body.appSettings && typeof body.appSettings === 'object') {
      // upsert app settings
      await prisma.appSettings.upsert({ where: { id: 'default' }, update: body.appSettings, create: { ...body.appSettings, id: 'default' } });
      results.appSettings = 1;
    }
    if (body.jamKerja && Array.isArray(body.jamKerja) && body.jamKerja.length) {
      results.jamKerja = await prisma.jamKerja.createMany({ data: body.jamKerja, skipDuplicates: true });
    }

    // Users and relational data — create users first
    if (body.users && Array.isArray(body.users) && body.users.length) {
      // Use createMany to preserve ids where possible
      results.users = await prisma.user.createMany({ data: body.users, skipDuplicates: true });
    }

    const manyMap: [string, any, any?][] = [
      ['presensi', body.presensi, prisma.presensi],
      ['aktifitas', body.aktifitas, prisma.aktifitas],
      ['tasks', body.tasks, prisma.task],
      ['agenda', body.agenda, prisma.agenda],
      ['laporan', body.laporan, prisma.laporan],
      ['laporanKinerja', body.laporanKinerja, prisma.laporanKinerja],
      ['kegiatanJabatan', body.kegiatanJabatan, prisma.kegiatanJabatan],
      ['rencanaKegiatan', body.rencanaKegiatan, prisma.rencanaKegiatan],
      ['outputKegiatan', body.outputKegiatan, prisma.outputKegiatan],
      ['hariLibur', body.hariLibur, prisma.hariLibur],
      ['biometricCredential', body.biometricCredential, prisma.biometricCredential],
    ];

    for (const [key, arr, model] of manyMap) {
      if (arr && Array.isArray(arr) && arr.length) {
        try {
          // @ts-ignore
          results[key] = await model.createMany({ data: arr, skipDuplicates: true });
        } catch (e) {
          // continue — some models may not support createMany for relations; ignore and report
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
