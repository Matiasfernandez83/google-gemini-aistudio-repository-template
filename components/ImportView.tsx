import React, { useRef } from 'react';
import { UploadCloud, FileText, FileSpreadsheet, X, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';
import { ThemeSettings, ProcessingStatus } from '../types';
import clsx from 'clsx';

interface ImportViewProps {
    files: File[];
    status: ProcessingStatus;
    onFileSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
    onRemoveFile: (index: number) => void;
    onProcess: () => void;
    theme: ThemeSettings;
}

export const ImportView: React.FC<ImportViewProps> = ({ files, status, onFileSelect, onRemoveFile, onProcess, theme }) => {
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Drag and Drop handlers
    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            // Create a synthetic event to reuse onFileSelect
            const event = {
                target: { files: e.dataTransfer.files }
            } as unknown as React.ChangeEvent<HTMLInputElement>;
            onFileSelect(event);
        }
    };

    return (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
            <h3 className={`text-lg font-bold text-slate-800 mb-4 flex items-center gap-2`}>
                <UploadCloud size={20} className={`text-${theme.primaryColor}-500`}/>
                Cargar Nuevos Archivos (ERP)
            </h3>
            
            <div 
                className={`border-2 border-dashed border-slate-300 rounded-lg p-12 flex flex-col items-center justify-center bg-slate-50 hover:bg-${theme.primaryColor}-50 transition-colors cursor-pointer`}
                onClick={() => fileInputRef.current?.click()}
                onDragOver={handleDragOver}
                onDrop={handleDrop}
            >
                <input 
                    type="file" 
                    multiple 
                    ref={fileInputRef} 
                    className="hidden" 
                    accept=".pdf,.xlsx,.xls,.csv"
                    onChange={onFileSelect}
                />
                <div className={`p-4 bg-${theme.primaryColor}-100 text-${theme.primaryColor}-600 rounded-full mb-4`}>
                    <UploadCloud size={32} />
                </div>
                <p className="text-lg text-slate-700 font-medium mb-2">Arrastra archivos o haz clic para subir</p>
                <p className="text-slate-400">Soporta PDF y Excel (Carga Múltiple)</p>
            </div>

            {files.length > 0 && (
                <div className="mt-6">
                    <p className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-3">Cola de procesamiento ({files.length})</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 mb-6 max-h-60 overflow-y-auto pr-2">
                        {files.map((file, idx) => (
                            <div key={idx} className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200 rounded-lg">
                                <div className="flex items-center gap-3 overflow-hidden">
                                    {file.name.endsWith('.pdf') ? (
                                        <FileText className="text-red-500 flex-shrink-0" size={20} />
                                    ) : (
                                        <FileSpreadsheet className="text-green-600 flex-shrink-0" size={20} />
                                    )}
                                    <span className="text-sm font-medium truncate text-slate-700">{file.name}</span>
                                </div>
                                <button 
                                    onClick={() => onRemoveFile(idx)} 
                                    disabled={status.isProcessing}
                                    className="text-slate-400 hover:text-red-500 p-1 disabled:opacity-50"
                                >
                                    <X size={16} />
                                </button>
                            </div>
                        ))}
                    </div>
                    <button 
                        onClick={onProcess}
                        disabled={status.isProcessing}
                        className={clsx(
                            "w-full flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-bold text-white text-lg transition-all shadow-md",
                            status.isProcessing ? "bg-slate-400 cursor-not-allowed" : `bg-${theme.primaryColor}-600 hover:bg-${theme.primaryColor}-700 hover:shadow-${theme.primaryColor}-200`
                        )}
                    >
                        {status.isProcessing ? (
                            <>
                                <Loader2 className="animate-spin" size={20} />
                                <span>Procesando archivo {status.processedCount! + 1} de {status.totalCount}...</span>
                            </>
                        ) : (
                            <>
                                <span>Iniciar Unificación Masiva</span>
                                {theme.processingMode === 'free' && <span className="text-xs bg-white/20 px-2 py-0.5 rounded ml-2 font-normal">Modo Gratuito (Lento)</span>}
                            </>
                        )}
                    </button>
                    
                    {status.isProcessing && (
                        <div className="w-full bg-slate-200 rounded-full h-2.5 mt-4">
                            <div 
                                className={`bg-${theme.primaryColor}-600 h-2.5 rounded-full transition-all duration-300`} 
                                style={{ width: `${(status.processedCount! / status.totalCount!) * 100}%` }}
                            ></div>
                        </div>
                    )}
                </div>
            )}
            {status.error && (
                <div className="mt-4 p-4 bg-red-50 text-red-700 rounded-lg flex items-start gap-2 border border-red-100 animate-in slide-in-from-top-2">
                    <AlertCircle size={20} className="flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                        <p className="font-bold text-sm">Ocurrieron errores:</p>
                        <p className="text-sm break-all">{status.error}</p>
                    </div>
                </div>
            )}
            {status.success && !status.error && (
                <div className="mt-4 p-4 bg-green-50 text-green-700 rounded-lg flex items-center gap-2 border border-green-100">
                    <CheckCircle2 size={20} />
                    <p>Proceso completado exitosamente.</p>
                </div>
            )}
        </div>
    );
};