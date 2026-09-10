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
    const { jabatanId, mode = 'append', items = [], flatRows = [] } = body;

    if (!jabatanId) {
      return NextResponse.json({ error: 'Parameter jabatanId diperlukan' }, { status: 400 });
    }

    const jabatan = await prisma.masterJabatan.findUnique({
      where: { id: jabatanId },
    });

    if (!jabatan) {
      return NextResponse.json({ error: 'Jabatan tidak ditemukan' }, { status: 404 });
    }

    // Jika mode replace, hapus semua rencana kegiatan untuk jabatan ini terlebih dahulu
    if (mode === 'replace') {
      await prisma.rencanaKegiatan.deleteMany({
        where: { jabatanId },
      });
    }

    // Tentukan nomor urut awal
    const lastRencana = await prisma.rencanaKegiatan.findFirst({
      where: { jabatanId },
      orderBy: { noUrut: 'desc' },
    });
    let currentNoUrut = (lastRencana?.noUrut || 0);

    // Normalisasi input: baik dari struktur nested maupun flat tabular
    const processedItems: {
      noUrut: number;
      rencanaKegiatan: string;
      outputs: { kodeHuruf: string; output: string; pedomanPengisian?: string | null; noUrut: number }[];
    }[] = [];

    if (Array.isArray(items) && items.length > 0) {
      for (const item of items) {
        if (!item.rencanaKegiatan?.trim()) continue;
        currentNoUrut += 1;
        const outputs = (item.outputs || []).map((o: any, idx: number) => ({
          kodeHuruf: o.kodeHuruf?.trim() || String.fromCharCode(97 + (idx % 26)),
          output: String(o.output || '').trim(),
          pedomanPengisian: o.pedomanPengisian ? String(o.pedomanPengisian).trim() : null,
          noUrut: o.noUrut || idx + 1,
        })).filter((o: any) => o.output !== '');

        processedItems.push({
          noUrut: item.noUrut || currentNoUrut,
          rencanaKegiatan: item.rencanaKegiatan.trim(),
          outputs,
        });
      }
    } else if (Array.isArray(flatRows) && flatRows.length > 0) {
      // Grouping flat tabular rows by rencanaKegiatan
      const mapRencana = new Map<string, {
        noUrut: number;
        rencanaKegiatan: string;
        outputs: { kodeHuruf: string; output: string; pedomanPengisian?: string | null; noUrut: number }[];
      }>();

      for (const row of flatRows) {
        const rencana = (row.rencanaKegiatan || row.rencana || '').trim();
        const output = (row.output || '').trim();
        if (!rencana) continue;

        if (!mapRencana.has(rencana)) {
          currentNoUrut += 1;
          mapRencana.set(rencana, {
            noUrut: Number(row.no || row.noUrut) || currentNoUrut,
            rencanaKegiatan: rencana,
            outputs: [],
          });
        }

        const entry = mapRencana.get(rencana)!;
        if (output) {
          const outCount = entry.outputs.length;
          entry.outputs.push({
            kodeHuruf: row.kodeHuruf || row.kode || String.fromCharCode(97 + (outCount % 26)),
            output,
            pedomanPengisian: row.pedomanPengisian ? String(row.pedomanPengisian).trim() : null,
            noUrut: outCount + 1,
          });
        }
      }

      processedItems.push(...Array.from(mapRencana.values()));
    }

    if (processedItems.length === 0) {
      return NextResponse.json({ error: 'Tidak ada data valid yang dapat diimpor' }, { status: 400 });
    }

    // Insert ke database
    let totalOutputInserted = 0;
    for (const item of processedItems) {
      const createdRencana = await prisma.rencanaKegiatan.create({
        data: {
          jabatanId,
          noUrut: item.noUrut,
          rencanaKegiatan: item.rencanaKegiatan,
        },
      });

      if (item.outputs.length > 0) {
        for (const out of item.outputs) {
          await prisma.outputKegiatan.create({
            data: {
              rencanaKegiatanId: createdRencana.id,
              kodeHuruf: out.kodeHuruf,
              output: out.output,
              pedomanPengisian: out.pedomanPengisian,
              noUrut: out.noUrut,
            },
          });
          totalOutputInserted += 1;
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: `Berhasil mengimpor ${processedItems.length} Rencana Kegiatan dan ${totalOutputInserted} Output Kegiatan`,
    });
  } catch (error) {
    console.error('Import master kinerja error:', error);
    return NextResponse.json({ error: 'Gagal mengimpor master kinerja' }, { status: 500 });
  }
}
