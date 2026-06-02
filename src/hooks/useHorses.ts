import { useState, useEffect, useCallback } from 'react';
import { Horse } from '../types';

const STORAGE_KEY = 'arabian_horses_db';

export function useHorses() {
  const [horses, setHorses] = useState<Horse[]>([]);

  // Load from local storage
  const loadHorses = useCallback(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        setHorses(JSON.parse(stored));
      }
    } catch (error) {
      console.error('Failed to load horses from storage', error);
    }
  }, []);

  // Initial load and setup cross-tab sync
  useEffect(() => {
    loadHorses();

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) {
        loadHorses();
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [loadHorses]);

  // Add a new horse
  const addHorse = (horseData: Omit<Horse, 'id' | 'registeredAt'>) => {
    const newHorse: Horse = {
      ...horseData,
      id: crypto.randomUUID(),
      registeredAt: Date.now(),
    };

    const newHorses = [newHorse, ...horses];
    setHorses(newHorses);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newHorses));
  };
  
  // Remove a horse
  const removeHorse = (id: string) => {
    const newHorses = horses.filter(h => h.id !== id);
    setHorses(newHorses);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newHorses));
  };

  return { horses, addHorse, removeHorse };
}
