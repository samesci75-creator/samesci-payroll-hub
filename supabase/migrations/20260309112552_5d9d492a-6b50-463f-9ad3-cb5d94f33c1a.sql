
-- Drop all existing restrictive policies and recreate as permissive

-- PERSONNEL
DROP POLICY IF EXISTS "Admin full access personnel" ON public.personnel;
DROP POLICY IF EXISTS "Allow service role all on personnel" ON public.personnel;
DROP POLICY IF EXISTS "Caisse read personnel" ON public.personnel;
DROP POLICY IF EXISTS "Chef chantier read personnel" ON public.personnel;
DROP POLICY IF EXISTS "Directeur read personnel" ON public.personnel;

CREATE POLICY "Admin full access personnel" ON public.personnel FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Chef chantier read personnel" ON public.personnel FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'chef_chantier'));
CREATE POLICY "Directeur read personnel" ON public.personnel FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'directeur'));
CREATE POLICY "Caisse read personnel" ON public.personnel FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'caisse'));
CREATE POLICY "Service role personnel" ON public.personnel FOR ALL TO service_role USING (true) WITH CHECK (true);

-- POINTAGES
DROP POLICY IF EXISTS "Admin full access pointages" ON public.pointages;
DROP POLICY IF EXISTS "Allow service role all on pointages" ON public.pointages;
DROP POLICY IF EXISTS "Chef chantier insert pointages" ON public.pointages;
DROP POLICY IF EXISTS "Chef chantier read pointages" ON public.pointages;
DROP POLICY IF EXISTS "Directeur read pointages" ON public.pointages;
DROP POLICY IF EXISTS "Directeur update pointages" ON public.pointages;

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
CREATE POLICY "Service role pointages" ON public.pointages FOR ALL TO service_role USING (true) WITH CHECK (true);

-- PAIEMENTS
DROP POLICY IF EXISTS "Admin full access paiements" ON public.paiements;
DROP POLICY IF EXISTS "Allow service role all on paiements" ON public.paiements;
DROP POLICY IF EXISTS "Caisse insert paiements" ON public.paiements;
DROP POLICY IF EXISTS "Caisse read paiements" ON public.paiements;
DROP POLICY IF EXISTS "Directeur read paiements" ON public.paiements;

CREATE POLICY "Admin full access paiements" ON public.paiements FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Caisse read paiements" ON public.paiements FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'caisse'));
CREATE POLICY "Caisse insert paiements" ON public.paiements FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'caisse'));
CREATE POLICY "Directeur read paiements" ON public.paiements FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'directeur'));
CREATE POLICY "Service role paiements" ON public.paiements FOR ALL TO service_role USING (true) WITH CHECK (true);

-- PROFILES
DROP POLICY IF EXISTS "Admins can read all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Service role full access profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can read own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;

CREATE POLICY "Users can read own profile" ON public.profiles FOR SELECT TO authenticated
  USING (auth.uid() = id);
CREATE POLICY "Admins can read all profiles" ON public.profiles FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE TO authenticated
  USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
CREATE POLICY "Service role profiles" ON public.profiles FOR ALL TO service_role USING (true) WITH CHECK (true);

-- USER_ROLES
DROP POLICY IF EXISTS "Admins can delete roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can insert roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can read all roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can update roles" ON public.user_roles;
DROP POLICY IF EXISTS "Service role full access user_roles" ON public.user_roles;
DROP POLICY IF EXISTS "Users can read own roles" ON public.user_roles;

CREATE POLICY "Users can read own roles" ON public.user_roles FOR SELECT TO authenticated
  USING (auth.uid() = user_id);
CREATE POLICY "Admins can read all roles" ON public.user_roles FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can insert roles" ON public.user_roles FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update roles" ON public.user_roles FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete roles" ON public.user_roles FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Service role user_roles" ON public.user_roles FOR ALL TO service_role USING (true) WITH CHECK (true);
