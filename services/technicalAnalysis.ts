
import { CandleData } from '../types';

// Helper: Calculate average of a slice
const avg = (arr: number[]) => arr.reduce((a, b) => a + b, 0) / arr.length;

export const calculateSMA = (data: CandleData[], period: number, key: keyof CandleData = 'close'): number[] => {
  const results: number[] = [];
  for (let i = 0; i < data.length; i++) {
    if (i < period - 1) {
      results.push(null as any); 
      continue;
    }
    const slice = data.slice(i - period + 1, i + 1);
    results.push(avg(slice.map(d => d[key] as number)));
  }
  return results;
};

export const calculateEMA = (data: CandleData[], period: number): number[] => {
  const results: number[] = [];
  const k = 2 / (period + 1);
  
  let smaSum = 0;
  for (let i = 0; i < period; i++) {
    if (i < data.length) smaSum += data[i].close;
  }
  const initialSMA = smaSum / period;

  let prevEMA = initialSMA;

  for (let i = 0; i < data.length; i++) {
    if (i < period - 1) {
      results.push(null as any);
      continue;
    }
    if (i === period - 1) {
      results.push(initialSMA);
      continue;
    }
    const currentClose = data[i].close;
    const currentEMA = (currentClose - prevEMA) * k + prevEMA;
    results.push(currentEMA);
    prevEMA = currentEMA;
  }
  return results;
};

export const calculateWMA = (data: CandleData[], period: number): number[] => {
  const results: number[] = [];
  for (let i = 0; i < data.length; i++) {
    if (i < period - 1) {
      results.push(null as any);
      continue;
    }
    let numerator = 0;
    let denominator = 0;
    for (let j = 0; j < period; j++) {
      const weight = j + 1;
      numerator += data[i - period + 1 + j].close * weight;
      denominator += weight;
    }
    results.push(numerator / denominator);
  }
  return results;
};

// Bollinger Bands
export const calculateBollingerBands = (data: CandleData[], period: number, stdDev: number) => {
  const sma = calculateSMA(data, period, 'close');
  const upper: number[] = [];
  const lower: number[] = [];
  
  for (let i = 0; i < data.length; i++) {
    if (i < period - 1) {
      upper.push(null as any);
      lower.push(null as any);
      continue;
    }

    const slice = data.slice(i - period + 1, i + 1).map(d => d.close);
    const mean = sma[i];
    
    // Calculate Standard Deviation
    const squaredDiffs = slice.map(val => Math.pow(val - mean, 2));
    const variance = squaredDiffs.reduce((a, b) => a + b, 0) / period;
    const sd = Math.sqrt(variance);

    upper.push(mean + (sd * stdDev));
    lower.push(mean - (sd * stdDev));
  }

  return { upper, middle: sma, lower };
};

// RSI
export const calculateRSI = (data: CandleData[], period: number): number[] => {
  const results: number[] = [];
  let gains = 0;
  let losses = 0;

  // First calculation
  if (data.length < period + 1) return Array(data.length).fill(null);

  for (let i = 1; i <= period; i++) {
    const diff = data[i].close - data[i - 1].close;
    if (diff >= 0) gains += diff;
    else losses += Math.abs(diff);
  }

  let avgGain = gains / period;
  let avgLoss = losses / period;
  
  // Fill initial nulls
  for(let i=0; i<period; i++) results.push(null as any);

  results.push(100 - (100 / (1 + (avgGain / (avgLoss === 0 ? 1 : avgLoss)))));

  // Smoothed calculation
  for (let i = period + 1; i < data.length; i++) {
    const diff = data[i].close - data[i - 1].close;
    const currentGain = diff > 0 ? diff : 0;
    const currentLoss = diff < 0 ? Math.abs(diff) : 0;

    avgGain = ((avgGain * (period - 1)) + currentGain) / period;
    avgLoss = ((avgLoss * (period - 1)) + currentLoss) / period;

    const rs = avgGain / (avgLoss === 0 ? 0.001 : avgLoss); // Prevent divide by zero
    results.push(100 - (100 / (1 + rs)));
  }

  return results;
};

// MACD: Returns { macd, signal, histogram }
export const calculateMACD = (data: CandleData[], fastPeriod = 12, slowPeriod = 26, signalPeriod = 9) => {
  const emaFast = calculateEMA(data, fastPeriod);
  const emaSlow = calculateEMA(data, slowPeriod);
  
  const macdLine: number[] = [];
  for(let i=0; i<data.length; i++) {
    if(emaFast[i] !== null && emaSlow[i] !== null) {
      macdLine.push(emaFast[i] - emaSlow[i]);
    } else {
      macdLine.push(null as any);
    }
  }

  // Calculate Signal line (EMA of MACD)
  const signalLine: number[] = [];
  const k = 2 / (signalPeriod + 1);
  let validMacdStart = macdLine.findIndex(v => v !== null);
  
  // Fill nulls
  for(let i=0; i < validMacdStart + signalPeriod - 1; i++) {
    signalLine.push(null as any);
  }

  // Initial SMA for Signal
  if (validMacdStart !== -1 && (validMacdStart + signalPeriod) <= macdLine.length) {
    let sum = 0;
    for(let i = validMacdStart; i < validMacdStart + signalPeriod; i++) {
       sum += macdLine[i];
    }
    let prevSignal = sum / signalPeriod;
    signalLine.push(prevSignal);

    for(let i = validMacdStart + signalPeriod; i < macdLine.length; i++) {
      const currentMacd = macdLine[i];
      const currentSignal = (currentMacd - prevSignal) * k + prevSignal;
      signalLine.push(currentSignal);
      prevSignal = currentSignal;
    }
  } else {
     return { macd: [], signal: [], histogram: [] };
  }
  
  while(signalLine.length < data.length) signalLine.push(null as any);

  const histogram = macdLine.map((m, i) => {
    if (m !== null && signalLine[i] !== null) return m - signalLine[i];
    return null as any;
  });

  return { macd: macdLine, signal: signalLine, histogram };
};

// Stochastic: Returns { k, d }
export const calculateStochastic = (data: CandleData[], kPeriod = 14, dPeriod = 3, smooth = 3) => {
   const kLine: number[] = [];
   const dLine: number[] = []; // SMA of K
   
   for(let i=0; i<data.length; i++) {
     if (i < kPeriod - 1) {
       kLine.push(null as any);
       continue;
     }
     const slice = data.slice(i - kPeriod + 1, i + 1);
     const low = Math.min(...slice.map(d => d.low));
     const high = Math.max(...slice.map(d => d.high));
     const currentClose = data[i].close;
     
     const k = ((currentClose - low) / (high - low === 0 ? 1 : high - low)) * 100;
     kLine.push(k);
   }

   // Calculate %D (SMA of %K)
   for(let i=0; i<kLine.length; i++) {
     if(i < kPeriod - 1 + dPeriod - 1 || kLine[i] === null) {
        dLine.push(null as any);
        continue;
     }
     let sum = 0;
     for(let j=0; j<dPeriod; j++) {
       sum += kLine[i-j];
     }
     dLine.push(sum/dPeriod);
   }

   return { k: kLine, d: dLine };
};
