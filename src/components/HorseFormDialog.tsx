import { useEffect, useRef, useState, type FormEvent } from 'react';
import { toast } from 'sonner';
import { replacePhoto, saveHorse } from '../lib/api';
import { GENDER_LABELS, localToday, type Gender, type Horse, type HorseInput } from '../lib/horses';
import { useAction } from '../hooks/useAction';
import { HorsePhoto } from './HorsePhoto';

const MAX_PHOTO_BYTES = 5 * 1024 * 1024; // matches the bucket's file_size_limit
const PHOTO_TYPES = 'image/jpeg,image/png,image/webp';

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

const inputClass =
  'w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20 outline-none bg-white';
const labelClass = 'block text-sm font-bold text-gray-800 mb-1.5';

/**
 * Modal form to add or edit a horse: details, optional reserve (amount field
 * appears when "Reserved" is ticked), and photo. Saves horse and reserve
 * atomically, then uploads the photo.
 */
export function HorseFormDialog({ horse, reserve, onClose }: HorseFormDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [fields, setFields] = useState(() => initialFields(horse, reserve));
  const [photo, setPhoto] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
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

  const handlePhoto = (file: File | undefined) => {
    if (file && file.size > MAX_PHOTO_BYTES) {
      toast.error('حجم الصورة يجب ألا يتجاوز 5 ميجابايت');
      return;
    }
    setPhoto(file ?? null);
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
    }, horse ? 'تم حفظ التعديلات' : 'تمت إضافة الحصان');
    if (saved) onClose();
  };

  return (
    <dialog
      ref={dialogRef}
      onClose={onClose}
      className="m-auto w-[min(32rem,calc(100vw-2rem))] rounded-2xl p-0 shadow-2xl backdrop:bg-black/50"
    >
      <form onSubmit={handleSubmit} className="p-6 space-y-4" dir="rtl">
        <h2 className="text-2xl font-bold font-serif">{horse ? 'تعديل بيانات الحصان' : 'إضافة حصان'}</h2>

        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2 sm:col-span-1">
            <label htmlFor="horse-name" className={labelClass}>اسم الحصان *</label>
            <input id="horse-name" required value={fields.name} onChange={(e) => set('name', e.target.value)} className={inputClass} />
          </div>
          <div className="col-span-2 sm:col-span-1">
            <label htmlFor="horse-lot" className={labelClass}>رقم اللوت *</label>
            <input id="horse-lot" required value={fields.lot} onChange={(e) => set('lot', e.target.value)} className={inputClass} />
          </div>
          <div className="col-span-2 sm:col-span-1">
            <label htmlFor="horse-color" className={labelClass}>اللون</label>
            <input id="horse-color" value={fields.color} onChange={(e) => set('color', e.target.value)} className={inputClass} />
          </div>
          <div className="col-span-2 sm:col-span-1">
            <label htmlFor="horse-birth" className={labelClass}>تاريخ الميلاد</label>
            <input id="horse-birth" type="date" max={localToday()} value={fields.birthDate}
              onChange={(e) => set('birthDate', e.target.value)} className={inputClass} />
          </div>
        </div>

        <fieldset>
          <legend className={labelClass}>الجنس *</legend>
          <div className="flex gap-3">
            {(Object.keys(GENDER_LABELS) as Gender[]).map((gender) => (
              <label key={gender} className="flex items-center gap-2 px-4 py-2 rounded-xl border border-gray-200 cursor-pointer has-[:checked]:border-amber-400 has-[:checked]:bg-amber-50">
                <input type="radio" name="gender" value={gender} checked={fields.gender === gender}
                  onChange={() => set('gender', gender)} className="accent-amber-500" />
                {GENDER_LABELS[gender]}
              </label>
            ))}
          </div>
        </fieldset>

        <div className="rounded-xl border border-gray-200 p-4 space-y-3">
          <label className="flex items-center gap-2 font-bold text-gray-800 cursor-pointer">
            <input type="checkbox" checked={fields.reserved} onChange={(e) => set('reserved', e.target.checked)}
              className="w-5 h-5 accent-amber-500" />
            محجوز (حد أدنى للبيع)
          </label>
          {fields.reserved && (
            <div>
              <label htmlFor="horse-reserve" className={labelClass}>مبلغ الحجز (د.ل) *</label>
              <input id="horse-reserve" type="number" min="1" step="any" required value={fields.reserveAmount}
                onChange={(e) => set('reserveAmount', e.target.value)} className={inputClass} />
            </div>
          )}
        </div>

        <div>
          <label htmlFor="horse-photo" className={labelClass}>صورة الحصان</label>
          <div className="flex items-center gap-3">
            {preview
              ? <img src={preview} alt="" className="w-20 h-20 rounded-xl object-cover" />
              : <HorsePhoto path={horse?.image_path ?? null} alt="" className="w-20 h-20 rounded-xl" />}
            <input id="horse-photo" type="file" accept={PHOTO_TYPES} onChange={(e) => handlePhoto(e.target.files?.[0])}
              className="text-sm file:me-3 file:px-4 file:py-2 file:rounded-full file:border-0 file:bg-gray-900 file:text-amber-400 file:font-bold" />
          </div>
        </div>

        <div className="flex gap-3 pt-2">
          <button type="submit" disabled={busy}
            className="flex-1 bg-gray-900 text-amber-400 font-bold py-3 rounded-xl hover:bg-gray-800 disabled:opacity-50">
            {busy ? 'جارٍ الحفظ...' : 'حفظ'}
          </button>
          <button type="button" onClick={onClose} disabled={busy}
            className="px-6 py-3 rounded-xl border border-gray-200 font-bold hover:bg-gray-50">
            إلغاء
          </button>
        </div>
      </form>
    </dialog>
  );
}
