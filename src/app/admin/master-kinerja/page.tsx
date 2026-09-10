'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import * as XLSX from 'xlsx';
import JSZip from 'jszip';
import {
  IconClose,
  IconEdit,
  IconTrash,
  IconCheckCircle,
  IconUploadCloud,
  IconFileSpreadsheet,
  IconArrowRight,
  IconArrowLeft,
} from '@/components/ui/Icons';

interface OutputItem {
  id: number;
  kodeHuruf: string;
  output: string;
  pedomanPengisian: string | null;
  noUrut: number;
  isActive: boolean;
}

interface RencanaItem {
  id: number;
  noUrut: number;
  rencanaKegiatan: string;
  isActive: boolean;
  outputs: OutputItem[];
}

interface JabatanItem {
  id: string;
  nama: string;
  kategori?: string | null;
}

interface FlatPreviewItem {
  no: number;
  rencanaKegiatan: string;
  kodeHuruf: string;
  output: string;
  pedomanPengisian: string;
}

interface GroupedPreviewItem {
  noUrut: number;
  rencanaKegiatan: string;
  outputs: Array<{
    kodeHuruf: string;
    output: string;
    pedomanPengisian: string;
    noUrut: number;
  }>;
}

export default function MasterKinerjaAdminPage() {
  const [jabatanList, setJabatanList] = useState<JabatanItem[]>([]);
  const [selectedJabatanId, setSelectedJabatanId] = useState<string>('');
  const [rencanaList, setRencanaList] = useState<RencanaItem[]>([]);
  const [loading, setLoading] = useState(false);

  // Modals state: Tambah/Edit Rencana Kegiatan
  const [showRencanaModal, setShowRencanaModal] = useState(false);
  const [editingRencana, setEditingRencana] = useState<RencanaItem | null>(null);
  const [formRencanaText, setFormRencanaText] = useState('');
  const [formRencanaNo, setFormRencanaNo] = useState<number | ''>('');

  // Modals state: Tambah/Edit Output Kegiatan
  const [showOutputModal, setShowOutputModal] = useState(false);
  const [parentRencana, setParentRencana] = useState<RencanaItem | null>(null);
  const [editingOutput, setEditingOutput] = useState<OutputItem | null>(null);
  const [formOutputText, setFormOutputText] = useState('');
  const [formKodeHuruf, setFormKodeHuruf] = useState('');
  const [formPedoman, setFormPedoman] = useState('');

  // Modals state: Impor Data Master (Word / Excel / Paste)
  const [showImportModal, setShowImportModal] = useState(false);
  const [importStep, setImportStep] = useState<1 | 2>(1);
  const [modalJabatanId, setModalJabatanId] = useState<string>('');
  const [importMode, setImportMode] = useState<'append' | 'replace'>('replace');
  const [uploadedFileName, setUploadedFileName] = useState<string>('');
  const [uploadedFileSize, setUploadedFileSize] = useState<string>('');
  const [importTab, setImportTab] = useState<'upload' | 'paste'>('upload');
  const [importText, setImportText] = useState('');
  const [previewRows, setPreviewRows] = useState<FlatPreviewItem[]>([]);
  const [groupedPreview, setGroupedPreview] = useState<GroupedPreviewItem[]>([]);
  const [importing, setImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToast({ text, type });
    setTimeout(() => setToast(null), 3500);
  };

  // Efek untuk menyembunyikan bar navigasi atas di smartphone saat modal terbuka
  useEffect(() => {
    const isAnyModalOpen = showImportModal || showRencanaModal || showOutputModal;
    if (isAnyModalOpen) {
      document.body.classList.add('hide-top-navbar-on-modal');
      document.body.classList.add('modal-open');
    } else {
      document.body.classList.remove('hide-top-navbar-on-modal');
      document.body.classList.remove('modal-open');
    }
    return () => {
      document.body.classList.remove('hide-top-navbar-on-modal');
      document.body.classList.remove('modal-open');
    };
  }, [showImportModal, showRencanaModal, showOutputModal]);

  // 1. Fetch Master Jabatan (Eksklusif Jabatan Pamong, tanpa Admin Sistem)
  useEffect(() => {
    fetch('/api/admin/jabatan')
      .then((res) => res.json())
      .then((data) => {
        const rawList = data.jabatan || [];
        // Admin Sistem bukan jabatan pamong, saring agar tidak muncul di Master Kinerja
        const list = rawList.filter(
          (j: JabatanItem) =>
            j.nama.toLowerCase().trim() !== 'admin sistem' &&
            j.nama.toLowerCase().trim() !== 'admin'
        );
        setJabatanList(list);
        if (list.length > 0) {
          setSelectedJabatanId((prev) => {
            const stillValid = list.some((j: JabatanItem) => j.id === prev);
            return stillValid ? prev : list[0].id;
          });
        }
      })
      .catch((err) => console.error('Failed to load jabatan list:', err));
  }, []);

  // 2. Fetch Rencana & Output per Jabatan
  const fetchRencanaList = useCallback(async () => {
    if (!selectedJabatanId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/rencana-kegiatan?jabatanId=${selectedJabatanId}`);
      const data = await res.json();
      if (res.ok) {
        setRencanaList(data.data || []);
      } else {
        showToast(data.error || 'Gagal memuat rencana kegiatan', 'error');
      }
    } catch {
      showToast('Koneksi gagal saat memuat rencana kegiatan', 'error');
    }
    setLoading(false);
  }, [selectedJabatanId]);

  useEffect(() => {
    fetchRencanaList();
  }, [fetchRencanaList]);

  const currentJabatan = jabatanList.find((j) => j.id === selectedJabatanId);

  // Auto noUrut berikutnya untuk Rencana Kegiatan
  const nextNoUrut =
    rencanaList.length > 0
      ? Math.max(...rencanaList.map((r) => r.noUrut || 0)) + 1
      : 1;

  // Handler: Buka Modal Tambah Rencana
  const handleOpenAddRencana = () => {
    setEditingRencana(null);
    setFormRencanaText('');
    setFormRencanaNo(nextNoUrut);
    setShowRencanaModal(true);
  };

  // Handler: Buka Modal Edit Rencana
  const handleOpenEditRencana = (item: RencanaItem) => {
    setEditingRencana(item);
    setFormRencanaText(item.rencanaKegiatan);
    setFormRencanaNo(item.noUrut);
    setShowRencanaModal(true);
  };

  // Handler: Submit Simpan Rencana
  const handleSubmitRencana = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formRencanaText.trim()) {
      showToast('Nama rencana kegiatan tidak boleh kosong', 'error');
      return;
    }

    setSaving(true);
    try {
      if (editingRencana) {
        const res = await fetch(`/api/admin/rencana-kegiatan/${editingRencana.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            rencanaKegiatan: formRencanaText,
            noUrut: formRencanaNo || nextNoUrut,
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        showToast('Rencana kegiatan berhasil diperbarui');
      } else {
        const res = await fetch('/api/admin/rencana-kegiatan', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            jabatanId: selectedJabatanId,
            rencanaKegiatan: formRencanaText,
            noUrut: formRencanaNo || nextNoUrut,
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        showToast('Rencana kegiatan berhasil ditambahkan');
      }

      setShowRencanaModal(false);
      fetchRencanaList();
    } catch (err: any) {
      showToast(err.message || 'Gagal menyimpan rencana kegiatan', 'error');
    }
    setSaving(false);
  };

  // Handler: Hapus Rencana
  const handleDeleteRencana = async (item: RencanaItem) => {
    if (
      !confirm(
        `Hapus Rencana Kegiatan No. ${item.noUrut}: "${item.rencanaKegiatan}" beserta seluruh outputnya?`
      )
    )
      return;

    try {
      const res = await fetch(`/api/admin/rencana-kegiatan/${item.id}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      showToast('Rencana kegiatan dihapus');
      fetchRencanaList();
    } catch (err: any) {
      showToast(err.message || 'Gagal menghapus rencana kegiatan', 'error');
    }
  };

  // Handler: Buka Modal Tambah Output
  const handleOpenAddOutput = (rencana: RencanaItem) => {
    setParentRencana(rencana);
    setEditingOutput(null);
    setFormOutputText('');
    setFormPedoman('');
    const count = rencana.outputs.length;
    setFormKodeHuruf(String.fromCharCode(97 + (count % 26)));
    setShowOutputModal(true);
  };

  // Handler: Buka Modal Edit Output
  const handleOpenEditOutput = (rencana: RencanaItem, output: OutputItem) => {
    setParentRencana(rencana);
    setEditingOutput(output);
    setFormOutputText(output.output);
    setFormKodeHuruf(output.kodeHuruf);
    setFormPedoman(output.pedomanPengisian || '');
    setShowOutputModal(true);
  };

  // Handler: Submit Output
  const handleSubmitOutput = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formOutputText.trim()) {
      showToast('Nama output kegiatan wajib diisi', 'error');
      return;
    }

    setSaving(true);
    try {
      if (editingOutput) {
        const res = await fetch(`/api/admin/output-kegiatan/${editingOutput.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            output: formOutputText,
            kodeHuruf: formKodeHuruf,
            pedomanPengisian: formPedoman.trim() || null,
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        showToast('Output kegiatan diperbarui');
      } else {
        if (!parentRencana) return;
        const res = await fetch('/api/admin/output-kegiatan', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            rencanaKegiatanId: parentRencana.id,
            output: formOutputText,
            kodeHuruf: formKodeHuruf,
            pedomanPengisian: formPedoman.trim() || null,
            noUrut: parentRencana.outputs.length + 1,
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        showToast('Output kegiatan berhasil ditambahkan');
      }

      setShowOutputModal(false);
      fetchRencanaList();
    } catch (err: any) {
      showToast(err.message || 'Gagal menyimpan output kegiatan', 'error');
    }
    setSaving(false);
  };

  // Handler: Hapus Output
  const handleDeleteOutput = async (output: OutputItem) => {
    if (!confirm(`Hapus output "${output.kodeHuruf}. ${output.output}"?`)) return;

    try {
      const res = await fetch(`/api/admin/output-kegiatan/${output.id}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      showToast('Output kegiatan dihapus');
      fetchRencanaList();
    } catch (err: any) {
      showToast(err.message || 'Gagal menghapus output kegiatan', 'error');
    }
  };

  // Handler: Buka Modal Impor Master
  const handleOpenImportModal = () => {
    setModalJabatanId(selectedJabatanId || (jabatanList[0]?.id || ''));
    setImportMode('replace');
    setUploadedFileName('');
    setUploadedFileSize('');
    setImportText('');
    setPreviewRows([]);
    setGroupedPreview([]);
    setImportTab('upload');
    setImportStep(1);
    if (fileInputRef.current) fileInputRef.current.value = '';
    setShowImportModal(true);
  };

  // Mengelompokkan baris tabel kegiatan menjadi hirarki Rencana -> Output
  const setParsedData = (flatRows: FlatPreviewItem[]) => {
    const groups: Record<string, GroupedPreviewItem> = {};
    let groupIndex = 1;

    for (const r of flatRows) {
      if (!r.output && !r.rencanaKegiatan) continue;
      const rKey = r.rencanaKegiatan;
      if (!groups[rKey]) {
        groups[rKey] = {
          noUrut: r.no || groupIndex++,
          rencanaKegiatan: rKey,
          outputs: [],
        };
      }

      if (r.output) {
        const outIdx = groups[rKey].outputs.length;
        const finalKode = r.kodeHuruf || String.fromCharCode(97 + (outIdx % 26));
        groups[rKey].outputs.push({
          kodeHuruf: finalKode,
          output: r.output,
          pedomanPengisian: r.pedomanPengisian || '',
          noUrut: outIdx + 1,
        });
      }
    }

    const grouped = Object.values(groups);
    setGroupedPreview(grouped);

    const flattened: FlatPreviewItem[] = [];
    for (const g of grouped) {
      for (const o of g.outputs) {
        flattened.push({
          no: g.noUrut,
          rencanaKegiatan: g.rencanaKegiatan,
          kodeHuruf: o.kodeHuruf,
          output: o.output,
          pedomanPengisian: o.pedomanPengisian,
        });
      }
    }

    setPreviewRows(flattened);
  };

  // Ekstraksi Khusus Berkas Word (.docx) - Mengambil HANYA tabel kinerja (mengabaikan KOP, nama pejabat, tanda tangan)
  const parseDocxDocument = async (arrayBuffer: ArrayBuffer) => {
    const zip = await JSZip.loadAsync(arrayBuffer);
    const xml = await zip.file('word/document.xml')?.async('text');
    if (!xml) throw new Error('Dokumen Word tidak berisi word/document.xml yang valid.');

    const tblRegex = /<w:tbl[\s\S]*?<\/w:tbl>/g;
    const tables = xml.match(tblRegex) || [];
    if (tables.length === 0) throw new Error('Tidak ditemukan tabel dalam dokumen Word ini.');

    for (const tableXml of tables) {
      const trRegex = /<w:tr[\s\S]*?<\/w:tr>/g;
      const rows = tableXml.match(trRegex) || [];
      if (rows.length < 3) continue;

      // Cek apakah tabel ini adalah tabel laporan kinerja (ada kata "rencana" dan "output")
      const sampleHeader = rows.slice(0, 3).map((r) => {
        const tc = r.match(/<w:tc[\s\S]*?<\/w:tc>/g) || [];
        return tc.map((c) => (c.match(/<w:t[^>]*>([\s\S]*?)<\/w:t>/g) || []).map((x) => x.replace(/<[^>]+>/g, '')).join(' ')).join(' ');
      }).join(' ').toLowerCase();

      if (!sampleHeader.includes('rencana') || !sampleHeader.includes('output')) {
        continue;
      }

      let currentNo = 0;
      let currentRencana = '';
      const flatRows: FlatPreviewItem[] = [];

      for (let rIdx = 0; rIdx < rows.length; rIdx++) {
        const tc = rows[rIdx].match(/<w:tc[\s\S]*?<\/w:tc>/g) || [];
        const cellTexts = tc.map((cXml) => {
          const tMatches = cXml.match(/<w:t[^>]*>([\s\S]*?)<\/w:t>/g) || [];
          return tMatches.map((t) => t.replace(/<[^>]+>/g, '')).join(' ').replace(/\s+/g, ' ').trim();
        });

        const fullRowText = cellTexts.join(' ').toLowerCase();

        // Lewati baris header dan nomor kolom
        if (cellTexts[0] && (cellTexts[0].toLowerCase() === 'no.' || cellTexts[0].toLowerCase() === 'no')) continue;
        if (cellTexts[1] && cellTexts[1].toLowerCase().startsWith('rencana kegiatan')) continue;
        if (cellTexts[0] === '1' && cellTexts[1] === '2') continue;

        // Berhenti jika sudah mencapai footer/ringkasan/tanda tangan
        if (
          fullRowText.includes('jumlah dilaksanakan') ||
          fullRowText.includes('target bulan') ||
          fullRowText.includes('presentasi') ||
          fullRowText.includes('prensentasi') ||
          fullRowText.includes('disetujui') ||
          fullRowText.includes('mengetahui')
        ) {
          break;
        }

        const noVal = parseInt(cellTexts[0]);
        if (!isNaN(noVal) && noVal > 0) {
          currentNo = noVal;
          if (cellTexts[1] && cellTexts[1].trim()) {
            currentRencana = cellTexts[1].replace(/^\d+[\.\)]\s*/, '').trim();
          }
        } else if (cellTexts[1] && cellTexts[1].trim() && !cellTexts[0]) {
          currentRencana = cellTexts[1].replace(/^\d+[\.\)]\s*/, '').trim();
        }

        const kode = cellTexts[2] ? cellTexts[2].trim() : '';
        const output = cellTexts[3] ? cellTexts[3].trim() : '';
        const pedoman = cellTexts.length > 4 ? cellTexts[cellTexts.length - 1].trim() : '';

        if (output && output.length > 2 && !output.toLowerCase().startsWith('output')) {
          flatRows.push({
            no: currentNo || 1,
            rencanaKegiatan: currentRencana || `Rencana Kegiatan ${currentNo || 1}`,
            kodeHuruf: kode,
            output,
            pedomanPengisian: pedoman,
          });
        }
      }

      if (flatRows.length > 0) {
        setParsedData(flatRows);
        return;
      }
    }

    throw new Error('Tidak ditemukan tabel butir kinerja yang sesuai pada dokumen Word ini.');
  };

  // Ekstraksi Berkas Excel (.xlsx, .xls) / TSV
  const parseExcelDocument = (arrayBuffer: ArrayBuffer) => {
    const data = new Uint8Array(arrayBuffer);
    const workbook = XLSX.read(data, { type: 'array' });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const rawRows: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });

    // Cari baris header yang memuat "rencana" dan "output"
    let startIdx = -1;
    for (let i = 0; i < rawRows.length; i++) {
      const text = rawRows[i].map((c) => String(c).toLowerCase()).join(' ');
      if (text.includes('rencana') && text.includes('output')) {
        startIdx = i;
        break;
      }
    }

    if (startIdx === -1) {
      processRawDataRows(rawRows);
      return;
    }

    let currentNo = 0;
    let currentRencana = '';
    const flatRows: FlatPreviewItem[] = [];

    for (let i = startIdx + 1; i < rawRows.length; i++) {
      const row = rawRows[i];
      const cellTexts = row.map((c) => String(c ?? '').trim());
      const fullRowText = cellTexts.join(' ').toLowerCase();

      if (cellTexts.every((c) => c === '')) continue;
      if (cellTexts[0] === 'a' && cellTexts[1] === 'b') continue;
      if (cellTexts[0] === '1' && cellTexts[1] === '2') continue;

      // Berhenti jika sampai di baris ringkasan / tanda tangan
      if (
        fullRowText.includes('jumlah') ||
        fullRowText.includes('target bulan') ||
        fullRowText.includes('disetujui') ||
        fullRowText.includes('mengetahui')
      ) {
        break;
      }

      const noVal = parseInt(cellTexts[0]);
      if (!isNaN(noVal) && noVal > 0) {
        currentNo = noVal;
        if (cellTexts[1] && cellTexts[1].trim()) {
          currentRencana = cellTexts[1].replace(/^\d+[\.\)]\s*/, '').trim();
        }
      } else if (cellTexts[1] && cellTexts[1].trim() && !cellTexts[0]) {
        currentRencana = cellTexts[1].replace(/^\d+[\.\)]\s*/, '').trim();
      }

      let kode = cellTexts[2] || '';
      let output = cellTexts[3] || '';
      let pedoman = '';

      if (!output && cellTexts[2] && cellTexts[2].length > 4) {
        output = cellTexts[2];
        kode = '';
        pedoman = cellTexts[3] || '';
      }

      if (output && output.length > 2 && !output.toLowerCase().startsWith('output')) {
        flatRows.push({
          no: currentNo || 1,
          rencanaKegiatan: currentRencana || `Rencana Kegiatan ${currentNo || 1}`,
          kodeHuruf: kode,
          output,
          pedomanPengisian: pedoman,
        });
      }
    }

    if (flatRows.length > 0) {
      setParsedData(flatRows);
    } else {
      processRawDataRows(rawRows);
    }
  };

  // Parser Raw Spreadsheet Data (Fallback umum)
  const processRawDataRows = (rawRows: any[][]) => {
    const flatRows: FlatPreviewItem[] = [];
    let currentNo = 1;
    let currentRencana = '';

    for (let i = 0; i < rawRows.length; i++) {
      const row = rawRows[i];
      if (!row || row.length === 0) continue;

      const cells = row.map((c) => String(c ?? '').trim());
      if (cells.every((c) => c === '')) continue;

      const combined = cells.join(' ').toLowerCase();
      if (
        (combined.includes('no') && combined.includes('rencana')) ||
        (combined.includes('rencana kegiatan') && combined.includes('output')) ||
        (combined.includes('kode') && combined.includes('output')) ||
        combined.includes('kop') ||
        combined.includes('lampiran')
      ) {
        continue;
      }

      if (combined.includes('target bulan') || combined.includes('disetujui') || combined.includes('mengetahui')) {
        break;
      }

      let noVal = cells[0];
      let rencanaVal = cells[1];
      let kodeVal = cells[2];
      let outputVal = cells[3];
      let pedomanVal = cells[4];

      if (isNaN(Number(noVal)) && cells.length >= 2 && !rencanaVal) {
        rencanaVal = cells[0];
        outputVal = cells[1];
        pedomanVal = cells[2] || '';
        noVal = String(currentNo);
        kodeVal = '';
      } else if (cells.length === 4) {
        if (kodeVal && kodeVal.length <= 2 && /^[a-z0-9]$/i.test(kodeVal)) {
          // [No, Rencana, Kode, Output]
        } else {
          pedomanVal = cells[3];
          outputVal = cells[2];
          kodeVal = '';
        }
      }

      if (rencanaVal) {
        const numMatch = rencanaVal.match(/^([0-9]+)[.)]\s*(.*)$/);
        if (numMatch) {
          if (isNaN(Number(noVal)) || !noVal) {
            noVal = numMatch[1];
          }
          rencanaVal = numMatch[2].trim();
        }
        currentRencana = rencanaVal;
        if (!isNaN(Number(noVal)) && Number(noVal) > 0) {
          currentNo = Number(noVal);
        }
      }

      if (outputVal) {
        const bulletMatch = outputVal.match(/^([a-zA-Z0-9]+)[.)]\s*(.*)$/);
        if (bulletMatch && (!kodeVal || kodeVal === '')) {
          kodeVal = bulletMatch[1].toLowerCase();
          outputVal = bulletMatch[2].trim();
        }
      }

      if (!currentRencana && !outputVal) continue;

      flatRows.push({
        no: currentNo,
        rencanaKegiatan: currentRencana || `Rencana Kegiatan ${currentNo}`,
        kodeHuruf: kodeVal || '',
        output: outputVal || '',
        pedomanPengisian: pedomanVal || '',
      });
    }

    setParsedData(flatRows);
  };

  // Handler: Unggah Berkas (Word .docx, Excel .xlsx / .xls, CSV)
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadedFileName(file.name);
    setUploadedFileSize((file.size / 1024).toFixed(1) + ' KB');

    const isDocx = file.name.toLowerCase().endsWith('.docx');

    try {
      const buffer = await file.arrayBuffer();
      if (isDocx) {
        await parseDocxDocument(buffer);
        showToast(`Berhasil membaca dokumen Word: ${file.name}`);
      } else {
        parseExcelDocument(buffer);
        showToast(`Berhasil membaca berkas Excel: ${file.name}`);
      }
    } catch (err: any) {
      console.error(err);
      showToast('Gagal memproses berkas: ' + (err.message || 'Format tabel tidak dikenali'), 'error');
    }
  };

  // Handler: Hapus / Reset Berkas Terpilih
  const handleRemoveFile = () => {
    setUploadedFileName('');
    setUploadedFileSize('');
    setPreviewRows([]);
    setGroupedPreview([]);
    setImportText('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Handler: Tempel Teks Manual
  const handlePasteChange = (text: string) => {
    setImportText(text);
    if (!text.trim()) {
      setPreviewRows([]);
      setGroupedPreview([]);
      return;
    }

    const lines = text.split(/\r?\n/).filter((l) => l.trim() !== '');
    const rawRows = lines.map((l) => {
      if (l.includes('\t')) return l.split('\t');
      if (l.includes(';')) return l.split(';');
      return l.split(',');
    });
    processRawDataRows(rawRows);
  };

  // Handler: Submit Simpan Template Impor ke Database
  const handleImportSubmit = async () => {
    const targetJabatan = modalJabatanId || selectedJabatanId;
    if (!targetJabatan) {
      showToast('Pilih jabatan target terlebih dahulu', 'error');
      return;
    }

    if (previewRows.length === 0) {
      showToast('Belum ada data template yang dapat disimpan. Silakan pilih file terlebih dahulu.', 'error');
      return;
    }

    const jName = jabatanList.find((j) => j.id === targetJabatan)?.nama || 'Jabatan ini';

    setImporting(true);
    try {
      const payload = {
        jabatanId: targetJabatan,
        mode: importMode,
        items: groupedPreview,
        flatRows: previewRows,
      };

      const res = await fetch('/api/admin/master-kinerja/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Gagal mengimpor master kinerja');

      showToast(`Berhasil menyimpan template kinerja untuk ${jName}!`);
      setShowImportModal(false);
      handleRemoveFile();
      setSelectedJabatanId(targetJabatan);
    } catch (err: any) {
      showToast(err.message || 'Gagal menyimpan template', 'error');
    }
    setImporting(false);
  };

  const totalOutputs = rencanaList.reduce((acc, r) => acc + r.outputs.length, 0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>
      {/* Toast Alert */}
      {toast && (
        <div
          style={{
            position: 'fixed',
            top: '20px',
            right: '24px',
            zIndex: 99999,
            padding: '12px 20px',
            borderRadius: '12px',
            boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.15)',
            fontSize: '13.5px',
            fontWeight: '700',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            background: toast.type === 'success' ? '#ecfdf5' : '#fff1f2',
            color: toast.type === 'success' ? '#065f46' : '#9f1239',
            border: `1px solid ${toast.type === 'success' ? '#a7f3d0' : '#fecaca'}`,
          }}
        >
          <span>{toast.type === 'success' ? '✓' : '⚠️'}</span>
          <span>{toast.text}</span>
        </div>
      )}

      {/* Header Halaman */}
      <div>
        <h2 style={{ fontSize: '24px', fontWeight: '800', color: '#0f172a', marginBottom: '6px' }}>
          Master Data Kinerja Jabatan
        </h2>
        <p style={{ color: '#64748b', fontSize: '14px', lineHeight: '1.5' }}>
          Kelola struktur hierarki Rencana Kegiatan dan Output Kegiatan (Lampiran 3) yang disinkronkan ke pengisian laporan pegawai.
        </p>
      </div>

      {/* Control Bar & Filter Jabatan (Menyatu Langsung dengan Tabel) */}
      <div
        className="glass-card-static"
        style={{
          padding: '16px 20px',
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '16px',
        }}
      >
        {/* Left: Pemilihan Jabatan & Statistik */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '12px', fontWeight: '800', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              JABATAN:
            </span>
            <select
              value={selectedJabatanId}
              onChange={(e) => setSelectedJabatanId(e.target.value)}
              className="input-field"
              style={{
                minWidth: '280px',
                padding: '9px 14px',
                fontSize: '13.5px',
                fontWeight: '700',
                color: '#0f172a',
                background: '#ffffff',
                border: '1px solid #cbd5e1',
                borderRadius: '10px',
              }}
            >
              {jabatanList.map((j) => (
                <option key={j.id} value={j.id}>
                  {j.nama} {j.kategori ? `(${j.kategori})` : ''}
                </option>
              ))}
            </select>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span
              style={{
                fontSize: '12px',
                padding: '5px 12px',
                fontWeight: '700',
                background: '#eff6ff',
                color: '#1d4ed8',
                borderRadius: '20px',
                border: '1px solid #bfdbfe',
              }}
            >
              {rencanaList.length} Rencana Kegiatan
            </span>
            <span
              style={{
                fontSize: '12px',
                padding: '5px 12px',
                fontWeight: '700',
                background: '#ecfdf5',
                color: '#047857',
                borderRadius: '20px',
                border: '1px solid #a7f3d0',
              }}
            >
              {totalOutputs} Output Terdaftar
            </span>
          </div>
        </div>

        {/* Right: Tombol Aksi Tabel Terintegrasi */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={handleOpenImportModal}
            className="btn-outline"
            style={{
              padding: '9px 16px',
              fontSize: '13px',
              fontWeight: '700',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              color: '#4361ee',
              borderColor: '#bfdbfe',
              background: '#ffffff',
              borderRadius: '10px',
              cursor: 'pointer',
            }}
          >
            <span>📥 Impor Master (Word/Excel)</span>
          </button>

          <button
            type="button"
            onClick={handleOpenAddRencana}
            className="btn-primary"
            style={{
              padding: '9px 18px',
              fontSize: '13px',
              fontWeight: '700',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              borderRadius: '10px',
              boxShadow: '0 2px 6px rgba(67, 97, 238, 0.25)',
              cursor: 'pointer',
            }}
          >
            <span>+ Tambah Rencana Kegiatan</span>
          </button>
        </div>
      </div>

      {/* Konten Utama: Daftar Tabel Rencana Kegiatan */}
      {loading ? (
        <div className="glass-card-static" style={{ padding: '60px 20px', textAlign: 'center' }}>
          <div className="spinner" style={{ margin: '0 auto 14px auto' }} />
          <p style={{ color: '#64748b', fontSize: '14px', fontWeight: '500' }}>Memuat master data kinerja...</p>
        </div>
      ) : rencanaList.length === 0 ? (
        <div className="glass-card-static" style={{ padding: '60px 20px', textAlign: 'center' }}>
          <div style={{ fontSize: '42px', marginBottom: '14px' }}>📂</div>
          <h3 style={{ fontSize: '17px', fontWeight: '800', color: '#0f172a' }}>
            Belum Ada Rencana Kegiatan untuk Jabatan &quot;{currentJabatan?.nama}&quot;
          </h3>
          <p style={{ color: '#64748b', fontSize: '13.5px', maxWidth: '480px', margin: '8px auto 24px auto', lineHeight: '1.6' }}>
            Anda dapat langsung menambahkan Rencana Kegiatan pertama atau memanfaatkan fitur Impor untuk memasukkan berkas Word (.docx) atau Excel (.xlsx) sekaligus.
          </p>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', flexWrap: 'wrap' }}>
            <button
              onClick={handleOpenImportModal}
              className="btn-outline"
              style={{ padding: '9px 18px', fontSize: '13px', fontWeight: '700' }}
            >
              📥 Impor Master Data
            </button>
            <button
              onClick={handleOpenAddRencana}
              className="btn-primary"
              style={{ padding: '9px 20px', fontSize: '13px', fontWeight: '700' }}
            >
              + Tambah Rencana Kegiatan
            </button>
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {rencanaList.map((rencana) => (
            <div
              key={rencana.id}
              className="glass-card-static"
              style={{
                padding: 0,
                overflow: 'hidden',
                borderRadius: '16px',
                border: '1px solid #e2e8f0',
                background: '#ffffff',
                boxShadow: '0 2px 6px rgba(0, 0, 0, 0.03)',
              }}
            >
              {/* Header Kartu Rencana Kegiatan */}
              <div
                style={{
                  padding: '16px 20px',
                  background: '#f8fafc',
                  borderBottom: '1px solid #e2e8f0',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: '12px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px', minWidth: 0, flex: 1 }}>
                  <span
                    style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '8px',
                      background: '#2563eb',
                      color: '#ffffff',
                      fontWeight: '800',
                      fontSize: '14px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                      boxShadow: '0 1px 3px rgba(37, 99, 235, 0.3)',
                    }}
                  >
                    {rencana.noUrut}
                  </span>
                  <div style={{ minWidth: 0 }}>
                    <h3 style={{ fontSize: '15.5px', fontWeight: '800', color: '#0f172a', margin: 0, lineHeight: '1.4' }}>
                      {rencana.rencanaKegiatan}
                    </h3>
                  </div>
                  <span
                    style={{
                      fontSize: '11.5px',
                      fontWeight: '700',
                      padding: '3px 10px',
                      borderRadius: '12px',
                      background: '#eff6ff',
                      color: '#1d4ed8',
                      border: '1px solid #dbeafe',
                      flexShrink: 0,
                    }}
                  >
                    {rencana.outputs.length} Output
                  </span>
                </div>

                {/* Tombol Aksi Rencana */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <button
                    type="button"
                    onClick={() => handleOpenAddOutput(rencana)}
                    style={{
                      fontSize: '12px',
                      padding: '6px 14px',
                      fontWeight: '700',
                      color: '#047857',
                      borderColor: '#a7f3d0',
                      background: '#ecfdf5',
                      border: '1px solid #a7f3d0',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <span>+ Tambah Output</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleOpenEditRencana(rencana)}
                    style={{
                      padding: '6px 10px',
                      borderRadius: '8px',
                      border: '1px solid #cbd5e1',
                      background: '#ffffff',
                      color: '#475569',
                      cursor: 'pointer',
                    }}
                    title="Edit Rencana Kegiatan"
                  >
                    <IconEdit size={14} />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteRencana(rencana)}
                    style={{
                      padding: '6px 10px',
                      borderRadius: '8px',
                      border: '1px solid #fecaca',
                      background: '#fff1f2',
                      color: '#dc2626',
                      cursor: 'pointer',
                    }}
                    title="Hapus Rencana Kegiatan"
                  >
                    <IconTrash size={14} />
                  </button>
                </div>
              </div>

              {/* Tabel Output di bawah Rencana (Rapi, Luas, Tidak Terkesan Padat) */}
              {rencana.outputs.length === 0 ? (
                <div
                  style={{
                    padding: '28px',
                    textAlign: 'center',
                    fontSize: '13px',
                    color: '#94a3b8',
                    fontStyle: 'italic',
                    background: '#ffffff',
                  }}
                >
                  Belum ada butir output kegiatan. Klik tombol &quot;+ Tambah Output&quot; di kanan atas untuk menambahkan butir kinerja.
                </div>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', minWidth: '750px', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
                    <thead>
                      <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569', fontSize: '11.5px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        <th style={{ width: '65px', textAlign: 'center', padding: '12px 10px', fontWeight: '800' }}>Kode</th>
                        <th style={{ width: '42%', textAlign: 'left', padding: '12px 18px', fontWeight: '800' }}>Output Kegiatan</th>
                        <th style={{ width: '45%', textAlign: 'left', padding: '12px 18px', fontWeight: '800' }}>Pedoman Pengisian</th>
                        <th style={{ width: '85px', textAlign: 'center', padding: '12px 10px', fontWeight: '800' }}>Aksi</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rencana.outputs.map((out, oIdx) => (
                        <tr
                          key={out.id}
                          style={{
                            borderBottom: oIdx === rencana.outputs.length - 1 ? 'none' : '1px solid #f1f5f9',
                            background: oIdx % 2 === 0 ? '#ffffff' : '#fafafa',
                            transition: 'background 0.15s ease',
                          }}
                        >
                          <td style={{ textAlign: 'center', verticalAlign: 'top', padding: '15px 10px' }}>
                            <span
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                minWidth: '28px',
                                height: '26px',
                                background: '#eff6ff',
                                border: '1px solid #bfdbfe',
                                color: '#1d4ed8',
                                fontWeight: '800',
                                fontSize: '12px',
                                borderRadius: '6px',
                                padding: '0 6px',
                              }}
                            >
                              {out.kodeHuruf}.
                            </span>
                          </td>
                          <td
                            style={{
                              verticalAlign: 'top',
                              padding: '15px 18px',
                              fontWeight: '600',
                              color: '#0f172a',
                              fontSize: '13.5px',
                              lineHeight: '1.6',
                              wordBreak: 'break-word',
                            }}
                          >
                            {out.output}
                          </td>
                          <td
                            style={{
                              verticalAlign: 'top',
                              padding: '15px 18px',
                              color: '#475569',
                              fontSize: '13px',
                              lineHeight: '1.6',
                              whiteSpace: 'pre-line',
                              wordBreak: 'break-word',
                            }}
                          >
                            {out.pedomanPengisian ? (
                              out.pedomanPengisian
                            ) : (
                              <span style={{ color: '#94a3b8', fontStyle: 'italic' }}>-</span>
                            )}
                          </td>
                          <td style={{ textAlign: 'center', verticalAlign: 'top', padding: '14px 10px' }}>
                            <div style={{ display: 'inline-flex', gap: '6px', alignItems: 'center' }}>
                              <button
                                type="button"
                                onClick={() => handleOpenEditOutput(rencana, out)}
                                style={{
                                  padding: '6px 9px',
                                  borderRadius: '7px',
                                  border: '1px solid #bfdbfe',
                                  background: '#ffffff',
                                  color: '#2563eb',
                                  cursor: 'pointer',
                                }}
                                title="Edit Output"
                              >
                                <IconEdit size={14} />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteOutput(out)}
                                style={{
                                  padding: '6px 9px',
                                  borderRadius: '7px',
                                  border: '1px solid #fecaca',
                                  background: '#fff1f2',
                                  color: '#dc2626',
                                  cursor: 'pointer',
                                }}
                                title="Hapus Output"
                              >
                                <IconTrash size={14} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          ))}

          {/* Tombol Tambah Cepat di Bagian Bawah Tabel (Menyatu Alur) */}
          <div
            onClick={handleOpenAddRencana}
            style={{
              padding: '18px 24px',
              border: '2px dashed #cbd5e1',
              borderRadius: '16px',
              background: '#ffffff',
              textAlign: 'center',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '10px',
              color: '#4361ee',
            }}
          >
            <span style={{ fontSize: '18px', fontWeight: '800' }}>+</span>
            <div>
              <span style={{ fontSize: '14px', fontWeight: '700' }}>
                Tambah Rencana Kegiatan Baru (Nomor {nextNoUrut})
              </span>
              <p style={{ fontSize: '12px', color: '#64748b', margin: 0 }}>
                Tambahkan butir rencana kegiatan baru ke bawah daftar jabatan &quot;{currentJabatan?.nama}&quot;
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL TAMBAH/EDIT RENCANA KEGIATAN                                       */}
      {/* ========================================================================= */}
      {showRencanaModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100000,
            padding: '12px 8px',
          }}
          onClick={() => setShowRencanaModal(false)}
        >
          <div
            style={{
              background: '#ffffff',
              borderRadius: '18px',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
              border: '1px solid #e2e8f0',
              width: '100%',
              maxWidth: '520px',
              overflow: 'hidden',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header Modal */}
            <div
              style={{
                padding: '16px 20px',
                background: 'linear-gradient(135deg, #1d4ed8 0%, #312e81 100%)',
                color: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <div>
                <span style={{ fontSize: '11px', color: '#bfdbfe', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  {currentJabatan?.nama}
                </span>
                <h3 style={{ fontSize: '16px', fontWeight: '800', margin: '2px 0 0 0' }}>
                  {editingRencana ? 'Edit Rencana Kegiatan' : 'Tambah Rencana Kegiatan'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowRencanaModal(false)}
                style={{ background: 'transparent', border: 'none', color: '#ffffff', cursor: 'pointer', padding: '4px' }}
              >
                <IconClose size={20} />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmitRencana} style={{ padding: '22px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '800', color: '#334155', marginBottom: '6px' }}>
                  Nomor Urut
                </label>
                <input
                  type="number"
                  value={formRencanaNo}
                  onChange={(e) => setFormRencanaNo(e.target.value ? Number(e.target.value) : '')}
                  className="input-field"
                  style={{ width: '120px', padding: '8px 12px', fontSize: '13.5px', fontWeight: '700' }}
                  placeholder="1, 2, 3..."
                />
                <p style={{ fontSize: '11.5px', color: '#64748b', marginTop: '4px' }}>
                  Nomor urutan hirarki dalam dokumen Lampiran 3.
                </p>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '800', color: '#334155', marginBottom: '6px' }}>
                  Nama Rencana Kegiatan <span style={{ color: '#dc2626' }}>*</span>
                </label>
                <textarea
                  rows={3}
                  value={formRencanaText}
                  onChange={(e) => setFormRencanaText(e.target.value)}
                  placeholder="Contoh: Perencanaan, pelaksanaan, pengendalian dan evaluasi pelaksanaan kegiatan pemerintahan dan keamanan"
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: '10px',
                    border: '1px solid #cbd5e1',
                    fontSize: '13.5px',
                    lineHeight: '1.5',
                    fontFamily: 'inherit',
                    resize: 'none',
                    outline: 'none',
                  }}
                  required
                />
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '10px', paddingTop: '12px', borderTop: '1px solid #e2e8f0' }}>
                <button
                  type="button"
                  onClick={() => setShowRencanaModal(false)}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '9px',
                    border: '1px solid #cbd5e1',
                    background: '#ffffff',
                    fontSize: '13px',
                    fontWeight: '600',
                    color: '#475569',
                    cursor: 'pointer',
                  }}
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="btn-primary"
                  style={{ padding: '8px 20px', fontSize: '13px', fontWeight: '700' }}
                >
                  {saving ? 'Menyimpan...' : 'Simpan Rencana'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL TAMBAH/EDIT OUTPUT KEGIATAN                                         */}
      {/* ========================================================================= */}
      {showOutputModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100000,
            padding: '12px 8px',
          }}
          onClick={() => setShowOutputModal(false)}
        >
          <div
            style={{
              background: '#ffffff',
              borderRadius: '18px',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
              border: '1px solid #e2e8f0',
              width: '100%',
              maxWidth: '560px',
              overflow: 'hidden',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header Modal */}
            <div
              style={{
                padding: '16px 20px',
                background: 'linear-gradient(135deg, #059669 0%, #064e3b 100%)',
                color: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <div>
                <span style={{ fontSize: '11px', color: '#a7f3d0', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Rencana No. {parentRencana?.noUrut}
                </span>
                <h3 style={{ fontSize: '16px', fontWeight: '800', margin: '2px 0 0 0' }}>
                  {editingOutput ? 'Edit Output Kegiatan' : 'Tambah Output Kegiatan'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowOutputModal(false)}
                style={{ background: 'transparent', border: 'none', color: '#ffffff', cursor: 'pointer', padding: '4px' }}
              >
                <IconClose size={20} />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmitOutput} style={{ padding: '22px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '10px 14px', fontSize: '12.5px', color: '#475569' }}>
                <strong style={{ color: '#0f172a', display: 'block', marginBottom: '2px' }}>Rencana Induk:</strong>
                {parentRencana?.rencanaKegiatan}
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '800', color: '#334155', marginBottom: '6px' }}>
                  Kode Huruf (a, b, c...) <span style={{ color: '#dc2626' }}>*</span>
                </label>
                <input
                  type="text"
                  value={formKodeHuruf}
                  onChange={(e) => setFormKodeHuruf(e.target.value)}
                  placeholder="a"
                  style={{
                    width: '80px',
                    textAlign: 'center',
                    fontWeight: '800',
                    fontSize: '14px',
                    padding: '8px',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                  }}
                  required
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '800', color: '#334155', marginBottom: '6px' }}>
                  Nama Output Kegiatan <span style={{ color: '#dc2626' }}>*</span>
                </label>
                <textarea
                  rows={3}
                  value={formOutputText}
                  onChange={(e) => setFormOutputText(e.target.value)}
                  placeholder="Contoh: Tersusunnya Rencana Anggaran Biaya (RAB) dalam perencanaan kegiatan tahun berikutnya..."
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: '10px',
                    border: '1px solid #cbd5e1',
                    fontSize: '13.5px',
                    lineHeight: '1.5',
                    fontFamily: 'inherit',
                    resize: 'none',
                    outline: 'none',
                  }}
                  required
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '800', color: '#334155', marginBottom: '6px' }}>
                  Pedoman Pengisian (Opsional)
                </label>
                <textarea
                  rows={2}
                  value={formPedoman}
                  onChange={(e) => setFormPedoman(e.target.value)}
                  placeholder="Contoh: -Kolom 4: diisi jumlah kegiatan  -Kolom 5: diisi nama kegiatan"
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: '10px',
                    border: '1px solid #cbd5e1',
                    fontSize: '13px',
                    lineHeight: '1.5',
                    fontFamily: 'inherit',
                    resize: 'none',
                    outline: 'none',
                  }}
                />
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '10px', paddingTop: '12px', borderTop: '1px solid #e2e8f0' }}>
                <button
                  type="button"
                  onClick={() => setShowOutputModal(false)}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '9px',
                    border: '1px solid #cbd5e1',
                    background: '#ffffff',
                    fontSize: '13px',
                    fontWeight: '600',
                    color: '#475569',
                    cursor: 'pointer',
                  }}
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  style={{
                    padding: '8px 20px',
                    borderRadius: '9px',
                    border: 'none',
                    background: '#059669',
                    color: '#ffffff',
                    fontSize: '13px',
                    fontWeight: '700',
                    cursor: 'pointer',
                  }}
                >
                  {saving ? 'Menyimpan...' : 'Simpan Output'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL IMPOR MASTER DATA (Ukuran Proporsional, Bersih, Rapi)               */}
      {/* ========================================================================= */}
      {showImportModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100000,
            padding: '12px 8px',
          }}
          onClick={() => setShowImportModal(false)}
        >
          <div
            style={{
              background: '#ffffff',
              borderRadius: '20px',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
              border: '1px solid #e2e8f0',
              width: '100%',
              maxWidth: importStep === 1 ? '580px' : '980px',
              maxHeight: 'min(92vh, 840px)',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
              transition: 'all 0.25s ease',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header Modal */}
            <div
              style={{
                padding: '14px 18px',
                background: '#f8fafc',
                borderBottom: '1px solid #e2e8f0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexShrink: 0,
                gap: '12px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
                <div
                  style={{
                    width: '38px',
                    height: '38px',
                    minWidth: '38px',
                    minHeight: '38px',
                    maxWidth: '38px',
                    maxHeight: '38px',
                    aspectRatio: '1 / 1',
                    borderRadius: '10px',
                    background: '#eff6ff',
                    border: '1px solid #bfdbfe',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#2563eb',
                    flexShrink: 0,
                  }}
                >
                  <IconUploadCloud size={20} />
                </div>
                <div style={{ minWidth: 0 }}>
                  <h3 style={{ fontSize: '15.5px', fontWeight: '800', color: '#0f172a', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    Impor Template Master Kinerja
                  </h3>
                  <p style={{ fontSize: '12px', color: '#64748b', margin: '2px 0 0 0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    Format Word (.docx) atau Excel (.xlsx/.xls)
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowImportModal(false)}
                style={{
                  background: '#ffffff',
                  border: '1px solid #cbd5e1',
                  borderRadius: '10px',
                  color: '#64748b',
                  cursor: 'pointer',
                  padding: '6px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
                title="Tutup Modal"
              >
                <IconClose size={18} />
              </button>
            </div>

            {/* Stepper Navigation */}
            <div
              style={{
                padding: '10px 16px',
                background: '#ffffff',
                borderBottom: '1px solid #e2e8f0',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                flexShrink: 0,
              }}
            >
              {/* Step 1 Pill */}
              <div
                onClick={() => setImportStep(1)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  cursor: 'pointer',
                  opacity: importStep === 1 ? 1 : 0.7,
                  minWidth: 0,
                  flexShrink: 0,
                }}
              >
                <span
                  style={{
                    width: '26px',
                    height: '26px',
                    minWidth: '26px',
                    minHeight: '26px',
                    maxWidth: '26px',
                    maxHeight: '26px',
                    aspectRatio: '1 / 1',
                    borderRadius: '50%',
                    background: importStep === 1 ? '#4361ee' : '#10b981',
                    color: '#ffffff',
                    fontSize: '12px',
                    fontWeight: '800',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    boxShadow: '0 1px 2px rgba(0,0,0,0.08)',
                  }}
                >
                  {importStep > 1 ? '✓' : '1'}
                </span>
                <span style={{ fontSize: '12.5px', fontWeight: '700', color: importStep === 1 ? '#4361ee' : '#0f172a', whiteSpace: 'nowrap' }}>
                  1. Pengaturan
                </span>
              </div>

              <div style={{ flex: 1, height: '2px', background: '#e2e8f0', minWidth: '8px' }} />

              {/* Step 2 Pill */}
              <div
                onClick={() => setImportStep(2)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  cursor: 'pointer',
                  opacity: importStep === 2 ? 1 : 0.6,
                  minWidth: 0,
                  flexShrink: 0,
                }}
              >
                <span
                  style={{
                    width: '26px',
                    height: '26px',
                    minWidth: '26px',
                    minHeight: '26px',
                    maxWidth: '26px',
                    maxHeight: '26px',
                    aspectRatio: '1 / 1',
                    borderRadius: '50%',
                    background: importStep === 2 ? '#4361ee' : '#cbd5e1',
                    color: '#ffffff',
                    fontSize: '12px',
                    fontWeight: '800',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    boxShadow: '0 1px 2px rgba(0,0,0,0.08)',
                  }}
                >
                  2
                </span>
                <span style={{ fontSize: '12.5px', fontWeight: '700', color: importStep === 2 ? '#4361ee' : '#64748b', whiteSpace: 'nowrap' }}>
                  2. Upload & Pratinjau
                </span>
              </div>
            </div>

            {/* Modal Body */}
            <div style={{ padding: '24px', overflowY: 'auto', flex: 1 }}>
              {/* ===================== STEP 1: PENGATURAN ===================== */}
              {importStep === 1 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  {/* Pilihan Jabatan Target */}
                  <div
                    style={{
                      padding: '16px 18px',
                      borderRadius: '14px',
                      background: '#f8fafc',
                      border: '1px solid #e2e8f0',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '8px',
                    }}
                  >
                    <label style={{ fontSize: '12.5px', fontWeight: '800', color: '#0f172a', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      Jabatan Sasaran / Penerima Template
                    </label>
                    <p style={{ fontSize: '12px', color: '#64748b', margin: 0 }}>
                      Pamong dengan jabatan ini akan otomatis disinkronkan untuk mengisi Laporan Kinerja Bulanan sesuai template ini.
                    </p>
                    <select
                      value={modalJabatanId}
                      onChange={(e) => setModalJabatanId(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '10px 14px',
                        background: '#ffffff',
                        borderRadius: '10px',
                        border: '1px solid #cbd5e1',
                        fontSize: '13.5px',
                        fontWeight: '700',
                        color: '#0f172a',
                        marginTop: '4px',
                      }}
                    >
                      {jabatanList.map((j) => (
                        <option key={j.id} value={j.id}>
                          {j.nama} {j.kategori ? `(${j.kategori})` : ''}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Pilihan Metode Impor */}
                  <div
                    style={{
                      padding: '16px 18px',
                      borderRadius: '14px',
                      background: '#f8fafc',
                      border: '1px solid #e2e8f0',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '12px',
                    }}
                  >
                    <div>
                      <label style={{ fontSize: '12.5px', fontWeight: '800', color: '#0f172a', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                        Pilihan Metode Pembaruan
                      </label>
                      <p style={{ fontSize: '12px', color: '#64748b', margin: '2px 0 0 0' }}>
                        Tentukan bagaimana sistem menangani data kegiatan lama pada jabatan ini.
                      </p>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      {/* Option 1: Replace */}
                      <label
                        style={{
                          padding: '14px',
                          borderRadius: '12px',
                          border: `2px solid ${importMode === 'replace' ? '#4361ee' : '#e2e8f0'}`,
                          background: importMode === 'replace' ? '#f0f4ff' : '#ffffff',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'flex-start',
                          gap: '12px',
                          transition: 'all 0.15s ease',
                        }}
                      >
                        <input
                          type="radio"
                          name="importMode"
                          value="replace"
                          checked={importMode === 'replace'}
                          onChange={() => setImportMode('replace')}
                          style={{ marginTop: '3px' }}
                        />
                        <div style={{ flex: 1 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                            <span style={{ fontSize: '13.5px', fontWeight: '800', color: '#0f172a' }}>
                              Ganti / Timpa Template Lama (Replace)
                            </span>
                            <span
                              style={{
                                fontSize: '10.5px',
                                fontWeight: '800',
                                padding: '2px 8px',
                                borderRadius: '10px',
                                background: '#fef3c7',
                                color: '#92400e',
                                border: '1px solid #fde68a',
                              }}
                            >
                              Direkomendasikan
                            </span>
                          </div>
                          <p style={{ fontSize: '12px', color: '#64748b', margin: '4px 0 0 0', lineHeight: '1.5' }}>
                            Menghapus data template lama pada jabatan ini dan menggantinya utuh dari dokumen baru. Mencegah butir kegiatan ganda.
                          </p>
                        </div>
                      </label>

                      {/* Option 2: Append */}
                      <label
                        style={{
                          padding: '14px',
                          borderRadius: '12px',
                          border: `2px solid ${importMode === 'append' ? '#4361ee' : '#e2e8f0'}`,
                          background: importMode === 'append' ? '#f0f4ff' : '#ffffff',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'flex-start',
                          gap: '12px',
                          transition: 'all 0.15s ease',
                        }}
                      >
                        <input
                          type="radio"
                          name="importMode"
                          value="append"
                          checked={importMode === 'append'}
                          onChange={() => setImportMode('append')}
                          style={{ marginTop: '3px' }}
                        />
                        <div style={{ flex: 1 }}>
                          <span style={{ fontSize: '13.5px', fontWeight: '800', color: '#0f172a' }}>
                            Tambahkan ke Template yang Ada (Append)
                          </span>
                          <p style={{ fontSize: '12px', color: '#64748b', margin: '4px 0 0 0', lineHeight: '1.5' }}>
                            Menambahkan butir-butir baru ke bawah rencana kegiatan yang sudah ada tanpa menghapus data sebelumnya.
                          </p>
                        </div>
                      </label>
                    </div>
                  </div>

                  {/* Info Box Format Dokumen */}
                  <div
                    style={{
                      padding: '14px 16px',
                      borderRadius: '12px',
                      background: '#eff6ff',
                      border: '1px solid #bfdbfe',
                      fontSize: '12.5px',
                      color: '#1e40af',
                      lineHeight: '1.5',
                      display: 'flex',
                      gap: '10px',
                    }}
                  >
                    <span style={{ fontSize: '16px' }}>💡</span>
                    <div>
                      <strong>Mendukung Dokumen Word (.docx) & Excel (.xlsx / .csv):</strong>
                      <div style={{ marginTop: '2px', color: '#1e3a8a' }}>
                        Sistem secara pintar mendeteksi tabel Lampiran 3. Bagian KOP surat, nama pejabat, NIP, capaian, dan tanda tangan otomatis diabaikan sehingga data tetap bersih dan sinkron dengan dashboard.
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* ===================== STEP 2: UPLOAD & PRATINJAU ===================== */}
              {importStep === 2 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                  {/* Summary Bar */}
                  <div
                    style={{
                      padding: '10px 16px',
                      background: '#f8fafc',
                      border: '1px solid #e2e8f0',
                      borderRadius: '12px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      flexWrap: 'wrap',
                      gap: '10px',
                      fontSize: '12.5px',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                      <div>
                        <span style={{ color: '#64748b' }}>Jabatan Target: </span>
                        <strong style={{ color: '#0f172a' }}>
                          {jabatanList.find((j) => j.id === modalJabatanId)?.nama || '-'}
                        </strong>
                      </div>
                      <span style={{ color: '#cbd5e1' }}>|</span>
                      <div>
                        <span style={{ color: '#64748b' }}>Metode: </span>
                        <strong style={{ color: '#0f172a' }}>
                          {importMode === 'replace' ? 'Ganti / Timpa Lama' : 'Tambahkan (Append)'}
                        </strong>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => setImportStep(1)}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: '#4361ee',
                        fontSize: '12px',
                        fontWeight: '700',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                      }}
                    >
                      <IconEdit size={12} />
                      <span>Ubah Pengaturan</span>
                    </button>
                  </div>

                  {/* Tab Selector: Upload vs Paste */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
                    <div>
                      <h4 style={{ fontSize: '14.5px', fontWeight: '800', color: '#0f172a', margin: 0 }}>
                        Pilih Berkas Dokumen
                      </h4>
                      <p style={{ fontSize: '12px', color: '#64748b', margin: '2px 0 0 0' }}>
                        Unggah berkas Word (.docx) atau Excel (.xlsx / .xls / .csv) Anda
                      </p>
                    </div>

                    <div style={{ display: 'inline-flex', padding: '3px', background: '#f1f5f9', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                      <button
                        type="button"
                        onClick={() => setImportTab('upload')}
                        style={{
                          padding: '6px 14px',
                          borderRadius: '8px',
                          fontSize: '12px',
                          fontWeight: '700',
                          border: 'none',
                          cursor: 'pointer',
                          background: importTab === 'upload' ? '#ffffff' : 'transparent',
                          color: importTab === 'upload' ? '#4361ee' : '#64748b',
                          boxShadow: importTab === 'upload' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                        }}
                      >
                        Unggah Berkas (.docx / .xlsx)
                      </button>
                      <button
                        type="button"
                        onClick={() => setImportTab('paste')}
                        style={{
                          padding: '6px 14px',
                          borderRadius: '8px',
                          fontSize: '12px',
                          fontWeight: '700',
                          border: 'none',
                          cursor: 'pointer',
                          background: importTab === 'paste' ? '#ffffff' : 'transparent',
                          color: importTab === 'paste' ? '#4361ee' : '#64748b',
                          boxShadow: importTab === 'paste' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                        }}
                      >
                        Tempel Teks (Paste)
                      </button>
                    </div>
                  </div>

                  {/* Dropzone Area */}
                  {importTab === 'upload' ? (
                    <div>
                      {!uploadedFileName ? (
                        <div
                          onClick={() => fileInputRef.current?.click()}
                          style={{
                            border: '2px dashed #94a7ff',
                            borderRadius: '16px',
                            background: '#f8fafc',
                            padding: '32px 20px',
                            textAlign: 'center',
                            cursor: 'pointer',
                            transition: 'all 0.2s ease',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '10px',
                          }}
                        >
                          <input
                            ref={fileInputRef}
                            type="file"
                            accept=".docx,.xlsx,.xls,.csv,.tsv,.txt"
                            onChange={handleFileUpload}
                            style={{ display: 'none' }}
                          />
                          <div
                            style={{
                              width: '50px',
                              height: '50px',
                              borderRadius: '14px',
                              background: '#eff6ff',
                              border: '1px solid #bfdbfe',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              color: '#2563eb',
                            }}
                          >
                            <IconUploadCloud size={26} />
                          </div>
                          <div>
                            <p style={{ fontSize: '14px', fontWeight: '800', color: '#0f172a', margin: 0 }}>
                              Klik di sini untuk memilih Berkas Word atau Excel
                            </p>
                            <p style={{ fontSize: '12px', color: '#64748b', margin: '4px 0 0 0' }}>
                              Mendukung <strong>.docx</strong> (Word), <strong>.xlsx</strong>, <strong>.xls</strong>, atau <strong>.csv</strong>
                            </p>
                          </div>
                          <span
                            style={{
                              fontSize: '12px',
                              fontWeight: '700',
                              padding: '6px 16px',
                              borderRadius: '8px',
                              background: '#ffffff',
                              border: '1px solid #cbd5e1',
                              color: '#334155',
                              marginTop: '4px',
                            }}
                          >
                            Pilih Dokumen dari Komputer
                          </span>
                        </div>
                      ) : (
                        /* File Selected Card */
                        <div
                          style={{
                            padding: '14px 18px',
                            background: '#ecfdf5',
                            border: '1px solid #a7f3d0',
                            borderRadius: '14px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            flexWrap: 'wrap',
                            gap: '12px',
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                            <div
                              style={{
                                width: '42px',
                                height: '42px',
                                borderRadius: '10px',
                                background: '#10b981',
                                color: '#ffffff',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                flexShrink: 0,
                              }}
                            >
                              <IconCheckCircle size={24} />
                            </div>
                            <div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <strong style={{ fontSize: '14px', color: '#065f46' }}>{uploadedFileName}</strong>
                                <span style={{ fontSize: '11.5px', color: '#047857' }}>({uploadedFileSize})</span>
                              </div>
                              <span style={{ fontSize: '12px', color: '#047857', fontWeight: '700', display: 'block', marginTop: '2px' }}>
                                ✓ {groupedPreview.length} Rencana Kegiatan · {previewRows.length} Butir Output Terdeteksi
                              </span>
                            </div>
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <button
                              type="button"
                              onClick={() => fileInputRef.current?.click()}
                              style={{
                                padding: '6px 12px',
                                borderRadius: '8px',
                                border: '1px solid #a7f3d0',
                                background: '#ffffff',
                                fontSize: '12px',
                                fontWeight: '700',
                                color: '#047857',
                                cursor: 'pointer',
                              }}
                            >
                              Ganti Berkas
                            </button>
                            <button
                              type="button"
                              onClick={handleRemoveFile}
                              style={{
                                padding: '6px 12px',
                                borderRadius: '8px',
                                border: '1px solid #fecaca',
                                background: '#fff1f2',
                                fontSize: '12px',
                                fontWeight: '700',
                                color: '#dc2626',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px',
                              }}
                            >
                              <IconTrash size={13} />
                              <span>Hapus</span>
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    /* Tempel Teks Area */
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <textarea
                        rows={5}
                        value={importText}
                        onChange={(e) => handlePasteChange(e.target.value)}
                        placeholder="Tempel baris tabel Anda di sini (Format kolom: No [TAB] Rencana Kegiatan [TAB] Kode [TAB] Output [TAB] Pedoman Pengisian)"
                        style={{
                          width: '100%',
                          padding: '10px 14px',
                          borderRadius: '10px',
                          border: '1px solid #cbd5e1',
                          fontSize: '12px',
                          fontFamily: 'monospace',
                          lineHeight: '1.5',
                          outline: 'none',
                        }}
                      />
                      {importText && (
                        <div style={{ textAlign: 'right' }}>
                          <button
                            type="button"
                            onClick={handleRemoveFile}
                            style={{ background: 'transparent', border: 'none', color: '#dc2626', fontSize: '12px', cursor: 'pointer' }}
                          >
                            Hapus Teks
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Pratinjau Tabel Hasil Impor (Proporsional & Bersih) */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <h4 style={{ fontSize: '14px', fontWeight: '800', color: '#0f172a', margin: 0 }}>
                          Pratinjau Butir Kegiatan
                        </h4>
                        {previewRows.length > 0 && (
                          <span
                            style={{
                              fontSize: '11.5px',
                              fontWeight: '700',
                              padding: '2px 10px',
                              borderRadius: '12px',
                              background: '#eff6ff',
                              color: '#1d4ed8',
                              border: '1px solid #bfdbfe',
                            }}
                          >
                            {groupedPreview.length} Rencana · {previewRows.length} Output
                          </span>
                        )}
                      </div>
                      <span style={{ fontSize: '12px', color: '#64748b' }}>
                        Hanya tabel butir kegiatan yang diekstrak. KOP & tanda tangan telah dibersihkan.
                      </span>
                    </div>

                    {previewRows.length > 0 ? (
                      <div
                        style={{
                          border: '1px solid #e2e8f0',
                          borderRadius: '12px',
                          overflow: 'hidden',
                          maxHeight: '340px',
                          overflowY: 'auto',
                          background: '#ffffff',
                        }}
                      >
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12.5px', textAlign: 'left' }}>
                          <thead
                            style={{
                              position: 'sticky',
                              top: 0,
                              zIndex: 10,
                              background: '#f1f5f9',
                              borderBottom: '1px solid #e2e8f0',
                              color: '#334155',
                              fontWeight: '800',
                              textTransform: 'uppercase',
                              fontSize: '11px',
                              letterSpacing: '0.04em',
                            }}
                          >
                            <tr>
                              <th style={{ padding: '10px 12px', textAlign: 'center', width: '50px', borderRight: '1px solid #e2e8f0' }}>No</th>
                              <th style={{ padding: '10px 14px', width: '32%', borderRight: '1px solid #e2e8f0' }}>Rencana Kegiatan</th>
                              <th style={{ padding: '10px 10px', textAlign: 'center', width: '55px', borderRight: '1px solid #e2e8f0' }}>Kode</th>
                              <th style={{ padding: '10px 14px', width: '32%', borderRight: '1px solid #e2e8f0' }}>Output Kegiatan</th>
                              <th style={{ padding: '10px 14px' }}>Pedoman Pengisian</th>
                            </tr>
                          </thead>
                          <tbody>
                            {groupedPreview.map((g, gIdx) => {
                              const groupBg = gIdx % 2 === 0 ? '#ffffff' : '#f8fafc';
                              return g.outputs.map((out, oIdx) => (
                                <tr
                                  key={`prev-${g.noUrut}-${out.kodeHuruf}-${oIdx}`}
                                  style={{
                                    background: groupBg,
                                    borderBottom: '1px solid #f1f5f9',
                                  }}
                                >
                                  {oIdx === 0 && (
                                    <>
                                      <td
                                        rowSpan={g.outputs.length}
                                        style={{
                                          padding: '10px 12px',
                                          textAlign: 'center',
                                          fontWeight: '800',
                                          color: '#1e293b',
                                          verticalAlign: 'top',
                                          borderRight: '1px solid #e2e8f0',
                                          background: groupBg,
                                        }}
                                      >
                                        {g.noUrut}
                                      </td>
                                      <td
                                        rowSpan={g.outputs.length}
                                        style={{
                                          padding: '10px 14px',
                                          fontWeight: '700',
                                          color: '#0f172a',
                                          verticalAlign: 'top',
                                          borderRight: '1px solid #e2e8f0',
                                          background: groupBg,
                                          lineHeight: '1.4',
                                        }}
                                      >
                                        {g.rencanaKegiatan}
                                      </td>
                                    </>
                                  )}
                                  <td
                                    style={{
                                      padding: '10px',
                                      textAlign: 'center',
                                      fontWeight: '800',
                                      color: '#1d4ed8',
                                      verticalAlign: 'top',
                                      borderRight: '1px solid #e2e8f0',
                                    }}
                                  >
                                    {out.kodeHuruf}.
                                  </td>
                                  <td
                                    style={{
                                      padding: '10px 14px',
                                      color: '#1e293b',
                                      fontWeight: '500',
                                      verticalAlign: 'top',
                                      borderRight: '1px solid #e2e8f0',
                                      lineHeight: '1.5',
                                    }}
                                  >
                                    {out.output}
                                  </td>
                                  <td
                                    style={{
                                      padding: '10px 14px',
                                      color: '#64748b',
                                      verticalAlign: 'top',
                                      lineHeight: '1.4',
                                    }}
                                  >
                                    {out.pedomanPengisian || '-'}
                                  </td>
                                </tr>
                              ));
                            })}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <div
                        style={{
                          padding: '36px 20px',
                          borderRadius: '12px',
                          border: '1px dashed #cbd5e1',
                          background: '#f8fafc',
                          textAlign: 'center',
                          color: '#94a3b8',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          gap: '6px',
                        }}
                      >
                        <IconFileSpreadsheet size={28} color="#94a3b8" />
                        <p style={{ fontSize: '13px', fontWeight: '700', color: '#475569', margin: 0 }}>
                          Belum ada data tabel yang dimuat
                        </p>
                        <p style={{ fontSize: '12px', color: '#94a3b8', margin: 0 }}>
                          Pilih berkas Word atau Excel di atas untuk melihat pratinjau tabel butir kegiatan.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div
              style={{
                padding: '16px 24px',
                background: '#f8fafc',
                borderTop: '1px solid #e2e8f0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexShrink: 0,
              }}
            >
              {importStep === 1 ? (
                <>
                  <button
                    type="button"
                    onClick={() => setShowImportModal(false)}
                    style={{
                      padding: '9px 18px',
                      borderRadius: '10px',
                      border: '1px solid #cbd5e1',
                      background: '#ffffff',
                      fontSize: '13px',
                      fontWeight: '700',
                      color: '#475569',
                      cursor: 'pointer',
                    }}
                  >
                    Tutup
                  </button>
                  <button
                    type="button"
                    onClick={() => setImportStep(2)}
                    className="btn-primary"
                    style={{
                      padding: '9px 20px',
                      fontSize: '13px',
                      fontWeight: '700',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '8px',
                    }}
                  >
                    <span>Lanjut ke Upload & Pratinjau</span>
                    <IconArrowRight size={15} />
                  </button>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => setImportStep(1)}
                    style={{
                      padding: '9px 16px',
                      borderRadius: '10px',
                      border: '1px solid #cbd5e1',
                      background: '#ffffff',
                      fontSize: '13px',
                      fontWeight: '700',
                      color: '#475569',
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                    }}
                  >
                    <IconArrowLeft size={15} />
                    <span>Kembali ke Pengaturan</span>
                  </button>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <button
                      type="button"
                      onClick={() => setShowImportModal(false)}
                      style={{
                        padding: '9px 16px',
                        borderRadius: '10px',
                        border: '1px solid #cbd5e1',
                        background: '#ffffff',
                        fontSize: '13px',
                        fontWeight: '700',
                        color: '#475569',
                        cursor: 'pointer',
                      }}
                    >
                      Tutup
                    </button>
                    <button
                      type="button"
                      onClick={handleImportSubmit}
                      disabled={importing || previewRows.length === 0}
                      className="btn-primary"
                      style={{
                        padding: '9px 22px',
                        fontSize: '13px',
                        fontWeight: '700',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '8px',
                        opacity: importing || previewRows.length === 0 ? 0.5 : 1,
                        cursor: importing || previewRows.length === 0 ? 'not-allowed' : 'pointer',
                      }}
                    >
                      {importing ? (
                        <span>Menyimpan Template...</span>
                      ) : (
                        <>
                          <IconCheckCircle size={16} />
                          <span>Simpan Template Master</span>
                        </>
                      )}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
