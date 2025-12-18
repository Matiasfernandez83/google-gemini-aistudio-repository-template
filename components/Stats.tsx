
import React from 'react';
import { DollarSign, Truck, Users, Activity, TrendingUp } from 'lucide-react';
import { TruckRecord } from '../types';

interface StatsProps {
  data: TruckRecord[];
  onCardClick?: (type: 'total' | 'trucks' | 'owners' | 'ops') => void;
}

export const Stats: React.FC<StatsProps> = ({ data, onCardClick }) => {
  const totalValue = data.reduce((acc, curr) => acc + curr.valor, 0);
  const uniqueTrucks = new Set(data.map(d => d.patente).filter(Boolean)).size;
  const uniqueOwners = new Set(data.map(d => d.dueno).filter(Boolean)).size;

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(val);
  };

  const Card = ({ title, value, subtext, icon: Icon, colorClass, onClick, type }: any) => (
    <div 
        className="bg-white rounded-xl shadow-polaris p-6 flex justify-between items-center border border-slate-100 hover:shadow-md transition-shadow cursor-pointer group"
        onClick={() => onClick?.(type)}
    >
        <div>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">{title}</p>
            <h3 className="text-2xl font-extrabold text-slate-800 brand-font tracking-tight">{value}</h3>
            <p className="text-[10px] text-slate-400 mt-1">{subtext}</p>
        </div>
        <div className={`p-3 rounded-full ${colorClass} bg-opacity-10 group-hover:scale-110 transition-transform`}>
            <Icon size={24} className={colorClass.replace('bg-', 'text-')} />
        </div>
    </div>
  );

  return (
    <div className="w-full grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      <Card 
        title="Monto Total" 
        value={formatCurrency(totalValue)} 
        subtext="Total facturado" 
        icon={DollarSign} 
        colorClass="bg-green-500"
        type="total"
        onClick={onCardClick}
      />
      <Card 
        title="Camiones Activos" 
        value={uniqueTrucks} 
        subtext="Patentes únicas detectadas" 
        icon={Truck} 
        colorClass="bg-blue-500"
        type="trucks"
        onClick={onCardClick}
      />
      <Card 
        title="Dueños" 
        value={uniqueOwners} 
        subtext="Proveedores distintos" 
        icon={Users} 
        colorClass="bg-purple-500"
        type="owners"
        onClick={onCardClick}
      />
      <Card 
        title="Operaciones" 
        value={data.length} 
        subtext="Registros procesados" 
        icon={Activity} 
        colorClass="bg-orange-500"
        type="ops"
        onClick={onCardClick}
      />
    </div>
  );
};
