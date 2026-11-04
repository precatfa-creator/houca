/**
 * Excel template download and sheet reading. SheetJS (~400 KB) is loaded
 * on demand so the public board never downloads it.
 */
import { IMPORT_COLUMNS, type ImportRow } from './horses';

const TEMPLATE_FILE = 'horses-import-template.xlsx';

const INSTRUCTIONS = [
  ['Column', 'Required', 'Allowed values'],
  ['Horse Name', 'Yes', 'Text'],
  ['LOT Number', 'Yes', 'Unique lot number, e.g. 12 or 12A'],
  ['Color', 'No', 'Text'],
  ['Date of Birth', 'No', 'Excel date, YYYY-MM-DD, or DD/MM/YYYY'],
  ['Gender', 'Yes', 'Male / Female (ذكر / أنثى)'],
  ['Reserved', 'Yes', 'Yes / No'],
  ['Reserve Amount', 'If Reserved = Yes', 'Positive number in LYD, e.g. 50000'],
];

/** Downloads an empty import template: headers only, plus an instructions sheet. */
export async function downloadImportTemplate(): Promise<void> {
  const XLSX = await import('xlsx');
  const horses = XLSX.utils.aoa_to_sheet([[...IMPORT_COLUMNS]]);
  horses['!cols'] = IMPORT_COLUMNS.map(() => ({ wch: 18 }));
  const instructions = XLSX.utils.aoa_to_sheet(INSTRUCTIONS);
  instructions['!cols'] = [{ wch: 18 }, { wch: 20 }, { wch: 45 }];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, horses, 'Horses');
  XLSX.utils.book_append_sheet(workbook, instructions, 'Instructions');
  XLSX.writeFile(workbook, TEMPLATE_FILE);
}

/** Header row and data rows of the first sheet in a workbook. */
export interface ImportSheet {
  headers: string[];
  rows: ImportRow[];
}

/**
 * Reads the first sheet of an .xlsx/.xls/.csv file. Cells are returned raw,
 * so date cells arrive as Excel serial numbers (parsed by `parseExcelDate`).
 */
export async function readImportSheet(file: File): Promise<ImportSheet> {
  const XLSX = await import('xlsx');
  const workbook = XLSX.read(await file.arrayBuffer());
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  if (!sheet) return { headers: [], rows: [] };
  const [headerRow = []] = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, raw: true });
  return {
    headers: headerRow.map((cell) => String(cell ?? '')),
    rows: XLSX.utils.sheet_to_json<ImportRow>(sheet, { raw: true, defval: '', blankrows: true }),
  };
}
