
CREATE POLICY "Allow authenticated delete personnel" ON public.personnel
  FOR DELETE TO authenticated USING (true);
