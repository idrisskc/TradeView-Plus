import * as React from 'react';
import { Search, Settings, Maximize, ChevronDown, PlusCircle, LineChart, BarChart2, Activity, Moon, Sun, Loader2, Share2, Download, Copy, Twitter, Link } from 'lucide-react';
import { Interval, SymbolInfo, ChartSettings } from '../../types';

const { useState } = React;

interface HeaderProps {
  currentSymbol: SymbolInfo | undefined;
  currentInterval: Interval;
  onIntervalChange: (interval: Interval) => void;
  onSearchClick: () => void;
  onSettingsClick: () => void;
  onIndicatorsClick: () => void;
  theme?: 'dark' | 'light';
  onToggleTheme?: () => void;
  chartType: ChartSettings['chartType'];
  onChartTypeChange: (type: ChartSettings['chartType']) => void;
  onCompareClick?: () => void;
  addToast?: (type: any, title: string, message: string) => void;
}

const Header: React.FC<HeaderProps> = ({ 
  currentSymbol, 
  currentInterval, 
  onIntervalChange,
  onSearchClick,
  onSettingsClick,
  onIndicatorsClick,
  theme = 'dark',
  onToggleTheme,
  chartType,
  onChartTypeChange,
  onCompareClick,
  addToast
}) => {
  const visibleIntervals: Interval[] = ['1m', '5m', '15m', '1H', '4H', '1D', '1W'];
  const [showMoreIntervals, setShowMoreIntervals] = useState(false);
  const [showShareMenu, setShowShareMenu] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);

  const handleShareAction = async (action: 'download' | 'copy_image' | 'copy_link' | 'twitter') => {
    setShowShareMenu(false);
    
    if (action === 'copy_link') {
       const url = new URL(window.location.href);
       url.searchParams.set('ticker', currentSymbol?.ticker || '');
       url.searchParams.set('interval', currentInterval);
       navigator.clipboard.writeText(url.toString());
       addToast?.('success', 'Link Copied', 'Chart link copied to clipboard');
       return;
    }

    if (action === 'twitter') {
       const text = `Check out this chart for $${currentSymbol?.ticker} on TradeView! Price: ${currentSymbol?.price}`;
       const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`;
       window.open(twitterUrl, '_blank');
       return;
    }

    // Image Capture Logic
    setIsCapturing(true);
    try {
      // Dynamic import to prevent page load crash if html2canvas module format is incompatible
      const html2canvasModule = await import('html2canvas');
      const html2canvas = (html2canvasModule as any).default || html2canvasModule;

      const chartElement = document.getElementById('chart-capture-container');
      
      if (chartElement) {
        const canvas = await html2canvas(chartElement, {
          backgroundColor: theme === 'dark' ? '#131722' : '#ffffff',
          logging: false,
          useCORS: true,
          scale: 2
        });

        if (action === 'download') {
          const image = canvas.toDataURL("image/png");
          const link = document.createElement('a');
          link.href = image;
          link.download = `TradeView_${currentSymbol?.ticker}_${new Date().toISOString().slice(0,10)}.png`;
          link.click();
          addToast?.('success', 'Downloaded', 'Chart image saved');
        } else if (action === 'copy_image') {
           canvas.toBlob((blob: Blob | null) => {
             if (blob) {
               navigator.clipboard.write([
                 new ClipboardItem({ 'image/png': blob })
               ]).then(() => {
                 addToast?.('success', 'Image Copied', 'Chart image copied to clipboard');
               }).catch(err => {
                 console.error(err);
                 addToast?.('error', 'Error', 'Failed to copy image');
               });
             }
           });
        }
      }
    } catch (err) {
      console.error("Screenshot failed", err);
      addToast?.('error', 'Error', 'Failed to capture chart. Library may not be loaded.');
    } finally {
      setIsCapturing(false);
    }
  };

  return (
    <div className="h-14 border-b border-tv-border bg-tv-bg flex items-center px-2 justify-between select-none relative z-50 transition-colors">
      <div className="flex items-center space-x-1 h-full">
        {/* User / Menu */}
        <div className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-tv-pane cursor-pointer mr-2">
           <div className="w-6 h-6 rounded-full bg-gradient-to-br from-purple-500 to-blue-500"></div>
        </div>

        {/* Symbol Search Trigger */}
        <div className="flex items-center h-8 hover:bg-tv-pane rounded cursor-pointer transition-colors px-2 border-r border-tv-border mr-2" onClick={onSearchClick}>
          <Search size={18} className="text-tv-text mr-2" />
          <span className="font-bold text-tv-text mr-1">{currentSymbol?.ticker || 'BTCUSD'}</span>
          <span className="text-xs text-tv-muted hidden sm:inline">{currentSymbol?.exchange || 'BINANCE'}</span>
        </div>

        {/* Timeframes */}
        <div className="flex items-center space-x-[1px] h-full">
          {visibleIntervals.map((int) => (
            <button
              key={int}
              onClick={() => onIntervalChange(int)}
              className={`hidden md:block px-3 h-8 rounded text-sm font-medium hover:bg-tv-pane hover:text-tv-accent transition-colors ${currentInterval === int ? 'text-tv-accent bg-tv-pane' : 'text-tv-text'}`}
            >
              {int}
            </button>
          ))}
          
          {/* Mobile Timeframe Dropdown */}
          <div className="relative">
            <button 
              className={`px-2 h-8 rounded flex items-center gap-1 hover:bg-tv-pane ${['1M', '1Y'].includes(currentInterval) ? 'text-tv-accent' : 'text-tv-muted'}`}
              onClick={() => setShowMoreIntervals(!showMoreIntervals)}
            >
              <span className="md:hidden">{currentInterval}</span>
              <ChevronDown size={14} className="text-tv-text" />
            </button>
            
            {showMoreIntervals && (
              <div className="absolute top-full left-0 mt-1 w-24 bg-tv-pane border border-tv-border shadow-xl rounded-md py-1 flex flex-col z-50">
                <div className="md:hidden flex flex-col">
                  {visibleIntervals.map(int => (
                     <button
                        key={int}
                        onClick={() => { onIntervalChange(int); setShowMoreIntervals(false); }}
                        className={`text-left px-4 py-2 text-sm hover:bg-tv-bg hover:text-tv-accent ${currentInterval === int ? 'text-tv-accent' : 'text-tv-text'}`}
                      >
                        {int}
                      </button>
                  ))}
                  <div className="h-[1px] bg-tv-border my-1"></div>
                </div>

                {['1M', '1Y'].map((int) => (
                  <button
                    key={int}
                    onClick={() => { onIntervalChange(int as Interval); setShowMoreIntervals(false); }}
                    className={`text-left px-4 py-2 text-sm hover:bg-tv-bg hover:text-tv-accent ${currentInterval === int ? 'text-tv-accent' : 'text-tv-text'}`}
                  >
                    {int}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="w-[1px] h-6 bg-tv-border mx-2"></div>

        {/* Chart Style Switcher */}
        <div className="flex items-center space-x-1">
          <button 
            className={`p-2 rounded hover:bg-tv-pane transition-colors ${chartType === 'candlestick' ? 'text-tv-accent bg-tv-pane' : 'text-tv-text'}`}
            onClick={() => onChartTypeChange('candlestick')}
            title="Candlesticks"
          >
            <BarChart2 size={20} />
          </button>
           <button 
             className={`p-2 rounded hover:bg-tv-pane transition-colors hidden sm:block ${chartType === 'area' ? 'text-tv-accent bg-tv-pane' : 'text-tv-text'}`}
             onClick={() => onChartTypeChange('area')}
             title="Area/Line"
           >
            <LineChart size={20} />
          </button>
        </div>

        <div className="w-[1px] h-6 bg-tv-border mx-2 hidden sm:block"></div>

        <button 
          className="flex items-center space-x-1 px-3 py-1.5 rounded hover:bg-tv-pane text-tv-text hidden sm:flex transition-colors"
          onClick={onIndicatorsClick}
        >
          <Activity size={18} className="text-tv-muted" />
          <span className="text-sm font-medium">Indicators</span>
        </button>
      </div>

      <div className="flex items-center space-x-1">
        <div className="hidden sm:flex items-center">
             {onToggleTheme && (
               <button 
                 className="p-2 rounded hover:bg-tv-pane text-tv-muted hover:text-tv-text mr-1"
                 onClick={onToggleTheme}
                 title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`}
               >
                 {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
               </button>
             )}

             <button 
                className="p-2 rounded hover:bg-tv-pane text-tv-muted hover:text-tv-text" 
                title="Compare / Overlay" 
                onClick={onCompareClick}
             >
               <PlusCircle size={20} />
            </button>
            <button className="p-2 rounded hover:bg-tv-pane text-tv-muted hover:text-tv-text" onClick={onSettingsClick}>
              <Settings size={20} />
            </button>
             <button className="p-2 rounded hover:bg-tv-pane text-tv-muted hover:text-tv-text">
              <Maximize size={20} />
            </button>
             
             {/* SHARE DROPDOWN */}
             <div className="relative ml-2">
                <button 
                  onClick={() => setShowShareMenu(!showShareMenu)}
                  className="px-3 py-1.5 rounded bg-tv-accent text-white hover:bg-blue-600 transition-colors flex items-center gap-2 text-sm font-medium shadow-sm"
                >
                  {isCapturing ? <Loader2 size={16} className="animate-spin" /> : <Share2 size={16} />}
                  <span>Share</span>
                  <ChevronDown size={12} />
                </button>

                {showShareMenu && (
                  <div className="absolute right-0 top-full mt-2 w-48 bg-tv-pane border border-tv-border rounded shadow-xl py-1 z-50 animate-in fade-in zoom-in-95 duration-150">
                     <button onClick={() => handleShareAction('copy_link')} className="w-full text-left px-4 py-2 text-sm text-tv-text hover:bg-tv-bg flex items-center gap-2">
                        <Link size={14} /> Copy Link
                     </button>
                     <div className="h-[1px] bg-tv-border my-1"></div>
                     <button onClick={() => handleShareAction('copy_image')} className="w-full text-left px-4 py-2 text-sm text-tv-text hover:bg-tv-bg flex items-center gap-2">
                        <Copy size={14} /> Copy Image
                     </button>
                     <button onClick={() => handleShareAction('download')} className="w-full text-left px-4 py-2 text-sm text-tv-text hover:bg-tv-bg flex items-center gap-2">
                        <Download size={14} /> Download Image
                     </button>
                     <div className="h-[1px] bg-tv-border my-1"></div>
                     <button onClick={() => handleShareAction('twitter')} className="w-full text-left px-4 py-2 text-sm text-tv-text hover:bg-tv-bg flex items-center gap-2">
                        <Twitter size={14} /> Tweet
                     </button>
                  </div>
                )}
             </div>

        </div>
      </div>
      
      {(showMoreIntervals || showShareMenu) && (
        <div className="fixed inset-0 z-40 bg-transparent" onClick={() => { setShowMoreIntervals(false); setShowShareMenu(false); }}></div>
      )}
    </div>
  );
};

export default Header;