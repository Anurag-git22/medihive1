// ==============================================================================
// MEDIHIVE GOOGLE INTEGRATION TYPES
// Types for Google Sheets & Google Drive Cloud Synchronization
// ==============================================================================

export type GoogleSyncStatus =
  | "pending"
  | "syncing"
  | "synced"
  | "failed"
  | "retrying";

export interface GoogleSyncConfig {
  id: number;
  sheetId: string | null;
  driveRootFolderId: string | null;
  doctorEmail: string;
  autoSyncEnabled: boolean;
  lastSyncAt: string | null;
}

export interface GoogleSyncAuthStatus {
  isConnected: boolean;
  email: string | null;
  scope?: string;
  updatedAt?: string;
  message?: string;
}

export interface GoogleSyncRecord {
  opdId: string;
  patientId: string;
  status: GoogleSyncStatus;
  driveSynced: boolean;
  sheetSynced: boolean;
  sheetRowIndex?: number | null;
  driveFolderId?: string | null;
  driveLinks: string[];
  lastError?: string | null;
  retryCount: number;
  syncedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface GoogleTestDiagnostics {
  oauth: { ok: boolean; message: string; email?: string };
  drive: { ok: boolean; message: string; folderName?: string };
  sheets: { ok: boolean; message: string; sheetTitle?: string };
  allPassed: boolean;
}

export interface GoogleSyncOverview {
  isConnected: boolean;
  connectedEmail: string | null;
  sheetId: string | null;
  driveRootFolderId: string | null;
  autoSyncEnabled: boolean;
  lastSyncAt: string | null;
  pendingCount: number;
  syncedCount: number;
  failedCount: number;
}
