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
    const { kodeHuruf, output, pedomanPengisian, noUrut } = body;

    const data: Record<string, unknown> = {};
    if (kodeHuruf !== undefined) data.kodeHuruf = String(kodeHuruf).trim();
    if (output !== undefined) data.output = String(output).trim();
    if (pedomanPengisian !== undefined) data.pedomanPengisian = pedomanPengisian ? String(pedomanPengisian).trim() : null;
    if (noUrut !== undefined) data.noUrut = Number(noUrut);

    const updated = await prisma.outputKegiatan.update({
      where: { id },
      data,
    });

    return NextResponse.json({ success: true, data: updated, message: 'Output kegiatan diperbarui' });
  } catch (error) {
    console.error('Update admin output-kegiatan error:', error);
    return NextResponse.json({ error: 'Gagal memperbarui output kegiatan' }, { status: 500 });
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

    await prisma.outputKegiatan.delete({ where: { id } });

    return NextResponse.json({ success: true, message: 'Output kegiatan berhasil dihapus' });
  } catch (error) {
    console.error('Delete admin output-kegiatan error:', error);
    return NextResponse.json({ error: 'Gagal menghapus output kegiatan' }, { status: 500 });
  }
}
