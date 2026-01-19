export interface ExcelRow {
  [key: string]: string | number | boolean | null;
}

export interface ColumnMapping {
  idColumn: string;       // Unique ID for QR matching
  nameColumn: string;     // Participant Name
  emailColumn: string;    // Email Address
  teamColumn: string;     // Team Name
  eventColumn: string;    // Event Name
  paymentColumn: string;  // Payment Status
}

export enum ScanStatus {
  IDLE = 'IDLE',
  SCANNING = 'SCANNING',
  VERIFYING = 'VERIFYING',
  SUCCESS = 'SUCCESS',
  NOT_FOUND = 'NOT_FOUND',
  DUPLICATE = 'DUPLICATE',
  ERROR = 'ERROR'
}

export interface VerificationResult {
  status: ScanStatus;
  data?: ExcelRow;
  message?: string;
  timestamp: Date;
  scannedValue: string;
}

export interface ScanLog extends VerificationResult {
  id: string;
}