
import React from 'react';
import { LayoutDashboard, UploadCloud, Truck, FileText, Settings, X, CreditCard } from 'lucide-react';
import { View } from '../types';
import clsx from 'clsx';

interface SidebarProps {
    currentView: View;
    onNavigate: (view: View) => void;
    isOpen: boolean; // New prop for mobile state
    onClose: () => void; // New prop to close mobile menu
}

export const Sidebar: React.FC<SidebarProps> = ({ currentView, onNavigate, isOpen, onClose }) => {
  const navItemClass = (view: View) => clsx(
    "flex items-center gap-3 px-4 py-3 rounded-lg font-medium cursor-pointer transition-colors",
    currentView === view 
        ? "bg-blue-600 text-white" 
        : "text-slate-400 hover:text-white hover:bg-slate-800"
  );

  const handleNavClick = (view: View) => {
      onNavigate(view);
      onClose(); // Auto close on mobile when clicking a link
  };

  return (
    <>
        {/* Mobile Backdrop */}
        <div 
            className={clsx(
                "fixed inset-0 bg-black/50 z-40 transition-opacity md:hidden",
                isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
            )}
            onClick={onClose}
        />

        {/* Sidebar Container */}
        <div className={clsx(
            "fixed inset-y-0 left-0 z-50 w-64 bg-slate-900 text-white transform transition-transform duration-300 ease-in-out md:translate-x-0 md:static md:flex md:flex-col md:h-screen",
            isOpen ? "translate-x-0" : "-translate-x-full"
        )}>
            <div className="p-6 border-b border-slate-800 flex justify-between items-center">
                <h1 className="text-xl font-bold flex items-center gap-2">
                    <Truck className="text-blue-500" />
                    <span>ERP Logística <span className="text-blue-500">Integral</span></span>
                </h1>
                {/* Close Button (Mobile Only) */}
                <button 
                    onClick={onClose}
                    className="md:hidden p-1 text-slate-400 hover:text-white"
                >
                    <X size={24} />
                </button>
            </div>
          
            <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
                <div 
                    onClick={() => handleNavClick('dashboard')}
                    className={navItemClass('dashboard')}
                >
                    <LayoutDashboard size={20} />
                    <span>Dashboard</span>
                </div>
                
                <div 
                    onClick={() => handleNavClick('import')}
                    className={navItemClass('import')}
                >
                    <UploadCloud size={20} />
                    <span>Importar Datos</span>
                </div>

                <div 
                    onClick={() => handleNavClick('expenses')}
                    className={navItemClass('expenses')}
                >
                    <CreditCard size={20} />
                    <span>Gastos Tarjetas</span>
                </div>

                <div 
                    onClick={() => handleNavClick('reports')}
                    className={navItemClass('reports')}
                >
                    <FileText size={20} />
                    <span>Reportes</span>
                </div>
                <div 
                    onClick={() => handleNavClick('settings')}
                    className={navItemClass('settings')}
                >
                    <Settings size={20} />
                    <span>Configuración</span>
                </div>
            </nav>

            <div className="p-4 border-t border-slate-800">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center font-bold text-sm">
                        AD
                    </div>
                    <div className="overflow-hidden">
                        <p className="text-sm font-medium truncate">Admin User</p>
                        <p className="text-xs text-slate-400 truncate">Gerente Logística</p>
                    </div>
                </div>
            </div>
        </div>
    </>
  );
};
