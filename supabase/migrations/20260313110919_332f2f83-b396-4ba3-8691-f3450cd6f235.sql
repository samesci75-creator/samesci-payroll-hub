
ALTER TABLE public.pointages ADD COLUMN IF NOT EXISTS attendance_type text NOT NULL DEFAULT 'T';

-- Update existing records: present=true -> 'T', present=false stays but we keep attendance_type='T' as default
UPDATE public.pointages SET attendance_type = 'T' WHERE present = true;
