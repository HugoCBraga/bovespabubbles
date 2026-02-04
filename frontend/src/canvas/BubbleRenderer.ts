import { Stock } from '../types/Stock';

export function renderBubbles(
  ctx: CanvasRenderingContext2D,
  stocks: Stock[],
  hoveredStock: Stock | null
) {
  stocks.forEach(stock => {
    const radius = stock.radius;
    const isHovered = hoveredStock === stock;

    ctx.beginPath();
    ctx.arc(stock.x!, stock.y!, isHovered ? radius * 1.1 : radius, 0, 2 * Math.PI);
    ctx.fillStyle = stock.isPositive ? '#52c41a' : '#ff4d4f';
    ctx.fill();

    // Bordas melhores
    ctx.strokeStyle = stock.isPositive ? '#2f8f2f' : '#b22222';
    ctx.lineWidth = isHovered ? 3 : 2;
    ctx.stroke();

    // Text
    ctx.fillStyle = '#000';
    ctx.font = isHovered ? 'bold 14px Arial' : '12px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(stock.symbol, stock.x!, stock.y! - 5);

    ctx.font = '10px Arial';
    ctx.fillStyle = stock.isPositive ? '#2f8f2f' : '#b22222';
    ctx.fillText(`${stock.changePercent >= 0 ? '+' : ''}${stock.changePercent.toFixed(2)}%`, stock.x!, stock.y! + 5);
  });
}