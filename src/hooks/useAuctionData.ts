import { useEffect, useState } from 'react';
import { fetchSnapshot, type AuctionSnapshot } from '../lib/api';
import { supabase } from '../lib/supabase';

/** Live catalog state plus whether it has loaded or failed. */
export interface AuctionData extends AuctionSnapshot {
  status: 'loading' | 'ready' | 'error';
}

const EMPTY: AuctionData = { horses: [], reserves: new Map(), activeHorseId: null, status: 'loading' };

/**
 * Catalog and live-auction state, kept in sync across every device through
 * Supabase Realtime.
 *
 * Any change to the watched tables triggers a full refetch rather than
 * patching local state from event payloads: the catalog is small, and a
 * refetch can never drift. The channel subscribes *before* the first fetch
 * and refetches on every (re)connect, so changes made while the venue wifi
 * dropped are not lost.
 *
 * @param withReserves - Staff screens pass `true` to also load reserve
 *   amounts; the public board passes `false` (RLS would deny them anyway).
 */
export function useAuctionData(withReserves: boolean): AuctionData {
  const [data, setData] = useState<AuctionData>(EMPTY);

  useEffect(() => {
    if (!supabase) return;
    const client = supabase;
    let latestRequest = 0;
    let disposed = false;

    // Bids can arrive in quick bursts; only the newest response may win, so
    // a slow older fetch never overwrites fresher data.
    const refetch = async () => {
      const request = ++latestRequest;
      const isCurrent = () => !disposed && request === latestRequest;
      try {
        const snapshot = await fetchSnapshot(withReserves);
        if (isCurrent()) setData({ ...snapshot, status: 'ready' });
      } catch (error) {
        console.error('Failed to load auction data', error);
        if (isCurrent()) setData((prev) => ({ ...prev, status: 'error' }));
      }
    };

    // horse_reserves is deliberately not published to Realtime; reserve
    // changes always touch `horses` too, which triggers the refetch.
    const tables = ['horses', 'auction_state'];
    const channel = tables.reduce(
      (ch, table) => ch.on('postgres_changes', { event: '*', schema: 'public', table }, refetch),
      client.channel(`auction-${withReserves ? 'staff' : 'board'}`),
    );
    channel.subscribe((status) => {
      if (status === 'SUBSCRIBED') refetch();
    });

    return () => {
      disposed = true;
      client.removeChannel(channel);
    };
  }, [withReserves]);

  return data;
}
