
import { FleetRecord, TruckRecord, ExpenseRecord, CardStatement, UploadedFile, User, ThemeSettings, AuditLog } from "../types";

const DB_NAME = 'LogisticaAI_DB';
const DB_VERSION = 6; // Updated for Statements Store
const STORES = {
  RECORDS: 'records',
  EXPENSES: 'expenses',
  STATEMENTS: 'statements', // New Store
  FLEET: 'fleet',
  FILES: 'files',
  USERS: 'users',
  SETTINGS: 'settings',
  AUDIT: 'audit'
};

// --- HELPER: SEARCH INDEX GENERATOR ---
const generateSearchIndex = (obj: any): string => {
    // Creates a normalized string of all searchable values for "Internal Memory"
    const values = [
        obj.patente, 
        obj.dueno, 
        obj.tag, 
        obj.concepto, 
        obj.equipo, 
        obj.fecha, // Added date to search index
        obj.sourceFileName
    ].filter(Boolean).join(' ').toLowerCase();
    
    // Remove accents and special chars
    return values.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
};

const openDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = (event) => reject('Error opening database');

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      
      // RECORDS (Trucks)
      if (!db.objectStoreNames.contains(STORES.RECORDS)) {
        const store = db.createObjectStore(STORES.RECORDS, { keyPath: 'id' });
        store.createIndex('fecha', 'fecha', { unique: false });
        store.createIndex('patente', 'patente', { unique: false });
      } else {
         const store = request.transaction!.objectStore(STORES.RECORDS);
         if (!store.indexNames.contains('fecha')) store.createIndex('fecha', 'fecha', { unique: false });
      }

      // EXPENSES
      if (!db.objectStoreNames.contains(STORES.EXPENSES)) {
        const store = db.createObjectStore(STORES.EXPENSES, { keyPath: 'id' });
        store.createIndex('fecha', 'fecha', { unique: false });
      }

      // STATEMENTS (New)
      if (!db.objectStoreNames.contains(STORES.STATEMENTS)) {
        const store = db.createObjectStore(STORES.STATEMENTS, { keyPath: 'id' });
        store.createIndex('sourceFileId', 'sourceFileId', { unique: false });
      }

      // FLEET
      if (!db.objectStoreNames.contains(STORES.FLEET)) {
        db.createObjectStore(STORES.FLEET, { autoIncrement: true });
      }

      // FILES
      if (!db.objectStoreNames.contains(STORES.FILES)) {
        db.createObjectStore(STORES.FILES, { keyPath: 'id' });
      }

      // USERS
      if (!db.objectStoreNames.contains(STORES.USERS)) {
        const userStore = db.createObjectStore(STORES.USERS, { keyPath: 'email' });
        userStore.add({
            id: 'admin-1',
            email: 'admin@transportefurlong.com.ar',
            password: 'admin', 
            name: 'Administrador Sistema',
            role: 'admin',
            createdAt: Date.now(),
            isActive: true
        });
      }

      // SETTINGS
      if (!db.objectStoreNames.contains(STORES.SETTINGS)) {
        db.createObjectStore(STORES.SETTINGS, { keyPath: 'key' });
      }

      // AUDIT
      if (!db.objectStoreNames.contains(STORES.AUDIT)) {
        const auditStore = db.createObjectStore(STORES.AUDIT, { keyPath: 'id' });
        auditStore.createIndex('timestamp', 'timestamp', { unique: false });
        auditStore.createIndex('userId', 'userId', { unique: false });
      }
    };

    request.onsuccess = (event) => {
      resolve((event.target as IDBOpenDBRequest).result);
    };
  });
};

// --- AUDIT SYSTEM ---

export const logAction = async (
    user: User | null, 
    action: AuditLog['action'], 
    module: string, 
    details: string
): Promise<void> => {
    try {
        const db = await openDB();
        const tx = db.transaction(STORES.AUDIT, 'readwrite');
        const store = tx.objectStore(STORES.AUDIT);
        
        const log: AuditLog = {
            id: `log-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
            userId: user ? user.id : 'system',
            userName: user ? user.name : 'System/Guest',
            action,
            module,
            details,
            timestamp: Date.now()
        };
        
        store.add(log);
    } catch (e) {
        console.error("Audit log failed", e); // Should not block app flow
    }
};

export const getAuditLogs = async (): Promise<AuditLog[]> => {
    const db = await openDB();
    return new Promise((resolve) => {
        const tx = db.transaction(STORES.AUDIT, 'readonly');
        const store = tx.objectStore(STORES.AUDIT);
        const index = store.index('timestamp');
        // Get in reverse order (newest first)
        const request = index.getAll();
        request.onsuccess = () => {
            resolve(request.result.sort((a, b) => b.timestamp - a.timestamp));
        };
    });
};

// --- RECORDS (Trucks) ---

export const saveRecords = async (records: TruckRecord[], currentUser?: User | null): Promise<void> => {
  const db = await openDB();
  const tx = db.transaction(STORES.RECORDS, 'readwrite');
  const store = tx.objectStore(STORES.RECORDS);
  
  records.forEach(record => {
      record.searchIndex = generateSearchIndex(record);
      store.put(record);
  });
  
  if (currentUser) {
      logAction(currentUser, 'IMPORT', 'Registros', `Importados ${records.length} movimientos de camiones.`);
  }

  return new Promise((resolve) => { tx.oncomplete = () => resolve(); });
};

export const getRecords = async (): Promise<TruckRecord[]> => {
  const db = await openDB();
  return new Promise((resolve) => {
    const tx = db.transaction(STORES.RECORDS, 'readonly');
    const store = tx.objectStore(STORES.RECORDS);
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => resolve([]);
  });
};

export const clearRecords = async (currentUser: User): Promise<void> => {
    const db = await openDB();
    const tx = db.transaction(STORES.RECORDS, 'readwrite');
    tx.objectStore(STORES.RECORDS).clear();
    logAction(currentUser, 'DELETE', 'Registros', 'Tabla de movimientos limpiada completamente.');
    return new Promise((resolve) => tx.oncomplete = () => resolve());
};

export const deleteRecords = async (ids: string[], currentUser?: User): Promise<void> => {
    const db = await openDB();
    const tx = db.transaction(STORES.RECORDS, 'readwrite');
    const store = tx.objectStore(STORES.RECORDS);
    ids.forEach(id => store.delete(id));
    
    if (currentUser) {
        logAction(currentUser, 'DELETE', 'Registros', `Eliminados ${ids.length} movimientos.`);
    }
    return new Promise((resolve) => tx.oncomplete = () => resolve());
};

// --- STATEMENTS & EXPENSES (New Logic) ---

export const saveStatements = async (statements: CardStatement[]): Promise<void> => {
    const db = await openDB();
    const tx = db.transaction(STORES.STATEMENTS, 'readwrite');
    const store = tx.objectStore(STORES.STATEMENTS);
    statements.forEach(stmt => store.put(stmt));
    return new Promise((resolve) => { tx.oncomplete = () => resolve(); });
};

export const getStatements = async (): Promise<CardStatement[]> => {
    const db = await openDB();
    return new Promise((resolve) => {
        const tx = db.transaction(STORES.STATEMENTS, 'readonly');
        const store = tx.objectStore(STORES.STATEMENTS);
        const request = store.getAll();
        request.onsuccess = () => resolve(request.result || []);
        request.onerror = () => resolve([]);
    });
};

export const saveExpenses = async (records: ExpenseRecord[], currentUser?: User | null): Promise<void> => {
  const db = await openDB();
  const tx = db.transaction(STORES.EXPENSES, 'readwrite');
  const store = tx.objectStore(STORES.EXPENSES);
  
  records.forEach(record => {
      record.searchIndex = generateSearchIndex(record);
      store.put(record);
  });

  if (currentUser) {
     logAction(currentUser, 'IMPORT', 'Gastos', `Importados ${records.length} gastos de tarjetas/peajes.`);
  }

  return new Promise((resolve) => { tx.oncomplete = () => resolve(); });
};

export const getExpenses = async (): Promise<ExpenseRecord[]> => {
  const db = await openDB();
  return new Promise((resolve) => {
    const tx = db.transaction(STORES.EXPENSES, 'readonly');
    const store = tx.objectStore(STORES.EXPENSES);
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => resolve([]);
  });
};

export const deleteExpenses = async (ids: string[], currentUser?: User): Promise<void> => {
    const db = await openDB();
    const tx = db.transaction(STORES.EXPENSES, 'readwrite');
    const store = tx.objectStore(STORES.EXPENSES);
    ids.forEach(id => store.delete(id));
    if (currentUser) {
        logAction(currentUser, 'DELETE', 'Gastos', `Eliminados ${ids.length} gastos.`);
    }
    return new Promise((resolve) => tx.oncomplete = () => resolve());
};

// --- FILES (Batch Deletion Update) ---

export const deleteRecordsByFileId = async (fileId: string, currentUser?: User): Promise<void> => {
    await deleteBatchFiles([fileId], currentUser);
};

export const deleteBatchFiles = async (fileIds: string[], currentUser?: User): Promise<void> => {
    const db = await openDB();
    
    // 1. Get associated data to delete
    const allRecords = await getRecords();
    const allExpenses = await getExpenses();
    const allStatements = await getStatements();

    const recordsToDelete = allRecords.filter(r => r.sourceFileId && fileIds.includes(r.sourceFileId)).map(r => r.id);
    const expensesToDelete = allExpenses.filter(e => e.sourceFileId && fileIds.includes(e.sourceFileId)).map(e => e.id);
    const statementsToDelete = allStatements.filter(s => fileIds.includes(s.sourceFileId)).map(s => s.id);

    // 2. Open a multi-store transaction
    const tx = db.transaction([STORES.FILES, STORES.RECORDS, STORES.EXPENSES, STORES.STATEMENTS], 'readwrite');
    const fileStore = tx.objectStore(STORES.FILES);
    const recordStore = tx.objectStore(STORES.RECORDS);
    const expenseStore = tx.objectStore(STORES.EXPENSES);
    const statementStore = tx.objectStore(STORES.STATEMENTS);

    // 3. Execute Deletions
    fileIds.forEach(id => fileStore.delete(id));
    recordsToDelete.forEach(id => recordStore.delete(id));
    expensesToDelete.forEach(id => expenseStore.delete(id));
    statementsToDelete.forEach(id => statementStore.delete(id));

    return new Promise((resolve, reject) => {
        tx.oncomplete = async () => {
            if (currentUser) {
                await logAction(
                    currentUser, 
                    'DELETE', 
                    'Reportes', 
                    `Eliminación masiva: ${fileIds.length} archivos, ${statementsToDelete.length} resúmenes, ${expensesToDelete.length} gastos.`
                );
            }
            resolve();
        };
        tx.onerror = () => reject(tx.error);
    });
};

// --- FLEET ---

export const saveFleet = async (fleet: FleetRecord[], currentUser?: User): Promise<void> => {
  const db = await openDB();
  const tx = db.transaction(STORES.FLEET, 'readwrite');
  const store = tx.objectStore(STORES.FLEET);
  store.clear();
  fleet.forEach(item => store.add(item));
  if (currentUser) logAction(currentUser, 'UPDATE', 'Base Maestra', `Base de datos de flota actualizada (${fleet.length} items).`);
  return new Promise((resolve) => { tx.oncomplete = () => resolve(); });
};

export const getFleet = async (): Promise<FleetRecord[]> => {
  const db = await openDB();
  return new Promise((resolve) => {
    const tx = db.transaction(STORES.FLEET, 'readonly');
    const store = tx.objectStore(STORES.FLEET);
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => resolve([]);
  });
};

// --- FILES ---

export const saveFiles = async (files: UploadedFile[]): Promise<void> => {
    const db = await openDB();
    const tx = db.transaction(STORES.FILES, 'readwrite');
    const store = tx.objectStore(STORES.FILES);
    files.forEach(file => {
        const fileToSave = {
            ...file,
            id: file.id || `file-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            timestamp: Date.now(),
            originalFile: undefined
        };
        store.put(fileToSave);
    });
    return new Promise((resolve) => { tx.oncomplete = () => resolve(); });
};

export const getFiles = async (): Promise<UploadedFile[]> => {
    const db = await openDB();
    return new Promise((resolve) => {
        const tx = db.transaction(STORES.FILES, 'readonly');
        const store = tx.objectStore(STORES.FILES);
        const request = store.getAll();
        request.onsuccess = () => resolve(request.result.sort((a: any, b: any) => b.timestamp - a.timestamp));
        request.onerror = () => resolve([]);
    });
};

export const getFileById = async (id: string): Promise<UploadedFile | undefined> => {
    const db = await openDB();
    return new Promise((resolve) => {
        const tx = db.transaction(STORES.FILES, 'readonly');
        const store = tx.objectStore(STORES.FILES);
        const request = store.get(id);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => resolve(undefined);
    });
};

export const deleteFile = async (id: string): Promise<void> => {
    const db = await openDB();
    const tx = db.transaction(STORES.FILES, 'readwrite');
    tx.objectStore(STORES.FILES).delete(id);
    return new Promise((resolve) => tx.oncomplete = () => resolve());
};

// --- USERS ---

export const getUsers = async (): Promise<User[]> => {
    const db = await openDB();
    return new Promise((resolve) => {
        const tx = db.transaction(STORES.USERS, 'readonly');
        const store = tx.objectStore(STORES.USERS);
        const request = store.getAll();
        request.onsuccess = () => resolve(request.result || []);
        request.onerror = () => resolve([]);
    });
};

export const checkUserEmailExists = async (email: string): Promise<boolean> => {
    const users = await getUsers();
    return users.some(u => u.email.toLowerCase() === email.toLowerCase());
};

export const saveUser = async (user: User, currentUser?: User): Promise<void> => {
    const db = await openDB();
    const tx = db.transaction(STORES.USERS, 'readwrite');
    const store = tx.objectStore(STORES.USERS);
    store.put(user);
    if (currentUser) logAction(currentUser, 'CREATE', 'Usuarios', `Nuevo usuario creado: ${user.email}`);
    return new Promise((resolve) => { tx.oncomplete = () => resolve(); });
};

// --- SETTINGS ---

export const saveTheme = async (theme: ThemeSettings): Promise<void> => {
    const db = await openDB();
    const tx = db.transaction(STORES.SETTINGS, 'readwrite');
    const store = tx.objectStore(STORES.SETTINGS);
    store.put({ key: 'theme', value: theme });
    return new Promise((resolve) => { tx.oncomplete = () => resolve(); });
};

export const getTheme = async (): Promise<ThemeSettings | null> => {
    const db = await openDB();
    return new Promise((resolve) => {
        const tx = db.transaction(STORES.SETTINGS, 'readonly');
        const store = tx.objectStore(STORES.SETTINGS);
        const request = store.get('theme');
        request.onsuccess = () => resolve(request.result ? request.result.value : null);
        request.onerror = () => resolve(null);
    });
};
