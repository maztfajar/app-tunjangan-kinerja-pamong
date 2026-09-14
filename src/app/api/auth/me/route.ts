import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { id: true, username: true, nama: true, jabatan: true, unitKerja: true, role: true },
    });

    return NextResponse.json({ user: user ? { ...user, nip: user.username } : null });
  } catch (err) {
    console.error('Auth me error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
