
import React from 'react';
import { DollarSign, Truck, Users, Activity, TrendingUp } from 'lucide-react';
import { TruckRecord } from '../types';

interface StatsProps {
  data: TruckRecord[];
  onCardDoubleClick?: (type: 'total' | 'trucks' | 'owners' | 'ops') => void;
}

export const Stats: React.FC<StatsProps> = ({ data, onCardDoubleClick }) => {
  const totalValue = data.reduce((acc, curr) => acc + curr.valor, 0);
  const uniqueTrucks = new Set(data.map(d => d.patente)).size;
  const uniqueOwners = new Set(data.map(d => d.dueno)).size;

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(val);
  };

  const cardBase = "bg-white rounded-xl shadow-polaris hover:shadow-polaris-hover transition-all duration-300 overflow-hidden relative group cursor-pointer border border-slate-200";

  return (
    <div className="w-full grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      
      {/* Monto Total Card */}
      <div className={cardBase} onDoubleClick={() => onCardDoubleClick?.('total')}>
        <div className="h-1.5 w-full bg-green-500 absolute top-0 left-0"></div>
        <div className="p-6">
            <div className="flex justify-between items-start mb-4">
                <div className="p-3 rounded-lg bg-green-50 text-green-600">
                    <DollarSign size={24} />
                </div>
                <span className="text-xs font-bold text-green-600 bg-green-50 px-2 py-1 rounded-full flex items-center gap-1">
                    <TrendingUp size={12}/> Activo
                </span>
            </div>
            <div>
                <p className="text-sm font-semibold text-slate-500 uppercase tracking-wide">Monto Total</p>
                <h3 className="text-2xl font-extrabold text-slate-800 mt-1 brand-font tracking-tight">{formatCurrency(totalValue)}</h3>
            </div>
        </div>
      </div>

      {/* Camiones Activos Card */}
      <div className={cardBase} onDoubleClick={() => onCardDoubleClick?.('trucks')}>
         <div className="h-1.5 w-full bg-furlong-red absolute top-0 left-0"></div>
         <div className="p-6">
            <div className="flex justify-between items-start mb-4">
                <div className="p-3 rounded-lg bg-red-50 text-furlong-red">
                    <Truck size={24} />
                </div>
            </div>
            <div>
                <p className="text-sm font-semibold text-slate-500 uppercase tracking-wide">Flota Activa</p>
                <h3 className="text-2xl font-extrabold text-slate-800 mt-1 brand-font tracking-tight">{uniqueTrucks} <span className="text-sm font-medium text-slate-400">unidades</span></h3>
            </div>
         </div>
      </div>

      {/* Dueños Card */}
      <div className={cardBase} onDoubleClick={() => onCardDoubleClick?.('owners')}>
        <div className="h-1.5 w-full bg-blue-500 absolute top-0 left-0"></div>
        <div className="p-6">
            <div className="flex justify-between items-start mb-4">
                <div className="p-3 rounded-lg bg-blue-50 text-blue-600">
                    <Users size={24} />
                </div>
            </div>
            <div>
                <p className="text-sm font-semibold text-slate-500 uppercase tracking-wide">Proveedores</p>
                <h3 className="text-2xl font-extrabold text-slate-800 mt-1 brand-font tracking-tight">{uniqueOwners} <span className="text-sm font-medium text-slate-400">titulares</span></h3>
            </div>
        </div>
      </div>

      {/* Operaciones Card */}
      <div className={cardBase} onDoubleClick={() => onCardDoubleClick?.('ops')}>
        <div className="h-1.5 w-full bg-purple-500 absolute top-0 left-0"></div>
        <div className="p-6">
            <div className="flex justify-between items-start mb-4">
                <div className="p-3 rounded-lg bg-purple-50 text-purple-600">
                    <Activity size={24} />
                </div>
            </div>
            <div>
                <p className="text-sm font-semibold text-slate-500 uppercase tracking-wide">Operaciones</p>
                <h3 className="text-2xl font-extrabold text-slate-800 mt-1 brand-font tracking-tight">{data.length} <span className="text-sm font-medium text-slate-400">registros</span></h3>
            </div>
        </div>
      </div>
    </div>
  );
};
