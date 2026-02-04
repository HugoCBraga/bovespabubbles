import { useRef, useEffect, useState } from 'react';
import * as d3 from 'd3';
import { Stock } from '../types/Stock';
import { createSimulation } from './BubbleSimulation';
import { renderBubbles } from './BubbleRenderer';

export function useBubbleCanvas(stocks: Stock[]) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [hoveredStock, setHoveredStock] = useState<Stock | null>(null);
  const [mousePosition, setMousePosition] = useState<{ x: number; y: number } | null>(null);
  const transformRef = useRef(d3.zoomIdentity);
  const draggedNodeRef = useRef<Stock | null>(null);

  useEffect(() => {
    if (!canvasRef.current || stocks.length === 0) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width = window.innerWidth;
    const height = canvas.height = window.innerHeight;

    // Scales
    const marketCaps = stocks.map(d => d.marketCap).filter(v => v > 0);
    const sizeScale = d3.scaleSqrt()
      .domain(d3.extent(marketCaps) as [number, number])
      .range([10, 120]);

    // Add radius
    stocks.forEach(stock => {
      stock.radius = sizeScale(stock.marketCap);
    });

    // Simulation
    const simulation = createSimulation(stocks, width, height);

    const draw = () => {
      ctx.save();
      ctx.clearRect(0, 0, width, height);
      ctx.translate(transformRef.current.x, transformRef.current.y);
      ctx.scale(transformRef.current.k, transformRef.current.k);
      renderBubbles(ctx, stocks, hoveredStock);
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

    // Initialize positions
    stocks.forEach(stock => {
      if (stock.x === undefined) stock.x = Math.random() * width;
      if (stock.y === undefined) stock.y = Math.random() * height;
    });

    // Zoom
    const zoom = d3.zoom<HTMLCanvasElement, unknown>()
      .scaleExtent([0.5, 5])
      .on('zoom', (event) => {
        transformRef.current = event.transform;
        draw();
      });

    d3.select(canvas).call(zoom);

    // Mouse events
    const handleMouseDown = (event: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      const mouseX = event.clientX - rect.left;
      const mouseY = event.clientY - rect.top;

      const node = findNodeUnderMouse(mouseX, mouseY);
      if (node) {
        draggedNodeRef.current = node;
        node.fx = node.x;
        node.fy = node.y;
        simulation.alphaTarget(0.3).restart();
      }
    };

    const handleMouseMove = (event: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      const mouseX = event.clientX - rect.left;
      const mouseY = event.clientY - rect.top;

      setMousePosition({ x: event.clientX, y: event.clientY });

      if (draggedNodeRef.current) {
        // Update dragged node position
        const adjustedX = (mouseX - transformRef.current.x) / transformRef.current.k;
        const adjustedY = (mouseY - transformRef.current.y) / transformRef.current.k;
        draggedNodeRef.current.fx = adjustedX;
        draggedNodeRef.current.fy = adjustedY;
        simulation.alpha(0.3).restart();
      } else {
        // Normal hover detection
        const found = findNodeUnderMouse(mouseX, mouseY);
        setHoveredStock(found || null);
      }
    };

    const handleMouseUp = () => {
      if (draggedNodeRef.current) {
        draggedNodeRef.current.fx = null;
        draggedNodeRef.current.fy = null;
        draggedNodeRef.current = null;
        simulation.alphaTarget(0.03);
      }
    };

    const handleMouseLeave = () => {
      setHoveredStock(null);
      setMousePosition(null);
      if (draggedNodeRef.current) {
        draggedNodeRef.current.fx = null;
        draggedNodeRef.current.fy = null;
        draggedNodeRef.current = null;
        simulation.alphaTarget(0.03);
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

    return () => {
      simulation.stop();
      canvas.removeEventListener('mousedown', handleMouseDown);
      canvas.removeEventListener('mousemove', handleMouseMove);
      canvas.removeEventListener('mouseup', handleMouseUp);
      canvas.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, [stocks, hoveredStock]);

  return { canvasRef, hoveredStock, mousePosition };
}