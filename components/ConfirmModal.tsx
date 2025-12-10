
import React from 'react';
import { AlertTriangle, X } from 'lucide-react';

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  isDestructive?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({ 
    isOpen, 
    title, 
    message, 
    confirmText = "Confirmar", 
    cancelText = "Cancelar", 
    isDestructive = true,
    onConfirm, 
    onClose 
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="p-6">
            <div className="flex items-center gap-3 mb-4">
                <div className={`p-3 rounded-full ${isDestructive ? 'bg-red-100 text-red-600' : 'bg-blue-100 text-blue-600'}`}>
                    <AlertTriangle size={24} />
                </div>
                <h3 className="text-xl font-bold text-slate-800">{title}</h3>
            </div>
            
            <p className="text-slate-600 mb-6 leading-relaxed">
                {message}
            </p>

            <div className="flex justify-end gap-3">
                <button 
                    onClick={onClose} 
                    className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-medium transition-colors"
                >
                    {cancelText}
                </button>
                <button 
                    onClick={() => { onConfirm(); onClose(); }} 
                    className={`px-4 py-2 text-white rounded-lg font-bold shadow-sm transition-all ${
                        isDestructive 
                        ? 'bg-red-600 hover:bg-red-700 hover:shadow-red-200' 
                        : 'bg-blue-600 hover:bg-blue-700 hover:shadow-blue-200'
                    }`}
                >
                    {confirmText}
                </button>
            </div>
        </div>
      </div>
    </div>
  );
};
