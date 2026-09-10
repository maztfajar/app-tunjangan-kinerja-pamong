import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthUser } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const user = await getAuthUser(req);
    if (!user) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const {
      mode, // 'EXISTING_RENCANA' | 'NEW_RENCANA'
      jabatanId,
      rencanaKegiatanId: rawRencanaId,
      newRencanaKegiatan,
      output,
      pedomanPengisian,
      periode, // 'YYYY-MM'
      target,
      capaian,
      keterangan,
      targetUserId,
    } = body;

    if (!periode) {
      return NextResponse.json({ error: 'Periode wajib diisi' }, { status: 400 });
    }
    if (!output || !output.trim()) {
      return NextResponse.json({ error: 'Output kegiatan wajib diisi' }, { status: 400 });
    }

    const isAdmin = user.role === 'ADMIN' || user.role === 'SUPERADMIN';
    const effectiveUserId = isAdmin && targetUserId ? targetUserId : user.id;
    const effectiveJabatanId = jabatanId || user.jabatanId;

    let targetRencanaId = Number(rawRencanaId);

    // Jika membuat rencana kegiatan baru (penggabungan baru)
    if (mode === 'NEW_RENCANA' || !targetRencanaId) {
      if (!newRencanaKegiatan || !newRencanaKegiatan.trim()) {
        return NextResponse.json(
          { error: 'Nama Rencana Kegiatan baru wajib diisi' },
          { status: 400 }
        );
      }

      if (!effectiveJabatanId) {
        return NextResponse.json(
          { error: 'Jabatan tidak terdeteksi untuk rencana baru ini' },
          { status: 400 }
        );
      }

      // Hitung noUrut rencana kegiatan berikutnya
      const lastRencana = await prisma.rencanaKegiatan.findFirst({
        where: { jabatanId: effectiveJabatanId },
        orderBy: { noUrut: 'desc' },
      });
      const nextNoUrut = (lastRencana?.noUrut || 0) + 1;

      const newRencana = await prisma.rencanaKegiatan.create({
        data: {
          jabatanId: effectiveJabatanId,
          noUrut: nextNoUrut,
          rencanaKegiatan: newRencanaKegiatan.trim(),
          isActive: true,
        },
      });

      targetRencanaId = newRencana.id;
    }

    // Buat output kegiatan baru di bawah rencana kegiatan terkait
    const existingOutputs = await prisma.outputKegiatan.findMany({
      where: { rencanaKegiatanId: targetRencanaId },
      orderBy: { noUrut: 'asc' },
    });

    const nextOutNoUrut = existingOutputs.length + 1;
    const nextKodeHuruf = String.fromCharCode(97 + ((existingOutputs.length) % 26));

    const newOutput = await prisma.outputKegiatan.create({
      data: {
        rencanaKegiatanId: targetRencanaId,
        kodeHuruf: nextKodeHuruf,
        output: output.trim(),
        pedomanPengisian: pedomanPengisian?.trim() || null,
        noUrut: nextOutNoUrut,
        isActive: true,
      },
    });

    // Buat isian laporan kinerja bulan ini
    const periodeDate = new Date(`${periode}-01T00:00:00.000Z`);
    const laporan = await prisma.laporanKinerja.create({
      data: {
        outputId: newOutput.id,
        userId: effectiveUserId,
        periode: periodeDate,
        target: target ? String(target).trim() : null,
        capaian: capaian !== undefined && capaian !== '' ? String(capaian).trim() : null,
        keterangan: keterangan ? String(keterangan).trim() : null,
        status: 'draft',
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Kegiatan manual berhasil disimpan ke laporan kinerja',
      output: newOutput,
      laporan,
    });
  } catch (error) {
    console.error('Create custom laporan error:', error);
    return NextResponse.json(
      { error: 'Terjadi kesalahan saat menyimpan kegiatan kustom' },
      { status: 500 }
    );
  }
}
