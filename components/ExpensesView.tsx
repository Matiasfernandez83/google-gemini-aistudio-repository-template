
import React, { useState, useRef, useEffect } from 'react';
import { CreditCard, UploadCloud, Loader2, DollarSign, Activity, FileSpreadsheet, X, AlertCircle, Trash2, ListFilter, ChevronLeft, ChevronRight, Download, Eye, Calendar, Building, User } from 'lucide-react';
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

export const ExpensesView: React.FC<ExpensesViewProps> = ({ expenses, onExpensesUpdated, onViewDetail, theme }) => {
    const [statements, setStatements] = useState<CardStatement[]>([]);
    const [files, setFiles] = useState<File[]>([]);
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    
    // Pagination State
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);
    const [isExporting, setIsExporting] = useState(false);

    const [status, setStatus] = useState<ProcessingStatus>({
        isProcessing: false, error: null, success: false
    });
    
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Initial Load of Statements
    useEffect(() => {
        loadStatements();
    }, []);

    const loadStatements = async () => {
        const loaded = await getStatements();
        setStatements(loaded.sort((a, b) => b.timestamp - a.timestamp));
    };

    // Reset page when data changes
    useEffect(() => {
        setCurrentPage(1);
        setSelectedIds([]);
    }, [expenses.length]);

    // --- INDICATORS (GLOBAL) ---
    // Calculate total bill amount (Sum of all statements' totals, not just expenses)
    const globalBillTotal = statements.reduce((acc, curr) => acc + (curr.totalResumen || 0), 0);
    const totalTransactions = expenses.length;
    
    const formatCurrency = (val: number) => new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(val);

    // --- PAGINATION LOGIC ---
    const totalPages = Math.ceil(expenses.length / itemsPerPage) || 1;
    const paginatedData = expenses.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
    );

    const startItemIndex = (currentPage - 1) * itemsPerPage + 1;
    const endItemIndex = Math.min(currentPage * itemsPerPage, expenses.length);

    const changePage = (newPage: number) => {
        if (newPage >= 1 && newPage <= totalPages) setCurrentPage(newPage);
    };

    const handleItemsPerPageChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        setItemsPerPage(Number(e.target.value));
        setCurrentPage(1);
    };

    // --- SELECTION LOGIC ---
    const toggleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.checked) setSelectedIds(expenses.map(e => e.id));
        else setSelectedIds([]);
    };

    const toggleSelectRow = (id: string) => {
        if (selectedIds.includes(id)) setSelectedIds(prev => prev.filter(item => item !== id));
        else setSelectedIds(prev => [...prev, id]);
    };

    const confirmDelete = async () => {
        await deleteExpenses(selectedIds);
        const remaining = expenses.filter(e => !selectedIds.includes(e.id));
        onExpensesUpdated(remaining);
        setSelectedIds([]);
        setShowDeleteConfirm(false);
    };

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            setFiles(prev => [...prev, ...Array.from(e.target.files!)]);
            setStatus({ isProcessing: false, error: null, success: false });
        }
    };

    const handleCardDoubleClick = (stmt: CardStatement) => {
        const fileExpenses = expenses.filter(e => e.statementId === stmt.id || e.sourceFileId === stmt.sourceFileId);
        onViewDetail(`Detalle Resumen: ${stmt.banco} (${stmt.periodo || 'Periodo'})`, fileExpenses);
    };

    const handleExport = async () => {
        setIsExporting(true);
        try {
            const XLSX = await import('xlsx');
            const exportData = expenses.map(d => ({
                FECHA: d.fecha || '',
                CONCEPTO: d.concepto,
                CATEGORIA: d.categoria,
                ARCHIVO_ORIGEN: d.sourceFileName || '',
                MONTO: d.monto
            }));
    
            const ws = XLSX.utils.json_to_sheet(exportData);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, "Gastos_Filtrados");
            XLSX.writeFile(wb, "reporte_gastos.xlsx");
        } catch (e) {
            console.error("Export failed", e);
        } finally {
            setIsExporting(false);
        }
    };

    const handleProcess = async () => {
        if (files.length === 0) return;
        setStatus({ isProcessing: true, error: null, success: false, processedCount: 0, totalCount: files.length });
        
        const newExpenses: ExpenseRecord[] = [];
        const newStatements: CardStatement[] = [];
        const filesToSave: UploadedFile[] = [];
        let successCount = 0;
        const failedFiles: string[] = [];

        try {
            for (let i = 0; i < files.length; i++) {
                const file = files[i];
                const fileId = `exp-file-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
                const statementId = `stmt-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;

                try {
                    let contentData = '';
                    let mimeType = '';
                    if (file.type === FileType.PDF) {
                        contentData = await fileToBase64(file);
                        mimeType = 'application/pdf';
                    } else {
                        contentData = await parseExcelToCSV(file);
                        mimeType = 'text/plain';
                    }

                    // Process with Enhanced Service (Metadata + Items)
                    const result = await processCardExpenses([{ mimeType, data: contentData }]);
                    
                    // Create Statement Metadata Object
                    const statement: CardStatement = {
                        id: statementId,
                        sourceFileId: fileId,
                        banco: result.metadata.banco || "Banco Desconocido",
                        titular: result.metadata.titular || "Titular Desconocido",
                        periodo: result.metadata.periodo || "Sin Periodo",
                        fechaVencimiento: result.metadata.fechaVencimiento || "Sin Vto",
                        totalResumen: result.metadata.totalResumen || 0,
                        totalPeajes: result.items.reduce((acc, curr) => acc + curr.monto, 0),
                        timestamp: Date.now()
                    };
                    
                    newStatements.push(statement);

                    // Create Items
                    const taggedResult = result.items.map((r, idx) => ({ 
                        ...r, 
                        id: `exp-${statementId}-${idx}`,
                        statementId: statementId,
                        sourceFileId: fileId, 
                        sourceFileName: file.name 
                    }));
                    newExpenses.push(...taggedResult);
                    
                    filesToSave.push({ id: fileId, name: file.name, type: file.type, size: file.size, content: contentData });
                    successCount++;
                    setStatus(prev => ({ ...prev, processedCount: successCount }));
                } catch (err: any) {
                    failedFiles.push(`${file.name}: ${err.message}`);
                }
            }

            if (newStatements.length > 0) {
                await saveStatements(newStatements);
                await saveExpenses(newExpenses);
                await saveFiles(filesToSave);
                
                await loadStatements(); // Refresh local statements
                onExpensesUpdated([...expenses, ...newExpenses]);
            }

            setStatus({ isProcessing: false, error: failedFiles.length > 0 ? `Errores: ${failedFiles.join(', ')}` : null, success: successCount > 0 });
            if (failedFiles.length === 0) setFiles([]);
        } catch (e: any) {
            setStatus({ isProcessing: false, error: e.message, success: false });
        }
    };

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-12">
            <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800 mb-2">Billetera de Resúmenes</h2>
                    <p className="text-slate-500">Gestión centralizada de múltiples tarjetas y peajes.</p>
                </div>
                
                {/* GLOBAL CONSOLIDATED CARD */}
                <div className="bg-slate-900 text-white p-4 rounded-xl shadow-lg flex items-center gap-6 min-w-[300px]">
                    <div className="p-3 bg-blue-500 rounded-lg">
                        <Activity size={24} />
                    </div>
                    <div>
                        <p className="text-slate-400 text-xs uppercase font-bold tracking-wider">Deuda Total Consolidada</p>
                        <p className="text-2xl font-bold">{formatCurrency(globalBillTotal)}</p>
                        <p className="text-xs text-slate-400">{statements.length} resúmenes activos</p>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                
                {/* UPLOADER CARD */}
                <div className="lg:col-span-3 bg-white p-6 rounded-xl shadow-sm border border-slate-100 h-fit">
                    <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                        <UploadCloud size={20} className={`text-${theme.primaryColor}-500`}/> Cargar Resumen
                    </h3>
                    <div className={`border-2 border-dashed border-slate-300 rounded-lg p-6 flex flex-col items-center justify-center bg-slate-50 hover:bg-${theme.primaryColor}-50 cursor-pointer mb-4`} onClick={() => fileInputRef.current?.click()}>
                        <input type="file" multiple ref={fileInputRef} className="hidden" accept=".pdf,.xlsx,.xls,.csv" onChange={handleFileSelect} />
                        <CreditCard size={32} className={`text-${theme.primaryColor}-400 mb-2`} />
                        <p className="text-sm font-medium text-slate-700 text-center">Subir PDF/Excel Bancario</p>
                    </div>
                    {files.length > 0 && (
                        <div className="space-y-3">
                            <button onClick={handleProcess} disabled={status.isProcessing} className={`w-full py-2 bg-${theme.primaryColor}-600 text-white rounded-lg font-bold hover:bg-${theme.primaryColor}-700 disabled:opacity-50 flex justify-center items-center gap-2`}>
                                {status.isProcessing ? <Loader2 className="animate-spin" size={16}/> : 'Procesar e Identificar'}
                            </button>
                        </div>
                    )}
                    {status.success && <div className="mt-2 text-xs text-green-600 font-bold flex items-center gap-1"><Activity size={12}/> Listo.</div>}
                    {status.error && <div className="mt-2 text-xs text-red-600 flex items-start gap-1"><AlertCircle size={12} className="mt-0.5"/> {status.error}</div>}
                </div>

                {/* CARDS SCROLLABLE AREA */}
                <div className="lg:col-span-9">
                    {statements.length === 0 ? (
                         <div className="h-full flex flex-col items-center justify-center border-2 border-dashed border-slate-200 rounded-xl p-8 text-slate-400 bg-slate-50/50">
                            <CreditCard size={48} className="mb-2 opacity-20" />
                            <p>No hay resúmenes cargados.</p>
                         </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {statements.map((stmt) => (
                                <div 
                                    key={stmt.id} 
                                    className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 cursor-pointer hover:shadow-md hover:border-blue-300 transition-all group relative overflow-hidden"
                                    onDoubleClick={() => handleCardDoubleClick(stmt)}
                                >
                                    <div className="absolute top-0 right-0 p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <div className="bg-slate-100 text-slate-500 text-[10px] px-2 py-1 rounded-full flex items-center gap-1">
                                            <Eye size={10} /> Doble click
                                        </div>
                                    </div>

                                    {/* Bank Header */}
                                    <div className="flex items-center gap-3 mb-4">
                                        <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 font-bold text-xs uppercase">
                                            {stmt.banco.substring(0,3)}
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-slate-800 text-sm truncate max-w-[150px]">{stmt.banco}</h4>
                                            <p className="text-xs text-slate-500 flex items-center gap-1">
                                                <User size={10}/> {stmt.titular}
                                            </p>
                                        </div>
                                    </div>

                                    {/* Amount Info */}
                                    <div className="mb-4">
                                        <p className="text-xs text-slate-500 uppercase tracking-wide">Total a Pagar</p>
                                        <p className="text-xl font-bold text-slate-900">{formatCurrency(stmt.totalResumen)}</p>
                                        {stmt.totalPeajes !== undefined && stmt.totalPeajes > 0 && (
                                            <p className="text-xs text-blue-600 font-medium mt-1">
                                                Peajes detectados: {formatCurrency(stmt.totalPeajes)}
                                            </p>
                                        )}
                                    </div>

                                    {/* Date Footer */}
                                    <div className="flex justify-between items-center pt-3 border-t border-slate-100">
                                        <div className="flex items-center gap-1 text-xs text-slate-500">
                                            <Calendar size={12} />
                                            <span>{stmt.periodo}</span>
                                        </div>
                                        <div className="text-xs font-bold text-red-600 bg-red-50 px-2 py-1 rounded">
                                            Vence: {stmt.fechaVencimiento}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* EXPENSES TABLE (Consolidated) */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-100 flex flex-col">
                <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-50">
                    <h3 className="text-lg font-bold text-slate-800">
                        Detalle de Gastos (Peajes y Autopistas)
                        {selectedIds.length > 0 && <span className="ml-2 text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">{selectedIds.length} seleccionados</span>}
                    </h3>
                    <div className="flex gap-2">
                        {selectedIds.length > 0 && (
                            <button onClick={() => setShowDeleteConfirm(true)} className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-bold hover:bg-red-700">
                                <Trash2 size={16} /> <span className="hidden sm:inline">Eliminar</span>
                            </button>
                        )}
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
                    <table className="w-full text-left">
                        <thead className="bg-slate-100 text-slate-600 text-xs uppercase font-bold">
                            <tr>
                                <th className="px-4 py-4 w-10"><input type="checkbox" onChange={toggleSelectAll} checked={expenses.length > 0 && selectedIds.length === expenses.length} /></th>
                                <th className="px-6 py-4">Fecha</th>
                                <th className="px-6 py-4">Concepto</th>
                                <th className="px-6 py-4">Categoría</th>
                                <th className="px-6 py-4">Resumen Origen</th>
                                <th className="px-6 py-4 text-right">Monto</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-sm">
                            {paginatedData.length > 0 ? paginatedData.map((item) => (
                                <tr key={item.id} className={`hover:bg-slate-50 ${selectedIds.includes(item.id) ? 'bg-blue-50' : ''}`}>
                                    <td className="px-4 py-4"><input type="checkbox" checked={selectedIds.includes(item.id)} onChange={() => toggleSelectRow(item.id)} /></td>
                                    <td className="px-6 py-4 text-slate-600">{item.fecha || '-'}</td>
                                    <td className="px-6 py-4 font-medium text-slate-800">{item.concepto}</td>
                                    <td className="px-6 py-4"><span className="px-2 py-1 bg-white border border-slate-200 rounded text-xs font-bold text-slate-600">{item.categoria}</span></td>
                                    <td className="px-6 py-4 text-slate-500 text-xs truncate max-w-[150px]">{item.sourceFileName}</td>
                                    <td className="px-6 py-4 text-right font-mono font-bold text-slate-900">{formatCurrency(item.monto)}</td>
                                </tr>
                            )) : (
                                <tr><td colSpan={6} className="p-8 text-center text-slate-400">Sin datos que coincidan con los filtros.</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* FOOTER PAGINATION */}
                <div className="p-4 border-t border-slate-100 bg-slate-50 flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-slate-600">
                    <div className="flex items-center gap-2">
                        <span className="text-slate-400">Mostrando</span>
                        <span className="font-bold text-slate-800">{expenses.length > 0 ? startItemIndex : 0} - {endItemIndex}</span>
                        <span className="text-slate-400">de</span>
                        <span className="font-bold text-slate-800">{expenses.length}</span>
                        <span className="text-slate-400 hidden sm:inline">resultados</span>
                    </div>
                    
                    <div className="flex flex-wrap items-center justify-center gap-4 md:gap-6">
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

            <ConfirmModal isOpen={showDeleteConfirm} title="¿Eliminar registros?" message={`Estás a punto de borrar ${selectedIds.length} ítems. Esto no borrará la tarjeta/resumen en sí, solo los gastos seleccionados.`} confirmText="Sí, Eliminar" onConfirm={confirmDelete} onClose={() => setShowDeleteConfirm(false)} isDestructive />
        </div>
    );
};
