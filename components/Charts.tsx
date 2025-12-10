import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart, Pie } from 'recharts';
import { TruckRecord } from '../types';

interface ChartsProps {
  data: TruckRecord[];
  onBarClick?: (ownerName: string) => void;
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

export const Charts: React.FC<ChartsProps> = ({ data, onBarClick }) => {
  // Aggregate data by Owner
  const dataByOwner = data.reduce((acc, curr) => {
    const existing = acc.find(item => item.name === curr.dueno);
    if (existing) {
      existing.value += curr.valor;
      existing.count += 1;
    } else {
      acc.push({ name: curr.dueno, value: curr.valor, count: 1 });
    }
    return acc;
  }, [] as { name: string; value: number; count: number }[]);

  // Sort by value descending and take top 10
  const topOwners = [...dataByOwner].sort((a, b) => b.value - a.value).slice(0, 10);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
        <h3 className="text-lg font-bold text-slate-800 mb-6">Monto por Dueño (Top 10)</h3>
        <p className="text-xs text-slate-400 mb-4 -mt-4">Haz click en una barra para ver detalles</p>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={topOwners}
              layout="vertical"
              margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" horizontal={false} />
              <XAxis type="number" hide />
              <YAxis dataKey="name" type="category" width={100} tick={{fontSize: 12}} />
              <Tooltip 
                formatter={(value: number) => [`$${value.toLocaleString()}`, 'Monto']}
                contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
              />
              <Bar 
                dataKey="value" 
                radius={[0, 4, 4, 0]}
                cursor="pointer"
                onClick={(data) => onBarClick?.(data.name)}
              >
                {topOwners.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
        <h3 className="text-lg font-bold text-slate-800 mb-6">Distribución de Operaciones</h3>
        <p className="text-xs text-slate-400 mb-4 -mt-4">Haz click en una sección para ver detalles</p>
        <div className="h-80 flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={topOwners}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={100}
                fill="#8884d8"
                paddingAngle={5}
                dataKey="count"
                cursor="pointer"
                onClick={(data) => onBarClick?.(data.name)}
                label={({name, percent}) => `${(percent * 100).toFixed(0)}%`}
              >
                {topOwners.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
            </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};