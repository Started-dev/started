
ALTER TABLE public.api_usage_ledger
ADD CONSTRAINT api_usage_ledger_owner_period_unique
UNIQUE (owner_id, period_start, period_end);
