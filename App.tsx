
import React, { useState, useEffect, useMemo } from 'react';
import { Sidebar } from './components/Sidebar';
import { Stats } from './components/Stats';
import { Charts } from './components/Charts';
import { DataTable } from './components/DataTable';
import { ReportsView } from './components/ReportsView';
import { SettingsView } from './components/SettingsView';
import { DetailModal } from './components/DetailModal';
import { LoginScreen } from './components/LoginScreen';
import { ImportView } from './components/ImportView';
import { ConverterView } from './components/ConverterView';
import { ConfirmModal } from './components/ConfirmModal'; 
import { ExpensesView } from './components/ExpensesView';
import { RefreshCw, Menu, Calendar, Trash2, Database, ArrowRightLeft } from 'lucide-react';
import { TruckRecord, ExpenseRecord, ProcessingStatus, FileType, FleetRecord, View, UploadedFile, ModalData, User, ThemeSettings } from './types';
import { parseExcelToCSV, fileToBase64, parseExcelToRowArray } from './utils/excelParser';
import { processDocuments, convertPdfToData } from './services/geminiService';
import { getRecords, saveRecords, getFleet, saveFleet, saveFiles, clearRecords, getExpenses, deleteRecords, logAction, getFileById, getTheme } from './utils/storage';
import clsx from 'clsx';

function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [theme, setTheme] = useState<ThemeSettings>({ primaryColor: 'slate', fontFamily: 'inter', processingMode: 'free' });
  const [currentView, setCurrentView] = useState<View>('dashboard');
  const [records, setRecords] = useState<TruckRecord[]>([]);
  const [expenses, setExpenses] = useState<ExpenseRecord[]>([]);
  const [fleetDb, setFleetDb] = useState<FleetRecord[]>([]);
  const [files, setFiles] = useState<File[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [dateFilter, setDateFilter] = useState<{start: string, end: string}>({ start: '', end: '' });
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [importTab, setImportTab] = useState<'process' | 'convert'>('process');
  const [convertFile, setConvertFile] = useState<File | null>(null);
  const [isConverting, setIsConverting] = useState(false);
  const [status, setStatus] = useState<ProcessingStatus>({ isProcessing: false, error: null, success: false });
  const [modalData, setModalData] = useState<ModalData>({ isOpen: false, title: '', type: 'list' });
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [recordsToDelete, setRecordsToDelete] = useState<string[]>([]);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Load theme from storage on mount
  useEffect(() => {
    const loadTheme = async () => {
        const savedTheme = await getTheme();
        if (savedTheme) setTheme(savedTheme);
    };
    loadTheme();
    refreshSystem();
  }, []);

  const refreshSystem = async () => {
    setIsRefreshing(true);
    try {
        try { const savedRecords = await getRecords(); setRecords(savedRecords || []); } catch (e) {}
        try { const savedExpenses = await getExpenses(); setExpenses(savedExpenses || []); } catch (e) {}
        try { const savedFleet = await getFleet(); setFleetDb(savedFleet || []); } catch (e) {}
    } catch (e) { console.error(e); } finally { setTimeout(() => setIsRefreshing(false), 500); }
  };

  const filteredRecords = useMemo(() => {
    let res = records;
    if (dateFilter.start) res = res.filter(r => r.fecha && r.fecha >= dateFilter.start);
    if (dateFilter.end) res = res.filter(r => r.fecha && r.fecha <= dateFilter.end);
    return res;
  }, [records, dateFilter]);

  const filteredExpenses = useMemo(() => {
    let res = expenses;
    if (dateFilter.start) res = res.filter(e => e.fecha && e.fecha >= dateFilter.start);
    if (dateFilter.end) res = res.filter(e => e.fecha && e.fecha <= dateFilter.end);
    return res;
  }, [expenses, dateFilter]);

  const handleLogin = (user: User) => { setCurrentUser(user); logAction(user, 'LOGIN', 'Sistema', 'Inicio de sesión exitoso'); };
  const normalize = (str: string | undefined) => str ? str.replace(/[\s-]/g, '').toUpperCase() : '';
  const verifyRecords = (currentRecords: TruckRecord[], currentDb: FleetRecord[]): TruckRecord[] => {
      return currentRecords.map(record => {
          let match: FleetRecord | undefined;
          if (record.tag && normalize(record.tag).length > 4) match = currentDb.find(dbItem => { const n = normalize(dbItem.tag); return n && (n.includes(normalize(record.tag)) || normalize(record.tag).includes(n)); });
          if (!match && record.patente && normalize(record.patente).length > 4) match = currentDb.find(dbItem => normalize(dbItem.patente) === normalize(record.patente));
          return match ? { ...record, patente: match.patente || record.patente, dueno: match.dueno !== 'Desconocido' ? match.dueno : record.dueno, equipo: match.equipo || '', tag: match.tag || record.tag, isVerified: true } : { ...record, isVerified: false, equipo: '' };
      });
  };

  const handleProcess = async () => {
    if (files.length === 0) return;
    setStatus({ isProcessing: true, error: null, success: false, processedCount: 0, totalCount: files.length });
    const failedFiles: string[] = []; 
    const newRecordsAcc: TruckRecord[] = []; 
    const filesToSaveAcc: UploadedFile[] = [];
    
    // Check processing mode
    const isFastMode = theme.processingMode === 'fast';
    const delayTime = isFastMode ? 0 : 6000; // 0ms for Paid, 6000ms for Free

    try {
        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            
            // --- ANTI-THROTTLING PAUSE (Conditional) ---
            if (i > 0 && files.length > 1 && delayTime > 0) {
                 await new Promise(r => setTimeout(r, delayTime)); 
            }

            try {
                const fileId = `file-${Date.now()}-${Math.random()}`; 
                let contentData = '', mimeType = '';
                
                const isPdf = file.type === FileType.PDF || file.name.toLowerCase().endsWith('.pdf');
                
                if (isPdf) { 
                    contentData = await fileToBase64(file); 
                    mimeType = 'application/pdf'; 
                } else { 
                    contentData = await parseExcelToCSV(file); 
                    mimeType = 'text/plain'; 
                }
                
                const resultRecords = await processDocuments([{ mimeType, data: contentData }]);
                
                if (resultRecords.length === 0) {
                     failedFiles.push(`${file.name} (0 datos extraídos)`);
                } else {
                    newRecordsAcc.push(...verifyRecords(resultRecords.map(r => ({ ...r, sourceFileId: fileId, sourceFileName: file.name })), fleetDb));
                    filesToSaveAcc.push({ id: fileId, name: file.name, type: file.type, size: file.size, content: contentData });
                }

                setStatus(prev => ({ ...prev, processedCount: (prev.processedCount || 0) + 1 }));
            } catch (err: any) { 
                failedFiles.push(`${file.name}: ${err.message}`); 
                // Only wait on error if we are on free mode or if it's a hard rate limit
                if (!isFastMode) await new Promise(r => setTimeout(r, 2000));
            }
        }

        if (newRecordsAcc.length > 0) { 
            const all = [...records, ...newRecordsAcc]; 
            setRecords(all); 
            await saveRecords(all, currentUser); 
            await saveFiles(filesToSaveAcc); 
        }

        setStatus({ 
            isProcessing: false, 
            error: failedFiles.length > 0 ? `Alertas: ${failedFiles.join(', ')}` : null, 
            success: newRecordsAcc.length > 0 
        });
        
        if (failedFiles.length === 0) setFiles([]);
    } catch (err: any) { setStatus({ isProcessing: false, error: err.message, success: false }); }
  };

  const handleDbSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files[0]) {
          try {
              // Now reads ALL sheets
              const rawData = await parseExcelToRowArray(e.target.files[0]);
              
              if (!rawData || rawData.length === 0) {
                  throw new Error("El archivo parece estar vacío.");
              }

              // 1. HEADER SCAN: Try to find column indices in the first 100 rows
              // Improved regex based on user screenshot: "RESPONSABLE DE USUARIO", "NUMERO DE TAG", "EQUIPOS"
              let patIndex = -1, ownerIndex = -1, tagIndex = -1, equipoIndex = -1;
              for (let i = 0; i < Math.min(rawData.length, 100); i++) {
                  const row = rawData[i].map(c => c ? String(c).toLowerCase().trim() : '');
                  if (patIndex === -1) patIndex = row.findIndex(c => /patente|dominio|matricula/i.test(c));
                  if (ownerIndex === -1) ownerIndex = row.findIndex(c => /responsable|usuario|dueño|titular|transportista|chofer/i.test(c));
                  if (tagIndex === -1) tagIndex = row.findIndex(c => /tag|numero de tag|dispositivo/i.test(c));
                  if (equipoIndex === -1) equipoIndex = row.findIndex(c => /equipo|equipos|interno|unidad/i.test(c));
                  
                  if (patIndex !== -1) break;
              }

              // 2. DATA EXTRACTION
              const fleetData: FleetRecord[] = [];
              let processedRows = 0;

              for (let i = 0; i < rawData.length; i++) {
                  const row = rawData[i];
                  if (!row || row.length === 0) continue;
                  let patenteRaw = '', duenoRaw = 'Desconocido', tagRaw = '', equipoRaw = '';

                  // STRATEGY A: Column found
                  if (patIndex !== -1 && row[patIndex]) {
                      patenteRaw = String(row[patIndex]);
                      if (ownerIndex !== -1 && row[ownerIndex]) duenoRaw = String(row[ownerIndex]);
                      if (tagIndex !== -1 && row[tagIndex]) tagRaw = String(row[tagIndex]);
                      if (equipoIndex !== -1 && row[equipoIndex]) equipoRaw = String(row[equipoIndex]);
                  } 
                  // STRATEGY B: Heuristic scan (Fallback)
                  else {
                       const potentialPatent = row.find(cell => {
                           if (!cell) return false;
                           const s = String(cell).toUpperCase().replace(/[^A-Z0-9]/g, '');
                           return s.length >= 6 && s.length <= 10;
                       });
                       if (potentialPatent) {
                           patenteRaw = String(potentialPatent);
                           const potentialOwner = row.find(cell => {
                               const s = String(cell);
                               return s !== potentialPatent && s.length > 5 && isNaN(Number(s));
                           });
                           if (potentialOwner) duenoRaw = String(potentialOwner);
                       }
                  }

                  // CLEANUP
                  const patenteClean = patenteRaw.toUpperCase().replace(/[^A-Z0-9]/g, ''); 
                  
                  // Validation: Length 6-10 chars.
                  if (patenteClean.length >= 6 && patenteClean.length <= 10) {
                        // Exclude obvious header texts
                        if (!/PATENTE|DOMINIO|MATRICULA|TAG|EQUIPO|ESTADO|USUARIO/.test(patenteClean)) {
                            fleetData.push({
                                patente: patenteClean,
                                dueno: duenoRaw.trim() === '' || duenoRaw.trim().toLowerCase() === 'desconocido' ? 'Desconocido' : duenoRaw.trim(),
                                tag: tagRaw.trim(),
                                equipo: equipoRaw.trim()
                            });
                            processedRows++;
                        }
                  }
              }

              // Deduplication
              const uniqueFleet = Array.from(new Map(fleetData.map(item => [item.patente, item])).values());
              if (uniqueFleet.length === 0) {
                  alert("No se detectaron registros válidos. Asegúrese de que el archivo contiene la columna 'PATENTE'.");
                  return;
              }
              setFleetDb(uniqueFleet); 
              await saveFleet(uniqueFleet, currentUser!);
              
              if (records.length > 0) { 
                   const upd = verifyRecords(records, uniqueFleet); 
                   setRecords(upd); 
                   await saveRecords(upd, currentUser!); 
               }
              
              // Detailed Feedback
              const duplicateCount = processedRows - uniqueFleet.length;
              alert(`PROCESO COMPLETADO:\n\n` + 
                    `• Filas válidas detectadas en Excel: ${processedRows} (de ${rawData.length} totales)\n` +
                    `• Registros ÚNICOS importados: ${uniqueFleet.length}\n` + 
                    `• Duplicados unificados: ${duplicateCount}\n\n` +
                    `Nota: Si el Excel tiene patentes repetidas (ej: mismo camión en dos filas), el sistema conserva solo una entrada para la Base Maestra.`);

          } catch (err: any) { alert("Error al procesar el archivo: " + err.message); }
      }
  };

  const handleConversion = async () => {
    if (!convertFile) return; setIsConverting(true);
    try {
        if (convertFile.name.endsWith('.pdf')) {
            const base64 = await fileToBase64(convertFile); const data = await convertPdfToData([{ mimeType: 'application/pdf', data: base64 }]);
            if (data.length) { const XLSX = await import('xlsx'); const ws = XLSX.utils.json_to_sheet(data); const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, "Data"); XLSX.writeFile(wb, "Convertido.xlsx"); }
        }
    } catch (e: any) { alert(e.message); } finally { setIsConverting(false); setConvertFile(null); }
  };

  if (!currentUser) return <LoginScreen onLogin={handleLogin} themeColor="furlong-red" />;

  return (
    // Main Container: Flex row to handle Sidebar + Content properly without fixed margin hacks
    <div className="flex h-screen w-full bg-[#F8F9FA] font-sans text-slate-900 selection:bg-furlong-red selection:text-white overflow-hidden">
      
      <Sidebar currentView={currentView} onNavigate={setCurrentView} isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
      
      {/* Content Area: Flex-1 to take remaining space, relative for positioning, internal scroll */}
      <main className="flex-1 flex flex-col h-full overflow-y-auto overflow-x-hidden p-4 md:p-6 lg:p-8 relative w-full">
        
        <header className="flex flex-col xl:flex-row justify-between xl:items-center mb-8 gap-6 animate-in fade-in slide-in-from-top-4 shrink-0">
          <div className="flex items-center gap-4">
             <button className="md:hidden p-2 bg-white shadow-polaris border border-slate-200 rounded text-slate-600" onClick={() => setIsSidebarOpen(true)}><Menu size={24} /></button>
             <div>
                <h2 className="text-2xl font-bold text-slate-800 tracking-tight brand-font uppercase">
                    {currentView === 'dashboard' ? 'Tablero de Control' : currentView === 'import' ? 'Centro de Carga' : currentView === 'expenses' ? 'Gestión de Tarjetas' : currentView === 'reports' ? 'Reportes' : 'Configuración'}
                </h2>
                <div className="h-1 w-12 bg-furlong-red mt-1 rounded-full"></div>
             </div>
          </div>
          
          <div className="flex flex-wrap items-center gap-3 bg-white p-2 rounded-xl shadow-polaris border border-slate-200">
            <div className="flex items-center bg-slate-50 border border-slate-200 rounded-lg h-10 px-3 hover:border-slate-300 transition-colors">
                <Calendar size={16} className="text-slate-400 mr-2" />
                <input type="date" className="bg-transparent text-xs font-bold text-slate-700 focus:outline-none w-[100px] uppercase" value={dateFilter.start} onChange={(e) => setDateFilter(prev => ({ ...prev, start: e.target.value }))} />
                <span className="text-slate-300 mx-2">|</span>
                <input type="date" className="bg-transparent text-xs font-bold text-slate-700 focus:outline-none w-[100px] uppercase" value={dateFilter.end} onChange={(e) => setDateFilter(prev => ({ ...prev, end: e.target.value }))} />
                {(dateFilter.start || dateFilter.end) && <button onClick={() => setDateFilter({ start: '', end: '' })} className="ml-2 text-red-500 hover:text-red-700"><Trash2 size={14} /></button>}
            </div>
            {currentView === 'dashboard' && <button onClick={() => setShowClearConfirm(true)} className="h-10 px-4 text-slate-500 hover:text-furlong-red hover:bg-red-50 rounded-lg transition-colors border-l border-slate-100 flex items-center gap-2 text-xs font-bold uppercase"><Trash2 size={16} /> <span className="hidden xl:inline">Limpiar Todo</span></button>}
            <button onClick={refreshSystem} disabled={isRefreshing} className="h-10 px-4 bg-slate-800 text-white rounded-lg hover:bg-black transition-all flex items-center gap-2 text-xs font-bold shadow-sm uppercase tracking-wide"><RefreshCw size={16} className={isRefreshing ? 'animate-spin' : ''} /> <span className="hidden md:inline">Actualizar</span></button>
          </div>
        </header>
        
        <div className="animate-in fade-in slide-in-from-bottom-2 duration-500 flex-1">
            {currentView === 'settings' ? (
                <SettingsView 
                    currentUser={currentUser} 
                    currentTheme={theme} 
                    onUpdateTheme={(newTheme) => {
                        setTheme(newTheme);
                        // Persist theme
                        import('./utils/storage').then(m => m.saveTheme(newTheme));
                    }} 
                    onLogout={() => { setCurrentUser(null); logAction(currentUser, 'LOGIN', 'Sistema', 'Logout'); }} 
                />
             ) : 
             currentView === 'reports' ? <ReportsView data={records} onRefreshData={refreshSystem} /> : 
             currentView === 'expenses' ? <ExpensesView expenses={filteredExpenses} onExpensesUpdated={setExpenses} onViewDetail={(title, records) => setModalData({ isOpen: true, title, type: 'list', dataType: 'expense', records })} theme={theme} /> : 
             currentView === 'import' ? (
                <div className="space-y-6">
                    <div className="flex bg-white p-1 rounded-lg shadow-polaris border border-slate-200 w-fit mb-6">
                        <button onClick={() => setImportTab('process')} className={clsx("px-5 py-2 rounded-md text-xs font-bold uppercase tracking-wide transition-all flex items-center gap-2", importTab === 'process' ? "bg-slate-800 text-white shadow" : "text-slate-500 hover:text-slate-900")}> <Database size={14} /> Procesamiento </button>
                        <button onClick={() => setImportTab('convert')} className={clsx("px-5 py-2 rounded-md text-xs font-bold uppercase tracking-wide transition-all flex items-center gap-2", importTab === 'convert' ? "bg-slate-800 text-white shadow" : "text-slate-500 hover:text-slate-900")}> <ArrowRightLeft size={14} /> Conversor </button>
                    </div>
                    {importTab === 'process' ? <ImportView files={files} status={status} onFileSelect={(e) => e.target.files && setFiles(p => [...p, ...Array.from(e.target.files!)])} onRemoveFile={(idx) => setFiles(p => p.filter((_, i) => i !== idx))} onProcess={handleProcess} theme={theme} fleetDbCount={fleetDb.length} onDbUpload={handleDbSelect} /> : <ConverterView convertFile={convertFile} isConverting={isConverting} onFileSelect={setConvertFile} onConvert={handleConversion} onClearFile={() => setConvertFile(null)} theme={theme} />}
                </div>
            ) : (
                <div className="space-y-8 pb-12 w-full max-w-full">
                    {filteredRecords.length > 0 ? (
                        <>
                            <Stats data={filteredRecords} onCardDoubleClick={(type) => { let filtered = [...filteredRecords], title = ""; if(type==='total') title="General"; else if(type==='trucks') {title="Patentes"; filtered.sort((a,b)=>a.patente.localeCompare(b.patente));} else if(type==='owners') {title="Dueños"; filtered.sort((a,b)=>a.dueno.localeCompare(b.dueno));} setModalData({ isOpen: true, title, type: 'list', dataType: 'truck', records: filtered }); }} />
                            <Charts data={filteredRecords} onBarClick={(owner) => setModalData({ isOpen: true, title: `Ops: ${owner}`, type: 'list', dataType: 'truck', records: filteredRecords.filter(r => r.dueno === owner) })} />
                            <DataTable data={filteredRecords} onRowDoubleClick={(r) => setModalData({ isOpen: true, title: 'Detalle', type: 'detail', dataType: 'truck', singleRecord: r })} onViewFile={async (id) => { const f = await getFileById(id); if(f?.content) window.open(URL.createObjectURL(new Blob([new Uint8Array(atob(f.content as string).split('').map(c=>c.charCodeAt(0)))], {type: f.type})), '_blank'); }} onDelete={(ids) => { setRecordsToDelete(ids); setShowDeleteConfirm(true); }} />
                        </>
                    ) : (
                        <div className="flex flex-col items-center justify-center py-32 border-2 border-dashed border-slate-300 rounded-xl bg-slate-50 text-slate-400">
                            <Database size={64} className="mb-4 opacity-20" /> <p className="text-lg font-bold text-slate-600">Sin datos disponibles</p> <button onClick={() => setCurrentView('import')} className="mt-4 px-6 py-2 bg-furlong-red text-white rounded-lg font-bold shadow-md hover:bg-red-700">Ir a Carga</button>
                        </div>
                    )}
                </div>
            )}
        </div>
      </main>
      
      <DetailModal modalData={modalData} onClose={() => setModalData(p => ({ ...p, isOpen: false }))} />
      <ConfirmModal isOpen={showClearConfirm} title="Limpiar Base" message="Se borrarán todos los registros." confirmText="Borrar" onConfirm={async () => { await clearRecords(currentUser!); setRecords([]); setShowClearConfirm(false); }} onClose={() => setShowClearConfirm(false)} />
      <ConfirmModal isOpen={showDeleteConfirm} title="Eliminar Selección" message="Se borrarán los registros seleccionados." confirmText="Eliminar" isDestructive onConfirm={async () => { await deleteRecords(recordsToDelete, currentUser!); setRecords(p => p.filter(r => !recordsToDelete.includes(r.id))); setShowDeleteConfirm(false); }} onClose={() => setShowDeleteConfirm(false)} />
    </div>
  );
}

export default App;
