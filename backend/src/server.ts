import Fastify from 'fastify';

const fastify = Fastify({ logger: true });

// Cache in memory
interface StockData {
  symbol: string;
  name: string;
  price: number;
  changePercent: number;
  volume: number;
  marketCap: number;
  absChange: number;
  isPositive: boolean;
}

let cache: StockData[] | null = null;
let cacheTime: number = 0;
const CACHE_TTL = 60 * 1000; // 60 seconds

const tickers = ['PETR4.SA', 'VALE3.SA', 'ITUB4.SA', 'BBDC4.SA', 'WEGE3.SA', 'MGLU3.SA', 'ABEV3.SA', 'PETR3.SA', 'ITSA4.SA', 'JBSS3.SA'];

async function fetchStockData(): Promise<StockData[]> {
  // Mock data for testing
  const data = [
    { symbol: 'PETR4', name: 'Petrobras', price: 25.0, changePercent: 1.5, volume: 1000000, marketCap: 500000000 },
    { symbol: 'VALE3', name: 'Vale', price: 60.0, changePercent: -0.8, volume: 2000000, marketCap: 300000000 },
    { symbol: 'ITUB4', name: 'Itaú', price: 30.0, changePercent: 0.5, volume: 1500000, marketCap: 200000000 },
    { symbol: 'BBDC4', name: 'Bradesco', price: 15.0, changePercent: -1.2, volume: 800000, marketCap: 150000000 },
    { symbol: 'WEGE3', name: 'Weg', price: 40.0, changePercent: 2.0, volume: 500000, marketCap: 100000000 },
  ];
  return data.map(stock => ({
    ...stock,
    absChange: Math.abs(stock.changePercent),
    isPositive: stock.changePercent >= 0,
  }));
}

fastify.get('/stocks', async (request, reply) => {
  const now = Date.now();
  if (cache && (now - cacheTime) < CACHE_TTL) {
    return cache;
  }
  cache = await fetchStockData();
  cacheTime = now;
  return cache;
});

// CORS
fastify.register(require('@fastify/cors'), {
  origin: 'http://localhost:3001',
});

const start = async () => {
  try {
    await fastify.listen({ port: 3001, host: '0.0.0.0' });
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();