import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session || (session.role !== 'ADMIN' && session.role !== 'SUPERADMIN')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ error: 'userId parameter required' }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        username: true,
        nama: true,
        jabatan: true,
        unitKerja: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: 'Pegawai tidak ditemukan' }, { status: 404 });
    }

    const laporanKinerja = await prisma.laporanKinerja.findMany({
      where: { userId },
      include: {
        output: {
          include: {
            rencanaKegiatan: true,
          },
        },
      },
      orderBy: [{ periode: 'desc' }, { createdAt: 'desc' }],
    });

    const laporan = laporanKinerja.map((row) => ({
      id: row.id,
      bulan: row.periode ? row.periode.toISOString().slice(0, 7) : '',
      rencana: row.output.rencanaKegiatan.rencanaKegiatan,
      output: `${row.output.kodeHuruf}. ${row.output.output}`,
      target: row.target || '',
      capaian: row.capaian || '',
      satuan: '',
      keterangan: row.keterangan || '',
      pedomanPengisian: row.output.pedomanPengisian || '',
    }));

    return NextResponse.json({
      user: user ? { ...user, nip: user.username } : null,
      laporan,
    });
  } catch (error) {
    console.error('Get admin laporan error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
