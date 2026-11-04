import { useEffect, useRef, useState, type Ref } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Check } from 'lucide-react';
import { HorsePhoto } from '../components/HorsePhoto';
import { useAuctionData } from '../hooks/useAuctionData';
import { CURRENCY, describeHorse, formatPrice, localToday, type Horse } from '../lib/horses';

/** How long the "sold" celebration stays on screen before the board idles. */
const SOLD_DISPLAY_MS = 4000;

/**
 * Whether to show the "sold" celebration for `horse`.
 *
 * Triggered only when this screen *sees* the horse change from live to sold,
 * and timed with a local timer, so devices with skewed clocks all show it
 * for the same 4 seconds and a board opened after the sale just idles.
 */
function useSoldAnnouncement(horse: Horse | null): boolean {
  const [announcedId, setAnnouncedId] = useState<string | null>(null);
  const previous = useRef<{ id: string; sold: boolean } | null>(null);
  const id = horse?.id ?? null;
  const sold = horse?.sold_at != null;

  useEffect(() => {
    const before = previous.current;
    previous.current = id ? { id, sold } : null;
    if (!id || !sold || before?.id !== id || before.sold) return;
    setAnnouncedId(id);
    const timeout = setTimeout(() => setAnnouncedId(null), SOLD_DISPLAY_MS);
    return () => clearTimeout(timeout);
  }, [id, sold]);

  return sold && announcedId === id;
}

/**
 * Public auction board (`/list`), meant for a projector or TV facing the
 * audience. Read-only and sign-in free: it mirrors the control panel on any
 * device through Supabase Realtime, animating between the waiting,
 * live-bidding, and sold screens. Reserve amounts are never loaded here.
 */
export default function ListPage() {
  const { horses, activeHorseId } = useAuctionData(false);
  const activeHorse = horses.find((h) => h.id === activeHorseId) ?? null;
  const showSold = useSoldAnnouncement(activeHorse);

  return (
    // overflow-x-clip: the spring scale-in/out animations briefly overshoot the
    // viewport on phones and would otherwise flash a horizontal scrollbar.
    <div className="flex flex-col items-center justify-center min-h-[calc(100dvh-6rem)] md:min-h-[calc(100dvh-8rem)] w-full relative overflow-x-clip">
      <AnimatePresence mode="wait">
        {activeHorse && showSold ? (
          <SoldScreen key="sold" horse={activeHorse} />
        ) : activeHorse && !activeHorse.sold_at ? (
          <LiveAuction key={`live-${activeHorse.id}`} horse={activeHorse} />
        ) : (
          <WaitingScreen key="empty" />
        )}
      </AnimatePresence>
    </div>
  );
}

/** Idle screen shown while no horse is on the block. */
function WaitingScreen() {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 1.1 }}
      className="w-full max-w-2xl text-center px-6 py-12 sm:p-16 sm:py-24 backdrop-blur-md bg-white/70 rounded-[2rem] sm:rounded-[3rem] border border-white/50 shadow-2xl"
    >
      <h1 className="text-4xl sm:text-6xl font-serif text-gray-900 font-bold mb-4 sm:mb-6 tracking-tight leading-normal py-2">المزاد العلني</h1>
      <p className="text-lg sm:text-2xl text-gray-600 font-medium">في انتظار دخول أول المستويات للمزاد...</p>
    </motion.div>
  );
}

/** Celebration screen shown briefly after the operator confirms a sale. */
function SoldScreen({ horse }: { horse: Horse }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.5, rotate: -5 }}
      animate={{ opacity: 1, scale: 1, rotate: 0 }}
      exit={{ opacity: 0, scale: 1.5, rotate: 5 }}
      transition={{ type: 'spring', stiffness: 100 }}
      className="w-full max-w-3xl text-center px-6 py-10 sm:p-20 backdrop-blur-md bg-green-600/90 rounded-[2.5rem] sm:rounded-[4rem] shadow-2xl relative overflow-hidden flex flex-col items-center border-4 sm:border-8 border-green-400"
    >
      <div className="absolute inset-0 bg-white/10 opacity-50 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-white/30 to-transparent"></div>
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ delay: 0.3, type: 'spring', bounce: 0.6 }}
        className="bg-white text-green-600 rounded-full p-4 sm:p-6 mb-6 sm:mb-8 shadow-xl"
      >
        <Check strokeWidth={3} className="size-12 sm:size-20" aria-hidden />
      </motion.div>
      <h1 className="text-5xl sm:text-7xl font-serif text-white font-bold mb-4 sm:mb-6 drop-shadow-lg relative z-10">تم البيع!</h1>
      <p className="text-2xl sm:text-4xl text-green-100 font-bold relative z-10 break-words">لوت {horse.lot} — {horse.name}</p>
      {horse.current_price !== null && (
        <p className="text-4xl sm:text-5xl text-white font-bold mt-4 sm:mt-6 relative z-10 drop-shadow-xl flex flex-wrap items-center justify-center gap-x-3">
          <span>{formatPrice(horse.current_price)}</span>
          <span>{CURRENCY}</span>
        </p>
      )}
    </motion.div>
  );
}

/** Photo, lot, name, details, and animated current price while bidding is open. */
function LiveAuction({ horse }: { horse: Horse }) {
  const hasBids = horse.current_price !== null;

  return (
    <motion.div
      initial={{ opacity: 0, y: -40 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 40 }}
      className={`grid w-full max-w-7xl grid-cols-1 gap-4 sm:gap-8 items-center ${horse.image_path ? 'lg:grid-cols-2' : ''}`}
    >
      {horse.image_path && (
        <HorsePhoto path={horse.image_path} alt={horse.name}
          className="w-full aspect-[4/3] rounded-[2rem] sm:rounded-[3rem] shadow-2xl border-4 sm:border-[6px] border-white/80" />
      )}

      <div className="flex flex-col items-center gap-4 sm:gap-6 min-w-0">
        <div className="w-full px-5 py-5 sm:px-8 sm:py-6 backdrop-blur-md bg-white/85 rounded-[2rem] sm:rounded-[3rem] border border-white/50 shadow-2xl relative overflow-hidden text-center">
          <div className="absolute top-0 start-0 w-full h-1 bg-gradient-to-r from-transparent via-amber-400 to-transparent"></div>
          <span className="inline-block rounded-full bg-gray-900 text-amber-400 font-bold text-lg sm:text-2xl md:text-3xl px-5 sm:px-6 py-1 mb-2">
            لوت {horse.lot}
          </span>
          <h1 className="text-4xl sm:text-5xl md:text-7xl font-serif font-bold bg-gradient-to-br from-gray-900 to-gray-700 bg-clip-text text-transparent tracking-tight leading-normal py-1 sm:py-2 break-words">
            {horse.name}
          </h1>
          <p className="text-lg sm:text-2xl md:text-3xl text-gray-700 font-bold">{describeHorse(horse, localToday())}</p>
        </div>

        <div className="relative w-full flex justify-center items-center h-32 sm:h-48 md:h-64 overflow-hidden">
          <AnimatePresence mode="popLayout">
            {horse.current_price === null ? (
              <AwaitingFirstBid key="waiting-bid" />
            ) : (
              // Keyed on the price so every new bid replaces the old one with
              // a fresh slide-up animation.
              <PriceCard key={horse.current_price} price={horse.current_price} />
            )}
          </AnimatePresence>
        </div>

        <div className="text-center text-gray-800 font-bold text-lg sm:text-2xl md:text-3xl tracking-[0.15em] sm:tracking-[0.3em] flex items-center justify-center gap-3 sm:gap-4 backdrop-blur-md bg-white/60 py-3 px-6 sm:py-4 sm:px-8 rounded-full shadow-sm border border-white/50">
          <div className="w-3 h-3 bg-amber-500 rounded-full animate-ping"></div>
          {hasBids ? 'المزايدة قائمة' : 'للعــــــــرض'}
          <div className="w-3 h-3 bg-amber-500 rounded-full animate-ping delay-300"></div>
        </div>
      </div>
    </motion.div>
  );
}

// Children of a `popLayout` AnimatePresence must attach the ref it passes so
// the exiting element can be measured and popped out of the layout.
function AwaitingFirstBid({ ref }: { ref?: Ref<HTMLDivElement> }) {
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="absolute text-center flex flex-col items-center"
    >
      <div className="size-10 sm:size-14 border-t-4 border-b-4 border-amber-500 rounded-full animate-spin mb-4 sm:mb-6 shadow-xl"></div>
      <p className="text-xl sm:text-3xl text-gray-800 font-bold backdrop-blur-md bg-white/40 px-6 sm:px-10 py-3 sm:py-5 rounded-3xl shadow-sm tracking-wider">
        في انتظار افتتاح المزاد...
      </p>
    </motion.div>
  );
}

/** Large animated card displaying the current highest bid. */
function PriceCard({ price, ref }: { price: number; ref?: Ref<HTMLDivElement> }) {
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 200, scale: 0.7 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -200, scale: 1.3 }}
      transition={{ type: 'spring', stiffness: 90, damping: 20, opacity: { duration: 0.3 } }}
      className="absolute inset-x-0 flex justify-center"
    >
      <div className="flex max-w-full items-center justify-center gap-2 sm:gap-4 text-amber-500 drop-shadow-2xl font-bold bg-white/95 px-5 py-4 sm:px-10 sm:py-6 md:px-14 md:py-8 rounded-[1.5rem] sm:rounded-[2rem] md:rounded-[3rem] border-[3px] sm:border-4 md:border-[6px] border-amber-300 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 start-0 w-full h-full bg-gradient-to-b from-white/40 to-transparent"></div>
        <span
          className="text-[clamp(2.5rem,15vw,8rem)] leading-none tracking-tighter text-gray-900 relative z-10"
          style={{ textShadow: '0 10px 30px rgba(251, 191, 36, 0.4)' }}
        >
          {formatPrice(price)}
        </span>
        <span className="text-[clamp(1.5rem,8vw,4.5rem)] relative z-10">{CURRENCY}</span>
      </div>
    </motion.div>
  );
}
