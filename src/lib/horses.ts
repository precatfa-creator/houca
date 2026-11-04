/**
 * Pure horse-catalog and auction logic: row types matching the Supabase
 * schema, reserve status, age, price formatting, and Excel-import parsing.
 * Free of React, Supabase, and browser APIs so it runs under `node --test`.
 */

export type Gender = 'male' | 'female';

/** A row of `public.horses` (see supabase/migrations). */
export interface Horse {
  id: string;
  /** Catalogue lot number; text so values like "12A" are allowed. Unique. */
  lot: string;
  name: string;
  color: string;
  /** ISO `YYYY-MM-DD`, or `null` when unknown. */
  birth_date: string | null;
  gender: Gender;
  /** Highest bid in Libyan dinars, `null` before the first bid. */
  current_price: number | null;
  /** When the sale was confirmed; `null` while unsold. */
  sold_at: string | null;
  /** Path inside the `horse-photos` storage bucket. */
  image_path: string | null;
}

/** Fields an operator enters for a horse (manually or via Excel). */
export interface HorseInput {
  lot: string;
  name: string;
  color: string;
  birth_date: string | null;
  gender: Gender;
  /** Reserve price, or `null` when the horse has no reserve. */
  reserve: number | null;
}

/** Libyan dinar symbol shown next to every price. */
export const CURRENCY = 'د.ل';

/** Quick-bid increments offered on the control panel, in dinars. */
export const BID_INCREMENTS = [1000, 5000, 10000] as const;

export const GENDER_LABELS: Record<Gender, string> = { male: 'ذكر', female: 'أنثى' };

// Fixed locale so every screen and device renders identical digits and
// separators regardless of its language settings.
const priceFormatter = new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 });

/**
 * Formats a price for display, without the currency symbol.
 * @example formatPrice(12500.5) // "12,500.5"
 */
export function formatPrice(price: number): string {
  return priceFormatter.format(price);
}

/**
 * Where the current price stands against the reserve:
 * - `none`  — the horse has no reserve
 * - `below` — reserve set and not reached (including no bids yet)
 * - `met`   — current price is at or above the reserve
 */
export type ReserveStatus = 'none' | 'below' | 'met';

export function reserveStatus(currentPrice: number | null, reserve: number | null): ReserveStatus {
  if (reserve === null) return 'none';
  return currentPrice !== null && currentPrice >= reserve ? 'met' : 'below';
}

/** Sorts by lot number with numeric awareness ("2" before "10", "12" before "12A"). */
export function compareLots(a: Pick<Horse, 'lot'>, b: Pick<Horse, 'lot'>): number {
  return a.lot.localeCompare(b.lot, 'en', { numeric: true });
}

/**
 * Whole years between an ISO birth date and `today` (both `YYYY-MM-DD`).
 * The birthday itself counts as completing the year.
 */
export function ageInYears(birthDate: string, today: string): number {
  const [by, bm, bd] = birthDate.split('-').map(Number);
  const [ty, tm, td] = today.split('-').map(Number);
  const hadBirthdayThisYear = tm > bm || (tm === bm && td >= bd);
  return ty - by - (hadBirthdayThisYear ? 0 : 1);
}

/** Arabic age label with correct singular/dual/plural forms. */
export function formatAge(years: number): string {
  if (years < 1) return 'أقل من سنة';
  if (years === 1) return 'سنة واحدة';
  if (years === 2) return 'سنتان';
  if (years <= 10) return `${years} سنوات`;
  return `${years} سنة`;
}

/** Short Arabic details line, e.g. "رمادي · ذكر · 5 سنوات". */
export function describeHorse(horse: Pick<Horse, 'color' | 'gender' | 'birth_date'>, today: string): string {
  const parts = [horse.color, GENDER_LABELS[horse.gender]];
  if (horse.birth_date) parts.push(formatAge(ageInYears(horse.birth_date, today)));
  return parts.filter(Boolean).join(' · ');
}

/** Today's date as ISO `YYYY-MM-DD` in the device's local time zone. */
export function localToday(now = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

// ------------------------------------------------------------ Excel import

/** Column headers of the import template, in order. Matched exactly. */
export const IMPORT_COLUMNS = [
  'Horse Name',
  'LOT Number',
  'Color',
  'Date of Birth',
  'Gender',
  'Reserved',
  'Reserve Amount',
] as const;

type ImportColumn = (typeof IMPORT_COLUMNS)[number];

/** One spreadsheet row keyed by header; cell values as SheetJS returns them raw. */
export type ImportRow = Partial<Record<ImportColumn, unknown>>;

/** A problem found in one spreadsheet row. `row` is the 1-based sheet row. */
export interface ImportError {
  row: number;
  message: string;
}

export interface ImportResult {
  horses: HorseInput[];
  errors: ImportError[];
}

// Excel serial day 0 is 1899-12-30 (which absorbs Lotus's fake 1900-02-29).
const EXCEL_EPOCH_MS = Date.UTC(1899, 11, 30);
const DAY_MS = 86_400_000;

/**
 * Converts an Excel date cell to ISO `YYYY-MM-DD`.
 *
 * Accepts a date serial number (computed in UTC, so the result never shifts
 * a day in time zones ahead of UTC such as Libya), `YYYY-MM-DD`, or
 * `DD/MM/YYYY` text. Returns `undefined` for anything unrecognised.
 */
export function parseExcelDate(value: unknown): string | undefined {
  if (typeof value === 'number' && Number.isFinite(value) && value > 0) {
    return new Date(EXCEL_EPOCH_MS + Math.floor(value) * DAY_MS).toISOString().slice(0, 10);
  }
  if (typeof value !== 'string') return undefined;
  const text = value.trim();
  const iso = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(text);
  const dmy = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(text);
  const [year, month, day] = iso ? [iso[1], iso[2], iso[3]] : dmy ? [dmy[3], dmy[2], dmy[1]] : [];
  if (!year) return undefined;
  const date = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
  // Reject roll-overs such as 31/02/2020 becoming 2020-03-02.
  if (date.getUTCMonth() !== Number(month) - 1 || date.getUTCDate() !== Number(day)) return undefined;
  return date.toISOString().slice(0, 10);
}

const GENDER_ALIASES: Record<string, Gender> = {
  male: 'male', m: 'male', 'ذكر': 'male',
  female: 'female', f: 'female', 'أنثى': 'female', 'انثى': 'female',
};
const YES = new Set(['yes', 'y', 'true', '1', 'نعم']);
const NO = new Set(['no', 'n', 'false', '0', 'لا', '']);

function cellText(value: unknown): string {
  return value === undefined || value === null ? '' : String(value).trim();
}

function parseYesNo(value: unknown): boolean | undefined {
  if (typeof value === 'boolean') return value;
  const text = cellText(value).toLowerCase();
  if (YES.has(text)) return true;
  if (NO.has(text)) return false;
  return undefined;
}

function parseAmount(value: unknown): number | undefined {
  const amount = typeof value === 'number' ? value : Number(cellText(value).replace(/,/g, ''));
  return Number.isFinite(amount) && amount > 0 ? amount : undefined;
}

/** Returns the template headers missing from a sheet's header row. */
export function missingImportColumns(headers: readonly string[]): ImportColumn[] {
  const present = new Set(headers.map((h) => h.trim()));
  return IMPORT_COLUMNS.filter((column) => !present.has(column));
}

/**
 * Validates one spreadsheet row. Returns the horse or a list of Arabic
 * error messages for that row.
 */
function parseImportRow(row: ImportRow, today: string): HorseInput | string[] {
  const errors: string[] = [];
  const name = cellText(row['Horse Name']);
  const lot = cellText(row['LOT Number']);
  if (!name) errors.push('اسم الحصان مطلوب');
  if (!lot) errors.push('رقم اللوت مطلوب');

  let birthDate: string | null = null;
  if (cellText(row['Date of Birth'])) {
    const parsed = parseExcelDate(row['Date of Birth']);
    if (!parsed) errors.push('تاريخ الميلاد غير صالح (استخدم YYYY-MM-DD أو DD/MM/YYYY)');
    else if (parsed > today) errors.push('تاريخ الميلاد في المستقبل');
    else birthDate = parsed;
  }

  const gender = GENDER_ALIASES[cellText(row.Gender).toLowerCase()];
  if (!gender) errors.push('الجنس يجب أن يكون Male أو Female');

  const reserved = parseYesNo(row.Reserved);
  const amountGiven = cellText(row['Reserve Amount']) !== '';
  const amount = parseAmount(row['Reserve Amount']);
  if (reserved === undefined) errors.push('قيمة Reserved يجب أن تكون Yes أو No');
  else if (reserved && amount === undefined) errors.push('مبلغ الحجز مطلوب ويجب أن يكون رقماً موجباً');
  else if (!reserved && amountGiven) errors.push('تم إدخال مبلغ حجز بينما Reserved = No');

  if (errors.length > 0) return errors;
  return {
    name,
    lot,
    color: cellText(row.Color),
    birth_date: birthDate,
    gender: gender!,
    reserve: reserved ? amount! : null,
  };
}

/**
 * Validates every data row of an import sheet.
 *
 * Fully blank rows are skipped. Lot numbers must be unique within the file
 * and must not already exist in the catalog (`existingLots`). The caller
 * should import nothing unless `errors` is empty, so a bad file never leaves
 * the catalog half-imported.
 *
 * @param rows - Data rows in sheet order; the first is sheet row 2.
 * @param existingLots - Lot numbers already in the catalog.
 * @param today - ISO date used to reject future birth dates.
 */
export function parseImportRows(
  rows: readonly ImportRow[],
  existingLots: ReadonlySet<string>,
  today: string,
): ImportResult {
  const horses: HorseInput[] = [];
  const errors: ImportError[] = [];
  const lotsInFile = new Set<string>();

  rows.forEach((row, index) => {
    const sheetRow = index + 2;
    if (IMPORT_COLUMNS.every((column) => cellText(row[column]) === '')) return;

    const parsed = parseImportRow(row, today);
    if (Array.isArray(parsed)) {
      parsed.forEach((message) => errors.push({ row: sheetRow, message }));
      return;
    }
    if (existingLots.has(parsed.lot)) {
      errors.push({ row: sheetRow, message: `رقم اللوت ${parsed.lot} موجود مسبقاً` });
    } else if (lotsInFile.has(parsed.lot)) {
      errors.push({ row: sheetRow, message: `رقم اللوت ${parsed.lot} مكرر في الملف` });
    } else {
      lotsInFile.add(parsed.lot);
      horses.push(parsed);
    }
  });

  return { horses, errors };
}
