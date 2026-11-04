import { useEffect, useState } from 'react';
import { parseAuctionState, type AuctionState } from '../lib/auction';

const STORAGE_KEY = 'arabian_horse_auction_state';

/** How long the "sold" celebration stays on screen before the board resets. */
const SOLD_DISPLAY_MS = 4000;

/** Reads the stored auction, discarding (and deleting) any malformed value. */
function readStoredState(): AuctionState | null {
  const raw = localStorage.getItem(STORAGE_KEY);
  const state = parseAuctionState(raw);
  if (raw !== null && state === null) localStorage.removeItem(STORAGE_KEY);
  return state;
}

/** Actions and state returned by {@link useAuction}. */
export interface AuctionControls {
  /** Current auction, or `null` when nothing is on the block. */
  auctionState: AuctionState | null;
  /** Puts a new horse on the block with no bids, replacing any current auction. */
  introduceHorse: (horseName: string) => void;
  /** Records a new highest bid. No-op when no auction is running. */
  placeBid: (price: number) => void;
  /** Marks the current horse as sold. No-op when no auction is running. */
  sellHorse: () => void;
  /** Ends the current auction without a sale. */
  clearAuction: () => void;
}

/**
 * Shared auction state, synchronised across tabs of the same browser.
 *
 * `localStorage` is the source of truth: every action writes it, and the
 * `storage` event (which fires only in *other* tabs) pushes the change to the
 * public board. Tabs on other devices or browsers do not see each other.
 *
 * Once a horse is sold, the state is cleared automatically after
 * {@link SOLD_DISPLAY_MS} so the board returns to its waiting screen.
 */
export function useAuction(): AuctionControls {
  const [auctionState, setAuctionState] = useState(readStoredState);

  /**
   * Saves `next` as the current auction, or clears it when `null`. Writes
   * storage before React state so other tabs get a `storage` event for
   * every change made here.
   */
  const persist = (next: AuctionState | null) => {
    if (next) localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    else localStorage.removeItem(STORAGE_KEY);
    setAuctionState(next);
  };

  useEffect(() => {
    const syncFromOtherTab = (event: StorageEvent) => {
      if (event.key === STORAGE_KEY) setAuctionState(parseAuctionState(event.newValue));
    };
    window.addEventListener('storage', syncFromOtherTab);
    return () => window.removeEventListener('storage', syncFromOtherTab);
  }, []);

  const soldAt = auctionState?.isSold ? auctionState.timestamp : null;
  useEffect(() => {
    if (soldAt === null) return;
    const timeout = setTimeout(() => {
      // Another tab may have started a new auction meanwhile; only clear the
      // exact sale this timer was set for.
      if (readStoredState()?.timestamp === soldAt) persist(null);
    }, SOLD_DISPLAY_MS);
    return () => clearTimeout(timeout);
  }, [soldAt]);

  /** Applies `changes` to the running auction and stamps a new timestamp. */
  const updateAuction = (changes: Partial<AuctionState>) => {
    if (auctionState) persist({ ...auctionState, ...changes, timestamp: Date.now() });
  };

  return {
    auctionState,
    introduceHorse: (horseName) =>
      persist({ horseName, currentPrice: null, timestamp: Date.now(), isSold: false }),
    placeBid: (currentPrice) => updateAuction({ currentPrice }),
    sellHorse: () => updateAuction({ isSold: true }),
    clearAuction: () => persist(null),
  };
}
