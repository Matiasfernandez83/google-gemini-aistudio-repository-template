
import React, { useState, useRef, useEffect } from 'react';
import { CreditCard, UploadCloud, Loader2, DollarSign, Activity, FileSpreadsheet, Trash2, ChevronLeft, ChevronRight, Calendar, CheckSquare, Square, Download, PlusCircle } from 'lucide-react';
import { ExpenseRecord, ProcessingStatus, ThemeSettings, UploadedFile, CardStatement } from '../types';
import { parseExcelToCSV, fileToBase64 } from '../utils/excelParser';
import { processCardExpenses } from '../services/geminiService';
import { saveExpenses, saveFiles, deleteExpenses, saveStatements, getStatements } from '../utils/storage';
import { ConfirmModal } from './ConfirmModal';
import clsx from 'clsx';

interface ExpensesViewProps {
    expenses: ExpenseRecord[];
    onExpensesUpdated: (newExpenses: ExpenseRecord[]) => void;
    onViewDetail: (title: string, records: ExpenseRecord[]) => void;
    theme: ThemeSettings;
}

export const ExpensesView: React.FC<ExpensesViewProps> = ({ expenses, onExpensesUpdated, onViewDetail, theme }) => {
    const [statements, setStatements] = useState<CardStatement[]>([]);
    const [files, setFiles] = useState<File[]>([]);
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;
    const [status, setStatus] = useState<ProcessingStatus>({ isProcessing: false, error: null, success: false });
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => { loadStatements(); }, []);
    const loadStatements = async () => { const loaded = await getStatements(); setStatements(loaded.sort((a, b) => b.timestamp - a.timestamp)); };

    const globalBillTotal = statements.reduce((acc, curr) => acc + (curr.totalResumen || 0), 0);
    const formatCurrency = (val: number) => new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(val);

    const paginatedData = expenses.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
    const totalPages = Math.ceil(expenses.length / itemsPerPage) || 1;

    const toggleSelectAll = () => { selectedIds.length === expenses.length ? setSelectedIds([]) : setSelectedIds(expenses.map(e => e.id)); };
    const toggleSelectRow = (id: string) => { selectedIds.includes(id) ? setSelectedIds(p => p.filter(i => i !== id)) : setSelectedIds(p => [...p, id]); };

    const handleProcess = async () => {
        if (files.length === 0) return;
        setStatus({ isProcessing: true, error: null, success: false, processedCount: 0, totalCount: files.length });
        const newExpenses: ExpenseRecord[] = [];
        const newStatements: CardStatement[] = [];
        const filesToSave: UploadedFile[] = [];
        
        try {
            for (let i = 0; i < files.length; i++) {
                const file = files[i];
                const fileId = `exp-file-${Date.now()}-${i}`;
                const contentData = file.name.toLowerCase().endsWith('.pdf') ? await fileToBase64(file) : await parseExcelToCSV(file);
                const mimeType = file.name.toLowerCase().endsWith('.pdf') ? 'application/pdf' : 'text/plain';

                const result = await processCardExpenses([{ mimeType, data: contentData }]);
                
                const statementId = `stmt-${Date.now()}-${i}`;
                newStatements.push({
                    id: statementId,
                    sourceFileId: fileId,
                    banco: result.metadata.banco || "Desconocido",
                    titular: result.metadata.titular || "Desconocido",
                    periodo: result.metadata.periodo || "-",
                    fechaVencimiento: result.metadata.fechaVencimiento || "-",
                    totalResumen: result.metadata.totalResumen || 0,
                    totalPeajes: result.items.reduce((a, c) => a + c.monto, 0),
                    timestamp: Date.now()
                });

                newExpenses.push(...result.items.map((r, idx) => ({
                    ...r,
                    id: `exp-${statementId}-${idx}`,
                    statementId,
                    sourceFileId: fileId,
                    sourceFileName: file.name
                })));

                filesToSave.push({ id: fileId, name: file.name, type: file.type, size: file.size, content: contentData });
                setStatus(p => ({ ...p, processedCount: i + 1 }));
            }

            await saveStatements(newStatements);
            await saveExpenses(newExpenses);
            await saveFiles(filesToSave);
            await loadStatements();
            onExpensesUpdated([...expenses, ...newExpenses]);
            setFiles([]);
            setStatus({ isProcessing: false, error: null, success: true });
        } catch (e: any) {
            setStatus({ isProcessing: false, error: e.message, success: false });
        }
    };

    const exportToExcel = async () => {
        const recordsToExport = selectedIds.length > 0 
            ? expenses.filter(e => selectedIds.includes(e.id)) 
            : expenses;

        const XLSX = await import('xlsx');
        const ws = XLSX.utils.json_to_sheet(recordsToExport.map(r => ({
            FECHA: r.fecha,
            CONCEPTO: r.concepto,
            CATEGORIA: r.categoria,
            RESUMEN: r.sourceFileName,
            MONTO: r.monto
        })));
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Gastos Tarjeta");
        XLSX.writeFile(wb, `Gastos_Tarjetas_Furlong_${new Date().toISOString().slice(0,10)}.xlsx`);
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-500 pb-12">
            {/* Header Area */}
            <div className="flex flex-col md:flex-row justify-between md:items-start gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800 brand-font">Billetera de Resúmenes</h2>
                    <p className="text-slate-500 text-sm">Gestión centralizada de múltiples tarjetas y peajes.</p>
                </div>
                
                <div className="bg-[#121212] text-white p-4 rounded-xl shadow-lg border border-white/5 flex items-center gap-4 min-w-[300px]">
                    <div className="w-12 h-12 bg-blue-600/20 rounded-lg flex items-center justify-center text-blue-500">
                        <Activity size={28} />
                    </div>
                    <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none mb-1">Deuda Total Consolidada</p>
                        <p className="text-2xl font-black text-[#DFFF00] brand-font tracking-tight">{formatCurrency(globalBillTotal)}</p>
                        <p className="text-[10px] text-slate-500">{statements.length} resúmenes activos</p>
                    </div>
                </div>
            </div>

            {/* Top Grid: Uploader + Cards */}
            <div className="flex flex-col lg:flex-row gap-6">
                {/* Uploader */}
                <div className="w-full lg:w-72 flex-shrink-0">
                    <div 
                        className="bg-white rounded-xl border-2 border-dashed border-slate-200 p-6 flex flex-col items-center justify-center text-center cursor-pointer hover:bg-slate-50 hover:border-furlong-red/30 transition-all h-[180px]"
                        onClick={() => fileInputRef.current?.click()}
                    >
                        <input type="file" multiple ref={fileInputRef} className="hidden" accept=".pdf,.xlsx" onChange={(e) => e.target.files && setFiles(p => [...p, ...Array.from(e.target.files!)])} />
                        <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center text-blue-500 mb-3">
                            <CreditCard size={24} />
                        </div>
                        <h4 className="text-sm font-bold text-slate-800">Cargar Resumen</h4>
                        <p className="text-[10px] text-slate-400 mt-1 uppercase font-bold">Subir PDF/Excel Bancario</p>
                        {files.length > 0 && <p className="text-[10px] text-green-600 font-bold mt-2 flex items-center gap-1"><CheckSquare size={10}/> {files.length} listos.</p>}
                    </div>
                    {files.length > 0 && (
                        <button 
                            onClick={handleProcess} 
                            disabled={status.isProcessing}
                            className="w-full mt-3 py-3 bg-furlong-red text-white rounded-xl font-bold text-xs uppercase tracking-wider hover:bg-red-700 transition-all shadow-md flex items-center justify-center gap-2"
                        >
                            {status.isProcessing ? <Loader2 className="animate-spin" size={16}/> : <PlusCircle size={16}/>}
                            {status.isProcessing ? 'Procesando...' : 'Iniciar Carga'}
                        </button>
                    )}
                </div>

                {/* Horizontal Statements Scroll */}
                <div className="flex-1 overflow-x-auto pb-4 custom-scrollbar">
                    <div className="flex gap-4 min-w-min">
                        {statements.map((stmt) => (
                            <div key={stmt.id} className="w-80 bg-white rounded-xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition-all flex-shrink-0">
                                <div className="flex items-center justify-between mb-4">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 bg-slate-50 border border-slate-100 rounded-lg flex items-center justify-center text-slate-400 text-xs font-bold uppercase">
                                            {stmt.banco.substring(0,3)}
                                        </div>
                                        <div>
                                            <h4 className="text-sm font-bold text-slate-800 uppercase tracking-tight">{stmt.banco}</h4>
                                            <p className="text-[10px] text-slate-400 truncate max-w-[150px] uppercase font-medium">{stmt.titular}</p>
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-1 mb-4">
                                    <p className="text-[9px] font-bold text-slate-400 uppercase">Total a Pagar</p>
                                    <p className="text-xl font-black text-slate-900 bg-[#DFFF00]/30 px-2 py-0.5 rounded-md inline-block">{formatCurrency(stmt.totalResumen)}</p>
                                    <div className="mt-1">
                                        <span className="text-[10px] font-bold bg-[#DFFF00] text-slate-800 px-2 py-0.5 rounded-full border border-slate-200">
                                            Peajes detectados: {formatCurrency(stmt.totalPeajes || 0)}
                                        </span>
                                    </div>
                                </div>

                                <div className="flex items-center justify-between pt-3 border-t border-slate-50">
                                    <div className="flex items-center gap-1 text-slate-400">
                                        <Calendar size={12} />
                                        <span className="text-[10px] font-bold">{stmt.periodo}</span>
                                    </div>
                                    <div className="bg-amber-400 text-slate-900 text-[9px] font-extrabold px-2 py-0.5 rounded uppercase border border-amber-500/20">
                                        Vence: {stmt.fechaVencimiento}
                                    </div>
                                </div>
                            </div>
                        ))}
                        {statements.length === 0 && !status.isProcessing && (
                            <div className="flex items-center justify-center w-full h-[180px] text-slate-300 italic text-sm">
                                Suba un resumen para comenzar...
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Detailed Table Area */}
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                <div className="p-5 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <h3 className="text-lg font-bold text-slate-800 brand-font">Detalle de Gastos (Peajes y Autopistas)</h3>
                    
                    <button 
                        onClick={exportToExcel}
                        className="flex items-center gap-2 px-4 py-2 bg-[#DFFF00] text-slate-900 border border-slate-200 rounded-lg text-xs font-bold hover:bg-[#c6e600] transition-all"
                    >
                        <Download size={16} /> Exportar Excel
                    </button>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-slate-50 text-slate-500 text-[10px] uppercase font-bold tracking-widest border-b border-slate-100">
                            <tr>
                                <th className="px-6 py-4 w-12 text-center">
                                    <button onClick={toggleSelectAll} className="text-slate-300 hover:text-furlong-red">
                                        {selectedIds.length === expenses.length && expenses.length > 0 ? <CheckSquare size={18}/> : <Square size={18}/>}
                                    </button>
                                </th>
                                <th className="px-6 py-4">Fecha</th>
                                <th className="px-6 py-4">Concepto</th>
                                <th className="px-6 py-4">Categoría</th>
                                <th className="px-6 py-4">Resumen Origen</th>
                                <th className="px-6 py-4 text-right">Monto</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {paginatedData.map((item) => (
                                <tr key={item.id} className={clsx("hover:bg-slate-50 transition-colors cursor-pointer", selectedIds.includes(item.id) && "bg-blue-50/30")} onClick={() => toggleSelectRow(item.id)}>
                                    <td className="px-6 py-4 text-center" onClick={(e) => e.stopPropagation()}>
                                        <button onClick={() => toggleSelectRow(item.id)} className={clsx(selectedIds.includes(item.id) ? "text-furlong-red" : "text-slate-300")}>
                                            {selectedIds.includes(item.id) ? <CheckSquare size={18}/> : <Square size={18}/>}
                                        </button>
                                    </td>
                                    <td className="px-6 py-4 text-slate-500 text-xs font-medium">{item.fecha}</td>
                                    <td className="px-6 py-4 text-slate-800 text-sm font-bold uppercase tracking-tight">{item.concepto}</td>
                                    <td className="px-6 py-4">
                                        <span className="px-2 py-0.5 bg-slate-100 text-slate-600 text-[9px] font-extrabold rounded border border-slate-200 uppercase tracking-tighter">
                                            {item.categoria || 'PEAJE'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-slate-400 text-[10px] font-medium">{item.sourceFileName}</td>
                                    <td className="px-6 py-4 text-right">
                                        <span className="text-slate-900 font-black text-sm font-mono">{formatCurrency(item.monto)}</span>
                                    </td>
                                </tr>
                            ))}
                            {expenses.length === 0 && (
                                <tr>
                                    <td colSpan={6} className="px-6 py-12 text-center text-slate-400 italic text-sm">No se han detectado gastos de peaje aún.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {totalPages > 1 && (
                    <div className="p-4 bg-slate-50/50 flex justify-between items-center text-[10px] font-bold text-slate-400 uppercase">
                        <span>Página {currentPage} de {totalPages}</span>
                        <div className="flex gap-2">
                            <button onClick={() => setCurrentPage(p => Math.max(1, p-1))} disabled={currentPage === 1} className="p-1.5 bg-white border border-slate-200 rounded shadow-sm disabled:opacity-30"><ChevronLeft size={16}/></button>
                            <button onClick={() => setCurrentPage(p => Math.min(totalPages, p+1))} disabled={currentPage === totalPages} className="p-1.5 bg-white border border-slate-200 rounded shadow-sm disabled:opacity-30"><ChevronRight size={16}/></button>
                        </div>
                    </div>
                )}
            </div>
            
            <ConfirmModal 
                isOpen={showDeleteConfirm} 
                title="Eliminar Gastos" 
                message={`¿Estás seguro de eliminar los ${selectedIds.length} gastos seleccionados?`} 
                onConfirm={async () => { await deleteExpenses(selectedIds); onExpensesUpdated(expenses.filter(e => !selectedIds.includes(e.id))); setSelectedIds([]); setShowDeleteConfirm(false); }} 
                onClose={() => setShowDeleteConfirm(false)} 
            />
        </div>
    );
};
