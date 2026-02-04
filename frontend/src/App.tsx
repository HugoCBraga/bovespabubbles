import React from 'react';
import { useStocks } from './hooks/useStocks';
import { useBubbleCanvas } from './canvas/useBubbleCanvas';
import { Tooltip } from './components/Tooltip';

const App: React.FC = () => {
  const { stocks, loading, error } = useStocks();
  const { canvasRef, hoveredStock, mousePosition } = useBubbleCanvas(stocks);

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div style={{
      backgroundColor: '#000',
      minHeight: '100vh',
      fontFamily: 'Inter, system-ui, Arial, sans-serif'
    }}>
      <header style={{
        backgroundColor: '#000',
        color: '#fff',
        textAlign: 'center',
        padding: '15px',
        fontSize: '1.5em',
        fontWeight: 'bold',
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 100
      }}>
        BOVESPA BUBBLES
      </header>
      <canvas
        ref={canvasRef}
        style={{
          display: 'block',
          width: '100vw',
          height: 'calc(100vh - 60px)',
          marginTop: '60px',
          cursor: 'grab'
        }}
      />
      <Tooltip stock={hoveredStock} mousePosition={mousePosition} />
    </div>
  );
};

export default App;