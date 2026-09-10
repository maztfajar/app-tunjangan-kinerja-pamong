import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';

async function resolveJabatan(
  userId: string,
  jabatanId?: string | null,
  jabatanNama?: string | null,
  createIfMissing = false
) {
  if (jabatanId) {
    return prisma.masterJabatan.findUnique({ where: { id: jabatanId } });
  }
  if (jabatanNama) {
    return prisma.masterJabatan.findUnique({ where: { nama: jabatanNama } });
  }
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { jabatan: true, role: true },
  });
  if (!user?.jabatan) return null;
  const existing = await prisma.masterJabatan.findUnique({ where: { nama: user.jabatan } });
  if (existing) return existing;
  if (!createIfMissing) return null;
  return prisma.masterJabatan.create({
    data: { nama: user.jabatan, kategori: 'Pamong' },
  });
}

function canManageJabatan(
  role: string,
  userJabatan: string | null | undefined,
  targetJabatanNama: string
) {
  if (role === 'ADMIN' || role === 'SUPERADMIN') return true;
  return Boolean(userJabatan && userJabatan === targetJabatanNama);
}

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const jabatan = await resolveJabatan(
      session.userId,
      searchParams.get('jabatanId'),
      searchParams.get('jabatanNama')
    );

    const [jabatanList, currentUser] = await Promise.all([
      prisma.masterJabatan.findMany({ orderBy: { nama: 'asc' } }),
      prisma.user.findUnique({
        where: { id: session.userId },
        select: { jabatan: true, role: true, nama: true },
      }),
    ]);

    if (!jabatan) {
      return NextResponse.json({
        success: true,
        jabatan: null,
        jabatanList,
        userJabatan: currentUser?.jabatan || null,
        kegiatan: [],
        message: 'Jabatan belum dipilih atau belum terdaftar di master jabatan',
      });
    }

    const kegiatan = await prisma.kegiatanJabatan.findMany({
      where: { jabatanId: jabatan.id },
      orderBy: [{ urutan: 'asc' }, { createdAt: 'asc' }],
    });

    return NextResponse.json({
      success: true,
      jabatan,
      jabatanList,
      userJabatan: currentUser?.jabatan || null,
      kegiatan,
    });
  } catch (error) {
    console.error('Get kegiatan jabatan error:', error);
    return NextResponse.json({ error: 'Gagal mengambil data kegiatan' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { jabatanId, rencanaKegiatan, output, target, pedomanPengisian, urutan } = body;

    if (!rencanaKegiatan?.trim() || !output?.trim() || !String(target ?? '').trim()) {
      return NextResponse.json(
        { error: 'Rencana kegiatan, output, dan target wajib diisi' },
        { status: 400 }
      );
    }

    const currentUser = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { jabatan: true, role: true },
    });

    const jabatan = await resolveJabatan(session.userId, jabatanId, body.jabatanNama, true);
    if (!jabatan) {
      return NextResponse.json({ error: 'Jabatan tidak ditemukan' }, { status: 400 });
    }

    if (!canManageJabatan(session.role, currentUser?.jabatan, jabatan.nama)) {
      return NextResponse.json({ error: 'Tidak berhak menambah kegiatan jabatan ini' }, { status: 403 });
    }

    const last = await prisma.kegiatanJabatan.findFirst({
      where: { jabatanId: jabatan.id },
      orderBy: { urutan: 'desc' },
      select: { urutan: true },
    });

    const kegiatan = await prisma.kegiatanJabatan.create({
      data: {
        jabatanId: jabatan.id,
        rencanaKegiatan: rencanaKegiatan.trim(),
        output: output.trim(),
        target: String(target).trim(),
        pedomanPengisian: pedomanPengisian?.trim() || null,
        urutan: Number.isFinite(Number(urutan)) ? Number(urutan) : (last?.urutan || 0) + 1,
      },
    });

    return NextResponse.json({ success: true, kegiatan, message: 'Kegiatan berhasil ditambahkan' });
  } catch (error) {
    console.error('Create kegiatan jabatan error:', error);
    return NextResponse.json({ error: 'Gagal menyimpan kegiatan' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { id, rencanaKegiatan, output, target, pedomanPengisian, urutan } = body;
    if (!id) {
      return NextResponse.json({ error: 'ID kegiatan diperlukan' }, { status: 400 });
    }

    const existing = await prisma.kegiatanJabatan.findUnique({
      where: { id },
      include: { jabatan: true },
    });
    if (!existing) {
      return NextResponse.json({ error: 'Kegiatan tidak ditemukan' }, { status: 404 });
    }

    const currentUser = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { jabatan: true },
    });

    if (!canManageJabatan(session.role, currentUser?.jabatan, existing.jabatan.nama)) {
      return NextResponse.json({ error: 'Tidak berhak mengubah kegiatan jabatan ini' }, { status: 403 });
    }

    if (!rencanaKegiatan?.trim() || !output?.trim() || !String(target ?? '').trim()) {
      return NextResponse.json(
        { error: 'Rencana kegiatan, output, dan target wajib diisi' },
        { status: 400 }
      );
    }

    const kegiatan = await prisma.kegiatanJabatan.update({
      where: { id },
      data: {
        rencanaKegiatan: rencanaKegiatan.trim(),
        output: output.trim(),
        target: String(target).trim(),
        pedomanPengisian: pedomanPengisian?.trim() || null,
        ...(urutan !== undefined ? { urutan: Number(urutan) } : {}),
      },
    });

    return NextResponse.json({ success: true, kegiatan, message: 'Kegiatan berhasil diperbarui' });
  } catch (error) {
    console.error('Update kegiatan jabatan error:', error);
    return NextResponse.json({ error: 'Gagal memperbarui kegiatan' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const id = new URL(request.url).searchParams.get('id');
    if (!id) {
      return NextResponse.json({ error: 'ID kegiatan diperlukan' }, { status: 400 });
    }

    const existing = await prisma.kegiatanJabatan.findUnique({
      where: { id },
      include: { jabatan: true },
    });
    if (!existing) {
      return NextResponse.json({ error: 'Kegiatan tidak ditemukan' }, { status: 404 });
    }

    const currentUser = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { jabatan: true },
    });

    if (!canManageJabatan(session.role, currentUser?.jabatan, existing.jabatan.nama)) {
      return NextResponse.json({ error: 'Tidak berhak menghapus kegiatan jabatan ini' }, { status: 403 });
    }

    await prisma.kegiatanJabatan.delete({ where: { id } });
    return NextResponse.json({ success: true, message: 'Kegiatan berhasil dihapus' });
  } catch (error) {
    console.error('Delete kegiatan jabatan error:', error);
    return NextResponse.json({ error: 'Gagal menghapus kegiatan' }, { status: 500 });
  }
}
