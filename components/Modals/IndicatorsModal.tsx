import * as React from 'react';
import { X, Plus, Trash2, Activity, Minus, Save, ArrowRight, Settings2 } from 'lucide-react';
import { Indicator, IndicatorType } from '../../types';

const { useState, useEffect } = React;

interface IndicatorsModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeIndicators: Indicator[];
  onAddIndicator: (indicator: Indicator) => void;
  onUpdateIndicator: (indicator: Indicator) => void;
  onRemoveIndicator: (id: string) => void;
}

const IndicatorsModal: React.FC<IndicatorsModalProps> = ({ 
  isOpen, 
  onClose, 
  activeIndicators,
  onAddIndicator,
  onUpdateIndicator,
  onRemoveIndicator
}) => {
  const [selectedType, setSelectedType] = useState<IndicatorType>('SMA');
  const [editingId, setEditingId] = useState<string | null>(null);

  // Indicator Params
  const [period, setPeriod] = useState<number>(20); 
  const [fastPeriod, setFastPeriod] = useState<number>(12);
  const [signalPeriod, setSignalPeriod] = useState<number>(9);
  const [stdDev, setStdDev] = useState<number>(2);
  const [color, setColor] = useState<string>('#2962ff');
  const [lineWidth, setLineWidth] = useState<number>(2);
  const [lineStyle, setLineStyle] = useState<'solid' | 'dashed' | 'dotted'>('solid');

  // Volume specific colors & MA
  const [upColor, setUpColor] = useState<string>('#089981');
  const [downColor, setDownColor] = useState<string>('#f23645');
  const [showMa, setShowMa] = useState<boolean>(false);
  const [maColor, setMaColor] = useState<string>('#ff9800');

  // Reset to default new state
  const resetForm = () => {
    setEditingId(null);
    setPeriod(20);
    setFastPeriod(12);
    setSignalPeriod(9);
    setStdDev(2);
    setColor('#2962ff');
    setLineWidth(2);
    setLineStyle('solid');
    setUpColor('#089981');
    setDownColor('#f23645');
    setShowMa(false);
    setMaColor('#ff9800');
  };

  // Smart defaults when switching types (only if not editing)
  useEffect(() => {
    if (editingId) return;

    if (selectedType === 'BB') {
      setPeriod(20);
      setStdDev(2);
      setColor('#2962ff'); 
    } else if (selectedType === 'RSI') {
      setPeriod(14);
      setColor('#9c27b0'); 
    } else if (selectedType === 'MACD') {
      setPeriod(26); // slow
      setFastPeriod(12);
      setSignalPeriod(9);
      setColor('#2962ff');
    } else if (selectedType === 'VOL') {
      setUpColor('#089981');
      setDownColor('#f23645');
      setPeriod(20); // Default MA length
      setShowMa(true); // Default to showing MA for Binance style
      setMaColor('#ff9800');
    }
  }, [selectedType, editingId]);

  // Handle Selection for Editing
  const handleSelectIndicator = (indicator: Indicator) => {
    setEditingId(indicator.id);
    setSelectedType(indicator.type);
    
    // Populate form
    setPeriod(indicator.period);
    if (indicator.fastPeriod) setFastPeriod(indicator.fastPeriod);
    if (indicator.signalPeriod) setSignalPeriod(indicator.signalPeriod);
    if (indicator.stdDev) setStdDev(indicator.stdDev);
    
    setColor(indicator.color);
    setLineWidth(indicator.lineWidth);
    setLineStyle(indicator.lineStyle);

    if (indicator.upColor) setUpColor(indicator.upColor);
    if (indicator.downColor) setDownColor(indicator.downColor);
    
    // Volume MA
    if (indicator.showMa !== undefined) setShowMa(indicator.showMa);
    else setShowMa(false);
    if (indicator.maColor) setMaColor(indicator.maColor);
  };

  if (!isOpen) return null;

  const handleSave = () => {
    const indicatorData: Indicator = {
      id: editingId || Math.random().toString(36).substr(2, 9),
      type: selectedType,
      period: period,
      fastPeriod: selectedType === 'MACD' ? fastPeriod : undefined,
      signalPeriod: ['MACD', 'STOCH'].includes(selectedType) ? signalPeriod : undefined,
      stdDev: selectedType === 'BB' ? stdDev : undefined,
      color: color,
      lineWidth: lineWidth,
      lineStyle: lineStyle,
      // Volume Specific
      upColor: selectedType === 'VOL' ? upColor : undefined,
      downColor: selectedType === 'VOL' ? downColor : undefined,
      showMa: selectedType === 'VOL' ? showMa : undefined,
      maColor: selectedType === 'VOL' ? maColor : undefined
    };

    if (editingId) {
      onUpdateIndicator(indicatorData);
      setEditingId(null); // Exit edit mode
    } else {
      onAddIndicator(indicatorData);
    }
  };

  const presetColors = ['#2962ff', '#f23645', '#089981', '#ff9800', '#9c27b0', '#e91e63', '#ffffff'];

  return (
    <div className="fixed inset-0 bg-black/60 z-[60] flex items-center justify-center backdrop-blur-sm" onClick={onClose}>
      <div className="bg-tv-pane w-full max-w-3xl rounded-lg shadow-2xl border border-tv-border flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
        
        <div className="flex items-center justify-between p-4 border-b border-tv-border bg-tv-bg">
          <div className="flex items-center gap-2">
            <Activity className="text-tv-accent" size={20} />
            <h2 className="text-lg font-bold text-tv-text">Indicators Library</h2>
          </div>
          <button onClick={onClose} className="text-tv-muted hover:text-tv-text">
            <X size={20} />
          </button>
        </div>

        <div className="flex flex-col md:flex-row h-full max-h-[600px]">
          
          {/* Active List Panel (Left/Top) */}
          <div className="md:w-64 border-r border-tv-border bg-tv-bg/50 flex flex-col">
             <div className="p-4 border-b border-tv-border flex justify-between items-center bg-tv-bg">
               <h3 className="text-xs font-bold text-tv-muted uppercase">Active Indicators</h3>
               <button 
                 onClick={resetForm} 
                 className="text-xs text-tv-accent hover:underline flex items-center gap-1"
                 title="Add New Indicator"
               >
                 <Plus size={12} /> New
               </button>
             </div>
             
             <div className="flex-1 overflow-y-auto space-y-1 p-2 custom-scrollbar">
                {activeIndicators.length === 0 ? (
                  <p className="text-xs text-tv-muted italic text-center py-8">No indicators active</p>
                ) : (
                  activeIndicators.map(ind => (
                    <div 
                      key={ind.id} 
                      onClick={() => handleSelectIndicator(ind)}
                      className={`
                        flex items-center justify-between p-3 rounded cursor-pointer border transition-all
                        ${editingId === ind.id 
                          ? 'bg-tv-accent/10 border-tv-accent shadow-sm' 
                          : 'bg-tv-pane border-transparent hover:bg-tv-border/50 hover:border-tv-border'}
                      `}
                    >
                      <div className="flex flex-col overflow-hidden">
                         <div className="flex items-center gap-2">
                            {ind.type !== 'VOL' && <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: ind.color }}></div>}
                            {ind.type === 'VOL' && (
                              <div className="flex gap-0.5">
                                <div className="w-1.5 h-2 rounded-sm shrink-0" style={{ backgroundColor: ind.upColor || '#089981' }}></div>
                                <div className="w-1.5 h-2 rounded-sm shrink-0" style={{ backgroundColor: ind.downColor || '#f23645' }}></div>
                              </div>
                            )}
                            <span className={`text-sm font-medium truncate ${editingId === ind.id ? 'text-tv-accent' : 'text-tv-text'}`}>
                              {ind.type} 
                            </span>
                         </div>
                         <div className="text-[10px] text-tv-muted truncate pl-4">
                            {ind.type === 'MACD' && `${ind.fastPeriod}, ${ind.period}, ${ind.signalPeriod}`}
                            {ind.type === 'BB' && `${ind.period}, ${ind.stdDev}`}
                            {ind.type === 'VOL' && ind.showMa && `MA: ${ind.period}`}
                            {!['MACD', 'VOL', 'BB'].includes(ind.type) && `Len: ${ind.period}`}
                         </div>
                      </div>
                      <div className="flex items-center gap-1">
                        {editingId === ind.id && <Settings2 size={14} className="text-tv-accent mr-1 animate-spin-slow" />}
                        <button 
                          onClick={(e) => { e.stopPropagation(); onRemoveIndicator(ind.id); if (editingId === ind.id) resetForm(); }}
                          className="text-tv-muted hover:text-tv-red p-1 rounded hover:bg-tv-bg transition-colors"
                          title="Remove"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  ))
                )}
             </div>
          </div>

          {/* Config Panel (Right/Main) */}
          <div className="p-6 flex-1 overflow-y-auto bg-tv-pane">
            <div className="max-w-md mx-auto space-y-6">
              
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-tv-text flex items-center gap-2">
                  {editingId ? (
                    <>
                      <Settings2 size={18} className="text-tv-accent" />
                      Edit {selectedType} Settings
                    </>
                  ) : (
                    <>
                      <Plus size={18} className="text-tv-accent" />
                      Add New Indicator
                    </>
                  )}
                </h3>
                {editingId && (
                  <button onClick={resetForm} className="text-xs text-tv-muted hover:text-tv-text underline">
                    Cancel Edit
                  </button>
                )}
              </div>
              
              <div className="space-y-4 p-5 bg-tv-bg rounded-lg border border-tv-border shadow-sm">
                
                {/* Type Selection */}
                <div className="space-y-1">
                  <label className="text-xs text-tv-muted font-bold uppercase tracking-wider">Indicator Type</label>
                  <select 
                    className="w-full bg-tv-pane border border-tv-border rounded p-2.5 text-sm text-tv-text outline-none focus:border-tv-accent transition-colors"
                    value={selectedType}
                    onChange={(e) => setSelectedType(e.target.value as IndicatorType)}
                    disabled={!!editingId} 
                  >
                    <option value="SMA">SMA (Simple Moving Avg)</option>
                    <option value="EMA">EMA (Exponential Moving Avg)</option>
                    <option value="WMA">WMA (Weighted Moving Avg)</option>
                    <option value="BB">Bollinger Bands</option>
                    <option value="RSI">RSI (Relative Strength Index)</option>
                    <option value="MACD">MACD (Moving Avg Convergence Divergence)</option>
                    <option value="STOCH">Stochastic Oscillator</option>
                    <option value="VOL">Volume</option>
                  </select>
                  {editingId && <p className="text-[10px] text-tv-muted italic">Type cannot be changed while editing.</p>}
                </div>
                
                {/* Dynamic Inputs based on Type */}
                <div className="grid grid-cols-2 gap-4">
                  {(['SMA', 'EMA', 'WMA', 'RSI', 'STOCH', 'BB'].includes(selectedType)) && (
                     <div className="space-y-1 col-span-2">
                      <label className="text-xs text-tv-muted">Length {selectedType === 'STOCH' ? '(%K)' : ''}</label>
                      <input 
                        type="number" 
                        min="1" 
                        className="w-full bg-tv-pane border border-tv-border rounded p-2 text-sm text-tv-text outline-none focus:border-tv-accent"
                        value={period}
                        onChange={(e) => setPeriod(parseInt(e.target.value) || 1)}
                      />
                    </div>
                  )}

                  {selectedType === 'BB' && (
                    <div className="space-y-1 col-span-2">
                      <label className="text-xs text-tv-muted">StdDev</label>
                      <input 
                        type="number" 
                        min="0.1"
                        step="0.1"
                        className="w-full bg-tv-pane border border-tv-border rounded p-2 text-sm text-tv-text outline-none focus:border-tv-accent"
                        value={stdDev}
                        onChange={(e) => setStdDev(parseFloat(e.target.value))}
                      />
                    </div>
                  )}

                  {selectedType === 'MACD' && (
                    <>
                      <div className="space-y-1">
                        <label className="text-xs text-tv-muted">Fast Length</label>
                        <input 
                          type="number"
                          className="w-full bg-tv-pane border border-tv-border rounded p-2 text-sm text-tv-text outline-none focus:border-tv-accent"
                          value={fastPeriod}
                          onChange={(e) => setFastPeriod(parseInt(e.target.value))}
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs text-tv-muted">Slow Length</label>
                        <input 
                          type="number"
                          className="w-full bg-tv-pane border border-tv-border rounded p-2 text-sm text-tv-text outline-none focus:border-tv-accent"
                          value={period} // Using period state for Slow
                          onChange={(e) => setPeriod(parseInt(e.target.value))}
                        />
                      </div>
                    </>
                  )}

                  {(['MACD', 'STOCH'].includes(selectedType)) && (
                    <div className={`space-y-1 ${selectedType === 'STOCH' ? 'col-span-2' : 'col-span-2'}`}>
                      <label className="text-xs text-tv-muted">Signal {selectedType === 'STOCH' ? '(%D)' : 'Smoothing'}</label>
                      <input 
                        type="number"
                        className="w-full bg-tv-pane border border-tv-border rounded p-2 text-sm text-tv-text outline-none focus:border-tv-accent"
                        value={signalPeriod}
                        onChange={(e) => setSignalPeriod(parseInt(e.target.value))}
                      />
                    </div>
                  )}
                </div>

                {selectedType === 'VOL' ? (
                   <div className="space-y-4 pt-2 border-t border-tv-border mt-2">
                    <div className="space-y-2">
                      <label className="text-xs text-tv-muted font-bold uppercase tracking-wider">Volume Colors</label>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <label className="text-[10px] text-tv-muted">Up Color (Bullish)</label>
                          <input 
                            type="color" 
                            value={upColor}
                            onChange={(e) => setUpColor(e.target.value)}
                            className="w-full h-8 cursor-pointer border border-tv-border rounded p-0 bg-transparent"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] text-tv-muted">Down Color (Bearish)</label>
                          <input 
                            type="color" 
                            value={downColor}
                            onChange={(e) => setDownColor(e.target.value)}
                            className="w-full h-8 cursor-pointer border border-tv-border rounded p-0 bg-transparent"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2 pt-2 border-t border-tv-border">
                       <div className="flex items-center justify-between">
                          <label className="text-xs text-tv-muted font-bold uppercase tracking-wider">Volume MA</label>
                          <div className="flex items-center gap-2">
                             <label className="text-[10px] text-tv-text cursor-pointer select-none" htmlFor="showVolMa">Show</label>
                             <input 
                               id="showVolMa"
                               type="checkbox" 
                               checked={showMa} 
                               onChange={e => setShowMa(e.target.checked)}
                               className="accent-tv-accent"
                             />
                          </div>
                       </div>
                       
                       {showMa && (
                         <div className="grid grid-cols-2 gap-4 animate-in slide-in-from-top-2 duration-200">
                            <div className="space-y-1">
                               <label className="text-[10px] text-tv-muted">MA Length</label>
                               <input 
                                 type="number" 
                                 value={period}
                                 onChange={e => setPeriod(parseInt(e.target.value) || 1)}
                                 className="w-full bg-tv-pane border border-tv-border rounded p-1.5 text-xs text-tv-text outline-none focus:border-tv-accent"
                               />
                            </div>
                            <div className="space-y-1">
                               <label className="text-[10px] text-tv-muted">MA Color</label>
                               <div className="flex gap-2">
                                 <input 
                                   type="color" 
                                   value={maColor}
                                   onChange={e => setMaColor(e.target.value)}
                                   className="h-7 flex-1 cursor-pointer border border-tv-border rounded p-0 bg-transparent"
                                 />
                               </div>
                            </div>
                         </div>
                       )}
                    </div>
                  </div>
                ) : (
                <>
                  <div className="space-y-2 pt-2 border-t border-tv-border mt-2">
                    <label className="text-xs text-tv-muted font-bold uppercase tracking-wider">Style</label>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-[10px] text-tv-muted">Thickness</label>
                        <div className="flex items-center gap-2">
                          <input 
                            type="range" 
                            min="1" 
                            max="5"
                            step="1"
                            className="flex-1 accent-tv-accent h-1 bg-tv-border rounded-lg appearance-none cursor-pointer"
                            value={lineWidth}
                            onChange={(e) => setLineWidth(parseInt(e.target.value))}
                          />
                          <span className="text-xs font-mono w-4">{lineWidth}</span>
                        </div>
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] text-tv-muted">Line Type</label>
                        <select 
                          className="w-full bg-tv-pane border border-tv-border rounded p-1.5 text-xs text-tv-text outline-none focus:border-tv-accent"
                          value={lineStyle}
                          onChange={(e) => setLineStyle(e.target.value as any)}
                        >
                          <option value="solid">Solid</option>
                          <option value="dashed">Dashed</option>
                          <option value="dotted">Dotted</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs text-tv-muted">Color</label>
                    <div className="flex gap-2 flex-wrap">
                      {presetColors.map(c => (
                        <button
                          key={c}
                          className={`w-6 h-6 rounded-full border-2 transition-all shadow-sm ${color === c ? 'border-white scale-110 ring-2 ring-tv-border' : 'border-transparent hover:scale-110'}`}
                          style={{ backgroundColor: c }}
                          onClick={() => setColor(c)}
                        />
                      ))}
                      <div className="w-px h-6 bg-tv-border mx-1"></div>
                      <input 
                        type="color" 
                        value={color}
                        onChange={(e) => setColor(e.target.value)}
                        className="w-6 h-6 rounded cursor-pointer border-0 p-0 overflow-hidden"
                        title="Custom Color"
                      />
                    </div>
                  </div>
                </>
                )}

                <button 
                  onClick={handleSave}
                  className={`w-full py-2.5 rounded font-bold text-white shadow-lg transition-all flex items-center justify-center gap-2 mt-4
                    ${editingId ? 'bg-tv-green hover:bg-green-600' : 'bg-tv-accent hover:bg-blue-600'}
                  `}
                >
                  {editingId ? (
                    <> <Save size={18} /> Update Indicator </>
                  ) : (
                    <> <Plus size={18} /> Add to Chart </>
                  )}
                </button>

              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default IndicatorsModal;