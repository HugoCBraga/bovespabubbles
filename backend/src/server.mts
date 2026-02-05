
import 'dotenv/config';
import Fastify from 'fastify';


const fastify = Fastify({ logger: true });

// Cache in memory
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
}

let cache: StockData[] | null = null;
let cacheTime: number = 0;
const CACHE_TTL = parseInt(process.env.CACHE_TTL_MS || '300000', 10); // default 5 min

const BRAPI_TOKEN = process.env.BRAPI_TOKEN || '';

// Função para buscar todos os tickers disponíveis na B3
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
    // Erro silenciado em produção
    return [];
  }
}

import fetch from 'node-fetch';

async function fetchStockData(): Promise<StockData[]> {
  try {
    // 1. Buscar todos os tickers disponíveis
    const allTickers = await fetchAllTickers();
    if (!allTickers.length) return [];

    // 2. Buscar marketCap de todos (em lotes de 100, mas vamos pegar só os 100 maiores)
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
    // Ordenar por marketCap decrescente e pegar os 100 maiores
    const sorted = data.results
      .filter((q: any) => typeof q.marketCap === 'number' && q.marketCap > 0)
      .sort((a: any, b: any) => b.marketCap - a.marketCap)
      .slice(0, 100);

    // Para cada ativo, buscar histórico e calcular variações
    const periods = {
      '1H': 1,
      '1D': 1,
      '1W': 7,
      '1M': 30,
      '1Y': 365
    };

    // Buscar histórico de todos os ativos em lote
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
      let variations = { '1H': null, '1D': null, '1W': null, '1M': null, '1Y': null };
      const history = historyData[q.symbol] || null;
      if (history && Array.isArray(history) && history.length > 0) {
        const now = new Date();
        const todayStr = now.toISOString().slice(0, 10); // 'YYYY-MM-DD'
        // 1D: (preço atual - open do dia) / open do dia * 100
        let openDia = typeof q.regularMarketOpen === 'number' ? q.regularMarketOpen : null;
        let precoAtual = typeof q.regularMarketPrice === 'number' ? q.regularMarketPrice : null;
        if (openDia !== null && precoAtual !== null) {
          variations['1D'] = ((precoAtual - openDia) / openDia) * 100;
        }

        // Helper para pegar o open do dia N dias atrás (útil para 1W, 1M, 1Y)
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

        // 1W: abertura de 6 dias atrás
        const openW = getOpenNDaysAgo(6);
        if (openW !== null && precoAtual !== null) {
          variations['1W'] = ((precoAtual - openW) / openW) * 100;
        }
        // 1M: abertura de 30 dias atrás
        const openM = getOpenNDaysAgo(30);
        if (openM !== null && precoAtual !== null) {
          variations['1M'] = ((precoAtual - openM) / openM) * 100;
        }
        // 1Y: abertura de 365 dias atrás
        const openY = getOpenNDaysAgo(365);
        if (openY !== null && precoAtual !== null) {
          variations['1Y'] = ((precoAtual - openY) / openY) * 100;
        }
        // 1H não disponível na brapi.dev free, manter null
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
    // Erro silenciado em produção
    return [];
  }
}

fastify.get('/stocks', async (request, reply) => {
  const start = Date.now();
  const periodRaw = (request.query as any).period || '1D';
  const period = periodRaw.toUpperCase();
  const validPeriods = ['1H', '1D', '1W', '1M', '1Y', 'MARKETCAP'];
  if (!validPeriods.includes(period)) {
    reply.status(400).send({ error: 'Período inválido' });
    return;
  }
  // ...
  // Cache só para 1D (pode expandir depois)
  const now = Date.now();
  if (cache && (now - cacheTime) < CACHE_TTL && period === '1D') {
    // ...
    return cache.map(stock => ({
      symbol: stock.symbol,
      name: stock.name,
      price: stock.price,
      volume: stock.volume,
      marketCap: stock.marketCap,
      logourl: stock.logourl,
      variations: stock.variations,
      variation: period === 'MARKETCAP' ? null : stock.variations[period],
      regularMarketOpen: (stock as any).regularMarketOpen ?? null,
      regularMarketTime: (stock as any).regularMarketTime ?? null
    }));
  }
  const apiStart = Date.now();
  const all = await fetchStockData();
  const apiEnd = Date.now();
  // ...
  cache = all;
  cacheTime = now;
  const processStart = Date.now();
  const result = all.map(stock => {
    const v = period === 'MARKETCAP' ? null : stock.variations[period];
    return {
      symbol: stock.symbol,
      name: stock.name,
      price: stock.price,
      volume: stock.volume,
      marketCap: stock.marketCap,
      logourl: stock.logourl,
      variations: stock.variations,
      variation: v,
      regularMarketOpen: (stock as any).regularMarketOpen ?? null,
      regularMarketTime: (stock as any).regularMarketTime ?? null
    };
  });
  const processEnd = Date.now();
  // ...
  return result;
});

// CORS
import cors from '@fastify/cors';
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
