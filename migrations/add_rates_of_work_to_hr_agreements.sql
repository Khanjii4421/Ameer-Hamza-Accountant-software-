-- Migration to add missing columns to hr_agreements table
-- Run this SQL in your Supabase project (SQL editor or via CLI)

ALTER TABLE public.hr_agreements
    ADD COLUMN IF NOT EXISTS rates_of_work TEXT DEFAULT '[]';

ALTER TABLE public.hr_agreements
    ADD COLUMN IF NOT EXISTS payment_schedule TEXT DEFAULT '[]';
