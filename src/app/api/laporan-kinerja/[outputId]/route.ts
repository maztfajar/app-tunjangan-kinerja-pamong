import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthUser } from '@/lib/auth';

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ outputId: string }> }
) {
  try {
    const user = await getAuthUser(req);
    if (!user) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const { outputId: rawOutputId } = await params;
    const outputId = parseInt(rawOutputId, 10);
    if (isNaN(outputId)) {
      return NextResponse.json({ error: 'ID output tidak valid' }, { status: 400 });
    }

    const body = await req.json();
    const { periode, target, capaian, keterangan, targetUserId } = body as {
      periode: string; // misal "2026-09"
      target?: string;
      capaian?: string | number;
      keterangan?: string;
      targetUserId?: string;
    };

    if (!periode) {
      return NextResponse.json({ error: 'Periode wajib diisi' }, { status: 400 });
    }

    // Pastikan output kegiatan ada
    const outputKegiatan = await prisma.outputKegiatan.findUnique({
      where: { id: outputId },
    });
    if (!outputKegiatan) {
      return NextResponse.json({ error: 'Output kegiatan tidak ditemukan' }, { status: 404 });
    }

    const isAdmin = user.role === 'ADMIN' || user.role === 'SUPERADMIN';
    const effectiveUserId = isAdmin && targetUserId ? targetUserId : user.id;

    const periodeDate = new Date(`${periode}-01T00:00:00.000Z`);

    const result = await prisma.laporanKinerja.upsert({
      where: {
        outputId_userId_periode: {
          outputId,
          userId: effectiveUserId,
          periode: periodeDate,
        },
      },
      update: {
        target: target !== undefined ? String(target).trim() : undefined,
        capaian: capaian !== undefined ? String(capaian).trim() : undefined,
        keterangan: keterangan !== undefined ? String(keterangan).trim() : undefined,
        status: 'draft',
      },
      create: {
        outputId,
        userId: effectiveUserId,
        periode: periodeDate,
        target: target !== undefined ? String(target).trim() : null,
        capaian: capaian !== undefined ? String(capaian).trim() : null,
        keterangan: keterangan !== undefined ? String(keterangan).trim() : null,
        status: 'draft',
      },
    });

    return NextResponse.json({ success: true, message: 'Isian kinerja tersimpan', data: result });
  } catch (error) {
    console.error('Upsert laporan kinerja error:', error);
    return NextResponse.json({ error: 'Gagal menyimpan isian kinerja' }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ outputId: string }> }
) {
  try {
    const user = await getAuthUser(req);
    if (!user) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const { outputId: rawOutputId } = await params;
    const outputId = parseInt(rawOutputId, 10);
    const { searchParams } = new URL(req.url);
    const periodeParam = searchParams.get('periode');

    if (!outputId || !periodeParam) {
      return NextResponse.json({ error: 'outputId dan periode diperlukan' }, { status: 400 });
    }

    const periodeDate = new Date(`${periodeParam}-01T00:00:00.000Z`);

    await prisma.laporanKinerja.deleteMany({
      where: {
        outputId,
        userId: user.id,
        periode: periodeDate,
      },
    });

    return NextResponse.json({ success: true, message: 'Isian kinerja berhasil direset' });
  } catch (error) {
    console.error('Delete laporan kinerja error:', error);
    return NextResponse.json({ error: 'Gagal mereset isian kinerja' }, { status: 500 });
  }
}
