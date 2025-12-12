import * as React from 'react';
import { X, Palette, Activity, Bell, Shield, Keyboard, Monitor, Globe } from 'lucide-react';
import { ChartSettings } from '../../types';

const { useState } = React;

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: ChartSettings;
  onSettingsChange: (settings: Partial<ChartSettings>) => void;
}

const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose, settings, onSettingsChange }) => {
  const [activeTab, setActiveTab] = useState('appearance');

  if (!isOpen) return null;

  const timezones = [
    { value: 'UTC', label: 'UTC' },
    { value: 'America/New_York', label: 'New York (EST/EDT)' },
    { value: 'America/Los_Angeles', label: 'Los Angeles (PST/PDT)' },
    { value: 'Europe/London', label: 'London (GMT/BST)' },
    { value: 'Europe/Paris', label: 'Paris (CET)' },
    { value: 'Asia/Tokyo', label: 'Tokyo (JST)' },
    { value: 'Asia/Singapore', label: 'Singapore (SGT)' },
    { value: 'Australia/Sydney', label: 'Sydney (AEDT)' },
    { value: Intl.DateTimeFormat().resolvedOptions().timeZone, label: 'Local Time' },
  ];

  const renderTabContent = () => {
    switch(activeTab) {
      case 'appearance':
        return (
          <div className="space-y-6">
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-tv-accent uppercase tracking-wider">Theme & Layout</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col space-y-2">
                   <label className="text-sm text-tv-muted">Theme Preset</label>
                   <select 
                     className="bg-tv-bg border border-tv-border rounded p-2 text-sm outline-none text-tv-text"
                     value={settings.theme}
                     onChange={(e) => onSettingsChange({ theme: e.target.value as 'dark' | 'light' })}
                   >
                     <option value="dark">Dark</option>
                     <option value="light">Light</option>
                   </select>
                </div>
                 <div className="flex flex-col space-y-2">
                   <label className="text-sm text-tv-muted">Grid Lines</label>
                   <select 
                      className="bg-tv-bg border border-tv-border rounded p-2 text-sm outline-none text-tv-text"
                      value={settings.showGrid ? "show" : "hide"}
                      onChange={(e) => onSettingsChange({ showGrid: e.target.value === "show" })}
                   >
                     <option value="show">Show</option>
                     <option value="hide">Hide</option>
                   </select>
                </div>
              </div>
            </div>

            <div className="space-y-4">
               <h3 className="text-sm font-semibold text-tv-accent uppercase tracking-wider">Timezone</h3>
               <div className="flex flex-col space-y-2">
                   <label className="text-sm text-tv-muted">Chart Timezone</label>
                   <div className="flex items-center gap-2">
                     <Globe size={16} className="text-tv-muted" />
                     <select 
                       className="flex-1 bg-tv-bg border border-tv-border rounded p-2 text-sm outline-none text-tv-text"
                       value={settings.timezone}
                       onChange={(e) => onSettingsChange({ timezone: e.target.value })}
                     >
                        {Array.from(new Set(timezones.map(t => JSON.stringify(t)))).map(t => {
                          const tz = JSON.parse(t);
                          return <option key={tz.value} value={tz.value}>{tz.label} ({tz.value})</option>;
                        })}
                     </select>
                   </div>
               </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-tv-accent uppercase tracking-wider">Chart Colors</h3>
              <div className="grid grid-cols-2 gap-y-4">
                 <div className="flex items-center justify-between pr-4">
                   <span className="text-sm text-tv-text">Candle Up</span>
                   <div className="w-6 h-6 rounded border border-tv-border bg-[#089981]"></div>
                 </div>
                 <div className="flex items-center justify-between pr-4">
                   <span className="text-sm text-tv-text">Candle Down</span>
                   <div className="w-6 h-6 rounded border border-tv-border bg-[#f23645]"></div>
                 </div>
              </div>
            </div>
          </div>
        );
      case 'trading':
        return (
          <div className="space-y-6">
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-tv-accent uppercase tracking-wider">Order Execution</h3>
              <div className="flex items-center justify-between">
                <span className="text-sm text-tv-text">Instant Placement</span>
                <input type="checkbox" className="accent-tv-accent" />
              </div>
               <div className="flex items-center justify-between">
                <span className="text-sm text-tv-text">Show Executions on Chart</span>
                <input type="checkbox" className="accent-tv-accent" defaultChecked />
              </div>
               <div className="flex items-center justify-between">
                <span className="text-sm text-tv-text">Play Sound on Fill</span>
                <input type="checkbox" className="accent-tv-accent" defaultChecked />
              </div>
            </div>
             <div className="space-y-4">
              <h3 className="text-sm font-semibold text-tv-accent uppercase tracking-wider">Risk Management</h3>
               <div className="flex flex-col space-y-2">
                   <label className="text-sm text-tv-muted">Default Stop Loss Type</label>
                   <select className="bg-tv-bg border border-tv-border rounded p-2 text-sm text-tv-text">
                     <option>Percentage</option>
                     <option>Fixed Price</option>
                     <option>Pips</option>
                   </select>
                </div>
            </div>
          </div>
        );
      default:
        return <div className="text-center p-8 text-tv-muted">Coming Soon</div>;
    }
  };

  const tabs = [
    { id: 'appearance', label: 'Appearance', icon: Palette },
    { id: 'trading', label: 'Trading', icon: Activity },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'data', label: 'Data & Privacy', icon: Shield },
    { id: 'hotkeys', label: 'Hotkeys', icon: Keyboard },
    { id: 'system', label: 'System', icon: Monitor },
  ];

  return (
    <div className="fixed inset-0 bg-black/50 z-[70] flex items-center justify-center backdrop-blur-sm p-4">
      <div className="bg-tv-pane w-full max-w-xl h-[450px] max-h-[80vh] rounded-lg shadow-2xl flex border border-tv-border overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Sidebar */}
        <div className="w-48 bg-tv-bg border-r border-tv-border flex flex-col shrink-0">
          <div className="p-4 border-b border-tv-border">
            <h2 className="text-lg font-bold text-tv-text">Settings</h2>
          </div>
          <div className="flex-1 py-2 overflow-y-auto">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-center px-4 py-2.5 text-xs font-medium transition-colors ${activeTab === tab.id ? 'text-tv-accent bg-tv-pane border-r-2 border-tv-accent' : 'text-tv-muted hover:text-tv-text hover:bg-tv-pane'}`}
              >
                <tab.icon size={16} className="mr-3" />
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 flex flex-col bg-tv-pane min-w-0">
           <div className="p-3 flex justify-end shrink-0">
             <button onClick={onClose} className="text-tv-muted hover:text-tv-text">
               <X size={20} />
             </button>
           </div>
           <div className="flex-1 px-6 pb-6 overflow-y-auto">
             {renderTabContent()}
           </div>
           <div className="p-3 border-t border-tv-border flex justify-end gap-2 bg-tv-bg shrink-0">
             <button onClick={onClose} className="px-3 py-1.5 rounded text-xs font-medium hover:bg-tv-border text-tv-text">Cancel</button>
             <button onClick={onClose} className="px-3 py-1.5 bg-tv-accent text-white rounded text-xs font-medium hover:bg-blue-600">Done</button>
           </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsModal;