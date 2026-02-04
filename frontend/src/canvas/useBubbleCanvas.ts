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
    const zoomBehavior = zoom<HTMLCanvasElement, unknown>()
      .scaleExtent([0.5, 5])
      .on('zoom', (event: any) => {
        transformRef.current = event.transform;
        draw();
      });

    select(canvas).call(zoomBehavior);

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

    const handleResize = () => {
      const dimensions = resizeCanvas();
      simulation.force('center', forceCenter(dimensions.width / 2, dimensions.height / 2));
      simulation.alpha(0.5).restart();
    };

    window.addEventListener('resize', handleResize);

    return () => {
      simulation.stop();
      canvas.removeEventListener('mousedown', handleMouseDown);
      canvas.removeEventListener('mousemove', handleMouseMove);
      canvas.removeEventListener('mouseup', handleMouseUp);
      canvas.removeEventListener('mouseleave', handleMouseLeave);
      window.removeEventListener('resize', handleResize);    };
  }, [stocks, hoveredStock]);

  return { canvasRef, hoveredStock, mousePosition };
}