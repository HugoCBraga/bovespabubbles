import { Stock } from '../types/Stock';

export function renderBubbles(
  ctx: CanvasRenderingContext2D,
  stocks: Stock[],
  hoveredStock: Stock | null,
  draggedStock: Stock | null,
  period: '1D'|'1W'|'1M'|'1Y'|'MARKETCAP' = '1D'
) {
  stocks.forEach(stock => {
    // ...
    const radius = stock.radius ?? 10;
    const isHovered = hoveredStock === stock;
    const isDragged = draggedStock === stock;
    // Variação do período selecionado
    const change = period === 'MARKETCAP' ? 0 : (stock.variation ?? 0);
    const isPositive = change >= 0;

    // Efeito de brilho para dragged
    if (isDragged) {
      ctx.save();
      const periodChange = period === 'MARKETCAP' ? 0 : (stock.variations?.[period] ?? 0);
      ctx.shadowColor = periodChange >= 0 ? '#52c41a' : '#ff4d4f';
      ctx.shadowBlur = 20;
      ctx.globalAlpha = 0.8;
    }

    // Glow externo elegante
    ctx.save();
    ctx.beginPath();
    ctx.arc(stock.x!, stock.y!, isHovered || isDragged ? radius * 1.2 : radius, 0, 2 * Math.PI);

    ctx.shadowColor = isPositive ? '#00ff6a' : '#ff2a2a';
    ctx.shadowBlur = radius * 0.45;
    ctx.fillStyle = isPositive ? '#1a2e1a' : '#2e1a1a';
    ctx.fill();
    ctx.restore();

    // Borda interna mais viva
    ctx.save();
    ctx.beginPath();
    ctx.arc(stock.x!, stock.y!, isHovered || isDragged ? radius * 1.2 : radius - 2, 0, 2 * Math.PI);
    ctx.strokeStyle = isPositive ? '#00ff6a' : '#ff2a2a';
    ctx.lineWidth = isHovered || isDragged ? 5 : 3;
    ctx.stroke();
    ctx.restore();

    if (isDragged) {
      ctx.restore();
    }

    // Renderização condicional conforme tamanho da bolha
    if (stock.logourl) {
      const img = new window.Image();
      img.src = stock.logourl;
      // O drawImage só funciona após o load, então precisamos garantir que a imagem já está carregada
      if (img.complete) {
        drawBubbleContent(ctx, stock, radius, change, img);
      } else {
        img.onload = () => {
          drawBubbleContent(ctx, stock, radius, change, img);
        };
      }
    } else {
      drawBubbleContent(ctx, stock, radius, change, undefined);
    }
  });

  function drawBubbleContent(ctx: CanvasRenderingContext2D, stock: Stock, radius: number, change: number, img?: HTMLImageElement) {
    // Pequena: só imagem
    if (radius < 32) {
      if (img) {
        ctx.save();
        ctx.beginPath();
        ctx.arc(stock.x!, stock.y!, radius * 0.7, 0, 2 * Math.PI);
        ctx.closePath();
        ctx.clip();
        ctx.drawImage(img, stock.x! - radius * 0.7, stock.y! - radius * 0.7, radius * 1.4, radius * 1.4);
        ctx.restore();
      }
      return;
    }
    // Média: imagem em cima, % embaixo
    if (radius < 64) {
      if (img) {
        ctx.save();
        ctx.beginPath();
        ctx.arc(stock.x!, stock.y! - radius * 0.3, radius * 0.5, 0, 2 * Math.PI);
        ctx.closePath();
        ctx.clip();
        ctx.drawImage(img, stock.x! - radius * 0.5, stock.y! - radius * 0.8, radius, radius);
        ctx.restore();
      }
      ctx.font = 'bold 12px Arial';
      ctx.fillStyle = '#fff';
      ctx.textAlign = 'center';
      ctx.fillText(`${change >= 0 ? '+' : ''}${change?.toFixed(2) ?? '--'}%`, stock.x!, stock.y! + radius * 0.45);
      return;
    }
    // Grande: imagem em cima, nome no meio, % embaixo
    if (img) {
      ctx.save();
      ctx.beginPath();
      ctx.arc(stock.x!, stock.y! - radius * 0.45, radius * 0.4, 0, 2 * Math.PI);
      ctx.closePath();
      ctx.clip();
      ctx.drawImage(img, stock.x! - radius * 0.4, stock.y! - radius * 0.85, radius * 0.8, radius * 0.8);
      ctx.restore();
    }
    ctx.font = 'bold 16px Arial';
    ctx.fillStyle = '#fff';
    ctx.textAlign = 'center';
    ctx.fillText(stock.symbol, stock.x!, stock.y! + 2);
    ctx.font = 'bold 13px Arial';
    ctx.fillStyle = '#fff';
    ctx.fillText(`${change >= 0 ? '+' : ''}${change?.toFixed(2) ?? '--'}%`, stock.x!, stock.y! + radius * 0.55);
  }
}