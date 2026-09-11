import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';

export async function GET() {
  try {
    let settings = await prisma.appSettings.findUnique({
      where: { id: 'default' },
    });

    if (!settings) {
      settings = await prisma.appSettings.create({
        data: {
          id: 'default',
          namaApp: 'E-KINERJA',
          namaKantor: 'Kalurahan',
          subJudul: 'Sistem Informasi Pamong',
        },
      });
    }

    if (settings && (settings as any).sembunyikanNipAtasan === undefined) {
      try {
        const rawResult: any[] = await prisma.$queryRawUnsafe(
          `SELECT "sembunyikanNipAtasan" FROM "AppSettings" WHERE "id" = 'default' LIMIT 1`
        );
        if (rawResult && rawResult.length > 0) {
          (settings as any).sembunyikanNipAtasan = Boolean(rawResult[0].sembunyikanNipAtasan);
        }
      } catch {}
    }

    return NextResponse.json({ settings });
  } catch (error) {
    console.error('Get settings error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const session = await getSession();
    if (!session || session.role !== 'SUPERADMIN') {
      return NextResponse.json({ error: 'Akses ditolak. Hanya Super Admin yang dapat mengubah pengaturan aplikasi.' }, { status: 403 });
    }

    const body = await request.json();

    // Persiapkan data update secara fleksibel (partial update)
    const updateData: Record<string, any> = {};

    if (body.namaApp !== undefined) {
      if (!body.namaApp.trim()) return NextResponse.json({ error: 'Nama Aplikasi tidak boleh kosong.' }, { status: 400 });
      updateData.namaApp = body.namaApp.trim();
    }
    if (body.namaKantor !== undefined) {
      if (!body.namaKantor.trim()) return NextResponse.json({ error: 'Nama Kantor tidak boleh kosong.' }, { status: 400 });
      updateData.namaKantor = body.namaKantor.trim();
    }
    if (body.subJudul !== undefined) updateData.subJudul = body.subJudul ? body.subJudul.trim() : 'Sistem Informasi Pamong';
    if (body.logoUrl !== undefined) updateData.logoUrl = body.logoUrl || null;

    // Pengaturan Kop Laporan
    if (body.kopLogoUrl !== undefined) updateData.kopLogoUrl = body.kopLogoUrl || null;
    if (body.kopAksaraUrl !== undefined) updateData.kopAksaraUrl = body.kopAksaraUrl || null;
    if (body.kopNamaPemda !== undefined) updateData.kopNamaPemda = body.kopNamaPemda ? body.kopNamaPemda.trim() : null;
    if (body.kopNamaInstansi !== undefined) updateData.kopNamaInstansi = body.kopNamaInstansi ? body.kopNamaInstansi.trim() : null;
    if (body.kopAlamat !== undefined) updateData.kopAlamat = body.kopAlamat ? body.kopAlamat.trim() : null;
    if (body.kopKontak !== undefined) updateData.kopKontak = body.kopKontak ? body.kopKontak.trim() : null;

    // Pengaturan Ukuran Kertas Cetak & Posisi Dokumen
    if (body.ukuranKertas !== undefined) {
      const validSizes = ['A4', 'F4'];
      updateData.ukuranKertas = validSizes.includes(body.ukuranKertas) ? body.ukuranKertas : 'A4';
    }
    if (body.posisiDokumen !== undefined) {
      const validPositions = ['portrait', 'landscape'];
      updateData.posisiDokumen = validPositions.includes(body.posisiDokumen) ? body.posisiDokumen : 'portrait';
    }
    if (body.sembunyikanNip !== undefined) {
      updateData.sembunyikanNip = Boolean(body.sembunyikanNip);
    }
    if (body.sembunyikanNipAtasan !== undefined) {
      updateData.sembunyikanNipAtasan = Boolean(body.sembunyikanNipAtasan);
    }

    // Pengaturan Template Tanda Tangan
    if (body.ttdTempat !== undefined) updateData.ttdTempat = body.ttdTempat ? body.ttdTempat.trim() : null;
    if (body.ttdJudulKiri !== undefined) updateData.ttdJudulKiri = body.ttdJudulKiri ? body.ttdJudulKiri.trim() : null;
    if (body.ttdAtasanUserId !== undefined) updateData.ttdAtasanUserId = body.ttdAtasanUserId || null;
    if (body.ttdAtasanStatus !== undefined) updateData.ttdAtasanStatus = body.ttdAtasanStatus ? body.ttdAtasanStatus.trim() : null;
    if (body.ttdAtasanJabatan !== undefined) updateData.ttdAtasanJabatan = body.ttdAtasanJabatan ? body.ttdAtasanJabatan.trim() : null;
    if (body.ttdAtasanNama !== undefined) updateData.ttdAtasanNama = body.ttdAtasanNama ? body.ttdAtasanNama.trim() : null;
    if (body.ttdAtasanNip !== undefined) updateData.ttdAtasanNip = body.ttdAtasanNip ? body.ttdAtasanNip.trim() : null;

    let settings;
    try {
      settings = await prisma.appSettings.upsert({
        where: { id: 'default' },
        update: updateData,
        create: {
          id: 'default',
          namaApp: body.namaApp?.trim() || 'E-KINERJA',
          namaKantor: body.namaKantor?.trim() || 'Kalurahan',
          subJudul: body.subJudul?.trim() || 'Sistem Informasi Pamong',
          ...updateData,
        },
      });
    } catch (upsertError: any) {
      console.warn('Prisma upsert fallback triggered:', upsertError?.message);
      const { sembunyikanNipAtasan, ...safeUpdateData } = updateData;
      settings = await prisma.appSettings.upsert({
        where: { id: 'default' },
        update: safeUpdateData,
        create: {
          id: 'default',
          namaApp: body.namaApp?.trim() || 'E-KINERJA',
          namaKantor: body.namaKantor?.trim() || 'Kalurahan',
          subJudul: body.subJudul?.trim() || 'Sistem Informasi Pamong',
          ...safeUpdateData,
        },
      });
      if (sembunyikanNipAtasan !== undefined) {
        await prisma.$executeRawUnsafe(
          `UPDATE "AppSettings" SET "sembunyikanNipAtasan" = $1 WHERE "id" = 'default'`,
          Boolean(sembunyikanNipAtasan)
        );
        (settings as any).sembunyikanNipAtasan = Boolean(sembunyikanNipAtasan);
      }
    }

    return NextResponse.json({ success: true, settings });
  } catch (error: any) {
    console.error('Update settings error:', error);
    return NextResponse.json({ error: error?.message || 'Server error saat menyimpan pengaturan.' }, { status: 500 });
  }
}
