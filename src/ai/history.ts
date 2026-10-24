/**
 * The AI conversation saved with the file: finished requests only, in a fixed
 * shape. Files come from anywhere, so everything read back is validated, and
 * restored requests are a record (their results are shown, never re-applied).
 */
import type { AgentResult, AssistantMode, StepKind, StepState } from './generate/agent';
import type { EditOp } from './generate/ops';
import { validateSpec } from './generate/spec';

export interface SavedStep {
  id: string;
  label: string;
  state: StepState;
  detail?: string;
  kind?: StepKind;
  query?: string;
  icon?: string;
}

export interface SavedRun {
  prompt: string;
  mode: AssistantMode;
  model: string;
  /** ISO time the request was sent. */
  at?: string;
  status: 'done' | 'error' | 'cancelled';
  steps: SavedStep[];
  result?: AgentResult;
  error?: string;
  errorDetail?: string;
  applied?: 'insert' | 'replace' | 'edit';
  beside?: boolean;
}

/** Requests kept with the file (the panel keeps as many). */
export const MAX_SAVED_RUNS = 10;

const STATUSES = ['done', 'error', 'cancelled'] as const;
const STEP_STATES: StepState[] = ['running', 'done', 'error'];
const APPLIED = ['insert', 'replace', 'edit'] as const;

const str = (v: unknown): v is string => typeof v === 'string';
const optStr = (v: unknown) => (str(v) && v ? v : undefined);
const oneOf = <T extends string>(v: unknown, list: readonly T[]): v is T => list.includes(v as T);
const strings = (v: unknown) => (Array.isArray(v) ? v.filter(str) : []);

/** Finished requests in the saved shape (requests still running are left out). */
export function saveRuns(runs: Array<Omit<SavedRun, 'status'> & { status: SavedRun['status'] | 'running' }>): SavedRun[] {
  return runs.flatMap((r) => (r.status === 'running' ? [] : [{ ...r, status: r.status }])).slice(-MAX_SAVED_RUNS).map((r) => ({
    prompt: r.prompt,
    mode: r.mode,
    model: r.model,
    ...(r.at ? { at: r.at } : {}),
    status: r.status,
    steps: r.steps.map((s) => ({
      id: s.id,
      label: s.label,
      state: s.state,
      ...(s.detail ? { detail: s.detail } : {}),
      ...(s.kind ? { kind: s.kind } : {}),
      ...(s.query ? { query: s.query } : {}),
      ...(s.icon ? { icon: s.icon } : {}),
    })),
    ...(r.result ? { result: r.result } : {}),
    ...(r.error ? { error: r.error } : {}),
    ...(r.errorDetail ? { errorDetail: r.errorDetail } : {}),
    ...(r.applied ? { applied: r.applied } : {}),
    ...(r.beside ? { beside: true } : {}),
  }));
}

function loadResult(raw: unknown): AgentResult | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  const o = raw as Record<string, unknown>;
  const warnings = strings(o.warnings);
  const message = str(o.message) ? o.message : '';
  if (o.kind === 'spec') {
    const v = validateSpec(o.spec);
    return v.ok ? { kind: 'spec', spec: v.spec, warnings, message } : undefined;
  }
  if (o.kind === 'ops' && Array.isArray(o.ops)) {
    // Shown as counts only: restored edits are never applied again.
    const ops = o.ops.filter((op): op is EditOp => !!op && typeof op === 'object' && str((op as { op?: unknown }).op));
    return { kind: 'ops', ops, summary: str(o.summary) ? o.summary : '', warnings, message };
  }
  return undefined;
}

/** Validates a conversation read from a file; anything malformed is dropped. */
export function loadRuns(raw: unknown): SavedRun[] {
  if (!Array.isArray(raw)) return [];
  const out: SavedRun[] = [];
  for (const item of raw.slice(-MAX_SAVED_RUNS)) {
    if (!item || typeof item !== 'object') continue;
    const o = item as Record<string, unknown>;
    if (!str(o.prompt) || !o.prompt.trim() || !oneOf(o.status, STATUSES)) continue;
    const steps: SavedStep[] = (Array.isArray(o.steps) ? o.steps : []).flatMap((s): SavedStep[] => {
      const st = (s ?? {}) as Record<string, unknown>;
      if (!str(st.id) || !str(st.label)) return [];
      return [{
        id: st.id,
        label: st.label,
        // A step can't still be running in a finished request.
        state: oneOf(st.state, STEP_STATES) && st.state !== 'running' ? st.state : 'done',
        detail: optStr(st.detail),
        kind: optStr(st.kind) as StepKind | undefined,
        query: optStr(st.query),
        icon: optStr(st.icon),
      }];
    });
    const result = loadResult(o.result);
    out.push({
      prompt: o.prompt,
      mode: o.mode === 'edit' ? 'edit' : 'generate',
      model: str(o.model) ? o.model : '',
      at: optStr(o.at),
      // A "done" request whose result didn't survive validation has nothing to show.
      status: o.status === 'done' && !result ? 'cancelled' : o.status,
      steps,
      result,
      error: optStr(o.error),
      errorDetail: optStr(o.errorDetail),
      applied: oneOf(o.applied, APPLIED) ? o.applied : undefined,
      beside: o.beside === true || undefined,
    });
  }
  return out;
}
