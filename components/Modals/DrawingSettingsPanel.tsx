import * as React from 'react';
import { X, Trash2, Lock, Unlock, Eye, EyeOff, Settings, RefreshCcw } from 'lucide-react';
import { Drawing, FibonacciDrawing, TextDrawing, DefaultDrawingSettings } from '../../types';

const { useState, useEffect } = React;

interface DrawingSettingsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  // Edit Mode
  drawing: Drawing | null;
  drawings?: Drawing[]; // needed to check state in default mode
  onUpdate: (drawing: Drawing) => void;
  onDelete: (id: string) => void;
  // Default Config Mode
  defaultSettings: DefaultDrawingSettings;
  onUpdateDefaults: (settings: DefaultDrawingSettings) => void;
  // Batch Actions
  onToggleHideType?: (type: string) => void;
  onToggleLockType?: (type: string) => void;
}

const DrawingSettingsPanel: React.FC<DrawingSettingsPanelProps> = ({
  isOpen,
  onClose,
  drawing,
  drawings = [],
  onUpdate,
  onDelete,
  defaultSettings,
  onUpdateDefaults,
  onToggleHideType,
  onToggleLockType
}) => {
  const [activeTab, setActiveTab] = useState<string>('trendline');

  // Sync active tab with selected drawing type when it opens/changes
  useEffect(() => {
    if (drawing) {
      setActiveTab(drawing.type);
    }
  }, [drawing]);

  if (!isOpen) return null;
  // Safety check: if defaultSettings is not loaded yet, do not render to avoid crash
  if (!defaultSettings) return null;

  const isEditMode = !!drawing;
  
  // The type being edited (either the specific drawing type or the selected default tab)
  const currentType = isEditMode ? drawing.type : activeTab;

  // Safety: ensure the type exists in defaults
  const configExists = defaultSettings[currentType as keyof DefaultDrawingSettings];
  if (!configExists && !isEditMode) return null;

  // --- UNIFIED GETTER ---
  // Reads from the Live Drawing first, falls back to Default Settings
  const getValue = (field: string) => {
    if (isEditMode && drawing) {
      // @ts-ignore
      const val = drawing[field];
      return val !== undefined ? val : (defaultSettings[currentType as keyof DefaultDrawingSettings] as any)?.[field];
    }
    // Default Mode
    return (defaultSettings[currentType as keyof DefaultDrawingSettings] as any)?.[field];
  };

  const getLevels = () => {
      if (isEditMode && drawing && drawing.type === 'fibonacci') {
          return (drawing as FibonacciDrawing).levels;
      }
      if (!isEditMode && activeTab === 'fibonacci') {
          return defaultSettings.fibonacci.levels;
      }
      return [];
  }

  // --- UNIFIED SETTER ---
  // Updates Live Drawing OR Default Settings based on context
  const handleValueChange = (field: string, value: any) => {
    if (isEditMode && drawing) {
      // INSTANT UPDATE: Update the specific drawing object
      onUpdate({ ...drawing, [field]: value });
    } else {
      // Update Global Defaults
      onUpdateDefaults({
        ...defaultSettings,
        [currentType]: {
          ...defaultSettings[currentType as keyof DefaultDrawingSettings],
          [field]: value
        }
      });
    }
  };

  // --- SPECIFIC HANDLERS FOR NESTED OBJECTS (FIBONACCI) ---

  const handleFibLevelToggle = (index: number) => {
    const levels = getLevels();
    if (!levels) return;
    
    const newLevels = levels.map((lvl, i) => i === index ? { ...lvl, visible: !lvl.visible } : lvl);
    
    if (isEditMode && drawing) {
        onUpdate({ ...drawing as FibonacciDrawing, levels: newLevels });
    } else {
        onUpdateDefaults({
            ...defaultSettings,
            fibonacci: { ...defaultSettings.fibonacci, levels: newLevels }
        });
    }
  };

  const handleFibLevelColor = (index: number, color: string) => {
    const levels = getLevels();
    if (!levels) return;

    const newLevels = levels.map((lvl, i) => i === index ? { ...lvl, color: color } : lvl);

    if (isEditMode && drawing) {
        onUpdate({ ...drawing as FibonacciDrawing, levels: newLevels });
    } else {
        onUpdateDefaults({
            ...defaultSettings,
            fibonacci: { ...defaultSettings.fibonacci, levels: newLevels }
        });
    }
  };

  // For Default Mode: Calculate state of all drawings of this type
  const areAllVisible = !isEditMode 
    ? drawings.filter(d => d.type === currentType).every(d => d.visible !== false)
    : (drawing?.visible !== false);

  const areAllLocked = !isEditMode
    ? drawings.filter(d => d.type === currentType).every(d => d.locked)
    : (drawing?.locked);

  return (
    <div className="absolute top-14 left-[50px] bottom-0 w-80 bg-tv-pane border-r border-tv-border shadow-xl z-40 flex flex-col animate-in slide-in-from-left duration-200">
      
      {/* HEADER */}
      <div className="flex items-center justify-between p-4 border-b border-tv-border bg-tv-bg">
        <div className="flex items-center gap-2">
            <Settings size={16} className="text-tv-accent" />
            <div className="flex flex-col">
              <h3 className="text-sm font-bold text-tv-text uppercase tracking-wider">
                {isEditMode ? `${drawing.type} Settings` : 'Default Config'}
              </h3>
              {isEditMode && <span className="text-[10px] text-tv-muted">Editing ID: {drawing.id.slice(-4)}</span>}
            </div>
        </div>
        <button onClick={onClose} className="text-tv-muted hover:text-tv-text">
          <X size={16} />
        </button>
      </div>

      {/* TABS (Only visible if NOT in edit mode) */}
      {!isEditMode && (
          <div className="flex bg-tv-bg border-b border-tv-border overflow-x-auto scrollbar-hide">
              {['trendline', 'fibonacci', 'text', 'brush'].map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`flex-1 py-3 px-2 text-[10px] font-bold uppercase tracking-wide border-b-2 transition-colors whitespace-nowrap ${activeTab === tab ? 'border-tv-accent text-tv-accent bg-tv-accent/5' : 'border-transparent text-tv-muted hover:text-tv-text'}`}
                  >
                      {tab}
                  </button>
              ))}
          </div>
      )}

      {/* BODY CONTENT */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6 custom-scrollbar">
        
        {/* GLOBAL CONTROLS (Visibility/Lock) - Visible in BOTH modes now */}
        {/* In Default Mode, these apply to the ACTIVE TAB type (e.g., All Fibonaccis) */}
        <div className="flex gap-2 mb-2 p-2 bg-tv-bg rounded border border-tv-border">
            <button 
                onClick={() => {
                    if (isEditMode) handleValueChange('visible', !drawing.visible);
                    else onToggleHideType?.(currentType);
                }}
                className={`flex-1 flex items-center justify-center gap-2 p-1.5 rounded transition-colors ${areAllVisible ? 'text-tv-accent' : 'text-tv-muted'}`}
                title={isEditMode ? "Toggle Visibility" : `Toggle All ${currentType}s Visibility`}
            >
                {areAllVisible ? <Eye size={18} /> : <EyeOff size={18} />}
                {!isEditMode && <span className="text-[10px] uppercase font-bold">All {currentType}s</span>}
            </button>
            <div className="w-px bg-tv-border my-1"></div>
            <button 
                onClick={() => {
                    if (isEditMode) handleValueChange('locked', !drawing.locked);
                    else onToggleLockType?.(currentType);
                }}
                className={`flex-1 flex items-center justify-center gap-2 p-1.5 rounded transition-colors ${areAllLocked ? 'text-orange-500' : 'text-tv-muted'}`}
                title={isEditMode ? "Toggle Lock" : `Toggle All ${currentType}s Lock`}
            >
                {areAllLocked ? <Lock size={18} /> : <Unlock size={18} />}
                {!isEditMode && <span className="text-[10px] uppercase font-bold">All {currentType}s</span>}
            </button>
        </div>

        {/* --- FIBONACCI SETTINGS --- */}
        {currentType === 'fibonacci' && (
          <>
            {/* 1. Display Style */}
            <div className="space-y-2 pb-4 border-b border-tv-border">
              <label className="text-xs font-bold text-tv-muted uppercase">Display Style</label>
              <div className="flex bg-tv-bg rounded p-1 border border-tv-border">
                {['lines', 'circles'].map((subtype) => (
                  <button
                    key={subtype}
                    onClick={() => handleValueChange('subtype', subtype)}
                    className={`flex-1 py-1.5 text-xs font-medium rounded capitalize transition-all ${
                      getValue('subtype') === subtype ? 'bg-tv-pane text-tv-accent shadow-sm' : 'text-tv-muted hover:text-tv-text'
                    }`}
                  >
                    {subtype}
                  </button>
                ))}
              </div>
            </div>

            {/* 2. Interm. Style & Width */}
            <div className="space-y-4 pb-4 border-b border-tv-border">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-tv-muted uppercase">Interm. Style</label>
                  <select 
                      value={getValue('style') || 'dashed'}
                      onChange={(e) => handleValueChange('style', e.target.value)}
                      className="w-full bg-tv-bg border border-tv-border rounded text-xs p-2 text-tv-text outline-none focus:border-tv-accent"
                  >
                      <option value="solid">Solid</option>
                      <option value="dashed">Dashed</option>
                      <option value="dotted">Dotted</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between">
                      <label className="text-xs font-bold text-tv-muted uppercase">Width</label>
                      <span className="text-xs font-mono text-tv-text">{getValue('width')}px</span>
                  </div>
                  <input 
                      type="range" min="1" max="5" step="1"
                      value={getValue('width') ?? 2}
                      onChange={(e) => handleValueChange('width', parseInt(e.target.value))}
                      className="w-full accent-tv-accent h-1.5 bg-tv-border rounded-lg appearance-none cursor-pointer"
                  />
                </div>
                
                 <div className="space-y-2">
                    <label className="text-xs font-bold text-tv-muted uppercase">Base Color</label>
                     <input 
                        type="color" 
                        value={getValue('color') || '#2962ff'}
                        onChange={(e) => handleValueChange('color', e.target.value)}
                        className="w-full h-8 cursor-pointer border border-tv-border rounded bg-transparent"
                    />
                 </div>
            </div>

            {/* 3. Label Options */}
            <div className="space-y-3 pb-4 border-b border-tv-border">
               <label className="text-xs font-bold text-tv-muted uppercase">Label Options</label>
               
               <div className="space-y-2">
                   <label className="text-[10px] text-tv-muted">Value Format</label>
                   <select 
                       value={getValue('labelType') || 'value'}
                       onChange={(e) => handleValueChange('labelType', e.target.value)}
                       className="w-full bg-tv-bg border border-tv-border rounded text-xs p-1.5 text-tv-text outline-none focus:border-tv-accent"
                   >
                       <option value="value">Value (e.g. 0.618)</option>
                       <option value="percent">Percent (e.g. 61.8%)</option>
                       <option value="price">Price (e.g. 150.20)</option>
                   </select>
               </div>
               
               <div className="space-y-2">
                    <label className="text-[10px] text-tv-muted">Alignment</label>
                    <div className="flex bg-tv-bg border border-tv-border rounded p-0.5 h-[28px]">
                       {['left', 'center', 'right'].map(align => (
                           <button 
                             key={align}
                             onClick={() => handleValueChange('labelAlignment', align)}
                             className={`flex-1 text-[10px] uppercase rounded flex items-center justify-center transition-all ${
                                 getValue('labelAlignment') === align ? 'bg-tv-pane text-tv-accent shadow-sm font-bold' : 'text-tv-muted'
                             }`}
                           >
                             {align}
                           </button>
                       ))}
                    </div>
               </div>
            </div>

            {/* 4. Extensions */}
             <div className="space-y-3 pb-4 border-b border-tv-border">
              <label className="text-xs font-bold text-tv-muted uppercase">Extensions</label>
              <div className="flex flex-col gap-2">
                 <label className="flex items-center gap-2 text-xs text-tv-text cursor-pointer hover:text-tv-accent bg-tv-bg/50 p-2 rounded transition-colors">
                    <input 
                      type="checkbox" 
                      checked={getValue('showLabels') ?? true}
                      onChange={(e) => handleValueChange('showLabels', e.target.checked)}
                      className="accent-tv-accent"
                    />
                    Show Labels
                 </label>
                 
                 {getValue('subtype') === 'lines' && (
                     <div className="grid grid-cols-2 gap-2">
                        <label className="flex items-center gap-2 text-xs text-tv-text cursor-pointer hover:text-tv-accent bg-tv-bg/50 p-2 rounded transition-colors">
                            <input 
                            type="checkbox" 
                            checked={getValue('extendLeft') ?? false}
                            onChange={(e) => handleValueChange('extendLeft', e.target.checked)}
                            className="accent-tv-accent"
                            />
                            Extend Left
                        </label>
                        <label className="flex items-center gap-2 text-xs text-tv-text cursor-pointer hover:text-tv-accent bg-tv-bg/50 p-2 rounded transition-colors">
                            <input 
                            type="checkbox" 
                            checked={getValue('extendRight') ?? false}
                            onChange={(e) => handleValueChange('extendRight', e.target.checked)}
                            className="accent-tv-accent"
                            />
                            Extend Right
                        </label>
                     </div>
                 )}
              </div>
             </div>

             {/* 5. Levels List - VISIBLE IN BOTH MODES */}
             <div className="space-y-2">
              <div className="flex justify-between items-center">
                  <label className="text-xs font-bold text-tv-muted uppercase">Fib Levels</label>
                  <button onClick={() => {}} className="text-[10px] text-tv-accent hover:underline flex items-center gap-1"><RefreshCcw size={10}/> Reset</button>
              </div>
              <div className="space-y-1">
                {(getLevels() || []).map((level: any, idx: number) => (
                    <div key={idx} className="flex items-center gap-2 group hover:bg-tv-bg p-1 rounded transition-colors border border-transparent hover:border-tv-border">
                        <input 
                            type="checkbox" 
                            checked={level.visible} 
                            onChange={() => handleFibLevelToggle(idx)}
                            className="accent-tv-accent cursor-pointer"
                        />
                        <span className="text-xs font-mono w-12 text-tv-text">{level.value}</span>
                        <div className="flex-1 h-px bg-tv-border mx-2 border-t border-dashed border-tv-muted/30"></div>
                        <input 
                            type="color" 
                            value={level.color} 
                            onChange={(e) => handleFibLevelColor(idx, e.target.value)}
                            className="w-5 h-5 border-none bg-transparent cursor-pointer rounded-sm overflow-hidden"
                        />
                    </div>
                ))}
              </div>
            </div>
          </>
        )}

        {/* --- TRENDLINE SETTINGS --- */}
        {currentType === 'trendline' && (
            <div className="space-y-4">
                 <div className="space-y-2">
                    <label className="text-xs font-bold text-tv-muted uppercase">Line Style</label>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <label className="text-[10px] text-tv-muted">Color</label>
                            <input 
                                type="color" 
                                value={getValue('color') || '#2962ff'}
                                onChange={(e) => handleValueChange('color', e.target.value)}
                                className="w-full h-8 cursor-pointer border border-tv-border rounded bg-transparent"
                            />
                        </div>
                         <div className="space-y-1">
                            <label className="text-[10px] text-tv-muted">Style</label>
                            <select 
                                value={getValue('style') || 'solid'}
                                onChange={(e) => handleValueChange('style', e.target.value)}
                                className="w-full h-8 bg-tv-bg border border-tv-border rounded text-xs text-tv-text outline-none"
                            >
                                <option value="solid">Solid</option>
                                <option value="dashed">Dashed</option>
                                <option value="dotted">Dotted</option>
                            </select>
                        </div>
                    </div>
                 </div>
                 <div className="space-y-1">
                    <label className="text-xs font-bold text-tv-muted uppercase">Thickness</label>
                    <input 
                        type="range" 
                        min="1" max="10" 
                        value={getValue('width') ?? 2}
                        onChange={(e) => handleValueChange('width', parseInt(e.target.value))}
                        className="w-full accent-tv-accent h-1.5 bg-tv-border rounded-lg appearance-none cursor-pointer"
                    />
                 </div>
            </div>
        )}

        {/* --- TEXT SETTINGS --- */}
        {currentType === 'text' && (
            <div className="space-y-4">
                {isEditMode && (
                    <div className="space-y-1">
                        <label className="text-xs font-bold text-tv-muted uppercase">Content</label>
                        <textarea 
                            value={(drawing as TextDrawing).text}
                            onChange={(e) => handleValueChange('text', e.target.value)}
                            className="w-full h-20 bg-tv-bg border border-tv-border rounded p-2 text-sm text-tv-text outline-none resize-none focus:border-tv-accent"
                        />
                    </div>
                )}
                <div className="flex gap-4">
                    <div className="space-y-1 flex-1">
                         <label className="text-xs text-tv-muted uppercase">Size</label>
                         <input 
                            type="number" 
                            value={getValue('fontSize') ?? 14}
                            onChange={(e) => handleValueChange('fontSize', parseInt(e.target.value))}
                            className="w-full bg-tv-bg border border-tv-border rounded p-1.5 text-sm text-tv-text"
                         />
                    </div>
                     <div className="space-y-1 flex-1">
                         <label className="text-xs text-tv-muted uppercase">Color</label>
                         <input 
                            type="color" 
                            value={getValue('color') || '#ffffff'}
                            onChange={(e) => handleValueChange('color', e.target.value)}
                            className="w-full h-8 border border-tv-border rounded cursor-pointer bg-transparent"
                         />
                    </div>
                </div>
            </div>
        )}

        {/* --- BRUSH SETTINGS --- */}
        {currentType === 'brush' && (
            <div className="space-y-4">
                 <div className="flex gap-4">
                     <div className="space-y-1 flex-1">
                         <label className="text-xs text-tv-muted uppercase">Color</label>
                         <input 
                            type="color" 
                            value={getValue('color') || '#2962ff'}
                            onChange={(e) => handleValueChange('color', e.target.value)}
                            className="w-full h-8 border border-tv-border rounded cursor-pointer bg-transparent"
                         />
                    </div>
                 </div>
                 <div className="space-y-1">
                    <label className="text-xs font-bold text-tv-muted uppercase">Thickness</label>
                    <input 
                        type="range" 
                        min="1" max="10" 
                        value={getValue('width') ?? 2}
                        onChange={(e) => handleValueChange('width', parseInt(e.target.value))}
                        className="w-full accent-tv-accent h-1.5 bg-tv-border rounded-lg appearance-none cursor-pointer"
                    />
                 </div>
            </div>
        )}

      </div>

      {isEditMode && drawing && (
        <div className="p-4 border-t border-tv-border bg-tv-bg mt-auto">
            <button 
            onClick={() => { onDelete(drawing.id); onClose(); }}
            className="w-full py-2 bg-tv-red/10 text-tv-red border border-tv-red/20 rounded hover:bg-tv-red hover:text-white transition-colors flex items-center justify-center gap-2 text-sm font-medium"
            >
            <Trash2 size={16} /> Delete Drawing
            </button>
        </div>
      )}
    </div>
  );
};

export default DrawingSettingsPanel;