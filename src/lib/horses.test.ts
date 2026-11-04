import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  ageInYears,
  compareLots,
  describeHorse,
  formatAge,
  formatPrice,
  missingImportColumns,
  parseExcelDate,
  parseImportRows,
  reserveStatus,
  type ImportRow,
} from './horses.ts';

test('reserveStatus: none, below (incl. no bids), met at and above reserve', () => {
  assert.equal(reserveStatus(10000, null), 'none');
  assert.equal(reserveStatus(null, 50000), 'below');
  assert.equal(reserveStatus(49999, 50000), 'below');
  assert.equal(reserveStatus(50000, 50000), 'met');
  assert.equal(reserveStatus(60000, 50000), 'met');
});

test('ageInYears counts the birthday itself and not the day before', () => {
  assert.equal(ageInYears('2020-11-04', '2026-11-04'), 6);
  assert.equal(ageInYears('2020-11-05', '2026-11-04'), 5);
  assert.equal(ageInYears('2026-01-01', '2026-11-04'), 0);
});

test('formatAge uses Arabic singular, dual, and plural forms', () => {
  assert.deepEqual([0, 1, 2, 3, 10, 11].map(formatAge),
    ['أقل من سنة', 'سنة واحدة', 'سنتان', '3 سنوات', '10 سنوات', '11 سنة']);
});

test('formatPrice uses fixed grouping regardless of device locale', () => {
  assert.equal(formatPrice(12500.5), '12,500.5');
});

test('compareLots sorts numerically', () => {
  const lots = ['10', '2', '12A', '12', '1'].map((lot) => ({ lot }));
  assert.deepEqual(lots.sort(compareLots).map((h) => h.lot), ['1', '2', '10', '12', '12A']);
});

test('parseExcelDate: serials in UTC, ISO and DD/MM/YYYY text, rejects bad dates', () => {
  assert.equal(parseExcelDate(43831), '2020-01-01');
  assert.equal(parseExcelDate(43831.75), '2020-01-01'); // time part ignored
  assert.equal(parseExcelDate('2019-03-15'), '2019-03-15');
  assert.equal(parseExcelDate('5/3/2019'), '2019-03-05');
  assert.equal(parseExcelDate('31/02/2020'), undefined);
  assert.equal(parseExcelDate('next year'), undefined);
  assert.equal(parseExcelDate(true), undefined);
});

test('missingImportColumns lists absent template headers', () => {
  assert.deepEqual(missingImportColumns(['Horse Name', 'LOT Number', 'Color', 'Date of Birth', 'Gender']),
    ['Reserved', 'Reserve Amount']);
});

const row = (overrides: ImportRow = {}): ImportRow => ({
  'Horse Name': 'ريح', 'LOT Number': 1, Color: 'Grey', 'Date of Birth': '2019-03-15',
  Gender: 'Male', Reserved: 'No', 'Reserve Amount': '', ...overrides,
});

test('parseImportRows accepts valid rows and skips blank ones', () => {
  const blank = Object.fromEntries(Object.keys(row()).map((k) => [k, ''])) as ImportRow;
  const result = parseImportRows(
    [row(), blank, row({ 'LOT Number': '2', Gender: 'أنثى', Reserved: true, 'Reserve Amount': '50,000' })],
    new Set(), '2026-11-04');
  assert.deepEqual(result.errors, []);
  assert.deepEqual(result.horses, [
    { name: 'ريح', lot: '1', color: 'Grey', birth_date: '2019-03-15', gender: 'male', reserve: null },
    { name: 'ريح', lot: '2', color: 'Grey', birth_date: '2019-03-15', gender: 'female', reserve: 50000 },
  ]);
});

test('parseImportRows reports errors by sheet row and duplicate lots', () => {
  const result = parseImportRows([
    row({ 'LOT Number': '7' }),                              // row 2: existing lot
    row({ 'LOT Number': '8' }),                              // row 3: ok
    row({ 'LOT Number': '8' }),                              // row 4: duplicate in file
    row({ 'LOT Number': '9', Reserved: 'Yes' }),             // row 5: reserve without amount
    row({ 'LOT Number': '10', 'Reserve Amount': 5000 }),     // row 6: amount without reserve
    row({ 'LOT Number': '11', Gender: 'x', 'Date of Birth': '2030-01-01' }), // row 7: two errors
  ], new Set(['7']), '2026-11-04');
  assert.deepEqual(result.errors.map((e) => e.row), [2, 4, 5, 6, 7, 7]);
  assert.deepEqual(result.horses.map((h) => h.lot), ['8']);
});

test('describeHorse joins color, gender, and age, skipping blanks', () => {
  assert.equal(describeHorse({ color: 'رمادي', gender: 'male', birth_date: '2020-01-01' }, '2026-11-04'), 'رمادي · ذكر · 6 سنوات');
  assert.equal(describeHorse({ color: '', gender: 'female', birth_date: null }, '2026-11-04'), 'أنثى');
});
