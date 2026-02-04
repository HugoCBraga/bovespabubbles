export interface Stock {
  symbol: string;
  name: string;
  price: number;
  changePercent: number;
  volume: number;
  marketCap: number;
  absChange: number;
  isPositive: boolean;
  radius: number;
  x?: number;
  y?: number;
  fx?: number | null;
  fy?: number | null;
  floatPhase?: number;
  vx?: number;
  vy?: number;
}