import { prisma } from '@/lib/prisma';
import ExcelJS from 'exceljs';

const WORK_TYPE_LABELS = {
  COLD_WORK: 'CW',
  COLD_WORK_BREAKING: 'BC',
  HOT_WORK_SPARK: 'SP',
  HOT_WORK_FLAME: 'HW',
};

const WORK_TYPE_NAMES = {
  COLD_WORK: 'General Work (CW)',
  COLD_WORK_BREAKING: 'Breaking Containment (BC)',
  HOT_WORK_SPARK: 'Critical Work (SP)',
  HOT_WORK_FLAME: 'Hot Work (HW)',
};

const STATUS_LABELS = {
  DRAFT: 'Draft',
  SUBMITTED: 'Submitted',
  PENDING_AA_APPROVAL: 'Pending AA',
  PENDING_SC_APPROVAL: 'Pending SC',
  AA_APPROVED: 'AA Approved',
  FULLY_APPROVED: 'Fully Approved',
  ACTIVE: 'Active',
  REJECTED_BY_AA: 'Rejected by AA',
  REJECTED_BY_SC: 'Rejected by SC',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled',
};

// Time slots: [label, startHour, endHour) — Night handled separately (18-24 + 0-6)
const TIME_SLOTS = [
  { label: '06-09', start: 6, end: 9, night: false },
  { label: '09-12', start: 9, end: 12, night: false },
  { label: '12-15', start: 12, end: 15, night: false },
  { label: '15-18', start: 15, end: 18, night: false },
  { label: 'Night', start: 18, end: 30, night: true }, // 18:00 -> 06:00 next day
];

function parseDocs(relatedDocuments) {
  try {
    return typeof relatedDocuments === 'string'
      ? JSON.parse(relatedDocuments)
      : (relatedDocuments || {});
  } catch {
    return {};
  }
}

function isChecked(docs, ...keys) {
  return keys.some((k) => docs[k]?.checked);
}

function docNumber(docs, ...keys) {
  for (const k of keys) {
    if (docs[k]?.checked && docs[k]?.number) return docs[k].number;
  }
  return '';
}

// Dates (local midnight) on which the permit is active, capped to avoid explosion
function activeDates(startDate, endDate, cap = 62) {
  const dates = [];
  const d = new Date(startDate);
  d.setHours(0, 0, 0, 0);
  const end = new Date(endDate);
  end.setHours(0, 0, 0, 0);
  while (d <= end && dates.length < cap) {
    dates.push(new Date(d));
    d.setDate(d.getDate() + 1);
  }
  return dates;
}

// Which time slots are touched by the permit on the given calendar date
function slotsOnDate(permit, date) {
  const dayStart = new Date(date);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(dayStart);
  dayEnd.setDate(dayEnd.getDate() + 1);

  const winStart = new Date(Math.max(dayStart, new Date(permit.startDate)));
  const winEnd = new Date(Math.min(dayEnd, new Date(permit.endDate)));
  if (winStart >= winEnd) return [];

  const marked = [];
  for (const slot of TIME_SLOTS) {
    let s, e;
    if (slot.night) {
      // night: 18:00 same day -> 06:00 next day
      s = new Date(dayStart); s.setHours(18, 0, 0, 0);
      e = new Date(dayStart); e.setDate(e.getDate() + 1); e.setHours(6, 0, 0, 0);
    } else {
      s = new Date(dayStart); s.setHours(slot.start, 0, 0, 0);
      e = new Date(dayStart); e.setHours(slot.end, 0, 0, 0);
    }
    if (s < winEnd && e > winStart) marked.push(slot.label);
  }
  return marked;
}

function formatSheetName(date) {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${String(date.getDate()).padStart(2, '0')}-${months[date.getMonth()]}-${date.getFullYear()}`;
}

function formatLongDate(date) {
  const months = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
  const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
  return `${days[date.getDay()]}, ${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`;
}

const HEADER_STYLE = {
  font: { bold: true, size: 10 },
  alignment: { horizontal: 'center', vertical: 'middle', wrapText: true },
  border: {
    top: { style: 'thin' }, left: { style: 'thin' },
    bottom: { style: 'thin' }, right: { style: 'thin' },
  },
};

const DATA_STYLE = {
  font: { size: 10 },
  alignment: { vertical: 'top', wrapText: true },
  border: {
    top: { style: 'thin' }, left: { style: 'thin' },
    bottom: { style: 'thin' }, right: { style: 'thin' },
  },
};

function buildSheet(ws, date, permits) {
  const lastCol = 20; // column T

  // Title
  ws.mergeCells(1, 1, 2, lastCol);
  const titleCell = ws.getCell(1, 1);
  titleCell.value = 'PLANNING MEETING FORM';
  titleCell.font = { bold: true, size: 16 };
  titleCell.alignment = { horizontal: 'center', vertical: 'middle' };

  // Date / SC / HSE row
  ws.mergeCells(3, 1, 3, 3);
  ws.getCell(3, 1).value = `DATE: ${formatLongDate(date)}`;
  ws.getCell(3, 1).font = { bold: true, size: 10 };
  ws.mergeCells(3, 4, 3, 6);
  ws.getCell(3, 4).value = 'SC : Site Controller';
  ws.getCell(3, 4).font = { bold: true, size: 10 };
  ws.mergeCells(3, 7, 3, 9);
  ws.getCell(3, 7).value = 'HSE : HSE';
  ws.getCell(3, 7).font = { bold: true, size: 10 };

  // Header rows 4-5
  const mergeHeader = (c1, r1, c2, r2, text) => {
    ws.mergeCells(r1, c1, r2, c2);
    const cell = ws.getCell(r1, c1);
    cell.value = text;
    Object.assign(cell, { font: HEADER_STYLE.font, alignment: HEADER_STYLE.alignment, border: HEADER_STYLE.border });
  };

  mergeHeader(1, 4, 1, 5, 'No.');
  mergeHeader(2, 4, 2, 5, 'Inspeksi JSA');
  mergeHeader(3, 4, 3, 5, 'TASK DESCRIPTION');
  mergeHeader(4, 4, 4, 5, 'WCC');
  mergeHeader(5, 4, 5, 5, 'STEP OF JOB');
  mergeHeader(6, 4, 6, 5, 'LOCATION');
  mergeHeader(7, 4, 7, 5, 'REMARKS');
  mergeHeader(8, 4, 12, 4, 'WCC TYPE & TIME FRAME');
  mergeHeader(13, 4, 13, 5, ''); // spacer M
  mergeHeader(14, 4, 18, 4, 'RELATED DOCUMENTS\n(To be reviewed & approved by SC)');
  mergeHeader(19, 4, 19, 5, ''); // spacer S
  mergeHeader(20, 4, 20, 5, 'SIMOPs?');

  const subHeaders = { 8: '06-09', 9: '09-12', 10: '12-15', 11: '15-18', 12: 'Night', 14: 'WCC', 15: 'L2RA', 16: 'ICC', 17: 'TKI/SOP', 18: 'OTHER' };
  for (const [col, text] of Object.entries(subHeaders)) {
    const cell = ws.getCell(5, parseInt(col));
    cell.value = text;
    Object.assign(cell, { font: HEADER_STYLE.font, alignment: HEADER_STYLE.alignment, border: HEADER_STYLE.border });
  }
  // borders for spacer header cells
  for (const col of [13, 19]) {
    for (const row of [4, 5]) {
      ws.getCell(row, col).border = HEADER_STYLE.border;
    }
  }

  // Column widths
  ws.columns = [
    { width: 5 }, { width: 12 }, { width: 40 }, { width: 16 }, { width: 18 },
    { width: 20 }, { width: 22 }, { width: 7 }, { width: 7 }, { width: 7 },
    { width: 7 }, { width: 7 }, { width: 2 }, { width: 10 }, { width: 12 },
    { width: 10 }, { width: 12 }, { width: 12 }, { width: 2 }, { width: 8 },
  ];

  // Data rows
  let row = 6;
  permits.forEach((permit, idx) => {
    const docs = parseDocs(permit.relatedDocuments);
    const marked = slotsOnDate(permit, date);

    const values = {
      1: idx + 1,
      2: STATUS_LABELS[permit.status] || permit.status,
      3: permit.workDescription,
      4: permit.permitNumber,
      5: WORK_TYPE_NAMES[permit.workType] || permit.workType || '',
      6: `${permit.areaName || 'ORF'} - ${permit.zone || ''}`,
      7: [permit.company, permit.performingAuthority].filter(Boolean).join(' / '),
      13: '',
      14: 'v',
      15: isChecked(docs, 'l2ra', 'ra') ? `v ${docNumber(docs, 'l2ra', 'ra')}`.trim() : '',
      16: isChecked(docs, 'icc') ? `v ${docNumber(docs, 'icc')}`.trim() : '',
      17: isChecked(docs, 'tkiTko') ? `v ${docNumber(docs, 'tkiTko')}`.trim() : '',
      18: isChecked(docs, 'other', 'confineSpace', 'csep') ? `v ${docNumber(docs, 'other', 'confineSpace', 'csep')}`.trim() : '',
      19: '',
      20: '',
    };
    for (const slot of marked) {
      const col = { '06-09': 8, '09-12': 9, '12-15': 10, '15-18': 11, 'Night': 12 }[slot];
      values[col] = 'X';
    }

    for (let col = 1; col <= lastCol; col++) {
      const cell = ws.getCell(row, col);
      cell.value = values[col] ?? '';
      const align = col === 1 || (col >= 8 && col <= 20) ? 'center' : 'left';
      Object.assign(cell, {
        font: DATA_STYLE.font,
        border: DATA_STYLE.border,
        alignment: { ...DATA_STYLE.alignment, horizontal: align },
      });
    }
    ws.getRow(row).height = 30;
    row++;
  });

  // Empty filler rows so the form always has space to write (like the paper form)
  const minDataRows = 8;
  const fillUntil = Math.max(row, 6 + minDataRows);
  for (; row < fillUntil; row++) {
    for (let col = 1; col <= lastCol; col++) {
      const cell = ws.getCell(row, col);
      cell.value = '';
      Object.assign(cell, { font: DATA_STYLE.font, border: DATA_STYLE.border });
    }
    ws.getRow(row).height = 30;
  }

  // Autofilter across the form columns (header row 5) — enables per-area filtering in Excel
  ws.autoFilter = {
    from: { row: 5, column: 1 },
    to: { row: row - 1, column: lastCol },
  };

  // Summary section
  row += 1;
  const summaryTypes = [
    { key: 'HW', match: (p) => p.workType === 'HOT_WORK_FLAME', label: 'Hot Work (HW)' },
    { key: 'CW', match: (p) => p.workType === 'COLD_WORK', label: 'Cold Work (CW)' },
    { key: 'SP', match: (p) => p.workType === 'HOT_WORK_SPARK', label: 'Spark Potential (SP)' },
    { key: 'BC', match: (p) => p.workType === 'COLD_WORK_BREAKING', label: 'Breaking Containment (BC)' },
    { key: 'CSE', match: (p) => isChecked(parseDocs(p.relatedDocuments), 'confineSpace', 'csep'), label: 'Confined Space (CSE)' },
  ];

  const headCell = ws.getCell(row, 3);
  headCell.value = 'Type PTW';
  headCell.font = { bold: true, size: 10 };
  headCell.alignment = { horizontal: 'center' };
  const openCell = ws.getCell(row, 8);
  openCell.value = 'OPEN';
  openCell.font = { bold: true, size: 10 };
  openCell.alignment = { horizontal: 'center' };
  const suspCell = ws.getCell(row, 9);
  suspCell.value = 'SUSPEND';
  suspCell.font = { bold: true, size: 10 };
  suspCell.alignment = { horizontal: 'center' };
  row++;

  let total = 0;
  for (const t of summaryTypes) {
    const count = permits.filter(t.match).length;
    total += t.key === 'CSE' ? 0 : count; // CSE overlaps other types, don't add to total
    ws.getCell(row, 3).value = `${t.key} - ${t.label}`;
    ws.getCell(row, 3).font = { size: 10 };
    ws.getCell(row, 8).value = count;
    ws.getCell(row, 8).font = { size: 10 };
    ws.getCell(row, 8).alignment = { horizontal: 'center' };
    row++;
  }
  ws.getCell(row, 3).value = 'Total';
  ws.getCell(row, 3).font = { bold: true, size: 10 };
  ws.getCell(row, 8).value = total;
  ws.getCell(row, 8).font = { bold: true, size: 10 };
  ws.getCell(row, 8).alignment = { horizontal: 'center' };

  ws.getRow(4).height = 24;
  ws.getRow(5).height = 20;
}

// GET - Export permit planning to Excel (PLANNING MEETING FORM layout)
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    // Hanya PTWC (dan ADMIN) yang boleh export.
    if (!userId || userId === 'undefined') {
      return Response.json({ success: false, message: 'User ID is required' }, { status: 400 });
    }
    const requester = await prisma.user.findUnique({
      where: { id: parseInt(userId) },
      select: { role: true },
    });
    if (!requester || !['PTWC', 'ADMIN'].includes(requester.role)) {
      return Response.json({ success: false, message: 'Hanya PTWC yang boleh export permit.' }, { status: 403 });
    }

    const status = searchParams.get('status');
    const zone = searchParams.get('zone');
    const area = searchParams.get('area') || searchParams.get('areaName');

    const where = {};
    if (userId && userId !== 'undefined') where.userId = parseInt(userId);
    if (status) where.status = status;
    if (zone) where.zone = zone;
    if (area && area !== 'all') where.areaName = area;

    const permits = await prisma.permitPlanning.findMany({
      where: Object.keys(where).length > 0 ? where : undefined,
      include: {
        user: { select: { name: true } },
      },
      orderBy: { startDate: 'asc' },
    });

    // Group permits by calendar date
    const byDate = new Map();
    for (const permit of permits) {
      for (const d of activeDates(permit.startDate, permit.endDate)) {
        const key = formatSheetName(d);
        if (!byDate.has(key)) byDate.set(key, { date: d, permits: [] });
        byDate.get(key).permits.push(permit);
      }
    }

    if (byDate.size === 0) {
      return Response.json({
        success: false,
        message: 'Tidak ada permit untuk di-export dengan filter ini',
      }, { status: 404 });
    }

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'SIKA - Sistem Izin Kerja Selamat';

    const sorted = [...byDate.values()].sort((a, b) => a.date - b.date);
    for (const { date, permits: dayPermits } of sorted) {
      const ws = workbook.addWorksheet(formatSheetName(date));
      buildSheet(ws, date, dayPermits);
    }

    const buffer = await workbook.xlsx.writeBuffer();

    const areaPart = area && area !== 'all' ? `-${area}` : '';
    const filename = `Permit-Planning${areaPart}-${new Date().toISOString().slice(0, 10)}.xlsx`;

    return new Response(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error('Error exporting permit planning:', error);

    return Response.json({
      success: false,
      message: 'Failed to export permit planning',
      error: error.message,
    }, { status: 500 });
  }
}
