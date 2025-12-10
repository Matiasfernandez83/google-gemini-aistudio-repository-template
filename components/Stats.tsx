
import React from 'react';
import { DollarSign, Truck, Users, Activity, ChevronRight } from 'lucide-react';
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
    return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(val);
  };

  const cardClass = "bg-white p-6 rounded-xl shadow-sm border border-slate-100 flex items-center justify-between cursor-pointer hover:shadow-md hover:border-blue-200 transition-all group relative overflow-hidden select-none";
  const clickHint = "absolute right-2 top-2 opacity-0 group-hover:opacity-100 transition-opacity text-slate-300 text-[10px]";

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      
      {/* Monto Total Card */}
      <div 
        className={cardClass} 
        onDoubleClick={() => onCardDoubleClick?.('total')}
        title="Doble click para ver detalle de todos los montos"
      >
        <div className={clickHint}>Doble Click</div>
        <div>
          <p className="text-sm text-slate-500 font-medium">Monto Total</p>
          <p className="text-2xl font-bold text-slate-900">{formatCurrency(totalValue)}</p>
          <p className="text-xs text-slate-400 mt-1">Total facturado</p>
        </div>
        <div className="p-3 bg-green-100 text-green-600 rounded-full group-hover:bg-green-600 group-hover:text-white transition-colors">
          <DollarSign size={24} />
        </div>
      </div>

      {/* Camiones Activos Card */}
      <div 
        className={cardClass} 
        onDoubleClick={() => onCardDoubleClick?.('trucks')}
        title="Doble click para ver detalle de camiones"
      >
        <div className={clickHint}>Doble Click</div>
        <div>
          <p className="text-sm text-slate-500 font-medium">Camiones Activos</p>
          <p className="text-2xl font-bold text-slate-900">{uniqueTrucks}</p>
          <p className="text-xs text-slate-400 mt-1">Patentes únicas detectadas</p>
        </div>
        <div className="p-3 bg-blue-100 text-blue-600 rounded-full group-hover:bg-blue-600 group-hover:text-white transition-colors">
          <Truck size={24} />
        </div>
      </div>

      {/* Dueños Card */}
      <div 
        className={cardClass} 
        onDoubleClick={() => onCardDoubleClick?.('owners')}
        title="Doble click para ver lista de dueños"
      >
        <div className={clickHint}>Doble Click</div>
        <div>
          <p className="text-sm text-slate-500 font-medium">Dueños</p>
          <p className="text-2xl font-bold text-slate-900">{uniqueOwners}</p>
          <p className="text-xs text-slate-400 mt-1">Proveedores distintos</p>
        </div>
        <div className="p-3 bg-purple-100 text-purple-600 rounded-full group-hover:bg-purple-600 group-hover:text-white transition-colors">
          <Users size={24} />
        </div>
      </div>

      {/* Operaciones Card */}
      <div 
        className={cardClass} 
        onDoubleClick={() => onCardDoubleClick?.('ops')}
        title="Doble click para ver todas las operaciones"
      >
        <div className={clickHint}>Doble Click</div>
        <div>
          <p className="text-sm text-slate-500 font-medium">Operaciones</p>
          <p className="text-2xl font-bold text-slate-900">{data.length}</p>
          <p className="text-xs text-slate-400 mt-1">Registros procesados</p>
        </div>
        <div className="p-3 bg-orange-100 text-orange-600 rounded-full group-hover:bg-orange-600 group-hover:text-white transition-colors">
          <Activity size={24} />
        </div>
      </div>
    </div>
  );
};
