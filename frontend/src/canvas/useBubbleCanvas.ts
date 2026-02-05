import { useRef, useEffect, useState } from 'react';
import { forceCenter } from 'd3-force';
import { extent } from 'd3-array';
import { scaleSqrt } from 'd3-scale';
import { Stock } from '../types/Stock';
import { createSimulation } from './BubbleSimulation';
import { renderBubbles } from './BubbleRenderer';

export function useBubbleCanvas(stocks: Stock[], period: '1D'|'1W'|'1M'|'1Y'|'MARKETCAP' = '1D') {
    // Damping para efeito de arremesso
    useEffect(() => {
      if (!stocks || stocks.length === 0) return;
      let animationId: number;
      const damping = 0.92; // quanto menor, mais rápido desacelera
      const minVelocity = 2; // abaixo disso, considera "parada"

      function manualDampingTick() {
        let needsUpdate = false;
        for (const stock of stocks) {
          if (stock.vx && Math.abs(stock.vx) > minVelocity) {
            stock.vx *= damping;
            needsUpdate = true;
          } else if (stock.vx) {
            stock.vx = 0;
          }
          if (stock.vy && Math.abs(stock.vy) > minVelocity) {
            stock.vy *= damping;
            needsUpdate = true;
          } else if (stock.vy) {
            stock.vy = 0;
          }
        }
        if (needsUpdate) {
          animationId = requestAnimationFrame(manualDampingTick);
        }
      }

      // Sempre que uma bolha for "arremessada", inicia o damping
      // O handleMouseUp já seta vx/vy, então aqui só monitora
      animationId = requestAnimationFrame(manualDampingTick);
      return () => cancelAnimationFrame(animationId);
    }, [stocks]);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [hoveredStock, setHoveredStock] = useState<Stock | null>(null);
  const [mousePosition, setMousePosition] = useState<{ x: number; y: number } | null>(null);
  // Para efeito de arremesso
  const lastMousePosRef = useRef<{ x: number; y: number; t: number } | null>(null);
  const prevMousePosRef = useRef<{ x: number; y: number; t: number } | null>(null);
  const transformRef = useRef({ x: 0, y: 0, k: 1 });
  const draggedNodeRef = useRef<Stock | null>(null);

  useEffect(() => {
    if (!canvasRef.current || stocks.length === 0) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    let animationFrameId = 0;
    let isPointerDown = false;
    let previousTime = 0;

    // Redesenha imediatamente ao trocar o período
    const redraw = () => {
      ctx.save();
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.translate(transformRef.current.x, transformRef.current.y);
      ctx.scale(transformRef.current.k, transformRef.current.k);
      renderBubbles(ctx, stocks, hoveredStock, draggedNodeRef.current, period);
      ctx.restore();
    };
    redraw();

    const resizeCanvas = () => {
      const parent = canvas.parentElement;
      if (!parent) return { width: window.innerWidth, height: window.innerHeight };
      const { width, height } = parent.getBoundingClientRect();
      canvas.width = width;
      canvas.height = height;
      return { width, height };
    };

    const { width, height } = resizeCanvas();

    // Responsividade: range do raio depende do tamanho do canvas
    const minSide = Math.min(width, height);
    // Exemplo: bolhas menores em telas pequenas, maiores em telas grandes
    let minR = Math.max(6, minSide * 0.018); // ~1.8% do menor lado
    let maxR = Math.max(24, minSide * 0.13); // ~13% do menor lado
    // Limita máximo para não explodir em telas gigantes
    maxR = Math.min(maxR, 140);
    const marketCaps = stocks.map((d: Stock) => d.marketCap).filter((v: number) => v > 0);
    let sizeScale: (v: number) => number;
    if (period === 'MARKETCAP') {
      sizeScale = scaleSqrt()
        .domain(extent(marketCaps) as [number, number])
        .range([minR, maxR]);
      stocks.forEach((stock: Stock) => {
        stock.radius = sizeScale(stock.marketCap);
      });
    } else {
      // Para períodos, escala pelo valor absoluto da variação, mas usa a mesma faixa de raio do marketCap
      const variationsAbs = stocks.map((d: Stock) => Math.abs(d.variations?.[period] ?? 0));
      // Usa a mesma faixa de raio, mas o domínio é das variações
      sizeScale = scaleSqrt()
        .domain(extent(variationsAbs) as [number, number])
        .range([minR, maxR]);
      stocks.forEach((stock: Stock) => {
        const variation = Math.abs(stock.variations?.[period] ?? 0);
        stock.radius = sizeScale(variation);
      });
    }

    const applyFloatingMotion = (deltaSeconds: number) => {
      const amplitude = 0.15;
      const speed = 0.5;
      stocks.forEach((stock: Stock) => {
        if (stock.fx !== null && stock.fx !== undefined) return;
        if (stock.fy !== null && stock.fy !== undefined) return;
        if (stock.floatPhase === undefined) {
          stock.floatPhase = Math.random() * Math.PI * 2;
        }
        const phase = stock.floatPhase + speed * deltaSeconds;
        stock.floatPhase = phase;
        if (stock.vx !== undefined) {
          stock.vx += Math.cos(phase) * amplitude;
        }
        if (stock.vy !== undefined) {
          stock.vy += Math.sin(phase) * amplitude;
        }

        // Keep within bounds
        const margin = stock.radius || 10;
        if (stock.x !== undefined && stock.x < margin) {
          if (stock.vx !== undefined) stock.vx += 0.5;
        } else if (stock.x !== undefined && stock.x > width - margin) {
          if (stock.vx !== undefined) stock.vx -= 0.5;
        }
        if (stock.y !== undefined && stock.y < margin) {
          if (stock.vy !== undefined) stock.vy += 0.5;
        } else if (stock.y !== undefined && stock.y > height - margin) {
          if (stock.vy !== undefined) stock.vy -= 0.5;
        }
      });
    };

    // Simulation
    const simulation = createSimulation(stocks, width, height);

    const draw = () => {
      const now = performance.now();
      const deltaSeconds = Math.min(0.05, (now - previousTime) / 1000);
      previousTime = now;
      applyFloatingMotion(deltaSeconds);

      ctx.save();
      ctx.clearRect(0, 0, width, height);
      ctx.translate(transformRef.current.x, transformRef.current.y);
      ctx.scale(transformRef.current.k, transformRef.current.k);
      renderBubbles(ctx, stocks, hoveredStock, draggedNodeRef.current, period);
      ctx.restore();
    };

    simulation.on('tick', draw);
    // Clamp pós-tick: impede que qualquer bolha ultrapasse os limites do canvas
    const HEADER_OFFSET = 140; // altura do cabeçalho em px (ajuste se necessário)
    simulation.on('tick', () => {
      stocks.forEach(stock => {
        const margin = stock.radius || 10;
        const minX = margin;
        const maxX = width - margin;
        const minY = margin + HEADER_OFFSET;
        const maxY = height - margin;
        if (stock.x !== undefined) stock.x = Math.max(minX, Math.min(stock.x, maxX));
        if (stock.y !== undefined) stock.y = Math.max(minY, Math.min(stock.y, maxY));
      });
    });

    // Helper function to find node under mouse
    const findNodeUnderMouse = (mouseX: number, mouseY: number) => {
      const adjustedX = (mouseX - transformRef.current.x) / transformRef.current.k;
      const adjustedY = (mouseY - transformRef.current.y) / transformRef.current.k;

      let closestStock: Stock | null = null;
      let minDistance = Infinity;

      stocks.forEach((stock: Stock) => {
        const dx = adjustedX - stock.x!;
        const dy = adjustedY - stock.y!;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const radius = stock.radius ?? 10;
        if (distance < radius && distance < minDistance) {
          minDistance = distance;
          closestStock = stock;
        }
      });

      return closestStock;
    };

    const setDraggedNodePosition = (node: Stock, mouseX: number, mouseY: number) => {
      const adjustedX = (mouseX - transformRef.current.x) / transformRef.current.k;
      const adjustedY = (mouseY - transformRef.current.y) / transformRef.current.k;
      const dx = adjustedX - (node.x ?? adjustedX);
      const dy = adjustedY - (node.y ?? adjustedY);
      const distance = Math.max(Math.sqrt(dx * dx + dy * dy), 1);
      const pull = Math.min(0.2, distance * 0.003);
      let fx = (node.x ?? adjustedX) + dx * pull;
      let fy = (node.y ?? adjustedY) + dy * pull;
      // Clamp para manter a bolha inteira dentro do canvas
      const margin = node.radius || 10;
      const HEADER_OFFSET = 140; // altura do cabeçalho em px (ajuste se necessário)
      const minX = margin;
      const maxX = width - margin;
      const minY = margin + HEADER_OFFSET;
      const maxY = height - margin;
      fx = Math.max(minX, Math.min(fx, maxX));
      fy = Math.max(minY, Math.min(fy, maxY));
      node.fx = fx;
      node.fy = fy;
      // Não zera vx/vy durante o drag
    };

    // Initialize positions
    stocks.forEach((stock: Stock, i: number) => {
      const margin = stock.radius || 10;
      const HEADER_OFFSET = 140; // altura do cabeçalho em px (ajuste se necessário)
      const minX = margin;
      const maxX = width - margin;
      const minY = margin + HEADER_OFFSET;
      const maxY = height - margin;
      const randX = Math.random() * (maxX - minX) + minX;
      const randY = Math.random() * (maxY - minY) + minY;
      stock.x = Math.max(minX, Math.min(randX, maxX));
      stock.y = Math.max(minY, Math.min(randY, maxY));
    });

    // Mouse events
    const handleMouseDown = (event: MouseEvent) => {
      isPointerDown = true;
      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;
      const mouseX = (event.clientX - rect.left) * scaleX;
      const mouseY = (event.clientY - rect.top) * scaleY;

      const node = findNodeUnderMouse(mouseX, mouseY);
      if (node) {
        draggedNodeRef.current = node;
        setDraggedNodePosition(node, mouseX, mouseY);
        simulation.alphaTarget(0.1).restart();
      }
    };

    const handleMouseMove = (event: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;
      const mouseX = (event.clientX - rect.left) * scaleX;
      const mouseY = (event.clientY - rect.top) * scaleY;

      setMousePosition({ x: mouseX, y: mouseY });
      prevMousePosRef.current = lastMousePosRef.current;
      lastMousePosRef.current = { x: mouseX, y: mouseY, t: performance.now() };

      const found = findNodeUnderMouse(mouseX, mouseY);
      setHoveredStock(found || null);

      if (draggedNodeRef.current) {
        setDraggedNodePosition(draggedNodeRef.current, mouseX, mouseY);
        simulation.alpha(0.1).restart();
      }
    };

    const handleMouseUp = () => {
      isPointerDown = false;
      if (draggedNodeRef.current) {
        const node = draggedNodeRef.current;
        const last = lastMousePosRef.current;
        const prev = prevMousePosRef.current;
        node.fx = null;
        node.fy = null;
        if (last && prev) {
          // Usa dt real, mas limita mínimo e máximo para evitar bugs
          let dt = (last.t - prev.t) / 1000;
          if (!isFinite(dt) || dt <= 0) dt = 0.016;
          dt = Math.max(0.016, Math.min(dt, 0.12)); // entre 16ms e 120ms
          // Calcula velocidade baseada no movimento real do mouse
          let vx = (last.x - prev.x) / dt;
          let vy = (last.y - prev.y) / dt;
          // Limita velocidade máxima para evitar "arremessos" exagerados
          const maxV = 350;
          const minV = -350;
          vx = Math.max(Math.min(vx, maxV), minV);
          vy = Math.max(Math.min(vy, maxV), minV);
          // Aplica um fator de suavização
          const throwFactor = 0.22; // menor = mais suave
          node.vx = vx * throwFactor;
          node.vy = vy * throwFactor;
        }
        draggedNodeRef.current = null;
        simulation.alphaTarget(0.4);
        let alphaDecay = 0.4;
        const decayStep = 0.01;
        const decayInterval = setInterval(() => {
          alphaDecay -= decayStep;
          if (alphaDecay <= 0.02) {
            simulation.alphaTarget(0.02);
            clearInterval(decayInterval);
          } else {
            simulation.alphaTarget(alphaDecay);
          }
        }, 70);
      }
    };

    const handleMouseLeave = () => {
      setHoveredStock(null);
      setMousePosition(null);
      isPointerDown = false;
      if (draggedNodeRef.current) {
        draggedNodeRef.current.fx = null;
        draggedNodeRef.current.fy = null;
        draggedNodeRef.current = null;
        simulation.alphaTarget(0.02);
      }
    };

    canvas.addEventListener('mousedown', handleMouseDown);
    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('mouseup', handleMouseUp);
    canvas.addEventListener('mouseleave', handleMouseLeave);

    draw();
    simulation.alpha(0.5).restart();

    const animate = () => {
      draw();
      animationFrameId = requestAnimationFrame(animate);
    };
    animationFrameId = requestAnimationFrame(animate);

    const handleResize = () => {
      const dimensions = resizeCanvas();
      simulation.force('center', forceCenter(dimensions.width / 2, dimensions.height / 2));
      simulation.alpha(0.5).restart();
    };

    window.addEventListener('resize', handleResize);

    return () => {
      simulation.stop();
      cancelAnimationFrame(animationFrameId);
      canvas.removeEventListener('mousedown', handleMouseDown);
      canvas.removeEventListener('mousemove', handleMouseMove);
      canvas.removeEventListener('mouseup', handleMouseUp);
      canvas.removeEventListener('mouseleave', handleMouseLeave);
      window.removeEventListener('resize', handleResize);
    };
  }, [stocks, period]);
  // Loga informações sempre que hoveredStock mudar (quando o cursor vira pointer)
  useEffect(() => {
    // ...
  }, [hoveredStock, mousePosition]);

  return { canvasRef, hoveredStock, mousePosition, cursor: hoveredStock ? 'pointer' : 'default' };
}