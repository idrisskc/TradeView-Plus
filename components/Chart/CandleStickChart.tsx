import * as React from 'react';
import ReactApexChart from 'react-apexcharts';
import { ApexOptions } from 'apexcharts';
import { CandleData, ChartSettings, Indicator, Drawing, ToolType, BrushDrawing, TextDrawing, PointDrawing, Comparison, FibonacciDrawing } from '../../types';
import { calculateSMA, calculateEMA, calculateWMA, calculateBollingerBands } from '../../services/technicalAnalysis';
import { ZoomIn, ZoomOut, RotateCcw, X, Settings, AlertTriangle, Eye, EyeOff } from 'lucide-react';

const { useMemo, useRef, useState, useEffect, useCallback } = React;

// Safe import handling for ApexCharts to prevent 'Element type is invalid' errors
const Chart = (ReactApexChart as any).default || ReactApexChart;

interface CandleStickChartProps {
  data: CandleData[];
  settings: ChartSettings;
  activeIndicators: Indicator[];
  comparisons?: Comparison[];
  onRemoveComparison?: (id: string) => void;
  onToggleIndicatorVisibility?: (id: string) => void;
  height?: number | string;
  groupId?: string; 
  theme?: 'dark' | 'light';
  isLoading?: boolean;
  
  // Drawing Props
  activeTool?: ToolType;
  drawings?: Drawing[];
  onNewDrawing?: (drawing: Drawing) => void;
  onUpdateDrawing?: (drawing: Drawing) => void;
  onSelectDrawing?: (drawing: Drawing | null) => void;
  onDeleteDrawing?: (id: string) => void;
  onOpenSettings?: () => void;
  // Global Drawing States
  isLocked?: boolean;
  isHidden?: boolean;
}

interface ChartBounds {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
  gridWidth: number;
  gridHeight: number;
}

const CandleStickChart: React.FC<CandleStickChartProps> = ({ 
  data, 
  settings, 
  activeIndicators,
  comparisons = [],
  onRemoveComparison,
  onToggleIndicatorVisibility,
  groupId = "market-charts",
  theme = 'dark',
  isLoading = false,
  activeTool = 'cursor',
  drawings = [],
  onNewDrawing,
  onUpdateDrawing,
  onSelectDrawing,
  onDeleteDrawing,
  onOpenSettings,
  isLocked = false,
  isHidden = false
}) => {
  const chartRef = useRef<any>(null);
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  // Internal State for Interaction Layer
  const [bounds, setBounds] = useState<ChartBounds | null>(null);
  const boundsRef = useRef<ChartBounds | null>(null);
  
  // Drawing Interactions
  const [dragInfo, setDragInfo] = useState<{ id: string; pointIndex?: number; type: 'point' | 'text' } | null>(null);
  const [anchorPoint, setAnchorPoint] = useState<{x: number, y: number, price: number, time: number} | null>(null); 
  const [mousePos, setMousePos] = useState<{x: number, y: number} | null>(null);

  const [tempBrushPath, setTempBrushPath] = useState<{x: number, y: number, price: number, time: number}[]>([]);
  const [isDrawingBrush, setIsDrawingBrush] = useState(false);
  
  // Text Creation State
  const [textInputPos, setTextInputPos] = useState<{x: number, y: number, price: number, time: number} | null>(null);
  const [textInputValue, setTextInputValue] = useState('');

  // Context Menu State
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; drawingId: string } | null>(null);

  // State for Interactive Legend
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  const overlayIndicators = useMemo(() => 
    activeIndicators.filter(i => ['SMA', 'EMA', 'WMA', 'BB'].includes(i.type)), 
  [activeIndicators]);

  const sanitizedData = useMemo(() => {
    if (!data) return [];
    return data.filter(d => 
      isFinite(d.open) && isFinite(d.high) && isFinite(d.low) && isFinite(d.close) && isFinite(d.time) && d.open > 0
    );
  }, [data]);

  useEffect(() => {
    if (sanitizedData.length > 0 && activeIndex === null) {
      setActiveIndex(sanitizedData.length - 1);
    }
  }, [sanitizedData.length]);

  useEffect(() => {
    setAnchorPoint(null);
    setTempBrushPath([]);
    setIsDrawingBrush(false);
    setTextInputPos(null);
    setContextMenu(null);
  }, [activeTool]);

  // Handle Context Menu
  const handleContextMenu = (e: React.MouseEvent, drawingId: string) => {
    e.preventDefault();
    e.stopPropagation();
    
    // CRITICAL: Select the drawing immediately so actions apply to it
    // This allows the "Settings" panel to open in Edit Mode for THIS drawing
    const drawing = drawings.find(d => d.id === drawingId);
    if (drawing && onSelectDrawing) {
        onSelectDrawing(drawing);
    }

    if (chartContainerRef.current) {
        const rect = chartContainerRef.current.getBoundingClientRect();
        setContextMenu({
            x: e.clientX - rect.left,
            y: e.clientY - rect.top,
            drawingId
        });
    }
  };

  useEffect(() => {
      const handleClick = () => setContextMenu(null);
      document.addEventListener('click', handleClick);
      return () => document.removeEventListener('click', handleClick);
  }, []);

  const calculatedIndicators = useMemo(() => {
    const results: Record<string, any> = {};
    overlayIndicators.forEach(ind => {
      if (ind.type === 'BB') {
        const { upper, middle, lower } = calculateBollingerBands(sanitizedData, ind.period, ind.stdDev || 2);
        results[ind.id] = { upper, middle, lower, type: 'BB' };
      } else {
        let values: number[] = [];
        if (ind.type === 'SMA') values = calculateSMA(sanitizedData, ind.period);
        else if (ind.type === 'EMA') values = calculateEMA(sanitizedData, ind.period);
        else if (ind.type === 'WMA') values = calculateWMA(sanitizedData, ind.period);
        results[ind.id] = { values, type: 'LINE' };
      }
    });
    return results;
  }, [sanitizedData, overlayIndicators]);

  const lastCandle = useMemo(() => sanitizedData.length > 0 ? sanitizedData[sanitizedData.length - 1] : null, [sanitizedData]);
  const currentPrice = lastCandle ? lastCandle.close : null;
  const priceColor = lastCandle ? (lastCandle.close >= lastCandle.open ? '#089981' : '#f23645') : '#2962ff';

  const chartConfig = useMemo(() => {
    if (!sanitizedData || sanitizedData.length === 0) return { series: [], widths: [], dashes: [], opacities: [], fillTypes: [] };
    const seriesList: any[] = [];
    const widthList: number[] = [];
    const dashList: number[] = [];
    const opacityList: number[] = [];
    const fillTypeList: string[] = [];
    const isCandle = settings.chartType === 'candlestick';

    if (isCandle) {
      seriesList.push({
        name: 'Price', type: 'candlestick',
        data: sanitizedData.map(d => ({ x: new Date(d.time), y: [d.open, d.high, d.low, d.close] }))
      });
      widthList.push(1); dashList.push(0); opacityList.push(1); fillTypeList.push('solid');
    } else {
      seriesList.push({
        name: 'Price', type: 'area',
        data: sanitizedData.map(d => ({ x: new Date(d.time), y: d.close })),
        color: '#3B82F6'
      });
      widthList.push(2); dashList.push(0); opacityList.push(0.8); fillTypeList.push('gradient');
    }

    comparisons.forEach(comp => {
       if (comp.data && comp.data.length > 0) {
         seriesList.push({
           name: `${comp.symbolInfo.ticker} (OV)`, // Unique name to match Y-Axis config
           type: 'line',
           data: comp.data.map(d => ({ x: new Date(d.time), y: d.close })),
           color: comp.color
         });
         widthList.push(2); dashList.push(0); opacityList.push(1); fillTypeList.push('solid');
       }
    });

    overlayIndicators.forEach(ind => {
        if (ind.visible === false) return;
        const calc = calculatedIndicators[ind.id];
        if (!calc) return;
        if (ind.type === 'BB') {
             const { upper, middle, lower } = calc;
             seriesList.push({ name: `BB Fill`, type: 'rangeArea', color: ind.color, data: sanitizedData.map((d, i) => ({ x: new Date(d.time), y: [lower[i] ?? null, upper[i] ?? null] })) });
             widthList.push(0); dashList.push(0); opacityList.push(0.15); fillTypeList.push('solid');
             seriesList.push({ name: `BB Upper`, type: 'line', color: ind.color, data: sanitizedData.map((d, i) => ({ x: new Date(d.time), y: upper[i] ?? null })) });
             widthList.push(1); dashList.push(ind.lineStyle === 'dashed' ? 5 : 0); opacityList.push(0.8); fillTypeList.push('solid');
             seriesList.push({ name: `BB Lower`, type: 'line', color: ind.color, data: sanitizedData.map((d, i) => ({ x: new Date(d.time), y: lower[i] ?? null })) });
             widthList.push(1); dashList.push(ind.lineStyle === 'dashed' ? 5 : 0); opacityList.push(0.8); fillTypeList.push('solid');
             seriesList.push({ name: `BB Basis`, type: 'line', color: ind.color, data: sanitizedData.map((d, i) => ({ x: new Date(d.time), y: middle[i] ?? null })) });
             widthList.push(ind.lineWidth || 1.5); dashList.push(0); opacityList.push(1); fillTypeList.push('solid');
        } else {
             const { values } = calc;
             seriesList.push({ name: `${ind.type} ${ind.period}`, type: 'line', color: ind.color, data: sanitizedData.map((d, i) => ({ x: new Date(d.time), y: values[i] ?? null })) });
             widthList.push(ind.lineWidth || 1.5); dashList.push(ind.lineStyle === 'dashed' ? 5 : 0); opacityList.push(1); fillTypeList.push('solid');
        }
    });
    return { series: seriesList, widths: widthList, dashes: dashList, opacities: opacityList, fillTypes: fillTypeList };
  }, [sanitizedData, overlayIndicators, settings.chartType, calculatedIndicators, comparisons]);

  // Construct a stable key based on series structure to force remounts on structural changes
  // This prevents 'getPreviousPaths' and 'ttItems' errors in ApexCharts when series data changes shape
  const seriesHash = useMemo(() => {
    return chartConfig.series.map((s: any) => s.name + s.type).join('_');
  }, [chartConfig.series]);

  const themeColors = useMemo(() => {
    const isDark = theme === 'dark';
    return {
      bg: isDark ? '#131722' : '#ffffff',
      grid: isDark ? '#2a2e39' : '#e0e3eb',
      text: isDark ? '#787b86' : '#868993',
      crosshair: '#787b86'
    };
  }, [theme]);

  const handleChartUpdated = useCallback((chartContext: any) => {
    // FIX: Add safety check to prevent crash if chartContext is partial or unmounting
    if (!chartContext || !chartContext.w || !chartContext.w.globals) return;
    
    const { minX, maxX, minY, maxY } = chartContext.w.globals;
    const { gridWidth, gridHeight } = chartContext.w.globals;
    
    if (gridWidth > 0 && gridHeight > 0 && isFinite(minX) && isFinite(maxX)) {
        const currentRef = boundsRef.current;
        if (currentRef && currentRef.minX === minX && currentRef.maxX === maxX && currentRef.minY === minY && currentRef.maxY === maxY && currentRef.gridWidth === gridWidth && currentRef.gridHeight === gridHeight) return;
        const newBounds = { minX, maxX, minY, maxY, gridWidth, gridHeight };
        boundsRef.current = newBounds;
        setBounds(newBounds);
    }
  }, []);

  const getPixelForTime = (time: number) => {
    if (!bounds || bounds.maxX === bounds.minX) return 0;
    const { minX, maxX, gridWidth } = bounds;
    return ((time - minX) / (maxX - minX)) * gridWidth;
  };

  const getPixelForPrice = (price: number) => {
    if (!bounds || bounds.maxY === bounds.minY) return 0;
    const { minY, maxY, gridHeight } = bounds;
    return gridHeight - ((price - minY) / (maxY - minY)) * gridHeight;
  };

  const getTimeForPixel = (x: number) => {
    if (!bounds || bounds.gridWidth === 0) return 0;
    const { minX, maxX, gridWidth } = bounds;
    return minX + (x / gridWidth) * (maxX - minX);
  };

  const getPriceForPixel = (y: number) => {
    if (!bounds || bounds.gridHeight === 0) return 0;
    const { minY, maxY, gridHeight } = bounds;
    return minY + ((gridHeight - y) / gridHeight) * (maxY - minY);
  };

  const snapToCandle = (x: number, y: number) => {
    if (!bounds || !sanitizedData.length) return { time: getTimeForPixel(x), price: getPriceForPixel(y) };
    const rawTime = getTimeForPixel(x);
    const rawPrice = getPriceForPixel(y);
    const priceRange = bounds.maxY - bounds.minY;
    const magnetThresholdPrice = priceRange * 0.03;

    let closestCandle = sanitizedData[0];
    let minTimeDiff = Math.abs(sanitizedData[0].time - rawTime);
    for (let i = 1; i < sanitizedData.length; i++) {
        const diff = Math.abs(sanitizedData[i].time - rawTime);
        if (diff < minTimeDiff) { minTimeDiff = diff; closestCandle = sanitizedData[i]; }
    }
    const snappedTime = closestCandle.time;
    let snappedPrice = rawPrice;
    const points = [closestCandle.high, closestCandle.low, closestCandle.open, closestCandle.close];
    let minPriceDiff = Infinity;
    points.forEach(p => {
        const diff = Math.abs(p - rawPrice);
        if (diff < minPriceDiff && diff < magnetThresholdPrice) { minPriceDiff = diff; snappedPrice = p; }
    });
    return { time: snappedTime, price: snappedPrice };
  };

  const drawOnCanvas = (x: number, y: number, start: boolean = false) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      if (start) {
          ctx.beginPath(); ctx.moveTo(x, y); ctx.strokeStyle = '#2962ff'; ctx.lineWidth = 2; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      } else { ctx.lineTo(x, y); ctx.stroke(); }
  };

  const clearCanvas = () => {
      const canvas = canvasRef.current;
      if (canvas && bounds) { const ctx = canvas.getContext('2d'); ctx?.clearRect(0, 0, canvas.width, canvas.height); }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button === 2) return;
    if (isLocked) return; 
    if (!bounds || !chartContainerRef.current) return;
    const rect = chartContainerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const time = getTimeForPixel(x);
    const price = getPriceForPixel(y);
    const snapped = snapToCandle(x, y);

    if (activeTool === 'text') { setTextInputPos({ x, y, time, price }); return; }
    if (activeTool === 'brush') { setIsDrawingBrush(true); setTempBrushPath([{ x, y, time, price }]); drawOnCanvas(x, y, true); return; }

    if (activeTool === 'trendline' || activeTool === 'fibonacci') {
       if (!anchorPoint) {
           if (activeTool === 'fibonacci') { setAnchorPoint({ x, y, time: snapped.time, price: snapped.price }); }
           else { setAnchorPoint({ x, y, time, price }); }
       } else {
           const finalPoint = activeTool === 'fibonacci' ? snapped : { time, price };
           
           if (activeTool === 'fibonacci') {
                const newFib: FibonacciDrawing = {
                   id: Date.now().toString(), type: 'fibonacci', createdAt: Date.now(),
                   points: [{ time: anchorPoint.time, price: anchorPoint.price }, finalPoint],
                   subtype: 'lines',
                   // Default levels will be merged in App.tsx handleNewDrawing
                   levels: [],
                   color: '#2962ff', width: 2, showLabels: true, visible: true,
                   labelType: 'value', labelAlignment: 'left', style: 'dashed'
                };
                onNewDrawing?.(newFib);
           } else {
                const newTrend: PointDrawing = {
                    id: Date.now().toString(), type: 'trendline', createdAt: Date.now(),
                    points: [{ time: anchorPoint.time, price: anchorPoint.price }, finalPoint],
                    color: '#2962ff', width: 2, style: 'solid', visible: true
                };
                onNewDrawing?.(newTrend);
           }
           setAnchorPoint(null);
       }
       return;
    }
    onSelectDrawing?.(null);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!bounds || !chartContainerRef.current) return;
    const rect = chartContainerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    setMousePos({ x, y });

    const time = getTimeForPixel(x);
    const price = getPriceForPixel(y);
    const snapped = snapToCandle(x, y);

    if (sanitizedData.length > 0 && bounds.minX && bounds.maxX) {
      let closestIndex = 0; let minDiff = Infinity;
      for(let i=0; i<sanitizedData.length; i++) {
         const diff = Math.abs(sanitizedData[i].time - time);
         if (diff < minDiff) { minDiff = diff; closestIndex = i; }
      }
      setActiveIndex(closestIndex);
    }

    if (isDrawingBrush && activeTool === 'brush') {
      setTempBrushPath(prev => [...prev, { x, y, time, price }]);
      drawOnCanvas(x, y);
    }

    if (dragInfo && onUpdateDrawing && !isLocked) {
      const drawing = drawings.find(d => d.id === dragInfo.id);
      if (drawing && !drawing.locked) {
         if (dragInfo.type === 'text' && drawing.type === 'text') {
             onUpdateDrawing({ ...drawing, point: { time, price } });
         } else if (drawing.type === 'fibonacci' || drawing.type === 'trendline') {
             const target = (drawing.type === 'fibonacci') ? snapped : { time, price };
             const newPoints = [...drawing.points];
             if (dragInfo.pointIndex !== undefined && newPoints[dragInfo.pointIndex]) {
                 newPoints[dragInfo.pointIndex] = target;
                 onUpdateDrawing({ ...drawing, points: newPoints });
             }
         }
      }
    }
  };

  const handleMouseUp = () => {
    if (isDrawingBrush && activeTool === 'brush' && tempBrushPath.length > 1) {
        const newDrawing: BrushDrawing = {
            id: Date.now().toString(), type: 'brush', createdAt: Date.now(),
            color: '#2962ff', width: 2, points: tempBrushPath.map(p => ({ time: p.time, price: p.price })), visible: true
        };
        onNewDrawing?.(newDrawing); clearCanvas();
    }
    setIsDrawingBrush(false); setTempBrushPath([]); setDragInfo(null);
  };

  const handleMouseLeave = () => {
      if (sanitizedData.length > 0) setActiveIndex(sanitizedData.length - 1);
      if (isDrawingBrush) { handleMouseUp(); clearCanvas(); }
      setMousePos(null);
  };

  const handleTextSubmit = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && textInputPos && textInputValue.trim()) {
      const newText: TextDrawing = {
        id: Date.now().toString(), type: 'text', createdAt: Date.now(),
        point: { time: textInputPos.time, price: textInputPos.price },
        text: textInputValue, fontSize: 14, color: themeColors.text, visible: true
      };
      onNewDrawing?.(newText); setTextInputPos(null); setTextInputValue('');
    } else if (e.key === 'Escape') { setTextInputPos(null); setTextInputValue(''); }
  };

  const renderDrawings = () => {
      if (!bounds || !drawings || isHidden) return null;
      return (
        <svg className="absolute top-0 left-0 pointer-events-none z-10" style={{ width: '100%', height: '100%', overflow: 'visible' }}>
          {drawings.map(drawing => {
              if (drawing.visible === false) return null;
              
              const interactionProps = (id: string, idx?: number, type: 'point'|'text' = 'point') => isLocked ? {} : {
                  onMouseDown: (e: React.MouseEvent) => { 
                      e.stopPropagation(); 
                      if(!drawing.locked) setDragInfo({ id, pointIndex: idx, type }); 
                      onSelectDrawing?.(drawing); 
                  },
                  onContextMenu: (e: React.MouseEvent) => handleContextMenu(e, id),
                  className: "cursor-pointer hover:stroke-[2px] transition-all",
                  style: { cursor: drawing.locked ? 'default' : 'move' }
              };
              
              const contextMenuProps = (id: string) => ({
                 onContextMenu: (e: React.MouseEvent) => handleContextMenu(e, id)
              });

              if (drawing.type === 'trendline') {
                  const d = drawing as PointDrawing;
                  const [start, end] = d.points;
                  if (!start || !end) return null;
                  const x1 = getPixelForTime(start.time); const y1 = getPixelForPrice(start.price);
                  const x2 = getPixelForTime(end.time); const y2 = getPixelForPrice(end.price);
                  
                  return (
                      <g key={d.id} className="pointer-events-auto">
                          <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={d.color} strokeWidth={d.width} strokeDasharray={d.style === 'dashed' ? "6 4" : d.style === 'dotted' ? "2 2" : ""}
                            {...interactionProps(d.id)}
                            onClick={(e) => { e.stopPropagation(); onSelectDrawing?.(d); }}
                          />
                          {!isLocked && (
                            <>
                                <circle cx={x1} cy={y1} r={5} fill="#fff" stroke={d.color} {...interactionProps(d.id, 0)} />
                                <circle cx={x2} cy={y2} r={5} fill="#fff" stroke={d.color} {...interactionProps(d.id, 1)} />
                            </>
                          )}
                      </g>
                  );
              } 
              else if (drawing.type === 'fibonacci') {
                  const d = drawing as FibonacciDrawing;
                  const [start, end] = d.points;
                  if (!start || !end) return null;
                  
                  const x1 = getPixelForTime(start.time); const y1 = getPixelForPrice(start.price);
                  const x2 = getPixelForTime(end.time); const y2 = getPixelForPrice(end.price);
                  
                  const levels = d.levels || [];
                  const priceDiff = end.price - start.price;

                  if (d.subtype === 'circles') {
                     const radius = Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
                     return (
                        <g key={d.id} className="pointer-events-auto">
                           <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={d.color} strokeWidth="1" strokeDasharray="4 4" opacity="0.5" />
                           {levels.map((level, i) => {
                               if (!level.visible) return null;
                               const r = radius * level.value;
                               
                               // Label for circles
                               let labelText = `${level.value}`;
                               if (d.labelType === 'percent') labelText = `${(level.value * 100).toFixed(1)}%`;
                               else if (d.labelType === 'price') {
                                   const calculatedPrice = start.price + (priceDiff * level.value);
                                   labelText = calculatedPrice.toFixed(2);
                               }

                               // Alignment Logic for Circles
                               let labelX = x1;
                               let labelY = y1 - r - 2;
                               let textAnchor = "middle";
                               let dominantBaseline = "auto"; // Default baseline

                               if (d.labelAlignment === 'left') {
                                   labelX = x1 - r - 5;
                                   labelY = y1;
                                   textAnchor = "end";
                                   dominantBaseline = "middle";
                               } else if (d.labelAlignment === 'right') {
                                   labelX = x1 + r + 5;
                                   labelY = y1;
                                   textAnchor = "start";
                                   dominantBaseline = "middle";
                               }

                               return (
                                   <g key={i}>
                                       <ellipse 
                                          cx={x1} cy={y1} rx={r} ry={r} 
                                          fill="none" stroke={level.color} strokeWidth={d.width} 
                                          strokeDasharray={d.style === 'dashed' ? "6 4" : d.style === 'dotted' ? "2 2" : ""}
                                          {...contextMenuProps(d.id)}
                                          onClick={(e) => { e.stopPropagation(); onSelectDrawing?.(d); }}
                                       />
                                       {d.showLabels && (
                                           <text 
                                                x={labelX} y={labelY} 
                                                fill={level.color} 
                                                fontSize="10" 
                                                textAnchor={textAnchor as any}
                                                dominantBaseline={dominantBaseline as any}
                                                style={{ pointerEvents: 'none', textShadow: '0px 0px 2px black' }}
                                           >
                                               {labelText}
                                           </text>
                                       )}
                                   </g>
                               );
                           })}
                           {!isLocked && (
                               <>
                                <circle cx={x1} cy={y1} r={5} fill="#fff" stroke={d.color} {...interactionProps(d.id, 0)} />
                                <circle cx={x2} cy={y2} r={5} fill="#fff" stroke={d.color} {...interactionProps(d.id, 1)} />
                               </>
                           )}
                        </g>
                     );
                  } else {
                     const leftX = d.extendLeft ? 0 : Math.min(x1, x2);
                     const rightX = d.extendRight ? (bounds.gridWidth || 2000) : Math.max(x1, x2);
                     
                     // Text Alignment Logic
                     let textX = x2 + 5;
                     let textAnchor: "start" | "middle" | "end" = "start";
                     
                     if (d.labelAlignment === 'center') {
                         textX = leftX + (rightX - leftX) / 2;
                         textAnchor = "middle";
                     } else if (d.labelAlignment === 'right') {
                         textX = rightX - 5;
                         textAnchor = "end";
                     } else {
                         // Left
                         textX = leftX + 5;
                         textAnchor = "start";
                     }

                     return (
                      <g key={d.id} className="pointer-events-auto">
                          <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={d.color} strokeWidth="1" strokeDasharray="4 4" opacity="0.5" />
                          
                          {levels.map(level => {
                              if (!level.visible) return null;
                              const lvlPrice = start.price + (priceDiff * level.value);
                              const lvlY = getPixelForPrice(lvlPrice);
                              
                              const isBaseLevel = level.value === 0 || level.value === 1;
                              const dashArray = isBaseLevel ? "" : (d.style === 'dashed' ? "6 4" : d.style === 'dotted' ? "2 2" : "");

                              let labelText = `${level.value}`;
                              if (d.labelType === 'percent') labelText = `${(level.value * 100).toFixed(1)}%`;
                              else if (d.labelType === 'price') labelText = `${lvlPrice.toFixed(2)}`;
                              else labelText = `${level.value.toFixed(3)}`;

                              return (
                                  <g key={level.value} {...contextMenuProps(d.id)} onClick={(e) => { e.stopPropagation(); onSelectDrawing?.(d); }}>
                                      <line 
                                        x1={d.extendLeft ? 0 : x1} y1={lvlY} 
                                        x2={d.extendRight ? (bounds.gridWidth || 2000) : x2} y2={lvlY} 
                                        stroke={level.color} 
                                        strokeWidth={d.width} 
                                        strokeDasharray={dashArray}
                                        opacity="0.9" 
                                      />
                                      {d.showLabels && (
                                          <g>
                                              <rect 
                                                x={textAnchor === 'start' ? textX - 2 : (textAnchor === 'middle' ? textX - 20 : textX - 40)}
                                                y={lvlY - 9}
                                                width={textAnchor === 'middle' ? 40 : 45}
                                                height={14}
                                                rx={3}
                                                fill={themeColors.bg}
                                                opacity="0.7"
                                              />
                                              <text 
                                                x={textX} y={lvlY + 3}
                                                fill={level.color} 
                                                fontSize="10" 
                                                fontWeight="bold"
                                                textAnchor={textAnchor}
                                                style={{ pointerEvents: 'none' }}
                                                dominantBaseline="middle" 
                                              >
                                                  {labelText}
                                              </text>
                                          </g>
                                      )}
                                  </g>
                              );
                          })}
                          {!isLocked && (
                              <>
                                <circle cx={x1} cy={y1} r={5} fill="#fff" stroke={d.color} {...interactionProps(d.id, 0)} />
                                <circle cx={x2} cy={y2} r={5} fill="#fff" stroke={d.color} {...interactionProps(d.id, 1)} />
                              </>
                          )}
                      </g>
                  );
                  }
              }
              else if (drawing.type === 'brush') {
                  const d = drawing as BrushDrawing;
                  const pointsStr = d.points.map(p => `${getPixelForTime(p.time)},${getPixelForPrice(p.price)}`).join(' ');
                  return <polyline key={d.id} points={pointsStr} stroke={d.color} strokeWidth={d.width} fill="none" opacity="0.8" className="pointer-events-auto" {...contextMenuProps(d.id)} onClick={(e) => { e.stopPropagation(); onSelectDrawing?.(d); }} />;
              }
              else if (drawing.type === 'text') {
                  const d = drawing as TextDrawing;
                  return (
                      <text key={d.id} x={getPixelForTime(d.point.time)} y={getPixelForPrice(d.point.price)} fill={d.color} fontSize={d.fontSize} 
                        {...interactionProps(d.id, 0, 'text')}
                        onClick={(e) => { e.stopPropagation(); onSelectDrawing?.(d); }}
                      >{d.text}</text>
                  );
              }
              return null;
          })}
          {(activeTool === 'trendline' || activeTool === 'fibonacci') && anchorPoint && mousePos && (
             <line x1={getPixelForTime(anchorPoint.time)} y1={getPixelForPrice(anchorPoint.price)} x2={mousePos.x} y2={mousePos.y} stroke="#2962ff" strokeWidth="1" strokeDasharray="4 4" />
          )}
        </svg>
      );
  };

  const handleZoom = (direction: 'in' | 'out' | 'reset') => {
    if (!chartRef.current || !bounds) return;
    if (direction === 'reset') {
       if (sanitizedData.length > 0) chartRef.current.zoomX(sanitizedData[0].time, sanitizedData[sanitizedData.length - 1].time);
       return;
    }
    const { minX, maxX } = bounds;
    const range = maxX - minX;
    if (range <= 0) return;
    const factor = 0.2;
    const delta = range * factor;
    let newMin = minX, newMax = maxX;
    if (direction === 'in') { newMin = minX + delta; newMax = maxX - delta; } else { newMin = minX - delta; newMax = maxX + delta; }
    if (newMax > newMin) chartRef.current.zoomX(newMin, newMax);
  };

  const yAxisConfig = useMemo(() => {
    // Main Y-Axis
    const axes: any[] = [{
      seriesName: 'Price', show: true, opposite: true,
      labels: { style: { colors: themeColors.text }, formatter: (val: number) => (val !== undefined && val !== null && isFinite(val)) ? val.toFixed(2) : '', minWidth: 60, maxWidth: 60 },
      tooltip: { enabled: true }, crosshairs: { show: true, stroke: { color: themeColors.crosshair, width: 1, dashArray: 4 } }
    }];
    
    // Comparison Y-Axes
    // FIX: Force opposite: true and disable labels/borders to prevent left-side spacing shift
    comparisons.forEach(comp => { 
        axes.push({ 
            seriesName: `${comp.symbolInfo.ticker} (OV)`, // Must match Series name exactly
            show: false, // Hidden 
            opposite: true, // Force to right side
            labels: { show: false }, // No labels taking space
            axisBorder: { show: false }, // No border
            axisTicks: { show: false }, // No ticks
            floating: true // Ensure it doesn't push layout
        }); 
    });
    return axes;
  }, [themeColors, comparisons]);

  const formatDate = useCallback((val: number | string) => {
    try {
      const date = new Date(val); if (isNaN(date.getTime())) return '';
      const options: Intl.DateTimeFormatOptions = { timeZone: settings.timezone || 'UTC', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false };
      return new Intl.DateTimeFormat('en-US', options).format(date);
    } catch (e) { return new Date(val).toLocaleDateString(); }
  }, [settings.timezone]);

  const options: ApexOptions = useMemo(() => ({
    chart: {
      type: settings.chartType === 'candlestick' ? 'candlestick' : 'area', height: '100%', background: 'transparent',
      animations: { enabled: false, dynamicAnimation: { enabled: false } },
      toolbar: { show: false }, zoom: { enabled: true, type: 'x', autoScaleYaxis: true },
      events: { updated: (chartContext, config) => handleChartUpdated(chartContext), mounted: (chartContext, config) => { handleChartUpdated(chartContext); chartRef.current = chartContext; } }
    },
    theme: { mode: theme }, stroke: { width: chartConfig.widths, curve: 'smooth', dashArray: chartConfig.dashes, lineCap: 'round' },
    fill: { type: chartConfig.fillTypes as any, opacity: chartConfig.opacities, gradient: { shade: 'dark', type: "vertical", shadeIntensity: 0.5, inverseColors: true, opacityFrom: 0.8, opacityTo: 0, stops: [0, 90, 100] } },
    dataLabels: { enabled: false }, markers: { size: 0, hover: { size: 5 } },
    annotations: { yaxis: currentPrice ? [{ y: currentPrice, borderColor: priceColor, strokeDashArray: 2, opacity: 1, label: { borderColor: priceColor, style: { color: '#fff', background: priceColor, fontSize: '11px', fontWeight: 600, padding: { left: 4, right: 4, top: 2, bottom: 2 } }, text: currentPrice.toFixed(2), position: 'right', textAnchor: 'start', offsetX: 0 } }] : undefined },
    xaxis: { type: 'datetime', axisBorder: { color: themeColors.grid }, axisTicks: { color: themeColors.grid }, labels: { style: { colors: themeColors.text }, formatter: (val: string) => formatDate(val) }, tooltip: { enabled: true, formatter: (val: string) => formatDate(val) }, crosshairs: { show: true, stroke: { color: themeColors.crosshair, width: 1, dashArray: 4 } } },
    yaxis: yAxisConfig, grid: { borderColor: themeColors.grid, strokeDashArray: settings.showGrid ? 3 : 0 },
    plotOptions: { candlestick: { colors: { upward: '#089981', downward: '#f23645' } }, area: { fillTo: 'origin' as const } },
    // FIX: Force enabled: true to prevent 'ttItems' crash when switching tools. 
    // We control visibility via CSS class .tv-no-tooltip on the container instead.
    tooltip: { enabled: true, theme, shared: true, intersect: false, x: { formatter: (val: number) => formatDate(val) }, y: { formatter: (val: number) => (val !== undefined && val !== null && isFinite(val)) ? val.toFixed(2) : '' } },
    legend: { show: false }
  }), [chartConfig, settings, theme, themeColors, /* activeTool removed to prevent options churn */ currentPrice, priceColor, handleChartUpdated, yAxisConfig, formatDate]);

  if (!Chart) {
      return <div className="flex items-center justify-center w-full h-full text-tv-red text-sm font-bold flex-col gap-2">
          <AlertTriangle size={24} />
          <span>Chart Engine Error</span>
          <span className="text-xs font-normal text-tv-muted">Module not loaded. Please refresh.</span>
      </div>;
  }

  if (isLoading) {
      return <div className="flex items-center justify-center w-full h-full text-tv-accent text-sm animate-pulse">Loading Market Data...</div>;
  }

  if (!sanitizedData || sanitizedData.length === 0) {
      return <div className="flex items-center justify-center w-full h-full text-tv-muted text-sm flex-col gap-2">
          <AlertTriangle size={24} className="opacity-50"/>
          <span>No Data Available</span>
      </div>;
  }

  return (
    // FIX: Add 'tv-no-tooltip' class when activeTool is not cursor to hide tooltip via CSS
    <div id="chart-capture-container" ref={chartContainerRef} className={`w-full h-full relative select-none ${activeTool !== 'cursor' ? 'cursor-crosshair tv-no-tooltip' : ''}`} onMouseDown={handleMouseDown} onMouseMove={handleMouseMove} onMouseUp={handleMouseUp} onMouseLeave={handleMouseLeave} onContextMenu={(e) => e.preventDefault()}>
      <Chart key={`${settings.chartType}-${theme}-${seriesHash}-${settings.timezone}`} options={options} series={chartConfig.series} type={settings.chartType === 'candlestick' ? 'candlestick' : 'area'} height="100%" width="100%" />
      {renderDrawings()}
      <canvas ref={canvasRef} width={bounds?.gridWidth || 0} height={bounds?.gridHeight || 0} className="absolute top-0 left-0 pointer-events-none z-20" style={{ width: '100%', height: '100%' }} />
      
      {contextMenu && (
        <div 
          className="absolute z-50 bg-tv-pane border border-tv-border shadow-xl rounded py-1 w-48 animate-in fade-in zoom-in-95 duration-100"
          style={{ left: contextMenu.x, top: contextMenu.y }}
        >
            <button 
                className="w-full text-left px-4 py-2 text-sm text-tv-text hover:bg-tv-bg flex items-center gap-2"
                onClick={() => { onOpenSettings?.(); setContextMenu(null); }}
            >
                <Settings size={14} /> Settings
            </button>
             <button 
                className="w-full text-left px-4 py-2 text-sm text-tv-red hover:bg-tv-bg flex items-center gap-2"
                onClick={() => { onDeleteDrawing?.(contextMenu.drawingId); setContextMenu(null); }}
            >
                <X size={14} /> Remove
            </button>
        </div>
      )}

      {/* Legend & Controls */}
      <div className="absolute top-2 right-16 z-20 flex flex-col items-end gap-1 pointer-events-auto select-none">
        {comparisons.length > 0 && (
          <div className="flex flex-wrap justify-end gap-2 mb-2">
            {comparisons.map(comp => (
               <div key={comp.id} className="flex items-center gap-2 text-xs font-mono bg-tv-bg/90 px-2 py-1 rounded backdrop-blur-sm shadow-sm border border-tv-border/50">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: comp.color }}></span>
                  <span className="font-bold text-tv-text">{comp.symbolInfo.ticker}</span>
                  <button onClick={() => onRemoveComparison?.(comp.id)} className="ml-1 text-tv-muted hover:text-tv-red"><X size={10} /></button>
               </div>
            ))}
          </div>
        )}
        <div className="flex flex-row flex-wrap justify-end gap-2">
            {activeIndex !== null && activeIndex < sanitizedData.length && overlayIndicators.map(ind => {
                const data = calculatedIndicators[ind.id]; if (!data) return null; const isVisible = ind.visible !== false;
                if (data.type === 'BB') {
                    const u = data.upper[activeIndex]?.toFixed(2) || '-'; const l = data.lower[activeIndex]?.toFixed(2) || '-';
                    return (
                        <div key={ind.id} onClick={(e) => { e.stopPropagation(); onToggleIndicatorVisibility?.(ind.id); }} className={`flex items-center gap-2 text-xs font-mono bg-tv-bg/80 px-2 py-1 rounded backdrop-blur-sm shadow-sm border border-tv-border/50 cursor-pointer transition-all hover:bg-tv-pane ${!isVisible ? 'opacity-50 grayscale' : ''}`}>
                            {isVisible ? <Eye size={10} className="text-tv-muted" /> : <EyeOff size={10} className="text-tv-muted" />}
                            <span style={{ color: ind.color }} className="font-bold">BB {ind.period} {ind.stdDev}</span> <span className="text-tv-text">U: {u}</span> <span className="text-tv-text">L: {l}</span>
                        </div>
                    );
                } else {
                    const v = data.values[activeIndex]?.toFixed(2) || '-';
                    return (
                        <div key={ind.id} onClick={(e) => { e.stopPropagation(); onToggleIndicatorVisibility?.(ind.id); }} className={`flex items-center gap-2 text-xs font-mono bg-tv-bg/80 px-2 py-1 rounded backdrop-blur-sm shadow-sm border border-tv-border/50 cursor-pointer transition-all hover:bg-tv-pane ${!isVisible ? 'opacity-50 grayscale' : ''}`}>
                            {isVisible ? <Eye size={10} className="text-tv-muted" /> : <EyeOff size={10} className="text-tv-muted" />}
                            <span style={{ color: ind.color }} className="font-bold">{ind.type} {ind.period}</span> <span className={theme === 'dark' ? 'text-white' : 'text-black'}>{v}</span>
                        </div>
                    );
                }
            })}
        </div>
      </div>
      
      {textInputPos && <input autoFocus className="absolute bg-tv-pane border border-tv-accent text-tv-text text-sm p-1 rounded shadow-lg outline-none z-50" style={{ left: textInputPos.x, top: textInputPos.y }} value={textInputValue} onChange={e => setTextInputValue(e.target.value)} onKeyDown={handleTextSubmit} onBlur={() => setTextInputPos(null)} placeholder="Type label..." />}
      
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-30 flex items-center gap-1 bg-tv-pane border border-tv-border rounded-full shadow-lg p-1 opacity-80 hover:opacity-100 transition-opacity">
        <button onClick={(e) => { e.stopPropagation(); handleZoom('out'); }} className="p-1.5 hover:bg-tv-bg rounded-full text-tv-text hover:text-tv-accent transition-colors" title="Zoom Out"><ZoomOut size={16} /></button>
        <button onClick={(e) => { e.stopPropagation(); handleZoom('reset'); }} className="p-1.5 hover:bg-tv-bg rounded-full text-tv-text hover:text-tv-accent transition-colors" title="Reset View"><RotateCcw size={16} /></button>
        <button onClick={(e) => { e.stopPropagation(); handleZoom('in'); }} className="p-1.5 hover:bg-tv-bg rounded-full text-tv-text hover:text-tv-accent transition-colors" title="Zoom In"><ZoomIn size={16} /></button>
      </div>

      {activeTool !== 'cursor' && !isDrawingBrush && !dragInfo && !anchorPoint && <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-tv-pane border border-tv-accent text-tv-accent text-xs px-3 py-1 rounded-full shadow-lg pointer-events-none z-50">{activeTool.toUpperCase()} MODE</div>}
      {anchorPoint && <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-tv-pane border border-tv-accent text-tv-accent text-xs px-3 py-1 rounded-full shadow-lg pointer-events-none z-50">Click to Finish</div>}
    </div>
  );
};

export default CandleStickChart;