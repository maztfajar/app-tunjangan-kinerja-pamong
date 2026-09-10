import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { fetchLiburNasional } from '@/lib/hariLiburData';

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session || session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const tahun = Number(body.tahun) || new Date().getFullYear();

    const liburList = await fetchLiburNasional(tahun);

    if (liburList.length === 0) {
      return NextResponse.json({
        error: `Data hari libur nasional untuk tahun ${tahun} belum tersedia`,
      }, { status: 404 });
    }

    let addedCount = 0;
    let existingCount = 0;

    for (const item of liburList) {
      const cleanDate = item.tanggal.slice(0, 10);
      const tgl = new Date(`${cleanDate}T12:00:00.000Z`);
      const startRange = new Date(`${cleanDate}T00:00:00.000Z`);
      const endRange = new Date(`${cleanDate}T23:59:59.999Z`);

      const existing = await prisma.hariLibur.findFirst({
        where: {
          tanggal: { gte: startRange, lte: endRange },
        },
      });

      if (!existing) {
        await prisma.hariLibur.create({
          data: {
            tanggal: tgl,
            keterangan: item.keterangan,
            sumber: 'otomatis',
            isLibur: true,
            dibuatOleh: session.userId,
          },
        });
        addedCount++;
      } else {
        existingCount++;
      }
    }

    return NextResponse.json({
      success: true,
      message: `Berhasil sinkronisasi ${liburList.length} hari libur nasional tahun ${tahun}. (${addedCount} baru ditambahkan, ${existingCount} sudah terdaftar)`,
      tahun,
      total: liburList.length,
      added: addedCount,
      existing: existingCount,
    });
  } catch (error) {
    console.error('Sync hari libur error:', error);
    return NextResponse.json({ error: 'Server error', details: String(error) }, { status: 500 });
  }
}
