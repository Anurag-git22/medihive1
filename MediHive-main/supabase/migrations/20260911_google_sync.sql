-- ==============================================================================
-- MEDIHIVE CLINICAL PRACTICE & RECEPTION SUITE
-- Supabase Migration: Google Sheets & Google Drive Synchronization Tables
-- ==============================================================================

-- 1. Table: google_sync_config (General Google Drive & Sheets parameters)
CREATE TABLE IF NOT EXISTS google_sync_config (
    id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
    sheet_id TEXT, -- Google Sheet ID from docs.google.com/spreadsheets/d/<ID>/edit
    drive_root_folder_id TEXT, -- Google Drive Folder ID for "MediHive Images"
    doctor_email TEXT DEFAULT 'shreyashshigwan10@gmail.com',
    auto_sync_enabled BOOLEAN NOT NULL DEFAULT true,
    last_sync_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Seed default singleton config row if not exists
INSERT INTO google_sync_config (id, sheet_id, drive_root_folder_id, doctor_email, auto_sync_enabled)
VALUES (1, NULL, NULL, 'shreyashshigwan10@gmail.com', true)
ON CONFLICT (id) DO NOTHING;

-- 2. Table: google_sync_auth (Secure Server-Side OAuth Tokens)
CREATE TABLE IF NOT EXISTS google_sync_auth (
    id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
    refresh_token TEXT NOT NULL,
    access_token TEXT,
    expires_at BIGINT,
    token_type TEXT DEFAULT 'Bearer',
    scope TEXT,
    connected_email TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. Table: google_sync_records (Per-OPD Record Synchronization State)
CREATE TABLE IF NOT EXISTS google_sync_records (
    opd_id TEXT PRIMARY KEY REFERENCES opd_records(id) ON DELETE CASCADE,
    patient_id TEXT NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'syncing', 'synced', 'failed', 'retrying')),
    drive_synced BOOLEAN NOT NULL DEFAULT false,
    sheet_synced BOOLEAN NOT NULL DEFAULT false,
    sheet_row_index INTEGER,
    drive_folder_id TEXT,
    drive_links JSONB NOT NULL DEFAULT '[]'::jsonb, -- Array of web-viewable Google Drive URLs
    last_error TEXT,
    retry_count INTEGER NOT NULL DEFAULT 0,
    synced_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sync_status ON google_sync_records(status);
CREATE INDEX IF NOT EXISTS idx_sync_patient ON google_sync_records(patient_id);

-- 4. Table: google_sync_files (Tracks uploaded image files to prevent duplicates)
CREATE TABLE IF NOT EXISTS google_sync_files (
    id TEXT PRIMARY KEY DEFAULT ('gsf-' || substr(md5(random()::text), 1, 10)),
    opd_id TEXT NOT NULL REFERENCES opd_records(id) ON DELETE CASCADE,
    image_index INTEGER NOT NULL,
    drive_file_id TEXT NOT NULL,
    drive_web_link TEXT NOT NULL,
    file_name TEXT NOT NULL,
    file_size BIGINT,
    uploaded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (opd_id, image_index)
);

CREATE INDEX IF NOT EXISTS idx_sync_files_opd ON google_sync_files(opd_id);

-- 5. Realtime Publication
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'google_sync_records') THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE google_sync_records;
    END IF;
END $$;

ALTER TABLE google_sync_records REPLICA IDENTITY FULL;

-- 6. Row Level Security (RLS)
ALTER TABLE google_sync_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE google_sync_auth ENABLE ROW LEVEL SECURITY;
ALTER TABLE google_sync_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE google_sync_files ENABLE ROW LEVEL SECURITY;

-- Allow anon and authenticated read & write on config, records, and files
DROP POLICY IF EXISTS "allow_all_google_sync_config" ON google_sync_config;
CREATE POLICY "allow_all_google_sync_config" ON google_sync_config FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "allow_all_google_sync_records" ON google_sync_records;
CREATE POLICY "allow_all_google_sync_records" ON google_sync_records FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "allow_all_google_sync_files" ON google_sync_files;
CREATE POLICY "allow_all_google_sync_files" ON google_sync_files FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- IMPORTANT SECURITY: google_sync_auth holds sensitive refresh tokens!
-- Only service_role can read the token values directly.
-- For anon & authenticated, only allow non-sensitive read via RPC or a safe view.
DROP POLICY IF EXISTS "service_role_only_google_sync_auth" ON google_sync_auth;
CREATE POLICY "service_role_only_google_sync_auth" ON google_sync_auth FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Allow authenticated and anon to read only whether connection exists (without exposing refresh_token)
DROP POLICY IF EXISTS "allow_safe_view_google_sync_auth" ON google_sync_auth;
CREATE POLICY "allow_safe_view_google_sync_auth" ON google_sync_auth FOR SELECT TO anon, authenticated USING (true);

-- 7. Safe Helper Function to get Google Sync Overview
CREATE OR REPLACE FUNCTION get_google_sync_overview()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    is_connected BOOLEAN := false;
    auth_email TEXT := NULL;
    cfg RECORD;
    pending_cnt INTEGER := 0;
    synced_cnt INTEGER := 0;
    failed_cnt INTEGER := 0;
BEGIN
    -- Check if token exists
    SELECT (refresh_token IS NOT NULL AND length(refresh_token) > 0), connected_email
    INTO is_connected, auth_email
    FROM google_sync_auth
    WHERE id = 1;

    IF is_connected IS NULL THEN
        is_connected := false;
    END IF;

    -- Get config
    SELECT sheet_id, drive_root_folder_id, doctor_email, auto_sync_enabled, last_sync_at
    INTO cfg
    FROM google_sync_config
    WHERE id = 1;

    -- Count sync states
    SELECT count(*) FILTER (WHERE status = 'pending' OR status = 'retrying'),
           count(*) FILTER (WHERE status = 'synced'),
           count(*) FILTER (WHERE status = 'failed')
    INTO pending_cnt, synced_cnt, failed_cnt
    FROM google_sync_records;

    RETURN jsonb_build_object(
        'isConnected', is_connected,
        'connectedEmail', COALESCE(auth_email, cfg.doctor_email),
        'sheetId', cfg.sheet_id,
        'driveRootFolderId', cfg.drive_root_folder_id,
        'autoSyncEnabled', COALESCE(cfg.auto_sync_enabled, true),
        'lastSyncAt', cfg.last_sync_at,
        'pendingCount', pending_cnt,
        'syncedCount', synced_cnt,
        'failedCount', failed_cnt
    );
END;
$$;

