
-- Drop existing permissive policies on personnel
DROP POLICY IF EXISTS "Allow authenticated delete personnel" ON public.personnel;
DROP POLICY IF EXISTS "Allow authenticated insert personnel" ON public.personnel;
DROP POLICY IF EXISTS "Allow authenticated read personnel" ON public.personnel;

-- Personnel: admin full access, chef_chantier & directeur read-only
CREATE POLICY "Admin full access personnel" ON public.personnel FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Chef chantier read personnel" ON public.personnel FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'chef_chantier'));

CREATE POLICY "Directeur read personnel" ON public.personnel FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'directeur'));

CREATE POLICY "Caisse read personnel" ON public.personnel FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'caisse'));

-- Drop existing permissive policies on pointages
DROP POLICY IF EXISTS "Allow authenticated insert pointages" ON public.pointages;
DROP POLICY IF EXISTS "Allow authenticated read pointages" ON public.pointages;
DROP POLICY IF EXISTS "Allow authenticated update pointages" ON public.pointages;

-- Pointages: admin full, chef_chantier insert+read, directeur read+update
CREATE POLICY "Admin full access pointages" ON public.pointages FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Chef chantier read pointages" ON public.pointages FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'chef_chantier'));

CREATE POLICY "Chef chantier insert pointages" ON public.pointages FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'chef_chantier'));

CREATE POLICY "Directeur read pointages" ON public.pointages FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'directeur'));

CREATE POLICY "Directeur update pointages" ON public.pointages FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'directeur')) WITH CHECK (public.has_role(auth.uid(), 'directeur'));

-- Drop existing permissive policies on paiements
DROP POLICY IF EXISTS "Allow authenticated insert paiements" ON public.paiements;
DROP POLICY IF EXISTS "Allow authenticated read paiements" ON public.paiements;

-- Paiements: admin full, caisse insert+read, directeur read
CREATE POLICY "Admin full access paiements" ON public.paiements FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Caisse read paiements" ON public.paiements FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'caisse'));

CREATE POLICY "Caisse insert paiements" ON public.paiements FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'caisse'));

CREATE POLICY "Directeur read paiements" ON public.paiements FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'directeur'));
