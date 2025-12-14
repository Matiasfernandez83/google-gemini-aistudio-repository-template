
import React, { useRef, useState } from 'react';
import { UploadCloud, FileText, FileSpreadsheet, X, Loader2, AlertCircle, CheckCircle2, Database, Clock } from 'lucide-react';
import { ThemeSettings, ProcessingStatus, FleetRecord } from '../types';
import clsx from 'clsx';

interface ImportViewProps {
    files: File[];
    status: ProcessingStatus;
    onFileSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
    onRemoveFile: (index: number) => void;
    onProcess: () => void;
    theme: ThemeSettings;
    // New props for Fleet DB
    fleetDbCount: number;
    onDbUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export const ImportView: React.FC<ImportViewProps> = ({ 
    files, 
    status, 
    onFileSelect, 
    onRemoveFile, 
    onProcess, 
    theme,
    fleetDbCount,
    onDbUpload
}) => {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const dbInputRef = useRef<HTMLInputElement>(null);
    const [isReading, setIsReading] = useState(false);

    // Wrapper to handle reading state
    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            setIsReading(true);
            // Simulate a small delay for UI feedback or wait for file reading logic if it was async in parent
            await new Promise(resolve => setTimeout(resolve, 600)); 
            onFileSelect(e);
            setIsReading(false);
        }
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
    };

    const handleDrop = async (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            setIsReading(true);
            await new Promise(resolve => setTimeout(resolve, 600));
            const event = {
                target: { files: e.dataTransfer.files }
            } as unknown as React.ChangeEvent<HTMLInputElement>;
            onFileSelect(event);
            setIsReading(false);
        }
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            
            {/* LEFT COLUMN: DAILY FILES */}
            <div className="lg:col-span-2 bg-white p-6 rounded-xl shadow-sm border border-slate-100">
                <h3 className={`text-lg font-bold text-slate-800 mb-4 flex items-center gap-2`}>
                    <UploadCloud size={20} className={`text-${theme.primaryColor}-500`}/>
                    Carga de Documentos (PDF / Excel)
                </h3>
                
                <div 
                    className={`relative border-2 border-dashed border-slate-300 rounded-xl p-10 flex flex-col items-center justify-center bg-slate-50 hover:bg-${theme.primaryColor}-50 transition-colors cursor-pointer min-h-[250px]`}
                    onClick={() => !isReading && !status.isProcessing && fileInputRef.current?.click()}
                    onDragOver={handleDragOver}
                    onDrop={handleDrop}
                >
                    <input 
                        type="file" 
                        multiple 
                        ref={fileInputRef} 
                        className="hidden" 
                        accept=".pdf,.xlsx,.xls,.csv"
                        onChange={handleFileChange}
                    />

                    {isReading ? (
                        <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/80 backdrop-blur-sm rounded-xl z-10">
                            <Clock size={48} className={`text-${theme.primaryColor}-500 animate-pulse mb-4`} />
                            <p className="text-lg font-bold text-slate-700">Leyendo archivos...</p>
                            <p className="text-sm text-slate-500">Por favor espere un momento</p>
                        </div>
                    ) : (
                        <>
                            <div className={`p-4 bg-${theme.primaryColor}-100 text-${theme.primaryColor}-600 rounded-full mb-4 group-hover:scale-110 transition-transform`}>
                                <UploadCloud size={32} />
                            </div>
                            <p className="text-lg text-slate-700 font-medium mb-2 text-center">
                                Arrastra tus archivos aquí<br/>o haz clic para explorar
                            </p>
                            <p className="text-slate-400 text-sm">Soporta Resúmenes Bancarios, Facturas y Planillas</p>
                        </>
                    )}
                </div>

                {files.length > 0 && (
                    <div className="mt-6 border-t border-slate-100 pt-6">
                        <p className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-3">
                            Archivos listos para procesar ({files.length})
                        </p>
                        <div className="grid grid-cols-1 gap-2 mb-6 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
                            {files.map((file, idx) => (
                                <div key={idx} className="flex items-center justify-between p-3 bg-white border border-slate-200 rounded-lg shadow-sm">
                                    <div className="flex items-center gap-3 overflow-hidden">
                                        {file.name.endsWith('.pdf') ? (
                                            <FileText className="text-red-500 flex-shrink-0" size={20} />
                                        ) : (
                                            <FileSpreadsheet className="text-green-600 flex-shrink-0" size={20} />
                                        )}
                                        <div className="flex flex-col">
                                            <span className="text-sm font-medium truncate text-slate-700">{file.name}</span>
                                            <span className="text-[10px] text-slate-400">{(file.size / 1024).toFixed(1)} KB</span>
                                        </div>
                                    </div>
                                    <button 
                                        onClick={() => onRemoveFile(idx)} 
                                        disabled={status.isProcessing}
                                        className="text-slate-400 hover:text-red-500 p-2 rounded-full hover:bg-slate-50 transition-colors disabled:opacity-50"
                                    >
                                        <X size={16} />
                                    </button>
                                </div>
                            ))}
                        </div>
                        
                        <button 
                            onClick={onProcess}
                            disabled={status.isProcessing || isReading}
                            className={clsx(
                                "w-full flex items-center justify-center gap-3 px-6 py-4 rounded-xl font-bold text-white text-lg transition-all shadow-md",
                                (status.isProcessing || isReading) ? "bg-slate-400 cursor-not-allowed" : `bg-${theme.primaryColor}-600 hover:bg-${theme.primaryColor}-700 hover:shadow-${theme.primaryColor}-200`
                            )}
                        >
                            {status.isProcessing ? (
                                <>
                                    <Loader2 className="animate-spin" size={24} />
                                    <span>Procesando archivo {status.processedCount! + 1} de {status.totalCount}...</span>
                                </>
                            ) : (
                                <>
                                    <span>Iniciar Procesamiento Inteligente</span>
                                    {theme.processingMode === 'free' && <span className="text-xs bg-white/20 px-2 py-0.5 rounded font-normal">Modo Gratuito</span>}
                                </>
                            )}
                        </button>
                        
                        {status.isProcessing && (
                            <div className="w-full bg-slate-100 rounded-full h-2.5 mt-4 overflow-hidden">
                                <div 
                                    className={`bg-${theme.primaryColor}-600 h-2.5 rounded-full transition-all duration-300 relative`} 
                                    style={{ width: `${(status.processedCount! / status.totalCount!) * 100}%` }}
                                >
                                    <div className="absolute inset-0 bg-white/30 animate-pulse w-full h-full"></div>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {status.error && (
                    <div className="mt-4 p-4 bg-red-50 text-red-700 rounded-xl flex items-start gap-3 border border-red-100 animate-in slide-in-from-top-2">
                        <AlertCircle size={20} className="flex-shrink-0 mt-0.5" />
                        <div className="flex-1">
                            <p className="font-bold text-sm">Se encontraron errores durante el proceso:</p>
                            <p className="text-sm mt-1 opacity-90 break-all">{status.error}</p>
                        </div>
                    </div>
                )}

                {status.success && !status.error && (
                    <div className="mt-4 p-4 bg-green-50 text-green-700 rounded-xl flex items-center gap-3 border border-green-100 animate-in zoom-in">
                        <div className="p-2 bg-green-100 rounded-full"><CheckCircle2 size={20} /></div>
                        <div>
                            <p className="font-bold">¡Proceso completado!</p>
                            <p className="text-sm opacity-90">Los datos han sido unificados y guardados.</p>
                        </div>
                    </div>
                )}
            </div>

            {/* RIGHT COLUMN: MASTER DB */}
            <div className="lg:col-span-1 space-y-6">
                <div className="bg-slate-800 text-white p-6 rounded-xl shadow-md border border-slate-700 relative overflow-hidden group">
                    <div className="absolute -right-4 -top-4 opacity-10 group-hover:opacity-20 transition-opacity">
                        <Database size={120} />
                    </div>
                    
                    <h3 className="text-lg font-bold mb-2 flex items-center gap-2 relative z-10">
                        <Database size={20} className="text-green-400"/>
                        Base de Datos Maestra
                    </h3>
                    <p className="text-slate-300 text-sm mb-6 relative z-10">
                        Carga aquí tu archivo Excel maestro con la relación Patente - Dueño - TAG para mejorar la identificación.
                    </p>

                    <div className="bg-slate-700/50 rounded-lg p-4 mb-4 border border-slate-600 relative z-10">
                        <div className="flex justify-between items-center mb-1">
                            <span className="text-xs font-bold text-slate-400 uppercase">Estado Actual</span>
                            <span className={`text-xs font-bold px-2 py-0.5 rounded ${fleetDbCount > 0 ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                                {fleetDbCount > 0 ? 'ACTIVA' : 'VACÍA'}
                            </span>
                        </div>
                        <p className="text-2xl font-bold text-white">{fleetDbCount}</p>
                        <p className="text-xs text-slate-400">Camiones registrados</p>
                    </div>

                    <button 
                        onClick={() => dbInputRef.current?.click()}
                        className="w-full py-3 bg-white text-slate-900 rounded-lg font-bold hover:bg-slate-100 transition-colors flex items-center justify-center gap-2 relative z-10"
                    >
                        <FileSpreadsheet size={18} /> Actualizar Base
                    </button>
                    <input type="file" ref={dbInputRef} className="hidden" accept=".xlsx,.xls,.csv" onChange={onDbUpload} />
                </div>

                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
                    <h4 className="font-bold text-slate-700 mb-2">Instrucciones</h4>
                    <ul className="text-sm text-slate-500 space-y-2 list-disc pl-4">
                        <li>El Excel debe contener columnas como: <b>Patente, Dueño, TAG, Equipo</b>.</li>
                        <li>El sistema usa "Patente" o "TAG" para cruzar información.</li>
                        <li>Al subir archivos diarios, el sistema consultará esta base automáticamente.</li>
                    </ul>
                </div>
            </div>
        </div>
    );
};
