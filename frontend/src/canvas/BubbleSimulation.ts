import { forceSimulation, forceManyBody, forceCenter, forceCollide, forceX, forceY, forceRadial } from 'd3';
import { Stock } from '../types/Stock';

export function createSimulation(
  nodes: Stock[],
  width: number,
  height: number
) {
  const simulation = forceSimulation(nodes)
    .force('charge', forceManyBody().strength(5))
    .force('center', forceCenter(width / 2, height / 2))
    .force('collision', forceCollide(d => d.radius + 1))
    .force('x', forceX(width / 2).strength(0.01))
    .force('y', forceY(height / 2).strength(0.01))
    .force('radial', forceRadial(0, width / 2, height / 2).strength(0.02))
    .alphaTarget(0.03); // Mantém movimento contínuo

  return simulation;
}