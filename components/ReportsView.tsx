
import React, { useEffect, useState } from 'react';
import { Download, FileText, Trash2, Database, FileSpreadsheet, History, CheckSquare, Square, X } from 'lucide-react';
import { TruckRecord, UploadedFile } from '../types';
import { getFiles, deleteBatchFiles } from '../utils/storage';
import { ConfirmModal } from './ConfirmModal';

interface ReportsViewProps {
    data: TruckRecord[];
    onRefreshData?: () => void;
}

export const ReportsView: React.FC<ReportsViewProps> = ({ data, onRefreshData }) => {
    const [storedFiles, setStoredFiles] = useState<UploadedFile[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    
    // Unified delete state for both single and batch deletion
    const [deleteModalOpen, setDeleteModalOpen] = useState(false);
    const [itemsToDelete, setItemsToDelete] = useState<string[]>([]);

    useEffect(() => {
        loadFiles();
    }, []);

    // Watch for external data changes to reload the file list if needed
    useEffect(() => {
        loadFiles();
    }, [data.length]);

    const loadFiles = async () => {
        setLoading(true);
        const files = await getFiles();
        setStoredFiles(files);
        // Clear selection if files are reloaded (e.g. some were deleted elsewhere)
        setSelectedIds([]); 
        setLoading(false);
    };

    const toggleSelectAll = () => {
        if (selectedIds.length === storedFiles.length && storedFiles.length > 0) {
            setSelectedIds([]);
        } else {
            setSelectedIds(storedFiles.map(f => f.id!));
        }
    };

    const toggleSelectRow = (id: string) => {
        if (selectedIds.includes(id)) {
            setSelectedIds(prev => prev.filter(itemId => itemId !== id));
        } else {
            setSelectedIds(prev => [...prev, id]);
        }
    };

    const handleDeleteClick = (ids: string[]) => {
        setItemsToDelete(ids);
        setDeleteModalOpen(true);
    };

    const confirmDelete = async () => {
        if (itemsToDelete.length > 0) {
            await deleteBatchFiles(itemsToDelete);
            
            // Refresh local list
            await loadFiles();
            
            // Trigger global refresh to update stats/charts in App
            if (onRefreshData) {
                onRefreshData();
            }

            // Reset UI states
            setItemsToDelete([]);
            setSelectedIds([]);
            setDeleteModalOpen(false);
        }
    };

    const handleDownloadFile = (file: UploadedFile) => {
        if (!file.content) return;
        
        const link = document.createElement('a');
        let mimeType = file.type;
        
        link.href = `data:${mimeType};base64,${file.content}`;
        link.download = file.name;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const exportFullReport = async () => {
        try {
            const XLSX = await import('xlsx');
            const exportData = data.map(d => ({
                ID: d.id,
                PATENTE: d.patente,
                RESPONSABLE: d.dueno,
                TAG: d.tag,
                EQUIPO: d.equipo,
                VALOR: d.valor,
                CONCEPTO: d.concepto,
                FECHA: d.fecha,
                VERIFICADO: d.isVerified ? 'SI' : 'NO',
                ARCHIVO_ORIGEN: d.sourceFileName
            }));

            const ws = XLSX.utils.json_to_sheet(exportData);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, "Reporte Completo");
            XLSX.writeFile(wb, `ERP_Integral_Completo_${new Date().toISOString().slice(0,10)}.xlsx`);
        } catch (e) {
            alert('Error al generar el reporte');
        }
    };

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div>
                <h2 className="text-2xl font-bold text-slate-800 mb-2">Centro de Reportes</h2>
                <p className="text-slate-500">Descarga información histórica y gestiona tus archivos.</p>
            </div>

            {/* Acciones Rápidas */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <button 
                    onClick={exportFullReport}
                    className="flex flex-col items-center justify-center p-8 bg-green-50 border-2 border-green-200 rounded-xl hover:bg-green-100 hover:border-green-300 transition-all group"
                >
                    <div className="p-4 bg-green-200 text-green-700 rounded-full mb-4 group-hover:scale-110 transition-transform">
                        <FileSpreadsheet size={32} />
                    </div>
                    <span className="font-bold text-green-800 text-lg">Descargar Excel Maestro</span>
                    <span className="text-xs text-green-600 mt-2 text-center">Todos los registros unificados hasta la fecha</span>
                </button>

                <div className="flex flex-col items-center justify-center p-8 bg-blue-50 border-2 border-blue-200 rounded-xl">
                    <div className="p-4 bg-blue-200 text-blue-700 rounded-full mb-4">
                        <Database size={32} />
                    </div>
                    <span className="font-bold text-blue-800 text-lg">{data.length} Registros</span>
                    <span className="text-xs text-blue-600 mt-2 text-center">Almacenados en base de datos local</span>
                </div>
            </div>

            {/* Historial con Checks */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden flex flex-col">
                <div className="p-6 border-b border-slate-100 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                    <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                        <History size={20} className="text-slate-400"/>
                        Historial de Archivos
                    </h3>
                    
                    {selectedIds.length > 0 && (
                        <div className="flex items-center gap-3 animate-in fade-in slide-in-from-right-4">
                            <span className="text-sm font-bold text-slate-600 bg-slate-100 px-3 py-1 rounded-full">
                                {selectedIds.length} seleccionados
                            </span>
                            <button 
                                onClick={() => handleDeleteClick(selectedIds)}
                                className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-bold hover:bg-red-700 transition-colors shadow-sm"
                            >
                                <Trash2 size={16} /> Eliminar Seleccionados
                            </button>
                        </div>
                    )}
                </div>
                
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-slate-50 text-slate-500 text-xs uppercase font-bold">
                            <tr>
                                <th className="px-6 py-4 w-12 text-center">
                                    <button onClick={toggleSelectAll} className="text-slate-400 hover:text-slate-600">
                                        {storedFiles.length > 0 && selectedIds.length === storedFiles.length ? (
                                            <CheckSquare size={20} className="text-blue-600" />
                                        ) : (
                                            <Square size={20} />
                                        )}
                                    </button>
                                </th>
                                <th className="px-6 py-4">Nombre del Archivo</th>
                                <th className="px-6 py-4">Fecha Subida</th>
                                <th className="px-6 py-4">Tipo</th>
                                <th className="px-6 py-4 text-right">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {loading ? (
                                <tr><td colSpan={5} className="p-8 text-center text-slate-400">Cargando historial...</td></tr>
                            ) : storedFiles.length === 0 ? (
                                <tr><td colSpan={5} className="p-8 text-center text-slate-400">No hay archivos guardados en el historial.</td></tr>
                            ) : (
                                storedFiles.map((file) => {
                                    const isSelected = selectedIds.includes(file.id!);
                                    return (
                                        <tr 
                                            key={file.id} 
                                            className={`hover:bg-slate-50 transition-colors cursor-pointer ${isSelected ? 'bg-blue-50/50' : ''}`}
                                            onClick={() => toggleSelectRow(file.id!)}
                                        >
                                            <td className="px-6 py-4 text-center" onClick={(e) => e.stopPropagation()}>
                                                <button onClick={() => toggleSelectRow(file.id!)} className="text-slate-400 hover:text-blue-600">
                                                    {isSelected ? (
                                                        <CheckSquare size={20} className="text-blue-600" />
                                                    ) : (
                                                        <Square size={20} />
                                                    )}
                                                </button>
                                            </td>
                                            <td className="px-6 py-4 font-medium text-slate-700">
                                                <div className="flex items-center gap-2">
                                                    {file.name.endsWith('.pdf') ? (
                                                        <FileText size={16} className="text-red-500" />
                                                    ) : (
                                                        <FileSpreadsheet size={16} className="text-green-600" />
                                                    )}
                                                    {file.name}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-slate-500 text-sm">
                                                {file.timestamp ? new Date(file.timestamp).toLocaleDateString() + ' ' + new Date(file.timestamp).toLocaleTimeString() : '-'}
                                            </td>
                                            <td className="px-6 py-4 text-slate-500 text-xs">
                                                {file.type === 'application/pdf' ? 'DOCUMENTO PDF' : 'HOJA DE CALCULO'}
                                            </td>
                                            <td className="px-6 py-4 text-right" onClick={(e) => e.stopPropagation()}>
                                                <div className="flex items-center justify-end gap-2">
                                                    <button 
                                                        onClick={() => handleDownloadFile(file)}
                                                        className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                                                        title="Descargar archivo original"
                                                    >
                                                        <Download size={16} />
                                                    </button>
                                                    <button 
                                                        onClick={() => handleDeleteClick([file.id!])}
                                                        className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                                                        title="Eliminar este archivo y sus datos"
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

             <ConfirmModal 
                isOpen={deleteModalOpen}
                title={itemsToDelete.length > 1 ? `¿Eliminar ${itemsToDelete.length} archivos?` : "¿Eliminar archivo?"}
                message={itemsToDelete.length > 1 
                    ? "Esta acción eliminará PERMANENTEMENTE los archivos seleccionados y TODOS los datos extraídos (camiones, gastos, montos) asociados a ellos. No se puede deshacer."
                    : "Esta acción eliminará el archivo del historial Y TAMBIÉN borrará todos los registros que fueron extraídos de este archivo. No se puede deshacer."
                }
                confirmText={itemsToDelete.length > 1 ? "Eliminar Selección" : "Eliminar Todo"}
                isDestructive={true}
                onConfirm={confirmDelete}
                onClose={() => { setDeleteModalOpen(false); setItemsToDelete([]); }}
             />
        </div>
    );
};
