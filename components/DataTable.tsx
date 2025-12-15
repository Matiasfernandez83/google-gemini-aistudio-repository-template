
import React, { useState, useMemo, useEffect } from 'react';
import { Search, Trash2, ChevronLeft, ChevronRight, ExternalLink, FileSpreadsheet, Truck, Tag } from 'lucide-react';
import { TruckRecord } from '../types';

interface DataTableProps {
  data: TruckRecord[];
  onRowDoubleClick?: (record: TruckRecord) => void;
  onViewFile?: (fileId: string) => void;
  onDelete?: (ids: string[]) => void;
}

export const DataTable: React.FC<DataTableProps> = ({ data, onRowDoubleClick, onViewFile, onDelete }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [isExporting, setIsExporting] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  
  useEffect(() => { setSelectedIds([]); setCurrentPage(1); }, [data.length]);

  const filteredData = useMemo(() => {
    let result = data;
    if (searchTerm) {
        const lowerTerm = searchTerm.toLowerCase();
        result = result.filter(item => {
            if (item.searchIndex && item.searchIndex.includes(lowerTerm)) return true;
            return (item.dueno.toLowerCase().includes(lowerTerm) || item.patente.toLowerCase().includes(lowerTerm) || item.tag?.toLowerCase().includes(lowerTerm) || item.equipo?.toLowerCase().includes(lowerTerm));
        });
    }
    return result;
  }, [data, searchTerm]);

  const totalPages = Math.ceil(filteredData.length / itemsPerPage) || 1;
  const paginatedData = filteredData.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
  const startItemIndex = (currentPage - 1) * itemsPerPage + 1;
  const endItemIndex = Math.min(currentPage * itemsPerPage, filteredData.length);

  const toggleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => { e.target.checked ? setSelectedIds(filteredData.map(d => d.id)) : setSelectedIds([]); };
  const toggleSelectRow = (id: string) => { selectedIds.includes(id) ? setSelectedIds(prev => prev.filter(i => i !== id)) : setSelectedIds(prev => [...prev, id]); };

  const handleExport = async () => {
    setIsExporting(true);
    try {
        const XLSX = await import('xlsx');
        const exportData = filteredData.map(d => ({ PATENTE: d.patente, EQUIPO: d.equipo || '', RESPONSABLE: d.dueno, TAG: d.tag || '', ESTADO: d.isVerified ? 'OK' : 'PEND', VALOR: d.valor, CONCEPTO: d.concepto, FECHA: d.fecha || '', ARCHIVO: d.sourceFileName || '' }));
        const ws = XLSX.utils.json_to_sheet(exportData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Datos");
        XLSX.writeFile(wb, "Reporte_Furlong.xlsx");
    } catch (e) { console.error(e); } finally { setIsExporting(false); }
  };

  return (
    <div className="bg-white rounded-xl shadow-polaris border border-slate-200 flex flex-col overflow-hidden w-full max-w-full">
      {/* HEADER TOOLBAR */}
      <div className="p-5 border-b border-slate-200 bg-white flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
            <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2 brand-font">
                Movimientos Registrados
                {filteredData.length !== data.length && <span className="text-[10px] text-white bg-furlong-red px-2 py-0.5 rounded-full font-bold">FILTRADO</span>}
            </h3>
        </div>
        
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            {selectedIds.length > 0 && onDelete && (
                <button onClick={() => onDelete(selectedIds)} className="flex items-center justify-center gap-2 px-4 py-2 bg-red-600 text-white hover:bg-red-700 rounded-lg text-sm font-bold transition-colors shadow-sm animate-in fade-in">
                    <Trash2 size={16} /> Eliminar ({selectedIds.length})
                </button>
            )}

            <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={16} />
                <input type="text" placeholder="Buscar patente, dueño, tag..." className="pl-9 pr-4 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-furlong-red/20 focus:border-furlong-red w-full sm:w-64 transition-all" value={searchTerm} onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }} />
            </div>
            
            <button onClick={handleExport} disabled={isExporting} className="flex items-center justify-center gap-2 px-4 py-2 bg-slate-800 text-white hover:bg-slate-900 rounded-lg text-sm font-bold transition-colors shadow-sm">
                <FileSpreadsheet size={16} /> <span className="hidden sm:inline">Exportar</span>
            </button>
        </div>
      </div>

      {/* TABLE CONTAINER: Ensure max width is respected */}
      <div className="overflow-x-auto w-full">
        <table className="w-full text-left border-collapse min-w-[600px] md:min-w-0">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200 text-xs uppercase font-bold text-slate-500 tracking-wider whitespace-nowrap">
              <th className="px-6 py-4 w-10 text-center"><input type="checkbox" onChange={toggleSelectAll} checked={filteredData.length > 0 && selectedIds.length === filteredData.length} className="rounded border-slate-300 text-furlong-red focus:ring-furlong-red" /></th>
              <th className="px-6 py-4">Patente</th>
              <th className="px-6 py-4">Equipo</th>
              <th className="px-6 py-4 hidden md:table-cell">Responsable</th>
              <th className="px-6 py-4 hidden xl:table-cell">Dispositivo</th>
              <th className="px-6 py-4 text-center">Estado</th>
              <th className="px-6 py-4 hidden lg:table-cell">Fecha</th>
              <th className="px-6 py-4 text-right">Monto</th>
              <th className="px-6 py-4 text-center">Acción</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {paginatedData.length > 0 ? paginatedData.map((item) => (
                <tr key={item.id} className={`hover:bg-slate-50 transition-colors group cursor-pointer ${selectedIds.includes(item.id) ? 'bg-red-50/20' : ''}`} onDoubleClick={() => onRowDoubleClick?.(item)}>
                  <td className="px-6 py-4 text-center" onClick={(e) => e.stopPropagation()}><input type="checkbox" checked={selectedIds.includes(item.id)} onChange={() => toggleSelectRow(item.id)} className="rounded border-slate-300 text-furlong-red focus:ring-furlong-red" /></td>
                  <td className="px-6 py-4 whitespace-nowrap">
                     <div className="flex items-center gap-2">
                         <span className="font-bold text-slate-800 text-sm">{item.patente || '---'}</span>
                     </div>
                     <div className="md:hidden text-xs text-slate-500 mt-1 truncate max-w-[120px]">{item.dueno}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                     {item.equipo ? <span className="px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded text-[10px] font-bold border border-slate-200">{item.equipo}</span> : <span className="text-slate-300">-</span>}
                  </td>
                  <td className="px-6 py-4 text-slate-600 font-medium text-sm hidden md:table-cell truncate max-w-[150px] lg:max-w-[250px]" title={item.dueno}>{item.dueno || '---'}</td>
                  <td className="px-6 py-4 hidden xl:table-cell whitespace-nowrap">
                        {item.tag ? <div className="flex items-center gap-1.5 text-slate-500 text-xs font-mono"><Tag size={12}/> {item.tag}</div> : <span className="text-slate-300">-</span>}
                  </td>
                  <td className="px-6 py-4 text-center whitespace-nowrap">
                      {item.isVerified ? 
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-green-100 text-green-700 uppercase tracking-wide">Verificado</span> : 
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-500 uppercase tracking-wide">Pendiente</span>
                      }
                  </td>
                  <td className="px-6 py-4 hidden lg:table-cell text-xs text-slate-500 font-mono whitespace-nowrap">{item.fecha || '-'}</td>
                  <td className="px-6 py-4 text-right font-bold text-slate-800 text-sm whitespace-nowrap">
                    {new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(item.valor)}
                  </td>
                   <td className="px-6 py-4 text-center">
                    {item.sourceFileId ? (
                        <button onClick={(e) => { e.stopPropagation(); if (onViewFile) onViewFile(item.sourceFileId!); }} className="p-1.5 hover:bg-slate-100 text-slate-400 hover:text-furlong-red rounded transition-colors" title="Ver archivo">
                            <ExternalLink size={16} />
                        </button>
                    ) : '-'}
                  </td>
                </tr>
              )) : (
                <tr><td colSpan={9} className="px-6 py-12 text-center text-slate-400">No hay registros coincidentes.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* FOOTER */}
      <div className="p-4 border-t border-slate-200 bg-slate-50 flex flex-col sm:flex-row justify-between items-center gap-4 text-xs font-medium text-slate-600">
            <div>Mostrando <span className="font-bold text-slate-900">{filteredData.length > 0 ? startItemIndex : 0}-{endItemIndex}</span> de <span className="font-bold text-slate-900">{filteredData.length}</span></div>
            <div className="flex items-center gap-4 flex-wrap justify-end">
                <div className="flex items-center gap-2">
                    <span className="hidden sm:inline">Filas:</span>
                    <select value={itemsPerPage} onChange={(e) => { setItemsPerPage(Number(e.target.value)); setCurrentPage(1); }} className="bg-white border border-slate-300 py-1 px-2 rounded focus:outline-none focus:border-furlong-red cursor-pointer">
                        <option value={10}>10</option>
                        <option value={20}>20</option>
                        <option value={50}>50</option>
                        <option value={100}>100</option>
                    </select>
                </div>
                
                {/* Selector de Página Directo */}
                <div className="flex items-center gap-2">
                     <span className="hidden sm:inline">Ir a:</span>
                     <select 
                        value={currentPage} 
                        onChange={(e) => setCurrentPage(Number(e.target.value))}
                        className="bg-white border border-slate-300 py-1 px-2 rounded focus:outline-none focus:border-furlong-red cursor-pointer w-16"
                        disabled={totalPages <= 1}
                     >
                        {Array.from({ length: totalPages }, (_, i) => i + 1).map((num) => (
                            <option key={num} value={num}>{num}</option>
                        ))}
                     </select>
                </div>

                <div className="flex gap-1">
                    <button onClick={() => setCurrentPage(p => p - 1)} disabled={currentPage === 1} className="p-1.5 bg-white border border-slate-300 rounded hover:text-furlong-red disabled:opacity-50"><ChevronLeft size={16}/></button>
                    <button onClick={() => setCurrentPage(p => p + 1)} disabled={currentPage === totalPages} className="p-1.5 bg-white border border-slate-300 rounded hover:text-furlong-red disabled:opacity-50"><ChevronRight size={16}/></button>
                </div>
            </div>
      </div>
    </div>
  );
};
