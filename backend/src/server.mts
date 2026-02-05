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
  logourl?: string;
}

let cache: StockData[] | null = null;
let cacheTime: number = 0;
const CACHE_TTL = 60 * 1000; // 60 seconds

const BRAPI_TOKEN = '987eHpW6FghLqirmFAgBcv';

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
    console.error('[fetchAllTickers] Erro:', err);
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
    // Para performance, já pedir só os 100 primeiros
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
    return sorted.map((q: any) => ({
      symbol: q.symbol,
      name: q.shortName || q.longName || q.symbol || '',
      price: q.regularMarketPrice ?? 0,
      changePercent: q.regularMarketChangePercent ?? 0,
      volume: q.regularMarketVolume ?? 0,
      marketCap: q.marketCap ?? 0,
      absChange: Math.abs(q.regularMarketChangePercent ?? 0),
      isPositive: (q.regularMarketChangePercent ?? 0) >= 0,
      logourl: q.logourl ?? '',
    }));
  } catch (err) {
    console.error('[fetchStockData] Erro ao buscar dados do brapi.dev:', err);
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
import cors from '@fastify/cors';
fastify.register(cors, {
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
