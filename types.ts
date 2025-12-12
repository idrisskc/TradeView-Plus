
import * as React from 'react';

export type Interval = '1m' | '5m' | '15m' | '1H' | '4H' | '1D' | '1W' | '1M' | '1Y';

export interface CandleData {
  time: number; // Unix timestamp
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  [key: string]: number; // Allow dynamic indicator keys
}

export interface SymbolInfo {
  ticker: string;
  name: string;
  exchange: string;
  type: 'stock' | 'crypto' | 'forex' | 'futures' | 'etf';
  price: number;
  change: number;
  changePercent: number;
  volume: number;
}

export interface Comparison {
  id: string;
  symbolInfo: SymbolInfo;
  data: CandleData[];
  color: string;
}

export interface ChartSettings {
  chartType: 'candlestick' | 'line' | 'area' | 'heikin-ashi';
  showVolume: boolean;
  showGrid: boolean;
  scaleType: 'log' | 'linear';
  theme: 'dark' | 'light';
  timezone: string;
}

export interface WatchlistItem extends SymbolInfo {
  id: string;
}

export type ToolType = 'cursor' | 'trendline' | 'fibonacci' | 'text' | 'brush' | 'eraser';

export interface BaseDrawing {
  id: string;
  type: ToolType;
  createdAt: number;
  visible?: boolean;
  locked?: boolean;
}

export interface PointDrawing extends BaseDrawing {
  type: 'trendline';
  points: { price: number; time: number }[];
  color: string;
  width: number;
  style: 'solid' | 'dashed' | 'dotted';
}

export interface FibonacciLevel {
  value: number;
  color: string;
  visible: boolean;
}

export interface FibonacciDrawing extends BaseDrawing {
  type: 'fibonacci';
  points: { price: number; time: number }[];
  subtype: 'lines' | 'circles';
  levels: FibonacciLevel[];
  extendLeft?: boolean;
  extendRight?: boolean;
  color: string; // Main axis color
  width: number;
  showLabels: boolean;
  // New props for customization
  labelType: 'price' | 'percent' | 'value';
  labelAlignment: 'left' | 'center' | 'right';
  style: 'solid' | 'dashed' | 'dotted';
}

export interface BrushDrawing extends BaseDrawing {
  type: 'brush';
  points: { price: number; time: number }[]; // Array of points for the path
  color: string;
  width: number;
}

export interface TextDrawing extends BaseDrawing {
  type: 'text';
  point: { price: number; time: number };
  text: string;
  fontSize: number;
  color: string;
}

export type Drawing = PointDrawing | BrushDrawing | TextDrawing | FibonacciDrawing;

// Default Settings Interface for Global Config
export interface DefaultDrawingSettings {
  trendline: { color: string; width: number; style: 'solid' | 'dashed' | 'dotted' };
  fibonacci: { 
    color: string; 
    width: number; 
    style: 'solid' | 'dashed' | 'dotted';
    subtype: 'lines' | 'circles';
    labelType: 'price' | 'percent' | 'value';
    labelAlignment: 'left' | 'center' | 'right';
    showLabels: boolean;
    extendLeft: boolean;
    extendRight: boolean;
    levels: FibonacciLevel[];
  };
  brush: { color: string; width: number };
  text: { color: string; fontSize: number };
}

export interface DrawingTool {
  id: string;
  icon: React.ReactNode;
  name: string;
  category: 'trend' | 'gann' | 'geometric' | 'text' | 'pattern';
}

export type IndicatorType = 'SMA' | 'EMA' | 'WMA' | 'RSI' | 'MACD' | 'STOCH' | 'VOL' | 'BB';

export interface Indicator {
  id: string;
  type: IndicatorType;
  period: number;
  color: string;
  lineWidth: number;
  lineStyle: 'solid' | 'dashed' | 'dotted';
  visible?: boolean;
  // Advanced params
  fastPeriod?: number; // For MACD
  slowPeriod?: number; // For MACD
  signalPeriod?: number; // For MACD, STOCH
  kPeriod?: number; // For STOCH
  dPeriod?: number; // For STOCH
  stdDev?: number; // For Bollinger Bands
  // Volume params
  upColor?: string;
  downColor?: string;
  showMa?: boolean;
  maColor?: string;
  maLineWidth?: number;
}

export type AlertCondition = 'greater_than' | 'less_than' | 'crossing_up' | 'crossing_down';

export interface Alert {
  id: string;
  symbol: string;
  price: number;
  condition: AlertCondition;
  message: string;
  active: boolean;
  triggered: boolean;
  createdAt: number;
}