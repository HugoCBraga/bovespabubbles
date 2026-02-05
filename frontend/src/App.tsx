import React, { useState, useRef } from 'react';
import { useStocks } from './hooks/useStocks';
import { fetchStocks } from './api/stocks';
import { useBubbleCanvas } from './canvas/useBubbleCanvas';
import { Tooltip } from './components/Tooltip';
import './App.css';

const App: React.FC = () => {

  const [period, setPeriod] = useState<'1D'|'1W'|'1M'|'1Y'|'MARKETCAP'>('1D');
  const { stocks, loading, error, setStocks, setLoading, setError } = useStocks(period, true);
  const { canvasRef, hoveredStock, mousePosition, cursor } = useBubbleCanvas(stocks, period);

  const [refreshDisabled, setRefreshDisabled] = useState(true);
  const [refreshCountdown, setRefreshCountdown] = useState(60);
  const [showRefreshTooltip, setShowRefreshTooltip] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Habilita o botão após 1 minuto
  React.useEffect(() => {
    setRefreshDisabled(true);
    setRefreshCountdown(60);
    if (intervalRef.current) clearInterval(intervalRef.current);
    timerRef.current = setTimeout(() => setRefreshDisabled(false), 60000);
    intervalRef.current = setInterval(() => {
      setRefreshCountdown(prev => prev > 0 ? prev - 1 : 0);
    }, 1000);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  const handleRefresh = async () => {
    setRefreshDisabled(true);
    setRefreshCountdown(60);
    setLoading(true);
    if (intervalRef.current) clearInterval(intervalRef.current);
    timerRef.current = setTimeout(() => setRefreshDisabled(false), 60000);
    intervalRef.current = setInterval(() => {
      setRefreshCountdown(prev => prev > 0 ? prev - 1 : 0);
    }, 1000);
    try {
      const data = await fetchStocks(period);
      setStocks(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  // Removido useEffect duplicado de fetchStocks. O hook useStocks já faz o fetch inicial.

  if (loading) return <div className="status">Carregando...</div>;
  if (error) return <div className="status status--error">Erro: {error}</div>;

  return (
    <div className="app">
      <header className="topbar">
        <div className="topbar__row">
          <div className="topbar__left">
            <div className="brand">
              <img src="/b3-logo.png" alt="B3 Logo" className="brand__logo" style={{height: 128, width: 128, objectFit: 'contain'}} onError={() => {console.log('Erro ao carregar logo')}} onLoad={() => {console.log('Logo carregado')}} />
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
            {[
              { label: 'Dia', value: '1D' },
              { label: 'Semana', value: '1W' },
              { label: 'Mês', value: '1M' },
              { label: 'Ano', value: '1Y' },
              { label: 'Cap de Mercado', value: 'MARKETCAP' },
            ].map(opt => (
              <button
                key={opt.value}
                className={`chip${period === opt.value ? ' chip--active' : ''}`}
                onClick={() => setPeriod(opt.value as any)}
              >
                {opt.label}
              </button>
            ))}
          </div>
          <div className="topbar__right">
            <div
              style={{ position: 'relative', display: 'inline-block', marginRight: 8 }}
              onMouseEnter={() => {
                if (refreshDisabled) setShowRefreshTooltip(true);
              }}
              onMouseLeave={() => {
                setShowRefreshTooltip(false);
              }}
            >
              <button
                className="pill pill--icon"
                onClick={handleRefresh}
                disabled={refreshDisabled}
                style={{ opacity: refreshDisabled ? 0.5 : 1, cursor: refreshDisabled ? 'not-allowed' : 'pointer' }}
              >
                <span role="img" aria-label="Atualizar">🔄</span>
              </button>
              {/* Tooltip renderizado apenas quando necessário */}
              {refreshDisabled && showRefreshTooltip && (
                <div style={{
                  position: 'absolute',
                  top: '110%',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  background: '#222',
                  color: '#fff',
                  padding: '7px 14px',
                  borderRadius: 6,
                  fontSize: 14,
                  whiteSpace: 'nowrap',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.18)',
                  zIndex: 10
                }}>
                  {`Aguarde ${refreshCountdown} segundo${refreshCountdown === 1 ? '' : 's'} para atualizar novamente.`}
                </div>
              )}
            </div>
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
        <canvas
          ref={canvasRef}
          className="bubble-canvas"
          style={{ cursor: cursor || 'default' }}
        />
      </main>
      <Tooltip stock={hoveredStock} mousePosition={mousePosition} period={period} />
    </div>
  );
};

export default App;