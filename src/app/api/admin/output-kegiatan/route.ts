import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthUser } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const user = await getAuthUser(req);
    if (!user || (user.role !== 'ADMIN' && user.role !== 'SUPERADMIN')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { rencanaKegiatanId: rawRencanaId, output, pedomanPengisian, kodeHuruf: rawKode, noUrut: rawNoUrut } = body;

    const rencanaKegiatanId = Number(rawRencanaId);
    if (!rencanaKegiatanId || !output?.trim()) {
      return NextResponse.json(
        { error: 'Rencana kegiatan dan nama output wajib diisi' },
        { status: 400 }
      );
    }

    const parent = await prisma.rencanaKegiatan.findUnique({
      where: { id: rencanaKegiatanId },
      include: { outputs: { orderBy: { noUrut: 'asc' } } },
    });

    if (!parent) {
      return NextResponse.json({ error: 'Rencana kegiatan tidak ditemukan' }, { status: 404 });
    }

    // Auto-generate noUrut dan kodeHuruf (a, b, c...) jika tidak diisi manual
    const existingCount = parent.outputs.length;
    let noUrut = Number(rawNoUrut);
    if (!noUrut || isNaN(noUrut) || noUrut <= 0) {
      const last = parent.outputs[existingCount - 1];
      noUrut = (last?.noUrut || 0) + 1;
    }

    let kodeHuruf = rawKode?.trim();
    if (!kodeHuruf) {
      // otomatis 'a', 'b', 'c' ... dst
      kodeHuruf = String.fromCharCode(97 + (existingCount % 26));
    }

    const item = await prisma.outputKegiatan.create({
      data: {
        rencanaKegiatanId,
        kodeHuruf,
        output: output.trim(),
        pedomanPengisian: pedomanPengisian?.trim() || null,
        noUrut,
      },
    });

    return NextResponse.json({ success: true, data: item, message: 'Output kegiatan berhasil ditambahkan' });
  } catch (error) {
    console.error('Create admin output-kegiatan error:', error);
    return NextResponse.json({ error: 'Gagal menambah output kegiatan' }, { status: 500 });
  }
}
