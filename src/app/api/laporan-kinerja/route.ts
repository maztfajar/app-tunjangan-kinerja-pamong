import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthUser } from '@/lib/auth';

function currentPeriode() {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  return `${now.getFullYear()}-${month}`;
}

export async function GET(req: NextRequest) {
  try {
    const user = await getAuthUser(req);
    if (!user) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const periodeParam = searchParams.get('periode') || currentPeriode();
    const jabatanIdParam = searchParams.get('jabatanId');
    const userIdParam = searchParams.get('userId');

    const isAdmin = user.role === 'ADMIN' || user.role === 'SUPERADMIN';
    const jabatanList = await prisma.masterJabatan.findMany({
      orderBy: { nama: 'asc' },
    });

    let targetJabatanId: string | null = null;

    // 1. Jika ada param jabatanId dan user adalah admin, gunakan itu
    if (isAdmin && jabatanIdParam) {
      targetJabatanId = jabatanIdParam;
    }

    // 2. Cocokkan berdasarkan nama jabatan pegawai saat didaftarkan di Data Pegawai
    if (!targetJabatanId && user.jabatan) {
      const norm = (s: string) => s.toLowerCase().replace(/ff/g, 'f').trim();
      const targetNorm = norm(user.jabatan);

      const match = jabatanList.find((j) => {
        const jNorm = norm(j.nama);
        return (
          jNorm === targetNorm ||
          jNorm.includes(targetNorm) ||
          targetNorm.includes(jNorm)
        );
      });

      if (match) {
        targetJabatanId = match.id;
      } else {
        // Jika belum ada di MasterJabatan, auto-create agar sinkron dengan Data Pegawai
        try {
          const newMj = await prisma.masterJabatan.create({
            data: { nama: user.jabatan, kategori: 'Pegawai' },
          });
          if (newMj) targetJabatanId = newMj.id;
        } catch {
          const fallbackMj = await prisma.masterJabatan.findFirst({
            where: { nama: { equals: user.jabatan, mode: 'insensitive' } },
          });
          if (fallbackMj) targetJabatanId = fallbackMj.id;
        }
      }
    }

    // 3. Fallback jika user punya jabatanId langsung
    if (!targetJabatanId && user.jabatanId) {
      targetJabatanId = user.jabatanId;
    }

    // 4. Fallback ke jabatan pertama jika belum ketemu
    if (!targetJabatanId && jabatanList.length > 0) {
      targetJabatanId = jabatanList[0].id;
    }

    let currentJabatan = null;
    if (targetJabatanId) {
      currentJabatan = await prisma.masterJabatan.findUnique({
        where: { id: targetJabatanId },
      });
    }

    const targetUserId = isAdmin && userIdParam ? userIdParam : user.id;
    const periodeDate = new Date(`${periodeParam}-01T00:00:00.000Z`);

    const rencanaList = targetJabatanId
      ? await prisma.rencanaKegiatan.findMany({
          where: {
            jabatanId: targetJabatanId,
            isActive: true,
          },
          orderBy: { noUrut: 'asc' },
          include: {
            outputs: {
              where: { isActive: true },
              orderBy: { noUrut: 'asc' },
              include: {
                laporan: {
                  where: {
                    userId: targetUserId,
                    periode: periodeDate,
                  },
                },
              },
            },
          },
        })
      : [];

    const totalOutput = rencanaList.reduce((sum, r) => sum + r.outputs.length, 0);
    const totalDiisi = rencanaList.reduce(
      (sum, r) =>
        sum +
        r.outputs.filter((o) => {
          const lap = o.laporan[0];
          return Boolean(
            (lap?.capaian && lap.capaian.trim() !== '') ||
            (lap?.keterangan && lap.keterangan.trim() !== '')
          );
        }).length,
      0
    );

    return NextResponse.json({
      success: true,
      periode: periodeParam,
      user: {
        id: user.id,
        nama: user.nama,
        nip: user.nip,
        jabatan: user.jabatan,
        unitKerja: user.unitKerja,
        role: user.role,
      },
      jabatan: currentJabatan,
      jabatanList,
      totalKegiatan: totalOutput,
      sudahDiisi: totalDiisi,
      data: rencanaList,
    });
  } catch (error) {
    console.error('Get laporan kinerja error:', error);
    return NextResponse.json({ error: 'Gagal mengambil laporan kinerja' }, { status: 500 });
  }
}
