
import React, { useRef, useState } from 'react';
import { UploadCloud, FileText, FileSpreadsheet, X, Loader2, AlertCircle, CheckCircle2, Database, Clock, ArrowRight, Zap, Coffee } from 'lucide-react';
import { ThemeSettings, ProcessingStatus } from '../types';
import clsx from 'clsx';

interface ImportViewProps {
    files: File[];
    status: ProcessingStatus;
    onFileSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
    onRemoveFile: (index: number) => void;
    onProcess: () => void;
    theme: ThemeSettings;
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

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            setIsReading(true);
            await new Promise(resolve => setTimeout(resolve, 600)); 
            onFileSelect(e);
            setIsReading(false);
        }
    };

    const handleDrop = async (e: React.DragEvent) => {
        e.preventDefault(); e.stopPropagation();
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            setIsReading(true);
            await new Promise(resolve => setTimeout(resolve, 600));
            const event = { target: { files: e.dataTransfer.files } } as unknown as React.ChangeEvent<HTMLInputElement>;
            onFileSelect(event);
            setIsReading(false);
        }
    };

    const isFastMode = theme.processingMode === 'fast';

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            
            {/* LEFT COLUMN: UPLOAD ZONE */}
            <div className="lg:col-span-2 bg-white rounded-xl shadow-polaris border border-slate-200 overflow-hidden">
                <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
                    <div>
                        <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                            <UploadCloud size={20} className="text-furlong-red"/>
                            Carga de Documentación
                        </h3>
                        <p className="text-sm text-slate-500 mt-1">Sube PDFs de resumen o planillas Excel de control.</p>
                    </div>
                    {/* Visual Indicator for grouped invoices */}
                    <div className="hidden md:flex items-center gap-3">
                        {isFastMode ? (
                             <div className="flex items-center gap-1.5 px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-[10px] font-bold border border-blue-100 uppercase tracking-wide">
                                <Zap size={12} className="fill-current"/> Modo Turbo Activo
                            </div>
                        ) : (
                            <div className="flex items-center gap-1.5 px-3 py-1 bg-slate-100 text-slate-500 rounded-full text-[10px] font-bold border border-slate-200 uppercase tracking-wide">
                                <Coffee size={12} /> Modo Seguro (Gratis)
                            </div>
                        )}
                    </div>
                </div>
                
                <div className="p-6">
                    <div 
                        className="relative border-2 border-dashed border-slate-300 rounded-xl p-10 flex flex-col items-center justify-center bg-slate-50 hover:bg-red-50 hover:border-furlong-red/30 transition-all cursor-pointer min-h-[280px] group"
                        onClick={() => !isReading && !status.isProcessing && fileInputRef.current?.click()}
                        onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
                        onDrop={handleDrop}
                    >
                        <input type="file" multiple ref={fileInputRef} className="hidden" accept=".pdf,.xlsx,.xls,.csv" onChange={handleFileChange} />

                        {isReading ? (
                            <div className="flex flex-col items-center animate-pulse">
                                <Clock size={48} className="text-furlong-red mb-4" />
                                <p className="font-bold text-slate-700">Analizando archivos...</p>
                            </div>
                        ) : (
                            <>
                                <div className="p-5 bg-white rounded-full shadow-sm mb-4 group-hover:scale-110 transition-transform border border-slate-100">
                                    <UploadCloud size={32} className="text-furlong-red" />
                                </div>
                                <p className="text-lg text-slate-800 font-bold mb-1">Haz clic o arrastra archivos aquí</p>
                                <p className="text-slate-500 text-sm text-center max-w-sm">
                                    Soporta procesamiento inteligente de PDFs bancarios y planillas de control logístico.
                                </p>
                            </>
                        )}
                    </div>

                    {files.length > 0 && (
                        <div className="mt-8">
                            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Cola de Procesamiento ({files.length})</h4>
                            <div className="space-y-2 mb-6 max-h-60 overflow-y-auto pr-2">
                                {files.map((file, idx) => (
                                    <div key={idx} className="flex items-center justify-between p-3 bg-white border border-slate-200 rounded-lg shadow-sm hover:border-slate-300 transition-colors">
                                        <div className="flex items-center gap-3 overflow-hidden">
                                            {file.name.endsWith('.pdf') ? (
                                                <FileText className="text-red-500 flex-shrink-0" size={20} />
                                            ) : (
                                                <FileSpreadsheet className="text-green-600 flex-shrink-0" size={20} />
                                            )}
                                            <span className="text-sm font-medium text-slate-700 truncate">{file.name}</span>
                                        </div>
                                        <button onClick={() => onRemoveFile(idx)} disabled={status.isProcessing} className="text-slate-400 hover:text-red-500 p-1.5 hover:bg-slate-100 rounded-md transition-colors">
                                            <X size={16} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                            
                            <button 
                                onClick={onProcess}
                                disabled={status.isProcessing || isReading}
                                className={clsx(
                                    "w-full flex items-center justify-center gap-2 px-6 py-4 rounded-lg font-bold text-white text-lg transition-all shadow-md",
                                    (status.isProcessing || isReading) ? "bg-slate-400 cursor-not-allowed" : "bg-furlong-red hover:bg-red-700 hover:shadow-lg"
                                )}
                            >
                                {status.isProcessing ? (
                                    <> 
                                        <Loader2 className="animate-spin" size={22} /> 
                                        <div className="flex flex-col text-left leading-none ml-2">
                                            <span>Procesando {status.processedCount}/{status.totalCount}</span>
                                            <span className="text-[10px] opacity-80 font-normal uppercase mt-1">
                                                {isFastMode ? '⚡ Modo Turbo Activado' : '☕ Modo Seguro (Lento)'}
                                            </span>
                                        </div>
                                    </>
                                ) : (
                                    <> <span>Iniciar Procesamiento</span> <ArrowRight size={20} /> </>
                                )}
                            </button>
                            
                            {status.isProcessing && (
                                <div className="w-full bg-slate-100 rounded-full h-1.5 mt-4 overflow-hidden">
                                    <div className="bg-furlong-red h-full transition-all duration-300" style={{ width: `${(status.processedCount! / status.totalCount!) * 100}%` }}></div>
                                </div>
                            )}
                        </div>
                    )}

                    {status.error && (
                        <div className="mt-6 p-4 bg-red-50 border border-red-100 rounded-lg flex gap-3 text-red-700 text-sm">
                            <AlertCircle size={18} className="flex-shrink-0 mt-0.5" />
                            <div><span className="font-bold">Error:</span> {status.error}</div>
                        </div>
                    )}
                     {status.success && !status.error && (
                        <div className="mt-6 p-4 bg-green-50 border border-green-100 rounded-lg flex gap-3 text-green-700 text-sm items-center">
                            <CheckCircle2 size={18} />
                            <span className="font-bold">Procesamiento completado con éxito.</span>
                        </div>
                    )}
                </div>
            </div>

            {/* RIGHT COLUMN: MASTER DB INFO */}
            <div className="lg:col-span-1 space-y-6">
                <div className="bg-[#1F2937] text-white p-6 rounded-xl shadow-lg border border-slate-700 relative overflow-hidden group">
                    <div className="absolute -right-6 -top-6 opacity-10 group-hover:opacity-20 transition-opacity">
                        <Database size={140} />
                    </div>
                    
                    <h3 className="text-lg font-bold mb-4 flex items-center gap-2 relative z-10">
                        <Database size={20} className="text-green-400"/>
                        Base Maestra
                    </h3>

                    <div className="bg-white/10 rounded-lg p-4 mb-6 border border-white/5 relative z-10 backdrop-blur-sm">
                        <div className="flex justify-between items-center mb-1">
                            <span className="text-[10px] font-bold text-slate-300 uppercase tracking-wider">Registros</span>
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${fleetDbCount > 0 ? 'bg-green-500 text-white' : 'bg-red-500 text-white'}`}>
                                {fleetDbCount > 0 ? 'ONLINE' : 'OFFLINE'}
                            </span>
                        </div>
                        <p className="text-3xl font-bold text-white tracking-tight">{fleetDbCount}</p>
                        <p className="text-xs text-slate-400 mt-1">Camiones identificados</p>
                    </div>

                    <button 
                        onClick={() => dbInputRef.current?.click()}
                        className="w-full py-3 bg-white text-[#1F2937] rounded-lg font-bold hover:bg-slate-100 transition-colors flex items-center justify-center gap-2 text-sm relative z-10"
                    >
                        <FileSpreadsheet size={16} /> Actualizar Base
                    </button>
                    <input type="file" ref={dbInputRef} className="hidden" accept=".xlsx,.xls,.csv" onChange={onDbUpload} />
                </div>

                <div className="bg-white p-6 rounded-xl shadow-polaris border border-slate-200">
                    <h4 className="font-bold text-slate-800 mb-3 text-sm">Guía Rápida</h4>
                    <ul className="text-xs text-slate-500 space-y-3">
                        <li className="flex gap-2">
                            <div className="w-1.5 h-1.5 bg-furlong-red rounded-full mt-1.5 flex-shrink-0"></div>
                            <span>Sube archivos <b>PDF</b> o <b>Excel</b> para extraer datos automáticamente.</span>
                        </li>
                        <li className="flex gap-2">
                            <div className="w-1.5 h-1.5 bg-furlong-red rounded-full mt-1.5 flex-shrink-0"></div>
                            <span>La IA identificará patentes, fechas y montos.</span>
                        </li>
                        <li className="flex gap-2">
                            <div className="w-1.5 h-1.5 bg-furlong-red rounded-full mt-1.5 flex-shrink-0"></div>
                            <span>Mantén la <b>Base Maestra</b> actualizada para mejorar el cruce de datos.</span>
                        </li>
                    </ul>
                </div>
            </div>
        </div>
    );
};
