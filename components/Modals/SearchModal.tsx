import * as React from 'react';
import { Search, X, TrendingUp, PlusCircle, Loader2, GitCompare } from 'lucide-react';
import { POPULAR_STOCKS, TOP_ETFS, MAJOR_FOREX } from '../../services/mockData';
import { searchYahooSymbols, fetchQuoteUpdates } from '../../services/api';
import { SymbolInfo } from '../../types';

const { useState, useEffect, useRef, useMemo } = React;

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (symbol: SymbolInfo) => void;
  onAddToWatchlist: (symbol: SymbolInfo) => void;
  initialCategory?: string;
  watchlist?: SymbolInfo[];
  mode?: 'search' | 'compare'; // New prop
}

const SearchModal: React.FC<SearchModalProps> = ({ 
  isOpen, 
  onClose, 
  onSelect, 
  onAddToWatchlist,
  initialCategory = 'All',
  watchlist = [],
  mode = 'search'
}) => {
  const [query, setQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState(initialCategory === 'Futures' ? 'All' : initialCategory);
  
  // Lists
  const [cryptoSymbols, setCryptoSymbols] = useState<SymbolInfo[]>([]);
  const [searchResults, setSearchResults] = useState<SymbolInfo[]>([]);
  const [livePrices, setLivePrices] = useState<Record<string, Partial<SymbolInfo>>>({});
  
  const [isSearching, setIsSearching] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // 1. Fetch Top 30 Crypto on mount (Dynamic)
  useEffect(() => {
    const fetchTopCryptos = async () => {
      try {
        const res = await fetch('https://api.binance.com/api/v3/ticker/24hr');
        const data = await res.json();
        const topCryptos = data
          .filter((t: any) => t.symbol.endsWith('USDT'))
          .sort((a: any, b: any) => parseFloat(b.quoteVolume) - parseFloat(a.quoteVolume))
          .slice(0, 30) // TOP 30 Only
          .map((t: any) => ({
            ticker: t.symbol.replace('USDT', 'USD'),
            name: t.symbol,
            exchange: 'BINANCE',
            type: 'crypto',
            price: parseFloat(t.lastPrice),
            change: parseFloat(t.priceChange),
            changePercent: parseFloat(t.priceChangePercent),
            volume: parseFloat(t.quoteVolume)
          } as SymbolInfo));

        setCryptoSymbols(topCryptos);
      } catch (e) {
        console.warn("Failed to fetch dynamic crypto list", e);
      }
    };
    fetchTopCryptos();
  }, []);

  // 2. Handle Search Query Logic
  useEffect(() => {
    const performSearch = async () => {
      if (!query.trim()) {
        setSearchResults([]);
        return;
      }

      setIsSearching(true);
      // If typing, search against Yahoo Finance API
      const results = await searchYahooSymbols(query);
      
      // Post-filter by category if needed (though Yahoo search is global)
      const filtered = results.filter(s => {
        if (activeCategory === 'All') return true;
        return s.type === activeCategory.toLowerCase() || 
               (activeCategory === 'Stocks' && s.type === 'stock') ||
               (activeCategory === 'Crypto' && s.type === 'crypto') ||
               (activeCategory === 'Forex' && s.type === 'forex') ||
               (activeCategory === 'ETF' && s.type === 'etf');
      });
      
      setSearchResults(filtered);
      setIsSearching(false);
    };

    const debounce = setTimeout(performSearch, 500); // 500ms debounce
    return () => clearTimeout(debounce);
  }, [query, activeCategory]);


  // 3. Determine which list to show
  const displaySymbols = useMemo(() => {
    if (query.trim()) return searchResults;

    let list: SymbolInfo[] = [];

    switch(activeCategory) {
      case 'Stocks':
        list = POPULAR_STOCKS; // Top 30 Static
        break;
      case 'Crypto':
        list = cryptoSymbols; // Top 30 Dynamic
        break;
      case 'Forex':
        list = MAJOR_FOREX; // Top 30 Static
        break;
      case 'ETF':
        list = TOP_ETFS; // Top 30 Static
        break;
      case 'All':
      default:
        // Mix of top from each
        list = [
          ...POPULAR_STOCKS.slice(0, 8),
          ...cryptoSymbols.slice(0, 5),
          ...MAJOR_FOREX.slice(0, 5),
          ...TOP_ETFS.slice(0, 5)
        ];
    }
    return list;
  }, [query, activeCategory, searchResults, cryptoSymbols]);

  // 4. Fetch Live Prices for Displayed Symbols
  useEffect(() => {
    const fetchPrices = async () => {
      if (displaySymbols.length === 0) return;
      
      // Fetch updates for symbols that are displayed to ensure real-time data
      // especially for static lists (Forex, ETF, Stocks) which have mock initial data
      try {
        const updates = await fetchQuoteUpdates(displaySymbols);
        setLivePrices(prev => ({ ...prev, ...updates }));
      } catch (e) {
        console.warn("Failed to fetch live prices for search modal", e);
      }
    };

    fetchPrices();
  }, [displaySymbols]);

  // 5. Merge Data: Watchlist > Live Price > Default
  const mergedSymbols = useMemo(() => {
    return displaySymbols.map(displaySym => {
      // Priority 1: Watchlist Data (Synced by App)
      const watchlistSym = watchlist.find(w => w.ticker === displaySym.ticker);
      if (watchlistSym) return watchlistSym;

      // Priority 2: Local Live Price Fetch
      const livePrice = livePrices[displaySym.ticker];
      if (livePrice) {
        return { ...displaySym, ...livePrice };
      }

      // Priority 3: Default (Static/Search Result)
      return displaySym;
    });
  }, [displaySymbols, watchlist, livePrices]);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
      setActiveCategory(initialCategory === 'Futures' ? 'All' : initialCategory);
    } else {
        setQuery('');
        setSearchResults([]);
    }
  }, [isOpen, initialCategory]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 z-[60] flex items-start justify-center pt-[15vh] backdrop-blur-sm" onClick={onClose}>
      <div className="bg-tv-pane w-full max-w-2xl rounded-lg shadow-2xl border border-tv-border flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
        
        {/* Header */}
        <div className={`flex items-center p-4 border-b ${mode === 'compare' ? 'border-orange-500/50 bg-orange-500/5' : 'border-tv-border'}`}>
          {mode === 'compare' ? (
             <GitCompare className="text-orange-500 mr-3" />
          ) : (
             <Search className="text-tv-muted mr-3" />
          )}
          <input 
            ref={inputRef}
            type="text" 
            placeholder={
              mode === 'compare' 
                ? "Compare with symbol (e.g. BTCUSD, SPY)..." 
                : activeCategory === 'All' ? "Search Stocks, Crypto, Forex..." : `Search ${activeCategory}...`
            }
            className="flex-1 bg-transparent border-none outline-none text-lg text-tv-text placeholder-tv-muted"
            value={query}
            onChange={e => setQuery(e.target.value)}
          />
          <button onClick={onClose} className="text-tv-muted hover:text-tv-text">
            <X />
          </button>
        </div>

        {/* Categories */}
        <div className="flex px-4 py-2 gap-2 border-b border-tv-border bg-tv-bg/50 overflow-x-auto">
          {['All', 'Stocks', 'Crypto', 'Forex', 'ETF'].map(cat => (
             <button 
               key={cat} 
               onClick={() => { setActiveCategory(cat); setQuery(''); }}
               className={`px-3 py-1 rounded-full text-xs font-medium transition-colors whitespace-nowrap ${activeCategory === cat ? 'bg-tv-accent text-white' : 'bg-tv-border text-tv-text hover:bg-tv-muted/20'}`}
             >
               {cat}
             </button>
          ))}
        </div>

        {/* Results */}
        <div className="max-h-[400px] overflow-y-auto custom-scrollbar relative min-h-[200px]">
          {isSearching ? (
             <div className="flex items-center justify-center h-40 text-tv-muted gap-2">
               <Loader2 className="animate-spin" size={24} />
               <span>Searching global markets...</span>
             </div>
          ) : mergedSymbols.length > 0 ? (
            mergedSymbols.map((symbol, idx) => (
              <div 
                key={`${symbol.ticker}-${symbol.exchange}-${idx}`}
                className="flex items-center justify-between p-3 px-4 hover:bg-tv-border/50 cursor-pointer group border-l-2 border-transparent hover:border-tv-accent transition-all"
                onClick={() => {
                    onSelect(symbol);
                    onClose();
                }}
              >
                <div className="flex items-center gap-3">
                   <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                     symbol.type === 'crypto' ? 'bg-orange-500/20 text-orange-500' : 
                     symbol.type === 'etf' ? 'bg-purple-500/20 text-purple-500' :
                     symbol.type === 'forex' ? 'bg-blue-500/20 text-blue-500' :
                     'bg-green-500/20 text-green-500'
                   }`}>
                     {symbol.ticker.substring(0, 1)}
                   </div>
                   <div>
                     <div className="flex items-baseline gap-2">
                        <span className="font-bold text-tv-text">{symbol.ticker}</span>
                        <span className="text-xs text-tv-muted bg-tv-border px-1 rounded">{symbol.exchange}</span>
                     </div>
                     <div className="text-xs text-tv-muted max-w-[200px] truncate">{symbol.name}</div>
                   </div>
                </div>
                <div className="flex items-center gap-4">
                   <div className="text-right">
                      {/* Show price if > 0. For search results, we wait for live price fetch */}
                      {symbol.price > 0 ? (
                        <>
                          <div className="text-sm font-mono">{symbol.price.toFixed(symbol.type === 'forex' ? 4 : 2)}</div>
                          <div className={`text-xs ${symbol.changePercent >= 0 ? 'text-tv-green' : 'text-tv-red'}`}>
                            {symbol.changePercent > 0 ? '+' : ''}{symbol.changePercent}%
                          </div>
                        </>
                      ) : (
                        <div className="h-4 w-16 bg-tv-border/50 animate-pulse rounded"></div>
                      )}
                   </div>
                   {mode === 'search' && (
                       <button 
                         className="p-2 rounded-full hover:bg-tv-accent/20 text-tv-muted hover:text-tv-accent transition-colors"
                         onClick={(e) => {
                           e.stopPropagation();
                           onAddToWatchlist(symbol);
                         }}
                         title="Add to Watchlist"
                       >
                         <PlusCircle size={20} />
                       </button>
                   )}
                   {mode === 'compare' && (
                       <div className="p-2 text-tv-muted group-hover:text-orange-500 transition-colors">
                          <GitCompare size={20} />
                       </div>
                   )}
                </div>
              </div>
            ))
          ) : (
             <div className="p-8 text-center text-tv-muted">
               <TrendingUp className="mx-auto mb-2 opacity-50" size={32} />
               <p>No symbols found matching "{query}"</p>
               <p className="text-xs mt-2">Try searching for a specific ticker (e.g. AAPL, BTC, SPY)</p>
             </div>
          )}
        </div>
        
        <div className="bg-tv-bg p-2 px-4 text-xs text-tv-muted border-t border-tv-border flex justify-between">
           <span>{mode === 'compare' ? 'Select an asset to overlay' : (query ? 'Results via Yahoo Finance' : `Top ${activeCategory === 'All' ? 'Picks' : '30 Assets'}`)}</span>
           <span>Press ESC to close</span>
        </div>
      </div>
    </div>
  );
};

export default SearchModal;