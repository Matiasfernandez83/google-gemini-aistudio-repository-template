
import React, { useState, useMemo, useEffect } from 'react';
import { Search, Download, CheckCircle, AlertTriangle, Tag, Truck, ChevronLeft, ChevronRight, ExternalLink, Trash2, ListFilter } from 'lucide-react';
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
  const [itemsPerPage, setItemsPerPage] = useState(10); // Now stateful
  const [isExporting, setIsExporting] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  
  // Reset selection and pagination when data changes
  useEffect(() => {
    setSelectedIds([]);
    setCurrentPage(1);
  }, [data.length]);

  // Client-side Search Logic
  const filteredData = useMemo(() => {
    let result = data;
    if (searchTerm) {
        const lowerTerm = searchTerm.toLowerCase();
        result = result.filter(item => {
            if (item.searchIndex && item.searchIndex.includes(lowerTerm)) return true;
            return (
                item.dueno.toLowerCase().includes(lowerTerm) ||
                item.patente.toLowerCase().includes(lowerTerm) ||
                (item.tag && item.tag.toLowerCase().includes(lowerTerm)) ||
                (item.equipo && item.equipo.toLowerCase().includes(lowerTerm)) ||
                item.concepto.toLowerCase().includes(lowerTerm)
            );
        });
    }
    return result;
  }, [data, searchTerm]);

  // Pagination Logic
  const totalPages = Math.ceil(filteredData.length / itemsPerPage) || 1;
  const paginatedData = filteredData.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const startItemIndex = (currentPage - 1) * itemsPerPage + 1;
  const endItemIndex = Math.min(currentPage * itemsPerPage, filteredData.length);

  const toggleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.checked) {
          setSelectedIds(filteredData.map(d => d.id));
      } else {
          setSelectedIds([]);
      }
  };

  const toggleSelectRow = (id: string) => {
      if (selectedIds.includes(id)) {
          setSelectedIds(prev => prev.filter(i => i !== id));
      } else {
          setSelectedIds(prev => [...prev, id]);
      }
  };

  const handleDeleteSelected = () => {
      if (onDelete && selectedIds.length > 0) {
          onDelete(selectedIds);
      }
  };

  const changePage = (newPage: number) => {
      if (newPage >= 1 && newPage <= totalPages) {
          setCurrentPage(newPage);
      }
  };

  const handleItemsPerPageChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
      setItemsPerPage(Number(e.target.value));
      setCurrentPage(1); // Reset to page 1 when changing density
  };

  const handleExport = async () => {
    setIsExporting(true);
    try {
        const XLSX = await import('xlsx');
        const exportData = filteredData.map(d => ({
            PATENTE: d.patente,
            NUMERO_EQUIPO: d.equipo || '', 
            RESPONSABLE_DE_USUARIO: d.dueno,
            NUMERO_DE_TAG: d.tag || 'No detectado',
            ESTADO: d.isVerified ? 'VERIFICADO' : 'NO ENCONTRADO',
            TARIFA: d.valor, 
            CONCEPTO: d.concepto,
            FECHA: d.fecha || '',
            ARCHIVO_ORIGEN: d.sourceFileName || ''
        }));

        const ws = XLSX.utils.json_to_sheet(exportData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Consolidado");
        XLSX.writeFile(wb, "reporte_filtrado.xlsx");
    } catch (e) {
        console.error("Export failed", e);
    } finally {
        setIsExporting(false);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-100 flex flex-col">
      <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
            <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                Movimientos {filteredData.length !== data.length && <span className="text-xs text-orange-500 bg-orange-50 px-2 py-0.5 rounded">(Filtrados)</span>}
                {selectedIds.length > 0 && (
                    <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                        {selectedIds.length} seleccionados
                    </span>
                )}
            </h3>
        </div>
        
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            {selectedIds.length > 0 && onDelete && (
                <button 
                    onClick={handleDeleteSelected}
                    className="flex items-center justify-center gap-2 px-4 py-2 bg-red-600 text-white hover:bg-red-700 rounded-lg text-sm font-bold transition-colors animate-in fade-in"
                >
                    <Trash2 size={16} />
                    <span className="hidden sm:inline">Eliminar</span>
                </button>
            )}

            <div className="relative w-full sm:w-auto">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={18} />
                <input 
                    type="text" 
                    placeholder="Buscar por tag, dueño..." 
                    className="pl-10 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-full sm:w-64"
                    value={searchTerm}
                    onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                />
            </div>
            <button 
                onClick={handleExport}
                disabled={isExporting}
                className="flex items-center justify-center gap-2 px-4 py-2 bg-green-50 text-green-700 hover:bg-green-100 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
            >
                <Download size={18} />
                <span className="hidden sm:inline">{isExporting ? '...' : 'Exportar Excel'}</span>
            </button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead className="bg-slate-50 text-slate-500 text-xs uppercase font-bold tracking-wider">
            <tr>
              <th className="px-4 py-4 w-10 border-b border-slate-200">
                  <input type="checkbox" onChange={toggleSelectAll} checked={filteredData.length > 0 && selectedIds.length === filteredData.length} />
              </th>
              <th className="px-4 md:px-6 py-4 border-b border-slate-200">Patente</th>
              <th className="px-6 py-4 border-b border-slate-200 hidden lg:table-cell">N° Equipo</th>
              <th className="px-6 py-4 border-b border-slate-200 hidden md:table-cell">Responsable</th>
              <th className="px-6 py-4 border-b border-slate-200 hidden lg:table-cell">Tag ID</th>
              <th className="px-4 md:px-6 py-4 border-b border-slate-200 text-center">Estado</th>
              <th className="px-6 py-4 border-b border-slate-200 hidden xl:table-cell">Fecha</th>
              <th className="px-4 md:px-6 py-4 border-b border-slate-200 text-right">Tarifa</th>
              <th className="px-4 md:px-6 py-4 border-b border-slate-200 text-center">Acción</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {paginatedData.length > 0 ? (
              paginatedData.map((item) => (
                <tr 
                    key={item.id} 
                    className={`hover:bg-blue-50/50 transition-colors group cursor-pointer ${selectedIds.includes(item.id) ? 'bg-blue-50' : ''}`}
                    onDoubleClick={() => onRowDoubleClick?.(item)}
                >
                  <td className="px-4 py-4" onClick={(e) => e.stopPropagation()}>
                       <input type="checkbox" checked={selectedIds.includes(item.id)} onChange={() => toggleSelectRow(item.id)} />
                  </td>
                  <td className="px-4 md:px-6 py-4">
                     <span className="font-mono font-medium text-slate-800 bg-slate-100 px-2 py-1 rounded border border-slate-200">{item.patente || '---'}</span>
                     <div className="md:hidden text-xs text-slate-500 mt-1 truncate max-w-[100px]">{item.dueno}</div>
                  </td>
                  <td className="px-6 py-4 hidden lg:table-cell">
                     {item.equipo ? <div className="flex items-center gap-2 text-slate-700 font-bold"><Truck size={14}/><span>{item.equipo}</span></div> : <span className="text-slate-300">-</span>}
                  </td>
                  <td className="px-6 py-4 text-slate-700 font-medium hidden md:table-cell">{item.dueno || '---'}</td>
                  <td className="px-6 py-4 hidden lg:table-cell">
                        {item.tag ? <div className="flex items-center gap-2 text-slate-600 font-mono text-xs"><Tag size={12}/>{item.tag}</div> : <span className="text-slate-300 italic">Sin TAG</span>}
                  </td>
                  <td className="px-4 md:px-6 py-4 text-center">
                      {item.isVerified ? (
                          <div className="inline-flex items-center gap-1 bg-green-100 text-green-700 px-2 py-1 rounded-full border border-green-200">
                              <CheckCircle size={14} /><span className="text-[10px] font-bold uppercase hidden md:inline">MATCH</span>
                          </div>
                      ) : (
                          <div className="inline-flex items-center gap-1 bg-amber-50 text-amber-600 px-2 py-1 rounded-full border border-amber-200">
                              <AlertTriangle size={14} /><span className="text-[10px] font-bold uppercase hidden md:inline">NO REG.</span>
                          </div>
                      )}
                  </td>
                  <td className="px-6 py-4 hidden xl:table-cell text-sm text-slate-600">
                     {item.fecha || '-'}
                  </td>
                  <td className="px-4 md:px-6 py-4 text-right font-bold text-slate-900">
                    {new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(item.valor)}
                  </td>
                   <td className="px-4 md:px-6 py-4 text-center">
                    {item.sourceFileId ? (
                        <button 
                            onClick={(e) => { e.stopPropagation(); if (onViewFile) onViewFile(item.sourceFileId!); }}
                            className="p-2 hover:bg-blue-50 text-slate-500 hover:text-blue-600 rounded-lg"
                        >
                            <ExternalLink size={16} />
                        </button>
                    ) : '-'}
                  </td>
                </tr>
              ))
            ) : (
                <tr>
                    <td colSpan={9} className="px-6 py-12 text-center text-slate-400">
                        {searchTerm ? "No se encontraron resultados para la búsqueda." : "No hay datos para mostrar."}
                    </td>
                </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* NEW FOOTER DESIGN */}
      <div className="p-4 border-t border-slate-100 bg-slate-50 flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-slate-600">
            {/* Left Side: Summary */}
            <div className="flex items-center gap-2">
                <span className="text-slate-400">Mostrando</span>
                <span className="font-bold text-slate-800">{filteredData.length > 0 ? startItemIndex : 0} - {endItemIndex}</span>
                <span className="text-slate-400">de</span>
                <span className="font-bold text-slate-800">{filteredData.length}</span>
                <span className="text-slate-400 hidden sm:inline">resultados</span>
            </div>
            
            {/* Right Side: Controls */}
            <div className="flex flex-wrap items-center justify-center gap-4 md:gap-6">
                
                {/* Rows Selector */}
                <div className="flex items-center gap-2">
                    <span className="text-slate-500 whitespace-nowrap">Filas por página:</span>
                    <div className="relative">
                        <select 
                            value={itemsPerPage} 
                            onChange={handleItemsPerPageChange}
                            className="appearance-none bg-white border border-slate-200 text-slate-700 py-1.5 pl-3 pr-8 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer font-medium"
                        >
                            <option value={10}>10</option>
                            <option value={20}>20</option>
                            <option value={50}>50</option>
                            <option value={100}>100</option>
                        </select>
                        <ListFilter size={14} className="absolute right-2.5 top-1/2 transform -translate-y-1/2 text-slate-400 pointer-events-none" />
                    </div>
                </div>

                {/* Pagination Controls */}
                <div className="flex items-center gap-3">
                    <span className="text-slate-500 whitespace-nowrap">
                        Página <span className="font-bold text-slate-800">{currentPage}</span> de {totalPages}
                    </span>
                    <div className="flex gap-1">
                        <button 
                            onClick={() => changePage(currentPage - 1)} 
                            disabled={currentPage === 1} 
                            className="p-1.5 bg-white border border-slate-200 rounded-lg hover:bg-slate-100 hover:text-blue-600 disabled:opacity-50 disabled:hover:bg-white disabled:hover:text-slate-400 transition-colors shadow-sm"
                            title="Anterior"
                        >
                            <ChevronLeft size={18} />
                        </button>
                        <button 
                            onClick={() => changePage(currentPage + 1)} 
                            disabled={currentPage === totalPages} 
                            className="p-1.5 bg-white border border-slate-200 rounded-lg hover:bg-slate-100 hover:text-blue-600 disabled:opacity-50 disabled:hover:bg-white disabled:hover:text-slate-400 transition-colors shadow-sm"
                            title="Siguiente"
                        >
                            <ChevronRight size={18} />
                        </button>
                    </div>
                </div>
            </div>
      </div>
    </div>
  );
};
