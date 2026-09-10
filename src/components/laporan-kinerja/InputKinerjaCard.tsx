'use client';

import { useState, useEffect, useMemo } from 'react';
import { RencanaItem } from './LaporanKinerjaTable';

interface InputKinerjaCardProps {
  rencanaList: RencanaItem[];
  initialRencanaId?: number;
  initialOutputId?: number;
  periode: string;
  jabatanId?: string;
  targetUserId?: string;
  onClose: () => void;
  onSaved: (keepOpen: boolean) => void;
}

export function InputKinerjaCard({
  rencanaList,
  initialRencanaId,
  initialOutputId,
  periode,
  jabatanId,
  targetUserId,
  onClose,
  onSaved,
}: InputKinerjaCardProps) {
  // Rencana Kegiatan dropdown state
  const [selectedRencanaId, setSelectedRencanaId] = useState<number>(() => {
    if (initialRencanaId) return initialRencanaId;
    if (initialOutputId) {
      const found = rencanaList.find((r) => r.outputs.some((o) => o.id === initialOutputId));
      if (found) return found.id;
    }
    return rencanaList[0]?.id || 0;
  });

  // Output dropdown state tersinkronisasi
  const availableOutputs = useMemo(() => {
    const currentRencana = rencanaList.find((r) => r.id === selectedRencanaId);
    return currentRencana?.outputs || [];
  }, [rencanaList, selectedRencanaId]);

  const [selectedOutputId, setSelectedOutputId] = useState<number>(() => {
    if (initialOutputId) return initialOutputId;
    return availableOutputs[0]?.id || 0;
  });

  // Sinkronkan selectedOutputId jika selectedRencanaId berganti
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

  // Form input fields sesuai screenshot
  const [target, setTarget] = useState('');
  const [capaian, setCapaian] = useState('');
  const [keterangan, setKeterangan] = useState('');
  const [inputLagi, setInputLagi] = useState(false);
  const [showManualMode, setShowManualMode] = useState(false);
  const [customRencana, setCustomRencana] = useState('');
  const [customOutput, setCustomOutput] = useState('');
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Auto prefill jika output yang dipilih sudah memiliki isian
  useEffect(() => {
    if (currentOutput && !showManualMode) {
      const lap = currentOutput.output.laporan?.[0];
      setTarget(lap?.target || '');
      setCapaian(lap?.capaian || '');
      setKeterangan(lap?.keterangan || '');
    }
  }, [currentOutput, showManualMode]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setErrorMsg(null);

    try {
      if (!showManualMode) {
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
        // Manual mode
        if (!customOutput.trim()) {
          setErrorMsg('Output kegiatan manual wajib diisi');
          setSaving(false);
          return;
        }

        const res = await fetch('/api/laporan-kinerja/custom', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            mode: customRencana.trim() ? 'NEW_RENCANA' : 'EXISTING_RENCANA',
            jabatanId,
            rencanaKegiatanId: selectedRencanaId,
            newRencanaKegiatan: customRencana,
            output: customOutput,
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

      if (inputLagi) {
        // Kosongkan field untuk input butir berikutnya
        setTarget('');
        setCapaian('');
        setKeterangan('');
        setCustomOutput('');
        onSaved(true);
      } else {
        onSaved(false);
      }
    } catch {
      setErrorMsg('Terjadi kesalahan koneksi saat menyimpan');
    }
    setSaving(false);
  }

  return (
    <div
      id="form-input-kinerja"
      style={{
        background: '#ffffff',
        borderRadius: '10px',
        border: '1px solid #e2e8f0',
        padding: '24px 28px',
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)',
        fontFamily: 'var(--font-sans)',
      }}
      className="animate-fade-in mb-6"
    >
      {/* Title / Header Form persis seperti screenshot */}
      <div
        style={{
          fontSize: '14px',
          fontWeight: '600',
          color: '#64748b',
          marginBottom: '20px',
        }}
      >
        Input Aktivitas Kinerja
      </div>

      {errorMsg && (
        <div
          style={{
            padding: '10px 14px',
            background: '#fef2f2',
            border: '1px solid #fecaca',
            color: '#dc2626',
            borderRadius: '6px',
            fontSize: '13px',
            marginBottom: '18px',
          }}
        >
          ⚠️ {errorMsg}
        </div>
      )}

      <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {/* Field 1: Tanggal / Periode (Width kecil sesuai screenshot) */}
        <div>
          <label
            style={{
              display: 'block',
              fontSize: '13px',
              fontWeight: '500',
              color: '#374151',
              marginBottom: '6px',
            }}
          >
            Periode / Tanggal
          </label>
          <input
            type="month"
            value={periode}
            disabled
            style={{
              width: '160px',
              height: '38px',
              padding: '6px 12px',
              fontSize: '13.5px',
              color: '#374151',
              background: '#f8fafc',
              border: '1px solid #d1d5db',
              borderRadius: '6px',
              outline: 'none',
            }}
          />
        </div>

        {/* Link Opsi Manual (mirip link Catat Aktivitas Multi Tanggal di screenshot) */}
        <div>
          <button
            type="button"
            onClick={() => setShowManualMode((prev) => !prev)}
            style={{
              background: 'none',
              border: 'none',
              color: '#4361ee',
              fontWeight: '600',
              fontSize: '13px',
              cursor: 'pointer',
              padding: 0,
              textDecoration: 'none',
            }}
          >
            {showManualMode
              ? '← Kembali ke Pilihan Template Baku Jabatan'
              : '✍️ Catat / Tambah Butir Kegiatan Manual (Kustom)'}
          </button>
        </div>

        {!showManualMode ? (
          <>
            {/* Field 2: Aktivitas / Rencana Kegiatan (Full width dropdown) */}
            <div>
              <label
                style={{
                  display: 'block',
                  fontSize: '13px',
                  fontWeight: '500',
                  color: '#374151',
                  marginBottom: '6px',
                }}
              >
                Aktivitas / Rencana Kegiatan
              </label>
              {rencanaList.length === 0 ? (
                <div style={{ fontSize: '13px', color: '#94a3b8' }}>
                  Belum ada rencana kegiatan untuk jabatan ini.
                </div>
              ) : (
                <select
                  value={selectedRencanaId}
                  onChange={(e) => setSelectedRencanaId(Number(e.target.value))}
                  style={{
                    width: '100%',
                    height: '40px',
                    padding: '6px 12px',
                    fontSize: '13.5px',
                    color: '#1f2937',
                    background: '#ffffff',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    outline: 'none',
                    cursor: 'pointer',
                  }}
                >
                  {rencanaList.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.noUrut}. {r.rencanaKegiatan}
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* Field 3: Output Kegiatan (Tersinkronisasi otomatis dengan Rencana Kegiatan) */}
            <div>
              <label
                style={{
                  display: 'block',
                  fontSize: '13px',
                  fontWeight: '500',
                  color: '#374151',
                  marginBottom: '6px',
                }}
              >
                Output Kegiatan (Tersinkron)
              </label>
              {availableOutputs.length === 0 ? (
                <div style={{ fontSize: '13px', color: '#94a3b8', fontStyle: 'italic' }}>
                  Tidak ada output di bawah rencana kegiatan ini
                </div>
              ) : (
                <select
                  value={selectedOutputId}
                  onChange={(e) => setSelectedOutputId(Number(e.target.value))}
                  style={{
                    width: '100%',
                    height: '40px',
                    padding: '6px 12px',
                    fontSize: '13.5px',
                    color: '#1f2937',
                    background: '#ffffff',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    outline: 'none',
                    cursor: 'pointer',
                  }}
                >
                  {availableOutputs.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.kodeHuruf}. {o.output}
                    </option>
                  ))}
                </select>
              )}

              {/* Pedoman pengisian subtle */}
              {currentOutput?.output.pedomanPengisian && (
                <div
                  style={{
                    fontSize: '12px',
                    color: '#64748b',
                    marginTop: '5px',
                    fontStyle: 'italic',
                  }}
                >
                  📌 Pedoman: {currentOutput.output.pedomanPengisian}
                </div>
              )}
            </div>
          </>
        ) : (
          /* MANUAL KUSTOM MODE */
          <div
            style={{
              padding: '16px',
              background: '#f8fafc',
              borderRadius: '8px',
              border: '1px solid #e2e8f0',
              display: 'flex',
              flexDirection: 'column',
              gap: '14px',
            }}
          >
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', color: '#374151', marginBottom: '6px' }}>
                Rencana Kegiatan Baru (Opsional - Kosongkan jika digabung ke rencana di atas)
              </label>
              <input
                type="text"
                value={customRencana}
                onChange={(e) => setCustomRencana(e.target.value)}
                placeholder="Tulis nama rencana kegiatan baru..."
                style={{
                  width: '100%',
                  height: '38px',
                  padding: '6px 12px',
                  fontSize: '13.5px',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  outline: 'none',
                  background: '#ffffff',
                }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', color: '#374151', marginBottom: '6px' }}>
                Nama Output Kegiatan Baru *
              </label>
              <input
                type="text"
                value={customOutput}
                onChange={(e) => setCustomOutput(e.target.value)}
                placeholder="Tulis nama butir output..."
                required
                style={{
                  width: '100%',
                  height: '38px',
                  padding: '6px 12px',
                  fontSize: '13.5px',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  outline: 'none',
                  background: '#ffffff',
                }}
              />
            </div>
          </div>
        )}

        {/* Field 4: Target (Volume) - Width kecil persis seperti screenshot */}
        <div>
          <label
            style={{
              display: 'block',
              fontSize: '13px',
              fontWeight: '500',
              color: '#374151',
              marginBottom: '6px',
            }}
          >
            Target / Volume
          </label>
          <input
            type="text"
            placeholder="Misal: 1 Dokumen / 4"
            value={target}
            onChange={(e) => setTarget(e.target.value)}
            style={{
              width: '160px',
              height: '38px',
              padding: '6px 12px',
              fontSize: '13.5px',
              color: '#1f2937',
              border: '1px solid #d1d5db',
              borderRadius: '6px',
              outline: 'none',
            }}
          />
        </div>

        {/* Field 5: Capaian Realisasi (Angka) - Width kecil persis seperti screenshot */}
        <div>
          <label
            style={{
              display: 'block',
              fontSize: '13px',
              fontWeight: '500',
              color: '#374151',
              marginBottom: '6px',
            }}
          >
            Capaian (Angka)
          </label>
          <input
            type="number"
            step="any"
            placeholder="Misal: 4 atau 100"
            value={capaian}
            onChange={(e) => setCapaian(e.target.value)}
            style={{
              width: '160px',
              height: '38px',
              padding: '6px 12px',
              fontSize: '13.5px',
              fontWeight: '600',
              color: '#1d4ed8',
              border: '1px solid #d1d5db',
              borderRadius: '6px',
              outline: 'none',
            }}
          />
        </div>

        {/* Field 6: Keterangan Pelaksanaan Kinerja (Nama kegiatan & tanggal) - Full Width */}
        <div>
          <label
            style={{
              display: 'block',
              fontSize: '13px',
              fontWeight: '500',
              color: '#374151',
              marginBottom: '6px',
            }}
          >
            Keterangan Pelaksanaan Kinerja (Nama kegiatan dan tanggal kegiatan)
          </label>
          <input
            type="text"
            placeholder="Misal: Koordinasi internal pengelolaan inventaris kantor tanggal 5 & 12 September 2026"
            value={keterangan}
            onChange={(e) => setKeterangan(e.target.value)}
            style={{
              width: '100%',
              height: '38px',
              padding: '6px 12px',
              fontSize: '13.5px',
              color: '#1f2937',
              border: '1px solid #d1d5db',
              borderRadius: '6px',
              outline: 'none',
            }}
          />
        </div>

        {/* Checkbox: Input Lagi persis seperti screenshot */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '2px' }}>
          <input
            type="checkbox"
            id="inputLagiCheckbox"
            checked={inputLagi}
            onChange={(e) => setInputLagi(e.target.checked)}
            style={{
              width: '16px',
              height: '16px',
              accentColor: '#4361ee',
              cursor: 'pointer',
            }}
          />
          <label
            htmlFor="inputLagiCheckbox"
            style={{
              fontSize: '13px',
              color: '#374151',
              cursor: 'pointer',
              userSelect: 'none',
            }}
          >
            Input Lagi
          </label>
        </div>

        {/* Action Buttons di Kiri Bawah persis seperti screenshot */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '8px' }}>
          <button
            type="submit"
            disabled={saving}
            style={{
              background: '#4361ee',
              color: '#ffffff',
              border: 'none',
              borderRadius: '6px',
              padding: '8px 24px',
              fontSize: '13.5px',
              fontWeight: '600',
              cursor: 'pointer',
              boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)',
              opacity: saving ? 0.6 : 1,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            {saving ? 'Menyimpan...' : 'Simpan'}
          </button>

          <button
            type="button"
            onClick={onClose}
            style={{
              background: '#ffffff',
              color: '#475569',
              border: '1px solid #d1d5db',
              borderRadius: '6px',
              padding: '8px 22px',
              fontSize: '13.5px',
              fontWeight: '500',
              cursor: 'pointer',
            }}
          >
            Batal
          </button>
        </div>
      </form>
    </div>
  );
}
