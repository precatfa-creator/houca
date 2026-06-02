import { useState, useEffect, useCallback } from 'react';

export interface AuctionState {
  horseName: string;
  currentPrice: number | null;
  timestamp: number;
  isSold: boolean;
}

const STORAGE_KEY = 'arabian_horse_auction_state';

export function useAuction() {
  const [auctionState, setAuctionState] = useState<AuctionState | null>(null);

  const loadState = useCallback(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        setAuctionState(JSON.parse(stored));
      } else {
        setAuctionState(null);
      }
    } catch (error) {
      console.error('Failed to load auction state', error);
    }
  }, []);

  useEffect(() => {
    loadState();

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) {
        loadState();
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [loadState]);

  const introduceHorse = (horseName: string) => {
    const newState: AuctionState = {
      horseName,
      currentPrice: null,
      timestamp: Date.now(),
      isSold: false,
    };
    setAuctionState(newState);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newState));
  };

  const placeBid = (price: number) => {
    setAuctionState(prev => {
        if (!prev) return prev;
        const newState: AuctionState = {
            ...prev,
            currentPrice: price,
            timestamp: Date.now(),
        };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(newState));
        return newState;
    });
  };
  
  const clearAuction = () => {
    setAuctionState(null);
    localStorage.removeItem(STORAGE_KEY);
  };

  const sellHorse = () => {
      setAuctionState(prev => {
          if (!prev) return prev;
          const newState: AuctionState = {
              ...prev,
              isSold: true,
              timestamp: Date.now()
          };
          localStorage.setItem(STORAGE_KEY, JSON.stringify(newState));
          return newState;
      });
  };

  useEffect(() => {
      if (auctionState?.isSold) {
          const timeout = setTimeout(() => {
              setAuctionState(prev => {
                 if (prev && prev.timestamp === auctionState.timestamp) {
                     localStorage.removeItem(STORAGE_KEY);
                     return null;
                 }
                 return prev;
              });
          }, 4000); // إظهار التفاعل لمدة 4 ثواني ثم مسح المزاد للصفحة الأصلية
          return () => clearTimeout(timeout);
      }
  }, [auctionState?.isSold, auctionState?.timestamp]);

  return { auctionState, introduceHorse, placeBid, sellHorse, clearAuction };
}
