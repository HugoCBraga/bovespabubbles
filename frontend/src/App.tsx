import React from 'react';
import { useStocks } from './hooks/useStocks';
import { useBubbleCanvas } from './canvas/useBubbleCanvas';
import { Tooltip } from './components/Tooltip';
import './App.css';

const App: React.FC = () => {
  const { stocks, loading, error } = useStocks();
  const { canvasRef, hoveredStock, mousePosition } = useBubbleCanvas(stocks);

  if (loading) return <div className="status">Carregando...</div>;
  if (error) return <div className="status status--error">Erro: {error}</div>;

  return (
    <div className="app">
      <header className="topbar">
        <div className="topbar__row">
          <div className="topbar__left">
            <div className="brand">
              <div className="brand__logo">B3</div>
              <div>
                <div className="brand__title">Bovespa Bubbles</div>
                <div className="brand__subtitle">Bolsa Brasileira em tempo real</div>
              </div>
            </div>
            <label className="search">
              <span className="search__icon">🔍</span>
              <input className="search__input" placeholder="Buscar ação" />
            </label>
          </div>
          <div className="topbar__center">
            <button className="chip chip--active">24H</button>
            <button className="chip">7D</button>
            <button className="chip">30D</button>
            <button className="chip">1A</button>
            <button className="chip">YTD</button>
          </div>
          <div className="topbar__right">
            <button className="pill">R$ BRL</button>
            <button className="pill pill--ghost">Market Cap</button>
            <button className="pill pill--ghost">Configurar</button>
          </div>
        </div>
        <div className="topbar__row topbar__row--secondary">
          <div className="filters">
            <span className="filters__label">Mercado:</span>
            <button className="chip chip--small chip--active">Todas</button>
            <button className="chip chip--small">Ibovespa</button>
            <button className="chip chip--small">Small Caps</button>
            <button className="chip chip--small">Fundos Imob.</button>
          </div>
          <div className="legend">
            <div className="legend__item legend__item--up">↑ Alta</div>
            <div className="legend__item legend__item--down">↓ Queda</div>
            <div className="legend__item">⏺ Estável</div>
          </div>
        </div>
      </header>
      <main className="canvas-wrapper">
        <canvas ref={canvasRef} className="bubble-canvas" />
      </main>
      <Tooltip stock={hoveredStock} mousePosition={mousePosition} />
    </div>
  );
};

export default App;