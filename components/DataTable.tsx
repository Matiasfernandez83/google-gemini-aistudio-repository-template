
import React, { useState, useMemo, useEffect } from 'react';
import { Search, ChevronLeft, ChevronRight, ExternalLink, FileSpreadsheet, CheckCircle2, AlertCircle, Truck, Tag, Layers, List, Download, CheckSquare, Square } from 'lucide-react';
import { TruckRecord } from '../types';
import clsx from 'clsx';

interface DataTableProps {
  data: TruckRecord[];
  onRowDoubleClick?: (record: TruckRecord) => void;
  onViewFile?: (fileId: string) => void;
  onDelete?: (ids: string[]) => void;
}

export const DataTable: React.FC<DataTableProps> = ({ data, onRowDoubleClick, onViewFile, onDelete }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [isConsolidated, setIsConsolidated] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const itemsPerPage = 10;
  
  const processedData = useMemo(() => {
    let result = [...data];
    
    // Búsqueda inicial
    if (searchTerm) {
      const low = searchTerm.toLowerCase();
      result = result.filter(d => 
          (d.patente || '').toLowerCase().includes(low) || 
          (d.dueno || '').toLowerCase().includes(low) || 
          (d.tag || '').toLowerCase().includes(low)
      );
    }

    // Unificación (Consolidación)
    if (isConsolidated) {
      const groups = result.reduce((acc, curr) => {
        const key = curr.tag || curr.patente || 'SIN_ID';
        if (!acc[key]) {
          acc[key] = { 
            ...curr, 
            valor: 0, 
            pasesCount: 0,
            originalIds: [] as string[]
          };
        }
        acc[key].valor += curr.valor;
        acc[key].pasesCount += 1;
        acc[key].originalIds.push(curr.id);
        return acc;
      }, {} as Record<string, any>);
      
      return Object.values(groups).sort((a, b) => b.valor - a.valor);
    }

    return result;
  }, [data, searchTerm, isConsolidated]);

  const paginatedData = processedData.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
  const totalPages = Math.ceil(processedData.length / itemsPerPage) || 1;

  // Reset page when switching views
  useEffect(() => {
    setCurrentPage(1);
    setSelectedIds([]);
  }, [isConsolidated]);

  const toggleSelectAll = () => {
    const currentIds = paginatedData.map(d => d.id);
    const allSelected = currentIds.every(id => selectedIds.includes(id));
    
    if (allSelected) {
      setSelectedIds(prev => prev.filter(id => !currentIds.includes(id)));
    } else {
      setSelectedIds(prev => Array.from(new Set([...prev, ...currentIds])));
    }
  };

  const toggleSelectRow = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const handlePageJump = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseInt(e.target.value);
    if (!isNaN(val) && val >= 1 && val <= totalPages) {
      setCurrentPage(val);
    }
  };

  const handleExport = async (onlySelected = false) => {
    const dataToExport = onlySelected 
      ? processedData.filter(d => selectedIds.includes(d.id))
      : processedData;

    if (dataToExport.length === 0) return;

    const XLSX = await import('xlsx');
    const ws = XLSX.utils.json_to_sheet(dataToExport.map(d => ({
        PATENTE: d.patente || 'PENDIENTE',
        EQUIPO: d.equipo || '---',
        RESPONSABLE: d.dueno || 'Desconocido',
        TAG: d.tag || '',
        ESTADO: d.isVerified ? 'OK' : 'PEND',
        VALOR: d.valor,
        CONCEPTO: isConsolidated ? `UNIFICADO (${d.pasesCount} PASES)` : (d.concepto || 'PEAJE'),
        FECHA: isConsolidated ? 'RESUMEN' : (d.fecha || ''),
        ARCHIVO: isConsolidated ? 'CONSOLIDADO' : (d.sourceFileName || '')
    })));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Movimientos");
    const suffix = onlySelected ? 'Seleccionados' : (isConsolidated ? 'Consolidado' : 'Detallado');
    XLSX.writeFile(wb, `Furlong_${suffix}_${new Date().toISOString().slice(0,10)}.xlsx`);
  };

  const isAllSelected = paginatedData.length > 0 && paginatedData.every(d => selectedIds.includes(d.id));

  return (
    <div className="bg-white rounded-xl shadow-polaris border border-slate-100 flex flex-col overflow-hidden">
      <div className="p-5 border-b border-slate-50 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
            <h3 className="text-lg font-bold text-slate-800 brand-font">Movimientos</h3>
            <div className="flex bg-slate-100 p-1 rounded-lg border border-slate-200">
                <button 
                    onClick={() => setIsConsolidated(false)}
                    className={clsx(
                        "px-3 py-1 text-[10px] font-bold rounded-md flex items-center gap-1 transition-all",
                        !isConsolidated ? "bg-white text-slate-800 shadow-sm" : "text-slate-400 hover:text-slate-600"
                    )}
                >
                    <List size={14}/> DETALLE
                </button>
                <button 
                    onClick={() => setIsConsolidated(true)}
                    className={clsx(
                        "px-3 py-1 text-[10px] font-bold rounded-md flex items-center gap-1 transition-all",
                        isConsolidated ? "bg-furlong-red text-white shadow-sm" : "text-slate-400 hover:text-slate-600"
                    )}
                >
                    <Layers size={14}/> UNIFICADO
                </button>
            </div>
        </div>

        <div className="flex items-center gap-3">
            {selectedIds.length > 0 && (
              <button 
                onClick={() => handleExport(true)}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-xs font-bold shadow-md hover:bg-blue-700 transition-all animate-in fade-in slide-in-from-right-2"
              >
                <Download size={16} /> Descargar Seleccionados ({selectedIds.length})
              </button>
            )}
            
            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <input 
                    type="text" 
                    placeholder="Buscar..." 
                    className="pl-9 pr-4 py-2 bg-slate-100 border-none rounded-lg text-sm focus:ring-2 focus:ring-furlong-red/20 w-full sm:w-64"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>
            
            <button onClick={() => handleExport(false)} className="flex items-center gap-2 px-4 py-2 bg-green-50 text-green-700 hover:bg-green-100 rounded-lg text-xs font-bold border border-green-200 transition-colors">
                <FileSpreadsheet size={16} /> <span className="hidden sm:inline">Exportar Todo</span>
            </button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50/50 border-b border-slate-100 text-[11px] uppercase font-extrabold text-slate-500 tracking-wider">
              <th className="px-6 py-4 w-12 text-center">
                <button onClick={toggleSelectAll} className="hover:text-furlong-red transition-colors">
                  {isAllSelected ? <CheckSquare size={18} className="text-furlong-red" /> : <Square size={18} />}
                </button>
              </th>
              <th className="px-6 py-4">Patente</th>
              <th className="px-6 py-4">N° Equipo</th>
              <th className="px-6 py-4">Responsable {isConsolidated && '(Unificado)'}</th>
              <th className="px-6 py-4">Tag ID</th>
              <th className="px-6 py-4">{isConsolidated ? 'Cant. Pases' : 'Estado'}</th>
              <th className="px-6 py-4">{isConsolidated ? 'Última Fecha' : 'Fecha'}</th>
              <th className="px-6 py-4 text-right">{isConsolidated ? 'Monto Total' : 'Tarifa'}</th>
              <th className="px-6 py-4 text-center">Acción</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {paginatedData.map((item) => (
              <tr 
                key={item.id} 
                className={clsx(
                  "hover:bg-slate-50/80 transition-colors cursor-pointer group",
                  selectedIds.includes(item.id) && "bg-furlong-red/5"
                )} 
                onClick={() => toggleSelectRow(item.id)}
                onDoubleClick={() => onRowDoubleClick?.(item)}
              >
                <td className="px-6 py-4 text-center">
                   <button onClick={(e) => toggleSelectRow(item.id, e)} className={clsx(selectedIds.includes(item.id) ? "text-furlong-red" : "text-slate-300")}>
                      {selectedIds.includes(item.id) ? <CheckSquare size={18} /> : <Square size={18} />}
                   </button>
                </td>
                <td className="px-6 py-4">
                    <span className="bg-blue-50 text-blue-700 px-2 py-1 rounded text-xs font-bold border border-blue-100 uppercase">{item.patente || 'N/A'}</span>
                </td>
                <td className="px-6 py-4">
                    <div className="flex items-center gap-2 text-slate-700 font-bold text-sm">
                        <Truck size={14} className="text-slate-400" />
                        {item.equipo || '---'}
                    </div>
                </td>
                <td className="px-6 py-4 text-slate-600 font-medium text-sm">{item.dueno}</td>
                <td className="px-6 py-4 text-slate-500 font-mono text-xs flex items-center gap-1">
                    <Tag size={12} className="text-slate-300" />
                    {item.tag || '---'}
                </td>
                <td className="px-6 py-4">
                    {isConsolidated ? (
                        <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded text-[10px] font-black border border-slate-200">
                            {item.pasesCount} MOV.
                        </span>
                    ) : (
                        item.isVerified ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-green-50 text-green-600 text-[10px] font-bold border border-green-100 uppercase">
                                <CheckCircle2 size={10} /> OK
                            </span>
                        ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-50 text-amber-600 text-[10px] font-bold border border-amber-100 uppercase">
                                <AlertCircle size={10} /> PEND
                            </span>
                        )
                    )}
                </td>
                <td className="px-6 py-4 text-slate-500 text-sm whitespace-nowrap">{item.fecha}</td>
                <td className="px-6 py-4 text-right">
                    <span className={clsx("font-mono font-extrabold text-sm", isConsolidated ? "text-furlong-red" : "text-slate-900")}>
                        {new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(item.valor)}
                    </span>
                </td>
                <td className="px-6 py-4 text-center">
                    <button 
                        onClick={(e) => { e.stopPropagation(); if(item.sourceFileId) onViewFile?.(item.sourceFileId); }}
                        className="p-1.5 text-slate-400 hover:text-furlong-red hover:bg-red-50 rounded-lg transition-all"
                    >
                        <ExternalLink size={16} />
                    </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Footer con Salto de Página Puntual */}
      <div className="p-4 bg-slate-50/50 border-t border-slate-100 flex flex-col sm:flex-row justify-between items-center gap-4">
        <span className="text-xs text-slate-500 font-bold uppercase tracking-tight">
          Mostrando {processedData.length > 0 ? (currentPage-1)*itemsPerPage+1 : 0}-{Math.min(currentPage*itemsPerPage, processedData.length)} de {processedData.length}
        </span>
        
        <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Página</span>
                <input 
                  type="number" 
                  min="1" 
                  max={totalPages} 
                  value={currentPage} 
                  onChange={handlePageJump}
                  className="w-12 h-8 text-center border border-slate-200 rounded-md text-xs font-bold focus:ring-1 focus:ring-furlong-red outline-none"
                />
                <span className="text-[10px] font-bold text-slate-400 uppercase">de {totalPages}</span>
            </div>

            <div className="flex gap-1">
                <button 
                  onClick={() => setCurrentPage(p => Math.max(1, p-1))} 
                  disabled={currentPage === 1} 
                  className="p-2 hover:bg-white rounded-lg border border-slate-200 disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-sm"
                >
                  <ChevronLeft size={16}/>
                </button>
                <button 
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p+1))} 
                  disabled={currentPage === totalPages} 
                  className="p-2 hover:bg-white rounded-lg border border-slate-200 disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-sm"
                >
                  <ChevronRight size={16}/>
                </button>
            </div>
        </div>
      </div>
    </div>
  );
};
