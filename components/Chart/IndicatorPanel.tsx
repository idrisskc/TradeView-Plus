import * as React from 'react';
import ReactApexChart from 'react-apexcharts';
import { ApexOptions } from 'apexcharts';
import { CandleData, Indicator } from '../../types';
import { calculateRSI, calculateMACD, calculateStochastic, calculateSMA } from '../../services/technicalAnalysis';
import { Eye, EyeOff, AlertTriangle } from 'lucide-react';

const { useMemo } = React;

// Safe import handling
const Chart = (ReactApexChart as any).default || ReactApexChart;

interface IndicatorPanelProps {
  data: CandleData[];
  indicator: Indicator;
  onToggleVisibility?: (id: string) => void;
  height?: number;
  groupId?: string;
  theme?: 'dark' | 'light';
}

const IndicatorPanel: React.FC<IndicatorPanelProps> = ({ 
  data, 
  indicator, 
  onToggleVisibility,
  height = 150,
  groupId = "market-charts",
  theme = 'dark'
}) => {
  
  const series = useMemo(() => {
    if (!data || data.length === 0) return [];
    
    // Respect visibility state
    if (indicator.visible === false) return [];

    if (indicator.type === 'VOL') {
      const upColor = indicator.upColor || '#089981';
      const downColor = indicator.downColor || '#f23645';

      const seriesList: any[] = [{
        name: 'Volume',
        type: 'bar',
        data: data.map((d) => ({
          x: new Date(d.time),
          y: d.volume,
          fillColor: d.close >= d.open ? upColor : downColor
        }))
      }];

      if (indicator.showMa && indicator.period) {
         const maValues = calculateSMA(data, indicator.period, 'volume');
         seriesList.push({
            name: `Vol MA ${indicator.period}`,
            type: 'line',
            data: data.map((d, i) => ({ x: new Date(d.time), y: maValues[i] ?? null })),
            color: indicator.maColor || '#ff9800'
         });
      }

      return seriesList;
    }

    if (indicator.type === 'RSI') {
      const rsiValues = calculateRSI(data, indicator.period);
      return [{
        name: `RSI ${indicator.period}`,
        data: data.map((d, i) => ({ x: new Date(d.time), y: rsiValues[i] ?? null })),
        color: indicator.color
      }];
    }

    if (indicator.type === 'MACD') {
      const { macd, signal, histogram } = calculateMACD(data, indicator.fastPeriod, indicator.period, indicator.signalPeriod);
      return [
        {
          name: 'MACD',
          type: 'line',
          data: data.map((d, i) => ({ x: new Date(d.time), y: macd[i] ?? null })),
          color: indicator.color
        },
        {
          name: 'Signal',
          type: 'line',
          data: data.map((d, i) => ({ x: new Date(d.time), y: signal[i] ?? null })),
          color: '#ff9800' // Orange default for signal
        },
        {
          name: 'Histogram',
          type: 'bar',
          data: data.map((d, i) => ({ 
            x: new Date(d.time), 
            y: histogram[i] ?? null,
            fillColor: (histogram[i] || 0) >= 0 ? '#089981' : '#f23645' // Advanced coloring: Green if pos, Red if neg
          })),
        }
      ];
    }

    if (indicator.type === 'STOCH') {
      const { k, d } = calculateStochastic(data, indicator.period, indicator.signalPeriod);
      return [
        {
          name: '%K',
          type: 'line',
          data: data.map((d, i) => ({ x: new Date(d.time), y: k[i] ?? null })),
          color: indicator.color
        },
        {
          name: '%D',
          type: 'line',
          data: data.map((d, i) => ({ x: new Date(d.time), y: d[i] ?? null })),
          color: '#ff9800'
        }
      ];
    }

    return [];
  }, [data, indicator, theme]);

  // Theme Colors
  const themeColors = useMemo(() => {
    const isLight = theme === 'light';
    return {
      text: isLight ? '#131722' : '#787b86',
      grid: isLight ? '#e0e3eb' : '#2a2e39',
      crosshair: '#787b86'
    };
  }, [theme]);

  const yAxisConfig = useMemo(() => {
    if (indicator.type === 'RSI' || indicator.type === 'STOCH') {
      return {
        min: 0,
        max: 100,
        tickAmount: 4,
        plotLines: [
            { value: 70, color: themeColors.grid, width: 1, dashStyle: 'dash' },
            { value: 30, color: themeColors.grid, width: 1, dashStyle: 'dash' }
        ]
      };
    }
    return {}; // MACD and Volume are unbounded
  }, [indicator, themeColors]);

  const options: ApexOptions = useMemo(() => ({
    chart: {
      id: `chart-${indicator.id}`,
      group: groupId,
      type: indicator.type === 'VOL' ? 'line' : 'line', // Mix of bar and line requires 'line' or 'bar' combo
      height: height,
      background: 'transparent',
      fontFamily: 'inherit',
      toolbar: { show: false }, // Hide toolbar on sub-charts
      animations: { enabled: true },
      zoom: { enabled: true, type: 'x' }
    },
    theme: { mode: theme },
    stroke: {
      width: (indicator.type === 'MACD') 
        ? [1.5, 1.5, 0] 
        : (indicator.type === 'VOL' ? [0, 1.5] : 1.5), // Vol Bar=0, Vol MA=1.5
      curve: 'smooth',
      dashArray: indicator.lineStyle === 'dashed' ? 5 : (indicator.lineStyle === 'dotted' ? 2 : 0)
    },
    xaxis: {
      type: 'datetime',
      tooltip: { enabled: false }, // Disable x-tooltip on subcharts to reduce clutter
      axisBorder: { show: false },
      axisTicks: { show: false },
      labels: { show: false }, // Hide x-labels on stacked charts usually
      crosshairs: { show: true, width: 1, position: 'back', opacity: 0.9, stroke: { color: themeColors.crosshair, width: 1, dashArray: 3 } }
    },
    yaxis: {
      show: true,
      opposite: true,
      labels: {
        style: { colors: themeColors.text },
        formatter: (val) => {
            if (val === null || val === undefined) return '';
            if (indicator.type === 'VOL') {
                 if (val >= 1000000000) return (val / 1000000000).toFixed(1) + 'B';
                 if (val >= 1000000) return (val / 1000000).toFixed(1) + 'M';
                 if (val >= 1000) return (val / 1000).toFixed(1) + 'K';
                 return val.toFixed(0);
            }
            return val.toFixed(2);
        },
        minWidth: 60, // FIX: Same width as main chart
        maxWidth: 60
      },
      ...yAxisConfig
    },
    grid: {
      borderColor: themeColors.grid,
      strokeDashArray: 3,
      xaxis: { lines: { show: true } },
      yaxis: { lines: { show: true } },
      padding: { top: 10, bottom: 0 }
    },
    legend: { show: false }, // Use custom legend
    tooltip: {
      theme: theme,
      shared: true,
      intersect: false,
      x: { show: false },
      y: {
        formatter: (val: number, opts?: any) => {
          // Custom Volume Tooltip
          if (indicator.type === 'VOL' && opts) {
             const isBar = opts.seriesIndex === 0; // Bar is pushed first
             
             if (isBar && opts.dataPointIndex !== undefined) {
                 const index = opts.dataPointIndex;
                 const candle = data[index];
                 if (candle) {
                   let volStr = val.toFixed(0);
                   if (val >= 1000000000) volStr = (val / 1000000000).toFixed(2) + 'B';
                   else if (val >= 1000000) volStr = (val / 1000000).toFixed(2) + 'M';
                   else if (val >= 1000) volStr = (val / 1000).toFixed(2) + 'K';
                   
                   return `${volStr} • Close: ${candle.close.toFixed(2)}`;
                 }
             }
             
             // Fallback for Line or simple format
             if (val >= 1000000000) return (val / 1000000000).toFixed(2) + 'B';
             if (val >= 1000000) return (val / 1000000).toFixed(2) + 'M';
             if (val >= 1000) return (val / 1000).toFixed(2) + 'K';
             return val.toFixed(0);
          }
          return (val !== undefined && val !== null) ? val.toFixed(2) : '';
        }
      }
    },
    plotOptions: {
      bar: { columnWidth: '80%' }
    }
  }), [indicator.id, indicator.lineStyle, indicator.type, indicator.showMa, groupId, height, yAxisConfig, theme, themeColors, data]);

  if (!Chart) {
      return <div className="flex items-center justify-center w-full h-full text-tv-red text-xs">Chart Error</div>;
  }

  if (!data || data.length === 0) return <div className="w-full h-full flex items-center justify-center text-xs text-tv-muted">No Data</div>;

  // Strict key to force remount on any config change or visibility toggle
  const configKey = `${indicator.period}-${indicator.fastPeriod || ''}-${indicator.signalPeriod || ''}-${indicator.color}-${indicator.lineStyle}-${indicator.visible}-${indicator.upColor}-${indicator.downColor}-${indicator.showMa}-${indicator.maColor}`;
  const isVisible = indicator.visible !== false;

  return (
    <div className={`w-full border-t border-tv-border relative group ${theme === 'light' ? 'bg-white' : 'bg-tv-bg'}`}>
      <Chart 
        key={`${indicator.id}-${theme}-${configKey}`}
        options={options} 
        series={series} 
        height={height} 
        width="100%" 
      />
      {/* Interactive Label Overlay */}
      <div 
        className={`absolute top-1 left-2 flex items-center gap-2 z-10 px-2 py-1 rounded cursor-pointer transition-colors ${theme === 'light' ? 'hover:bg-gray-100' : 'hover:bg-white/5'}`}
        onClick={() => onToggleVisibility?.(indicator.id)}
      >
        <span className={`${theme === 'light' ? 'text-black' : 'text-tv-muted'} ${!isVisible ? 'opacity-50' : ''}`}>
          {isVisible ? <Eye size={12} /> : <EyeOff size={12} />}
        </span>
        <span className={`text-[10px] font-bold uppercase ${theme === 'light' ? 'text-black' : 'text-tv-muted'} ${!isVisible ? 'opacity-50' : ''}`}>
          {indicator.type === 'VOL' ? (
             indicator.showMa ? `Vol (20) + MA(${indicator.period})` : 'Volume'
          ) : `${indicator.type} (${indicator.period})`}
        </span>
      </div>
    </div>
  );
};

export default IndicatorPanel;