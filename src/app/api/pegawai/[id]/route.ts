import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession, hashPassword, validatePasswordStrength } from '@/lib/auth';

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

    const body = await request.json();
    const { nama, jabatan, unitKerja, password } = body;
    const username = (body.username !== undefined ? body.username : body.nip)?.trim();

    const updateData: Record<string, unknown> = {};
    if (username) updateData.username = username;
    if (nama) updateData.nama = nama;
    if (jabatan !== undefined) updateData.jabatan = jabatan;
    if (unitKerja !== undefined) updateData.unitKerja = unitKerja;
    if (password) {
      const pwdCheck = validatePasswordStrength(password);
      if (!pwdCheck.valid) {
        return NextResponse.json({ error: pwdCheck.error }, { status: 400 });
      }
      updateData.password = await hashPassword(password);
    }

    const pegawai = await prisma.user.update({
      where: { id },
      data: updateData,
      select: { id: true, username: true, nama: true, jabatan: true, unitKerja: true },
    });

    return NextResponse.json({
      success: true,
      pegawai: {
        ...pegawai,
        nip: pegawai.username,
      },
    });
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
