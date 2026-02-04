import React from 'react';
import { Stock } from '../types/Stock';

interface TooltipProps {
  stock: Stock | null;
  mousePosition: { x: number; y: number } | null;
}

export const Tooltip: React.FC<TooltipProps> = ({ stock, mousePosition }) => {
  if (!stock || !mousePosition) return null;

  return (
    <div
      className="tooltip"
      style={{
        left: mousePosition.x + 15,
        top: mousePosition.y + 15
      }}
    >
      <div className="tooltip__title">
        {stock.symbol} - {stock.name}
      </div>
      <div className="tooltip__row">
        <span>Preço</span>
        <span className="tooltip__value">R$ {stock.price.toFixed(2)}</span>
      </div>
      <div className="tooltip__row">
        <span>Variação</span>
        <span className="tooltip__value">
          {stock.changePercent >= 0 ? '+' : ''}
          {stock.changePercent.toFixed(2)}%
        </span>
      </div>
      <div className="tooltip__row">
        <span>Volume</span>
        <span className="tooltip__value">{stock.volume.toLocaleString()}</span>
      </div>
      <div className="tooltip__row">
        <span>Market Cap</span>
        <span className="tooltip__value">
          R$ {(stock.marketCap / 1000000).toFixed(1)}M
        </span>
      </div>
    </div>
  );
};