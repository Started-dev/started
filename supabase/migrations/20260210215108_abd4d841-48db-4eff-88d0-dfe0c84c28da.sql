
-- Create openclaw_installations table
CREATE TABLE public.openclaw_installations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  slug TEXT NOT NULL,
  instance_url TEXT,
  status TEXT NOT NULL DEFAULT 'installing',
  logs TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS
ALTER TABLE public.openclaw_installations ENABLE ROW LEVEL SECURITY;

-- Only the user who created the installation can read it
CREATE POLICY "Users can view own installations"
ON public.openclaw_installations
FOR SELECT
USING (auth.uid() = user_id);

-- Users can create installations for projects they own
CREATE POLICY "Users can create installations"
ON public.openclaw_installations
FOR INSERT
WITH CHECK (auth.uid() = user_id AND EXISTS (
  SELECT 1 FROM public.projects WHERE id = project_id AND owner_id = auth.uid()
));

-- Users can update own installations
CREATE POLICY "Users can update own installations"
ON public.openclaw_installations
FOR UPDATE
USING (auth.uid() = user_id);

-- Index for lookups
CREATE INDEX idx_openclaw_installations_project ON public.openclaw_installations(project_id);
CREATE INDEX idx_openclaw_installations_user ON public.openclaw_installations(user_id);
