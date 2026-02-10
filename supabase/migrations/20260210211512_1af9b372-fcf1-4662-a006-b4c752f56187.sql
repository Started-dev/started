
-- Persistent hooks table
CREATE TABLE public.project_hooks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  event TEXT NOT NULL DEFAULT 'PreToolUse',
  tool_pattern TEXT NOT NULL DEFAULT '*',
  command_pattern TEXT,
  action TEXT NOT NULL DEFAULT 'deny',
  webhook_url TEXT,
  label TEXT NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.project_hooks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can read project hooks"
  ON public.project_hooks FOR SELECT
  USING (public.is_project_member(auth.uid(), project_id));

CREATE POLICY "Members can insert project hooks"
  ON public.project_hooks FOR INSERT
  WITH CHECK (public.is_project_member(auth.uid(), project_id));

CREATE POLICY "Members can update project hooks"
  ON public.project_hooks FOR UPDATE
  USING (public.is_project_member(auth.uid(), project_id));

CREATE POLICY "Members can delete project hooks"
  ON public.project_hooks FOR DELETE
  USING (public.is_project_member(auth.uid(), project_id));

-- Webhook secrets per project
CREATE TABLE public.project_webhook_secrets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  token TEXT NOT NULL DEFAULT encode(gen_random_bytes(32), 'hex'),
  label TEXT NOT NULL DEFAULT 'default',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(project_id, label)
);

ALTER TABLE public.project_webhook_secrets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can manage webhook secrets"
  ON public.project_webhook_secrets FOR ALL
  USING (public.is_project_member(auth.uid(), project_id));

-- Execution log
CREATE TABLE public.hook_execution_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hook_id UUID REFERENCES public.project_hooks(id) ON DELETE SET NULL,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  event TEXT NOT NULL,
  input_payload JSONB DEFAULT '{}',
  output_payload JSONB DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'success',
  duration_ms INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.hook_execution_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can read execution logs"
  ON public.hook_execution_log FOR SELECT
  USING (public.is_project_member(auth.uid(), project_id));

CREATE POLICY "Service can insert execution logs"
  ON public.hook_execution_log FOR INSERT
  WITH CHECK (true);
