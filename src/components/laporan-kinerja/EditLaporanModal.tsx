'use client';

import { useEffect, useMemo, useState } from 'react';
import { IconClose } from '@/components/ui/Icons';
import { OutputItem, RencanaItem } from './LaporanKinerjaTable';

interface EditLaporanModalProps {
  rencanaList: RencanaItem[];
  initialRencanaId?: number;
  initialOutputId?: number;
  periode: string;
  jabatanId?: string;
  isAdmin?: boolean;
  targetUserId?: string;
  onClose: () => void;
  onSaved: () => void;
}

export function EditLaporanModal({
  rencanaList,
  initialRencanaId,
  initialOutputId,
  periode,
  jabatanId,
  isAdmin = false,
  targetUserId,
  onClose,
  onSaved,
}: EditLaporanModalProps) {
  // Mode: 'TEMPLATE' (Pilih dari template jabatan) atau 'MANUAL' (Tulis manual kustom)
  const [entryMode, setEntryMode] = useState<'TEMPLATE' | 'MANUAL'>('TEMPLATE');

  // State untuk TEMPLATE mode
  const [selectedRencanaId, setSelectedRencanaId] = useState<number>(() => {
    if (initialRencanaId) return initialRencanaId;
    if (initialOutputId) {
      const found = rencanaList.find((r) => r.outputs.some((o) => o.id === initialOutputId));
      if (found) return found.id;
    }
    return rencanaList[0]?.id || 0;
  });

  const availableOutputs = useMemo(() => {
    const currentRencana = rencanaList.find((r) => r.id === selectedRencanaId);
    return currentRencana?.outputs || [];
  }, [rencanaList, selectedRencanaId]);

  const [selectedOutputId, setSelectedOutputId] = useState<number>(() => {
    if (initialOutputId) return initialOutputId;
    return availableOutputs[0]?.id || 0;
  });

  // Saat selectedRencanaId berubah, perbarui selectedOutputId jika tidak valid
  useEffect(() => {
    const currentRencana = rencanaList.find((r) => r.id === selectedRencanaId);
    const outputs = currentRencana?.outputs || [];
    if (!outputs.some((o) => o.id === selectedOutputId)) {
      setSelectedOutputId(outputs[0]?.id || 0);
    }
  }, [selectedRencanaId, rencanaList, selectedOutputId]);

  // Cari output aktif
  const currentOutput = useMemo(() => {
    for (const r of rencanaList) {
      const out = r.outputs.find((o) => o.id === selectedOutputId);
      if (out) return { output: out, rencanaTitle: r.rencanaKegiatan };
    }
    return null;
  }, [rencanaList, selectedOutputId]);

  // Form input pengguna (Target, Capaian, Keterangan)
  const [target, setTarget] = useState('');
  const [capaian, setCapaian] = useState('');
  const [keterangan, setKeterangan] = useState('');

  // Sinkronkan input form dengan data yang sudah pernah diisi untuk output terpilih
  useEffect(() => {
    if (entryMode === 'TEMPLATE' && currentOutput) {
      const lap = currentOutput.output.laporan?.[0];
      setTarget(lap?.target || '');
      setCapaian(lap?.capaian || '');
      setKeterangan(lap?.keterangan || '');
    }
  }, [currentOutput, entryMode]);

  // State untuk MANUAL / KUSTOM mode
  const [manualMode, setManualMode] = useState<'EXISTING_RENCANA' | 'NEW_RENCANA'>('EXISTING_RENCANA');
  const [manualRencanaId, setManualRencanaId] = useState<number>(rencanaList[0]?.id || 0);
  const [newRencanaKegiatan, setNewRencanaKegiatan] = useState('');
  const [customOutput, setCustomOutput] = useState('');
  const [customPedoman, setCustomPedoman] = useState('');

  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Handle ESC key to close & toggle body class
  useEffect(() => {
    document.body.classList.add('hide-top-navbar-on-modal', 'modal-open');
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.classList.remove('hide-top-navbar-on-modal', 'modal-open');
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose]);

  const formatPeriodeIndo = (p: string) => {
    if (!p) return '-';
    const [year, month] = p.split('-');
    const months = [
      'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
      'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
    ];
    return `${months[parseInt(month, 10) - 1] || month} ${year}`;
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setErrorMsg(null);

    try {
      if (entryMode === 'TEMPLATE') {
        if (!selectedOutputId) {
          setErrorMsg('Pilih Rencana Kegiatan dan Output terlebih dahulu');
          setSaving(false);
          return;
        }

        const res = await fetch(`/api/laporan-kinerja/${selectedOutputId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            periode,
            target,
            capaian,
            keterangan,
            targetUserId,
          }),
        });

        const data = await res.json();
        if (!res.ok) {
          setErrorMsg(data.error || 'Gagal menyimpan isian kinerja');
          setSaving(false);
          return;
        }
      } else {
        // MANUAL MODE
        if (!customOutput.trim()) {
          setErrorMsg('Nama Output kegiatan wajib diisi');
          setSaving(false);
          return;
        }

        if (manualMode === 'NEW_RENCANA' && !newRencanaKegiatan.trim()) {
          setErrorMsg('Nama Rencana Kegiatan baru wajib diisi');
          setSaving(false);
          return;
        }

        const res = await fetch('/api/laporan-kinerja/custom', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            mode: manualMode,
            jabatanId,
            rencanaKegiatanId: manualRencanaId,
            newRencanaKegiatan,
            output: customOutput,
            pedomanPengisian: customPedoman,
            periode,
            target,
            capaian,
            keterangan,
            targetUserId,
          }),
        });

        const data = await res.json();
        if (!res.ok) {
          setErrorMsg(data.error || 'Gagal menyimpan kegiatan manual');
          setSaving(false);
          return;
        }
      }

      onSaved();
    } catch {
      setErrorMsg('Terjadi kesalahan koneksi saat menyimpan laporan');
    }
    setSaving(false);
  }

  return (
    <div
      className="modal-overlay fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-[100000] p-4 animate-fade-in"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-xl max-h-[92vh] flex flex-col overflow-hidden animate-scale-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* HEADER MODAL */}
        <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between border-b border-slate-800 shrink-0">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-blue-400 bg-blue-950/80 px-2 py-0.5 rounded border border-blue-800/60">
                Input Laporan Kinerja
              </span>
              <span className="text-xs text-slate-300 font-medium">
                Periode: {formatPeriodeIndo(periode)}
              </span>
            </div>
            <h3 className="text-lg font-bold text-white mt-1">
              Pengisian Butir Capaian Kinerja
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 transition-colors"
            title="Tutup"
          >
            <IconClose size={20} />
          </button>
        </div>

        {/* TAB PILIHAN MODE: TEMPLATE VS MANUAL */}
        <div className="px-6 pt-3 pb-2 bg-slate-50 border-b border-slate-200 flex items-center justify-between gap-2 shrink-0">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setEntryMode('TEMPLATE')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                entryMode === 'TEMPLATE'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-white text-slate-600 hover:bg-slate-200 border border-slate-200'
              }`}
            >
              📋 Dari Template Baku Jabatan
            </button>
            <button
              type="button"
              onClick={() => setEntryMode('MANUAL')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                entryMode === 'MANUAL'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-white text-slate-600 hover:bg-slate-200 border border-slate-200'
              }`}
            >
              ✍️ Tulis Manual / Kustom
            </button>
          </div>
          <span className="text-[11px] text-slate-500 hidden sm:inline">
            {entryMode === 'TEMPLATE' ? 'Rencana & Output tersinkron' : 'Buat butir kegiatan baru'}
          </span>
        </div>

        {/* FORM BODY */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto flex-1 text-slate-800">
          {errorMsg && (
            <div className="p-3 text-xs bg-rose-50 text-rose-700 border border-rose-200 rounded-xl font-medium flex items-center gap-2">
              <span>⚠️</span>
              <span>{errorMsg}</span>
            </div>
          )}

          {/* ========================================================
              MODE 1: PILIH DARI TEMPLATE JABATAN (TERSIKRONISASI)
             ======================================================== */}
          {entryMode === 'TEMPLATE' ? (
            <div className="space-y-3.5 bg-slate-50/70 p-4 rounded-xl border border-slate-200">
              {/* 1. DROP DOWN RENCANA KEGIATAN */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  1. Rencana Kegiatan <span className="text-blue-600">*</span>
                </label>
                {rencanaList.length === 0 ? (
                  <div className="text-xs text-amber-700 bg-amber-50 p-2.5 rounded-lg border border-amber-200">
                    Belum ada template rencana kegiatan untuk jabatan ini. Anda dapat beralih ke tab <b>Tulis Manual / Kustom</b>.
                  </div>
                ) : (
                  <select
                    value={selectedRencanaId}
                    onChange={(e) => setSelectedRencanaId(Number(e.target.value))}
                    className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2.5 text-xs sm:text-sm font-medium text-slate-800 shadow-2xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
                  >
                    {rencanaList.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.noUrut}. {r.rencanaKegiatan}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* 2. DROP DOWN OUTPUT KEGIATAN (TERSINKRON DENGAN RENCANA KEGIATAN) */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                    2. Output Kegiatan (Tersinkron) <span className="text-blue-600">*</span>
                  </label>
                  <span className="text-[11px] text-blue-700 font-semibold">
                    {availableOutputs.length} Pilihan Output
                  </span>
                </div>

                {availableOutputs.length === 0 ? (
                  <div className="text-xs text-slate-500 bg-white p-2.5 rounded-lg border border-slate-200 italic">
                    Rencana kegiatan ini belum memiliki butir output.
                  </div>
                ) : (
                  <select
                    value={selectedOutputId}
                    onChange={(e) => setSelectedOutputId(Number(e.target.value))}
                    className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2.5 text-xs sm:text-sm font-medium text-slate-800 shadow-2xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
                  >
                    {availableOutputs.map((o) => (
                      <option key={o.id} value={o.id}>
                        {o.kodeHuruf}. {o.output}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* PEDOMAN PENGISIAN BAKU DARI OUTPUT */}
              {currentOutput?.output.pedomanPengisian && (
                <div className="bg-amber-50/90 border border-amber-200/90 rounded-lg p-3 text-xs text-amber-900 leading-relaxed">
                  <div className="font-bold flex items-center gap-1 text-amber-800 mb-0.5">
                    <span>📌</span>
                    <span>Pedoman Pengisian Output Ini:</span>
                  </div>
                  <p className="whitespace-pre-line">{currentOutput.output.pedomanPengisian}</p>
                </div>
              )}
            </div>
          ) : (
            /* ========================================================
               MODE 2: TULIS MANUAL / KUSTOM (ADMIN / PENGGABUNGAN SENDIRI)
               ======================================================== */
            <div className="space-y-3.5 bg-slate-50/70 p-4 rounded-xl border border-slate-200">
              <div className="text-xs text-slate-600 font-medium pb-2 border-b border-slate-200">
                Pilih apakah butir ini digabungkan ke Rencana Kegiatan yang sudah ada, atau membuat Rencana baru:
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                <label
                  className={`flex items-center gap-2 p-2.5 rounded-lg border cursor-pointer font-semibold ${
                    manualMode === 'EXISTING_RENCANA'
                      ? 'bg-blue-50 border-blue-400 text-blue-900'
                      : 'bg-white border-slate-200 text-slate-700'
                  }`}
                >
                  <input
                    type="radio"
                    name="manualModeRadio"
                    checked={manualMode === 'EXISTING_RENCANA'}
                    onChange={() => setManualMode('EXISTING_RENCANA')}
                    className="text-blue-600"
                  />
                  <span>Gabungkan ke Rencana yang Ada</span>
                </label>

                <label
                  className={`flex items-center gap-2 p-2.5 rounded-lg border cursor-pointer font-semibold ${
                    manualMode === 'NEW_RENCANA'
                      ? 'bg-blue-50 border-blue-400 text-blue-900'
                      : 'bg-white border-slate-200 text-slate-700'
                  }`}
                >
                  <input
                    type="radio"
                    name="manualModeRadio"
                    checked={manualMode === 'NEW_RENCANA'}
                    onChange={() => setManualMode('NEW_RENCANA')}
                    className="text-blue-600"
                  />
                  <span>Buat Rencana Kegiatan Baru</span>
                </label>
              </div>

              {manualMode === 'EXISTING_RENCANA' ? (
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Pilih Rencana Kegiatan Induk
                  </label>
                  <select
                    value={manualRencanaId}
                    onChange={(e) => setManualRencanaId(Number(e.target.value))}
                    className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs sm:text-sm font-medium"
                  >
                    {rencanaList.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.noUrut}. {r.rencanaKegiatan}
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Nama Rencana Kegiatan Baru <span className="text-blue-600">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="Misal: Peningkatan Kapasitas Kelembagaan Masyarakat"
                    value={newRencanaKegiatan}
                    onChange={(e) => setNewRencanaKegiatan(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs sm:text-sm"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Nama Output Kegiatan Manual <span className="text-blue-600">*</span>
                </label>
                <input
                  type="text"
                  placeholder="Misal: Laporan Pelatihan Pengurus RT/RW"
                  value={customOutput}
                  onChange={(e) => setCustomOutput(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs sm:text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Pedoman Pengisian (Opsional)
                </label>
                <input
                  type="text"
                  placeholder="Petunjuk pengisian untuk pamong..."
                  value={customPedoman}
                  onChange={(e) => setCustomPedoman(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs"
                />
              </div>
            </div>
          )}

          {/* ========================================================
              FIELD MANUAL YANG DIISI OLEH PENGGUNA:
              - TARGET
              - CAPAIAN (ANGKA)
              - KETERANGAN PELAKSANAAN (NAMA KEGIATAN & TANGGAL)
             ======================================================== */}
          <div className="pt-2 border-t border-slate-200">
            <div className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-3">
              Isian Capaian Kinerja Pamong (Diisi Pengguna)
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 mb-3.5">
              {/* TARGET */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Target (Bulan Ini) <span className="text-slate-400 font-normal">(Manual)</span>
                </label>
                <input
                  type="text"
                  placeholder="Contoh: 1 Dokumen / 100%"
                  value={target}
                  onChange={(e) => setTarget(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs sm:text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
                />
                <span className="text-[11px] text-slate-400 mt-0.5 block">
                  Misal: 1 Laporan, 100%, 2 Berkas
                </span>
              </div>

              {/* CAPAIAN (ANGKA) */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Capaian Realisasi <span className="text-blue-600 font-bold">(Diisi Angka)</span>
                </label>
                <input
                  type="number"
                  step="any"
                  placeholder="Contoh: 1 atau 100"
                  value={capaian}
                  onChange={(e) => setCapaian(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs sm:text-sm font-bold text-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
                />
                <span className="text-[11px] text-slate-400 mt-0.5 block">
                  Diisi angka numerik capaian bulan ini
                </span>
              </div>
            </div>

            {/* KETERANGAN PELAKSANAAN KINERJA */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Keterangan Pelaksanaan Kinerja{' '}
                <span className="text-slate-500 font-normal">
                  (Nama kegiatan dan tanggal kegiatan)
                </span>
              </label>
              <textarea
                rows={3}
                placeholder="Contoh:&#10;1. Rekapitulasi mutasi barang kantor kalurahan tanggal 5 & 12 September 2026.&#10;2. Pengecekan kondisi fisik laptop dan printer di ruang sekretariat tanggal 20 September 2026."
                value={keterangan}
                onChange={(e) => setKeterangan(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs sm:text-sm font-normal text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 leading-relaxed"
              />
              <span className="text-[11px] text-slate-400 mt-0.5 block">
                Tuliskan uraian nama kegiatan nyata yang telah dilaksanakan beserta tanggal pelaksanaannya.
              </span>
            </div>
          </div>

          {/* FOOTER ACTION BUTTONS */}
          <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs sm:text-sm font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg border border-slate-300 transition-colors"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2 text-xs sm:text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 active:bg-blue-800 rounded-lg shadow-sm transition-all disabled:opacity-50 flex items-center gap-2"
            >
              {saving ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Menyimpan...</span>
                </>
              ) : (
                <span>💾 Simpan Isian Kinerja</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
