
import 'dotenv/config';
import Fastify from 'fastify';
import fetch from 'node-fetch';
import cors from '@fastify/cors';

const fastify = Fastify({ logger: true });

interface StockData {
  symbol: string;
  name: string;
  price: number;
  volume: number;
  marketCap: number;
  logourl?: string;
  variations: {
    '1H': number | null;
    '1D': number | null;
    '1W': number | null;
    '1M': number | null;
    '1Y': number | null;
  };
  regularMarketOpen?: number | null;
  regularMarketTime?: string | null;
}

let cache: StockData[] | null = null;
let cacheTime: number = 0;
const CACHE_TTL = parseInt(process.env.CACHE_TTL_MS || '300000', 10); // default 5 min

const BRAPI_TOKEN = process.env.BRAPI_TOKEN || '';

async function fetchAllTickers(): Promise<string[]> {
  try {
    const url = 'https://brapi.dev/api/quote/list';
    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${BRAPI_TOKEN}` }
    });
    if (!response.ok) throw new Error('Erro ao buscar lista de tickers');
    const data = await response.json();
    // Filtra apenas ações brasileiras (type: 'stock')
    return (data.stocks || [])
      .filter((s: any) => s.type === 'stock' && /^[A-Z]{4}\d{1,2}$/.test(s.stock))
      .map((s: any) => s.stock);
  } catch (err) {
    return [];
  }
}

async function fetchStockData(): Promise<StockData[]> {
  try {
    const allTickers = await fetchAllTickers();
    if (!allTickers.length) return [];

    const tickers100 = allTickers.slice(0, 100);
    const url = `https://brapi.dev/api/quote/${tickers100.join(',')}`;
    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${BRAPI_TOKEN}` }
    });
    if (!response.ok) {
      throw new Error(`brapi.dev error: ${response.status} ${response.statusText}`);
    }
    const data = await response.json();
    if (!data.results) return [];

    const sorted = data.results
      .filter((q: any) => typeof q.marketCap === 'number' && q.marketCap > 0)
      .sort((a: any, b: any) => b.marketCap - a.marketCap)
      .slice(0, 100);

    const historyUrl = `https://brapi.dev/api/quote/${sorted.map((q: any) => q.symbol).join(',')}?range=1y&interval=1d`;
    const historyResp = await fetch(historyUrl, { headers: { Authorization: `Bearer ${BRAPI_TOKEN}` } });
    let historyData: Record<string, any[]> = {};
    if (historyResp.ok) {
      const historyJson = await historyResp.json();
      if (historyJson.results && Array.isArray(historyJson.results)) {
        for (const item of historyJson.results) {
          if (item.symbol && item.historicalDataPrice) {
            historyData[item.symbol] = item.historicalDataPrice;
          }
        }
      }
    }

    const results: StockData[] = [];
    for (const q of sorted) {
      const variations: StockData['variations'] = {
        '1H': null,
        '1D': null,
        '1W': null,
        '1M': null,
        '1Y': null
      };
      const history = historyData[q.symbol] || null;
      if (history && Array.isArray(history) && history.length > 0) {
        const now = new Date();
        let openDia = typeof q.regularMarketOpen === 'number' ? q.regularMarketOpen : null;
        let precoAtual = typeof q.regularMarketPrice === 'number' ? q.regularMarketPrice : null;
        if (openDia !== null && precoAtual !== null) {
          variations['1D'] = ((precoAtual - openDia) / openDia) * 100;
        }

        function getOpenNDaysAgo(daysAgo: number) {
          const target = new Date(now);
          target.setDate(target.getDate() - daysAgo);
          const targetStr = target.toISOString().slice(0, 10);
          for (let i = history.length - 1; i >= 0; i--) {
            const h = history[i];
            const d = new Date(h.date * 1000);
            const dStr = d.toISOString().slice(0, 10);
            if (dStr === targetStr) {
              return h.open;
            }
          }
          return null;
        }

        const openW = getOpenNDaysAgo(6);
        if (openW !== null && precoAtual !== null) {
          variations['1W'] = ((precoAtual - openW) / openW) * 100;
        }

        const openM = getOpenNDaysAgo(30);
        if (openM !== null && precoAtual !== null) {
          variations['1M'] = ((precoAtual - openM) / openM) * 100;
        }

        const openY = getOpenNDaysAgo(365);
        if (openY !== null && precoAtual !== null) {
          variations['1Y'] = ((precoAtual - openY) / openY) * 100;
        }
      }
      const stockObj = {
        symbol: q.symbol,
        name: q.shortName || q.longName || q.symbol || '',
        price: q.regularMarketPrice ?? 0,
        volume: q.regularMarketVolume ?? 0,
        marketCap: q.marketCap ?? 0,
        logourl: q.logourl ?? '',
        variations,
        regularMarketOpen: q.regularMarketOpen ?? null,
        regularMarketTime: q.regularMarketTime ?? null
      };
      results.push(stockObj);
    }
    return results;
  } catch (err) {
    return [];
  }
}

function mapStockToResponse(stock: StockData, period: string) {
  const validPeriodKeys = ['1H', '1D', '1W', '1M', '1Y'] as const;
  type PeriodKey = typeof validPeriodKeys[number];
  
  return {
    symbol: stock.symbol,
    name: stock.name,
    price: stock.price,
    volume: stock.volume,
    marketCap: stock.marketCap,
    logourl: stock.logourl,
    variations: stock.variations,
    variation: period === 'MARKETCAP' ? null : stock.variations[period as PeriodKey],
    regularMarketOpen: stock.regularMarketOpen ?? null,
    regularMarketTime: stock.regularMarketTime ?? null
  };
}

fastify.get('/stocks', async (request, reply) => {
  const periodRaw = (request.query as any).period || '1D';
  const period = periodRaw.toUpperCase();
  const validPeriods = ['1H', '1D', '1W', '1M', '1Y', 'MARKETCAP'];
  
  if (!validPeriods.includes(period)) {
    reply.status(400).send({ error: 'Período inválido' });
    return;
  }

  const now = Date.now();
  if (cache && (now - cacheTime) < CACHE_TTL && period === '1D') {
    return cache.map(stock => mapStockToResponse(stock, period));
  }

  const all = await fetchStockData();
  cache = all;
  cacheTime = now;

  return all.map(stock => mapStockToResponse(stock, period));
});

fastify.register(cors, {
  origin: ['http://localhost:3000', 'http://localhost:3001'],
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
