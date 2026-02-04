import { Stock } from '../types/Stock';

export async function fetchStocks(): Promise<Stock[]> {
  const response = await fetch('/stocks');
  if (!response.ok) {
    throw new Error('Failed to fetch stocks');
  }
  const data = await response.json();
  if (!Array.isArray(data)) {
    throw new Error('Invalid data format');
  }
  return data as Stock[];
}