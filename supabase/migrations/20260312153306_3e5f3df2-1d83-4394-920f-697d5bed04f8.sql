
INSERT INTO public.user_roles (user_id, role)
SELECT p.id, 'admin'::app_role
FROM public.profiles p
WHERE p.email = 'samesci75@gmail.com'
AND NOT EXISTS (
  SELECT 1 FROM public.user_roles ur WHERE ur.user_id = p.id
);
