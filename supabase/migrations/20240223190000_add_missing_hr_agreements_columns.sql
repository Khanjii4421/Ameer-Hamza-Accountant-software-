-- Add missing columns to hr_agreements table
ALTER TABLE public.hr_agreements
    ADD COLUMN IF NOT EXISTS rates_of_work TEXT DEFAULT '[]';
ALTER TABLE public.hr_agreements
    ADD COLUMN IF NOT EXISTS payment_schedule TEXT DEFAULT '[]';
