import * as d3 from 'd3';
import { Stock } from '../types/Stock';

export function createSimulation(
  nodes: Stock[],
  width: number,
  height: number
) {
  const simulation = d3.forceSimulation(nodes)
    .force('charge', d3.forceManyBody().strength(5))
    .force('center', d3.forceCenter(width / 2, height / 2))
    .force('collision', d3.forceCollide(d => d.radius + 1))
    .force('x', d3.forceX(width / 2).strength(0.01))
    .force('y', d3.forceY(height / 2).strength(0.01))
    .force('radial', d3.forceRadial(0, width / 2, height / 2).strength(0.02))
    .alphaTarget(0.03); // Mantém movimento contínuo

  return simulation;
}