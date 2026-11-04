import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

/**
 * Shared Supabase client, or `null` when `VITE_SUPABASE_URL` /
 * `VITE_SUPABASE_ANON_KEY` are missing (the app then shows a setup screen
 * instead of crashing). See `.env.example`.
 */
export const supabase = url && anonKey ? createClient(url, anonKey) : null;

/** Storage bucket holding horse photos (public read, staff write). */
export const PHOTO_BUCKET = 'horse-photos';
