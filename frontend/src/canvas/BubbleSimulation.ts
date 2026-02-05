import { forceSimulation, forceManyBody, forceCenter, forceCollide, forceX, forceY } from 'd3';
import { Stock } from '../types/Stock';

export function createSimulation(
  nodes: Stock[],
  width: number,
  height: number
) {
  nodes.forEach(node => {
    if (node.floatPhase === undefined) {
      node.floatPhase = Math.random() * Math.PI * 2;
    }
  });

  const simulation = forceSimulation(nodes)
    .force('charge', forceManyBody().strength(6))
    .force('center', forceCenter(width / 2, height / 2).strength(0))
    .force('collision', forceCollide<Stock>(d => d.radius + 2).iterations(2))
    .force('x', forceX(width / 2).strength(0))
    .force('y', forceY(height / 2).strength(0))
    .alphaTarget(0.02)
    .velocityDecay(0.5);

  return simulation;
}