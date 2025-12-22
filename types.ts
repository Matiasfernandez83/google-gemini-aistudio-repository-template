
export interface TruckRecord {
  id: string;
  patente: string;
  dueno: string;
  valor: number;
  concepto: string;
  fecha?: string; // Format YYYY-MM-DD
  hora?: string;  // HH:mm
  estacion?: string; // Cabina o peaje específico
  categoria_vehiculo?: string; // Cat 1, 2, 3, etc.
  tag?: string;
  sourceFileId?: string;
  sourceFileName?: string;
  isVerified?: boolean;
  equipo?: string;
  searchIndex?: string;
  isDuplicate?: boolean; // Para marcar registros que parecen repetidos
  documentTotal?: number; // Monto total que figura en el pie de la factura
  balanceDiff?: number;   // Diferencia entre suma de items y total factura
}

export interface CardStatement {
    id: string;
    sourceFileId: string;
    banco: string;
    titular: string;
    periodo: string;
    fechaVencimiento: string;
    totalResumen: number;
    totalPeajes?: number;
    timestamp: number;
}

export interface ExpenseRecord {
  id: string;
  statementId?: string;
  fecha: string;
  concepto: string;
  monto: number;
  categoria: 'PEAJE' | 'AUTOPISTA' | 'TELEPASE' | 'OTRO';
  sourceFileId: string;
  sourceFileName: string;
  searchIndex?: string;
}

export interface ProcessedStatementResult {
    metadata: {
        banco: string;
        titular: string;
        periodo: string;
        fechaVencimiento: string;
        totalResumen: number;
    };
    items: {
        fecha: string;
        concepto: string;
        monto: number;
        categoria: 'PEAJE' | 'AUTOPISTA' | 'TELEPASE' | 'OTRO';
    }[];
}

export interface FleetRecord {
  patente: string;
  dueno: string;
  tag?: string;
  equipo?: string;
}

export interface AuditLog {
  id: string;
  userId: string;
  userName: string;
  action: 'CREATE' | 'UPDATE' | 'DELETE' | 'LOGIN' | 'IMPORT' | 'EXPORT' | 'SETTINGS';
  module: string;
  details: string;
  timestamp: number;
}

export interface ProcessingStatus {
  isProcessing: boolean;
  error: string | null;
  success: boolean;
  processedCount?: number;
  totalCount?: number;
}

export interface UploadedFile {
  id?: string;
  name: string;
  type: string;
  size: number;
  content: string | ArrayBuffer | null;
  timestamp?: number;
}

export type View = 'dashboard' | 'import' | 'reports' | 'settings' | 'expenses';

export interface ModalData {
    isOpen: boolean;
    title: string;
    type: 'list' | 'detail';
    dataType?: 'truck' | 'expense';
    records?: TruckRecord[] | ExpenseRecord[];
    singleRecord?: TruckRecord;
}

export interface User {
    id: string;
    email: string;
    password: string;
    name: string;
    role: 'admin' | 'user';
    createdAt: number;
    isActive: boolean;
}

export interface ThemeSettings {
    primaryColor: 'blue' | 'green' | 'purple' | 'slate' | 'orange';
    fontFamily: 'inter' | 'roboto' | 'mono';
    processingMode?: 'free' | 'fast';
}
