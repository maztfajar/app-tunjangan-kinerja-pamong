import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthUser } from '@/lib/auth';

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthUser(req);
    if (!user || (user.role !== 'ADMIN' && user.role !== 'SUPERADMIN')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: rawId } = await params;
    const id = parseInt(rawId, 10);
    if (isNaN(id)) {
      return NextResponse.json({ error: 'ID tidak valid' }, { status: 400 });
    }

    const body = await req.json();
    const { rencanaKegiatan, noUrut } = body;

    const data: Record<string, unknown> = {};
    if (rencanaKegiatan !== undefined) data.rencanaKegiatan = String(rencanaKegiatan).trim();
    if (noUrut !== undefined) data.noUrut = Number(noUrut);

    const updated = await prisma.rencanaKegiatan.update({
      where: { id },
      data,
      include: { outputs: true },
    });

    return NextResponse.json({ success: true, data: updated, message: 'Rencana kegiatan diperbarui' });
  } catch (error) {
    console.error('Update admin rencana-kegiatan error:', error);
    return NextResponse.json({ error: 'Gagal memperbarui rencana kegiatan' }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthUser(req);
    if (!user || (user.role !== 'ADMIN' && user.role !== 'SUPERADMIN')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: rawId } = await params;
    const id = parseInt(rawId, 10);
    if (isNaN(id)) {
      return NextResponse.json({ error: 'ID tidak valid' }, { status: 400 });
    }

    await prisma.rencanaKegiatan.delete({ where: { id } });

    return NextResponse.json({ success: true, message: 'Rencana kegiatan berhasil dihapus' });
  } catch (error) {
    console.error('Delete admin rencana-kegiatan error:', error);
    return NextResponse.json({ error: 'Gagal menghapus rencana kegiatan' }, { status: 500 });
  }
}
