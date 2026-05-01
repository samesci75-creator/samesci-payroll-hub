
-- Migration to align database with code expectations and screenshot
-- 1. Add missing telephone column to personnel
ALTER TABLE public.personnel ADD COLUMN IF NOT EXISTS telephone TEXT;

-- 2. Handle the chantier / numero_affaire mismatch
-- If the code expects 'chantier' and DB has 'numero_affaire', 
-- we can either rename or add an alias (view) or just use 'numero_affaire' in code.
-- The user said "what clogs manual addition". The mismatch is the clog.
-- I will add 'chantier' column as an alias or just rename.
-- Given the screenshot has 'numero_affaire', I'll make sure 'chantier' also exists to avoid breaking existing code immediately, 
-- or better, I will fix the code to use 'numero_affaire'.
-- But wait, 'chantier' is common in French for construction sites.
ALTER TABLE public.personnel ADD COLUMN IF NOT EXISTS chantier TEXT;
UPDATE public.personnel SET chantier = numero_affaire WHERE chantier IS NULL AND numero_affaire IS NOT NULL;

-- 3. Handle paiements: montant vs montant_paye
ALTER TABLE public.paiements ADD COLUMN IF NOT EXISTS montant NUMERIC DEFAULT 0;
UPDATE public.paiements SET montant = montant_paye WHERE montant = 0 AND montant_paye IS NOT NULL;

-- 4. Ensure RLS allows Directeur to insert/update personnel
-- First, drop existing if they exist (based on previous research)
DROP POLICY IF EXISTS "Directeur read personnel" ON public.personnel;
CREATE POLICY "Directeur select personnel" ON public.personnel FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'directeur') OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Directeur insert personnel" ON public.personnel FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'directeur'));

CREATE POLICY "Directeur update personnel" ON public.personnel FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'directeur')) WITH CHECK (public.has_role(auth.uid(), 'directeur'));
