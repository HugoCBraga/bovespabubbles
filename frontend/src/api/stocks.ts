import { Stock } from '../types/Stock';

export async function fetchStocks(period: string = '1D'): Promise<Stock[]> {
  const response = await fetch(`http://localhost:3001/stocks?period=${period}`);
  if (!response.ok) {
    throw new Error('Failed to fetch stocks');
  }
  const data = await response.json();
  if (!Array.isArray(data)) {
    throw new Error('Invalid data format');
  }
  return data as Stock[];
}