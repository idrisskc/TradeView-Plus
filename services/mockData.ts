
import { CandleData, SymbolInfo, Interval } from '../types';

export const generateCandleData = (
  basePrice: number,
  count: number,
  interval: Interval
): CandleData[] => {
  const data: CandleData[] = [];
  let currentPrice = basePrice;
  const now = Date.now();
  
  // Interval to ms
  const intervalMsMap: Record<Interval, number> = {
    '1m': 60 * 1000,
    '5m': 5 * 60 * 1000,
    '15m': 15 * 60 * 1000,
    '1H': 60 * 60 * 1000,
    '4H': 4 * 60 * 60 * 1000,
    '1D': 24 * 60 * 60 * 1000,
    '1W': 7 * 24 * 60 * 60 * 1000,
    '1M': 30 * 24 * 60 * 60 * 1000,
    '1Y': 365 * 24 * 60 * 60 * 1000,
  };
  const step = intervalMsMap[interval] || intervalMsMap['1D'];

  for (let i = count; i > 0; i--) {
    const time = now - i * step;
    const volatility = currentPrice * 0.02; // 2% volatility
    const change = (Math.random() - 0.5) * volatility;
    
    const open = currentPrice;
    const close = currentPrice + change;
    const high = Math.max(open, close) + Math.random() * volatility * 0.5;
    const low = Math.min(open, close) - Math.random() * volatility * 0.5;
    const volume = Math.floor(Math.random() * 1000000) + 50000;

    data.push({
      time,
      open,
      high,
      low,
      close,
      volume
    });

    currentPrice = close;
  }
  return data;
};

// --- STATIC TOP 30 LISTS FOR DEFAULT VIEWS ---

export const POPULAR_STOCKS: SymbolInfo[] = [
  { ticker: 'AAPL', name: 'Apple Inc.', exchange: 'NASDAQ', type: 'stock', price: 178.35, change: 2.15, changePercent: 1.22, volume: 54000000 },
  { ticker: 'MSFT', name: 'Microsoft Corp', exchange: 'NASDAQ', type: 'stock', price: 420.00, change: 2.5, changePercent: 0.6, volume: 25000000 },
  { ticker: 'NVDA', name: 'Nvidia Corp', exchange: 'NASDAQ', type: 'stock', price: 890.00, change: 15.00, changePercent: 1.71, volume: 41000000 },
  { ticker: 'GOOGL', name: 'Alphabet Inc.', exchange: 'NASDAQ', type: 'stock', price: 170.00, change: -0.5, changePercent: -0.3, volume: 20000000 },
  { ticker: 'AMZN', name: 'Amazon.com Inc', exchange: 'NASDAQ', type: 'stock', price: 180.00, change: 1.2, changePercent: 0.6, volume: 30000000 },
  { ticker: 'META', name: 'Meta Platforms', exchange: 'NASDAQ', type: 'stock', price: 490.00, change: 5.5, changePercent: 1.1, volume: 15000000 },
  { ticker: 'TSLA', name: 'Tesla Inc.', exchange: 'NASDAQ', type: 'stock', price: 175.60, change: -5.40, changePercent: -2.9, volume: 32000000 },
  { ticker: 'BRK.B', name: 'Berkshire Hathaway', exchange: 'NYSE', type: 'stock', price: 405.00, change: 1.5, changePercent: 0.3, volume: 3000000 },
  { ticker: 'LLY', name: 'Eli Lilly', exchange: 'NYSE', type: 'stock', price: 760.00, change: 4.2, changePercent: 0.5, volume: 2000000 },
  { ticker: 'TSM', name: 'Taiwan Semiconductor', exchange: 'NYSE', type: 'stock', price: 140.00, change: 2.0, changePercent: 1.4, volume: 12000000 },
  { ticker: 'AVGO', name: 'Broadcom Inc', exchange: 'NASDAQ', type: 'stock', price: 1300.00, change: 10.0, changePercent: 0.8, volume: 2000000 },
  { ticker: 'JPM', name: 'JPMorgan Chase', exchange: 'NYSE', type: 'stock', price: 195.00, change: 1.50, changePercent: 0.7, volume: 8000000 },
  { ticker: 'V', name: 'Visa Inc.', exchange: 'NYSE', type: 'stock', price: 280.00, change: 0.50, changePercent: 0.18, volume: 6000000 },
  { ticker: 'WMT', name: 'Walmart Inc.', exchange: 'NYSE', type: 'stock', price: 60.50, change: 0.30, changePercent: 0.5, volume: 12000000 },
  { ticker: 'XOM', name: 'Exxon Mobil', exchange: 'NYSE', type: 'stock', price: 115.00, change: -0.5, changePercent: -0.4, volume: 15000000 },
  { ticker: 'MA', name: 'Mastercard', exchange: 'NYSE', type: 'stock', price: 475.00, change: 1.2, changePercent: 0.25, volume: 3000000 },
  { ticker: 'PG', name: 'Procter & Gamble', exchange: 'NYSE', type: 'stock', price: 162.00, change: 0.10, changePercent: 0.06, volume: 5000000 },
  { ticker: 'COST', name: 'Costco Wholesale', exchange: 'NASDAQ', type: 'stock', price: 750.00, change: 5.0, changePercent: 0.6, volume: 2000000 },
  { ticker: 'JNJ', name: 'Johnson & Johnson', exchange: 'NYSE', type: 'stock', price: 155.00, change: -0.20, changePercent: -0.1, volume: 7000000 },
  { ticker: 'HD', name: 'Home Depot', exchange: 'NYSE', type: 'stock', price: 380.00, change: 2.1, changePercent: 0.5, volume: 3000000 },
  { ticker: 'MRK', name: 'Merck & Co', exchange: 'NYSE', type: 'stock', price: 125.00, change: -0.1, changePercent: -0.08, volume: 5000000 },
  { ticker: 'ABBV', name: 'AbbVie Inc', exchange: 'NYSE', type: 'stock', price: 178.00, change: 0.5, changePercent: 0.3, volume: 4000000 },
  { ticker: 'KO', name: 'Coca-Cola Co', exchange: 'NYSE', type: 'stock', price: 61.20, change: 0.15, changePercent: 0.25, volume: 11000000 },
  { ticker: 'PEP', name: 'PepsiCo', exchange: 'NASDAQ', type: 'stock', price: 168.00, change: -0.2, changePercent: -0.1, volume: 4500000 },
  { ticker: 'BAC', name: 'Bank of America', exchange: 'NYSE', type: 'stock', price: 37.00, change: 0.1, changePercent: 0.2, volume: 35000000 },
  { ticker: 'CSCO', name: 'Cisco Systems', exchange: 'NASDAQ', type: 'stock', price: 49.00, change: -0.1, changePercent: -0.2, volume: 18000000 },
  { ticker: 'NFLX', name: 'Netflix Inc.', exchange: 'NASDAQ', type: 'stock', price: 620.00, change: 8.00, changePercent: 1.3, volume: 5000000 },
  { ticker: 'AMD', name: 'Advanced Micro Devices', exchange: 'NASDAQ', type: 'stock', price: 170.50, change: 3.20, changePercent: 1.9, volume: 60000000 },
  { ticker: 'INTC', name: 'Intel Corp', exchange: 'NASDAQ', type: 'stock', price: 35.20, change: -0.80, changePercent: -2.2, volume: 45000000 },
  { ticker: 'DIS', name: 'Walt Disney Co', exchange: 'NYSE', type: 'stock', price: 115.00, change: -1.20, changePercent: -1.0, volume: 9000000 },
];

export const TOP_ETFS: SymbolInfo[] = [
  { ticker: 'SPY', name: 'SPDR S&P 500 ETF', exchange: 'NYSE', type: 'etf', price: 510.00, change: 0, changePercent: 0, volume: 0 },
  { ticker: 'IVV', name: 'iShares Core S&P 500', exchange: 'NYSE', type: 'etf', price: 512.00, change: 0, changePercent: 0, volume: 0 },
  { ticker: 'VOO', name: 'Vanguard S&P 500', exchange: 'NYSE', type: 'etf', price: 470.00, change: 0, changePercent: 0, volume: 0 },
  { ticker: 'QQQ', name: 'Invesco QQQ Trust', exchange: 'NASDAQ', type: 'etf', price: 440.00, change: 0, changePercent: 0, volume: 0 },
  { ticker: 'VTI', name: 'Vanguard Total Stock', exchange: 'NYSE', type: 'etf', price: 260.00, change: 0, changePercent: 0, volume: 0 },
  { ticker: 'VEA', name: 'Vanguard FTSE Developed', exchange: 'NYSE', type: 'etf', price: 50.00, change: 0, changePercent: 0, volume: 0 },
  { ticker: 'VUG', name: 'Vanguard Growth ETF', exchange: 'NYSE', type: 'etf', price: 340.00, change: 0, changePercent: 0, volume: 0 },
  { ticker: 'VTV', name: 'Vanguard Value ETF', exchange: 'NYSE', type: 'etf', price: 160.00, change: 0, changePercent: 0, volume: 0 },
  { ticker: 'IEFA', name: 'iShares Core MSCI EAFE', exchange: 'NYSE', type: 'etf', price: 75.00, change: 0, changePercent: 0, volume: 0 },
  { ticker: 'BND', name: 'Vanguard Total Bond', exchange: 'NASDAQ', type: 'etf', price: 72.00, change: 0, changePercent: 0, volume: 0 },
  { ticker: 'AGG', name: 'iShares Core US Aggregate', exchange: 'NYSE', type: 'etf', price: 98.00, change: 0, changePercent: 0, volume: 0 },
  { ticker: 'IWF', name: 'iShares Russell 1000 Growth', exchange: 'NYSE', type: 'etf', price: 330.00, change: 0, changePercent: 0, volume: 0 },
  { ticker: 'IJH', name: 'iShares Core S&P Mid-Cap', exchange: 'NYSE', type: 'etf', price: 290.00, change: 0, changePercent: 0, volume: 0 },
  { ticker: 'VWO', name: 'Vanguard Emerging Markets', exchange: 'NYSE', type: 'etf', price: 42.00, change: 0, changePercent: 0, volume: 0 },
  { ticker: 'IEMG', name: 'iShares Core MSCI Emerging', exchange: 'NYSE', type: 'etf', price: 50.00, change: 0, changePercent: 0, volume: 0 },
  { ticker: 'IWM', name: 'iShares Russell 2000', exchange: 'NYSE', type: 'etf', price: 205.00, change: 0, changePercent: 0, volume: 0 },
  { ticker: 'VIG', name: 'Vanguard Div Appreciation', exchange: 'NYSE', type: 'etf', price: 180.00, change: 0, changePercent: 0, volume: 0 },
  { ticker: 'VXUS', name: 'Vanguard Total Intl Stock', exchange: 'NASDAQ', type: 'etf', price: 58.00, change: 0, changePercent: 0, volume: 0 },
  { ticker: 'GLD', name: 'SPDR Gold Shares', exchange: 'NYSE', type: 'etf', price: 205.00, change: 0, changePercent: 0, volume: 0 },
  { ticker: 'VO', name: 'Vanguard Mid-Cap', exchange: 'NYSE', type: 'etf', price: 240.00, change: 0, changePercent: 0, volume: 0 },
  { ticker: 'XLK', name: 'Technology Select Sector', exchange: 'NYSE', type: 'etf', price: 210.00, change: 0, changePercent: 0, volume: 0 },
  { ticker: 'XLF', name: 'Financial Select Sector', exchange: 'NYSE', type: 'etf', price: 42.00, change: 0, changePercent: 0, volume: 0 },
  { ticker: 'XLE', name: 'Energy Select Sector', exchange: 'NYSE', type: 'etf', price: 92.00, change: 0, changePercent: 0, volume: 0 },
  { ticker: 'XLV', name: 'Health Care Select Sector', exchange: 'NYSE', type: 'etf', price: 145.00, change: 0, changePercent: 0, volume: 0 },
  { ticker: 'VB', name: 'Vanguard Small-Cap', exchange: 'NYSE', type: 'etf', price: 220.00, change: 0, changePercent: 0, volume: 0 },
  { ticker: 'TQQQ', name: 'ProShares UltraPro QQQ', exchange: 'NASDAQ', type: 'etf', price: 60.00, change: 0, changePercent: 0, volume: 0 },
  { ticker: 'SQQQ', name: 'ProShares UltraPro Short QQQ', exchange: 'NASDAQ', type: 'etf', price: 10.00, change: 0, changePercent: 0, volume: 0 },
  { ticker: 'SOXL', name: 'Direxion Daily Semi Bull 3X', exchange: 'NYSE', type: 'etf', price: 45.00, change: 0, changePercent: 0, volume: 0 },
  { ticker: 'ARKK', name: 'ARK Innovation ETF', exchange: 'NYSE', type: 'etf', price: 48.00, change: 0, changePercent: 0, volume: 0 },
  { ticker: 'SLV', name: 'iShares Silver Trust', exchange: 'NYSE', type: 'etf', price: 22.00, change: 0, changePercent: 0, volume: 0 }
];

export const MAJOR_FOREX: SymbolInfo[] = [
  { ticker: 'EURUSD', name: 'Euro / US Dollar', exchange: 'FX', type: 'forex', price: 1.0850, change: 0, changePercent: 0, volume: 0 },
  { ticker: 'USDJPY', name: 'US Dollar / Yen', exchange: 'FX', type: 'forex', price: 151.20, change: 0, changePercent: 0, volume: 0 },
  { ticker: 'GBPUSD', name: 'British Pound / USD', exchange: 'FX', type: 'forex', price: 1.2640, change: 0, changePercent: 0, volume: 0 },
  { ticker: 'AUDUSD', name: 'Australian Dollar / USD', exchange: 'FX', type: 'forex', price: 0.6550, change: 0, changePercent: 0, volume: 0 },
  { ticker: 'USDCAD', name: 'US Dollar / Canadian Dollar', exchange: 'FX', type: 'forex', price: 1.3550, change: 0, changePercent: 0, volume: 0 },
  { ticker: 'USDCHF', name: 'US Dollar / Swiss Franc', exchange: 'FX', type: 'forex', price: 0.9050, change: 0, changePercent: 0, volume: 0 },
  { ticker: 'NZDUSD', name: 'New Zealand Dollar / USD', exchange: 'FX', type: 'forex', price: 0.6020, change: 0, changePercent: 0, volume: 0 },
  { ticker: 'EURJPY', name: 'Euro / Yen', exchange: 'FX', type: 'forex', price: 164.00, change: 0, changePercent: 0, volume: 0 },
  { ticker: 'GBPJPY', name: 'British Pound / Yen', exchange: 'FX', type: 'forex', price: 191.00, change: 0, changePercent: 0, volume: 0 },
  { ticker: 'EURGBP', name: 'Euro / British Pound', exchange: 'FX', type: 'forex', price: 0.8580, change: 0, changePercent: 0, volume: 0 },
  { ticker: 'AUDJPY', name: 'Australian Dollar / Yen', exchange: 'FX', type: 'forex', price: 99.00, change: 0, changePercent: 0, volume: 0 },
  { ticker: 'EURAUD', name: 'Euro / Australian Dollar', exchange: 'FX', type: 'forex', price: 1.6500, change: 0, changePercent: 0, volume: 0 },
  { ticker: 'EURCHF', name: 'Euro / Swiss Franc', exchange: 'FX', type: 'forex', price: 0.9800, change: 0, changePercent: 0, volume: 0 },
  { ticker: 'AUDNZD', name: 'Australian Dollar / NZD', exchange: 'FX', type: 'forex', price: 1.0900, change: 0, changePercent: 0, volume: 0 },
  { ticker: 'USDSGD', name: 'US Dollar / Singapore Dollar', exchange: 'FX', type: 'forex', price: 1.3400, change: 0, changePercent: 0, volume: 0 },
  { ticker: 'USDHKD', name: 'US Dollar / HK Dollar', exchange: 'FX', type: 'forex', price: 7.8200, change: 0, changePercent: 0, volume: 0 },
  { ticker: 'USDTRY', name: 'US Dollar / Turkish Lira', exchange: 'FX', type: 'forex', price: 32.00, change: 0, changePercent: 0, volume: 0 },
  { ticker: 'EURCAD', name: 'Euro / Canadian Dollar', exchange: 'FX', type: 'forex', price: 1.4700, change: 0, changePercent: 0, volume: 0 },
  { ticker: 'CADJPY', name: 'Canadian Dollar / Yen', exchange: 'FX', type: 'forex', price: 111.00, change: 0, changePercent: 0, volume: 0 },
  { ticker: 'NZDJPY', name: 'New Zealand Dollar / Yen', exchange: 'FX', type: 'forex', price: 91.00, change: 0, changePercent: 0, volume: 0 },
  { ticker: 'GBPAUD', name: 'British Pound / AUD', exchange: 'FX', type: 'forex', price: 1.9300, change: 0, changePercent: 0, volume: 0 },
  { ticker: 'GBPCAD', name: 'British Pound / CAD', exchange: 'FX', type: 'forex', price: 1.7100, change: 0, changePercent: 0, volume: 0 },
  { ticker: 'GBPCHF', name: 'British Pound / CHF', exchange: 'FX', type: 'forex', price: 1.1400, change: 0, changePercent: 0, volume: 0 },
  { ticker: 'AUDCAD', name: 'Australian Dollar / CAD', exchange: 'FX', type: 'forex', price: 0.8800, change: 0, changePercent: 0, volume: 0 },
  { ticker: 'AUDCHF', name: 'Australian Dollar / CHF', exchange: 'FX', type: 'forex', price: 0.5900, change: 0, changePercent: 0, volume: 0 },
  { ticker: 'CADCHF', name: 'Canadian Dollar / CHF', exchange: 'FX', type: 'forex', price: 0.6600, change: 0, changePercent: 0, volume: 0 },
  { ticker: 'XAUUSD', name: 'Gold / US Dollar', exchange: 'CFD', type: 'forex', price: 2150.00, change: 0, changePercent: 0, volume: 0 },
  { ticker: 'XAGUSD', name: 'Silver / US Dollar', exchange: 'CFD', type: 'forex', price: 24.50, change: 0, changePercent: 0, volume: 0 },
  { ticker: 'USDMXN', name: 'US Dollar / Mexican Peso', exchange: 'FX', type: 'forex', price: 16.70, change: 0, changePercent: 0, volume: 0 },
  { ticker: 'USDZAR', name: 'US Dollar / SA Rand', exchange: 'FX', type: 'forex', price: 18.90, change: 0, changePercent: 0, volume: 0 },
];

// Initial symbols for fallback
export const MARKET_SYMBOLS: SymbolInfo[] = [
  ...POPULAR_STOCKS.slice(0, 5),
  ...TOP_ETFS.slice(0, 3),
  ...MAJOR_FOREX.slice(0, 3),
  // Crypto will be fetched dynamically or mocked initially
  { ticker: 'BTCUSD', name: 'Bitcoin', exchange: 'BINANCE', type: 'crypto', price: 65000, change: 0, changePercent: 0, volume: 0 },
];
