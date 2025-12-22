
import React, { useState, useEffect, useCallback } from 'react';
import { 
  getRecords, saveRecords, deleteRecords, clearRecords,
  getExpenses, 
  getFiles, saveFiles, getFileById,
  getFleet, saveFleet,
  getTheme, saveTheme,
  logAction
} from './utils/storage';
import { processDocuments } from './services/geminiService';
import { fileToBase64, parseExcelToCSV, parseExcelToRowArray } from './utils/excelParser';
import { 
  TruckRecord, ExpenseRecord, UploadedFile, 
  ProcessingStatus, View, User, ThemeSettings, 
  ModalData, FleetRecord 
} from './types';

import { Sidebar } from './components/Sidebar';
import { Stats } from './components/Stats';
import { Charts } from './components/Charts';
import { DataTable } from './components/DataTable';
import { ImportView } from './components/ImportView';
import { ExpensesView } from './components/ExpensesView';
import { SettingsView } from './components/SettingsView';
import { ReportsView } from './components/ReportsView';
import { LoginScreen } from './components/LoginScreen';
import { DetailModal } from './components/DetailModal';
import { ConfirmModal } from './components/ConfirmModal';
import { RefreshCw, Trash2, Calendar, Menu } from 'lucide-react';

const normalizeId = (id: string) => {
    if (!id) return "";
    // Limpiamos todo lo que no sea alfanumérico para la comparación base
    return String(id).trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
};

const generateRecordId = (r: any) => {
    const seed = `${normalizeId(r.tag || '')}-${r.patente}-${r.fecha}-${r.valor}-${r.concepto}-${Math.random()}`;
    return btoa(seed).replace(/[/+=]/g, '').substring(0, 32);
};

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [currentView, setCurrentView] = useState<View>('dashboard');
  const [records, setRecords] = useState<TruckRecord[]>([]);
  const [expenses, setExpenses] = useState<ExpenseRecord[]>([]);
  const [files, setFiles] = useState<File[]>([]);
  const [status, setStatus] = useState<ProcessingStatus>({ isProcessing: false, error: null, success: false });
  const [fleetDb, setFleetDb] = useState<FleetRecord[]>([]);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [theme, setTheme] = useState<ThemeSettings>({ primaryColor: 'slate', fontFamily: 'inter', processingMode: 'free' });
  const [modalData, setModalData] = useState<ModalData>({ isOpen: false, title: '', type: 'list' });
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  const refreshSystem = useCallback(async () => {
    setIsRefreshing(true);
    try {
        const [recs, exps, fleet, savedTheme] = await Promise.all([
          getRecords(), getExpenses(), getFleet(), getTheme()
        ]);
        setRecords(recs || []);
        setExpenses(exps || []);
        setFleetDb(fleet || []);
        if (savedTheme) setTheme(savedTheme);
    } catch (err) {
        console.error("Error refreshing:", err);
    } finally {
        setTimeout(() => setIsRefreshing(false), 500);
    }
  }, []);

  useEffect(() => {
    refreshSystem();
  }, [refreshSystem]);

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
              const oIdx = headers.findIndex(c => /responsable|dueño|titular/i.test(c));
              const tIdx = headers.findIndex(c => /tag|dispositivo/i.test(c));
              const eIdx = headers.findIndex(c => /equipo|interno/i.test(c));

              const deduplicatedMap = new Map<string, FleetRecord>();

              rawData.slice(headerRowIdx + 1).forEach(row => {
                  const rawPatente = pIdx !== -1 ? String(row[pIdx] || '').toUpperCase().replace(/[^A-Z0-9]/g, '').trim() : '';
                  const rawTag = tIdx !== -1 ? String(row[tIdx] || '').trim() : '';
                  const normTag = normalizeId(rawTag);
                  const dueno = oIdx !== -1 ? String(row[oIdx] || 'Desconocido').trim() : 'Desconocido';
                  const equipo = eIdx !== -1 ? String(row[eIdx] || '').trim() : '';

                  if (rawPatente.length < 3 && normTag.length < 4) return;
                  const key = rawPatente || `TAG_${normTag}`;
                  
                  const existing = deduplicatedMap.get(key);
                  if (existing) {
                      if (!existing.tag && normTag) existing.tag = normTag;
                      if (!existing.equipo && equipo) existing.equipo = equipo;
                      if ((!existing.dueno || existing.dueno === 'Desconocido') && dueno !== 'Desconocido') existing.dueno = dueno;
                  } else {
                      deduplicatedMap.set(key, { patente: rawPatente, dueno, tag: normTag, equipo });
                  }
              });

              const finalFleet = Array.from(deduplicatedMap.values());
              await saveFleet(finalFleet, currentUser!);
              alert(`Base maestra actualizada: ${finalFleet.length} registros únicos.`);
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
        let mimeType = file.name.toLowerCase().endsWith('.pdf') ? "application/pdf" : "text/plain";

        try {
          content = file.name.toLowerCase().endsWith('.pdf') ? await fileToBase64(file) : await parseExcelToCSV(file);
          const response = await processDocuments([{ mimeType, data: content }]);
          const results = response.items;
          
          const enriched = results.map(r => {
            const normRecTag = normalizeId(r.tag || "");
            const normRecPatente = r.patente?.toUpperCase().trim();

            const fleetMatch = fleetDb.find(f => {
                const normDbTag = normalizeId(f.tag || "");
                const normDbPatente = f.patente?.toUpperCase().trim();
                const matchesTag = normRecTag && normDbTag && (normRecTag === normDbTag || normRecTag.endsWith(normDbTag) || normDbTag.endsWith(normRecTag));
                const matchesPatente = normRecPatente && normDbPatente && normRecPatente === normDbPatente;
                return matchesTag || matchesPatente;
            });

            return {
              ...r,
              id: generateRecordId(r),
              sourceFileId: fileId,
              sourceFileName: file.name,
              dueno: fleetMatch?.dueno || r.dueno,
              equipo: fleetMatch?.equipo || r.equipo,
              patente: fleetMatch?.patente || r.patente,
              tag: fleetMatch?.tag || r.tag,
              isVerified: !!fleetMatch
            };
          });

          allNewRecords.push(...enriched);
          filesToSave.push({ id: fileId, name: file.name, type: file.type, size: file.size, content });
          successCount++;
          setStatus(p => ({ ...p, processedCount: successCount }));
          
          if (theme.processingMode !== 'fast' && files.length > 1) await new Promise(r => setTimeout(r, 5000));
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

  if (!currentUser) return <LoginScreen onLogin={(user) => { setCurrentUser(user); logAction(user, 'LOGIN', 'Sistema', 'Inicio exitoso'); }} themeColor="slate" />;

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
    <div className={`flex h-screen bg-[#F8F9FA] font-${theme.fontFamily} overflow-hidden`}>
      <Sidebar currentView={currentView} onNavigate={setCurrentView} isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
      
      <main className="flex-1 flex flex-col h-full overflow-y-auto p-4 md:p-8">
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div className="flex items-center gap-3">
             <button className="md:hidden p-2 bg-white shadow rounded" onClick={() => setIsSidebarOpen(true)}><Menu size={24} /></button>
             <h2 className="text-3xl font-black text-slate-800 brand-font uppercase tracking-tighter">{getViewTitle()}</h2>
          </div>
          
          <div className="flex flex-wrap items-center gap-3">
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

        {currentView === 'dashboard' ? (
            <div className="space-y-8 pb-12">
                <Stats data={records} onCardClick={handleStatsClick} />
                <Charts data={records} onBarClick={(name) => setModalData({ isOpen: true, title: `Detalle: ${name}`, type: 'list', records: records.filter(r => r.dueno === name) })} />
                <DataTable data={records} onViewFile={handleViewFile} onRowDoubleClick={handleRowDetail} onDelete={(ids) => deleteRecords(ids, currentUser).then(refreshSystem)} />
            </div>
        ) : currentView === 'import' ? (
            <ImportView files={files} status={status} onFileSelect={(e) => e.target.files && setFiles(p => [...p, ...Array.from(e.target.files!)])} onRemoveFile={(idx) => setFiles(p => p.filter((_, i) => i !== idx))} onProcess={handleProcess} theme={theme} fleetDbCount={fleetDb.length} onDbUpload={handleDbUpload} />
        ) : currentView === 'expenses' ? (
            <ExpensesView expenses={expenses} onExpensesUpdated={(exps) => { setExpenses(exps); refreshSystem(); }} onViewDetail={(t, r) => setModalData({ isOpen: true, title: t, type: 'list', dataType: 'expense', records: r })} theme={theme} />
        ) : currentView === 'reports' ? (
            <ReportsView data={records} onRefreshData={refreshSystem} />
        ) : (
            <SettingsView currentUser={currentUser} currentTheme={theme} onUpdateTheme={(t) => { setTheme(t); saveTheme(t); }} onLogout={() => setCurrentUser(null)} />
        )}
      </main>

      <DetailModal modalData={modalData} onClose={() => setModalData(p => ({ ...p, isOpen: false }))} />
      <ConfirmModal isOpen={showClearConfirm} title="Limpiar Base de Datos" message="Esta acción eliminará TODOS los registros procesados. Esta acción no se puede deshacer." onConfirm={handleClearTable} onClose={() => setShowClearConfirm(false)} />
    </div>
  );
};

export default App;
