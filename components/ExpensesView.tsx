
import React, { useState, useRef, useEffect } from 'react';
import { CreditCard, UploadCloud, Loader2, DollarSign, Activity, FileSpreadsheet, AlertCircle, Trash2, ListFilter, ChevronLeft, ChevronRight, Download, Eye, Calendar, User } from 'lucide-react';
import { ExpenseRecord, ProcessingStatus, ThemeSettings, FileType, UploadedFile, CardStatement } from '../types';
import { parseExcelToCSV, fileToBase64 } from '../utils/excelParser';
import { processCardExpenses } from '../services/geminiService';
import { saveExpenses, saveFiles, deleteExpenses, saveStatements, getStatements } from '../utils/storage';
import { ConfirmModal } from './ConfirmModal';

interface ExpensesViewProps {
    expenses: ExpenseRecord[];
    onExpensesUpdated: (newExpenses: ExpenseRecord[]) => void;
    onViewDetail: (title: string, records: ExpenseRecord[]) => void;
    theme: ThemeSettings;
}

export const ExpensesView: React.FC<ExpensesViewProps> = ({ expenses, onExpensesUpdated, onViewDetail }) => {
    const [statements, setStatements] = useState<CardStatement[]>([]);
    const [files, setFiles] = useState<File[]>([]);
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);
    const [isExporting, setIsExporting] = useState(false);
    const [status, setStatus] = useState<ProcessingStatus>({ isProcessing: false, error: null, success: false });
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => { loadStatements(); }, []);
    const loadStatements = async () => { const loaded = await getStatements(); setStatements(loaded.sort((a, b) => b.timestamp - a.timestamp)); };
    useEffect(() => { setCurrentPage(1); setSelectedIds([]); }, [expenses.length]);

    const globalBillTotal = statements.reduce((acc, curr) => acc + (curr.totalResumen || 0), 0);
    const formatCurrency = (val: number) => new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(val);
    const paginatedData = expenses.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
    const totalPages = Math.ceil(expenses.length / itemsPerPage) || 1;

    const toggleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => { e.target.checked ? setSelectedIds(expenses.map(e => e.id)) : setSelectedIds([]); };
    const toggleSelectRow = (id: string) => { selectedIds.includes(id) ? setSelectedIds(p => p.filter(i => i !== id)) : setSelectedIds(p => [...p, id]); };

    const confirmDelete = async () => { await deleteExpenses(selectedIds); onExpensesUpdated(expenses.filter(e => !selectedIds.includes(e.id))); setSelectedIds([]); setShowDeleteConfirm(false); };
    
    const handleProcess = async () => {
        if (files.length === 0) return;
        setStatus({ isProcessing: true, error: null, success: false, processedCount: 0, totalCount: files.length });
        const newExpenses: ExpenseRecord[] = []; const newStatements: CardStatement[] = []; const filesToSave: UploadedFile[] = []; let successCount = 0; const failedFiles: string[] = [];
        try {
            for (let i = 0; i < files.length; i++) {
                const file = files[i]; const fileId = `exp-file-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`; const statementId = `stmt-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
                try {
                    let contentData = '', mimeType = ''; if (file.type === FileType.PDF) { contentData = await fileToBase64(file); mimeType = 'application/pdf'; } else { contentData = await parseExcelToCSV(file); mimeType = 'text/plain'; }
                    const result = await processCardExpenses([{ mimeType, data: contentData }]);
                    newStatements.push({ id: statementId, sourceFileId: fileId, banco: result.metadata.banco || "Desc.", titular: result.metadata.titular || "Desc.", periodo: result.metadata.periodo || "-", fechaVencimiento: result.metadata.fechaVencimiento || "-", totalResumen: result.metadata.totalResumen || 0, totalPeajes: result.items.reduce((a, c) => a + c.monto, 0), timestamp: Date.now() });
                    newExpenses.push(...result.items.map((r, idx) => ({ ...r, id: `exp-${statementId}-${idx}`, statementId, sourceFileId: fileId, sourceFileName: file.name })));
                    filesToSave.push({ id: fileId, name: file.name, type: file.type, size: file.size, content: contentData });
                    successCount++; setStatus(p => ({ ...p, processedCount: successCount }));
                } catch (err: any) { failedFiles.push(`${file.name}: ${err.message}`); }
            }
            if (newStatements.length > 0) { await saveStatements(newStatements); await saveExpenses(newExpenses); await saveFiles(filesToSave); await loadStatements(); onExpensesUpdated([...expenses, ...newExpenses]); }
            setStatus({ isProcessing: false, error: failedFiles.length > 0 ? `Errores: ${failedFiles.join(', ')}` : null, success: successCount > 0 }); if (failedFiles.length === 0) setFiles([]);
        } catch (e: any) { setStatus({ isProcessing: false, error: e.message, success: false }); }
    };

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-12">
            <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800 brand-font">Gestión de Tarjetas</h2>
                    <p className="text-slate-500">Administración de resúmenes y gastos corporativos.</p>
                </div>
                <div className="bg-[#1F2937] text-white px-6 py-4 rounded-xl shadow-lg flex items-center gap-6 border border-slate-700">
                    <div className="p-3 bg-furlong-red rounded-lg"><Activity size={24} /></div>
                    <div>
                        <p className="text-slate-400 text-[10px] uppercase font-bold tracking-wider">Deuda Consolidada</p>
                        <p className="text-2xl font-bold brand-font">{formatCurrency(globalBillTotal)}</p>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* UPLOADER */}
                <div className="lg:col-span-3 bg-white p-6 rounded-xl shadow-polaris border border-slate-200 h-fit">
                    <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                        <UploadCloud size={20} className="text-furlong-red"/> Cargar Resumen
                    </h3>
                    <div className="border-2 border-dashed border-slate-300 rounded-lg p-6 flex flex-col items-center justify-center bg-slate-50 hover:bg-red-50 hover:border-furlong-red/30 cursor-pointer transition-all mb-4" onClick={() => fileInputRef.current?.click()}>
                        <input type="file" multiple ref={fileInputRef} className="hidden" accept=".pdf,.xlsx,.xls,.csv" onChange={(e) => { if(e.target.files) setFiles(prev => [...prev, ...Array.from(e.target.files!)]) }} />
                        <CreditCard size={32} className="text-slate-400 mb-2" />
                        <p className="text-sm font-bold text-slate-700">Subir Archivo</p>
                        <p className="text-xs text-slate-400">PDF / Excel</p>
                    </div>
                    {files.length > 0 && (
                        <button onClick={handleProcess} disabled={status.isProcessing} className="w-full py-2.5 bg-furlong-red text-white rounded-lg font-bold hover:bg-red-700 disabled:opacity-50 flex justify-center items-center gap-2 shadow-sm">
                            {status.isProcessing ? <Loader2 className="animate-spin" size={16}/> : 'Procesar Resúmenes'}
                        </button>
                    )}
                    {status.success && <div className="mt-2 text-xs text-green-600 font-bold bg-green-50 p-2 rounded border border-green-100">Proceso completado.</div>}
                    {status.error && <div className="mt-2 text-xs text-red-600 bg-red-50 p-2 rounded border border-red-100">{status.error}</div>}
                </div>

                {/* CARDS GRID */}
                <div className="lg:col-span-9">
                    {statements.length === 0 ? (
                         <div className="h-full flex flex-col items-center justify-center border border-dashed border-slate-300 rounded-xl p-8 text-slate-400 bg-slate-50">
                            <CreditCard size={48} className="mb-2 opacity-20" /> <p>Sin resúmenes activos.</p>
                         </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {statements.map((stmt) => (
                                <div key={stmt.id} className="bg-white rounded-xl shadow-polaris border border-slate-200 p-5 cursor-pointer hover:shadow-polaris-hover hover:border-slate-300 transition-all group relative" onDoubleClick={() => onViewDetail(`Resumen: ${stmt.banco}`, expenses.filter(e => e.statementId === stmt.id))}>
                                    <div className="h-1 w-full bg-slate-800 absolute top-0 left-0 rounded-t-xl group-hover:bg-furlong-red transition-colors"></div>
                                    <div className="flex items-center gap-3 mb-4 mt-2">
                                        <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-700 font-bold text-[10px] uppercase border border-slate-200">{stmt.banco.substring(0,3)}</div>
                                        <div className="overflow-hidden"><h4 className="font-bold text-slate-800 text-sm truncate">{stmt.banco}</h4><p className="text-xs text-slate-500 truncate">{stmt.titular}</p></div>
                                    </div>
                                    <div className="mb-4">
                                        <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Total a Pagar</p>
                                        <p className="text-xl font-bold text-slate-900 brand-font">{formatCurrency(stmt.totalResumen)}</p>
                                    </div>
                                    <div className="flex justify-between items-center pt-3 border-t border-slate-100">
                                        <span className="text-xs text-slate-500">{stmt.periodo}</span>
                                        <span className="text-[10px] font-bold text-white bg-furlong-red px-2 py-0.5 rounded">VENCE {stmt.fechaVencimiento}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* EXPENSES TABLE */}
            <div className="bg-white rounded-xl shadow-polaris border border-slate-200 overflow-hidden">
                <div className="p-5 border-b border-slate-200 flex justify-between items-center bg-slate-50/50">
                    <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2 brand-font">Detalle de Gastos {selectedIds.length > 0 && <span className="bg-slate-800 text-white text-[10px] px-2 py-0.5 rounded-full">{selectedIds.length}</span>}</h3>
                    {selectedIds.length > 0 && <button onClick={() => setShowDeleteConfirm(true)} className="px-3 py-1.5 bg-red-600 text-white text-xs font-bold rounded hover:bg-red-700 flex items-center gap-1"><Trash2 size={14}/> Eliminar</button>}
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-slate-50 text-slate-500 text-xs uppercase font-bold tracking-wider">
                            <tr>
                                <th className="px-6 py-4 w-10"><input type="checkbox" onChange={toggleSelectAll} checked={expenses.length > 0 && selectedIds.length === expenses.length} className="rounded border-slate-300 text-furlong-red focus:ring-furlong-red"/></th>
                                <th className="px-6 py-4">Fecha</th>
                                <th className="px-6 py-4">Concepto</th>
                                <th className="px-6 py-4">Categoría</th>
                                <th className="px-6 py-4 text-right">Monto</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {paginatedData.map((item) => (
                                <tr key={item.id} className={`hover:bg-slate-50 ${selectedIds.includes(item.id) ? 'bg-red-50/20' : ''}`}>
                                    <td className="px-6 py-4"><input type="checkbox" checked={selectedIds.includes(item.id)} onChange={() => toggleSelectRow(item.id)} className="rounded border-slate-300 text-furlong-red focus:ring-furlong-red"/></td>
                                    <td className="px-6 py-4 text-slate-600 text-sm font-medium">{item.fecha}</td>
                                    <td className="px-6 py-4 text-slate-800 text-sm font-medium">{item.concepto}</td>
                                    <td className="px-6 py-4"><span className="px-2 py-1 rounded bg-slate-100 text-slate-600 text-[10px] font-bold border border-slate-200">{item.categoria}</span></td>
                                    <td className="px-6 py-4 text-right font-bold text-slate-900 text-sm font-mono">{formatCurrency(item.monto)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                 {/* Footer Pagination */}
                 <div className="p-4 border-t border-slate-200 bg-slate-50 flex justify-between items-center text-xs text-slate-500">
                    <span>Página {currentPage} de {totalPages}</span>
                    <div className="flex gap-1">
                        <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="p-1.5 bg-white border border-slate-300 rounded hover:text-furlong-red disabled:opacity-50"><ChevronLeft size={16}/></button>
                        <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="p-1.5 bg-white border border-slate-300 rounded hover:text-furlong-red disabled:opacity-50"><ChevronRight size={16}/></button>
                    </div>
                </div>
            </div>
            <ConfirmModal isOpen={showDeleteConfirm} title="¿Eliminar items?" message="Se borrarán los gastos seleccionados." confirmText="Eliminar" onConfirm={confirmDelete} onClose={() => setShowDeleteConfirm(false)} isDestructive />
        </div>
    );
};
