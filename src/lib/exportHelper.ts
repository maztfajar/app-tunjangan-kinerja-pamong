import * as XLSX from 'xlsx';

export interface ExportColumn {
  header: string;
  key: string;
  width?: number; // approx char width
  align?: 'left' | 'center' | 'right';
}

export interface ExportDataOptions {
  filename: string;
  title: string;
  subtitle?: string;
  columns: ExportColumn[];
  rows: Record<string, unknown>[];
  kopSettings?: {
    instansi?: string;
    kalurahan?: string;
    alamat?: string;
    ttdNama?: string;
    ttdJabatan?: string;
    ttdNip?: string;
  };
}

/**
 * Unduh berkas langsung di browser
 */
function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/**
 * 1. EKSPOR EXCEL (.xlsx)
 */
export function exportToExcel({
  filename,
  title,
  subtitle,
  columns,
  rows,
}: ExportDataOptions) {
  const aoaData: (string | number | null | undefined)[][] = [];

  // Header Title & Metadata
  aoaData.push([title.toUpperCase()]);
  if (subtitle) aoaData.push([subtitle]);
  aoaData.push([`Tanggal Ekspor: ${new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}`]);
  aoaData.push([]); // blank line

  // Column Headers
  aoaData.push(columns.map((c) => c.header));

  // Rows Data
  rows.forEach((row) => {
    const rowValues = columns.map((col) => {
      const val = row[col.key];
      if (val === null || val === undefined) return '';
      return typeof val === 'number' ? val : String(val);
    });
    aoaData.push(rowValues);
  });

  const ws = XLSX.utils.aoa_to_sheet(aoaData);

  // Set column widths
  ws['!cols'] = columns.map((c) => ({
    wch: Math.max(c.width || 15, c.header.length + 3),
  }));

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Data Rekap');

  const cleanFilename = filename.endsWith('.xlsx') ? filename : `${filename}.xlsx`;
  XLSX.writeFile(wb, cleanFilename);
}

/**
 * 2. EKSPOR CSV (.csv) dengan UTF-8 BOM
 */
export function exportToCsv({
  filename,
  title,
  subtitle,
  columns,
  rows,
}: ExportDataOptions) {
  const csvRows: string[] = [];

  // Metadata headers
  csvRows.push(`"${title.replace(/"/g, '""')}"`);
  if (subtitle) csvRows.push(`"${subtitle.replace(/"/g, '""')}"`);
  csvRows.push(`"Tanggal Ekspor: ${new Date().toLocaleDateString('id-ID')}"`);
  csvRows.push(''); // blank

  // Header row
  csvRows.push(columns.map((c) => `"${c.header.replace(/"/g, '""')}"`).join(','));

  // Data rows
  rows.forEach((row) => {
    const rowValues = columns.map((col) => {
      const val = row[col.key];
      if (val === null || val === undefined) return '""';
      const cleanVal = String(val).replace(/"/g, '""');
      return `"${cleanVal}"`;
    });
    csvRows.push(rowValues.join(','));
  });

  // \uFEFF is UTF-8 Byte Order Mark for Excel compatibility
  const csvContent = '\uFEFF' + csvRows.join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const cleanFilename = filename.endsWith('.csv') ? filename : `${filename}.csv`;
  downloadBlob(blob, cleanFilename);
}

/**
 * 3. EKSPOR WORD (.doc / HTML Word Document)
 */
export function exportToWord({
  filename,
  title,
  subtitle,
  columns,
  rows,
  kopSettings,
}: ExportDataOptions) {
  const instansi = kopSettings?.instansi || 'PEMERINTAH KABUPATEN KULON PROGO';
  const kalurahan = kopSettings?.kalurahan || 'KAPANEWON PENGASIH - KALURAHAN PENGASIH';
  const alamat = kopSettings?.alamat || 'Jl. Kertodiningrat No. 1, Pengasih, Kulon Progo, D.I. Yogyakarta 55652';

  const ttdNama = kopSettings?.ttdNama || 'DJOKO PURWANTO';
  const ttdJabatan = kopSettings?.ttdJabatan || 'Lurah Pengasih';
  const ttdNip = kopSettings?.ttdNip;

  const todayStr = new Date().toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  const tableHeaders = columns
    .map(
      (c) =>
        `<th style="border:1px solid #000; padding:7px 8px; background-color:#f1f5f9; text-align:${c.align || 'left'}; font-weight:bold; font-size:10pt;">${c.header}</th>`
    )
    .join('');

  const tableRows = rows
    .map((row, idx) => {
      const bg = idx % 2 === 1 ? '#fafafa' : '#ffffff';
      const cells = columns
        .map((col) => {
          const val = row[col.key];
          const displayVal = val === null || val === undefined ? '-' : String(val);
          return `<td style="border:1px solid #000; padding:6px 8px; text-align:${col.align || 'left'}; font-size:9.5pt; background-color:${bg};">${displayVal}</td>`;
        })
        .join('');
      return `<tr>${cells}</tr>`;
    })
    .join('');

  const htmlContent = `
    <!DOCTYPE html>
    <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
    <head>
      <meta charset="utf-8">
      <title>${title}</title>
      <style>
        @page { size: A4 portrait; margin: 1.5cm 1.5cm 1.5cm 1.5cm; }
        body { font-family: 'Times New Roman', Times, serif; font-size: 11pt; line-height: 1.3; color: #000000; }
        .kop { text-align: center; border-bottom: 2.5px solid #000; padding-bottom: 4px; margin-bottom: 2px; }
        .kop-line2 { border-bottom: 1px solid #000; margin-bottom: 16px; }
        .kop h2 { margin: 0; font-size: 12.5pt; font-weight: bold; text-transform: uppercase; }
        .kop h1 { margin: 1px 0; font-size: 14pt; font-weight: bold; text-transform: uppercase; }
        .kop p { margin: 2px 0 0 0; font-size: 9pt; font-style: italic; }
        .doc-title { text-align: center; font-size: 13pt; font-weight: bold; text-transform: uppercase; margin-bottom: 2px; }
        .doc-sub { text-align: center; font-size: 10.5pt; margin-bottom: 16px; color: #333333; }
        table { width: 100%; border-collapse: collapse; margin-top: 10px; margin-bottom: 20px; }
        .footer-ttd { width: 100%; margin-top: 35px; }
        .ttd-box { float: right; width: 260px; text-align: center; font-size: 10.5pt; }
        .clear { clear: both; }
      </style>
    </head>
    <body>
      <div class="kop">
        <h2>${instansi}</h2>
        <h1>${kalurahan}</h1>
        <p>${alamat}</p>
      </div>
      <div class="kop-line2"></div>

      <div class="doc-title">${title}</div>
      ${subtitle ? `<div class="doc-sub">${subtitle}</div>` : ''}

      <table>
        <thead>
          <tr>${tableHeaders}</tr>
        </thead>
        <tbody>
          ${tableRows}
        </tbody>
      </table>

      <div class="footer-ttd">
        <div class="ttd-box">
          <p style="margin-bottom: 2px;">Pengasih, ${todayStr}</p>
          <p style="margin-top: 0; font-weight: bold; margin-bottom: 60px;">${ttdJabatan}</p>
          <p style="margin: 0; font-weight: bold; text-decoration: underline;">${ttdNama}</p>
          ${ttdNip ? `<p style="margin: 2px 0 0 0; font-size: 10pt;">NIP. ${ttdNip}</p>` : ''}
        </div>
        <div class="clear"></div>
      </div>
    </body>
    </html>
  `;

  const blob = new Blob(['\ufeff', htmlContent], {
    type: 'application/msword;charset=utf-8',
  });
  const cleanFilename = filename.endsWith('.doc') ? filename : `${filename}.doc`;
  downloadBlob(blob, cleanFilename);
}

/**
 * 4. EKSPOR PDF / CETAK CEPAT (Native Browser Print to PDF)
 */
export function exportToPdfPrint(docTitle: string) {
  const originalTitle = document.title;
  document.title = docTitle;
  window.print();
  const cleanup = () => {
    document.title = originalTitle;
    window.removeEventListener('afterprint', cleanup);
  };
  window.addEventListener('afterprint', cleanup);
  setTimeout(cleanup, 1500);
}
