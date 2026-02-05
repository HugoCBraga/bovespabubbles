
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
  // Busca dados reais do Yahoo Finance
  const results: StockData[] = [];
  try {
    // Usa require dinâmico para compatibilidade com CommonJS/TypeScript
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const yahooFinance = require('yahoo-finance2').default;
    const quotes = await yahooFinance.quote(tickers) as any[];
    for (const q of Array.isArray(quotes) ? quotes : [quotes]) {
      if (!q) continue;
      results.push({
        symbol: (q.symbol || '').replace('.SA', ''),
        name: q.shortName || q.longName || q.symbol || '',
        price: q.regularMarketPrice ?? 0,
        changePercent: q.regularMarketChangePercent ?? 0,
        volume: q.regularMarketVolume ?? 0,
        marketCap: q.marketCap ?? 0,
        absChange: Math.abs(q.regularMarketChangePercent ?? 0),
        isPositive: (q.regularMarketChangePercent ?? 0) >= 0,
      });
    }
    return results;
  } catch (err) {
    console.error('[fetchStockData] Erro ao buscar dados do Yahoo Finance:', err);
    return [];
  }
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