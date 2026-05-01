
-- Table personnel
CREATE TABLE public.personnel (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  matricule TEXT NOT NULL UNIQUE,
  nom_prenom TEXT NOT NULL,
  type_contrat TEXT NOT NULL DEFAULT 'journalier',
  montant_journalier_frais NUMERIC NOT NULL DEFAULT 0,
  chantier TEXT NOT NULL DEFAULT '',
  telephone TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.personnel ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated read personnel" ON public.personnel
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow authenticated insert personnel" ON public.personnel
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Allow service role all on personnel" ON public.personnel
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Table pointages
CREATE TABLE public.pointages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  personnel_id UUID REFERENCES public.personnel(id) ON DELETE CASCADE NOT NULL,
  date_pointage DATE NOT NULL,
  present BOOLEAN NOT NULL DEFAULT true,
  valide_par_dt BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(personnel_id, date_pointage)
);

ALTER TABLE public.pointages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated read pointages" ON public.pointages
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow authenticated insert pointages" ON public.pointages
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Allow authenticated update pointages" ON public.pointages
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Allow service role all on pointages" ON public.pointages
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Table paiements
CREATE TABLE public.paiements (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  personnel_id UUID REFERENCES public.personnel(id) ON DELETE CASCADE NOT NULL,
  montant NUMERIC NOT NULL DEFAULT 0,
  date_paiement DATE NOT NULL DEFAULT CURRENT_DATE,
  photo_decharge_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.paiements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated read paiements" ON public.paiements
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow authenticated insert paiements" ON public.paiements
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Allow service role all on paiements" ON public.paiements
  FOR ALL TO service_role USING (true) WITH CHECK (true);
