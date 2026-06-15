'use client';

import { useState, useEffect, useCallback } from 'react';

const STORAGE_KEY = 'recently_viewed_tickers';
const MAX_ITEMS = 10;

export interface RecentlyViewedItem {
  ticker: string;
  name: string;
  timestamp: number;
}

export function useRecentlyViewed() {
  const [items, setItems] = useState<RecentlyViewedItem[]>([]);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        setItems(JSON.parse(saved));
      } catch {
        setItems([]);
      }
    }
  }, []);

  const addViewed = useCallback((ticker: string, name: string) => {
    setItems((prev) => {
      const filtered = prev.filter((i) => i.ticker.toUpperCase() !== ticker.toUpperCase());
      const next = [{ ticker: ticker.toUpperCase(), name, timestamp: Date.now() }, ...filtered].slice(0, MAX_ITEMS);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const clearRecent = useCallback(() => {
    setItems([]);
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  return { items, addViewed, clearRecent };
}
