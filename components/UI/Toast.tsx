import * as React from 'react';
import { X, Bell, CheckCircle, AlertTriangle, Info } from 'lucide-react';

const { useEffect } = React;

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info' | 'alert';
  title: string;
  message: string;
  duration?: number;
}

interface ToastProps {
  toast: ToastMessage;
  onClose: (id: string) => void;
}

export const Toast: React.FC<ToastProps> = ({ toast, onClose }) => {
  useEffect(() => {
    if (toast.duration) {
      const timer = setTimeout(() => onClose(toast.id), toast.duration);
      return () => clearTimeout(timer);
    }
  }, [toast, onClose]);

  const getIcon = () => {
    switch (toast.type) {
      case 'success': return <CheckCircle size={20} className="text-tv-green" />;
      case 'error': return <X size={20} className="text-tv-red" />;
      case 'warning': return <AlertTriangle size={20} className="text-orange-500" />;
      case 'alert': return <Bell size={20} className="text-tv-accent" />;
      default: return <Info size={20} className="text-tv-accent" />;
    }
  };

  return (
    <div className="bg-tv-pane border-l-4 border-tv-accent shadow-lg rounded-r flex items-start p-4 mb-3 w-80 animate-in slide-in-from-right duration-300 relative group pointer-events-auto">
      <div className="shrink-0 mr-3 mt-0.5">
        {getIcon()}
      </div>
      <div className="flex-1">
        <h4 className="text-sm font-bold text-tv-text mb-1">{toast.title}</h4>
        <p className="text-xs text-tv-muted leading-relaxed">{toast.message}</p>
      </div>
      <button 
        onClick={() => onClose(toast.id)} 
        className="text-tv-muted hover:text-tv-text absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
      >
        <X size={14} />
      </button>
    </div>
  );
};

export const ToastContainer: React.FC<{ toasts: ToastMessage[], removeToast: (id: string) => void }> = ({ toasts, removeToast }) => {
  return (
    <div className="fixed top-16 right-4 z-[100] flex flex-col pointer-events-none">
      {toasts.map(t => (
        <Toast key={t.id} toast={t} onClose={removeToast} />
      ))}
    </div>
  );
};