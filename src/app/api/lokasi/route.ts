import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';

export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const lokasi = await prisma.lokasiKantor.findFirst();
    return NextResponse.json({ lokasi });
  } catch (error) {
    console.error('Get lokasi error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session || (session.role !== 'SUPERADMIN' && session.role !== 'ADMIN')) {
      return NextResponse.json({ error: 'Akses ditolak. Hanya Super Admin atau Admin yang dapat mengubah lokasi kantor.' }, { status: 403 });
    }

    const { namaLokasi, latitude, longitude, radius } = await request.json();

    // Upsert - update jika sudah ada, buat baru jika belum
    const existing = await prisma.lokasiKantor.findFirst();
    
    let lokasi;
    if (existing) {
      lokasi = await prisma.lokasiKantor.update({
        where: { id: existing.id },
        data: { namaLokasi, latitude, longitude, radius: radius || 100 },
      });
    } else {
      lokasi = await prisma.lokasiKantor.create({
        data: { namaLokasi, latitude, longitude, radius: radius || 100 },
      });
    }

    return NextResponse.json({ success: true, lokasi });
  } catch (error) {
    console.error('Post lokasi error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
