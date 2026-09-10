import { Suspense } from 'react';
import { LaporanKinerjaTable } from '@/components/laporan-kinerja/LaporanKinerjaTable';

export const metadata = {
  title: 'Laporan Kinerja | E-Kinerja Pamong Kalurahan',
  description: 'Pengisian dan rekapitulasi laporan capaian kinerja bulanan pamong kalurahan berdasarkan rencana kegiatan dan output',
};

export default function LaporanPage() {
  return (
    <div className="space-y-6">
      {/* Header Halaman (No-Print) */}
      <div className="no-print">
        <h1 className="text-2xl font-black tracking-tight text-slate-900 mb-1">
          Laporan Kinerja Pegawai
        </h1>
        <p className="text-sm text-slate-500">
          Pelaporan capaian kinerja dan kegiatan bulanan pegawai.
        </p>
      </div>

      <Suspense
        fallback={
          <div className="bg-white rounded-2xl p-12 border border-slate-200 text-center">
            <div className="inline-block w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-3" />
            <p className="text-sm text-slate-500 font-medium">Memuat Laporan Kinerja...</p>
          </div>
        }
      >
        <LaporanKinerjaTable />
      </Suspense>
    </div>
  );
}
