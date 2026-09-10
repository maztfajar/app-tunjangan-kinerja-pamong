import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';

export async function GET(request: Request) {
  try {
    const session = await getSession();
    if (!session || session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Akses ditolak' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const bulan = searchParams.get('bulan'); // format: 2026-09

    let whereClause: Record<string, unknown> = {};

    if (bulan) {
      const [tahun, bln] = bulan.split('-').map(Number);
      const start = new Date(tahun, bln - 1, 1, 0, 0, 0, 0);
      const end = new Date(tahun, bln, 0, 23, 59, 59, 999);
      whereClause = {
        waktu: { gte: start, lte: end },
      };
    }

    const tasks = await prisma.task.findMany({
      where: whereClause,
      include: {
        user: {
          select: {
            nama: true,
            nip: true,
            jabatan: true,
            unitKerja: true,
          },
        },
      },
      orderBy: { waktu: 'desc' },
    });

    return NextResponse.json({ tasks });
  } catch (error) {
    console.error('Admin rekap aktivitas error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
