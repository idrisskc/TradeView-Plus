import * as React from 'react';
import { MessageSquare, Send, X, Bot, Sparkles, TrendingUp, PenTool, GitCompare } from 'lucide-react';
import { SymbolInfo, CandleData, Drawing, PointDrawing, FibonacciDrawing, Indicator, Comparison } from '../../types';
import { GoogleGenAI, FunctionDeclaration, Type } from "@google/genai";

const { useState, useRef, useEffect, useMemo } = React;

interface FinancialAssistantProps {
  currentSymbol: SymbolInfo;
  chartData: CandleData[];
  activeIndicators?: Indicator[];
  comparisons?: Comparison[];
  onAddDrawing?: (drawing: Drawing) => void;
  onClearDrawings?: () => void;
  onAddComparison?: (ticker: string) => Promise<SymbolInfo | null>;
  onRemoveComparison?: (ticker: string) => void;
  onChangeSymbol?: (ticker: string) => Promise<boolean>;
  onAddIndicator?: (indicator: Indicator) => void;
  onRemoveIndicator?: (id: string) => void;
  onToggleIndicatorVisibility?: (id: string) => void;
}

interface Message {
  id: string;
  sender: 'user' | 'bot';
  text: string;
  timestamp: Date;
  isToolUse?: boolean;
}

const FinancialAssistant: React.FC<FinancialAssistantProps> = ({ 
    currentSymbol, 
    chartData, 
    activeIndicators = [],
    comparisons = [],
    onAddDrawing, 
    onClearDrawings, 
    onAddComparison,
    onRemoveComparison,
    onChangeSymbol,
    onAddIndicator,
    onRemoveIndicator,
    onToggleIndicatorVisibility
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      sender: 'bot',
      text: "Hello! I'm your AI financial assistant. I can analyze trends, draw Fibonacci Circles or Trendlines automatically, and manage indicators. How can I help?",
      timestamp: new Date()
    }
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatSessionRef = useRef<any>(null);

  const getApiKey = () => {
    try {
      const safeProcess = typeof process !== 'undefined' ? process : { env: {} };
      const envKey = safeProcess.env?.API_KEY;
      let metaKey = undefined;
      try { metaKey = (import.meta as any).env?.API_KEY; } catch (e) {}
      return envKey || metaKey;
    } catch (e) { return undefined; }
  };

  const apiKey = getApiKey();

  // --- HELPER: Identify Pivot Points for AI Context ---
  const getPivotContext = useMemo(() => {
    if (!chartData || chartData.length < 20) return "";
    
    const highs: { indexOffset: number, price: number }[] = [];
    const lows: { indexOffset: number, price: number }[] = [];
    
    // Scan last 60 candles for local peaks/troughs
    const lookback = Math.min(chartData.length, 60);
    const len = chartData.length;
    
    for (let i = len - 2; i > len - lookback; i--) {
        const current = chartData[i];
        const prev = chartData[i-1];
        const next = chartData[i+1];
        
        // Simple 3-candle pivot detection
        if (current && prev && next) {
            if (current.high > prev.high && current.high > next.high) {
                highs.push({ indexOffset: len - 1 - i, price: parseFloat(current.high.toFixed(2)) });
            }
            if (current.low < prev.low && current.low < next.low) {
                lows.push({ indexOffset: len - 1 - i, price: parseFloat(current.low.toFixed(2)) });
            }
        }
    }
    
    // Sort by offset (most recent first) and take top 3 significant ones
    const recentHighs = highs.slice(0, 3).map(h => `(Offset: ${h.indexOffset}, Price: ${h.price})`).join(', ');
    const recentLows = lows.slice(0, 3).map(l => `(Offset: ${l.indexOffset}, Price: ${l.price})`).join(', ');

    return `
      KEY PIVOT POINTS (Use these coordinates for drawings):
      - Recent Swing Highs: ${recentHighs}
      - Recent Swing Lows: ${recentLows}
      (Offset 0 is the current live candle. Offset 10 is 10 candles ago).
    `;
  }, [chartData]);

  // --- 1. PREPARE CONTEXT FOR GEMINI ---
  const getMarketContext = () => {
    if (!chartData || chartData.length < 10) return "Insufficient chart data available.";
    
    const last = chartData[chartData.length - 1];
    const prev = chartData[chartData.length - 2];
    
    const periods = 14;
    const recent = chartData.slice(-periods);
    const sumClose = recent.reduce((acc, val) => acc + val.close, 0);
    const sma = (sumClose / recent.length).toFixed(2);
    
    // Simple Trend Calculation
    const isBullish = last.close > sma;
    const trendText = isBullish ? "Bullish (Above SMA14)" : "Bearish (Below SMA14)";
    
    const highest = Math.max(...recent.map(c => c.high));
    const lowest = Math.min(...recent.map(c => c.low));

    const activeIndsText = activeIndicators.map(i => i.type).join(', ');
    
    let compContext = "";
    if (comparisons && comparisons.length > 0) {
       compContext = "Comparisons Active: " + comparisons.map(c => `${c.symbolInfo.ticker} (Price: ${c.symbolInfo.price})`).join(", ");
    }
    
    return `
      REAL-TIME MARKET CONTEXT FOR ${currentSymbol.ticker}:
      - Current Price: ${last.close}
      - Previous Close: ${prev.close}
      - Trend: ${trendText}
      - Recent High (14p): ${highest}
      - Recent Low (14p): ${lowest}
      - SMA(14): ${sma}
      - Active Indicators: ${activeIndsText}
      - ${compContext}
      - Chart Candle Count: ${chartData.length}
      
      ${getPivotContext}
    `;
  };

  // Define tools inside useMemo to ensure Type is available and avoid top-level crash
  const tools = useMemo(() => {
    try {
        // Strict safety check for GoogleGenAI Type to prevent runtime crash
        if (typeof Type === 'undefined' || !Type.OBJECT) {
            console.warn("GoogleGenAI 'Type' not available or incomplete. AI tools disabled.");
            return [];
        }

        const addDrawingTool: FunctionDeclaration = {
            name: 'add_technical_drawing',
            description: 'Draws a technical analysis tool on the chart. REQUIRED for any request involving "draw", "plot", "add line", "fibonacci", "trend".',
            parameters: {
                type: Type.OBJECT,
                properties: {
                    tool_type: {
                        type: Type.STRING,
                        description: 'Type of drawing: "trendline", "fibonacci", "fibonacci_circles", "horizontal_line" (support/resistance).'
                    },
                    start_index_offset: {
                        type: Type.NUMBER,
                        description: 'The starting candle index offset from the RIGHT (0 is recent). Use provided PIVOT POINTS.'
                    },
                    end_index_offset: {
                        type: Type.NUMBER,
                        description: 'The ending candle index offset from the RIGHT.'
                    },
                    start_price: {
                        type: Type.NUMBER,
                        description: 'Price for starting point. Use provided PIVOT POINTS.'
                    },
                    end_price: {
                        type: Type.NUMBER,
                        description: 'Price for ending point.'
                    }
                },
                required: ['tool_type', 'start_index_offset', 'start_price']
            }
        };

        const addComparisonTool: FunctionDeclaration = {
            name: 'add_market_overlay',
            description: 'Adds another asset/symbol (e.g., BTC, ETH, SPY) to the chart for comparison purposes.',
            parameters: {
                type: Type.OBJECT,
                properties: {
                    ticker: {
                        type: Type.STRING,
                        description: 'The ticker symbol to overlay (e.g., "BTC", "ETH", "AAPL").'
                    }
                },
                required: ['ticker']
            }
        };

        const changeSymbolTool: FunctionDeclaration = {
            name: 'change_active_symbol',
            description: 'Switches the main chart to a different financial asset (Symbol/Ticker).',
            parameters: {
                type: Type.OBJECT,
                properties: {
                    ticker: {
                        type: Type.STRING,
                        description: 'The ticker symbol to switch to (e.g., "TSLA", "EURUSD").'
                    }
                },
                required: ['ticker']
            }
        };

        const addIndicatorTool: FunctionDeclaration = {
            name: 'add_technical_indicator',
            description: 'Adds a technical indicator (SMA, RSI, MACD, Bollinger Bands, Volume) to the chart.',
            parameters: {
                type: Type.OBJECT,
                properties: {
                    type: {
                        type: Type.STRING,
                        description: 'Indicator Type: "SMA", "EMA", "WMA", "RSI", "MACD", "STOCH", "VOL", "BB".'
                    },
                    period: {
                        type: Type.NUMBER,
                        description: 'Length/Period (e.g., 14 for RSI, 20 for SMA). Default if unspecified.'
                    }
                },
                required: ['type']
            }
        };

        const manageChartTool: FunctionDeclaration = {
            name: 'manage_chart_elements',
            description: 'Removes, hides, or shows chart elements. Use for commands like "Delete RSI", "Hide SMA", "Show EMA", "Remove comparison".',
            parameters: {
                type: Type.OBJECT,
                properties: {
                    action: {
                        type: Type.STRING,
                        description: 'Action to perform: "clear_drawings", "remove_comparison", "remove_indicator", "hide_indicator", "show_indicator".'
                    },
                    target_id: {
                        type: Type.STRING,
                        description: 'For remove_comparison: the ticker symbol.'
                    },
                    target_type: {
                        type: Type.STRING,
                        description: 'For indicator actions: The type of indicator to target (e.g. "RSI", "SMA", "MACD", "VOL", "BB").'
                    }
                },
                required: ['action']
            }
        };

        return [addDrawingTool, addComparisonTool, changeSymbolTool, addIndicatorTool, manageChartTool];
    } catch (e) {
        console.error("Error creating AI tools definitions:", e);
        return [];
    }
  }, []);

  useEffect(() => {
    try {
      if (apiKey && tools.length > 0) {
        const ai = new GoogleGenAI({ apiKey: apiKey });
        
        // We initialize the chat once. We will inject updated context via prompts if needed.
        if (!chatSessionRef.current) {
            chatSessionRef.current = ai.chats.create({
              model: 'gemini-2.5-flash',
              config: {
                systemInstruction: `You are an expert financial trading assistant and market analyst.
                
                Your primary goal is to provide insightful market analysis AND proactively execute technical analysis on the chart.

                Capabilities:
                1. **Autonomous Drawing**: If you see a trend or pattern in the provided "KEY PIVOT POINTS", PROPOSE and DRAW it immediately using 'add_technical_drawing'.
                   - Identify Swing Highs and Swing Lows from the Context provided.
                   - Connect them with Trendlines.
                   - Draw Fibonacci Retracements or Circles from a major Swing Low to a Swing High (or vice versa).
                2. **Analysis**: Always explain *why* you are drawing something (e.g., "Drawing a trendline connecting the recent highs to highlight resistance").
                
                Tool Specifics:
                - **Fibonacci Circles**: Use tool_type="fibonacci_circles". This creates circular support/resistance levels.
                - **Trendlines**: Use tool_type="trendline".
                - **Support/Resistance**: Use tool_type="horizontal_line".
                
                Command Handling:
                - "Draw Fibonacci Circles": Use 'fibonacci_circles'.
                - "Compare with [Asset]": Use 'add_market_overlay' AND provide a comparative analysis.
                - "Delete/Hide [Element]": Use 'manage_chart_elements'.

                Always refer to the "KEY PIVOT POINTS" in the context for accurate coordinates (Offset and Price).
                `,
                tools: [{ 
                    functionDeclarations: tools
                }]
              }
            });
        }
      }
    } catch (error) {
      console.error("Failed to initialize Gemini:", error);
    }
  }, [apiKey, tools]); 

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  // --- LOCAL FUNCTION EXECUTION ---
  
  const executeDrawingTool = (args: any) => {
      if (!onAddDrawing || !chartData || chartData.length === 0) return "Error: Chart data not ready.";
      
      const { tool_type, start_index_offset, end_index_offset, start_price, end_price } = args;
      const dataLen = chartData.length;

      // Convert offsets to real data points
      const startIndex = Math.max(0, dataLen - 1 - (start_index_offset || 0));
      const endIndex = Math.max(0, dataLen - 1 - (end_index_offset || 0));

      const startPoint = {
          time: chartData[startIndex]?.time || Date.now(),
          price: start_price
      };
      
      const endPoint = {
          time: chartData[endIndex]?.time || Date.now(),
          price: end_price || start_price // Default to horizontal if no end price
      };

      if (tool_type === 'fibonacci' || tool_type === 'fibonacci_circles') {
          const subtype = tool_type === 'fibonacci_circles' ? 'circles' : 'lines';
          const newFib: FibonacciDrawing = {
              id: Date.now().toString(),
              type: 'fibonacci',
              subtype: subtype,
              points: [startPoint, endPoint],
              createdAt: Date.now(),
              visible: true,
              levels: [], // Will be filled by App defaults
              color: '#2962ff', width: 2, showLabels: true, labelType: 'value', labelAlignment: 'left', style: 'dashed'
          };
          onAddDrawing(newFib);
          return `${subtype === 'circles' ? 'Fibonacci Circles' : 'Fibonacci Retracement'} drawn from ${start_price} to ${end_price}.`;
      } else {
          // Trendline or Horizontal Line
          const newTrend: PointDrawing = {
              id: Date.now().toString(),
              type: 'trendline',
              points: [startPoint, endPoint],
              createdAt: Date.now(),
              visible: true,
              color: tool_type === 'horizontal_line' ? '#f23645' : '#2962ff',
              width: 2,
              style: 'solid'
          };
          onAddDrawing(newTrend);
          return `${tool_type === 'horizontal_line' ? 'Support/Resistance line' : 'Trendline'} drawn at ${start_price}.`;
      }
  };

  const executeComparisonTool = async (args: any) => {
      if (!onAddComparison) return "Error: Comparison feature unavailable.";
      const { ticker } = args;
      const symbol = await onAddComparison(ticker);
      if (symbol) {
          return `Successfully added ${symbol.ticker} to chart overlay. Current Price: ${symbol.price}. Please provide a comparative analysis between ${currentSymbol.ticker} and ${symbol.ticker} based on their recent trends and prices.`;
      }
      return `Failed to find or add ${ticker}.`;
  };

  const executeChangeSymbolTool = async (args: any) => {
      if (!onChangeSymbol) return "Error: Change Symbol feature unavailable.";
      const { ticker } = args;
      const success = await onChangeSymbol(ticker);
      if (success) return `Main chart switched to ${ticker}.`;
      return `Failed to switch to ${ticker}. Symbol not found.`;
  };

  const executeAddIndicatorTool = (args: any) => {
      if (!onAddIndicator) return "Error: Indicator feature unavailable.";
      const { type, period } = args;
      
      const newIndicator: Indicator = {
          id: Date.now().toString(),
          type: type,
          period: period || 14,
          color: '#2962ff',
          lineWidth: 2,
          lineStyle: 'solid',
          visible: true
      };
      
      // Add defaults for specific complex types if needed
      if (type === 'MACD') {
          newIndicator.fastPeriod = 12;
          newIndicator.period = 26;
          newIndicator.signalPeriod = 9;
      }
      if (type === 'BB') newIndicator.stdDev = 2;

      onAddIndicator(newIndicator);
      return `Added ${type} indicator (Period: ${newIndicator.period}).`;
  };

  const executeManageTool = (args: any) => {
      const { action, target_id, target_type } = args;
      
      if (action === 'clear_drawings') {
          if (onClearDrawings) {
              onClearDrawings();
              return "All drawings cleared from the chart.";
          }
      } else if (action === 'remove_comparison') {
          if (onRemoveComparison && target_id) {
              onRemoveComparison(target_id);
              return `Removed comparison overlay for ${target_id}.`;
          }
      } else if (action === 'remove_indicator' && target_type && onRemoveIndicator) {
          const ind = activeIndicators.find(i => i.type === target_type);
          if (ind) {
              onRemoveIndicator(ind.id);
              return `Removed ${target_type} indicator.`;
          }
          return `Could not find any active ${target_type} indicator to remove.`;

      } else if ((action === 'hide_indicator' || action === 'show_indicator') && target_type && onToggleIndicatorVisibility) {
           const ind = activeIndicators.find(i => i.type === target_type);
           if (ind) {
              // Only toggle if state mismatches requested action
              const shouldBeVisible = action === 'show_indicator';
              if (ind.visible !== shouldBeVisible) {
                   onToggleIndicatorVisibility(ind.id);
                   return `${shouldBeVisible ? 'Shown' : 'Hidden'} ${target_type} indicator.`;
              }
              return `${target_type} is already ${shouldBeVisible ? 'visible' : 'hidden'}.`;
           }
           return `Could not find any active ${target_type} indicator.`;
      }

      return "Action could not be performed.";
  };

  const handleSend = async () => {
    if (!input.trim()) return;

    if (!apiKey) {
         setMessages(prev => [...prev, {
            id: Date.now().toString(), sender: 'bot', text: "Please provide an API Key in the code to use the assistant.", timestamp: new Date()
        }]);
        return;
    }

    const userMsg: Message = { id: Date.now().toString(), sender: 'user', text: input, timestamp: new Date() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsTyping(true);

    try {
      if (!chatSessionRef.current) {
         setMessages(prev => [...prev, {
            id: (Date.now() + 1).toString(), sender: 'bot', text: "AI is not initialized. Please check your network connection or API Key.", timestamp: new Date()
        }]);
         return;
      }

      // 1. Send Message
      const context = getMarketContext();
      const prompt = `[Context: ${context}] User Query: ${userMsg.text}`;

      let result = await chatSessionRef.current.sendMessage({ message: prompt });
      
      // 2. Handle Function Calls
      const functionCalls = result.functionCalls; 

      if (functionCalls && functionCalls.length > 0) {
          const functionResponses: any[] = [];
          
          for (const call of functionCalls) {
             console.log("AI Tool Call:", call.name, call.args);
             let functionResult = "";
             let displayText = "";

             if (call.name === 'add_technical_drawing') {
                 functionResult = executeDrawingTool(call.args);
                 displayText = `✏️ Drawing ${call.args.tool_type}...`;
             } else if (call.name === 'add_market_overlay') {
                 functionResult = await executeComparisonTool(call.args);
                 displayText = `⚖️ Comparing ${call.args.ticker}...`;
             } else if (call.name === 'change_active_symbol') {
                 functionResult = await executeChangeSymbolTool(call.args);
                 displayText = `🔄 Switching to ${call.args.ticker}...`;
             } else if (call.name === 'add_technical_indicator') {
                 functionResult = executeAddIndicatorTool(call.args);
                 displayText = `📈 Adding ${call.args.type}...`;
             } else if (call.name === 'manage_chart_elements') {
                 functionResult = executeManageTool(call.args);
                 displayText = `🗑️ ${call.args.action}...`;
             }

             // Show the UI that a tool is being used
             setMessages(prev => [...prev, {
                 id: Date.now().toString() + Math.random(),
                 sender: 'bot',
                 text: displayText,
                 timestamp: new Date(),
                 isToolUse: true
             }]);

             // Construct response part
             functionResponses.push({
                 functionResponse: {
                    name: call.name,
                    response: { result: functionResult } // Expected format for Gemini
                 }
             });
          }

          // 3. Send Tool Response back to Gemini
          // IMPORTANT: Use sendMessage with the function responses wrapped in a message object.
          const nextResult = await chatSessionRef.current.sendMessage({ message: functionResponses });
          
          // 4. Get Final Text Response
          const botText = nextResult.text;
           setMessages(prev => [...prev, {
            id: (Date.now() + 1).toString(),
            sender: 'bot',
            text: botText || "Done.",
            timestamp: new Date()
          }]);

      } else {
          // Normal Text Response
          setMessages(prev => [...prev, {
            id: (Date.now() + 1).toString(),
            sender: 'bot',
            text: result.text,
            timestamp: new Date()
          }]);
      }

    } catch (error: any) {
      console.error(error);
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        sender: 'bot',
        text: `Error: ${error.message || "Connection failed."}`,
        timestamp: new Date()
      }]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSend();
  };

  return (
    <>
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 w-14 h-14 bg-tv-accent rounded-full shadow-lg flex items-center justify-center text-white hover:bg-blue-600 transition-all hover:scale-110 z-50 animate-bounce"
        >
          <MessageSquare size={24} />
        </button>
      )}

      {isOpen && (
        <div className="fixed bottom-6 right-6 w-[360px] h-[450px] bg-tv-pane rounded-lg shadow-2xl border border-tv-border flex flex-col z-50 animate-in slide-in-from-bottom-10 duration-300 backdrop-blur-md bg-opacity-95">
          <div className="p-4 bg-tv-bg border-b border-tv-border flex justify-between items-center rounded-t-lg">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-blue-600 to-purple-600 flex items-center justify-center shadow-inner">
                <Bot size={20} className="text-white" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-tv-text">Gemini Market AI</h3>
                <div className="flex items-center gap-1.5">
                   <span className="w-1.5 h-1.5 rounded-full bg-tv-green animate-pulse"></span>
                   <span className="text-[10px] text-tv-muted uppercase tracking-wide">Ready</span>
                </div>
              </div>
            </div>
            <button onClick={() => setIsOpen(false)} className="text-tv-muted hover:text-tv-text p-1 hover:bg-tv-border rounded transition-colors">
              <X size={18} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar bg-tv-bg/30">
            {messages.map(msg => (
              <div key={msg.id} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] p-3.5 rounded-2xl text-sm shadow-sm ${
                  msg.sender === 'user' 
                    ? 'bg-tv-accent text-white rounded-tr-sm' 
                    : msg.isToolUse 
                      ? 'bg-tv-pane border border-tv-accent/50 text-tv-accent italic text-xs'
                      : 'bg-tv-pane border border-tv-border text-tv-text rounded-tl-sm'
                }`}>
                  {msg.text.split('\n').map((line, i) => <p key={i} className="mb-1 last:mb-0 leading-relaxed">{line}</p>)}
                </div>
              </div>
            ))}
            {isTyping && (
              <div className="flex justify-start">
                <div className="bg-tv-pane border border-tv-border p-3 rounded-2xl rounded-tl-sm flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 bg-tv-muted rounded-full animate-bounce"></span>
                  <span className="w-1.5 h-1.5 bg-tv-muted rounded-full animate-bounce delay-100"></span>
                  <span className="w-1.5 h-1.5 bg-tv-muted rounded-full animate-bounce delay-200"></span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <div className="p-3 border-t border-tv-border bg-tv-bg rounded-b-lg">
            <div className="flex gap-2 mb-3 overflow-x-auto scrollbar-hide">
              <button 
                className="px-3 py-1.5 bg-tv-pane border border-tv-border rounded-full text-[11px] hover:border-tv-accent hover:text-tv-accent transition-all whitespace-nowrap flex items-center gap-1.5"
                onClick={() => setInput(`Analyze chart and suggest drawings`)}
              >
                <TrendingUp size={12} /> Auto Analyze
              </button>
              <button 
                className="px-3 py-1.5 bg-tv-pane border border-tv-border rounded-full text-[11px] hover:border-tv-accent hover:text-tv-accent transition-all whitespace-nowrap flex items-center gap-1.5"
                onClick={() => setInput(`Draw Fibonacci Circles from recent Low to High`)}
              >
                <PenTool size={12} /> Draw Fib Circles
              </button>
               <button 
                className="px-3 py-1.5 bg-tv-pane border border-tv-border rounded-full text-[11px] hover:border-tv-accent hover:text-tv-accent transition-all whitespace-nowrap flex items-center gap-1.5"
                onClick={() => setInput(`Add RSI indicator`)}
              >
                <Sparkles size={12} /> Add RSI
              </button>
            </div>

            <div className="flex items-center gap-2">
              <input 
                type="text" 
                className="flex-1 bg-tv-pane border border-tv-border rounded-lg p-2.5 text-sm focus:border-tv-accent focus:ring-1 focus:ring-tv-accent outline-none text-tv-text placeholder-tv-muted transition-all"
                placeholder={apiKey ? "Ask AI to draw..." : "AI Unavailable (No Key)"}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKeyPress}
                disabled={!apiKey}
              />
              <button 
                onClick={handleSend}
                disabled={isTyping || !input.trim() || !apiKey}
                className="p-2.5 bg-tv-accent text-white rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:hover:bg-tv-accent"
              >
                <Send size={18} />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default FinancialAssistant;