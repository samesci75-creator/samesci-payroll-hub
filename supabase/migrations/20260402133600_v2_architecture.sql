-- Création de la table chantiers
CREATE TABLE public.chantiers (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    nom TEXT NOT NULL,
    lieu TEXT,
    description TEXT,
    statut TEXT DEFAULT 'En cours',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.chantiers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enable all access for chantiers" ON public.chantiers FOR ALL USING (true) WITH CHECK (true);

-- Modification de agent_chantiers
ALTER TABLE public.agent_chantiers ADD COLUMN chantier_id UUID REFERENCES public.chantiers(id) ON DELETE CASCADE;

-- Modification de pointages
ALTER TABLE public.pointages ADD COLUMN chantier_id UUID REFERENCES public.chantiers(id) ON DELETE CASCADE;
ALTER TABLE public.pointages ADD COLUMN montant_calcule NUMERIC;

-- ---- MIGRATION OPTIONNELLE DES DONNÉES ----
-- 1. Insérer les chantiers uniques existants
INSERT INTO public.chantiers (nom)
SELECT DISTINCT chantier FROM public.agent_chantiers WHERE chantier IS NOT NULL;

-- 2. Lier les ID dans agent_chantiers
UPDATE public.agent_chantiers ac
SET chantier_id = (SELECT id FROM public.chantiers c WHERE c.nom = ac.chantier LIMIT 1);

-- 3. Lier les ID dans pointages
UPDATE public.pointages p
SET chantier_id = (SELECT id FROM public.chantiers c WHERE c.nom = p.chantier LIMIT 1);
