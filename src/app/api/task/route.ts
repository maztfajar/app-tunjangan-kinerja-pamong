import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';

export async function GET(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const todayOnly = searchParams.get('today') === 'true';

    let whereClause: Record<string, unknown> = { userId: session.userId };

    if (todayOnly) {
      const now = new Date();
      const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
      const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
      whereClause = {
        ...whereClause,
        waktu: { gte: startOfDay, lte: endOfDay },
      };
    }

    const tasks = await prisma.task.findMany({
      where: whereClause,
      orderBy: { waktu: 'desc' },
    });

    return NextResponse.json({ tasks });
  } catch (error) {
    console.error('Get tasks error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { pemberiTugas, hal, keterangan, lokasi, waktu } = await request.json();

    if (!pemberiTugas || !hal || !waktu) {
      return NextResponse.json({ error: 'Pemberi tugas, hal, dan waktu wajib diisi' }, { status: 400 });
    }

    const task = await prisma.task.create({
      data: {
        userId: session.userId,
        pemberiTugas,
        hal,
        keterangan: keterangan || null,
        lokasi: lokasi || null,
        waktu: new Date(waktu),
        status: 'Selesai',
      },
    });

    return NextResponse.json({ success: true, task });
  } catch (error) {
    console.error('Create task error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id, pemberiTugas, hal, keterangan, lokasi, waktu } = await request.json();

    if (!id || !pemberiTugas || !hal || !waktu) {
      return NextResponse.json({ error: 'Data tidak lengkap' }, { status: 400 });
    }

    const existing = await prisma.task.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'Data tidak ditemukan' }, { status: 404 });
    }
    if (existing.userId !== session.userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const task = await prisma.task.update({
      where: { id },
      data: {
        pemberiTugas,
        hal,
        keterangan: keterangan || null,
        lokasi: lokasi || null,
        waktu: new Date(waktu),
      },
    });

    return NextResponse.json({ success: true, task });
  } catch (error) {
    console.error('Update task error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id, status } = await request.json();

    if (!id || !status) {
      return NextResponse.json({ error: 'ID dan status wajib diisi' }, { status: 400 });
    }

    const task = await prisma.task.update({
      where: { id },
      data: { status },
    });

    return NextResponse.json({ success: true, task });
  } catch (error) {
    console.error('Update task status error:', error);
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

    const existing = await prisma.task.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'Data tidak ditemukan' }, { status: 404 });
    }
    if (existing.userId !== session.userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    await prisma.task.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete task error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
