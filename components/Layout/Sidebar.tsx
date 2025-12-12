import * as React from 'react';
import { 
  Crosshair, 
  TrendingUp, 
  Type, 
  PenTool, 
  Trash2,
  Lock,
  Unlock,
  Eye,
  EyeOff,
  Magnet,
  Scaling,
  Settings2
} from 'lucide-react';
import { ToolType } from '../../types';

interface SidebarProps {
  activeTool: ToolType;
  onToolChange: (tool: ToolType) => void;
  onClearDrawings: () => void;
  onToggleSettings: () => void;
  isSettingsOpen: boolean;
  isLocked: boolean;
  onToggleLock: () => void;
  isHidden: boolean;
  onToggleHide: () => void;
}

const ToolButton = ({ 
  icon, 
  active, 
  onClick, 
  title,
  className = ""
}: { 
  icon: React.ReactNode, 
  active?: boolean, 
  onClick?: () => void, 
  title?: string,
  className?: string
}) => (
  <button 
    className={`w-10 h-10 flex items-center justify-center rounded transition-all relative group mb-1 outline-none border-none
      ${active 
        ? 'text-tv-accent bg-tv-accent/10' 
        : 'text-tv-text hover:bg-tv-pane hover:text-tv-text'}
      ${className}
    `}
    onClick={onClick}
    title={title}
  >
    {React.cloneElement(icon as React.ReactElement<any>, { size: 20 })}
    {/* Tooltip */}
    <div className="absolute left-full top-1/2 -translate-y-1/2 ml-2 bg-tv-pane border border-tv-border text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-50 shadow-lg border-l-2 border-l-tv-accent">
      {title}
    </div>
  </button>
);

const Sidebar: React.FC<SidebarProps> = ({ 
  activeTool, 
  onToolChange, 
  onClearDrawings,
  onToggleSettings,
  isSettingsOpen,
  isLocked,
  onToggleLock,
  isHidden,
  onToggleHide
}) => {
  return (
    <div className="w-[50px] border-r border-tv-border bg-tv-bg flex flex-col items-center py-2 z-20 shadow-sm">
      <ToolButton 
        icon={<Crosshair />} 
        active={activeTool === 'cursor'} 
        onClick={() => onToolChange('cursor')}
        title="Cursor / Pan"
      />
      <div className="w-6 h-[1px] bg-tv-border my-2"></div>
      
      <ToolButton 
        icon={<TrendingUp />} 
        active={activeTool === 'trendline'}
        onClick={() => onToolChange('trendline')}
        title="Trend Line"
      />
      
      <ToolButton 
        icon={<Scaling />} 
        active={activeTool === 'fibonacci'}
        onClick={() => onToolChange('fibonacci')}
        title="Fibonacci Tools"
      />

      <ToolButton 
        icon={<PenTool />} 
        active={activeTool === 'brush'}
        onClick={() => onToolChange('brush')}
        title="Brush" 
      />
      
      <ToolButton 
        icon={<Type />} 
        active={activeTool === 'text'}
        onClick={() => onToolChange('text')}
        title="Text" 
      />
      
      <div className="w-6 h-[1px] bg-tv-border my-2"></div>

      <ToolButton 
        icon={<Settings2 />} 
        active={isSettingsOpen}
        onClick={onToggleSettings}
        title="Drawing Settings"
      />
      
      <div className="flex-1"></div>
      
      <ToolButton icon={<Magnet />} title="Magnet Mode (Auto)" />
      
      <ToolButton 
        icon={isLocked ? <Lock /> : <Unlock />} 
        active={isLocked}
        onClick={onToggleLock}
        title={isLocked ? "Unlock All Drawings" : "Lock All Drawings"}
        className={isLocked ? "text-orange-500 bg-orange-500/10" : ""}
      />
      
      <ToolButton 
        icon={isHidden ? <EyeOff /> : <Eye />} 
        active={isHidden}
        onClick={onToggleHide}
        title={isHidden ? "Show All Drawings" : "Hide All Drawings"} 
        className={isHidden ? "text-tv-muted" : ""}
      />
      
      <div className="w-6 h-[1px] bg-tv-border my-2"></div>
      
      <ToolButton 
        icon={<Trash2 />} 
        onClick={onClearDrawings}
        title="Clear All Drawings"
        className="hover:text-tv-red hover:bg-tv-red/10"
      />
    </div>
  );
};

export default Sidebar;