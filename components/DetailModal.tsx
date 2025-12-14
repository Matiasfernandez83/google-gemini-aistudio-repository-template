
import React, { useState, useEffect } from 'react';
import { X, CheckCircle, AlertTriangle, Truck, User, Tag, Calendar, FileText, DollarSign, ChevronLeft, ChevronRight, Download, Loader2 } from 'lucide-react';
import { TruckRecord, ModalData, ExpenseRecord } from '../types';

interface DetailModalProps {
  modalData: ModalData;
  onClose: () => void;
}

export const DetailModal: React.FC<DetailModalProps> = ({ modalData, onClose }) => {
  const [currentPage, setCurrentPage] = useState(1);
  const [isExporting, setIsExporting] = useState(false);
  const itemsPerPage = 10;

  // Reset page when modal opens/changes
  useEffect(() => {
    setCurrentPage(1);
  }, [modalData.isOpen, modalData.title]);

  if (!modalData.isOpen) return null;

  // Pagination Logic for List View
  const records = modalData.records || [];
  const totalPages = Math.ceil(records.length / itemsPerPage);
  const paginatedRecords = records.slice(
      (currentPage - 1) * itemsPerPage, 
      currentPage * itemsPerPage
  );

  const isExpense = modalData.dataType === 'expense';

  const handleExportExcel = async () => {
      if (records.length === 0) return;
      setIsExporting(true);

      try {
          const XLSX = await import('xlsx');
          
          let exportData: any[] = [];

          if (isExpense) {
              // Format for Expenses
              exportData = (records as ExpenseRecord[]).map(r => ({
                  FECHA: r.fecha || '',
                  CONCEPTO: r.concepto,
                  CATEGORIA: r.categoria,
                  ARCHIVO_ORIGEN: r.sourceFileName || '',
                  MONTO: r.monto
              }));
          } else {
              // Format for Trucks
              exportData = (records as TruckRecord[]).map(r => ({
                  PATENTE: r.patente,
                  EQUIPO: r.equipo || '',
                  DUEÑO: r.dueno,
                  TAG: r.tag || '',
                  CONCEPTO: r.concepto,
                  FECHA: r.fecha || '',
                  VALOR: r.valor,
                  ESTADO: r.isVerified ? 'VERIFICADO' : 'PENDIENTE'
              }));
          }

          const ws = XLSX.utils.json_to_sheet(exportData);
          const wb = XLSX.utils.book_new();
          
          // Sanitize title for filename
          const safeTitle = modalData.title.replace(/[^a-z0-9]/gi, '_').substring(0, 30);
          XLSX.utils.book_append_sheet(wb, ws, "Detalle");
          
          XLSX.writeFile(wb, `Reporte_${safeTitle}_${new Date().toISOString().slice(0,10)}.xlsx`);

      } catch (error) {
          console.error("Error exporting excel from modal", error);
          alert("Hubo un error al generar el Excel.");
      } finally {
          setIsExporting(false);
      }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-2 md:p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-xl shadow-2xl w-full md:max-w-4xl max-h-[95vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="p-4 md:p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
          <div className="flex-1 mr-4">
            <h3 className="text-lg md:text-xl font-bold text-slate-800 line-clamp-1">{modalData.title}</h3>
            <p className="text-xs md:text-sm text-slate-500">
                {modalData.type === 'list' 
                    ? `Visualizando ${records.length} registros`
                    : 'Detalle completo del registro'
                }
            </p>
          </div>
          
          <div className="flex items-center gap-2">
            {modalData.type === 'list' && records.length > 0 && (
                <button
                    onClick={handleExportExcel}
                    disabled={isExporting}
                    className="flex items-center gap-2 px-3 py-2 bg-green-50 text-green-700 hover:bg-green-100 border border-green-200 rounded-lg text-sm font-bold transition-colors disabled:opacity-50"
                    title="Descargar esta lista en Excel"
                >
                    {isExporting ? <Loader2 size={16} className="animate-spin"/> : <Download size={16} />}
                    <span className="hidden sm:inline">Excel</span>
                </button>
            )}

            <button 
                onClick={onClose}
                className="p-2 bg-white border border-slate-200 rounded-full hover:bg-red-50 hover:text-red-500 transition-colors shadow-sm ml-2 flex-shrink-0"
            >
                <X size={20} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6 bg-slate-50/30">
            {modalData.type === 'detail' && modalData.singleRecord ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-6">
                        <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-sm">
                            <h4 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4">Información Principal</h4>
                            <div className="space-y-4">
                                <div className="flex items-start gap-3">
                                    <div className="p-2 bg-blue-50 text-blue-600 rounded-lg"><Truck size={20}/></div>
                                    <div>
                                        <p className="text-xs text-slate-500">Patente</p>
                                        <p className="text-lg font-bold text-slate-800">{modalData.singleRecord.patente || 'No detectada'}</p>
                                    </div>
                                </div>
                                <div className="flex items-start gap-3">
                                    <div className="p-2 bg-purple-50 text-purple-600 rounded-lg"><User size={20}/></div>
                                    <div>
                                        <p className="text-xs text-slate-500">Responsable / Dueño</p>
                                        <p className="text-lg font-bold text-slate-800 break-words">{modalData.singleRecord.dueno}</p>
                                    </div>
                                </div>
                                <div className="flex items-start gap-3">
                                    <div className="p-2 bg-green-50 text-green-600 rounded-lg"><DollarSign size={20}/></div>
                                    <div>
                                        <p className="text-xs text-slate-500">Valor</p>
                                        <p className="text-2xl font-bold text-slate-800">
                                            {new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(modalData.singleRecord.valor)}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-6">
                         <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-sm h-full">
                            <h4 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4">Detalles Técnicos y Estado</h4>
                            <div className="space-y-4">
                                <div className="flex items-start gap-3">
                                    <div className="p-2 bg-orange-50 text-orange-600 rounded-lg"><Tag size={20}/></div>
                                    <div>
                                        <p className="text-xs text-slate-500">Número de TAG</p>
                                        <p className="font-mono text-slate-700 bg-slate-100 px-2 py-1 rounded inline-block break-all">
                                            {modalData.singleRecord.tag || 'Sin información'}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-start gap-3">
                                    <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg"><Truck size={20}/></div>
                                    <div>
                                        <p className="text-xs text-slate-500">Número de Equipo (Interno)</p>
                                        <p className="text-slate-800 font-medium">
                                            {modalData.singleRecord.equipo || '---'}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3 pt-2">
                                    {modalData.singleRecord.isVerified ? (
                                        <div className="flex items-center gap-2 bg-green-100 text-green-700 px-4 py-2 rounded-lg w-full">
                                            <CheckCircle size={20} className="flex-shrink-0" />
                                            <span className="font-bold text-sm">Verificado en Base de Datos</span>
                                        </div>
                                    ) : (
                                        <div className="flex items-center gap-2 bg-amber-100 text-amber-700 px-4 py-2 rounded-lg w-full">
                                            <AlertTriangle size={20} className="flex-shrink-0" />
                                            <span className="font-bold text-sm">No encontrado en BD</span>
                                        </div>
                                    )}
                                </div>
                                <div className="pt-4 border-t border-slate-100 mt-4">
                                    <p className="text-xs text-slate-500 mb-1">Concepto / Descripción</p>
                                    <p className="text-sm text-slate-700 italic">"{modalData.singleRecord.concepto}"</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="flex flex-col h-full">
                    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden flex-1 overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-slate-50 text-slate-600 text-xs uppercase font-bold sticky top-0">
                                <tr>
                                    {isExpense ? (
                                        <>
                                            <th className="px-4 py-3">Fecha</th>
                                            <th className="px-4 py-3">Concepto</th>
                                            <th className="px-4 py-3">Categoría</th>
                                            <th className="px-4 py-3 hidden md:table-cell">Archivo</th>
                                            <th className="px-4 py-3 text-right">Monto</th>
                                        </>
                                    ) : (
                                        <>
                                            <th className="px-4 py-3">Patente</th>
                                            <th className="px-4 py-3 hidden md:table-cell">Dueño</th>
                                            <th className="px-4 py-3 hidden md:table-cell">Tag</th>
                                            <th className="px-4 py-3 text-right">Valor</th>
                                            <th className="px-4 py-3 text-center">Estado</th>
                                        </>
                                    )}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 text-sm">
                                {paginatedRecords.map((record: any, idx) => (
                                    <tr key={idx} className="hover:bg-slate-50">
                                        {isExpense ? (
                                            <>
                                                <td className="px-4 py-3 font-medium text-slate-900">{record.fecha || '-'}</td>
                                                <td className="px-4 py-3 text-slate-600">{record.concepto}</td>
                                                <td className="px-4 py-3"><span className="px-2 py-0.5 bg-slate-100 rounded text-xs font-bold">{record.categoria}</span></td>
                                                <td className="px-4 py-3 text-slate-500 text-xs hidden md:table-cell truncate max-w-[150px]">{record.sourceFileName}</td>
                                                <td className="px-4 py-3 text-right font-mono font-medium">
                                                    {new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(record.monto)}
                                                </td>
                                            </>
                                        ) : (
                                            <>
                                                <td className="px-4 py-3 font-medium text-slate-900">
                                                    {record.patente}
                                                    <div className="md:hidden text-xs text-slate-500 mt-1">{record.dueno}</div>
                                                </td>
                                                <td className="px-4 py-3 text-slate-600 hidden md:table-cell">{record.dueno}</td>
                                                <td className="px-4 py-3 font-mono text-xs text-slate-500 hidden md:table-cell">{record.tag || '-'}</td>
                                                <td className="px-4 py-3 text-right font-medium">
                                                    {new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(record.valor)}
                                                </td>
                                                <td className="px-4 py-3 text-center">
                                                    {record.isVerified ? (
                                                        <CheckCircle size={16} className="inline text-green-500" />
                                                    ) : (
                                                        <AlertTriangle size={16} className="inline text-amber-500" />
                                                    )}
                                                </td>
                                            </>
                                        )}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    
                    {/* Pagination in Modal */}
                    {totalPages > 1 && (
                         <div className="mt-4 flex items-center justify-between">
                            <span className="text-xs text-slate-500">
                                Pág. {currentPage} de {totalPages}
                            </span>
                            <div className="flex gap-2">
                                <button 
                                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                    disabled={currentPage === 1}
                                    className="p-1 rounded hover:bg-slate-200 disabled:opacity-50"
                                >
                                    <ChevronLeft size={16}/>
                                </button>
                                <button 
                                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                    disabled={currentPage === totalPages}
                                    className="p-1 rounded hover:bg-slate-200 disabled:opacity-50"
                                >
                                    <ChevronRight size={16}/>
                                </button>
                            </div>
                         </div>
                    )}
                </div>
            )}
        </div>
        
        {/* Footer */}
        <div className="p-4 border-t border-slate-100 bg-white flex justify-end">
            <button onClick={onClose} className="px-6 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 font-medium text-sm md:text-base">
                Cerrar
            </button>
        </div>
      </div>
    </div>
  );
};
