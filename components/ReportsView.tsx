
import React, { useEffect, useState } from 'react';
import { Download, FileText, Trash2, Database, FileSpreadsheet, History } from 'lucide-react';
import { TruckRecord, UploadedFile } from '../types';
import { getFiles, deleteFile, deleteRecordsByFileId } from '../utils/storage';
import { ConfirmModal } from './ConfirmModal';

interface ReportsViewProps {
    data: TruckRecord[];
    onRefreshData?: () => void;
}

export const ReportsView: React.FC<ReportsViewProps> = ({ data, onRefreshData }) => {
    const [storedFiles, setStoredFiles] = useState<UploadedFile[]>([]);
    const [loading, setLoading] = useState(true);
    const [deleteConfirm, setDeleteConfirm] = useState<{isOpen: boolean, fileId: string | null}>({
        isOpen: false,
        fileId: null
    });

    useEffect(() => {
        loadFiles();
    }, []);

    // Watch for external data changes to reload the file list if needed
    useEffect(() => {
        loadFiles();
    }, [data.length]);

    const loadFiles = async () => {
        const files = await getFiles();
        setStoredFiles(files);
        setLoading(false);
    };

    const handleDeleteFile = async () => {
        if (deleteConfirm.fileId) {
            // 1. Delete associated records (TruckRecords)
            await deleteRecordsByFileId(deleteConfirm.fileId);
            // 2. Delete the actual file
            await deleteFile(deleteConfirm.fileId);
            
            // 3. Refresh local list
            await loadFiles();
            
            // 4. Trigger global refresh to update stats/charts in App
            if (onRefreshData) {
                onRefreshData();
            }
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
                VERIFICADO: d.isVerified ? 'SI' : 'NO'
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

            {/* Historial */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
                <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                    <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                        <History size={20} className="text-slate-400"/>
                        Historial de Archivos Originales (PDFs/Excel)
                    </h3>
                    <button 
                        onClick={() => { loadFiles(); if(onRefreshData) onRefreshData(); }} 
                        className="text-sm text-blue-600 hover:underline"
                    >
                        Actualizar lista
                    </button>
                </div>
                
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-slate-50 text-slate-500 text-xs uppercase font-bold">
                            <tr>
                                <th className="px-6 py-4">Nombre del Archivo</th>
                                <th className="px-6 py-4">Fecha Subida</th>
                                <th className="px-6 py-4">Tipo</th>
                                <th className="px-6 py-4 text-right">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {loading ? (
                                <tr><td colSpan={4} className="p-8 text-center text-slate-400">Cargando historial...</td></tr>
                            ) : storedFiles.length === 0 ? (
                                <tr><td colSpan={4} className="p-8 text-center text-slate-400">No hay archivos guardados en el historial.</td></tr>
                            ) : (
                                storedFiles.map((file) => (
                                    <tr key={file.id} className="hover:bg-slate-50">
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
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <button 
                                                    onClick={() => handleDownloadFile(file)}
                                                    className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                                                    title="Descargar archivo original"
                                                >
                                                    <Download size={16} />
                                                </button>
                                                <button 
                                                    onClick={() => setDeleteConfirm({ isOpen: true, fileId: file.id! })}
                                                    className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                                                    title="Eliminar del historial y sus datos"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

             <ConfirmModal 
                isOpen={deleteConfirm.isOpen}
                title="¿Eliminar archivo y datos?"
                message="Esta acción eliminará el archivo del historial Y TAMBIÉN borrará todos los registros (montos/patentes) que fueron extraídos de este archivo."
                confirmText="Eliminar Todo"
                isDestructive={true}
                onConfirm={handleDeleteFile}
                onClose={() => setDeleteConfirm({ isOpen: false, fileId: null })}
             />
        </div>
    );
};
