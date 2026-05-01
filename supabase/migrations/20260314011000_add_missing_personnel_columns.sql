
-- Migration to add missing columns to personnel table
ALTER TABLE public.personnel ADD COLUMN IF NOT EXISTS entite TEXT NOT NULL DEFAULT 'SAMES CI';
ALTER TABLE public.personnel ADD COLUMN IF NOT EXISTS photo_profil_url TEXT;
