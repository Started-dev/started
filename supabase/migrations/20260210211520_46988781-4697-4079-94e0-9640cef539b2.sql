
-- Tighten the insert policy: only project members or service role can insert logs
DROP POLICY "Service can insert execution logs" ON public.hook_execution_log;

CREATE POLICY "Members can insert execution logs"
  ON public.hook_execution_log FOR INSERT
  WITH CHECK (public.is_project_member(auth.uid(), project_id));
