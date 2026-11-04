import { useState, type FormEvent } from 'react';
import { Check } from 'lucide-react';
import { toast } from 'sonner';
import { useAuction } from '../hooks/useAuction';
import { CURRENCY, formatPrice, type AuctionState } from '../lib/auction';

/**
 * Operator control panel (`/`).
 *
 * With no running auction it shows a form to put a horse on the block; while
 * bidding is open it shows the current price, a bid form, and buttons to
 * confirm the sale or cancel. Changes appear on the public board (`/list`) in
 * other tabs of the same browser.
 */
export default function RegisterPage() {
  const { auctionState, introduceHorse, placeBid, sellHorse, clearAuction } = useAuction();
  const isBiddingActive = auctionState !== null && !auctionState.isSold;

  const handleCancel = () => {
    clearAuction();
    toast.success('تم إنهاء عرض الخيل الحالي');
  };

  return (
    <div className="max-w-md mx-auto w-full backdrop-blur-md bg-white/80 p-8 rounded-2xl shadow-xl border border-white/50 relative overflow-hidden mt-10">
      <div className="absolute top-0 start-0 w-full h-1 bg-gradient-to-r from-amber-200 via-amber-400 to-amber-600"></div>

      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold bg-gradient-to-br from-gray-900 to-gray-600 bg-clip-text text-transparent font-serif">لوحة التحكم</h1>
        {isBiddingActive && (
          <button
            type="button"
            onClick={handleCancel}
            className="text-sm text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100 px-4 py-2 rounded-full font-bold transition-colors"
          >
            إلغاء العرض
          </button>
        )}
      </div>

      {isBiddingActive ? (
        <BiddingPanel auction={auctionState} onBid={placeBid} onSell={sellHorse} />
      ) : (
        <IntroduceHorseForm onIntroduce={introduceHorse} />
      )}
    </div>
  );
}

/** Form that puts a new horse on the block. */
function IntroduceHorseForm({ onIntroduce }: { onIntroduce: (horseName: string) => void }) {
  const [name, setName] = useState('');

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    const horseName = name.trim();
    if (!horseName) {
      toast.error('اسم الحصان مطلوب');
      return;
    }
    onIntroduce(horseName);
    toast.success('تم عرض الحصان في المزاد');
  };

  return (
    <>
      <p className="text-gray-600 mb-8 border-s-4 border-amber-400 ps-4 py-1 text-sm bg-amber-50/50 rounded-e-md leading-relaxed">
        أدخل اسم الخيل للبدء في عرضه على لوحة المزاد أمام الجمهور.
      </p>
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label htmlFor="name" className="block text-base font-bold text-gray-800 tracking-wider mb-2">اسم الحصان</label>
          <input
            id="name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-5 py-4 text-lg rounded-xl border border-gray-200 focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20 transition-all outline-none bg-white/80 shadow-inner"
          />
        </div>

        <button
          type="submit"
          className="w-full bg-gradient-to-r from-gray-900 to-gray-800 text-amber-400 hover:from-gray-800 hover:to-gray-700 font-bold py-5 rounded-xl shadow-lg transition-all transform hover:-translate-y-0.5 active:translate-y-0 tracking-widest text-xl mt-4"
        >
          عرض في المزاد
        </button>
      </form>
    </>
  );
}

interface BiddingPanelProps {
  /** The running (unsold) auction. */
  auction: AuctionState;
  /** Called with a validated bid higher than the current price. */
  onBid: (price: number) => void;
  /** Called when the operator confirms the sale. */
  onSell: () => void;
}

/** Current price, bid entry, and sale confirmation for the running auction. */
function BiddingPanel({ auction, onBid, onSell }: BiddingPanelProps) {
  const [price, setPrice] = useState('');

  const handleBid = (event: FormEvent) => {
    event.preventDefault();
    const bid = Number(price);
    if (!Number.isFinite(bid) || bid <= 0) {
      toast.error('الرجاء إدخال سعر صحيح');
      return;
    }
    if (auction.currentPrice !== null && bid <= auction.currentPrice) {
      toast.error('يجب أن يكون السعر أعلى من المزايدة الحالية');
      return;
    }
    onBid(bid);
    toast.success(`تمت المزايدة بمبلغ ${formatPrice(bid)} ${CURRENCY}`);
    setPrice('');
  };

  const handleSell = () => {
    onSell();
    toast.success('تم إعلان البيع!');
  };

  return (
    <>
      <div className="mb-6 p-4 bg-amber-50 rounded-xl border border-amber-200 flex flex-col items-center">
        <p className="text-base text-gray-700 font-bold mb-2">المزايدة الحالية على:</p>
        <h2 className="text-2xl font-serif font-bold text-gray-900 mb-4">{auction.horseName}</h2>
        {auction.currentPrice !== null ? (
          <p className="text-3xl font-bold text-amber-600 drop-shadow-sm">{formatPrice(auction.currentPrice)} {CURRENCY}</p>
        ) : (
          <p className="text-lg font-bold text-gray-500">في انتظار أول مزايدة...</p>
        )}
      </div>

      <form onSubmit={handleBid} className="space-y-4">
        <div>
          <label htmlFor="price" className="block text-base font-bold text-gray-800 tracking-wider mb-2">تسجيل سعر المزايدة ({CURRENCY})</label>
          <div className="relative">
            <div className="absolute inset-y-0 start-0 ps-4 flex items-center pointer-events-none">
              <span className="text-gray-400 font-bold text-lg">{CURRENCY}</span>
            </div>
            <input
              id="price"
              type="number"
              step="0.01"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              className="w-full ps-14 pe-4 py-4 text-xl rounded-xl border border-gray-200 focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20 transition-all outline-none bg-white/80 shadow-inner font-bold text-amber-900"
            />
          </div>
        </div>

        <button
          type="submit"
          className="w-full bg-gradient-to-r from-amber-500 to-amber-600 text-white hover:from-amber-600 hover:to-amber-700 font-bold py-4 rounded-xl shadow-lg transition-all transform hover:-translate-y-0.5 active:translate-y-0 tracking-widest text-2xl"
        >
          مـــــزايـــــدة
        </button>
      </form>

      <div className="mt-8 pt-6 border-t border-gray-200">
        <button
          type="button"
          onClick={handleSell}
          className="w-full bg-green-600 text-white hover:bg-green-700 font-bold py-4 rounded-xl shadow-md transition-all transform hover:-translate-y-0.5 active:translate-y-0 tracking-widest text-xl flex justify-center items-center gap-2"
        >
          <Check size={24} strokeWidth={2.5} aria-hidden />
          اعتمــــاد البيـــــع
        </button>
      </div>
    </>
  );
}
