/**
 * Supabase data access for the catalog and live auction. Every function
 * throws an `Error` whose message is user-facing Arabic, ready for a toast.
 */
import type { PostgrestError, SupabaseClient } from '@supabase/supabase-js';
import type { Horse, HorseInput } from './horses';
import { PHOTO_BUCKET, supabase } from './supabase';

/** Returns the configured client; the app shell guarantees it exists. */
function db(): SupabaseClient {
  if (!supabase) throw new Error('لم يتم إعداد الاتصال بقاعدة البيانات');
  return supabase;
}

// Codes raised by the SQL functions in supabase/migrations.
const ERROR_MESSAGES: Record<string, string> = {
  horse_not_live: 'الحصان ليس في المزاد حالياً',
  horse_not_available: 'الحصان غير متاح للمزاد (ربما تم بيعه)',
  horse_not_sold: 'الحصان غير مباع',
  horse_not_found: 'الحصان غير موجود',
  bid_too_low: 'يجب أن يكون السعر أعلى من المزايدة الحالية',
  invalid_amount: 'الرجاء إدخال مبلغ صحيح',
};
const UNIQUE_VIOLATION = '23505';

/** Maps a PostgREST error to an `Error` with an Arabic, user-facing message. */
function toUserError(error: PostgrestError): Error {
  if (error.code === UNIQUE_VIOLATION) return new Error('رقم اللوت مستخدم لحصان آخر');
  return new Error(ERROR_MESSAGES[error.message] ?? `خطأ في الخادم: ${error.message}`);
}

/** Calls a SQL function and returns its result, throwing a user-facing error. */
async function rpc<T>(fn: string, args?: Record<string, unknown>): Promise<T> {
  const { data, error } = await db().rpc(fn, args);
  if (error) throw toUserError(error);
  return data as T;
}

// ------------------------------------------------------------------ reads

/** Snapshot of everything a screen needs. `reserves` is empty for the public board. */
export interface AuctionSnapshot {
  horses: Horse[];
  /** Reserve amount by horse id (staff only; RLS hides it from anon). */
  reserves: Map<string, number>;
  activeHorseId: string | null;
}

/** Loads the catalog and live-auction pointer; reserves only when `withReserves`. */
export async function fetchSnapshot(withReserves: boolean): Promise<AuctionSnapshot> {
  const client = db();
  const [horses, state, reserves] = await Promise.all([
    client.from('horses').select('*'),
    client.from('auction_state').select('active_horse_id').eq('id', 1).single(),
    withReserves ? client.from('horse_reserves').select('horse_id, amount') : null,
  ]);
  const error = horses.error ?? state.error ?? reserves?.error;
  if (error) throw toUserError(error);
  return {
    horses: (horses.data as Horse[]).map(normalizeNumbers),
    reserves: new Map((reserves?.data ?? []).map((r) => [r.horse_id as string, Number(r.amount)])),
    activeHorseId: state.data?.active_horse_id ?? null,
  };
}

// PostgREST returns `numeric` columns as numbers, but large values may come
// back as strings; normalise so price comparisons are numeric.
function normalizeNumbers(horse: Horse): Horse {
  return { ...horse, current_price: horse.current_price === null ? null : Number(horse.current_price) };
}

/** Public URL of a stored horse photo. */
export function photoUrl(path: string): string {
  return db().storage.from(PHOTO_BUCKET).getPublicUrl(path).data.publicUrl;
}

// ---------------------------------------------------------------- catalog

/**
 * Creates (no `id`) or updates a horse together with its reserve, atomically.
 * @returns The horse id.
 */
export function saveHorse(input: HorseInput, id?: string): Promise<string> {
  return rpc<string>('save_horse', { p_horse: { ...input, id } });
}

/** Imports many horses all-or-nothing. @returns The number imported. */
export function importHorses(inputs: HorseInput[]): Promise<number> {
  return rpc<number>('import_horses', { p_rows: inputs });
}

/**
 * Uploads a photo for a horse and points the horse at it, then removes the
 * previous photo. A unique path per upload avoids stale CDN caches.
 */
export async function replacePhoto(horse: Pick<Horse, 'id' | 'image_path'>, file: File): Promise<void> {
  const extension = file.name.split('.').pop()?.toLowerCase() || 'jpg';
  const path = `${horse.id}/${crypto.randomUUID()}.${extension}`;
  const storage = db().storage.from(PHOTO_BUCKET);

  const upload = await storage.upload(path, file, { contentType: file.type });
  if (upload.error) throw new Error(`فشل رفع الصورة: ${upload.error.message}`);

  const { error } = await db().from('horses').update({ image_path: path }).eq('id', horse.id);
  if (error) {
    await removePhoto(path);
    throw toUserError(error);
  }
  // Old photo is orphaned now; a failed cleanup only wastes storage.
  if (horse.image_path) await removePhoto(horse.image_path);
}

/**
 * Deletes a stored photo. Storage reports "nothing deleted" (e.g. when RLS
 * hides the file) as success with an empty list, so check the list too.
 * Failures only leave an orphaned file, so they are logged, not thrown.
 */
async function removePhoto(path: string): Promise<void> {
  const { data, error } = await db().storage.from(PHOTO_BUCKET).remove([path]);
  if (error || data?.length === 0) console.warn('Horse photo was not deleted', path, error);
}

/** Deletes a horse (its reserve cascades) and its photo. */
export async function deleteHorse(horse: Pick<Horse, 'id' | 'image_path'>): Promise<void> {
  const { error } = await db().from('horses').delete().eq('id', horse.id);
  if (error) throw toUserError(error);
  if (horse.image_path) await removePhoto(horse.image_path);
}

// ------------------------------------------------------------ live auction

/** Puts an unsold horse on the block. */
export const startAuction = (horseId: string) => rpc<void>('start_auction', { p_horse_id: horseId });

/** Takes the current horse off the block without selling (bids are kept). */
export const stopAuction = () => rpc<void>('stop_auction');

/** Adds a fixed increment to the live horse's price. @returns The new price. */
export const raiseBid = (horseId: string, increment: number) =>
  rpc<number>('raise_bid', { p_horse_id: horseId, p_increment: increment });

/** Sets an explicit new price that must beat the current one. @returns The new price. */
export const placeBid = (horseId: string, amount: number) =>
  rpc<number>('place_bid', { p_horse_id: horseId, p_amount: amount });

/** Confirms the sale of the live horse (allowed below reserve by design). */
export const sellHorse = (horseId: string) => rpc<void>('sell_horse', { p_horse_id: horseId });

/** Undoes a sale and reopens bidding at the last price. */
export const reopenHorse = (horseId: string) => rpc<void>('reopen_horse', { p_horse_id: horseId });

// ------------------------------------------------------------------- auth

/** Signs a staff member in with email and password. */
export async function signIn(email: string, password: string): Promise<void> {
  const { error } = await db().auth.signInWithPassword({ email, password });
  if (error) throw new Error('البريد الإلكتروني أو كلمة المرور غير صحيحة');
}

/** Whether the signed-in user is on the staff allowlist (`public.staff`). */
export const isStaff = () => rpc<boolean>('is_staff');

/** Signs the current staff member out on this device. */
export async function signOut(): Promise<void> {
  await db().auth.signOut();
}
