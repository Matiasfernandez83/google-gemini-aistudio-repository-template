

// Global definition for process.env to satisfy TypeScript in browser
declare global {
  interface Window {
    process: {
      env: {
        [key: string]: string | undefined;
      };
    };
  }
}

export interface TruckRecord {
  id: string;
  patente: string;
  dueno: string;
  valor: number;
  concepto: string;
  fecha?: string; // Format YYYY-MM-DD
  tag?: string;
  sourceFileId?: string;
  sourceFileName?: string;
  isVerified?: boolean;
  registeredOwner?: string;
  equipo?: string;
  // Internal Memory Optimization
  searchIndex?: string; // Normalized string for fast search
}

export interface CardStatement {
    id: string;
    sourceFileId: string;
    banco: string;       // Galicia, Santander, Amex, etc.
    titular: string;     // Nombre del dueño de la tarjeta
    periodo: string;     // Ej: "01 Feb - 28 Feb"
    fechaVencimiento: string; // YYYY-MM-DD
    totalResumen: number; // El total a pagar de TODO el resumen (no solo peajes)
    totalPeajes?: number; // Suma calculada de los items extraídos
    timestamp: number;
}

export interface ExpenseRecord {
  id: string;
  statementId?: string; // Link to parent statement
  fecha: string;
  concepto: string;
  monto: number;
  categoria: 'PEAJE' | 'AUTOPISTA' | 'TELEPASE' | 'OTRO';
  sourceFileId: string;
  sourceFileName: string;
  searchIndex?: string;
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
  originalFile?: File;
  timestamp?: number;
}

export enum FileType {
  PDF = 'application/pdf',
  EXCEL = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  EXCEL_OLD = 'application/vnd.ms-excel',
}

export type View = 'dashboard' | 'import' | 'reports' | 'settings' | 'expenses';

export interface ModalData {
    isOpen: boolean;
    title: string;
    type: 'list' | 'detail';
    dataType?: 'truck' | 'expense'; // Added to handle different column rendering
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
    isActive: boolean; // New field for security
}

export interface ThemeSettings {
    primaryColor: 'blue' | 'green' | 'purple' | 'slate' | 'orange';
    fontFamily: 'inter' | 'roboto' | 'mono';
    processingMode?: 'free' | 'fast';
}

export interface AppConfig {
    theme: ThemeSettings;
    currentUser: User | null;
}

export interface PaginationState {
    currentPage: number;
    itemsPerPage: number;
}