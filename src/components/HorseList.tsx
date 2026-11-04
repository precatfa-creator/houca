import { Pencil, Trash2, Undo2 } from 'lucide-react';
import {
  CURRENCY,
  describeHorse,
  formatPrice,
  localToday,
  reserveStatus,
  type Horse,
  type ReserveStatus,
} from '../lib/horses';
import { ConfirmButton } from './ConfirmButton';
import { HorsePhoto } from './HorsePhoto';

interface HorseListProps {
  /** Horses already sorted for display. */
  horses: Horse[];
  reserves: ReadonlyMap<string, number>;
  activeHorseId: string | null;
  busy: boolean;
  onStart: (horse: Horse) => void;
  onReopen: (horse: Horse) => void;
  onEdit: (horse: Horse) => void;
  onDelete: (horse: Horse) => void;
}

// Bid colour against the reserve: red until it is reached, green at or above.
const PRICE_CLASS: Record<ReserveStatus, string> = {
  none: 'text-gray-900',
  below: 'text-red-600',
  met: 'text-green-600',
};

/**
 * Staff catalog list. Clicking an unsold horse puts it on the block; each
 * row shows its current bid coloured against its reserve, and sold horses
 * offer "undo sale" to reopen bidding at the last price.
 */
export function HorseList({ horses, reserves, activeHorseId, busy, onStart, onReopen, onEdit, onDelete }: HorseListProps) {
  if (horses.length === 0) {
    return <p className="text-center text-gray-500 py-12">لا توجد خيول بعد. أضف حصاناً أو استورد ملف Excel.</p>;
  }

  const today = localToday();
  return (
    <ul className="divide-y divide-gray-100">
      {horses.map((horse) => {
        const reserve = reserves.get(horse.id) ?? null;
        const isLive = horse.id === activeHorseId && !horse.sold_at;
        const isSold = horse.sold_at !== null;
        return (
          <li key={horse.id}
            className={`flex items-center gap-3 p-3 transition-colors ${isLive ? 'bg-amber-50 ring-2 ring-amber-400 rounded-xl' : 'hover:bg-gray-50'}`}>
            <button type="button" disabled={busy || isSold || isLive} onClick={() => onStart(horse)}
              title={isSold ? undefined : 'اضغط لبدء المزاد على هذا الحصان'}
              className="flex flex-1 min-w-0 items-center gap-3 text-start disabled:cursor-default">
              <span className="shrink-0 min-w-12 text-center rounded-lg bg-gray-900 text-amber-400 font-bold px-2 py-1 text-sm">
                {horse.lot}
              </span>
              <HorsePhoto path={horse.image_path} alt={horse.name} className="shrink-0 w-12 h-12 rounded-lg" />
              <span className="min-w-0">
                <span className="block font-bold truncate">{horse.name}</span>
                <span className="block text-xs text-gray-500 truncate">{describeHorse(horse, today)}</span>
              </span>
            </button>

            <div className="shrink-0 text-end">
              <div className={`font-bold ${PRICE_CLASS[reserveStatus(horse.current_price, reserve)]}`}>
                {horse.current_price !== null ? `${formatPrice(horse.current_price)} ${CURRENCY}` : '—'}
              </div>
              <div className="text-xs text-gray-500">
                {reserve !== null && `حجز: ${formatPrice(reserve)}`}
                {isLive && <span className="ms-1 font-bold text-amber-600">● في المزاد</span>}
                {isSold && <span className="ms-1 font-bold text-green-700">مباع</span>}
              </div>
            </div>

            <div className="shrink-0 flex gap-1">
              {isSold && (
                <ConfirmButton onConfirm={() => onReopen(horse)} disabled={busy} title="التراجع عن البيع وإعادة فتح المزاد"
                  confirmLabel="تأكيد؟" className="p-2 rounded-lg text-amber-700 hover:bg-amber-100"
                  armedClassName="px-2 py-1 rounded-lg bg-amber-500 text-white text-xs font-bold">
                  <Undo2 size={18} aria-label="التراجع عن البيع" />
                </ConfirmButton>
              )}
              <button type="button" onClick={() => onEdit(horse)} title="تعديل"
                className="p-2 rounded-lg text-gray-600 hover:bg-gray-100">
                <Pencil size={18} aria-label="تعديل" />
              </button>
              <ConfirmButton onConfirm={() => onDelete(horse)} disabled={busy || isLive} title="حذف"
                confirmLabel="حذف؟" className="p-2 rounded-lg text-red-600 hover:bg-red-50 disabled:opacity-30"
                armedClassName="px-2 py-1 rounded-lg bg-red-600 text-white text-xs font-bold">
                <Trash2 size={18} aria-label="حذف" />
              </ConfirmButton>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
