

# Real Claude Models via Anthropic API + StartedAI Custom Training

## What We're Building

1. **Claude models** connect to the real Anthropic API using your Enterprise key (not the Lovable gateway)
2. **StartedAI** maps to `google/gemini-3-pro-preview` via the Lovable gateway with a custom-trained system prompt, optimized for minimal token usage
3. **Per-model rate limiting** based on Free/Paid plan tiers, designed for profitability

---

## Architecture

The edge function becomes a **multi-provider router**:

```text
User selects model
       |
  [Edge Function]
       |
  +----+----+----+
  |         |         |
Lovable    Anthropic   Lovable
Gateway    API         Gateway
  |         |           |
StartedAI  Claude      Gemini/GPT
(gemini-3  models      (passthrough)
 pro +
 custom
 prompt)
```

---

## 1. Model Selector Cleanup (`ModelSelector.tsx`)

Replace the model list with genuine models only:

| Label | ID | Provider | Description |
|---|---|---|---|
| StartedAI | `started/started-ai` | Lovable (gemini-3-pro) | Token-efficient default |
| Gemini 3 Flash | `google/gemini-3-flash-preview` | Lovable | Fast and capable |
| Gemini 2.5 Pro | `google/gemini-2.5-pro` | Lovable | Heavy reasoning |
| Gemini 3 Pro | `google/gemini-3-pro-preview` | Lovable | Next-gen |
| GPT-5 | `openai/gpt-5` | Lovable | Powerful all-rounder |
| GPT-5.2 | `openai/gpt-5.2` | Lovable | Latest OpenAI |
| GPT-5 Mini | `openai/gpt-5-mini` | Lovable | Balanced |
| Claude 4 Sonnet | `anthropic/claude-sonnet-4` | Anthropic Direct | Fast and smart |
| Claude 4 Opus | `anthropic/claude-opus-4` | Anthropic Direct | Deep reasoning |
| Claude 3.5 Haiku | `anthropic/claude-3-5-haiku-latest` | Anthropic Direct | Speed-optimized |

Note: Claude model IDs use Anthropic's real API model names.

---

## 2. Store the Anthropic API Key

We'll use the `add_secret` tool to store `ANTHROPIC_API_KEY` as an edge function secret. You'll paste your Enterprise API key when prompted.

---

## 3. StartedAI Custom Prompt (`started-prompt.ts`)

Create a dedicated `STARTED_AI_SYSTEM_PROMPT` that is:
- Optimized for **minimal token output** (concise, no filler, max 3-bullet plans, compressed diffs)
- Trained with Started.dev-specific personality and conventions
- Only used when `started/started-ai` is selected
- Other models get a standard, shorter system prompt

Key prompt directives for token efficiency:
- "Respond in the fewest tokens possible"
- "Omit pleasantries and filler"
- "Plans: max 3 bullets"
- "Patches only, no full file dumps"
- "Notes: 1 sentence max"
- "Never repeat the user's question back"

---

## 4. Multi-Provider Router (`supabase/functions/started/index.ts`)

The edge function gains a `routeToProvider` function:

```text
function routeToProvider(model):
  if model starts with "anthropic/":
    -> Call https://api.anthropic.com/v1/messages
    -> Use ANTHROPIC_API_KEY from env
    -> Convert OpenAI-style messages to Anthropic format
    -> Stream back, converting Anthropic SSE to OpenAI-compatible SSE

  if model == "started/started-ai":
    -> Resolve to "google/gemini-3-pro-preview"
    -> Inject STARTED_AI_SYSTEM_PROMPT (token-efficient)
    -> Call Lovable gateway

  else:
    -> Passthrough to Lovable gateway as-is
```

Anthropic API format differences handled:
- System prompt goes in `system` field (not in messages array)
- Response format: `content_block_delta` events converted to OpenAI `delta.content`
- Model IDs: strip `anthropic/` prefix for API call

---

## 5. Same changes for `agent-run/index.ts`

Add the same multi-provider routing so agent mode also supports Claude and StartedAI.

---

## 6. Rate Limiting and Token Budgets (Profitability Engine)

### Per-Model Token Multipliers

Different models cost different amounts. We apply a **cost multiplier** to token usage tracking so expensive models consume quota faster:

| Model | Multiplier | Rationale |
|---|---|---|
| StartedAI | 0.5x | Cheapest (Gemini 3 Pro + compact prompt = fewer tokens) |
| Gemini 3 Flash | 1x | Baseline |
| Gemini 2.5 Flash | 1x | Baseline |
| GPT-5 Mini | 1.5x | Mid-tier |
| Gemini 2.5 Pro | 2x | Premium |
| Gemini 3 Pro | 2x | Premium |
| GPT-5 | 3x | Expensive |
| GPT-5.2 | 3.5x | Most expensive OpenAI |
| Claude 3.5 Haiku | 2x | External API cost |
| Claude 4 Sonnet | 4x | Premium external |
| Claude 4 Opus | 6x | Most expensive overall |

This means a Free user (100K token quota) can do:
- ~200K effective tokens on StartedAI (0.5x)
- ~100K on Gemini Flash (1x)
- ~16.7K on Claude 4 Opus (6x)

### Per-Request Rate Limits

Add `requests_per_minute` limits per plan tier:

| Plan | RPM (StartedAI) | RPM (Other) | RPM (Claude) |
|---|---|---|---|
| Free | 10 | 5 | 2 |
| Builder | 30 | 20 | 10 |
| Pro | 60 | 40 | 25 |
| Studio | 120 | 80 | 50 |

Implementation: Track request counts in a simple in-memory map keyed by `userId:minute`. Since edge functions are stateless, we'll use a lightweight DB check -- query `api_usage_ledger` or a new `rate_limit_log` approach.

### Database Changes

Add a `model_multipliers` column (jsonb) to `billing_plans`, or hardcode the multiplier table in the edge function (simpler, no migration needed). We'll hardcode it in the edge function for now.

Update `increment_usage` RPC call to accept a multiplier parameter, so `estimatedTokens * multiplier` is what gets recorded.

---

## 7. Anthropic SSE Translation Layer

The Lovable gateway returns OpenAI-compatible SSE. Anthropic returns a different format. The edge function will include a `streamAnthropicAsOpenAI` helper that:

1. Reads Anthropic SSE events (`message_start`, `content_block_delta`, `message_stop`)
2. Translates each `content_block_delta` to `{"choices":[{"delta":{"content":"..."}}]}`
3. Sends `[DONE]` at the end

This way the frontend `streamChat` in `api-client.ts` doesn't need any changes -- it already parses OpenAI-format SSE.

---

## Files to Create/Modify

| File | Action | Purpose |
|---|---|---|
| `src/components/ide/ModelSelector.tsx` | Modify | Real model IDs only, add provider badges |
| `src/lib/started-prompt.ts` | Modify | Add token-efficient STARTED_AI_SYSTEM_PROMPT |
| `supabase/functions/started/index.ts` | Major rewrite | Multi-provider router, Anthropic integration, rate limiting, cost multipliers |
| `supabase/functions/agent-run/index.ts` | Modify | Same multi-provider routing |

No frontend changes needed beyond the model selector -- the SSE translation ensures backward compatibility.

---

## Implementation Order

1. Store `ANTHROPIC_API_KEY` secret
2. Update `ModelSelector.tsx` with real model IDs
3. Write token-efficient `STARTED_AI_SYSTEM_PROMPT`
4. Rewrite `started/index.ts` with multi-provider router + rate limiting + cost multipliers
5. Update `agent-run/index.ts` with same routing
6. Deploy and test each model

