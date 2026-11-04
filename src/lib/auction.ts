/**
 * Pure auction domain logic: the shared state shape, its validation, and
 * price formatting. Kept free of React and browser APIs so it can be tested
 * directly with `node --test`.
 */

/** Snapshot of the single live auction, shared between browser tabs. */
export interface AuctionState {
  /** Name of the horse currently on the block. */
  horseName: string;
  /** Highest accepted bid in Libyan dinars, or `null` before the first bid. */
  currentPrice: number | null;
  /**
   * Epoch milliseconds of the last change. Doubles as an identity for each
   * change: the public board keys its price animation on it, and the
   * sold-state auto-clear uses it to avoid clearing a newer auction.
   */
  timestamp: number;
  /** `true` once the operator confirms the sale. */
  isSold: boolean;
}

/** Libyan dinar symbol shown next to every price. */
export const CURRENCY = 'د.ل';

// Fixed locale so the control panel and the public board render identical
// digits and separators regardless of each device's language settings.
const priceFormatter = new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 });

/**
 * Formats a price for display, without the currency symbol.
 * @example formatPrice(12500.5) // "12,500.5"
 */
export function formatPrice(price: number): string {
  return priceFormatter.format(price);
}

/**
 * Parses a raw `localStorage` value into an {@link AuctionState}.
 *
 * Storage is shared with other tabs and can be edited by hand, so the value
 * is untrusted: anything that is not valid JSON of the expected shape yields
 * `null` instead of crashing the UI on render.
 *
 * @param raw - The stored string, or `null` when the key is absent.
 * @returns The parsed state, or `null` when absent or malformed.
 */
export function parseAuctionState(raw: string | null): AuctionState | null {
  if (raw === null) return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (error) {
    if (error instanceof SyntaxError) return null;
    throw error;
  }
  return isAuctionState(parsed) ? parsed : null;
}

/** Type guard: checks every {@link AuctionState} field has the expected type. */
function isAuctionState(value: unknown): value is AuctionState {
  if (typeof value !== 'object' || value === null) return false;
  const state = value as Record<string, unknown>;
  return (
    typeof state.horseName === 'string' &&
    (state.currentPrice === null || isPositiveNumber(state.currentPrice)) &&
    typeof state.timestamp === 'number' &&
    typeof state.isSold === 'boolean'
  );
}

/** `true` for finite numbers above zero; rejects `NaN`, `Infinity`, and non-numbers. */
function isPositiveNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0;
}
