import React, { useState, useEffect } from 'react';
import { Stock } from '../types/Stock';
import { fetchStocks } from '../api/stocks';

export function useStocks(period: string, manual?: boolean) {
  const [stocks, setStocks] = useState<Stock[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ...

  useEffect(() => {
    const loadStocks = async () => {
      try {
        setLoading(true);
        const data = await fetchStocks(period);
        setStocks(data);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };

    loadStocks();
    if (!manual) {
      const interval = setInterval(() => {
        loadStocks();
      }, 60000);
      return () => clearInterval(interval);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [period, manual]);

  return { stocks, loading, error, setStocks, setLoading, setError };
}