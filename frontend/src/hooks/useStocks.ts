import { useState, useEffect } from 'react';
import { Stock } from '../types/Stock';
import { fetchStocks } from '../api/stocks';

export function useStocks() {
  const [stocks, setStocks] = useState<Stock[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadStocks = async () => {
      try {
        setLoading(true);
        const data = await fetchStocks();
        setStocks(data);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };

    loadStocks();
    const interval = setInterval(loadStocks, 60000);
    return () => clearInterval(interval);
  }, []);

  return { stocks, loading, error };
}