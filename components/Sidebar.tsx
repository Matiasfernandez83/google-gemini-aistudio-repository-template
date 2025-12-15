
import React from 'react';
import { LayoutDashboard, UploadCloud, Truck, FileText, Settings, X, CreditCard, ChevronRight, LogOut } from 'lucide-react';
import { View } from '../types';
import clsx from 'clsx';

interface SidebarProps {
    currentView: View;
    onNavigate: (view: View) => void;
    isOpen: boolean; 
    onClose: () => void; 
}

export const Sidebar: React.FC<SidebarProps> = ({ currentView, onNavigate, isOpen, onClose }) => {
  const navItemClass = (view: View) => clsx(
    "group flex items-center justify-between px-5 py-4 rounded-r-full mr-4 font-medium cursor-pointer transition-all duration-200 border-l-[6px]",
    currentView === view 
        ? "border-furlong-red bg-white/5 text-white" 
        : "border-transparent text-slate-400 hover:text-white hover:bg-white/5"
  );

  const handleNavClick = (view: View) => {
      onNavigate(view);
      onClose(); 
  };

  return (
    <>
        {/* Mobile Backdrop */}
        <div 
            className={clsx(
                "fixed inset-0 bg-black/80 backdrop-blur-sm z-40 transition-opacity md:hidden",
                isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
            )}
            onClick={onClose}
        />

        {/* Sidebar Container */}
        <div className={clsx(
            "fixed inset-y-0 left-0 z-50 w-72 bg-[#121212] text-white transform transition-transform duration-300 ease-in-out md:translate-x-0 md:static md:flex md:flex-col md:h-screen shadow-2xl z-50",
            isOpen ? "translate-x-0" : "-translate-x-full"
        )}>
            {/* Header / Logo */}
            <div className="h-24 flex items-center px-6 border-b border-white/10 bg-[#121212]">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-furlong-red rounded-lg flex items-center justify-center shadow-lg shadow-furlong-red/20">
                         <Truck className="text-white fill-current" size={20} />
                    </div>
                    <div>
                        <h1 className="text-xl font-extrabold tracking-tight brand-font leading-none text-white">FURLONG</h1>
                        <span className="text-[10px] text-furlong-red font-bold uppercase tracking-[0.2em]">Logística</span>
                    </div>
                </div>
                <button 
                    onClick={onClose}
                    className="md:hidden ml-auto p-2 text-slate-400 hover:text-white"
                >
                    <X size={24} />
                </button>
            </div>
          
            {/* Nav Menu */}
            <nav className="flex-1 py-8 space-y-1 overflow-y-auto">
                <div className="px-6 pb-3 text-[11px] font-bold text-slate-500 uppercase tracking-widest">Operaciones</div>
                
                <div onClick={() => handleNavClick('dashboard')} className={navItemClass('dashboard')}>
                    <div className="flex items-center gap-3">
                        <LayoutDashboard size={20} className={currentView === 'dashboard' ? 'text-furlong-red' : 'text-slate-500 group-hover:text-white'} />
                        <span className="tracking-wide">Tablero Principal</span>
                    </div>
                </div>
                
                <div onClick={() => handleNavClick('import')} className={navItemClass('import')}>
                    <div className="flex items-center gap-3">
                        <UploadCloud size={20} className={currentView === 'import' ? 'text-furlong-red' : 'text-slate-500 group-hover:text-white'} />
                        <span className="tracking-wide">Importar Datos</span>
                    </div>
                </div>

                <div onClick={() => handleNavClick('expenses')} className={navItemClass('expenses')}>
                    <div className="flex items-center gap-3">
                        <CreditCard size={20} className={currentView === 'expenses' ? 'text-furlong-red' : 'text-slate-500 group-hover:text-white'} />
                        <span className="tracking-wide">Gastos Tarjetas</span>
                    </div>
                </div>

                <div className="px-6 pt-8 pb-3 text-[11px] font-bold text-slate-500 uppercase tracking-widest">Gestión</div>

                <div onClick={() => handleNavClick('reports')} className={navItemClass('reports')}>
                    <div className="flex items-center gap-3">
                        <FileText size={20} className={currentView === 'reports' ? 'text-furlong-red' : 'text-slate-500 group-hover:text-white'} />
                        <span className="tracking-wide">Reportes</span>
                    </div>
                </div>
                <div onClick={() => handleNavClick('settings')} className={navItemClass('settings')}>
                    <div className="flex items-center gap-3">
                        <Settings size={20} className={currentView === 'settings' ? 'text-furlong-red' : 'text-slate-500 group-hover:text-white'} />
                        <span className="tracking-wide">Configuración</span>
                    </div>
                </div>
            </nav>

            {/* Footer Profile */}
            <div className="p-4 border-t border-white/10 bg-[#0a0a0a]">
                <div className="flex items-center gap-3 group cursor-pointer p-3 rounded-xl hover:bg-white/5 transition-colors">
                    <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center font-bold text-sm text-white group-hover:ring-2 ring-furlong-red transition-all">
                        AD
                    </div>
                    <div className="overflow-hidden flex-1">
                        <p className="text-sm font-bold text-white truncate">Admin User</p>
                        <p className="text-xs text-slate-400 truncate">Gerente Logística</p>
                    </div>
                    <LogOut size={16} className="text-slate-600 group-hover:text-furlong-red transition-colors" />
                </div>
            </div>
        </div>
    </>
  );
};
