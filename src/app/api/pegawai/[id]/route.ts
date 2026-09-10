import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession, hashPassword } from '@/lib/auth';

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session || (session.role !== 'ADMIN' && session.role !== 'SUPERADMIN')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    // Pastikan hanya akun role PEGAWAI yang dapat diubah lewat endpoint pegawai
    const existing = await prisma.user.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'Data pegawai tidak ditemukan.' }, { status: 404 });
    }
    if (existing.role !== 'PEGAWAI') {
      return NextResponse.json({ error: 'Akun Admin/Super Admin hanya dapat dikelola di menu Super Admin.' }, { status: 403 });
    }

    const { nip, nama, jabatan, unitKerja, password } = await request.json();

    const updateData: Record<string, unknown> = {};
    if (nip) updateData.nip = nip;
    if (nama) updateData.nama = nama;
    if (jabatan !== undefined) updateData.jabatan = jabatan;
    if (unitKerja !== undefined) updateData.unitKerja = unitKerja;
    if (password) updateData.password = await hashPassword(password);

    const pegawai = await prisma.user.update({
      where: { id },
      data: updateData,
      select: { id: true, nip: true, nama: true, jabatan: true, unitKerja: true },
    });

    return NextResponse.json({ success: true, pegawai });
  } catch (error) {
    console.error('Update pegawai error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session || (session.role !== 'ADMIN' && session.role !== 'SUPERADMIN')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    // Pastikan hanya akun role PEGAWAI yang dapat dihapus lewat endpoint pegawai
    const existing = await prisma.user.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'Data pegawai tidak ditemukan.' }, { status: 404 });
    }
    if (existing.role !== 'PEGAWAI') {
      return NextResponse.json({ error: 'Akun Admin/Super Admin hanya dapat dikelola di menu Super Admin.' }, { status: 403 });
    }

    await prisma.user.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete pegawai error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
