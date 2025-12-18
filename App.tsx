
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
import { ConfirmModal } from './components/ConfirmModal'; 
import { ExpensesView } from './components/ExpensesView';
import { RefreshCw, Menu, Trash2, Calendar } from 'lucide-react';
import { TruckRecord, ExpenseRecord, ProcessingStatus, FleetRecord, View, UploadedFile, ModalData, User, ThemeSettings } from './types';
import { parseExcelToCSV, fileToBase64, parseExcelToRowArray } from './utils/excelParser';
import { processDocuments } from './services/geminiService';
import { getRecords, saveRecords, getFleet, saveFleet, saveFiles, getExpenses, deleteRecords, logAction, getTheme, getFileById, clearRecords } from './utils/storage';

function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [theme, setTheme] = useState<ThemeSettings>({ primaryColor: 'slate', fontFamily: 'inter', processingMode: 'free' });
  const [currentView, setCurrentView] = useState<View>('dashboard');
  const [records, setRecords] = useState<TruckRecord[]>([]);
  const [expenses, setExpenses] = useState<ExpenseRecord[]>([]);
  const [fleetDb, setFleetDb] = useState<FleetRecord[]>([]);
  const [files, setFiles] = useState<File[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [status, setStatus] = useState<ProcessingStatus>({ isProcessing: false, error: null, success: false });
  const [modalData, setModalData] = useState<ModalData>({ isOpen: false, title: '', type: 'list' });
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [recordsToDelete, setRecordsToDelete] = useState<string[]>([]);

  useEffect(() => {
    const init = async () => {
        const savedTheme = await getTheme();
        if (savedTheme) setTheme(savedTheme);
        refreshSystem();
    };
    init();
  }, []);

  const refreshSystem = async () => {
    setIsRefreshing(true);
    try {
        const [r, e, f] = await Promise.all([getRecords(), getExpenses(), getFleet()]);
        setRecords(r || []); setExpenses(e || []); setFleetDb(f || []);
    } catch (err) { console.error(err); } finally { setTimeout(() => setIsRefreshing(false), 500); }
  };

  const normalizeId = (val: string) => {
      if (!val) return "";
      const cleanVal = String(val).trim().toUpperCase();
      const onlyDigits = cleanVal.replace(/\D/g, "");
      if (onlyDigits.length >= 8) {
          return onlyDigits.slice(-8);
      }
      return cleanVal.replace(/[^A-Z0-9]/g, "");
  };

  const generateRecordId = (r: Partial<TruckRecord>) => {
      // Crea una firma única para evitar duplicados reales (mismo tag, mismo momento, mismo valor)
      const seed = `${normalizeId(r.tag || '')}-${r.patente}-${r.fecha}-${r.valor}-${r.concepto}`;
      return btoa(seed).replace(/[/+=]/g, '').substring(0, 32);
  };

  const handleClearTable = async () => {
    if (currentUser) {
        await clearRecords(currentUser);
        refreshSystem();
    }
  };

  const handleStatsClick = (type: 'total' | 'trucks' | 'owners' | 'ops') => {
      let title = "Detalle General de Montos";
      let filtered = records;
      if (type === 'trucks') title = "Flota Detectada";
      if (type === 'owners') title = "Montos por Proveedor";
      if (type === 'ops') title = "Todas las Operaciones";
      setModalData({ isOpen: true, title, type: 'list', records: filtered });
  };

  const handleRowDetail = (record: TruckRecord) => {
      setModalData({ isOpen: true, title: `Detalle: ${record.patente || 'Sin Patente'}`, type: 'detail', singleRecord: record });
  };

  const handleViewFile = async (fileId: string) => {
      const file = await getFileById(fileId);
      if (file && file.content) {
          const link = document.createElement('a');
          link.href = `data:${file.type};base64,${file.content}`;
          link.download = file.name;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
      }
  };

  const handleDbUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files[0]) {
          try {
              const rawData = await parseExcelToRowArray(e.target.files[0]);
              if (!rawData || rawData.length < 1) return;

              let headerRowIdx = -1;
              for (let i = 0; i < Math.min(rawData.length, 100); i++) {
                  const row = rawData[i].map(c => String(c || '').toLowerCase());
                  if (row.some(c => /tag|patente|dominio|responsable|dueño/i.test(c))) {
                      headerRowIdx = i;
                      break;
                  }
              }

              if (headerRowIdx === -1) {
                  alert("No se detectaron columnas válidas (Patente, Tag, Responsable) en el archivo.");
                  return;
              }

              const headers = rawData[headerRowIdx].map(c => String(c || '').toLowerCase());
              const pIdx = headers.findIndex(c => /patente|dominio/i.test(c));
              const oIdx = headers.findIndex(c => /responsable|dueño|titular|respponsable/i.test(c));
              const tIdx = headers.findIndex(c => /tag|dispositivo|numedor/i.test(c));
              const eIdx = headers.findIndex(c => /equipo|interno|usuario/i.test(c));

              const fleet: FleetRecord[] = rawData.slice(headerRowIdx + 1).map(row => {
                  const rawTag = tIdx !== -1 ? String(row[tIdx] || '').trim() : '';
                  return {
                      patente: pIdx !== -1 ? String(row[pIdx] || '').toUpperCase().trim() : '',
                      dueno: oIdx !== -1 ? String(row[oIdx] || 'Desconocido').trim() : 'Desconocido',
                      tag: rawTag,
                      equipo: eIdx !== -1 ? String(row[eIdx] || '').trim() : ''
                  };
              }).filter(f => f.patente.length > 2 || f.tag.length > 3);

              await saveFleet(fleet, currentUser!);
              alert(`Base maestra actualizada: ${fleet.length} registros cargados correctamente.`);
              refreshSystem();
          } catch (err: any) { alert("Error al procesar base de datos: " + err.message); }
      }
  };

  const handleProcess = async () => {
    if (files.length === 0) return;
    setStatus({ isProcessing: true, error: null, success: false, processedCount: 0, totalCount: files.length });

    try {
      const allNewRecords: TruckRecord[] = [];
      const filesToSave: UploadedFile[] = [];
      let successCount = 0;

      for (const file of files) {
        const fileId = `file-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        let content = "";
        let mimeType = "";

        try {
          if (file.name.toLowerCase().endsWith('.pdf')) {
            content = await fileToBase64(file);
            mimeType = "application/pdf";
          } else {
            content = await parseExcelToCSV(file);
            mimeType = "text/plain";
          }

          const results = await processDocuments([{ mimeType, data: content }]);
          
          const enriched = results.map(r => {
            const normRecTag = normalizeId(r.tag || "");
            const normRecPatente = r.patente?.toUpperCase().trim();

            const fleetMatch = fleetDb.find(f => {
                const normDbTag = normalizeId(f.tag || "");
                const normDbPatente = f.patente?.toUpperCase().trim();
                const matchesTag = normRecTag && normDbTag && (normRecTag === normDbTag || normDbTag.includes(normRecTag) || normRecTag.includes(normDbTag));
                const matchesPatente = normRecPatente && normDbPatente && normRecPatente === normDbPatente;
                return matchesTag || matchesPatente;
            });

            const finalRecord: TruckRecord = {
              ...r,
              id: generateRecordId({...r, sourceFileName: file.name}),
              sourceFileId: fileId,
              sourceFileName: file.name,
              dueno: fleetMatch?.dueno || r.dueno,
              equipo: fleetMatch?.equipo || r.equipo,
              patente: fleetMatch?.patente || r.patente,
              tag: fleetMatch?.tag || r.tag,
              isVerified: !!fleetMatch
            };
            return finalRecord;
          });

          allNewRecords.push(...enriched);
          filesToSave.push({ id: fileId, name: file.name, type: file.type, size: file.size, content });
          successCount++;
          setStatus(p => ({ ...p, processedCount: successCount }));
          
          if (theme.processingMode !== 'fast' && files.length > 1) {
              await new Promise(r => setTimeout(r, 5000));
          }
        } catch (err) { console.error(`Error processing file ${file.name}:`, err); }
      }

      if (allNewRecords.length > 0) {
        await saveRecords(allNewRecords, currentUser);
        await saveFiles(filesToSave);
        refreshSystem();
      }

      setFiles([]);
      setStatus({ isProcessing: false, error: null, success: true, processedCount: successCount, totalCount: files.length });
    } catch (err: any) { setStatus({ isProcessing: false, error: err.message, success: false }); }
  };

  const handleLogin = (user: User) => { setCurrentUser(user); logAction(user, 'LOGIN', 'Sistema', 'Inicio de sesión exitoso'); };

  if (!currentUser) return <LoginScreen onLogin={handleLogin} themeColor="furlong-red" />;

  const getViewTitle = () => {
      switch(currentView) {
          case 'dashboard': return 'TABLERO';
          case 'import': return 'IMPORTACIÓN';
          case 'expenses': return 'TARJETAS';
          case 'reports': return 'REPORTES';
          case 'settings': return 'CONFIGURACIÓN';
          default: return 'FURLONG';
      }
  };

  return (
    <div className="flex h-screen w-full bg-[#F8F9FA] overflow-hidden">
      <Sidebar currentView={currentView} onNavigate={setCurrentView} isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
      <main className="flex-1 flex flex-col h-full overflow-y-auto p-4 md:p-8">
        
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
             <div className="flex items-center gap-3">
                <button className="md:hidden p-2 bg-white shadow rounded" onClick={() => setIsSidebarOpen(true)}><Menu size={24} /></button>
                <div className="relative">
                    <h2 className="text-3xl font-black text-slate-800 brand-font uppercase tracking-tighter">
                        {getViewTitle()}
                    </h2>
                    <div className="h-1 w-12 bg-furlong-red mt-1"></div>
                </div>
             </div>
          </div>
          
          <div className="flex flex-wrap items-center gap-3">
             <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-xl border border-slate-200 shadow-sm text-xs font-bold text-slate-400">
                <Calendar size={14} className="text-slate-300" />
                <input type="text" placeholder="DD/MM/AAAA" className="w-20 border-none p-0 focus:ring-0 text-xs bg-transparent placeholder:text-slate-300" />
                <span className="text-slate-200">|</span>
                <input type="text" placeholder="DD/MM/AAAA" className="w-20 border-none p-0 focus:ring-0 text-xs bg-transparent placeholder:text-slate-300" />
             </div>
             
             {currentView === 'dashboard' && (
                <button onClick={() => setShowClearConfirm(true)} className="px-5 py-2.5 bg-white text-red-600 border border-red-100 hover:bg-red-50 rounded-xl flex items-center gap-2 text-[11px] font-black uppercase transition-all shadow-sm">
                    <Trash2 size={16} /> Limpiar Tabla
                </button>
             )}

             <button onClick={refreshSystem} disabled={isRefreshing} className="px-6 py-2.5 bg-[#1F2937] text-white rounded-xl flex items-center gap-2 text-[11px] font-black uppercase transition-all shadow-lg hover:bg-slate-800">
                <RefreshCw size={16} className={isRefreshing ? 'animate-spin' : ''} /> Actualizar
             </button>
          </div>
        </header>

        {currentView === 'import' ? (
            <ImportView files={files} status={status} onFileSelect={(e) => e.target.files && setFiles(p => [...p, ...Array.from(e.target.files!)])} onRemoveFile={(idx) => setFiles(p => p.filter((_, i) => i !== idx))} onProcess={handleProcess} theme={theme} fleetDbCount={fleetDb.length} onDbUpload={handleDbUpload} />
        ) : currentView === 'expenses' ? (
            <ExpensesView expenses={expenses} onExpensesUpdated={setExpenses} onViewDetail={(t, r) => setModalData({ isOpen: true, title: t, type: 'list', dataType: 'expense', records: r })} theme={theme} />
        ) : currentView === 'settings' ? (
            <SettingsView currentUser={currentUser} currentTheme={theme} onUpdateTheme={setTheme} onLogout={() => setCurrentUser(null)} />
        ) : currentView === 'reports' ? (
            <ReportsView data={records} onRefreshData={refreshSystem} />
        ) : (
            <div className="space-y-8 pb-12">
                <Stats data={records} onCardClick={handleStatsClick} />
                <Charts data={records} />
                <DataTable 
                    data={records} 
                    onViewFile={handleViewFile} 
                    onRowDoubleClick={handleRowDetail}
                    onDelete={(ids) => { setRecordsToDelete(ids); setShowDeleteConfirm(true); }} 
                />
            </div>
        )}
      </main>
      <DetailModal modalData={modalData} onClose={() => setModalData(p => ({ ...p, isOpen: false }))} />
      <ConfirmModal isOpen={showDeleteConfirm} title="Eliminar Registros" message="¿Estás seguro de eliminar los registros seleccionados?" onConfirm={async () => { await deleteRecords(recordsToDelete, currentUser); refreshSystem(); }} onClose={() => setShowDeleteConfirm(false)} />
      <ConfirmModal isOpen={showClearConfirm} title="Limpiar Base de Datos" message="Esta acción eliminará TODOS los registros procesados. Esta acción no se puede deshacer." onConfirm={handleClearTable} onClose={() => setShowClearConfirm(false)} />
    </div>
  );
}

export default App;
