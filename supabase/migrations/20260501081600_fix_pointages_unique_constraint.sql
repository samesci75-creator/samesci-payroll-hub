-- Migration pour permettre le pointage d'un agent sur plusieurs chantiers le même jour

-- 1. S'assurer que tous les pointages ont un chantier_id (nettoyage)
UPDATE public.pointages p
SET chantier_id = (SELECT id FROM public.chantiers c WHERE c.nom = p.chantier LIMIT 1)
WHERE chantier_id IS NULL AND chantier IS NOT NULL;

-- 2. Supprimer l'ancienne contrainte unique (personnel_id, date_pointage)
ALTER TABLE public.pointages DROP CONSTRAINT IF EXISTS pointages_personnel_id_date_pointage_key;

DO $$
DECLARE
    constraint_name_rec RECORD;
BEGIN
    FOR constraint_name_rec IN 
        SELECT conname 
        FROM pg_constraint 
        WHERE conrelid = 'public.pointages'::regclass 
        AND contype = 'u' 
        AND conname LIKE '%personnel_id%date_pointage%'
    LOOP
        EXECUTE 'ALTER TABLE public.pointages DROP CONSTRAINT ' || quote_ident(constraint_name_rec.conname);
    END LOOP;
END $$;

-- 3. Créer la nouvelle contrainte unique incluant chantier_id
CREATE UNIQUE INDEX IF NOT EXISTS pointages_personnel_date_chantier_unique_idx ON public.pointages (personnel_id, date_pointage, chantier_id);

-- Ajouter la contrainte formelle basée sur l'index
ALTER TABLE public.pointages ADD CONSTRAINT pointages_personnel_date_chantier_unique UNIQUE USING INDEX pointages_personnel_date_chantier_unique_idx;
