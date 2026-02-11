import { z } from "zod";

const ACTION_KEY_ENUM = [
  "preview_diff",
  "apply_patch",
  "apply_and_run",
  "run_tests",
  "run_build",
  "rerun_last",
  "explain_error",
  "fix_or_plan",
  "continue_agent",
  "start_agent",
  "pause_agent",
  "cancel_agent",
  "generate_attestation",
  "replay_attestation",
  "create_pr",
  "deploy",
] as const;

const actionKeySchema = z.enum(ACTION_KEY_ENUM);

const weightMapSchema = z.record(
  z.string().min(1).max(128).regex(/^[a-zA-Z0-9_.-]+$/),
  z.number().min(0).max(1000)
);

const nbaPolicySchema = z.object({
  version: z.number().int().min(1),
  max_actions: z.object({
    primary: z.number().int().min(1).max(3),
    secondary: z.number().int().min(0).max(5),
  }),
  confidence_thresholds: z.object({
    high: z.number().min(0).max(1),
    medium: z.number().min(0).max(1),
  }),
  defaults: z.object({
    prefer_preview_before_apply: z.boolean(),
    auto_attach_context: z.object({
      errors_last_run: z.boolean(),
      diff_current: z.boolean(),
      active_file: z.boolean(),
    }),
    never_ship_without_verification: z.boolean(),
  }),
  weights: z.object({
    urgency: weightMapSchema,
    verification_bonus: weightMapSchema,
    momentum_bonus: weightMapSchema,
    safety_penalty: weightMapSchema,
    friction_penalty: weightMapSchema,
  }),
  gates: z.object({
    hard_deny_command_patterns: z.array(z.string().min(1).max(2000)).min(0).max(200),
    ship_requires: z.object({
      attestation: z.boolean(),
      tests_or_build: z.boolean(),
    }),
  }),
  suggestion_memory: z.object({
    ignore_decay_days: z.number().int().min(0).max(365),
    max_ignore_count_before_suppress: z.number().int().min(0).max(20),
  }),
  action_overrides: z.object({
    when_last_run_failed: z.object({
      force_include: z.array(actionKeySchema).min(0).max(50),
      suppress: z.array(actionKeySchema).min(0).max(50),
    }),
    when_patch_ready: z.object({
      primary_if_user_did_not_explicitly_say_apply: actionKeySchema,
    }),
    when_agent_running: z.object({
      primary: actionKeySchema,
      suppress: z.array(actionKeySchema).min(0).max(50),
    }),
  }),
});

export type ValidatedNBAPolicy = z.infer<typeof nbaPolicySchema>;

export function validateNBAPolicy(input: unknown): { valid: boolean; errors: string[] } {
  const result = nbaPolicySchema.safeParse(input);
  if (result.success) return { valid: true, errors: [] };
  return {
    valid: false,
    errors: result.error.issues.map(
      (i) => `${i.path.join(".")}: ${i.message}`
    ),
  };
}

export { nbaPolicySchema, actionKeySchema };
