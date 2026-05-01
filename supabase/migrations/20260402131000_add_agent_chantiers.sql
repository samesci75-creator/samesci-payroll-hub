-- Création de la table agent_chantiers
CREATE TABLE public.agent_chantiers (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    personnel_id UUID REFERENCES public.personnel(id) ON DELETE CASCADE,
    chantier TEXT NOT NULL,
    numero_affaire TEXT,
    montant_journalier_frais NUMERIC DEFAULT 0,
    actif BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Active RLS sur agent_chantiers
ALTER TABLE public.agent_chantiers ENABLE ROW LEVEL SECURITY;

-- Autorise tout le monde à lire et écrire (à ajuster selon la vraie politique)
CREATE POLICY "Enable all access for agent_chantiers" ON public.agent_chantiers FOR ALL USING (true) WITH CHECK (true);

-- Ajouter la colonne chantier à la table pointages
ALTER TABLE public.pointages ADD COLUMN chantier TEXT;

-- Migration des données existantes (de personnel vers agent_chantiers)
-- Uniquement pour ceux qui ont un chantier défini
INSERT INTO public.agent_chantiers (personnel_id, chantier, numero_affaire, montant_journalier_frais)
SELECT id, chantier, numero_affaire, montant_journalier_frais
FROM public.personnel
WHERE chantier IS NOT NULL AND chantier != '';

-- Mettre à jour pointages avec le chantier de l'agent pour conserver l'historique
UPDATE public.pointages p
SET chantier = (
    SELECT chantier 
    FROM public.personnel per 
    WHERE per.id = p.personnel_id
)
WHERE chantier IS NULL;
