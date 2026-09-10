import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { hitungJarakMeter } from '@/lib/geolocation';

// Helper: parse "HH:MM" string into { hour, minute }
function parseTimeStr(t: string): { hour: number; minute: number } {
  const [h, m] = t.split(':').map(Number);
  return { hour: h, minute: m };
}

// Helper: create a Date at specific hour:minute on a given base date
function timeOnDate(base: Date, hour: number, minute: number): Date {
  const d = new Date(base);
  d.setHours(hour, minute, 0, 0);
  return d;
}

// Helper: difference in minutes (a - b)
function diffMenit(a: Date, b: Date): number {
  return Math.round((a.getTime() - b.getTime()) / 60000);
}

export async function GET(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const bulan = searchParams.get('bulan'); // format: 2024-01
    const tahun = searchParams.get('tahun'); // format: 2026
    const userId = searchParams.get('userId') || session.userId;

    // Admin bisa lihat semua, pegawai hanya milik sendiri
    if (session.role !== 'ADMIN' && userId !== session.userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const where: Record<string, unknown> = {};
    
    if (session.role === 'ADMIN' && searchParams.get('all') === 'true') {
      // Admin lihat semua
    } else {
      where.userId = userId;
    }

    if (bulan) {
      const [year, month] = bulan.split('-').map(Number);
      where.tanggal = {
        gte: new Date(year, month - 1, 1),
        lt: new Date(year, month, 1),
      };
    } else if (tahun) {
      const year = Number(tahun);
      where.tanggal = {
        gte: new Date(year, 0, 1),
        lt: new Date(year + 1, 0, 1),
      };
    }

    const presensi = await prisma.presensi.findMany({
      where,
      include: {
        user: {
          select: { nama: true, nip: true, jabatan: true },
        },
      },
      orderBy: { tanggal: 'desc' },
    });

    // Also return jam kerja settings for frontend calculations
    const jamKerja = await prisma.jamKerja.findFirst();

    return NextResponse.json({ presensi, jamKerja });
  } catch (error) {
    console.error('Get presensi error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { tipe, latitude, longitude, lokasiTugas, suket } = await request.json();

    if (!tipe || !['masuk', 'pulang'].includes(tipe)) {
      return NextResponse.json({ error: 'Tipe harus masuk atau pulang' }, { status: 400 });
    }

    // Ambil lokasi kantor
    const lokasiKantor = await prisma.lokasiKantor.findFirst();
    if (!lokasiKantor) {
      return NextResponse.json({ error: 'Lokasi kantor belum diatur' }, { status: 400 });
    }

    // Validasi jarak
    if (latitude && longitude) {
      const jarak = hitungJarakMeter(latitude, longitude, lokasiKantor.latitude, lokasiKantor.longitude);
      if (jarak > lokasiKantor.radius) {
        return NextResponse.json({
          error: `Anda berada ${Math.round(jarak)}m dari kantor, di luar radius ${lokasiKantor.radius}m`,
          jarak: Math.round(jarak),
          radius: lokasiKantor.radius,
        }, { status: 400 });
      }
    }

    // Ambil jam kerja & toleransi
    const jamKerja = await prisma.jamKerja.findFirst();
    const jamMasukStr = jamKerja?.jamMasuk || '07:30';
    const jamPulangStr = jamKerja?.jamPulang || '15:45';
    const toleransiSebelumMasuk = jamKerja?.toleransiSebelumMasuk ?? 30;
    const toleransiKeterlambatan = jamKerja?.toleransiKeterlambatan ?? 15;
    const toleransiPulang = jamKerja?.toleransiPulang ?? 120;
    const durasiKerjaStandar = jamKerja?.durasiKerjaMenit ?? 495;

    const masukParsed = parseTimeStr(jamMasukStr);
    const pulangParsed = parseTimeStr(jamPulangStr);

    // Cek presensi hari ini
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    let presensiHariIni = await prisma.presensi.findFirst({
      where: {
        userId: session.userId,
        tanggal: { gte: today, lt: tomorrow },
      },
    });

    const now = new Date();

    // ==================== ABSEN MASUK ====================
    if (tipe === 'masuk') {
      if (presensiHariIni?.jamMasuk) {
        return NextResponse.json({ error: 'Anda sudah absen masuk hari ini' }, { status: 400 });
      }

      // Cek sinkronisasi hari kerja & kalender hari libur
      const dayOfWeek = now.getDay();
      const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
      const startOfDayUtc = new Date(`${dateStr}T00:00:00.000Z`);
      const endOfDayUtc = new Date(`${dateStr}T23:59:59.999Z`);

      // Cari penetapan tanggal di tabel HariLibur
      const hariLiburRecord = await prisma.hariLibur.findFirst({
        where: {
          OR: [
            { tanggal: { gte: today, lt: tomorrow } },
            { tanggal: { gte: startOfDayUtc, lte: endOfDayUtc } },
          ],
        },
      });

      if (hariLiburRecord) {
        if (hariLiburRecord.isLibur) {
          return NextResponse.json({ 
            error: `Hari ini adalah hari libur: ${hariLiburRecord.keterangan}. Presensi pamong dinonaktifkan.` 
          }, { status: 400 });
        }
        // Jika hariLiburRecord.isLibur === false: Admin menetapkan hari ini sebagai HARI MASUK KERJA (Lembur/Override), presensi dibuka!
      } else {
        // Tidak ada penetapan khusus (status normal/bersih)
        if (dayOfWeek === 0 || dayOfWeek === 6) {
          return NextResponse.json({ 
            error: 'Hari ini adalah hari libur (akhir pekan). Presensi pamong dinonaktifkan.' 
          }, { status: 400 });
        }
      }

      // Hitung batas buka absen masuk
      const jamMasukDate = timeOnDate(today, masukParsed.hour, masukParsed.minute);
      const batasBukaAbsen = new Date(jamMasukDate.getTime() - toleransiSebelumMasuk * 60000);

      if (now < batasBukaAbsen) {
        const bukaJam = batasBukaAbsen.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
        return NextResponse.json({ 
          error: `Absen masuk belum dibuka. Batas buka pukul ${bukaJam} WIB (${toleransiSebelumMasuk} menit sebelum jam masuk).` 
        }, { status: 400 });
      }

      // Hitung batas akhir absen masuk (tidak boleh setelah jam pulang standar)
      const jamPulangStandar = timeOnDate(today, pulangParsed.hour, pulangParsed.minute);
      if (now >= jamPulangStandar) {
        const pulangJam = jamPulangStandar.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
        return NextResponse.json({ 
          error: `Batas waktu presensi masuk telah berakhir. Jam operasional kerja hari ini telah selesai pada pukul ${pulangJam} WIB.` 
        }, { status: 400 });
      }

      // Hitung keterlambatan dari jam masuk standar
      const keterlambatanMenit = Math.max(0, diffMenit(now, jamMasukDate));

      let statusMasuk: string;
      let persenTerlambat = 0;

      if (keterlambatanMenit === 0) {
        statusMasuk = 'Tepat Waktu';
      } else if (keterlambatanMenit <= toleransiKeterlambatan) {
        statusMasuk = 'Telat dalam toleransi';
      } else {
        statusMasuk = 'Terlambat';
        // Potongan persentase dihitung dari seluruh menit keterlambatan
        persenTerlambat = parseFloat(((keterlambatanMenit / durasiKerjaStandar) * 100).toFixed(2));
      }

      // Target jam pulang: Opsi A — wajib genap durasi kerja
      // jamPulangStandar + keterlambatan = mundur agar total tetap durasiKerjaStandar
      const targetJamPulang = new Date(jamPulangStandar.getTime() + keterlambatanMenit * 60000);

      const presensiData = {
        jamMasuk: now,
        latMasuk: latitude,
        lngMasuk: longitude,
        statusMasuk,
        keterlambatan: keterlambatanMenit,
        persenTerlambat,
        targetJamPulang,
        keterangan: 'e-presensi',
        lokasiTugas: lokasiTugas || 'Kantor',
        suket,
      };

      if (presensiHariIni) {
        presensiHariIni = await prisma.presensi.update({
          where: { id: presensiHariIni.id },
          data: presensiData,
        });
      } else {
        presensiHariIni = await prisma.presensi.create({
          data: {
            userId: session.userId,
            tanggal: today,
            ...presensiData,
          },
        });
      }

      const targetPulangStr = targetJamPulang.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
      let messageDetail = `Status: ${statusMasuk}`;
      if (keterlambatanMenit > 0) {
        messageDetail += ` (${keterlambatanMenit} menit)`;
      }
      messageDetail += `. Target pulang: ${targetPulangStr} WIB`;

      return NextResponse.json({
        success: true,
        message: `Berhasil absen masuk. ${messageDetail}`,
        presensi: presensiHariIni,
      });

    } else {
      // ==================== ABSEN PULANG ====================
      if (!presensiHariIni?.jamMasuk) {
        return NextResponse.json({ error: 'Anda belum absen masuk hari ini' }, { status: 400 });
      }
      if (presensiHariIni.jamPulang) {
        return NextResponse.json({ error: 'Anda sudah absen pulang hari ini' }, { status: 400 });
      }

      const jamMasukAktual = new Date(presensiHariIni.jamMasuk);
      const selisihMenitSejakMasuk = diffMenit(now, jamMasukAktual);
      if (selisihMenitSejakMasuk < 3) {
        return NextResponse.json({ 
          error: 'Jeda waktu terlalu singkat. Harap tunggu minimal 3 menit setelah absen masuk sebelum melakukan absen pulang.' 
        }, { status: 400 });
      }

      // Target jam pulang dari record presensi (sudah dihitung saat absen masuk)
      const targetPulang = presensiHariIni.targetJamPulang
        ? new Date(presensiHariIni.targetJamPulang)
        : timeOnDate(today, pulangParsed.hour, pulangParsed.minute);

      // Cek batas toleransi pulang (absen ditutup setelah X menit dari target)
      const batasTutupPulang = new Date(targetPulang.getTime() + toleransiPulang * 60000);
      if (now > batasTutupPulang) {
        const tutupJam = batasTutupPulang.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
        return NextResponse.json({ 
          error: `Batas waktu absensi pulang telah ditutup pada pukul ${tutupJam} WIB. Hubungi admin untuk pengajuan keterangan.` 
        }, { status: 400 });
      }

      // Hitung mendahului (pulang cepat)
      const selisihPulangMenit = diffMenit(now, targetPulang);
      let mendahuluiMenit = 0;
      let persenMendahului = 0;
      let statusPulang = 'Sesuai';

      if (selisihPulangMenit < 0) {
        // Pulang sebelum target
        mendahuluiMenit = Math.abs(selisihPulangMenit);
        persenMendahului = parseFloat(((mendahuluiMenit / durasiKerjaStandar) * 100).toFixed(2));
        statusPulang = 'Pulang Cepat';
      }

      // Hitung durasi kerja aktual: Jam masuk efektif dihitung mulai jam masuk standar kantor
      const jamMasukStandar = timeOnDate(today, masukParsed.hour, masukParsed.minute);
      const jamMasukEfektif = jamMasukAktual > jamMasukStandar ? jamMasukAktual : jamMasukStandar;
      const durasiKerjaAktualMenit = Math.max(0, diffMenit(now, jamMasukEfektif));
      const persentaseHarian = Math.min(100, parseFloat(((durasiKerjaAktualMenit / durasiKerjaStandar) * 100).toFixed(2)));

      presensiHariIni = await prisma.presensi.update({
        where: { id: presensiHariIni.id },
        data: {
          jamPulang: now,
          latPulang: latitude,
          lngPulang: longitude,
          mendahului: mendahuluiMenit,
          persenMendahului,
          durasiKerjaMenit: durasiKerjaAktualMenit,
          persentaseHarian,
        },
      });

      let message = 'Berhasil absen pulang.';
      if (statusPulang === 'Pulang Cepat') {
        message += ` ⚠️ Pulang ${mendahuluiMenit} menit lebih cepat dari target.`;
      }
      message += ` Jam kerja hari ini: ${Math.floor(durasiKerjaAktualMenit / 60)}j ${durasiKerjaAktualMenit % 60}m (${persentaseHarian}%)`;

      return NextResponse.json({
        success: true,
        message,
        presensi: presensiHariIni,
      });
    }
  } catch (error) {
    console.error('Presensi error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
