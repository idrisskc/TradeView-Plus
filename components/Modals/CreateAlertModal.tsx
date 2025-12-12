import * as React from 'react';
import { X, Bell, AlertTriangle } from 'lucide-react';
import { Alert, AlertCondition } from '../../types';

const { useState, useEffect } = React;

interface CreateAlertModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentPrice: number;
  symbol: string;
  onCreateAlert: (alert: Omit<Alert, 'id' | 'createdAt' | 'triggered'>) => void;
}

const CreateAlertModal: React.FC<CreateAlertModalProps> = ({ 
  isOpen, 
  onClose, 
  currentPrice,
  symbol,
  onCreateAlert
}) => {
  const [price, setPrice] = useState<number>(currentPrice);
  const [condition, setCondition] = useState<AlertCondition>('greater_than');
  const [message, setMessage] = useState('');
  
  // Update local price state when prop changes (if modal is open)
  useEffect(() => {
    if (isOpen) {
      setPrice(currentPrice);
      // Pre-select smart condition
      setCondition('greater_than');
      // Request permission on open to avoid blocking popups later
      if (Notification.permission === 'default') {
         Notification.requestPermission();
      }
    }
  }, [isOpen, currentPrice]);

  if (!isOpen) return null;

  const handleSubmit = () => {
    onCreateAlert({
      symbol,
      price,
      condition,
      message: message || `${symbol} ${condition === 'greater_than' ? 'Crossing Up' : 'Crossing Down'} ${price}`,
      active: true
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-[60] flex items-center justify-center backdrop-blur-sm" onClick={onClose}>
      <div className="bg-tv-pane w-full max-w-md rounded-lg shadow-2xl border border-tv-border flex flex-col animate-in fade-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-4 border-b border-tv-border">
          <div className="flex items-center gap-2">
            <Bell className="text-tv-accent" size={20} />
            <h2 className="text-lg font-bold text-tv-text">Create Alert for {symbol}</h2>
          </div>
          <button onClick={onClose} className="text-tv-muted hover:text-tv-text">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 space-y-6">
          <div className="grid grid-cols-2 gap-4">
             <div className="space-y-1">
               <label className="text-xs text-tv-muted">Condition</label>
               <select 
                 className="w-full bg-tv-bg border border-tv-border rounded p-2 text-sm outline-none focus:border-tv-accent text-tv-text"
                 value={condition}
                 onChange={e => setCondition(e.target.value as AlertCondition)}
               >
                 <option value="greater_than">Crossing Up</option>
                 <option value="less_than">Crossing Down</option>
               </select>
             </div>
             <div className="space-y-1">
               <label className="text-xs text-tv-muted">Price</label>
               <input 
                 type="number" 
                 step="0.01"
                 className="w-full bg-tv-bg border border-tv-border rounded p-2 text-sm outline-none focus:border-tv-accent text-tv-text"
                 value={price}
                 onChange={e => setPrice(parseFloat(e.target.value))}
               />
             </div>
          </div>
          
          <div className="p-3 bg-tv-bg rounded border border-tv-border flex items-center gap-3">
             <div className="text-xs text-tv-muted">Current Price:</div>
             <div className="font-mono font-bold text-tv-accent">{currentPrice.toFixed(2)}</div>
          </div>

          <div className="space-y-1">
             <label className="text-xs text-tv-muted">Message (Optional)</label>
             <textarea 
               className="w-full bg-tv-bg border border-tv-border rounded p-2 text-sm outline-none focus:border-tv-accent resize-none h-20 text-tv-text placeholder-tv-muted"
               placeholder="Enter custom alert message..."
               value={message}
               onChange={e => setMessage(e.target.value)}
             />
          </div>

           <div className="space-y-2">
             <label className="text-xs text-tv-muted">Notify me via</label>
             <div className="flex gap-4">
               <label className="flex items-center gap-2 text-sm cursor-pointer text-tv-text">
                 <input type="checkbox" defaultChecked className="accent-tv-accent" /> App
               </label>
               <label className="flex items-center gap-2 text-sm cursor-pointer text-tv-text">
                 <input type="checkbox" defaultChecked className="accent-tv-accent" /> Browser
               </label>
               <label className="flex items-center gap-2 text-sm cursor-pointer text-tv-text">
                 <input type="checkbox" className="accent-tv-accent" /> Email
               </label>
             </div>
          </div>
        </div>

        <div className="p-4 border-t border-tv-border bg-tv-bg/30 flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 text-sm hover:text-tv-text text-tv-muted transition-colors">Cancel</button>
          <button onClick={handleSubmit} className="px-6 py-2 bg-tv-accent hover:bg-blue-600 text-white rounded text-sm font-medium transition-colors">Create</button>
        </div>
      </div>
    </div>
  );
};

export default CreateAlertModal;