import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';

export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const aktifitas = await prisma.aktifitas.findMany({
      where: { userId: session.userId },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ aktifitas });
  } catch (error) {
    console.error('Get aktifitas error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { deskripsi, foto, lokasi, latitude, longitude } = await request.json();

    if (!deskripsi) {
      return NextResponse.json({ error: 'Deskripsi wajib diisi' }, { status: 400 });
    }

    const latNum = typeof latitude === 'number' ? latitude : (latitude ? parseFloat(latitude) : null);
    const lngNum = typeof longitude === 'number' ? longitude : (longitude ? parseFloat(longitude) : null);

    const aktifitas = await prisma.aktifitas.create({
      data: {
        userId: session.userId,
        deskripsi,
        foto: foto || null,
        lokasi: lokasi || null,
        latitude: latNum && !isNaN(latNum) ? latNum : null,
        longitude: lngNum && !isNaN(lngNum) ? lngNum : null,
      },
    });

    return NextResponse.json({ success: true, aktifitas });
  } catch (error) {
    console.error('Create aktifitas error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id, deskripsi, foto, lokasi, latitude, longitude } = await request.json();

    if (!id || !deskripsi) {
      return NextResponse.json({ error: 'ID dan Deskripsi wajib diisi' }, { status: 400 });
    }

    const existing = await prisma.aktifitas.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'Data tidak ditemukan' }, { status: 404 });
    }

    if (session.role !== 'ADMIN' && existing.userId !== session.userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const latNum = typeof latitude === 'number' ? latitude : (latitude ? parseFloat(latitude) : null);
    const lngNum = typeof longitude === 'number' ? longitude : (longitude ? parseFloat(longitude) : null);

    const aktifitas = await prisma.aktifitas.update({
      where: { id },
      data: {
        deskripsi,
        foto: foto !== undefined ? (foto || null) : existing.foto,
        lokasi: lokasi !== undefined ? (lokasi || null) : existing.lokasi,
        latitude: latNum !== null && !isNaN(latNum) ? latNum : null,
        longitude: lngNum !== null && !isNaN(lngNum) ? lngNum : null,
      },
    });

    return NextResponse.json({ success: true, aktifitas });
  } catch (error) {
    console.error('Update aktifitas error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'ID wajib disertakan' }, { status: 400 });
    }

    const existing = await prisma.aktifitas.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'Data tidak ditemukan' }, { status: 404 });
    }

    if (session.role !== 'ADMIN' && existing.userId !== session.userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    await prisma.aktifitas.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete aktifitas error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
