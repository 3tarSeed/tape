import { createServerFn } from "@tanstack/react-start";
import { INSTRUMENTS, type Quote } from "@/lib/instruments";

type YahooMeta = {
  regularMarketPrice?: number;
  chartPreviousClose?: number;
  previousClose?: number;
};

let cache: { at: number; quotes: Quote[] } | null = null;
const TTL_MS = 25_000;

async function fetchYahoo(symbol: string) {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=5d`;
  const res = await fetch(url, {
    headers: {
      Accept: "application/json",
      "User-Agent": "Mozilla/5.0",
    },
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) return null;
  const data = (await res.json()) as {
    chart?: { result?: Array<{ meta?: YahooMeta }> | null };
  };
  const meta = data.chart?.result?.[0]?.meta;
  const price = meta?.regularMarketPrice;
  const prev = meta?.chartPreviousClose ?? meta?.previousClose;
  if (typeof price !== "number" || typeof prev !== "number" || prev === 0 || price <= 0) {
    return null;
  }
  return { price, prev };
}

async function loadQuotes(): Promise<Quote[]> {
  const settled = await Promise.all(
    INSTRUMENTS.map(async (instrument) => {
      try {
        const raw = await fetchYahoo(instrument.yahoo);
        if (!raw) return null;
        const price = instrument.invert ? 1 / raw.price : raw.price;
        const prev = instrument.invert ? 1 / raw.prev : raw.prev;
        const changePct = ((price - prev) / prev) * 100;
        if (!Number.isFinite(price) || !Number.isFinite(changePct)) return null;
        const quote: Quote = {
          id: instrument.id,
          symbol: instrument.symbol,
          name: instrument.name,
          group: instrument.group,
          price,
          changePct,
          digits: instrument.digits,
        };
        return quote;
      } catch {
        return null;
      }
    }),
  );
  return settled.filter((quote): quote is Quote => quote !== null);
}

export const getQuotes = createServerFn({ method: "GET" }).handler(async () => {
  const now = Date.now();
  if (cache && now - cache.at < TTL_MS) return cache.quotes;
  try {
    const quotes = await loadQuotes();
    if (quotes.length === 0) {
      if (cache) return cache.quotes;
      throw new Error("Quote feed returned nothing");
    }
    cache = { at: now, quotes };
    return quotes;
  } catch (error) {
    if (cache) return cache.quotes;
    throw error;
  }
});

type YahooNews = { news?: Array<{ title?: string }> };

let newsCache: { at: number; titles: string[] } | null = null;
const NEWS_TTL_MS = 120_000;

async function loadHeadlines(): Promise<string[]> {
  const url = "https://query1.finance.yahoo.com/v1/finance/search?q=markets&newsCount=12&quotesCount=0";
  const res = await fetch(url, {
    headers: {
      Accept: "application/json",
      "User-Agent": "Mozilla/5.0",
    },
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) return [];
  const data = (await res.json()) as YahooNews;
  return (data.news ?? [])
    .map((item) => (item.title ?? "").replace(/\s+/g, " ").trim())
    .filter((title) => title.length > 0)
    .slice(0, 12);
}

export const getHeadlines = createServerFn({ method: "GET" }).handler(async () => {
  const now = Date.now();
  if (newsCache && now - newsCache.at < NEWS_TTL_MS) return newsCache.titles;
  try {
    const titles = await loadHeadlines();
    if (titles.length === 0) return newsCache?.titles ?? [];
    newsCache = { at: now, titles };
    return titles;
  } catch {
    return newsCache?.titles ?? [];
  }
});
