import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';

const DEFAULT_JABATAN = [
  { nama: 'Lurah', kategori: 'Pimpinan' },
  { nama: 'Carik (Sekretaris)', kategori: 'Pamong' },
  { nama: 'Jagabaya (Kasi Pemerintahan)', kategori: 'Pamong' },
  { nama: 'Ulu-Ulu (Kasi Kesejahteraan)', kategori: 'Pamong' },
  { nama: 'Kamituwa (Kasi Pelayanan)', kategori: 'Pamong' },
  { nama: 'Kaur Danarta (Keuangan)', kategori: 'Pamong' },
  { nama: 'Kaur Tata Laksana (Umum)', kategori: 'Pamong' },
  { nama: 'Kaur Pangripta (Perencanaan)', kategori: 'Pamong' },
  { nama: 'Staf Pamong', kategori: 'Staf' },
  { nama: 'Dukuh', kategori: 'Wilayah' },
];

const DEFAULT_UNIT_KERJA = [
  { nama: 'Pemerintah Kalurahan', kategori: 'Kalurahan' },
  { nama: 'Sekretariat Kalurahan', kategori: 'Kalurahan' },
  { nama: 'Seksi Pemerintahan', kategori: 'Kalurahan' },
  { nama: 'Seksi Kesejahteraan', kategori: 'Kalurahan' },
  { nama: 'Seksi Pelayanan', kategori: 'Kalurahan' },
  { nama: 'Urusan Keuangan (Danarta)', kategori: 'Kalurahan' },
  { nama: 'Urusan Umum (Tata Laksana)', kategori: 'Kalurahan' },
  { nama: 'Urusan Perencanaan (Pangripta)', kategori: 'Kalurahan' },
  { nama: 'Padukuhan / Wilayah', kategori: 'Wilayah' },
];

// Helper auto-seed jika tabel masih kosong
async function ensureSeed() {
  const countJabatan = await prisma.masterJabatan.count();
  if (countJabatan === 0) {
    for (const item of DEFAULT_JABATAN) {
      await prisma.masterJabatan.create({
        data: item,
      }).catch(() => {});
    }
  }

  const countUnit = await prisma.masterUnitKerja.count();
  if (countUnit === 0) {
    for (const item of DEFAULT_UNIT_KERJA) {
      await prisma.masterUnitKerja.create({
        data: item,
      }).catch(() => {});
    }
  }
}

export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await ensureSeed();

    const [jabatanList, unitKerjaList, userStats] = await Promise.all([
      prisma.masterJabatan.findMany({ orderBy: { nama: 'asc' } }),
      prisma.masterUnitKerja.findMany({ orderBy: { nama: 'asc' } }),
      prisma.user.findMany({
        select: { jabatan: true, unitKerja: true },
      }),
    ]);

    // Hitung jumlah pegawai per jabatan & unit kerja
    const jabatanCountMap: Record<string, number> = {};
    const unitCountMap: Record<string, number> = {};

    userStats.forEach((u) => {
      if (u.jabatan) {
        jabatanCountMap[u.jabatan] = (jabatanCountMap[u.jabatan] || 0) + 1;
      }
      if (u.unitKerja) {
        unitCountMap[u.unitKerja] = (unitCountMap[u.unitKerja] || 0) + 1;
      }
    });

    const jabatanWithCount = jabatanList.map((j) => ({
      ...j,
      totalPegawai: jabatanCountMap[j.nama] || 0,
    }));

    const unitWithCount = unitKerjaList.map((u) => ({
      ...u,
      totalPegawai: unitCountMap[u.nama] || 0,
    }));

    return NextResponse.json({
      success: true,
      jabatan: jabatanWithCount,
      unitKerja: unitWithCount,
    });
  } catch (error) {
    console.error('Get master jabatan error:', error);
    return NextResponse.json({ error: 'Gagal mengambil data master jabatan' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session || (session.role !== 'ADMIN' && session.role !== 'SUPERADMIN')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { type, nama, kategori } = await request.json();

    if (!nama || !nama.trim()) {
      return NextResponse.json({ error: 'Nama kategori wajib diisi' }, { status: 400 });
    }

    const cleanNama = nama.trim();

    if (type === 'unitKerja') {
      const existing = await prisma.masterUnitKerja.findUnique({ where: { nama: cleanNama } });
      if (existing) {
        return NextResponse.json({ error: `Unit Kerja "${cleanNama}" sudah terdaftar` }, { status: 400 });
      }

      const item = await prisma.masterUnitKerja.create({
        data: {
          nama: cleanNama,
          kategori: kategori?.trim() || 'Kalurahan',
        },
      });

      return NextResponse.json({
        success: true,
        message: `Unit Kerja "${cleanNama}" berhasil ditambahkan`,
        item,
      });
    } else {
      // Default: type === 'jabatan'
      const existing = await prisma.masterJabatan.findUnique({ where: { nama: cleanNama } });
      if (existing) {
        return NextResponse.json({ error: `Jabatan "${cleanNama}" sudah terdaftar` }, { status: 400 });
      }

      const item = await prisma.masterJabatan.create({
        data: {
          nama: cleanNama,
          kategori: kategori?.trim() || 'Pamong',
        },
      });

      return NextResponse.json({
        success: true,
        message: `Jabatan "${cleanNama}" berhasil ditambahkan`,
        item,
      });
    }
  } catch (error) {
    console.error('Create master jabatan error:', error);
    return NextResponse.json({ error: 'Gagal menyimpan kategori baru', details: String(error) }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const session = await getSession();
    if (!session || (session.role !== 'ADMIN' && session.role !== 'SUPERADMIN')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'ID diperlukan untuk menghapus' }, { status: 400 });
    }

    if (type === 'unitKerja') {
      const item = await prisma.masterUnitKerja.findUnique({ where: { id } });
      if (!item) {
        return NextResponse.json({ error: 'Unit Kerja tidak ditemukan' }, { status: 404 });
      }

      await prisma.masterUnitKerja.delete({ where: { id } });
      return NextResponse.json({
        success: true,
        message: `Unit Kerja "${item.nama}" berhasil dihapus`,
      });
    } else {
      const item = await prisma.masterJabatan.findUnique({ where: { id } });
      if (!item) {
        return NextResponse.json({ error: 'Jabatan tidak ditemukan' }, { status: 404 });
      }

      await prisma.masterJabatan.delete({ where: { id } });
      return NextResponse.json({
        success: true,
        message: `Jabatan "${item.nama}" berhasil dihapus`,
      });
    }
  } catch (error) {
    console.error('Delete master jabatan error:', error);
    return NextResponse.json({ error: 'Gagal menghapus kategori', details: String(error) }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const session = await getSession();
    if (!session || (session.role !== 'ADMIN' && session.role !== 'SUPERADMIN')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id, type, nama, kategori } = await request.json();

    if (!id) {
      return NextResponse.json({ error: 'ID kategori wajib diisi' }, { status: 400 });
    }
    if (!nama || !nama.trim()) {
      return NextResponse.json({ error: 'Nama kategori wajib diisi' }, { status: 400 });
    }

    const cleanNama = nama.trim();

    if (type === 'unitKerja') {
      const existing = await prisma.masterUnitKerja.findFirst({
        where: {
          nama: cleanNama,
          NOT: { id },
        },
      });
      if (existing) {
        return NextResponse.json({ error: `Unit Kerja "${cleanNama}" sudah terdaftar` }, { status: 400 });
      }

      const oldItem = await prisma.masterUnitKerja.findUnique({ where: { id } });
      if (!oldItem) {
        return NextResponse.json({ error: 'Unit Kerja tidak ditemukan' }, { status: 404 });
      }

      const item = await prisma.masterUnitKerja.update({
        where: { id },
        data: {
          nama: cleanNama,
          kategori: kategori?.trim() || oldItem.kategori || 'Kalurahan',
        },
      });

      // Update referensi unitKerja di tabel User jika nama berubah
      if (oldItem.nama !== cleanNama) {
        await prisma.user.updateMany({
          where: { unitKerja: oldItem.nama },
          data: { unitKerja: cleanNama },
        });
      }

      return NextResponse.json({
        success: true,
        message: `Unit Kerja berhasil diperbarui menjadi "${cleanNama}"`,
        item,
      });
    } else {
      // Default: type === 'jabatan'
      const existing = await prisma.masterJabatan.findFirst({
        where: {
          nama: cleanNama,
          NOT: { id },
        },
      });
      if (existing) {
        return NextResponse.json({ error: `Jabatan "${cleanNama}" sudah terdaftar` }, { status: 400 });
      }

      const oldItem = await prisma.masterJabatan.findUnique({ where: { id } });
      if (!oldItem) {
        return NextResponse.json({ error: 'Jabatan tidak ditemukan' }, { status: 404 });
      }

      const item = await prisma.masterJabatan.update({
        where: { id },
        data: {
          nama: cleanNama,
          kategori: kategori?.trim() || oldItem.kategori || 'Pamong',
        },
      });

      // Update referensi jabatan di tabel User jika nama berubah
      if (oldItem.nama !== cleanNama) {
        await prisma.user.updateMany({
          where: { jabatan: oldItem.nama },
          data: { jabatan: cleanNama },
        });
      }

      return NextResponse.json({
        success: true,
        message: `Jabatan berhasil diperbarui menjadi "${cleanNama}"`,
        item,
      });
    }
  } catch (error) {
    console.error('Update master jabatan error:', error);
    return NextResponse.json({ error: 'Gagal memperbarui kategori', details: String(error) }, { status: 500 });
  }
}
