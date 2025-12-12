import * as React from 'react';
import { SymbolInfo, Alert } from '../../types';
import { List, Bell, Newspaper, Plus, Trash2, ArrowUpRight, CheckCircle2 } from 'lucide-react';

const { useState } = React;

interface RightPanelProps {
  currentTicker: string;
  watchlist: SymbolInfo[];
  alerts: Alert[];
  filter: 'All' | 'Stocks' | 'Crypto' | 'Forex' | 'ETF';
  onFilterChange: (filter: 'All' | 'Stocks' | 'Crypto' | 'Forex' | 'ETF') => void;
  onSelectSymbol: (ticker: string) => void;
  onOpenSearch: () => void;
  onRemoveSymbol: (ticker: string) => void;
  onCreateAlert: () => void;
  onDeleteAlert: (id: string) => void;
}

const RightPanel: React.FC<RightPanelProps> = ({ 
  currentTicker, 
  watchlist, 
  alerts,
  filter,
  onFilterChange,
  onSelectSymbol, 
  onOpenSearch,
  onRemoveSymbol,
  onCreateAlert,
  onDeleteAlert
}) => {
  const [activeTab, setActiveTab] = useState<'watchlist' | 'alerts' | 'news'>('watchlist');

  const filteredWatchlist = watchlist.filter(s => {
    if (filter === 'All') return true;
    
    const type = s.type?.toLowerCase() || 'stock';
    const filterKey = filter.toLowerCase();

    // Explicitly map 'Stocks' category to 'stock' data type
    if (filterKey === 'stocks') {
      return type === 'stock';
    }
    
    return type === filterKey;
  });

  return (
    <div className="w-[320px] border-l border-tv-border bg-tv-bg flex flex-col h-full hidden md:flex">
      {/* Main Tabs */}
      <div className="flex border-b border-tv-border shrink-0">
        <button 
          className={`flex-1 py-3 flex justify-center items-center hover:text-tv-accent ${activeTab === 'watchlist' ? 'text-tv-accent border-b-2 border-tv-accent' : 'text-tv-muted'}`}
          onClick={() => setActiveTab('watchlist')}
        >
          <List size={20} />
        </button>
        <button 
          className={`flex-1 py-3 flex justify-center items-center hover:text-tv-accent ${activeTab === 'alerts' ? 'text-tv-accent border-b-2 border-tv-accent' : 'text-tv-muted'}`}
          onClick={() => setActiveTab('alerts')}
        >
          <div className="relative">
             <Bell size={20} />
             {alerts.filter(a => a.triggered).length > 0 && (
               <span className="absolute -top-1 -right-1 w-2 h-2 bg-tv-red rounded-full"></span>
             )}
          </div>
        </button>
        <button 
          className={`flex-1 py-3 flex justify-center items-center hover:text-tv-accent ${activeTab === 'news' ? 'text-tv-accent border-b-2 border-tv-accent' : 'text-tv-muted'}`}
          onClick={() => setActiveTab('news')}
        >
          <Newspaper size={20} />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden flex flex-col">
        {activeTab === 'watchlist' && (
          <div className="flex flex-col flex-1 h-full">
            {/* Filter Tabs */}
            <div className="flex px-2 py-2 gap-1 overflow-x-auto border-b border-tv-border scrollbar-hide shrink-0">
              {['All', 'Stocks', 'Crypto', 'Forex', 'ETF'].map(f => (
                <button 
                  key={f}
                  onClick={() => onFilterChange(f as any)}
                  className={`px-3 py-1 text-xs rounded-full whitespace-nowrap transition-colors ${filter === f ? 'bg-tv-pane text-tv-accent font-bold' : 'text-tv-muted hover:text-tv-text'}`}
                >
                  {f}
                </button>
              ))}
            </div>

            <div className="p-2 flex justify-between items-center text-xs text-tv-muted border-b border-tv-border shrink-0 bg-tv-bg">
              <span className="font-semibold uppercase tracking-wider pl-2">Symbol</span>
              <div className="flex gap-4 pr-8">
                <span>Last</span>
                <span>Chg%</span>
              </div>
            </div>
            
            <div className="flex-1 overflow-y-auto custom-scrollbar">
              {filteredWatchlist.length === 0 ? (
                 <div className="p-8 text-center flex flex-col items-center justify-center h-full text-tv-muted">
                   <List className="mb-2 opacity-20" size={48} />
                   <span className="text-sm italic">No {filter !== 'All' ? filter : ''} symbols.</span>
                   <button 
                     onClick={onOpenSearch}
                     className="mt-4 text-tv-accent text-xs hover:underline flex items-center gap-1"
                   >
                     <Plus size={12} /> Add new
                   </button>
                 </div>
              ) : (
                filteredWatchlist.map((symbol) => (
                  <div 
                    key={symbol.ticker} 
                    className={`group flex justify-between items-center p-3 cursor-pointer hover:bg-tv-pane transition-colors border-b border-tv-border/30 ${currentTicker === symbol.ticker ? 'bg-tv-pane border-l-2 border-l-tv-accent' : 'border-l-2 border-l-transparent'}`}
                    onClick={() => onSelectSymbol(symbol.ticker)}
                  >
                    <div className="flex flex-col">
                      <span className="font-bold text-sm text-tv-text flex items-center gap-2">
                        {symbol.ticker}
                        {symbol.type === 'crypto' && <span className="text-[9px] px-1 rounded bg-orange-500/20 text-orange-500 font-normal">C</span>}
                        {symbol.type === 'etf' && <span className="text-[9px] px-1 rounded bg-purple-500/20 text-purple-500 font-normal">E</span>}
                        {symbol.type === 'forex' && <span className="text-[9px] px-1 rounded bg-blue-500/20 text-blue-500 font-normal">F</span>}
                      </span>
                      <span className="text-xs text-tv-muted">{symbol.exchange}</span>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="flex flex-col items-end min-w-[60px]">
                        <span className="text-sm font-medium">{symbol.price.toFixed(symbol.type === 'forex' ? 4 : 2)}</span>
                        <span className={`text-xs ${symbol.changePercent >= 0 ? 'text-tv-green' : 'text-tv-red'}`}>
                          {symbol.changePercent > 0 ? '+' : ''}{symbol.changePercent}%
                        </span>
                      </div>
                      {/* Remove Button (Visible on Hover) */}
                      <button 
                        className="opacity-0 group-hover:opacity-100 p-2 text-tv-muted hover:text-tv-red hover:bg-tv-bg rounded transition-all"
                        onClick={(e) => {
                          e.stopPropagation();
                          onRemoveSymbol(symbol.ticker);
                        }}
                        title="Remove from Watchlist"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Fixed Footer Add Button */}
            <div className="p-4 border-t border-tv-border bg-tv-bg shrink-0">
              <button 
                className="w-full py-2 border border-tv-border rounded text-tv-accent hover:bg-tv-pane hover:border-tv-accent flex items-center justify-center gap-2 text-sm transition-all shadow-sm"
                onClick={onOpenSearch}
              >
                <Plus size={16} /> Add Symbol
              </button>
            </div>
          </div>
        )}

        {activeTab === 'alerts' && (
          <div className="flex flex-col h-full">
            <div className="flex-1 overflow-y-auto custom-scrollbar p-2">
              {alerts.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-tv-muted p-4 text-center">
                  <Bell size={48} className="mb-4 opacity-30" />
                  <p className="text-sm mb-2">No active alerts</p>
                  <p className="text-xs text-tv-muted/70">Create custom alerts for price movements and never miss a trade.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {alerts.map(alert => (
                    <div key={alert.id} className={`p-3 rounded border ${alert.triggered ? 'bg-tv-accent/10 border-tv-accent' : 'bg-tv-pane border-tv-border'} relative group`}>
                      <div className="flex justify-between items-start mb-1">
                        <span className="font-bold text-sm">{alert.symbol}</span>
                        <span className="text-xs text-tv-muted">{new Date(alert.createdAt).toLocaleDateString()}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <span className="text-tv-muted">{alert.condition === 'greater_than' ? '>' : '<'}</span>
                        <span className="font-mono">{alert.price}</span>
                      </div>
                      <p className="text-xs text-tv-muted mt-1 truncate">{alert.message}</p>
                      
                      {alert.triggered && (
                         <div className="flex items-center gap-1 text-tv-accent text-xs mt-2 font-bold">
                           <CheckCircle2 size={12} /> Triggered
                         </div>
                      )}

                      <button 
                        onClick={() => onDeleteAlert(alert.id)}
                        className="absolute top-2 right-2 p-1 text-tv-muted hover:text-tv-red opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="p-4 border-t border-tv-border bg-tv-bg shrink-0">
               <button 
                 onClick={onCreateAlert}
                 className="w-full py-2 bg-tv-accent text-white rounded text-sm hover:bg-blue-600 transition shadow-sm font-medium"
               >
                 Create Alert
               </button>
            </div>
          </div>
        )}

         {activeTab === 'news' && (
          <div className="p-4 overflow-y-auto custom-scrollbar">
             <div className="mb-4 pb-4 border-b border-tv-border group cursor-pointer">
               <div className="flex justify-between items-center mb-1">
                 <span className="text-[10px] text-tv-muted uppercase">Reuters • 2h</span>
                 <ArrowUpRight size={12} className="text-tv-muted opacity-0 group-hover:opacity-100 transition-opacity" />
               </div>
               <h4 className="text-sm font-medium hover:text-tv-accent transition-colors">Fed signals potential rate cuts later this year as inflation cools</h4>
               <p className="text-xs text-tv-muted mt-2 line-clamp-2">The Federal Reserve maintained interest rates at current levels but signaled that cuts could begin as early as September...</p>
             </div>
             <div className="mb-4 pb-4 border-b border-tv-border group cursor-pointer">
               <div className="flex justify-between items-center mb-1">
                 <span className="text-[10px] text-tv-muted uppercase">Bloomberg • 4h</span>
                  <ArrowUpRight size={12} className="text-tv-muted opacity-0 group-hover:opacity-100 transition-opacity" />
               </div>
               <h4 className="text-sm font-medium hover:text-tv-accent transition-colors">Bitcoin surges past $64k amidst renewed ETF inflows</h4>
             </div>
             <div className="mb-4 pb-4 border-b border-tv-border group cursor-pointer">
               <div className="flex justify-between items-center mb-1">
                 <span className="text-[10px] text-tv-muted uppercase">CNBC • 5h</span>
                  <ArrowUpRight size={12} className="text-tv-muted opacity-0 group-hover:opacity-100 transition-opacity" />
               </div>
               <h4 className="text-sm font-medium hover:text-tv-accent transition-colors">Tech stocks rally ahead of earnings season</h4>
             </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default RightPanel;