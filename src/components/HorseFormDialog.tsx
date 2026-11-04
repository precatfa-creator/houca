import { useEffect, useRef, useState, type DragEvent, type FormEvent, type ReactNode } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { CalendarDays, Camera, Hash, ImagePlus, Lock, Mars, Palette, Venus, X } from 'lucide-react';
import { toast } from 'sonner';
import { photoUrl, replacePhoto, saveHorse } from '../lib/api';
import {
  CURRENCY,
  GENDER_LABELS,
  ageInYears,
  formatAge,
  formatPrice,
  localToday,
  type Gender,
  type Horse,
  type HorseInput,
} from '../lib/horses';
import { useAction } from '../hooks/useAction';

const MAX_PHOTO_BYTES = 5 * 1024 * 1024; // matches the bucket's file_size_limit
const PHOTO_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

interface HorseFormDialogProps {
  /** Horse to edit, or `null` to add a new one. */
  horse: Horse | null;
  /** Current reserve of the edited horse, if any. */
  reserve: number | null;
  onClose: () => void;
}

interface FormFields {
  name: string;
  lot: string;
  color: string;
  birthDate: string;
  gender: Gender | '';
  reserved: boolean;
  reserveAmount: string;
}

function initialFields(horse: Horse | null, reserve: number | null): FormFields {
  return {
    name: horse?.name ?? '',
    lot: horse?.lot ?? '',
    color: horse?.color ?? '',
    birthDate: horse?.birth_date ?? '',
    gender: horse?.gender ?? '',
    reserved: reserve !== null,
    reserveAmount: reserve !== null ? String(reserve) : '',
  };
}

/** Returns the validated input, or an Arabic error message. */
function toHorseInput(fields: FormFields): HorseInput | string {
  if (!fields.name.trim()) return 'اسم الحصان مطلوب';
  if (!fields.lot.trim()) return 'رقم اللوت مطلوب';
  if (!fields.gender) return 'اختر جنس الحصان';
  const reserve = Number(fields.reserveAmount);
  if (fields.reserved && !(Number.isFinite(reserve) && reserve > 0)) return 'أدخل مبلغ حجز صحيح';
  return {
    name: fields.name.trim(),
    lot: fields.lot.trim(),
    color: fields.color.trim(),
    birth_date: fields.birthDate || null,
    gender: fields.gender,
    reserve: fields.reserved ? reserve : null,
  };
}

/** Rejects files the storage bucket would refuse; returns an Arabic error or `null`. */
function photoError(file: File): string | null {
  if (!PHOTO_TYPES.includes(file.type)) return 'الصيغ المسموحة: JPG أو PNG أو WEBP';
  if (file.size > MAX_PHOTO_BYTES) return 'حجم الصورة يجب ألا يتجاوز 5 ميجابايت';
  return null;
}

const GENDER_ICONS: Record<Gender, typeof Mars> = { male: Mars, female: Venus };

const inputClass =
  'w-full h-12 px-4 rounded-xl border border-stone-200 bg-white text-gray-900 placeholder:text-stone-400 ' +
  'outline-none transition focus:border-amber-500 focus:ring-4 focus:ring-amber-500/15';

/** Small label row with an icon, used above every field. */
function FieldLabel({ htmlFor, icon, children }: { htmlFor?: string; icon: ReactNode; children: ReactNode }) {
  return (
    <label htmlFor={htmlFor} className="flex items-center gap-1.5 text-[13px] font-bold text-stone-600 mb-1.5">
      <span className="text-amber-600" aria-hidden>{icon}</span>
      {children}
    </label>
  );
}

/**
 * Modal "catalogue card" to add or edit a horse.
 *
 * The start side is a live preview of the catalogue entry (photo drop zone
 * with the lot number badge and name); the other side holds the details,
 * gender, and the reserve switch, whose private amount field slides in when
 * enabled. Horse and reserve are saved atomically, then the photo uploads.
 */
export function HorseFormDialog({ horse, reserve, onClose }: HorseFormDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const photoInput = useRef<HTMLInputElement>(null);
  const [fields, setFields] = useState(() => initialFields(horse, reserve));
  const [photo, setPhoto] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const { busy, run } = useAction();

  useEffect(() => {
    dialogRef.current?.showModal();
  }, []);

  useEffect(() => {
    if (!photo) return setPreview(null);
    const url = URL.createObjectURL(photo);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [photo]);

  const set = <K extends keyof FormFields>(key: K, value: FormFields[K]) =>
    setFields((prev) => ({ ...prev, [key]: value }));

  const choosePhoto = (file: File | undefined) => {
    if (!file) return;
    const error = photoError(file);
    if (error) toast.error(error);
    else setPhoto(file);
  };

  const handleDrop = (event: DragEvent) => {
    event.preventDefault();
    setDragging(false);
    choosePhoto(event.dataTransfer.files[0]);
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const input = toHorseInput(fields);
    if (typeof input === 'string') {
      toast.error(input);
      return;
    }
    const saved = await run(async () => {
      const id = await saveHorse(input, horse?.id);
      if (photo) await replacePhoto({ id, image_path: horse?.image_path ?? null }, photo);
    }, horse ? 'تم حفظ التعديلات' : 'تمت إضافة الحصان إلى الكتالوج');
    if (saved) onClose();
  };

  const shownPhoto = preview ?? (horse?.image_path ? photoUrl(horse.image_path) : null);
  const age = fields.birthDate ? formatAge(ageInYears(fields.birthDate, localToday())) : null;
  const reserveValue = Number(fields.reserveAmount);

  return (
    <dialog
      ref={dialogRef}
      onClose={onClose}
      aria-labelledby="horse-dialog-title"
      className="m-auto w-[min(56rem,calc(100vw-1.5rem))] max-h-[calc(100dvh-1.5rem)] rounded-[1.75rem] p-0 bg-transparent shadow-2xl backdrop:bg-gray-950/60 backdrop:backdrop-blur-sm"
    >
      <motion.form
        onSubmit={handleSubmit}
        dir="rtl"
        initial={{ opacity: 0, y: 24, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: 'spring', stiffness: 260, damping: 26 }}
        className="flex flex-col max-h-[calc(100dvh-1.5rem)] overflow-hidden rounded-[1.75rem] bg-stone-50"
      >
        {/* Header */}
        <header className="relative flex items-center justify-between gap-4 bg-gray-950 px-6 py-5 text-white">
          <div>
            <p className="text-[11px] font-bold tracking-[0.3em] text-amber-400/80">بطاقة الكتالوج</p>
            <h2 id="horse-dialog-title" className="font-serif text-2xl font-bold">
              {horse ? 'تعديل بيانات الحصان' : 'إضافة حصان جديد'}
            </h2>
          </div>
          <button type="button" onClick={onClose} aria-label="إغلاق"
            className="grid size-10 place-items-center rounded-full text-stone-300 transition hover:bg-white/10 hover:text-white focus-visible:ring-2 focus-visible:ring-amber-400 outline-none">
            <X size={20} />
          </button>
          <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-l from-transparent via-amber-400 to-transparent" />
        </header>

        <div className="grid flex-1 grid-cols-1 overflow-y-auto md:grid-cols-[17rem_1fr]">
          {/* Catalogue preview + photo drop zone */}
          <aside className="border-b border-stone-200 bg-white p-5 md:border-b-0 md:border-e">
            <div
              role="button"
              tabIndex={0}
              aria-label={shownPhoto ? 'تغيير صورة الحصان' : 'إضافة صورة للحصان'}
              onClick={() => photoInput.current?.click()}
              onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), photoInput.current?.click())}
              onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={handleDrop}
              className={`group relative aspect-video md:aspect-[4/5] cursor-pointer overflow-hidden rounded-2xl outline-none transition focus-visible:ring-4 focus-visible:ring-amber-500/30 ${
                shownPhoto ? 'bg-gray-900' : `border-2 border-dashed ${dragging ? 'border-amber-500 bg-amber-50' : 'border-stone-300 bg-stone-50 hover:border-amber-400 hover:bg-amber-50/50'}`
              }`}
            >
              {shownPhoto ? (
                <>
                  <img src={shownPhoto} alt="" className="size-full object-cover transition duration-500 group-hover:scale-105" />
                  <div className="absolute inset-0 bg-gradient-to-t from-gray-950/80 via-transparent to-transparent" />
                  <span className="absolute inset-x-0 top-3 mx-auto flex w-fit items-center gap-1.5 rounded-full bg-gray-950/70 px-3 py-1.5 text-xs font-bold text-white opacity-0 backdrop-blur transition group-hover:opacity-100 group-focus-visible:opacity-100">
                    <Camera size={14} aria-hidden /> تغيير الصورة
                  </span>
                </>
              ) : (
                <div className="flex size-full flex-col items-center justify-center gap-2 p-4 text-center text-stone-500">
                  <span className="grid size-14 place-items-center rounded-full bg-white shadow-sm ring-1 ring-stone-200 text-amber-600 transition group-hover:scale-110">
                    <ImagePlus size={26} aria-hidden />
                  </span>
                  <span className="text-sm font-bold text-stone-700">{dragging ? 'أفلت الصورة هنا' : 'اسحب الصورة هنا أو اضغط'}</span>
                  <span className="text-xs">JPG · PNG · WEBP — حتى 5 ميجابايت</span>
                </div>
              )}

              {(fields.lot || fields.name) && shownPhoto && (
                <div className="absolute inset-x-0 bottom-0 p-4 text-white">
                  {fields.lot && (
                    <span className="mb-1 inline-block rounded-full bg-amber-400 px-2.5 py-0.5 text-xs font-black text-gray-950">
                      لوت {fields.lot}
                    </span>
                  )}
                  <p className="truncate font-serif text-xl font-bold drop-shadow">{fields.name}</p>
                </div>
              )}
            </div>
            <input ref={photoInput} type="file" accept={PHOTO_TYPES.join(',')} hidden
              onChange={(e) => { choosePhoto(e.target.files?.[0]); e.target.value = ''; }} />

            {/* Live summary, mirrors what the board will show */}
            <dl className="mt-4 space-y-2 text-sm">
              {[
                ['الجنس', fields.gender ? GENDER_LABELS[fields.gender] : '—'],
                ['العمر', age ?? '—'],
                ['الحجز', fields.reserved && reserveValue > 0 ? `${formatPrice(reserveValue)} ${CURRENCY}` : 'بدون'],
              ].map(([term, value]) => (
                <div key={term} className="flex justify-between border-b border-dashed border-stone-200 pb-2 last:border-0">
                  <dt className="text-stone-500">{term}</dt>
                  <dd className="font-bold text-gray-900">{value}</dd>
                </div>
              ))}
            </dl>
          </aside>

          {/* Details */}
          <div className="space-y-5 p-5 md:p-6">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-[1fr_9rem]">
              <div>
                <FieldLabel htmlFor="horse-name" icon={<span className="font-serif text-base leading-none">ح</span>}>اسم الحصان *</FieldLabel>
                <input id="horse-name" required autoFocus value={fields.name} onChange={(e) => set('name', e.target.value)}
                  placeholder="مثال: ريح الصحراء" className={`${inputClass} font-serif text-lg font-bold`} />
              </div>
              <div>
                <FieldLabel htmlFor="horse-lot" icon={<Hash size={14} />}>رقم اللوت *</FieldLabel>
                <input id="horse-lot" required value={fields.lot} onChange={(e) => set('lot', e.target.value)}
                  placeholder="12" dir="ltr" className={`${inputClass} text-center text-lg font-black tracking-wider`} />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <FieldLabel htmlFor="horse-color" icon={<Palette size={14} />}>اللون</FieldLabel>
                <input id="horse-color" value={fields.color} onChange={(e) => set('color', e.target.value)}
                  placeholder="رمادي، أشقر، أدهم..." className={inputClass} />
              </div>
              <div>
                <FieldLabel htmlFor="horse-birth" icon={<CalendarDays size={14} />}>
                  تاريخ الميلاد
                  {age && <span className="ms-auto rounded-full bg-amber-100 px-2 py-0.5 text-[11px] text-amber-800">{age}</span>}
                </FieldLabel>
                <input id="horse-birth" type="date" max={localToday()} value={fields.birthDate}
                  onChange={(e) => set('birthDate', e.target.value)} className={inputClass} />
              </div>
            </div>

            <fieldset>
              <legend className="mb-1.5 text-[13px] font-bold text-stone-600">الجنس *</legend>
              <div className="grid grid-cols-2 gap-3">
                {(Object.keys(GENDER_LABELS) as Gender[]).map((gender) => {
                  const Icon = GENDER_ICONS[gender];
                  return (
                    <label key={gender}
                      className="flex h-14 cursor-pointer items-center justify-center gap-2 rounded-xl border-2 border-stone-200 bg-white font-bold text-stone-600 transition hover:border-stone-300 has-[:checked]:border-gray-900 has-[:checked]:bg-gray-900 has-[:checked]:text-amber-400 has-[:focus-visible]:ring-4 has-[:focus-visible]:ring-amber-500/20">
                      <input type="radio" name="gender" value={gender} checked={fields.gender === gender}
                        onChange={() => set('gender', gender)} className="sr-only" />
                      <Icon size={20} aria-hidden />
                      {GENDER_LABELS[gender]}
                    </label>
                  );
                })}
              </div>
            </fieldset>

            {/* Reserve */}
            <div className={`rounded-2xl border-2 p-4 transition-colors ${fields.reserved ? 'border-amber-400 bg-amber-50/70' : 'border-stone-200 bg-white'}`}>
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p id="reserve-label" className="font-bold text-gray-900">حصان محجوز</p>
                  <p className="text-xs text-stone-500">لا يُعتمد البيع تلقائياً قبل بلوغ مبلغ الحجز</p>
                </div>
                <button type="button" role="switch" aria-checked={fields.reserved} aria-labelledby="reserve-label"
                  onClick={() => set('reserved', !fields.reserved)}
                  className={`relative h-8 w-14 shrink-0 rounded-full transition-colors outline-none focus-visible:ring-4 focus-visible:ring-amber-500/30 ${fields.reserved ? 'bg-amber-500' : 'bg-stone-300'}`}>
                  <span className={`absolute top-1 size-6 rounded-full bg-white shadow transition-all ${fields.reserved ? 'start-7' : 'start-1'}`} />
                </button>
              </div>

              <AnimatePresence initial={false}>
                {fields.reserved && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <div className="pt-4">
                      <label htmlFor="horse-reserve" className="sr-only">مبلغ الحجز</label>
                      <div className="flex h-14 items-center gap-3 rounded-xl border border-amber-300 bg-white px-4 transition focus-within:border-amber-500 focus-within:ring-4 focus-within:ring-amber-500/15">
                        <input id="horse-reserve" type="number" min="1" step="any" inputMode="decimal" required
                          value={fields.reserveAmount} onChange={(e) => set('reserveAmount', e.target.value)}
                          placeholder="50000" dir="ltr"
                          className="min-w-0 flex-1 bg-transparent text-2xl font-black text-amber-900 outline-none placeholder:text-amber-900/25" />
                        <span className="shrink-0 font-bold text-amber-700">{CURRENCY}</span>
                      </div>
                      <p className="mt-2 flex items-center gap-1.5 text-xs text-amber-800">
                        <Lock size={12} aria-hidden /> مبلغ خاص بالإدارة — لا يظهر للجمهور على لوحة المزاد
                      </p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>

        {/* Footer */}
        <footer className="flex items-center justify-end gap-3 border-t border-stone-200 bg-white px-6 py-4">
          <button type="button" onClick={onClose} disabled={busy}
            className="h-12 rounded-xl px-6 font-bold text-stone-600 transition hover:bg-stone-100 disabled:opacity-50">
            إلغاء
          </button>
          <button type="submit" disabled={busy}
            className="h-12 whitespace-nowrap rounded-xl bg-gray-950 px-8 font-bold text-amber-400 shadow-lg shadow-gray-950/20 transition hover:-translate-y-0.5 hover:bg-gray-800 active:translate-y-0 disabled:translate-y-0 disabled:opacity-50">
            {busy ? 'جارٍ الحفظ...' : horse ? 'حفظ التعديلات' : 'إضافة إلى الكتالوج'}
          </button>
        </footer>
      </motion.form>
    </dialog>
  );
}
