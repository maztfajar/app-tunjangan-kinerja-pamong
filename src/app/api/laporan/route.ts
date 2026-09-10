import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';

export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const laporan = await prisma.laporan.findMany({
      where: { userId: session.userId },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ laporan });
  } catch (error) {
    console.error('Get laporan error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { bulan, rencana, output, target, capaian, satuan, keterangan } = await request.json();

    if (!bulan || !rencana || !output || target === undefined || capaian === undefined || !satuan) {
      return NextResponse.json({ error: 'Semua field wajib diisi' }, { status: 400 });
    }

    const laporan = await prisma.laporan.create({
      data: {
        userId: session.userId,
        bulan,
        rencana,
        output,
        target: Number(target),
        capaian: Number(capaian),
        satuan,
        keterangan,
      },
    });

    return NextResponse.json({ success: true, laporan });
  } catch (error) {
    console.error('Create laporan error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
