import React from 'react';
import { Stock } from '../types/Stock';

interface TooltipProps {
  stock: Stock | null;
  mousePosition: { x: number; y: number } | null;
  period?: '1D'|'1W'|'1M'|'1Y'|'MARKETCAP';
}

export const Tooltip: React.FC<TooltipProps> = ({ stock, mousePosition, period = '1D' }) => {
  if (!stock || !mousePosition) return null;
  const change = period === 'MARKETCAP' ? 0 : (stock.variation ?? 0);

  // Dimensões do tooltip (aproximadas, pode ajustar se mudar o layout)
  const TOOLTIP_WIDTH = 220;
  const TOOLTIP_HEIGHT = 170;
  // Margem da borda da tela
  const MARGIN = 8;

  // Pega dimensões da tela
  const winW = window.innerWidth;
  const winH = window.innerHeight;

  // Calcula posição inicial
  let left = mousePosition.x + 15;
  let top = mousePosition.y + 15;

  // Ajusta se ultrapassar a borda direita
  if (left + TOOLTIP_WIDTH + MARGIN > winW) {
    left = winW - TOOLTIP_WIDTH - MARGIN;
  }
  // Ajusta se ultrapassar a borda inferior
  if (top + TOOLTIP_HEIGHT + MARGIN > winH) {
    top = winH - TOOLTIP_HEIGHT - MARGIN;
  }
  // Nunca deixa negativo
  left = Math.max(MARGIN, left);
  top = Math.max(MARGIN, top);

  // Dados de abertura
  const open = (stock as any).regularMarketOpen ?? null;
  const openDate = (stock as any).regularMarketTime ?? null;
  let openDateStr = '--';
  if (openDate) {
    try {
      const d = new Date(openDate);
      openDateStr = d.toLocaleDateString('pt-BR') + ' ' + d.toLocaleTimeString('pt-BR');
    } catch {}
  }

  return (
    <div
      className="tooltip"
      style={{
        left,
        top,
        position: 'fixed',
        zIndex: 1000
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
          {change >= 0 ? '+' : ''}{change?.toFixed(2) ?? '--'}%
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
      <div className="tooltip__row">
        <span>Abertura</span>
        <span className="tooltip__value">{open !== null ? `R$ ${open.toFixed(2)}` : '--'}</span>
      </div>
      <div className="tooltip__row">
        <span>Data da abertura</span>
        <span className="tooltip__value">{openDateStr}</span>
      </div>
    </div>
  );
};