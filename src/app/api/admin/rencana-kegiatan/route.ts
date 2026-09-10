import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthUser } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    const user = await getAuthUser(req);
    if (!user || (user.role !== 'ADMIN' && user.role !== 'SUPERADMIN')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const jabatanId = searchParams.get('jabatanId');

    if (!jabatanId) {
      return NextResponse.json({ error: 'Parameter jabatanId diperlukan' }, { status: 400 });
    }

    const rencanaList = await prisma.rencanaKegiatan.findMany({
      where: { jabatanId, isActive: true },
      orderBy: { noUrut: 'asc' },
      include: {
        outputs: {
          where: { isActive: true },
          orderBy: { noUrut: 'asc' },
        },
      },
    });

    return NextResponse.json({ success: true, data: rencanaList });
  } catch (error) {
    console.error('Get admin rencana-kegiatan error:', error);
    return NextResponse.json({ error: 'Gagal mengambil rencana kegiatan' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getAuthUser(req);
    if (!user || (user.role !== 'ADMIN' && user.role !== 'SUPERADMIN')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { jabatanId, rencanaKegiatan, noUrut: rawNoUrut } = body;

    if (!jabatanId || !rencanaKegiatan?.trim()) {
      return NextResponse.json(
        { error: 'Jabatan dan rencana kegiatan wajib diisi' },
        { status: 400 }
      );
    }

    // Auto-generate No Urut jika tidak diisi atau 0
    let noUrut = Number(rawNoUrut);
    if (!noUrut || isNaN(noUrut) || noUrut <= 0) {
      const last = await prisma.rencanaKegiatan.findFirst({
        where: { jabatanId },
        orderBy: { noUrut: 'desc' },
      });
      noUrut = (last?.noUrut || 0) + 1;
    }

    const item = await prisma.rencanaKegiatan.create({
      data: {
        jabatanId,
        rencanaKegiatan: rencanaKegiatan.trim(),
        noUrut,
      },
      include: {
        outputs: true,
      },
    });

    return NextResponse.json({ success: true, data: item, message: 'Rencana kegiatan berhasil ditambahkan' });
  } catch (error) {
    console.error('Create admin rencana-kegiatan error:', error);
    return NextResponse.json({ error: 'Gagal menambah rencana kegiatan' }, { status: 500 });
  }
}
