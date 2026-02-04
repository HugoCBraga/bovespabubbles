import React from 'react';
import { Stock } from '../types/Stock';

interface TooltipProps {
  stock: Stock | null;
  mousePosition: { x: number; y: number } | null;
}

export const Tooltip: React.FC<TooltipProps> = ({ stock, mousePosition }) => {
  if (!stock || !mousePosition) return null;

  return (
    <div style={{
      position: 'fixed',
      left: mousePosition.x + 15,
      top: mousePosition.y + 15,
      background: 'rgba(0, 0, 0, 0.8)',
      color: 'white',
      padding: '8px 12px',
      borderRadius: '4px',
      fontSize: '12px',
      fontFamily: 'Arial, sans-serif',
      pointerEvents: 'none',
      zIndex: 1000,
      maxWidth: '200px',
      boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)'
    }}>
      <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>{stock.symbol} - {stock.name}</div>
      <div>Price: ${stock.price.toFixed(2)}</div>
      <div>Change: {stock.changePercent >= 0 ? '+' : ''}{stock.changePercent.toFixed(2)}%</div>
      <div>Volume: {stock.volume.toLocaleString()}</div>
      <div>Market Cap: ${(stock.marketCap / 1000000).toFixed(1)}M</div>
    </div>
  );
};