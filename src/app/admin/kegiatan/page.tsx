'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function AdminKegiatanRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/admin/master-kinerja');
  }, [router]);

  return (
    <div className="p-12 text-center bg-white rounded-2xl border border-slate-200 shadow-sm">
      <div className="inline-block w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4" />
      <h3 className="text-base font-bold text-slate-800">Mengalihkan ke Master Kinerja Jabatan...</h3>
      <p className="text-sm text-slate-500 mt-1 mb-4">
        Menu ini telah diperbarui menjadi struktur berjenjang Rencana Kegiatan & Output Kegiatan.
      </p>
      <Link
        href="/admin/master-kinerja"
        className="px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-xl inline-block hover:bg-blue-700"
      >
        Buka Master Kinerja Jabatan
      </Link>
    </div>
  );
}
