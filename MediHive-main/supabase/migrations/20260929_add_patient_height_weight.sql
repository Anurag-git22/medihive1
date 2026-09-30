-- ==============================================================================
-- MEDIHIVE CLINICAL PRACTICE & RECEPTION SUITE
-- Supabase Migration: Add Missing Height and Weight Columns to Patients Table
-- ==============================================================================
-- This migration fixes PGRST204 errors when inserting or updating patients.
-- Run this in your Supabase SQL Editor: https://supabase.com/dashboard/project/getcxhofzovwapazwtdn/sql

-- 1. Add height and weight columns if they do not already exist
ALTER TABLE IF EXISTS public.patients 
    ADD COLUMN IF NOT EXISTS height TEXT,
    ADD COLUMN IF NOT EXISTS weight TEXT;

-- 2. Notify PostgREST to reload its schema cache immediately
NOTIFY pgrst, 'reload schema';
