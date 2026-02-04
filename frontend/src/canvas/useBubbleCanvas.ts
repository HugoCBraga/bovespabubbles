import { useRef, useEffect, useState } from 'react';
import { zoom, zoomIdentity, select, forceCenter, extent, scaleSqrt } from 'd3';
import { Stock } from '../types/Stock';
import { createSimulation } from './BubbleSimulation';
import { renderBubbles } from './BubbleRenderer';

export function useBubbleCanvas(stocks: Stock[]) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [hoveredStock, setHoveredStock] = useState<Stock | null>(null);
  const [mousePosition, setMousePosition] = useState<{ x: number; y: number } | null>(null);
  const transformRef = useRef(zoomIdentity);
  const draggedNodeRef = useRef<Stock | null>(null);

  useEffect(() => {
    if (!canvasRef.current || stocks.length === 0) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    let animationFrameId = 0;
    let isPointerDown = false;
    let backgroundRepulse: { x: number; y: number; strength: number } | null = null;
    let previousTime = 0;

    const resizeCanvas = () => {
      const parent = canvas.parentElement;
      if (!parent) return { width: window.innerWidth, height: window.innerHeight };
      const { width, height } = parent.getBoundingClientRect();
      canvas.width = width;
      canvas.height = height;
      return { width, height };
    };

    const { width, height } = resizeCanvas();

    // Scales
    const marketCaps = stocks.map(d => d.marketCap).filter(v => v > 0);
    const sizeScale = scaleSqrt()
      .domain(extent(marketCaps) as [number, number])
      .range([10, 120]);

    // Add radius
    stocks.forEach(stock => {
      stock.radius = sizeScale(stock.marketCap);
    });

    const applyFloatingMotion = (deltaSeconds: number) => {
      const amplitude = 0.5;
      const speed = 1.5;
      stocks.forEach(stock => {
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
      });
    };

    const applyBackgroundRepulse = () => {
      if (!backgroundRepulse) return;
      const { x, y, strength } = backgroundRepulse;
      const falloff = 140;
      stocks.forEach(stock => {
        if (stock.x === undefined || stock.y === undefined) return;
        const dx = stock.x - x;
        const dy = stock.y - y;
        const distance = Math.max(Math.sqrt(dx * dx + dy * dy), 12);
        const power = Math.max(0, 1 - distance / falloff);
        const force = strength * power;
        if (stock.vx !== undefined) {
          stock.vx += (dx / distance) * force;
        }
        if (stock.vy !== undefined) {
          stock.vy += (dy / distance) * force;
        }
      });
      backgroundRepulse.strength *= 0.92;
      if (backgroundRepulse.strength < 0.05) {
        backgroundRepulse = null;
      }
    };

    // Simulation
    const simulation = createSimulation(stocks, width, height);

    const draw = () => {
      const now = performance.now();
      const deltaSeconds = Math.min(0.05, (now - previousTime) / 1000);
      previousTime = now;
      applyFloatingMotion(deltaSeconds);
      applyBackgroundRepulse();
      ctx.save();
      ctx.clearRect(0, 0, width, height);
      ctx.translate(transformRef.current.x, transformRef.current.y);
      ctx.scale(transformRef.current.k, transformRef.current.k);
      renderBubbles(ctx, stocks, hoveredStock, draggedNodeRef.current);
      ctx.restore();
    };

    simulation.on('tick', draw);

    // Helper function to find node under mouse
    const findNodeUnderMouse = (mouseX: number, mouseY: number) => {
      const adjustedX = (mouseX - transformRef.current.x) / transformRef.current.k;
      const adjustedY = (mouseY - transformRef.current.y) / transformRef.current.k;

      return stocks.find(stock => {
        const dx = adjustedX - stock.x!;
        const dy = adjustedY - stock.y!;
        const distance = Math.sqrt(dx * dx + dy * dy);
        return distance < stock.radius;
      });
    };

    const setDraggedNodePosition = (node: Stock, mouseX: number, mouseY: number) => {
      const adjustedX = (mouseX - transformRef.current.x) / transformRef.current.k;
      const adjustedY = (mouseY - transformRef.current.y) / transformRef.current.k;
      const dx = adjustedX - (node.x ?? adjustedX);
      const dy = adjustedY - (node.y ?? adjustedY);
      const distance = Math.max(Math.sqrt(dx * dx + dy * dy), 1);
      const pull = Math.min(1.0, distance * 0.02);
      node.fx = (node.x ?? adjustedX) + dx * pull;
      node.fy = (node.y ?? adjustedY) + dy * pull;
    };

    // Initialize positions
    stocks.forEach(stock => {
      if (stock.x === undefined) stock.x = Math.random() * width;
      if (stock.y === undefined) stock.y = Math.random() * height;
    });

    // Zoom
    const zoomBehavior = zoom<HTMLCanvasElement, unknown>()
      .scaleExtent([0.5, 5])
      .on('zoom', (event: any) => {
        transformRef.current = event.transform;
        draw();
      });

    select(canvas).call(zoomBehavior);

    // Mouse events
    const handleMouseDown = (event: MouseEvent) => {
      isPointerDown = true;
      const rect = canvas.getBoundingClientRect();
      const mouseX = event.clientX - rect.left;
      const mouseY = event.clientY - rect.top;

      const node = findNodeUnderMouse(mouseX, mouseY);
      if (node) {
        draggedNodeRef.current = node;
        setDraggedNodePosition(node, mouseX, mouseY);
        simulation.alphaTarget(0.45).restart();
      } else {
        const adjustedX = (mouseX - transformRef.current.x) / transformRef.current.k;
        const adjustedY = (mouseY - transformRef.current.y) / transformRef.current.k;
        backgroundRepulse = { x: adjustedX, y: adjustedY, strength: 2.8 };
        simulation.alphaTarget(0.2).restart();
      }
    };

    const handleMouseMove = (event: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      const mouseX = event.clientX - rect.left;
      const mouseY = event.clientY - rect.top;

      setMousePosition({ x: event.clientX, y: event.clientY });

      if (draggedNodeRef.current) {
        setDraggedNodePosition(draggedNodeRef.current, mouseX, mouseY);
        simulation.alpha(0.5).restart();
      } else {
        // Normal hover detection
        const found = findNodeUnderMouse(mouseX, mouseY);
        setHoveredStock(found || null);
        if (isPointerDown) {
          const adjustedX = (mouseX - transformRef.current.x) / transformRef.current.k;
          const adjustedY = (mouseY - transformRef.current.y) / transformRef.current.k;
          backgroundRepulse = { x: adjustedX, y: adjustedY, strength: 2.5 };
          simulation.alphaTarget(0.2).restart();
        }
      }
    };

    const handleMouseUp = () => {
      isPointerDown = false;
      if (draggedNodeRef.current) {
        draggedNodeRef.current.fx = null;
        draggedNodeRef.current.fy = null;
        draggedNodeRef.current = null;
        simulation.alphaTarget(0.08);
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
        simulation.alphaTarget(0.08);
      }
    };

    canvas.addEventListener('mousedown', handleMouseDown);
    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('mouseup', handleMouseUp);
    canvas.addEventListener('mouseleave', handleMouseLeave);

    // Initial draw
    draw();

    // Restart simulation smoothly
    simulation.alpha(1).restart();

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
  }, [stocks, hoveredStock]);

  return { canvasRef, hoveredStock, mousePosition };
}