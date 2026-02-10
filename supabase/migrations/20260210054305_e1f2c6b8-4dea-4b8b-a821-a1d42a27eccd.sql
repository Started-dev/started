
CREATE OR REPLACE FUNCTION public.increment_usage(
  _owner_id uuid,
  _period_start date,
  _period_end date,
  _tokens integer
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  INSERT INTO public.api_usage_ledger (owner_id, period_start, period_end, model_tokens)
  VALUES (_owner_id, _period_start, _period_end, _tokens)
  ON CONFLICT (owner_id, period_start, period_end)
  DO UPDATE SET model_tokens = api_usage_ledger.model_tokens + EXCLUDED.model_tokens;
END;
$$;
