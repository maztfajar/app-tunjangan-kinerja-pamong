import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';

export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const agenda = await prisma.agenda.findMany({
      where: { userId: session.userId },
      orderBy: { tanggal: 'asc' },
    });

    return NextResponse.json({ agenda });
  } catch (error) {
    console.error('Get agenda error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { judul, tanggal, lokasi, catatan } = await request.json();

    if (!judul || !tanggal) {
      return NextResponse.json({ error: 'Judul dan tanggal wajib diisi' }, { status: 400 });
    }

    const agenda = await prisma.agenda.create({
      data: {
        userId: session.userId,
        judul,
        tanggal: new Date(tanggal),
        lokasi,
        catatan,
      },
    });

    return NextResponse.json({ success: true, agenda });
  } catch (error) {
    console.error('Create agenda error:', error);
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
      return NextResponse.json({ error: 'ID wajib' }, { status: 400 });
    }

    await prisma.agenda.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete agenda error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
