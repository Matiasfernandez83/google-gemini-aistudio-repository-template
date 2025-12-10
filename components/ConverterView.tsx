import React, { useRef } from 'react';
import { ArrowRightLeft, FileJson, FileText, FileSpreadsheet, Loader2, Download } from 'lucide-react';
import { ThemeSettings } from '../types';
import clsx from 'clsx';

interface ConverterViewProps {
    convertFile: File | null;
    isConverting: boolean;
    onFileSelect: (file: File) => void;
    onConvert: () => void;
    onClearFile: () => void;
    theme: ThemeSettings;
}

export const ConverterView: React.FC<ConverterViewProps> = ({ convertFile, isConverting, onFileSelect, onConvert, onClearFile, theme }) => {
    const convertInputRef = useRef<HTMLInputElement>(null);

    return (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
            <h3 className={`text-lg font-bold text-slate-800 mb-4 flex items-center gap-2`}>
                <ArrowRightLeft size={20} className={`text-${theme.primaryColor}-500`}/>
                Transformar Archivos
            </h3>
            <p className="text-sm text-slate-500 mb-6">
                Convierte PDFs a Excel (extracción inteligente de tablas) o Excel a PDF (generación de documentos).
                <br/><span className="text-xs text-orange-500">Nota: La conversión de PDF a Excel usa IA y puede tomar unos segundos.</span>
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* INPUT AREA */}
                <div>
                    <div className={`border-2 border-dashed border-slate-300 rounded-lg p-8 flex flex-col items-center justify-center bg-slate-50 hover:bg-${theme.primaryColor}-50 transition-colors cursor-pointer h-64`}
                        onClick={() => convertInputRef.current?.click()}>
                        <input 
                            type="file" 
                            ref={convertInputRef} 
                            className="hidden" 
                            accept=".pdf,.xlsx,.xls,.csv"
                            onChange={(e) => {
                                if (e.target.files && e.target.files[0]) onFileSelect(e.target.files[0]);
                            }}
                        />
                        
                        {!convertFile ? (
                            <>
                                <div className={`p-4 bg-slate-200 text-slate-500 rounded-full mb-4`}>
                                    <FileJson size={32} />
                                </div>
                                <p className="text-base text-slate-700 font-medium mb-1">Seleccionar Archivo</p>
                                <p className="text-xs text-slate-400">PDF o Excel</p>
                            </>
                        ) : (
                            <>
                                <div className={`p-4 bg-${theme.primaryColor}-100 text-${theme.primaryColor}-600 rounded-full mb-4`}>
                                    {convertFile.name.endsWith('.pdf') ? <FileText size={32} /> : <FileSpreadsheet size={32} />}
                                </div>
                                <p className="text-base font-bold text-slate-800 text-center break-all px-4">{convertFile.name}</p>
                                <button 
                                    onClick={(e) => { e.stopPropagation(); onClearFile(); }}
                                    className="mt-2 text-xs text-red-500 hover:underline"
                                >
                                    Quitar
                                </button>
                            </>
                        )}
                    </div>
                </div>

                {/* ACTION AREA */}
                <div className="flex flex-col justify-center space-y-4">
                    <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
                        <h4 className="font-bold text-slate-700 mb-2">Acción Detectada:</h4>
                        {convertFile ? (
                            convertFile.name.endsWith('.pdf') ? (
                                <div className="flex items-center gap-2 text-blue-600 font-bold">
                                    <FileText size={18}/> PDF <ArrowRightLeft size={14}/> <FileSpreadsheet size={18}/> Excel
                                </div>
                            ) : (
                                <div className="flex items-center gap-2 text-green-600 font-bold">
                                        <FileSpreadsheet size={18}/> Excel <ArrowRightLeft size={14}/> <FileText size={18}/> PDF
                                </div>
                            )
                        ) : (
                            <p className="text-slate-400 text-sm italic">Sube un archivo para ver opciones...</p>
                        )}
                    </div>

                    <button 
                        onClick={onConvert}
                        disabled={!convertFile || isConverting}
                        className={clsx(
                            "w-full flex items-center justify-center gap-2 px-6 py-4 rounded-xl font-bold text-white text-lg transition-all shadow-md",
                            (!convertFile || isConverting) ? "bg-slate-300 cursor-not-allowed" : `bg-${theme.primaryColor}-600 hover:bg-${theme.primaryColor}-700`
                        )}
                    >
                        {isConverting ? (
                            <>
                                <Loader2 className="animate-spin" size={20} />
                                <span>Convirtiendo...</span>
                            </>
                        ) : (
                            <>
                                <Download size={20} />
                                <span>Convertir y Descargar</span>
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};