export interface Stock {
  symbol: string;
  name: string;
  price: number;
  volume: number;
  marketCap: number;
  logourl?: string;
  variation?: number | null; // novo campo retornado pela API
  variations?: {
    '1D': number | null;
    '1W': number | null;
    '1M': number | null;
    '1Y': number | null;
  };
  radius?: number;
  x?: number;
  y?: number;
  fx?: number | null;
  fy?: number | null;
  floatPhase?: number;
  vx?: number;
  vy?: number;
  regularMarketOpen?: number | null;
  regularMarketTime?: string | null;
}