import { useState, type FormEvent } from 'react';
import { Check, Square, Undo2 } from 'lucide-react';
import { toast } from 'sonner';
import { placeBid, raiseBid, reopenHorse, sellHorse, stopAuction } from '../lib/api';
import { BID_INCREMENTS, CURRENCY, describeHorse, formatPrice, localToday, reserveStatus, type Horse } from '../lib/horses';
import { useAction } from '../hooks/useAction';
import { ConfirmButton } from './ConfirmButton';
import { HorsePhoto } from './HorsePhoto';

interface LiveAuctionPanelProps {
  /** Horse on the block, or `null` when none is. */
  horse: Horse | null;
  reserve: number | null;
}

/**
 * Operator controls for the horse on the block: quick increments
 * (+1k/+5k/+10k), a typed new total, sell (with an explicit second click
 * when below reserve), stop, and undo-sale. Every action goes through the
 * server functions, so several operators can share the panel safely.
 */
export function LiveAuctionPanel({ horse, reserve }: LiveAuctionPanelProps) {
  if (!horse) {
    return (
      <p className="text-center text-gray-600 py-10 leading-relaxed">
        اختر حصاناً من القائمة لبدء المزاد عليه.
      </p>
    );
  }
  // Keyed so the typed-price field resets when the horse changes.
  return <ActiveHorseControls key={horse.id} horse={horse} reserve={reserve} />;
}

function ActiveHorseControls({ horse, reserve }: { horse: Horse; reserve: number | null }) {
  const [price, setPrice] = useState('');
  const { busy, run } = useAction();
  const status = reserveStatus(horse.current_price, reserve);
  const isSold = horse.sold_at !== null;

  const handleManualBid = async (event: FormEvent) => {
    event.preventDefault();
    const amount = Number(price);
    if (!Number.isFinite(amount) || amount <= 0) {
      toast.error('الرجاء إدخال سعر صحيح');
      return;
    }
    if (horse.current_price !== null && amount <= horse.current_price) {
      toast.error('يجب أن يكون السعر أعلى من المزايدة الحالية');
      return;
    }
    if (await run(() => placeBid(horse.id, amount))) setPrice('');
  };

  const sell = () => run(() => sellHorse(horse.id), 'تم إعلان البيع!');

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-4">
        <HorsePhoto path={horse.image_path} alt={horse.name} className="w-20 h-20 rounded-xl shrink-0" />
        <div className="min-w-0">
          <div className="text-sm text-gray-500">لوت {horse.lot}</div>
          <h2 className="text-2xl font-bold font-serif truncate">{horse.name}</h2>
          <div className="text-sm text-gray-500">{describeHorse(horse, localToday())}</div>
        </div>
      </div>

      <div className={`rounded-xl p-4 text-center border ${status === 'below' ? 'bg-red-50 border-red-200' : status === 'met' ? 'bg-green-50 border-green-200' : 'bg-amber-50 border-amber-200'}`}>
        <div className="text-sm font-bold text-gray-600">{isSold ? 'بيع بمبلغ' : 'المزايدة الحالية'}</div>
        <div className={`text-4xl font-bold my-1 ${status === 'below' ? 'text-red-600' : status === 'met' ? 'text-green-600' : 'text-gray-900'}`}>
          {horse.current_price !== null ? `${formatPrice(horse.current_price)} ${CURRENCY}` : 'لا توجد مزايدة'}
        </div>
        {reserve !== null && (
          <div className="text-sm font-bold">
            الحد الأدنى {formatPrice(reserve)} {CURRENCY} — {status === 'met' ? 'تم بلوغه ✓' : 'لم يُبلغ بعد'}
          </div>
        )}
      </div>

      {isSold ? (
        <SoldActions busy={busy}
          onReopen={() => run(() => reopenHorse(horse.id), 'تم التراجع عن البيع وإعادة فتح المزاد')}
          onFinish={() => run(stopAuction)} />
      ) : (
        <>
          <div className="grid grid-cols-3 gap-2">
            {BID_INCREMENTS.map((increment) => (
              <button key={increment} type="button" disabled={busy} onClick={() => run(() => raiseBid(horse.id, increment))}
                className="py-4 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 text-white font-bold text-xl shadow hover:from-amber-600 hover:to-amber-700 disabled:opacity-50">
                +{formatPrice(increment / 1000)}k
              </button>
            ))}
          </div>

          <form onSubmit={handleManualBid} className="flex gap-2">
            <label htmlFor="manual-price" className="sr-only">سعر المزايدة الجديد ({CURRENCY})</label>
            <input id="manual-price" type="number" step="any" inputMode="decimal" placeholder={`سعر جديد (${CURRENCY})`}
              value={price} onChange={(e) => setPrice(e.target.value)}
              className="flex-1 min-w-0 px-4 py-3 text-lg rounded-xl border border-gray-200 focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20 outline-none font-bold" />
            <button type="submit" disabled={busy} className="px-5 rounded-xl bg-gray-900 text-amber-400 font-bold disabled:opacity-50">
              مزايدة
            </button>
          </form>

          <div className="grid grid-cols-[1fr_auto] gap-2 pt-3 border-t border-gray-200">
            {status === 'below' ? (
              <ConfirmButton onConfirm={sell} disabled={busy || horse.current_price === null}
                confirmLabel="السعر أقل من الحد الأدنى — اضغط مجدداً للبيع"
                className="py-4 rounded-xl bg-green-600 text-white font-bold text-lg flex justify-center items-center gap-2 hover:bg-green-700 disabled:opacity-50"
                armedClassName="py-4 rounded-xl bg-red-600 text-white font-bold text-sm animate-pulse">
                <Check size={22} aria-hidden /> اعتماد البيع
              </ConfirmButton>
            ) : (
              <button type="button" onClick={sell} disabled={busy || horse.current_price === null}
                className="py-4 rounded-xl bg-green-600 text-white font-bold text-lg flex justify-center items-center gap-2 hover:bg-green-700 disabled:opacity-50">
                <Check size={22} aria-hidden /> اعتماد البيع
              </button>
            )}
            <button type="button" onClick={() => run(stopAuction, 'تم إيقاف العرض')} disabled={busy} title="إيقاف العرض بدون بيع (تبقى المزايدات محفوظة)"
              className="px-4 rounded-xl border border-gray-300 text-gray-700 font-bold flex items-center gap-1 hover:bg-gray-50 disabled:opacity-50">
              <Square size={16} aria-hidden /> إيقاف
            </button>
          </div>
        </>
      )}
    </div>
  );
}

function SoldActions({ busy, onReopen, onFinish }: { busy: boolean; onReopen: () => void; onFinish: () => void }) {
  return (
    <div className="grid grid-cols-2 gap-2">
      <ConfirmButton onConfirm={onReopen} disabled={busy} confirmLabel="اضغط مجدداً للتأكيد"
        className="py-3 rounded-xl border-2 border-amber-500 text-amber-700 font-bold flex justify-center items-center gap-2 hover:bg-amber-50"
        armedClassName="py-3 rounded-xl bg-amber-500 text-white font-bold">
        <Undo2 size={18} aria-hidden /> التراجع عن البيع
      </ConfirmButton>
      <button type="button" onClick={onFinish} disabled={busy}
        className="py-3 rounded-xl bg-gray-900 text-amber-400 font-bold disabled:opacity-50">
        الحصان التالي
      </button>
    </div>
  );
}
