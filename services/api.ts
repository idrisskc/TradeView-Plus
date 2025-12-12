
import { CandleData, Interval, SymbolInfo } from '../types';
import { generateCandleData } from './mockData';

const BINANCE_API_BASE = 'https://api.binance.com/api/v3';
const YAHOO_BASE = 'https://query1.finance.yahoo.com/v8/finance/chart';
const YAHOO_QUOTE_BASE = 'https://query1.finance.yahoo.com/v7/finance/quote';
const YAHOO_SEARCH_BASE = 'https://query1.finance.yahoo.com/v1/finance/search';

// Switch to corsproxy.io for better real-time performance
const CORS_PROXY = 'https://corsproxy.io/?';
const FETCH_TIMEOUT = 8000; // Increased to 8 seconds to reduce premature timeouts

// Helper: Fetch with timeout to prevent hanging
const fetchWithTimeout = async (url: string, options: RequestInit = {}) => {
  const controller = new AbortController();
  const id = setTimeout(() => {
    // Provide a reason for the abort to avoid "signal is aborted without reason" warnings
    controller.abort('Request timed out'); 
  }, FETCH_TIMEOUT);
  
  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    clearTimeout(id);
    if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
    }
    return response;
  } catch (error: any) {
    clearTimeout(id);
    // Normalize AbortError to a cleaner message or rethrow
    if (error.name === 'AbortError') {
      throw new Error('Request timed out');
    }
    throw error;
  }
};

// Binance Interval Mapping
const binanceIntervals: Record<Interval, string> = {
  '1m': '1m', '5m': '5m', '15m': '15m',
  '1H': '1h', '4H': '4h',
  '1D': '1d', '1W': '1w', '1M': '1M', 
  '1Y': '1M' // Binance doesn't support 1Y candles, fallback to 1M
};

// Yahoo Interval Mapping
const yahooIntervals: Record<Interval, string> = {
  '1m': '1m', '5m': '5m', '15m': '15m',
  '1H': '60m', '4H': '60m', 
  '1D': '1d', '1W': '1wk', '1M': '1mo', '1Y': '1mo',
};

// Yahoo Range Mapping
const yahooRanges: Record<Interval, string> = {
  '1m': '1d', '5m': '5d', '15m': '5d',
  '1H': '1mo', '4H': '1mo',
  '1D': '1y', '1W': '2y', '1M': '5y', '1Y': '10y',
};

// Helper to ensure numbers are valid
const safeParseFloat = (val: any): number => {
  const num = parseFloat(val);
  return isFinite(num) ? num : 0;
};

// Helper: Normalize ticker for Binance
const getBinanceSymbol = (ticker: string): string => {
  let sym = ticker.toUpperCase().replace(/[^A-Z0-9]/g, '');
  
  if (sym === 'BTC') return 'BTCUSDT';
  if (sym === 'ETH') return 'ETHUSDT';
  if (sym === 'SOL') return 'SOLUSDT';
  
  if (sym.endsWith('USD') && !sym.endsWith('BUSD') && !sym.endsWith('USDT')) {
    return sym.replace('USD', 'USDT');
  }
  
  if (!sym.endsWith('USDT') && !sym.endsWith('BUSD') && !sym.endsWith('BTC') && !sym.endsWith('ETH')) {
    return `${sym}USDT`;
  }
  
  return sym;
};

// Helper: Ticker to Yahoo Symbol
const getYahooSymbol = (symbol: SymbolInfo): string => {
  // Forex needs =X suffix (e.g., EURUSD=X)
  if (symbol.type === 'forex') {
    if (symbol.ticker.includes('=X')) return symbol.ticker;
    // Common standard for 6 char pairs like EURUSD
    if (symbol.ticker.length === 6 && !symbol.ticker.includes('/')) {
        return `${symbol.ticker}=X`;
    }
    return symbol.ticker; 
  }
  
  if (symbol.type === 'futures') {
    if (symbol.ticker === 'ES1!') return 'ES=F';
    if (!symbol.ticker.endsWith('=F')) return `${symbol.ticker}=F`;
    return symbol.ticker;
  }
  
  if (symbol.type === 'crypto') {
    // Yahoo expects BTC-USD, not BTCUSD
    if (!symbol.ticker.includes('-')) {
        if (symbol.ticker.endsWith('USD')) {
            return symbol.ticker.replace('USD', '-USD');
        }
        if (symbol.ticker.endsWith('USDT')) {
            return symbol.ticker.replace('USDT', '-USD');
        }
    }
    return symbol.ticker;
  }
  
  // Standard stocks/ETFs
  return symbol.ticker.replace(/\./g, '-'); // BRK.B -> BRK-B
};

export const searchYahooSymbols = async (query: string): Promise<SymbolInfo[]> => {
  if (!query) return [];
  try {
    const url = `${YAHOO_SEARCH_BASE}?q=${query}&quotesCount=20&newsCount=0&enableFuzzyQuery=false&quotesQueryId=tss_match_phrase_query`;
    const encodedUrl = encodeURIComponent(url);
    const response = await fetchWithTimeout(`${CORS_PROXY}${encodedUrl}`);
    if (response.ok) {
      const data = await response.json();
      if (data && data.quotes && Array.isArray(data.quotes)) {
        return data.quotes
          .filter((q: any) => q && q.quoteType && q.quoteType !== 'OPTION' && q.quoteType !== 'MUTUALFUND')
          .map((q: any) => {
             let type: SymbolInfo['type'] = 'stock';
             if (q.quoteType === 'ETF') type = 'etf';
             if (q.quoteType === 'CURRENCY') type = 'forex';
             if (q.quoteType === 'CRYPTOCURRENCY') type = 'crypto';
             if (q.quoteType === 'FUTURE') type = 'futures';
             if (q.quoteType === 'INDEX') type = 'stock';

             let exchange = q.exchange || 'Unknown';
             if (exchange === 'NMS' || exchange === 'NGM') exchange = 'NASDAQ';
             if (exchange === 'NYQ') exchange = 'NYSE';
             if (exchange === 'CCC') exchange = 'CRYPTO';

             return {
               ticker: (q.symbol || '').replace('=X', ''),
               name: q.shortname || q.longname || q.symbol || 'Unknown',
               exchange: exchange,
               type: type,
               price: 0, 
               change: 0,
               changePercent: 0,
               volume: 0
             } as SymbolInfo;
          });
      }
    }
  } catch (e) {
    console.warn("Yahoo search failed", e);
  }
  return [];
};

export const fetchQuoteUpdates = async (symbols: SymbolInfo[]): Promise<Record<string, Partial<SymbolInfo>>> => {
  const updates: Record<string, Partial<SymbolInfo>> = {};
  if (!symbols || symbols.length === 0) return updates;

  try {
    // Filter out duplicates to avoid unnecessary requests
    const uniqueSymbols = Array.from(new Set(symbols.map(s => s.ticker)))
        .map(ticker => symbols.find(s => s.ticker === ticker)!);

    const cryptoSymbols = uniqueSymbols.filter(s => s.type === 'crypto' || s.exchange === 'BINANCE');
    const otherSymbols = uniqueSymbols.filter(s => s.type !== 'crypto' && s.exchange !== 'BINANCE');

    // 1. BINANCE BATCH FETCH - OPTIMIZED
    // Instead of fetching all tickers (heavy), fetch only the ones we need
    if (cryptoSymbols.length > 0) {
        try {
            const binancePairs = cryptoSymbols.map(s => getBinanceSymbol(s.ticker));
            // API LIMIT: Binance allows grouping symbols. 
            // If we have many, we might need to chunk, but for watchlist < 100 it is fine.
            // Format: ["BTCUSDT","ETHUSDT"]
            const symbolsParam = JSON.stringify(binancePairs);
            const url = `${BINANCE_API_BASE}/ticker/24hr?symbols=${encodeURIComponent(symbolsParam)}`;
            
            const response = await fetchWithTimeout(url);
            
            if (response.ok) {
                const data = await response.json();
                if (Array.isArray(data)) {
                    const tickerMap = new Map(data.map((item: any) => [item.symbol, item]));

                    cryptoSymbols.forEach(sym => {
                        const binancePair = getBinanceSymbol(sym.ticker);
                        const tickerData: any = tickerMap.get(binancePair);
                        if (tickerData) {
                            updates[sym.ticker] = {
                                price: safeParseFloat(tickerData.lastPrice),
                                change: safeParseFloat(tickerData.priceChange),
                                changePercent: safeParseFloat(tickerData.priceChangePercent),
                                volume: safeParseFloat(tickerData.volume)
                            };
                        }
                    });
                }
            }
        } catch (e) {
            // Silently fail or log debug to avoid console spam on every poll
            // console.debug("Binance quote fetch failed", e);
        }
    }

    // 2. YAHOO BATCH FETCH
    if (otherSymbols.length > 0) {
        try {
        const yahooTickerMap = new Map<string, string>();
        otherSymbols.forEach(s => {
            yahooTickerMap.set(getYahooSymbol(s), s.ticker);
        });
        
        const yahooTickers = Array.from(yahooTickerMap.keys());
        
        if (yahooTickers.length > 0) {
            const url = `${YAHOO_QUOTE_BASE}?symbols=${yahooTickers.join(',')}&_=${Date.now()}`;
            const encodedUrl = encodeURIComponent(url);
            
            const response = await fetchWithTimeout(`${CORS_PROXY}${encodedUrl}`);
            if (response.ok) {
                const json = await response.json();
                const results = json?.quoteResponse?.result || [];

                if (Array.isArray(results)) {
                    results.forEach((res: any) => {
                    if (!res) return;
                    const ourTicker = yahooTickerMap.get(res.symbol);
                    if (ourTicker) {
                        const price = safeParseFloat(res.regularMarketPrice);
                        const finalPrice = price > 0 ? price : safeParseFloat(res.preMarketPrice || res.postMarketPrice);

                        if (finalPrice !== 0) { 
                            updates[ourTicker] = {
                                price: finalPrice,
                                change: safeParseFloat(res.regularMarketChange),
                                changePercent: safeParseFloat(res.regularMarketChangePercent),
                                volume: safeParseFloat(res.regularMarketVolume)
                            };
                        }
                    }
                    });
                }
            }
        }
        } catch (e) {
          // console.debug("Yahoo quote fetch failed", e);
        }
    }
  } catch (globalError) {
      console.error("Global quote fetch error", globalError);
  }

  return updates; 
};

export const fetchCandleData = async (symbol: SymbolInfo, interval: Interval): Promise<CandleData[]> => {
  if (symbol.type === 'crypto' || symbol.exchange === 'BINANCE') {
    try {
      const pair = getBinanceSymbol(symbol.ticker);
      const bInterval = binanceIntervals[interval];
      const response = await fetchWithTimeout(`${BINANCE_API_BASE}/klines?symbol=${pair}&interval=${bInterval}&limit=500`);
      // Note: fetchWithTimeout throws if !ok, so we don't need to check here again
      const data = await response.json();
      return data.map((d: any[]) => ({
        time: d[0],
        open: safeParseFloat(d[1]),
        high: safeParseFloat(d[2]),
        low: safeParseFloat(d[3]),
        close: safeParseFloat(d[4]),
        volume: safeParseFloat(d[5])
      }));
    } catch (e) {
      console.warn("Binance fetch failed/timed out, falling back to mock", e);
      return generateCandleData(symbol.price, 100, interval);
    }
  } else {
    try {
      const yahooSymbol = getYahooSymbol(symbol);
      const yInterval = yahooIntervals[interval] || '1d';
      const yRange = yahooRanges[interval] || '1mo';

      const url = `${YAHOO_BASE}/${yahooSymbol}?interval=${yInterval}&range=${yRange}`;
      const encodedUrl = encodeURIComponent(url + `&_=${Date.now()}`);
      
      const response = await fetchWithTimeout(`${CORS_PROXY}${encodedUrl}`);
      // fetchWithTimeout throws if !ok
      
      const json = await response.json();
      const result = json?.chart?.result?.[0];

      if (!result) throw new Error('No data found');

      const timestamps = result.timestamp;
      const quote = result.indicators?.quote?.[0];
      
      if (!timestamps || !quote) throw new Error('Invalid data structure');

      const candles: CandleData[] = [];
      const len = timestamps.length;

      for (let i = 0; i < len; i++) {
        const open = quote.open?.[i];
        const close = quote.close?.[i];
        const high = quote.high?.[i];
        const low = quote.low?.[i];

        if (
            open === null || open === undefined || 
            close === null || close === undefined ||
            high === null || high === undefined ||
            low === null || low === undefined
        ) continue;

        candles.push({
          time: timestamps[i] * 1000,
          open: safeParseFloat(open),
          high: safeParseFloat(high),
          low: safeParseFloat(low),
          close: safeParseFloat(close),
          volume: safeParseFloat(quote.volume?.[i] || 0)
        });
      }

      if (candles.length === 0) throw new Error("Parsed data is empty");

      return candles;
    } catch (e) {
       console.warn("Yahoo Finance fetch failed, using fallback", e);
       return generateCandleData(symbol.price, 100, interval);
    }
  }
};
