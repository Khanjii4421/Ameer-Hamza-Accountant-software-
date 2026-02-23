-- Run this in the Supabase SQL Editor to update or create the Agreements Table

CREATE TABLE IF NOT EXISTS public.hr_agreements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    party_one_name TEXT NOT NULL,
    party_one_details TEXT NOT NULL,
    scope_of_work TEXT, -- JSON string
    rates_of_work TEXT, -- JSON string
    payment_schedule TEXT, -- JSON string
    company_id TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- If you already have the table, run these ALTER commands to add the new columns:
-- ALTER TABLE public.hr_agreements ADD COLUMN IF NOT EXISTS rates_of_work TEXT DEFAULT '[]';
-- ALTER TABLE public.hr_agreements ADD COLUMN IF NOT EXISTS payment_schedule TEXT DEFAULT '[]';
-- ALTER TABLE public.hr_agreements DROP COLUMN IF EXISTS party_two_name;
