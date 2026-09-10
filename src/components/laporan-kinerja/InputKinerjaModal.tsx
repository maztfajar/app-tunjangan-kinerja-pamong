'use client';

import { useState, useEffect, useMemo } from 'react';
import { RencanaItem } from './LaporanKinerjaTable';

interface InputKinerjaModalProps {
  rencanaList: RencanaItem[];
  initialRencanaId?: number;
  initialOutputId?: number;
  periode: string;
  jabatanId?: string;
  targetUserId?: string;
  onClose: () => void;
  onSaved: (keepOpen: boolean) => void;
}

export function InputKinerjaModal({
  rencanaList,
  initialRencanaId,
  initialOutputId,
  periode,
  jabatanId,
  targetUserId,
  onClose,
  onSaved,
}: InputKinerjaModalProps) {
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

  // Form input fields sesuai form
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
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.48)',
        backdropFilter: 'blur(2px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 100000,
        padding: '16px',
      }}
      onClick={onClose}
      className="modal-overlay animate-fade-in"
    >
      <div
        style={{
          background: '#ffffff',
          borderRadius: '12px',
          border: '1px solid #e2e8f0',
          width: '100%',
          maxWidth: '680px',
          maxHeight: '92vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.05)',
          fontFamily: 'var(--font-sans)',
          overflow: 'hidden',
        }}
        onClick={(e) => e.stopPropagation()}
        className="animate-scale-up"
      >
        {/* MODAL HEADER */}
        <div
          style={{
            padding: '18px 24px',
            borderBottom: '1px solid #f1f5f9',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div
            style={{
              fontSize: '15px',
              fontWeight: '700',
              color: '#334155',
              letterSpacing: '-0.01em',
            }}
          >
            Isi Laporan Kinerja
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#94a3b8',
              cursor: 'pointer',
              fontSize: '18px',
              fontWeight: '600',
              padding: '4px 8px',
              borderRadius: '6px',
              lineHeight: 1,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = '#0f172a';
              e.currentTarget.style.background = '#f1f5f9';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = '#94a3b8';
              e.currentTarget.style.background = 'transparent';
            }}
          >
            ✕
          </button>
        </div>

        {/* MODAL BODY (SCROLLABLE) */}
        <div style={{ padding: '20px 24px', overflowY: 'auto' }}>
          {errorMsg && (
            <div
              style={{
                padding: '10px 14px',
                background: '#fef2f2',
                border: '1px solid #fecaca',
                color: '#dc2626',
                borderRadius: '6px',
                fontSize: '13px',
                marginBottom: '16px',
              }}
            >
              ⚠️ {errorMsg}
            </div>
          )}

          <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Link Opsi Manual */}
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
                      fontSize: '13.5px',
                      fontWeight: '600',
                      color: '#475569',
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
                        color: '#1e293b',
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
                      fontSize: '13.5px',
                      fontWeight: '600',
                      color: '#475569',
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
                        color: '#1e293b',
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
                  padding: '14px',
                  background: '#f8fafc',
                  borderRadius: '8px',
                  border: '1px solid #e2e8f0',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px',
                }}
              >
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#475569', marginBottom: '5px' }}>
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
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#475569', marginBottom: '5px' }}>
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
                  fontSize: '13.5px',
                  fontWeight: '600',
                  color: '#475569',
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
                  color: '#1e293b',
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
                  fontSize: '13.5px',
                  fontWeight: '600',
                  color: '#475569',
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

            {/* Field 6: Keterangan Pelaksanaan Kegiatan (Nama kegiatan tanpa tanggal) - Full Width */}
            <div>
              <label
                style={{
                  display: 'block',
                  fontSize: '13.5px',
                  fontWeight: '600',
                  color: '#475569',
                  marginBottom: '6px',
                }}
              >
                Keterangan Pelaksanaan Kegiatan
              </label>
              <input
                type="text"
                placeholder="Misal: Koordinasi internal pengelolaan inventaris kantor dan pemeriksaan berkas mutasi"
                value={keterangan}
                onChange={(e) => setKeterangan(e.target.value)}
                style={{
                  width: '100%',
                  height: '38px',
                  padding: '6px 12px',
                  fontSize: '13.5px',
                  color: '#1e293b',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  outline: 'none',
                }}
              />
              <span style={{ fontSize: '11.5px', color: '#94a3b8', marginTop: '3px', display: 'block' }}>
                *Diisi nama/uraian pelaksanaan kegiatan selama periode ini.
              </span>
            </div>

            {/* Checkbox: Input Lagi persis seperti screenshot */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '2px' }}>
              <input
                type="checkbox"
                id="inputLagiModalCheckbox"
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
                htmlFor="inputLagiModalCheckbox"
                style={{
                  fontSize: '13.5px',
                  color: '#334155',
                  cursor: 'pointer',
                  userSelect: 'none',
                  fontWeight: '500',
                }}
              >
                Input Lagi
              </label>
            </div>

            {/* Action Buttons di Kiri Bawah persis seperti screenshot */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '8px', paddingTop: '10px', borderTop: '1px solid #f1f5f9' }}>
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
      </div>
    </div>
  );
}
