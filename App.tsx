import * as React from 'react';
import Header from './components/Layout/Header';
import Sidebar from './components/Layout/Sidebar';
import RightPanel from './components/Layout/RightPanel';
import CandleStickChart from './components/Chart/CandleStickChart';
import IndicatorPanel from './components/Chart/IndicatorPanel';
import SettingsModal from './components/Modals/SettingsModal';
import SearchModal from './components/Modals/SearchModal';
import IndicatorsModal from './components/Modals/IndicatorsModal';
import CreateAlertModal from './components/Modals/CreateAlertModal';
import DrawingSettingsPanel from './components/Modals/DrawingSettingsPanel';
import FinancialAssistant from './components/Chatbot/FinancialAssistant';
import { ToastContainer, ToastMessage } from './components/UI/Toast';
import { generateCandleData, MARKET_SYMBOLS } from './services/mockData';
import { fetchCandleData, fetchQuoteUpdates, searchYahooSymbols } from './services/api';
import { CandleData, Interval, SymbolInfo, ChartSettings, Indicator, Alert, Drawing, ToolType, Comparison, DefaultDrawingSettings, FibonacciDrawing } from './types';

const { useState, useEffect, useMemo, useRef, useCallback } = React;

const App: React.FC = () => {
  // --- INITIALIZATION FROM URL ---
  const params = new URLSearchParams(window.location.search);
  const urlTicker = params.get('ticker');
  const urlInterval = params.get('interval') as Interval;

  // Find initial symbol from URL or Default
  const initialSymbol = useMemo(() => {
    if (urlTicker) {
       const found = MARKET_SYMBOLS.find(s => s.ticker === urlTicker);
       if (found) return found;
       return { 
         ticker: urlTicker, 
         name: urlTicker, 
         exchange: 'UNKNOWN', 
         type: 'stock', 
         price: 0, change: 0, changePercent: 0, volume: 0 
       } as SymbolInfo;
    }
    return MARKET_SYMBOLS[0];
  }, [urlTicker]);

  // Global State
  const [currentSymbol, setCurrentSymbol] = useState<SymbolInfo>(initialSymbol);
  const [currentInterval, setCurrentInterval] = useState<Interval>(urlInterval || '1D');
  const [chartData, setChartData] = useState<CandleData[]>([]);
  const [watchlist, setWatchlist] = useState<SymbolInfo[]>(MARKET_SYMBOLS);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  
  // Comparisons (Overlay) State
  const [comparisons, setComparisons] = useState<Comparison[]>([]);
  const [isCompareModalOpen, setIsCompareModalOpen] = useState(false);

  // Watchlist Filter State
  const [watchlistFilter, setWatchlistFilter] = useState<'All' | 'Stocks' | 'Crypto' | 'Forex' | 'ETF'>('All');
  
  // UI State
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isIndicatorsOpen, setIsIndicatorsOpen] = useState(false);
  const [isAlertModalOpen, setIsAlertModalOpen] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(false);
  
  // Drawing & Tools State
  const [activeTool, setActiveTool] = useState<ToolType>('cursor');
  const [drawings, setDrawings] = useState<Drawing[]>([]);
  const [selectedDrawing, setSelectedDrawing] = useState<Drawing | null>(null);
  const [isDrawingSettingsOpen, setIsDrawingSettingsOpen] = useState(false);
  
  // Global Drawing States (Lock/Hide)
  const [isLockAllDrawings, setIsLockAllDrawings] = useState(false);
  const [isHideAllDrawings, setIsHideAllDrawings] = useState(false);

  // Default Drawing Configuration
  const [defaultDrawingSettings, setDefaultDrawingSettings] = useState<DefaultDrawingSettings>({
    trendline: { color: '#2962ff', width: 2, style: 'solid' },
    fibonacci: { 
        color: '#2962ff', width: 2, style: 'dashed', subtype: 'lines',
        labelType: 'value', labelAlignment: 'left', showLabels: true,
        extendLeft: false, extendRight: false,
        levels: [
            { value: 0, color: '#787b86', visible: true },
            { value: 0.236, color: '#f23645', visible: true },
            { value: 0.382, color: '#ff9800', visible: true },
            { value: 0.5, color: '#4caf50', visible: true },
            { value: 0.618, color: '#089981', visible: true },
            { value: 0.786, color: '#2962ff', visible: true },
            { value: 1, color: '#787b86', visible: true },
            { value: 1.618, color: '#2962ff', visible: false },
            { value: 2.618, color: '#f23645', visible: false }
        ]
    },
    brush: { color: '#2962ff', width: 2 },
    text: { color: '#d1d4dc', fontSize: 14 }
  });

  // Chart Settings State
  const [chartSettings, setChartSettings] = useState<ChartSettings>({
    chartType: 'candlestick',
    showVolume: true,
    showGrid: true,
    scaleType: 'linear',
    theme: 'dark',
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
  });

  const [activeIndicators, setActiveIndicators] = useState<Indicator[]>([
    { id: 'default-sma', type: 'SMA', period: 20, color: '#ff9800', lineWidth: 2, lineStyle: 'solid', visible: true }
  ]);

  const oscillatorIndicators = useMemo(() => 
    activeIndicators.filter(i => ['RSI', 'MACD', 'STOCH', 'VOL'].includes(i.type)), 
  [activeIndicators]);

  const watchlistRef = useRef(watchlist);
  const currentSymbolRef = useRef(currentSymbol);
  
  useEffect(() => { watchlistRef.current = watchlist; }, [watchlist]);
  useEffect(() => { currentSymbolRef.current = currentSymbol; }, [currentSymbol]);

  const addToast = (type: ToastMessage['type'], title: string, message: string) => {
    const id = Date.now().toString() + Math.random();
    setToasts(prev => [...prev, { id, type, title, message, duration: 3000 }]); 
  };

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  const triggerAlertNotification = useCallback((alert: Alert, value: number) => {
    const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
    audio.volume = 0.5;
    audio.play().catch(e => console.log('Audio play failed', e));

    addToast(
      'alert', 
      `Alert Triggered: ${alert.symbol}`, 
      `${alert.message} (Value: ${value.toFixed(2)})`
    );

    if (Notification.permission === 'granted') {
      new Notification(`TradeView Alert: ${alert.symbol}`, {
        body: `${alert.message}\nCurrent Price: ${value.toFixed(2)}`,
        icon: '/favicon.ico'
      });
    }
  }, []);

  useEffect(() => {
    let mounted = true;
    const loadData = async () => {
      setIsLoadingData(true);
      try {
        const data = await fetchCandleData(currentSymbol, currentInterval);
        if (!mounted) return;
        setChartData(data);
        if (comparisons.length > 0) {
           const updatedComparisons = await Promise.all(comparisons.map(async (comp) => {
               try {
                 const newData = await fetchCandleData(comp.symbolInfo, currentInterval);
                 return { ...comp, data: newData };
               } catch { return comp; }
           }));
           if(mounted) setComparisons(updatedComparisons);
        }
      } catch (e) {
        console.error("Failed to load data", e);
        if (!mounted) return;
        setChartData(generateCandleData(currentSymbol.price, 100, currentInterval));
      } finally {
        if(mounted) setIsLoadingData(false);
      }
    };
    loadData();
    return () => { mounted = false; };
  }, [currentSymbol.ticker, currentInterval]); 

  const handleAddComparison = async (symbol: SymbolInfo) => {
      try {
          addToast('info', 'Loading Comparison', `Fetching data for ${symbol.ticker}...`);
          const data = await fetchCandleData(symbol, currentInterval);
          const colors = ['#e91e63', '#9c27b0', '#ff9800', '#00bcd4', '#4caf50'];
          const color = colors[comparisons.length % colors.length];
          const newComparison: Comparison = {
              id: Date.now().toString(),
              symbolInfo: symbol,
              data: data,
              color: color
          };
          setComparisons(prev => [...prev, newComparison]);
          addToast('success', 'Comparison Added', `Overlaying ${symbol.ticker} on chart`);
      } catch (e) {
          addToast('error', 'Error', 'Failed to load comparison data');
      }
  };
  
  // AI Helper wrapper for comparison
  const handleAiAddComparison = async (ticker: string) => {
      // 1. Try to find in watchlist
      let symbol = watchlist.find(s => s.ticker === ticker);
      
      // 2. If not found, try to search via API
      if (!symbol) {
          const results = await searchYahooSymbols(ticker);
          if (results && results.length > 0) {
              symbol = results[0];
          }
      }

      if (symbol) {
          await handleAddComparison(symbol);
          return symbol; // Return full symbol info
      } else {
          return null;
      }
  };

  const handleRemoveComparison = (idOrTicker: string) => {
      setComparisons(prev => prev.filter(c => c.id !== idOrTicker && c.symbolInfo.ticker !== idOrTicker));
      addToast('info', 'Comparison Removed', 'Overlay removed from chart');
  };

  // Quote Polling
  useEffect(() => {
    let timeoutId: any;
    let mounted = true;

    const pollQuotes = async () => {
       const list = watchlistRef.current;
       const currSym = currentSymbolRef.current;
       
       if (list.length > 0) {
           try {
             const updates = await fetchQuoteUpdates(list);
             if (mounted) {
                 setWatchlist(prevWatchlist => prevWatchlist.map(item => {
                     const update = updates[item.ticker];
                     return update ? { ...item, ...update } : item;
                 }));
                 
                 const currentUpdate = updates[currSym.ticker];
                 if (currentUpdate && typeof currentUpdate.price === 'number' && isFinite(currentUpdate.price)) {
                    const newPrice = currentUpdate.price;
                    setCurrentSymbol(prev => ({ ...prev, ...currentUpdate }));
                    setChartData(prevData => {
                       if (!prevData || prevData.length === 0) return prevData;
                       const newData = [...prevData];
                       const lastIdx = newData.length - 1;
                       const lastCandle = newData[lastIdx];
                       if (lastCandle && lastCandle.close !== newPrice) {
                           newData[lastIdx] = {
                               ...lastCandle,
                               close: newPrice,
                               high: Math.max(lastCandle.high, newPrice),
                               low: Math.min(lastCandle.low, newPrice),
                           };
                       }
                       return newData;
                    });
                 }
             }
           } catch (err) { 
               if (err instanceof Error && err.message !== 'Request timed out') {
                   console.warn("Polling failed", err); 
               }
           }
       }
       
       if (mounted) {
           timeoutId = setTimeout(pollQuotes, 3000);
       }
    };

    pollQuotes(); 
    
    return () => { 
        mounted = false; 
        clearTimeout(timeoutId); 
    };
  }, []);

  useEffect(() => {
    if (chartData.length === 0 || alerts.length === 0) return;
    const lastCandle = chartData[chartData.length - 1];
    if (!lastCandle) return;
    const lastPrice = lastCandle.close;
    const ticker = currentSymbol.ticker;
    
    let hasChanges = false;
    const updatedAlerts = alerts.map(alert => {
      if (alert.symbol !== ticker || !alert.active || alert.triggered) return alert;
      let triggered = false;
      if (alert.condition === 'greater_than' && lastPrice >= alert.price) triggered = true;
      if (alert.condition === 'less_than' && lastPrice <= alert.price) triggered = true;
      if (triggered) {
        triggerAlertNotification(alert, lastPrice);
        hasChanges = true;
        return { ...alert, triggered: true, active: false };
      }
      return alert;
    });
    if (hasChanges) setAlerts(updatedAlerts);
  }, [chartData, currentSymbol, alerts, triggerAlertNotification]);

  // --- DRAWING HANDLERS ---
  const handleNewDrawing = (newDrawing: Drawing) => {
    let finalizedDrawing = { ...newDrawing };
    
    if (newDrawing.type === 'trendline') {
        const defaults = defaultDrawingSettings.trendline || { color: '#2962ff', width: 2, style: 'solid' };
        finalizedDrawing = { ...finalizedDrawing, ...defaults };
    } else if (newDrawing.type === 'fibonacci') {
        const defaults = defaultDrawingSettings.fibonacci;
        const existingSubtype = (newDrawing as FibonacciDrawing).subtype;
        
        finalizedDrawing = { 
            ...finalizedDrawing, 
            ...defaults,
            subtype: existingSubtype || defaults.subtype, // PRIORITY TO EXISTING SUBTYPE
            levels: defaults.levels.map(l => ({...l})) 
        };
    } else if (newDrawing.type === 'brush') {
        finalizedDrawing = { ...finalizedDrawing, ...defaultDrawingSettings.brush };
    } else if (newDrawing.type === 'text') {
        finalizedDrawing = { ...finalizedDrawing, ...defaultDrawingSettings.text };
    }

    setDrawings(prev => [...prev, finalizedDrawing]);
    setActiveTool('cursor');
    if (newDrawing.type === 'fibonacci' || newDrawing.type === 'trendline') {
        setSelectedDrawing(finalizedDrawing);
    }
  };

  const handleUpdateDrawing = (updatedDrawing: Drawing) => {
    setDrawings(prev => prev.map(d => d.id === updatedDrawing.id ? updatedDrawing : d));
    setSelectedDrawing(prev => (prev && prev.id === updatedDrawing.id ? updatedDrawing : prev));
  };

  const handleUpdateDefaultSettings = (newSettings: DefaultDrawingSettings) => {
    setDefaultDrawingSettings(newSettings);
    const updatedDrawings = drawings.map(d => {
        const defaults = newSettings[d.type as keyof DefaultDrawingSettings];
        if (defaults) {
            // Be careful not to overwrite subtype for Fibs if they are different
            const preservedSubtype = (d.type === 'fibonacci') ? (d as FibonacciDrawing).subtype : undefined;
            
            return {
                ...d,
                ...defaults,
                subtype: preservedSubtype || (defaults as any).subtype, // Keep individual drawing subtype
                id: d.id,
                type: d.type,
                points: d.points,
                visible: d.visible,
                locked: d.locked,
                createdAt: d.createdAt,
                text: (d as any).text || (defaults as any).text || ''
            };
        }
        return d;
    });
    setDrawings(updatedDrawings);
    if (selectedDrawing) {
        const syncedSelected = updatedDrawings.find(d => d.id === selectedDrawing.id);
        if (syncedSelected) setSelectedDrawing(syncedSelected);
    }
  };

  const handleToggleHideType = (type: string) => {
      const drawingsOfType = drawings.filter(d => d.type === type);
      if (drawingsOfType.length === 0) return;
      const anyVisible = drawingsOfType.some(d => d.visible !== false);
      const nextState = !anyVisible; 
      setDrawings(prev => prev.map(d => d.type === type ? { ...d, visible: nextState } : d));
      if (nextState) addToast('info', 'Visibility Updated', `Showing all ${type}s`);
      else addToast('info', 'Visibility Updated', `Hidden all ${type}s`);
  };

  const handleToggleLockType = (type: string) => {
      const drawingsOfType = drawings.filter(d => d.type === type);
      if (drawingsOfType.length === 0) return;
      const anyUnlocked = drawingsOfType.some(d => !d.locked);
      const nextState = anyUnlocked; 
      setDrawings(prev => prev.map(d => d.type === type ? { ...d, locked: nextState } : d));
      if (nextState) addToast('info', 'Locked', `All ${type}s locked`);
      else addToast('info', 'Unlocked', `All ${type}s unlocked`);
  };

  const handleDeleteDrawing = (id: string) => {
    setDrawings(prev => prev.filter(d => d.id !== id));
    if (selectedDrawing?.id === id) {
        setSelectedDrawing(null);
    }
    addToast('info', 'Deleted', 'Drawing removed');
  };

  const handleClearDrawings = () => {
    setDrawings([]);
    setActiveTool('cursor');
    setSelectedDrawing(null);
    setIsDrawingSettingsOpen(false);
    addToast('info', 'Canvas Cleared', 'All drawings removed');
  };

  const handleSelectDrawing = (drawing: Drawing | null) => {
      if (isLockAllDrawings) return; 
      setSelectedDrawing(drawing);
  };

  // AI Helper: Switch Symbol
  const handleAiChangeSymbol = async (ticker: string) => {
    let symbol = watchlist.find(s => s.ticker === ticker);
    if (!symbol) {
        const results = await searchYahooSymbols(ticker);
        if (results && results.length > 0) symbol = results[0];
    }
    if (symbol) {
        setCurrentSymbol(symbol);
        setComparisons([]); 
        addToast('success', 'Symbol Changed', `Chart switched to ${symbol.ticker}`);
        return true;
    }
    return false;
  };

  const handleSymbolChange = (ticker: string) => {
    const symbol = watchlist.find(s => s.ticker === ticker);
    if (symbol) {
        setCurrentSymbol(symbol);
        setComparisons([]); 
    }
  };

  const handleSearchSelect = (symbol: SymbolInfo) => {
    setCurrentSymbol(symbol);
    setComparisons([]); 
  };

  const handleAddToWatchlist = async (symbol: SymbolInfo) => {
    const exists = watchlist.some(s => s.ticker === symbol.ticker);
    if (!exists) {
      setWatchlist(prev => [symbol, ...prev]);
      addToast('success', 'Watchlist Updated', `${symbol.ticker} added to watchlist`);
    } else {
      addToast('info', 'Watchlist', `${symbol.ticker} is already in your watchlist`);
    }
  };

  const handleRemoveFromWatchlist = (ticker: string) => {
    setWatchlist(prev => prev.filter(s => s.ticker !== ticker));
  };

  const handleAddIndicator = (indicator: Indicator) => {
    const newInd = { ...indicator, visible: true };
    setActiveIndicators(prev => [...prev, newInd]);
    addToast('success', 'Indicator Added', `Added ${indicator.type}`);
  };

  const handleUpdateIndicator = (updatedIndicator: Indicator) => {
    setActiveIndicators(prev => prev.map(ind => 
      ind.id === updatedIndicator.id ? updatedIndicator : ind
    ));
    addToast('success', 'Indicator Updated', `${updatedIndicator.type} settings saved`);
  };

  const handleToggleIndicatorVisibility = (id: string) => {
    setActiveIndicators(prev => prev.map(ind => 
      ind.id === id ? { ...ind, visible: ind.visible === undefined ? false : !ind.visible } : ind
    ));
  };

  const handleRemoveIndicator = (id: string) => {
    setActiveIndicators(prev => prev.filter(i => i.id !== id));
  };

  const handleCreateAlert = (alertData: any) => {
    const newAlert: Alert = {
      ...alertData,
      id: Date.now().toString(),
      createdAt: Date.now(),
      triggered: false
    };
    setAlerts(prev => [newAlert, ...prev]);
    addToast('success', 'Alert Created', `Notify when ${alertData.symbol} ${alertData.condition.replace('_', ' ')} ${alertData.price}`);
  };

  const handleDeleteAlert = (id: string) => {
    setAlerts(prev => prev.filter(a => a.id !== id));
  };

  const handleSettingsChange = (newSettings: Partial<ChartSettings>) => {
    setChartSettings(prev => ({ ...prev, ...newSettings }));
  };

  const handleChartTypeChange = (type: ChartSettings['chartType']) => {
    setChartSettings(prev => ({ ...prev, chartType: type }));
  };

  const toggleTheme = () => {
    setChartSettings(prev => ({ 
      ...prev, 
      theme: prev.theme === 'dark' ? 'light' : 'dark' 
    }));
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsSearchOpen(true);
      }
      if (e.key === 'Delete' || e.key === 'Backspace') {
          if (selectedDrawing && !isDrawingSettingsOpen) { 
              handleDeleteDrawing(selectedDrawing.id);
          }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedDrawing, isDrawingSettingsOpen]);

  return (
    <div 
      className="flex flex-col h-screen w-screen overflow-hidden bg-tv-bg text-tv-text" 
      data-theme={chartSettings.theme}
    >
      <ToastContainer toasts={toasts} removeToast={removeToast} />
      
      <Header 
        currentSymbol={currentSymbol}
        currentInterval={currentInterval}
        onIntervalChange={setCurrentInterval}
        onSearchClick={() => setIsSearchOpen(true)}
        onSettingsClick={() => setIsSettingsOpen(true)}
        onIndicatorsClick={() => setIsIndicatorsOpen(true)}
        theme={chartSettings.theme}
        onToggleTheme={toggleTheme}
        chartType={chartSettings.chartType}
        onChartTypeChange={handleChartTypeChange}
        onCompareClick={() => setIsCompareModalOpen(true)}
        addToast={addToast}
      />

      <div className="flex flex-1 overflow-hidden relative">
        <Sidebar 
          activeTool={activeTool} 
          onToolChange={setActiveTool} 
          onClearDrawings={handleClearDrawings}
          onToggleSettings={() => {
              setSelectedDrawing(null);
              setIsDrawingSettingsOpen(!isDrawingSettingsOpen);
          }}
          isSettingsOpen={isDrawingSettingsOpen}
          isLocked={isLockAllDrawings}
          onToggleLock={() => setIsLockAllDrawings(!isLockAllDrawings)}
          isHidden={isHideAllDrawings}
          onToggleHide={() => setIsHideAllDrawings(!isHideAllDrawings)}
        />
        
        <DrawingSettingsPanel 
            isOpen={isDrawingSettingsOpen} 
            onClose={() => setIsDrawingSettingsOpen(false)}
            drawing={selectedDrawing}
            drawings={drawings} 
            onUpdate={handleUpdateDrawing}
            onDelete={handleDeleteDrawing}
            defaultSettings={defaultDrawingSettings}
            onUpdateDefaults={handleUpdateDefaultSettings}
            onToggleHideType={handleToggleHideType}
            onToggleLockType={handleToggleLockType}
        />

        <div className="flex-1 flex flex-col relative z-10 overflow-hidden bg-tv-bg">
          <div className="absolute top-4 left-4 z-20 flex flex-col pointer-events-none">
             <div className="flex items-baseline gap-2">
                <h2 className="text-2xl font-bold select-none text-tv-text opacity-50">{currentSymbol.ticker}</h2>
                {isLoadingData && <span className="text-xs text-tv-accent animate-pulse">Updating...</span>}
             </div>
             <span className="text-sm font-mono select-none text-tv-text opacity-50">{currentInterval} • {currentSymbol.exchange} • {currentSymbol.type.toUpperCase()}</span>
          </div>

          <div className="flex-1 min-h-[300px] relative w-full">
            <CandleStickChart 
              data={chartData} 
              settings={chartSettings} 
              activeIndicators={activeIndicators}
              comparisons={comparisons}
              onRemoveComparison={handleRemoveComparison}
              onToggleIndicatorVisibility={handleToggleIndicatorVisibility}
              groupId="market-charts"
              theme={chartSettings.theme}
              isLoading={isLoadingData}
              activeTool={activeTool}
              drawings={drawings}
              onNewDrawing={handleNewDrawing}
              onUpdateDrawing={handleUpdateDrawing}
              onSelectDrawing={handleSelectDrawing}
              onDeleteDrawing={handleDeleteDrawing}
              onOpenSettings={() => setIsDrawingSettingsOpen(true)}
              isLocked={isLockAllDrawings}
              isHidden={isHideAllDrawings}
            />
          </div>

          {oscillatorIndicators.length > 0 && (
            <div className="flex flex-col shrink-0 max-h-[40%] overflow-y-auto custom-scrollbar border-t border-tv-border bg-tv-bg">
              {oscillatorIndicators.map(ind => (
                <div key={ind.id} style={{ height: '140px', minHeight: '140px' }} className="w-full">
                  <IndicatorPanel 
                    data={chartData} 
                    indicator={ind} 
                    onToggleVisibility={handleToggleIndicatorVisibility}
                    height={140} 
                    groupId="market-charts"
                    theme={chartSettings.theme}
                  />
                </div>
              ))}
            </div>
          )}
        </div>

        <RightPanel 
          currentTicker={currentSymbol.ticker} 
          watchlist={watchlist}
          filter={watchlistFilter}
          onFilterChange={setWatchlistFilter}
          alerts={alerts}
          onSelectSymbol={handleSymbolChange} 
          onOpenSearch={() => setIsSearchOpen(true)}
          onRemoveSymbol={handleRemoveFromWatchlist}
          onCreateAlert={() => setIsAlertModalOpen(true)}
          onDeleteAlert={handleDeleteAlert}
        />
      </div>

      <FinancialAssistant 
        currentSymbol={currentSymbol} 
        chartData={chartData} 
        activeIndicators={activeIndicators}
        comparisons={comparisons}
        onAddDrawing={handleNewDrawing}
        onClearDrawings={handleClearDrawings}
        onAddComparison={handleAiAddComparison}
        onRemoveComparison={handleRemoveComparison}
        onChangeSymbol={handleAiChangeSymbol}
        onAddIndicator={handleAddIndicator}
        onRemoveIndicator={handleRemoveIndicator}
        onToggleIndicatorVisibility={handleToggleIndicatorVisibility}
      />

      <SettingsModal 
        isOpen={isSettingsOpen} 
        onClose={() => setIsSettingsOpen(false)}
        settings={chartSettings}
        onSettingsChange={handleSettingsChange}
      />
      
      <SearchModal 
        isOpen={isSearchOpen} 
        onClose={() => setIsSearchOpen(false)} 
        initialCategory={watchlistFilter}
        onSelect={handleSearchSelect} 
        onAddToWatchlist={handleAddToWatchlist}
        watchlist={watchlist}
        mode="search"
      />

      <SearchModal 
        isOpen={isCompareModalOpen} 
        onClose={() => setIsCompareModalOpen(false)} 
        initialCategory="All"
        onSelect={handleAddComparison}
        onAddToWatchlist={() => {}}
        watchlist={watchlist}
        mode="compare"
      />

      <IndicatorsModal 
        isOpen={isIndicatorsOpen} 
        onClose={() => setIsIndicatorsOpen(false)} 
        activeIndicators={activeIndicators}
        onAddIndicator={handleAddIndicator}
        onUpdateIndicator={handleUpdateIndicator}
        onRemoveIndicator={handleRemoveIndicator}
      />
      <CreateAlertModal 
        isOpen={isAlertModalOpen}
        onClose={() => setIsAlertModalOpen(false)}
        currentPrice={currentSymbol.price}
        symbol={currentSymbol.ticker}
        onCreateAlert={handleCreateAlert}
      />
    </div>
  );
};

export default App;