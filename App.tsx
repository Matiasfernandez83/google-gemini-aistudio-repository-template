
import React, { useState, useRef, useEffect, useMemo } from 'react';
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
import { Database, CheckCircle2, ArrowRightLeft, FileSpreadsheet, AlertTriangle, RefreshCw, Menu, Calendar, Trash2, UploadCloud, ChevronDown } from 'lucide-react';
import { TruckRecord, ExpenseRecord, ProcessingStatus, FileType, FleetRecord, View, UploadedFile, ModalData, User, ThemeSettings } from './types';
import { parseExcelToCSV, fileToBase64, parseExcelToJSON } from './utils/excelParser';
import { processDocuments, convertPdfToData } from './services/geminiService';
import { getRecords, saveRecords, getFleet, saveFleet, saveFiles, clearRecords, getTheme, saveTheme, getFileById, getExpenses, deleteRecords, logAction } from './utils/storage';
import clsx from 'clsx';

function App() {
  // --- AUTH & THEME STATE ---
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [theme, setTheme] = useState<ThemeSettings>({ 
      primaryColor: 'blue', 
      fontFamily: 'inter', 
      processingMode: 'free'
  });

  const [currentView, setCurrentView] = useState<View>('dashboard');
  const [records, setRecords] = useState<TruckRecord[]>([]);
  const [expenses, setExpenses] = useState<ExpenseRecord[]>([]);
  const [fleetDb, setFleetDb] = useState<FleetRecord[]>([]);
  const [files, setFiles] = useState<File[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  // --- DATE FILTER STATE (GLOBAL) ---
  const [dateFilter, setDateFilter] = useState<{start: string, end: string}>({ start: '', end: '' });
  const startDateRef = useRef<HTMLInputElement>(null);
  const endDateRef = useRef<HTMLInputElement>(null);

  // Mobile Sidebar State
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const [importTab, setImportTab] = useState<'process' | 'convert'>('process');
  
  const [convertFile, setConvertFile] = useState<File | null>(null);
  const [isConverting, setIsConverting] = useState(false);

  const [status, setStatus] = useState<ProcessingStatus>({
    isProcessing: false,
    error: null,
    success: false
  });
  
  const [modalData, setModalData] = useState<ModalData>({
      isOpen: false,
      title: '',
      type: 'list'
  });
  
  // State for Confirmation Modals
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [recordsToDelete, setRecordsToDelete] = useState<string[]>([]);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // --- INITIALIZATION ---
  const refreshSystem = async () => {
    setIsRefreshing(true);
    try {
        // Load theme
        try {
            const savedTheme = await getTheme();
            if (savedTheme) setTheme(savedTheme);
        } catch (themeError) {
            console.warn("Could not load theme settings");
        }

        // Load Records (Trucks)
        try {
            const savedRecords = await getRecords();
            setRecords(savedRecords || []);
        } catch (recordError) {
            console.error("Failed to load records from DB");
        }

        // Load Expenses (Credit Cards)
        try {
            const savedExpenses = await getExpenses();
            setExpenses(savedExpenses || []);
        } catch (err) {
            console.error("Failed to load expenses");
        }

        // Load Fleet
        try {
            const savedFleet = await getFleet();
            setFleetDb(savedFleet || []);
        } catch (fleetError) {
            console.error("Failed to load fleet from DB");
        }
    } catch (e) {
        console.error("System refresh failed", e);
    } finally {
        setTimeout(() => setIsRefreshing(false), 500); // Visual feedback delay
    }
  };

  useEffect(() => {
    refreshSystem();
  }, []);

  useEffect(() => {
      const fontMap = {
          'inter': 'Inter, sans-serif',
          'roboto': 'Roboto, sans-serif',
          'mono': 'monospace'
      };
      document.body.style.fontFamily = fontMap[theme.fontFamily];
  }, [theme]);

  // --- GLOBAL FILTER LOGIC ---
  const filteredRecords = useMemo(() => {
    let res = records;
    if (dateFilter.start) {
        res = res.filter(r => r.fecha && r.fecha >= dateFilter.start);
    }
    if (dateFilter.end) {
        res = res.filter(r => r.fecha && r.fecha <= dateFilter.end);
    }
    return res;
  }, [records, dateFilter]);

  const filteredExpenses = useMemo(() => {
    let res = expenses;
    if (dateFilter.start) {
        res = res.filter(e => e.fecha && e.fecha >= dateFilter.start);
    }
    if (dateFilter.end) {
        res = res.filter(e => e.fecha && e.fecha <= dateFilter.end);
    }
    return res;
  }, [expenses, dateFilter]);

  const handleLogin = (user: User) => {
      setCurrentUser(user);
      logAction(user, 'LOGIN', 'Sistema', 'Inicio de sesión exitoso');
  };

  const handleUpdateTheme = async (newTheme: ThemeSettings) => {
      setTheme(newTheme);
      await saveTheme(newTheme);
      if (currentUser) logAction(currentUser, 'SETTINGS', 'Tema', 'Configuración visual actualizada');
  };

  const normalize = (str: string | undefined) => str ? str.replace(/[\s-]/g, '').toUpperCase() : '';

  // --- LOGIC: VERIFICATION ---
  const verifyRecords = (currentRecords: TruckRecord[], currentDb: FleetRecord[]): TruckRecord[] => {
      return currentRecords.map(record => {
          let match: FleetRecord | undefined;
          
          if (record.tag) {
             const normRecordTag = normalize(record.tag);
             if (normRecordTag.length > 4) {
                 match = currentDb.find(dbItem => {
                     const normDbTag = normalize(dbItem.tag);
                     return normDbTag && (normDbTag.includes(normRecordTag) || normRecordTag.includes(normDbTag));
                 });
             }
          }

          if (!match && record.patente) {
              const normRecordPlate = normalize(record.patente);
              if (normRecordPlate.length > 4) {
                 match = currentDb.find(dbItem => normalize(dbItem.patente) === normRecordPlate);
              }
          }

          if (match) {
              return {
                  ...record,
                  patente: match.patente || record.patente,
                  dueno: match.dueno && match.dueno !== 'Desconocido' ? match.dueno : record.dueno,
                  equipo: match.equipo || '',
                  tag: match.tag || record.tag,
                  registeredOwner: match.dueno,
                  isVerified: true
              };
          }
          
          return { ...record, isVerified: false, registeredOwner: undefined, equipo: '' };
      });
  };

  // --- LOGIC: OPEN FILE ---
  const handleViewFile = async (fileId: string) => {
      try {
          const fileData = await getFileById(fileId);
          if (!fileData || !fileData.content) {
              alert("Archivo no encontrado o contenido dañado.");
              return;
          }

          const base64 = fileData.content as string;
          const mimeType = fileData.type;
          
          const byteCharacters = atob(base64);
          const byteNumbers = new Array(byteCharacters.length);
          for (let i = 0; i < byteCharacters.length; i++) {
              byteNumbers[i] = byteCharacters.charCodeAt(i);
          }
          const byteArray = new Uint8Array(byteNumbers);
          const blob = new Blob([byteArray], { type: mimeType });
          const fileURL = URL.createObjectURL(blob);
          
          window.open(fileURL, '_blank');
          
      } catch (e) {
          console.error("Error opening file", e);
          alert("Error al abrir el archivo.");
      }
  };

  // --- LOGIC: CONVERTER (PDF <-> EXCEL) ---
  const handleConversion = async () => {
      if (!convertFile) return;
      setIsConverting(true);

      try {
          if (convertFile.name.endsWith('.xlsx') || convertFile.name.endsWith('.xls') || convertFile.name.endsWith('.csv')) {
              const jsonData = await parseExcelToJSON(convertFile);
              const { jsPDF } = await import('jspdf');
              const autoTableModule = await import('jspdf-autotable');
              const autoTable = (autoTableModule.default || autoTableModule) as any;

              const doc = new jsPDF();
              doc.setFontSize(16);
              doc.text(`Conversión: ${convertFile.name}`, 14, 20);
              doc.setFontSize(10);
              doc.text(`Generado por ERP Logística Integral - ${new Date().toLocaleDateString()}`, 14, 28);
              
              if (jsonData.length > 0) {
                  const headers = Object.keys(jsonData[0]);
                  const body = jsonData.map((row: any) => Object.values(row));
                  autoTable(doc, {
                      head: [headers],
                      body: body,
                      startY: 35,
                      theme: 'grid',
                      styles: { fontSize: 8 },
                      headStyles: { fillColor: theme.primaryColor === 'blue' ? [37, 99, 235] : [100, 100, 100] }
                  });
              }
              doc.save(`${convertFile.name.split('.')[0]}_convertido.pdf`);
          } 
          else if (convertFile.name.endsWith('.pdf')) {
              const base64 = await fileToBase64(convertFile);
              const data = await convertPdfToData([{ mimeType: 'application/pdf', data: base64 }]);
              
              if (data && data.length > 0) {
                  const XLSX = await import('xlsx');
                  const ws = XLSX.utils.json_to_sheet(data);
                  const wb = XLSX.utils.book_new();
                  XLSX.utils.book_append_sheet(wb, ws, "Datos Extraidos");
                  XLSX.writeFile(wb, `${convertFile.name.split('.')[0]}_convertido.xlsx`);
              } else {
                  throw new Error("La IA no pudo encontrar tablas en el PDF.");
              }
          } else {
              throw new Error("Formato no soportado. Use PDF o Excel.");
          }
          if (currentUser) logAction(currentUser, 'EXPORT', 'Conversor', `Conversión exitosa de: ${convertFile.name}`);

      } catch (e: any) {
          console.error("Error converting file", e);
          alert(`Error en conversión: ${e.message}`);
      } finally {
          setIsConverting(false);
          setConvertFile(null);
      }
  };


  // --- LOGIC: FILE PROCESSING ---
  const handleProcess = async () => {
    if (files.length === 0) return;
    let apiKey: string | undefined = undefined;
    try {
        if (typeof process !== 'undefined' && process.env) apiKey = process.env.API_KEY;
        if (!apiKey && typeof window !== 'undefined' && (window as any).process?.env) apiKey = (window as any).process.env.API_KEY;
    } catch(e) {}

    if (!apiKey) {
        setStatus({
            isProcessing: false,
            error: "ERROR CRÍTICO: API_KEY no encontrada.",
            success: false
        });
        return;
    }

    setStatus({ isProcessing: true, error: null, success: false, processedCount: 0, totalCount: files.length });
    let successCount = 0;
    const failedFiles: string[] = [];
    const newRecordsAcc: TruckRecord[] = [];
    const filesToSaveAcc: UploadedFile[] = [];
    const processingDelay = theme.processingMode === 'fast' ? 500 : 5000;

    try {
        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            try {
                const fileId = `file-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
                let contentData = '';
                let mimeType = '';

                if (file.type === FileType.PDF) {
                    contentData = await fileToBase64(file);
                    mimeType = 'application/pdf';
                } else if (file.type === FileType.EXCEL || file.type === FileType.EXCEL_OLD || file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
                    contentData = await parseExcelToCSV(file);
                    mimeType = 'text/plain';
                } else {
                    contentData = await fileToBase64(file);
                    mimeType = file.type || 'image/jpeg';
                }

                if (i > 0) await new Promise(resolve => setTimeout(resolve, processingDelay));

                const resultRecords = await processDocuments([{ mimeType, data: contentData }]);
                
                const recordsWithSource = resultRecords.map(r => ({
                    ...r,
                    sourceFileId: fileId,
                    sourceFileName: file.name
                }));

                const verifiedSubset = verifyRecords(recordsWithSource, fleetDb);
                newRecordsAcc.push(...verifiedSubset);

                filesToSaveAcc.push({
                    id: fileId,
                    name: file.name,
                    type: file.type,
                    size: file.size,
                    content: contentData
                });

                successCount++;
                setStatus(prev => ({ ...prev, processedCount: successCount }));

            } catch (fileErr: any) {
                console.error(`Error processing file ${file.name}:`, fileErr);
                failedFiles.push(`${file.name}: ${fileErr.message || 'Error'}`);
            }
        }

        if (newRecordsAcc.length > 0) {
            const allRecords = [...records, ...newRecordsAcc];
            setRecords(allRecords);
            await saveRecords(allRecords, currentUser);
            await saveFiles(filesToSaveAcc);
        }

        if (failedFiles.length > 0) {
            setStatus({ isProcessing: false, error: `Se procesaron ${successCount} archivos. Fallas: ${failedFiles.join(' | ')}`, success: successCount > 0 });
        } else {
             setStatus({ isProcessing: false, error: null, success: true });
            setFiles([]);
        }

    } catch (err: any) {
      console.error(err);
      setStatus({ isProcessing: false, error: "Error del sistema: " + (err.message || ''), success: false });
    }
  };

  const handleDbSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files[0]) {
          const file = e.target.files[0];
          try {
              const jsonData = await parseExcelToJSON(file);
              const fleetData: FleetRecord[] = jsonData.map((row: any) => {
                  const keys = Object.keys(row);
                  const findVal = (regex: RegExp) => {
                      const key = keys.find(k => regex.test(k));
                      return key ? String(row[key] || '').trim() : '';
                  };

                  const patente = findVal(/patente|dominio|placa|matricula/i);
                  const dueno = findVal(/dueño|propietario|responsable|titular|cliente|razon social|asignado/i) || 'Desconocido';
                  const tag = findVal(/tag|device|dispositivo|obn|serie/i);
                  const equipoKey = keys.find(k => (/equipo|unidad|interno|movil/i.test(k) && !/tag|device/i.test(k)));
                  const equipo = equipoKey ? String(row[equipoKey] || '').trim() : '';

                  return { patente, dueno, tag, equipo };
              }).filter(r => (r.patente && r.patente.length > 3) || (r.tag && r.tag.length > 4)); 

              setFleetDb(fleetData);
              await saveFleet(fleetData, currentUser!);
              
              if (records.length > 0) {
                  const updatedRecords = verifyRecords(records, fleetData);
                  setRecords(updatedRecords);
                  await saveRecords(updatedRecords, currentUser!);
              }
              alert(`Base de datos actualizada correctamente. ${fleetData.length} registros cargados.`);

          } catch (err) {
              alert("Error al leer base de datos. Verifique el formato Excel.");
          }
      }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFiles(prev => [...prev, ...Array.from(e.target.files!)]);
      setStatus({ isProcessing: false, error: null, success: false });
    }
  };

  const handleClearRecords = async () => {
      if(currentUser) await clearRecords(currentUser); 
      setRecords([]);
  };

  // Logic for deleting selected rows
  const triggerDeleteSelection = (ids: string[]) => {
      setRecordsToDelete(ids);
      setShowDeleteConfirm(true);
  };

  const confirmDeleteSelection = async () => {
      if (recordsToDelete.length > 0) {
          await deleteRecords(recordsToDelete, currentUser!);
          const remaining = records.filter(r => !recordsToDelete.includes(r.id));
          setRecords(remaining);
          setRecordsToDelete([]);
          setShowDeleteConfirm(false);
      }
  };

  const handleStatClick = (type: 'total' | 'trucks' | 'owners' | 'ops') => {
      let filtered = [...filteredRecords]; // Use filtered records for stats click too
      let title = "";
      switch(type) {
          case 'total': title = "Detalle General de Montos"; break;
          case 'trucks': title = "Registro Completo (Filtrado por Patente)"; filtered.sort((a, b) => a.patente.localeCompare(b.patente)); break;
          case 'owners': title = "Registro Completo (Filtrado por Dueño)"; filtered.sort((a, b) => a.dueno.localeCompare(b.dueno)); break;
          case 'ops': title = "Historial de Operaciones"; break;
      }
      if (filtered.length === 0) return;
      setModalData({ isOpen: true, title, type: 'list', dataType: 'truck', records: filtered });
  };

  const handleChartClick = (ownerName: string) => {
      const filtered = filteredRecords.filter(r => r.dueno === ownerName);
      if (filtered.length > 0) {
          setModalData({ isOpen: true, title: `Operaciones de: ${ownerName}`, type: 'list', dataType: 'truck', records: filtered });
      }
  };

  if (!currentUser) {
      return <LoginScreen onLogin={handleLogin} themeColor={theme.primaryColor} />;
  }

  // Common Header Helper for Dashboard and Expenses
  const renderDashboardToolbar = () => (
    <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3">
        {/* IMPROVED DATE PICKER */}
        <div className="flex items-center bg-white border border-slate-200 rounded-lg shadow-sm h-10 overflow-hidden group hover:border-blue-300 transition-colors">
            <button 
                className="px-3 h-full flex items-center gap-2 bg-slate-50 border-r border-slate-100 text-slate-600 hover:text-blue-600 transition-colors"
                onClick={() => {
                    if (startDateRef.current) {
                        // Attempt to open picker
                        try { startDateRef.current.showPicker(); } catch (e) { startDateRef.current.focus(); }
                    }
                }}
            >
                <Calendar size={16} />
                <span className="text-xs font-bold uppercase hidden sm:inline">Fecha</span>
            </button>
            <div className="flex items-center px-2 gap-2">
                <div className="relative">
                    <input 
                        ref={startDateRef}
                        type="date" 
                        className="text-sm text-slate-700 font-medium bg-transparent focus:outline-none cursor-pointer w-[110px]"
                        value={dateFilter.start}
                        onChange={(e) => setDateFilter(prev => ({ ...prev, start: e.target.value }))}
                        placeholder="Desde"
                    />
                </div>
                <span className="text-slate-300">→</span>
                <div className="relative">
                     <input 
                        ref={endDateRef}
                        type="date" 
                        className="text-sm text-slate-700 font-medium bg-transparent focus:outline-none cursor-pointer w-[110px]"
                        value={dateFilter.end}
                        onChange={(e) => setDateFilter(prev => ({ ...prev, end: e.target.value }))}
                        placeholder="Hasta"
                    />
                </div>
            </div>
            {(dateFilter.start || dateFilter.end) && (
                <button 
                    onClick={() => setDateFilter({ start: '', end: '' })} 
                    className="px-2 h-full text-slate-400 hover:text-red-500 hover:bg-red-50 border-l border-slate-100 transition-colors"
                    title="Limpiar fechas"
                >
                    <Trash2 size={14} />
                </button>
            )}
        </div>

        {/* QUICK ACTIONS TOOLBAR (Only for Dashboard View) */}
        {currentView === 'dashboard' && (
            <div className="flex items-center gap-2">
                <button 
                    onClick={() => setShowClearConfirm(true)}
                    className="h-10 px-4 bg-white border border-slate-200 text-red-600 rounded-lg text-sm font-medium hover:bg-red-50 hover:border-red-200 transition-colors shadow-sm flex items-center gap-2"
                    title="Limpiar todos los datos"
                >
                    <Trash2 size={16} /> <span className="hidden lg:inline">Limpiar Tabla</span>
                </button>
            </div>
        )}

        <button 
            onClick={refreshSystem}
            disabled={isRefreshing}
            className={`h-10 w-10 md:w-auto md:px-4 flex items-center justify-center gap-2 bg-slate-900 text-white rounded-lg text-sm font-medium hover:bg-slate-800 transition-all shadow-md ${isRefreshing ? 'opacity-70' : ''}`}
            title="Actualizar Sistema"
        >
            <RefreshCw size={16} className={isRefreshing ? 'animate-spin' : ''} />
            <span className="hidden md:inline">{isRefreshing ? 'Actualizando...' : 'Actualizar'}</span>
        </button>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 flex transition-colors duration-300">
      <Sidebar 
        currentView={currentView} 
        onNavigate={setCurrentView} 
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
      />
      
      <main className="md:ml-64 p-4 md:p-8 flex-1 overflow-y-auto h-screen w-full">
        {/* HEADER */}
        <header className="flex flex-col xl:flex-row justify-between xl:items-center mb-6 gap-4">
          <div className="flex items-center gap-4">
             <button className="md:hidden p-2 bg-white border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50" onClick={() => setIsSidebarOpen(true)}>
                <Menu size={24} />
             </button>

             <div>
                <h2 className="text-xl md:text-2xl font-bold text-slate-800 flex items-center gap-2">
                    {currentView === 'dashboard' ? 'Panel de Control' : 
                    currentView === 'import' ? 'Importador Inteligente' : 
                    currentView === 'expenses' ? 'Gastos de Tarjetas' :
                    currentView === 'reports' ? 'Reportes y Archivos' : 'Ajustes del Sistema'}
                </h2>
                <p className="text-sm text-slate-500 hidden md:block">
                     {currentView === 'dashboard' ? 'Visión general de operaciones y flota.' : 
                     currentView === 'import' ? 'Carga de archivos y gestión de base maestra.' : 
                     'Administración del sistema ERP.'}
                </p>
             </div>
          </div>
          
          {/* RENDER TOOLBAR FOR DASHBOARD OR EXPENSES */}
          {(currentView === 'dashboard' || currentView === 'expenses') && renderDashboardToolbar()}
        </header>
        
        {/* MAIN VIEWS */}
        {currentView === 'settings' ? (
              <SettingsView 
                        currentUser={currentUser} 
                        currentTheme={theme} 
                        onUpdateTheme={handleUpdateTheme}
                        onLogout={() => { setCurrentUser(null); logAction(currentUser, 'LOGIN', 'Sistema', 'Cierre de sesión'); }}
                     />
        ) : currentView === 'reports' ? (
              <ReportsView 
                data={records} 
                onRefreshData={refreshSystem} 
              />
        ) : currentView === 'expenses' ? (
              <ExpensesView 
                  expenses={filteredExpenses} 
                  onExpensesUpdated={setExpenses}
                  onViewDetail={(title, records) => setModalData({ isOpen: true, title, type: 'list', dataType: 'expense', records })}
                  theme={theme}
              />
        ) : currentView === 'import' ? (
                  <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                     <div className="flex p-1 bg-white rounded-xl shadow-sm border border-slate-100 w-full md:w-fit overflow-x-auto">
                        <button 
                            onClick={() => setImportTab('process')}
                            className={clsx(
                                "flex-1 md:flex-none px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2 whitespace-nowrap",
                                importTab === 'process' ? `bg-${theme.primaryColor}-50 text-${theme.primaryColor}-700 shadow-sm` : "text-slate-500 hover:text-slate-700"
                            )}
                        >
                            <Database size={16} /> Procesamiento ERP
                        </button>
                        <button 
                            onClick={() => setImportTab('convert')}
                            className={clsx(
                                "flex-1 md:flex-none px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2 whitespace-nowrap",
                                importTab === 'convert' ? `bg-${theme.primaryColor}-50 text-${theme.primaryColor}-700 shadow-sm` : "text-slate-500 hover:text-slate-700"
                            )}
                        >
                            <ArrowRightLeft size={16} /> Conversor
                        </button>
                     </div>

                     {importTab === 'process' ? (
                        <ImportView 
                            files={files} 
                            status={status} 
                            onFileSelect={handleFileSelect} 
                            onRemoveFile={(idx) => setFiles(prev => prev.filter((_, i) => i !== idx))} 
                            onProcess={handleProcess}
                            theme={theme}
                            fleetDbCount={fleetDb.length}
                            onDbUpload={handleDbSelect}
                        />
                     ) : (
                        <ConverterView 
                            convertFile={convertFile}
                            isConverting={isConverting}
                            onFileSelect={setConvertFile}
                            onConvert={handleConversion}
                            onClearFile={() => setConvertFile(null)}
                            theme={theme}
                        />
                     )}
                  </div>
        ) : (
                  <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-12">
                      
                      {/* STATS & CHARTS - FULL WIDTH */}
                      {filteredRecords.length > 0 ? (
                        <>
                            <Stats data={filteredRecords} onCardDoubleClick={handleStatClick} />
                            
                            <Charts data={filteredRecords} onBarClick={handleChartClick} />
                            
                            <DataTable 
                                data={filteredRecords} 
                                onRowDoubleClick={(r) => setModalData({ isOpen: true, title: 'Detalle', type: 'detail', dataType: 'truck', singleRecord: r })} 
                                onViewFile={handleViewFile}
                                onDelete={triggerDeleteSelection}
                            />
                        </>
                      ) : (
                          <div className="flex flex-col items-center justify-center py-20 bg-white rounded-xl border border-slate-200 border-dashed">
                              <div className="p-4 bg-slate-50 rounded-full mb-4">
                                  <Database className="text-slate-300" size={48} />
                              </div>
                              <h3 className="text-lg font-bold text-slate-700">Sin datos disponibles</h3>
                              <p className="text-slate-500 mb-6 text-center max-w-md">
                                  {dateFilter.start || dateFilter.end 
                                    ? "No se encontraron movimientos en el rango de fechas seleccionado."
                                    : "La base de datos está vacía. Dirígete a 'Importar Datos' para comenzar."
                                  }
                              </p>
                              {!(dateFilter.start || dateFilter.end) && (
                                  <button 
                                      onClick={() => setCurrentView('import')}
                                      className="px-6 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors shadow-sm"
                                  >
                                      Ir a Importar Datos
                                  </button>
                              )}
                          </div>
                      )}
                  </div>
        )}
      </main>
      <DetailModal modalData={modalData} onClose={() => setModalData(prev => ({ ...prev, isOpen: false }))} />
      
      {/* Global Clear Confirm */}
      <ConfirmModal 
        isOpen={showClearConfirm}
        title="¿Borrar todos los registros?"
        message="Esta acción eliminará todos los datos procesados de la tabla. Los archivos originales en el historial no se verán afectados."
        confirmText="Sí, Borrar Todo"
        onConfirm={handleClearRecords}
        onClose={() => setShowClearConfirm(false)}
      />

      {/* Selected Items Delete Confirm */}
      <ConfirmModal 
        isOpen={showDeleteConfirm}
        title="¿Eliminar registros seleccionados?"
        message={`Estás a punto de borrar ${recordsToDelete.length} registros de la base de datos principal.`}
        confirmText="Sí, Eliminar"
        isDestructive
        onConfirm={confirmDeleteSelection}
        onClose={() => setShowDeleteConfirm(false)}
      />
    </div>
  );
}

export default App;
