/**
 * The AI assistant panel: prompt → tool-calling run with live progress →
 * result card (Insert / Replace, or Apply for edits). There is no mode to pick:
 * on an empty canvas the assistant draws; otherwise it sees the diagram and
 * decides between changing it and drawing a new one.
 */
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import {
  Activity, ArrowRight, ArrowRightLeft, ArrowUp, Boxes, Check, ChevronDown, CircleAlert, CircleCheck, Cloud, Database, DatabaseZap, Flag,
  History, LoaderCircle, MessageSquarePlus, Palette, Plus, Replace, RotateCcw, Settings, ShieldCheck, Sparkles, Square, Tag, Undo2, Workflow, X,
  Zap, type LucideIcon,
} from 'lucide-react';
import { cn } from '@/lib/cn';
import { useT, type MessageKey } from '@/i18n';
import { isConnector, isShape, type Doc } from '@/model/types';
import type { AiHostApi } from '../host';
import { AiError, PROVIDER_META, type ProviderId } from '../providers';
import { modelFor, providerConfig, updateAiSettings, useAiSettings } from '../settings';
import { runAssistant, type AgentEvent, type AgentResult, type AssistantMode, type StepKind, type StepState } from '../generate/agent';
import { applyOps } from '../generate/ops';
import { convertSpec } from '../generate/toElements';
import { loadRuns, MAX_SAVED_RUNS, saveRuns } from '../history';
import { AiSettingsDialog } from './AiSettingsDialog';
import { ReportForm } from './ReportForm';
import { Btn, IconBtn, IS_MAC, ProviderMark, stopKeys } from './ui';
import { useAiReady, type AiSetupNeed } from './useAiReady';

export interface AiPanelProps {
  host: AiHostApi;
  /** Shows a close button when provided. */
  onClose?: () => void;
  /** Open settings yourself; when omitted the panel shows its own `AiSettingsDialog`. */
  onOpenSettings?: () => void;
  /**
   * The conversation saved with the document (see src/ai/history.ts). A new value
   * from outside (another file opened) replaces the one on screen.
   */
  history?: unknown[];
  /** Called with the finished requests whenever they change, to save them with the document. */
  onHistoryChange?: (history: unknown[]) => void;
  className?: string;
}

interface Step {
  id: string;
  label: string;
  state: StepState;
  detail?: string;
  kind?: StepKind;
  query?: string;
  icon?: string;
}

interface Run {
  id: number;
  prompt: string;
  mode: AssistantMode;
  model: string;
  status: 'running' | 'done' | 'error' | 'cancelled';
  steps: Step[];
  result?: AgentResult;
  error?: string;
  /** The provider's own error text, when `error` is a friendlier rewrite of it. */
  errorDetail?: string;
  applied?: 'insert' | 'replace' | 'edit';
  /** The new diagram went next to existing content (so "Replace diagram" stays on offer). */
  beside?: boolean;
  /** ISO time the request was sent. */
  at?: string;
  /** Read back from the file: shown as a record, its result is never applied again. */
  restored?: boolean;
}

interface Example {
  key: MessageKey;
  icon: LucideIcon;
}

const GENERATE_EXAMPLES: Example[] = [
  { key: 'ai.example.generate1', icon: Cloud },
  { key: 'ai.example.generate6', icon: Zap },
  { key: 'ai.example.generate4', icon: Workflow },
  { key: 'ai.example.generate3', icon: Database },
  { key: 'ai.example.generate2', icon: Boxes },
  { key: 'ai.example.generate5', icon: ArrowRightLeft },
];
const EDIT_EXAMPLES: Example[] = [
  { key: 'ai.example.edit1', icon: DatabaseZap },
  { key: 'ai.example.edit2', icon: Tag },
  { key: 'ai.example.edit3', icon: Activity },
  { key: 'ai.example.edit4', icon: Palette },
];

/** The providers offered as one-click starting points before anything is set up. */
const SETUP_PROVIDERS: ProviderId[] = ['anthropic', 'openai', 'gemini', 'xai', 'deepseek', 'ollama'];

let runSeq = 0;

export function AiPanel({ host, onClose, onOpenSettings, history, onHistoryChange, className }: AiPanelProps) {
  const t = useT();
  const settings = useAiSettings();
  const { ready, reason, need } = useAiReady();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [prompt, setPrompt] = useState('');
  // The document's saved conversation: restored when a file is opened, saved back as requests finish.
  const shownHistory = useRef(history);
  const restored = useRef<Run[] | null>(null);
  const restore = (h: unknown[] | undefined): Run[] =>
    (restored.current = loadRuns(h).map((r) => ({ ...r, id: ++runSeq, restored: true })));
  const [runs, setRuns] = useState<Run[]>(() => restore(history));
  const abortRef = useRef<AbortController | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLTextAreaElement>(null);

  const docCount = host.getDoc().order.length;
  // The canvas decides: empty → draw a diagram; otherwise the assistant sees it and edits (or draws anew).
  const mode: AssistantMode = docCount ? 'edit' : 'generate';
  const selectionCount = host.getSelection().length;
  const running = runs.some((r) => r.status === 'running');
  const meta = PROVIDER_META[settings.provider];
  const model = modelFor(settings);
  const modelLabel = meta.models.find((m) => m.id === model)?.label ?? model;

  useEffect(() => () => abortRef.current?.abort(), []);

  useEffect(() => {
    if (history === shownHistory.current) return;
    shownHistory.current = history;
    abortRef.current?.abort();
    setRuns(restore(history));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- a new document is the only trigger
  }, [history]);
  useEffect(() => {
    // Showing what the file holds is not a change to it.
    if (runs === restored.current || !onHistoryChange) return;
    const saved = saveRuns(runs);
    if (JSON.stringify(saved) === JSON.stringify(shownHistory.current ?? [])) return;
    shownHistory.current = saved;
    onHistoryChange(saved);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only the conversation itself triggers a save
  }, [runs]);

  // Keep the newest activity in view.
  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
  }, [runs]);

  // Auto-grow the composer.
  useLayoutEffect(() => {
    const el = textRef.current;
    if (!el) return;
    el.style.height = '0px';
    el.style.height = `${Math.min(160, Math.max(44, el.scrollHeight))}px`;
  }, [prompt]);

  const openSettings = () => (onOpenSettings ? onOpenSettings() : setSettingsOpen(true));

  const patchRun = (id: number, fn: (r: Run) => Run) => setRuns((rs) => rs.map((r) => (r.id === id ? fn(r) : r)));

  const send = async (text = prompt) => {
    const p = text.trim();
    if (!p || running) return;
    if (!ready) {
      openSettings();
      return;
    }
    const id = ++runSeq;
    const runMode: AssistantMode = host.getDoc().order.length ? 'edit' : 'generate';
    setRuns((rs) => [...rs.slice(1 - MAX_SAVED_RUNS), { id, prompt: p, mode: runMode, model: modelLabel, status: 'running', steps: [], at: new Date().toISOString() }]);
    setPrompt('');
    const ac = new AbortController();
    abortRef.current = ac;
    const onEvent = (e: AgentEvent) => {
      if (e.type !== 'step') return;
      patchRun(id, (r) => {
        const i = r.steps.findIndex((s) => s.id === e.id);
        const step: Step = { id: e.id, label: e.label, state: e.state, detail: e.detail, kind: e.kind, query: e.query, icon: e.icon };
        const steps = i < 0 ? [...r.steps, step] : r.steps.map((s, j) => (j === i ? step : s));
        return { ...r, steps };
      });
    };
    try {
      const result = await runAssistant({
        config: providerConfig(settings),
        prompt: p,
        mode: runMode,
        doc: runMode === 'edit' ? host.getDoc() : undefined,
        selection: host.getSelection(),
        onEvent,
        signal: ac.signal,
      });
      patchRun(id, (r) => ({ ...r, status: 'done', result }));
      // The assistant does what was asked: the result goes straight onto the canvas (one undo step).
      applyResult(id, result, result.kind === 'spec' ? 'insert' : 'edit');
    } catch (e) {
      const aborted = (e as Error)?.name === 'AbortError';
      patchRun(id, (r) => ({
        ...r,
        status: aborted ? 'cancelled' : 'error',
        error: aborted ? undefined : e instanceof Error ? e.message : String(e),
        errorDetail: e instanceof AiError ? e.detail : undefined,
        steps: r.steps.map((s) => (s.state === 'running' ? { ...s, state: aborted ? 'done' : 'error' } : s)),
      }));
    } finally {
      if (abortRef.current === ac) abortRef.current = null;
    }
  };

  const stop = () => abortRef.current?.abort();

  const applyResult = (id: number, res: AgentResult, how: 'insert' | 'replace' | 'edit') => {
    let beside = false;
    if (res.kind === 'spec') {
      if (how === 'insert') {
        // Next to what's already there, never on top of it.
        const right = contentRight(host.getDoc());
        beside = right !== null;
        const els = right ? convertSpec(res.spec, right, { anchor: 'topLeft' }).elements : convertSpec(res.spec, host.getViewportCenter()).elements;
        host.insertElements(els);
      } else {
        host.replaceDoc(convertSpec(res.spec, host.getViewportCenter()).elements);
      }
    } else {
      host.replaceDoc(applyOps(host.getDoc(), res.ops).elements);
    }
    patchRun(id, (r) => ({ ...r, applied: how, beside }));
  };

  const undo = (run: Run) => {
    host.undo?.();
    patchRun(run.id, (r) => ({ ...r, applied: undefined, beside: false }));
  };

  // Tell the host what's happening, so the whole window shows the assistant at work.
  const active = runs.find((r) => r.status === 'running');
  const activityLabel = active ? ([...active.steps].reverse().find((s) => s.state === 'running') ?? active.steps.at(-1))?.label ?? t('ai.run.starting') : null;
  useEffect(() => {
    host.setActivity?.(activityLabel === null ? null : { label: activityLabel, stop: () => abortRef.current?.abort() });
  }, [host, activityLabel]);
  useEffect(() => () => host.setActivity?.(null), [host]);

  const examples = mode === 'edit' ? EDIT_EXAMPLES : GENERATE_EXAMPLES;
  const useExample = (text: string) => {
    setPrompt(text);
    requestAnimationFrame(() => {
      const el = textRef.current;
      el?.focus();
      el?.setSelectionRange(text.length, text.length);
    });
  };
  const chooseProvider = (provider: ProviderId) => {
    updateAiSettings({ provider });
    openSettings();
  };

  return (
    <div className={cn('flex h-full min-h-0 w-full flex-col bg-panel text-[13px] text-fg', className)} onKeyDown={stopKeys}>
      {/* Header */}
      <div className="flex h-11 shrink-0 items-center gap-1 border-b border-line pl-2.5 pr-2">
        <button
          type="button"
          onClick={openSettings}
          title={t('ai.panel.modelSettings')}
          className="flex min-w-0 items-center gap-1.5 rounded-md py-1 pl-1 pr-1.5 text-[11.5px] text-muted ring-1 ring-line transition-colors hover:bg-hover hover:text-fg"
        >
          <ProviderMark provider={settings.provider} size={16} className="rounded" />
          <span className="truncate">{modelLabel || t('ai.panel.noModel')}</span>
          <ChevronDown className="size-3 shrink-0" />
        </button>
        <div className="flex-1" />
        {runs.length > 0 && (
          <IconBtn
            label={t('ai.panel.newChat')}
            size="sm"
            disabled={running}
            onClick={() => {
              setRuns([]);
              textRef.current?.focus();
            }}
          >
            <MessageSquarePlus />
          </IconBtn>
        )}
        <IconBtn label={t('ai.settings.title')} size="sm" onClick={openSettings}>
          <Settings />
        </IconBtn>
        {onClose && (
          <IconBtn label={t('common.close')} size="sm" onClick={onClose}>
            <X />
          </IconBtn>
        )}
      </div>

      {/* Activity */}
      <div ref={scrollRef} className="scroll-thin min-h-0 flex-1 space-y-3 overflow-y-auto px-3 py-3">
        {ready === false && runs.length === 0 && (
          <SetupState provider={settings.provider} need={need} onChoose={chooseProvider} onSetUp={openSettings} />
        )}

        {ready === false && runs.length > 0 && (
          <div className="animate-slide-up flex items-center gap-3 rounded-xl bg-panel-2 px-3 py-2.5 ring-1 ring-line">
            <p className="min-w-0 flex-1 text-[12px] leading-snug text-muted">{reason}</p>
            <Btn variant="primary" size="sm" onClick={openSettings}>
              {setupLabel(t, need, meta.name)}
            </Btn>
          </div>
        )}

        {runs.length === 0 && ready !== false && (
          <div className="animate-fade px-1 pt-5">
            <div className="text-center">
              <div className="mx-auto flex size-10 items-center justify-center rounded-xl bg-accent-soft text-accent">
                <Sparkles className="size-5" />
              </div>
              <div className="mt-3 text-[14px] font-semibold">{mode === 'edit' ? t('ai.panel.emptyEditTitle') : t('ai.panel.emptyGenerateTitle')}</div>
              <p className="mx-auto mt-1 max-w-[260px] text-[12px] text-muted">
                {mode === 'edit'
                  ? selectionCount
                    ? t('ai.panel.emptyEditSelection', { count: selectionCount })
                    : t('ai.panel.emptyEdit')
                  : t('ai.panel.emptyGenerate')}
              </p>
            </div>
            {ready && (
              <div className="mt-5">
                <div className="px-2.5 pb-1 text-[10.5px] font-medium uppercase tracking-wider text-subtle">{t('ai.panel.tryOne')}</div>
                {examples.slice(0, 4).map(({ key, icon: Icon }) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => useExample(t(key))}
                    className="group flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-[12.5px] text-muted transition-colors hover:bg-hover hover:text-fg"
                  >
                    <Icon className="size-4 shrink-0 text-subtle transition-colors group-hover:text-accent" />
                    <span className="min-w-0 flex-1 truncate">{t(key)}</span>
                    <ArrowRight className="size-3.5 shrink-0 -translate-x-1 opacity-0 transition-[opacity,transform] group-hover:translate-x-0 group-hover:opacity-100" />
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {runs[0]?.restored && (
          <div className="flex items-center justify-center gap-1.5 text-[11px] text-subtle">
            <History className="size-3.5" />
            {t('ai.panel.savedHistory')}
          </div>
        )}

        {runs.map((run) => (
          <RunCard
            key={run.id}
            run={run}
            docEmpty={docCount === 0}
            onApply={(how) => run.result && applyResult(run.id, run.result, how)}
            onUndo={host.undo && !run.restored && run.id === runs.at(-1)?.id ? () => undo(run) : undefined}
            onRetry={() => send(run.prompt)}
            onOpenSettings={openSettings}
          />
        ))}
      </div>

      {/* Composer */}
      <div className="shrink-0 border-t border-line p-3">
        {runs.length > 0 && ready && !prompt && !running && (
          <div className="mb-2 flex flex-wrap gap-1.5">
            {examples.slice(0, 3).map(({ key }) => t(key)).map((ex) => (
              <button
                key={ex}
                type="button"
                onClick={() => useExample(ex)}
                className="animate-fade rounded-full bg-panel-2 px-2.5 py-1 text-[11.5px] text-muted ring-1 ring-line transition-[background,color,transform] hover:bg-hover hover:text-fg active:scale-[0.97]"
              >
                {ex}
              </button>
            ))}
          </div>
        )}
        <div className="rounded-xl bg-panel-2 ring-1 ring-line transition-[box-shadow,background] focus-within:bg-panel focus-within:ring-2 focus-within:ring-accent/40">
          <textarea
            ref={textRef}
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={(e) => {
              e.stopPropagation();
              if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                void send();
              }
            }}
            rows={2}
            placeholder={mode === 'edit' ? t('ai.panel.placeholderEdit') : t('ai.panel.placeholderGenerate')}
            className="block w-full resize-none bg-transparent px-3 pt-2.5 text-[13px] leading-relaxed text-fg outline-none placeholder:text-subtle"
          />
          <div className="flex items-center gap-2 px-2 pb-2">
            <span className="pl-1 text-[11px] text-subtle">{t('ai.panel.sendHint', { key: IS_MAC ? '⌘' : 'Ctrl' })}</span>
            <div className="flex-1" />
            {running ? (
              <button
                type="button"
                onClick={stop}
                title={t('ai.panel.stop')}
                aria-label={t('ai.panel.stop')}
                className="flex size-7 items-center justify-center rounded-lg bg-fg text-panel transition-transform active:scale-95"
              >
                <Square className="size-3 fill-current" />
              </button>
            ) : (
              <button
                type="button"
                onClick={() => void send()}
                disabled={!prompt.trim()}
                title={t('ai.panel.send')}
                aria-label={t('ai.panel.send')}
                className="flex size-7 items-center justify-center rounded-lg bg-accent text-accent-fg shadow-[0_1px_2px_rgb(0_0_0/0.15)] transition-[transform,opacity,background] hover:bg-accent-hover active:scale-95 disabled:opacity-35"
              >
                <ArrowUp className="size-4" />
              </button>
            )}
          </div>
        </div>
      </div>

      {!onOpenSettings && <AiSettingsDialog open={settingsOpen} onClose={() => setSettingsOpen(false)} />}
    </div>
  );
}

function setupLabel(t: ReturnType<typeof useT>, need: AiSetupNeed | undefined, provider: string): string {
  return need === 'key' ? t('ai.panel.setUpProvider', { provider }) : t('ai.panel.setUp');
}

/** Before any model is connected: pick a provider in one click, or finish the one already chosen. */
function SetupState({ provider, need, onChoose, onSetUp }: {
  provider: ProviderId;
  need?: AiSetupNeed;
  onChoose: (p: ProviderId) => void;
  onSetUp: () => void;
}) {
  const t = useT();
  return (
    <div className="animate-fade px-2 pt-5 text-center">
      <div className="mx-auto flex size-10 items-center justify-center rounded-xl bg-accent-soft text-accent">
        <Sparkles className="size-5" />
      </div>
      <div className="mt-3 text-[14px] font-semibold">{t('ai.panel.connectTitle')}</div>
      <p className="mx-auto mt-1 max-w-[270px] text-[12px] leading-relaxed text-muted">{t('ai.panel.connectBody')}</p>
      <div className="mt-4 flex flex-wrap justify-center gap-2">
        {SETUP_PROVIDERS.map((id) => (
          <button
            key={id}
            type="button"
            onClick={() => onChoose(id)}
            title={PROVIDER_META[id].name}
            aria-label={PROVIDER_META[id].name}
            aria-pressed={id === provider}
            className={cn(
              'flex size-10 items-center justify-center rounded-xl bg-panel-2 ring-1 transition-[box-shadow,transform,background] hover:bg-hover active:scale-95',
              id === provider ? 'ring-2 ring-accent' : 'ring-line hover:ring-line-strong',
            )}
          >
            <ProviderMark provider={id} size={20} className="rounded" />
          </button>
        ))}
      </div>
      <div className="mx-auto mt-4 max-w-[260px]">
        <Btn variant="primary" className="h-9 w-full" onClick={onSetUp}>
          {setupLabel(t, need, PROVIDER_META[provider].name)}
        </Btn>
        <button type="button" onClick={onSetUp} className="mt-2 text-[11.5px] text-muted underline-offset-2 transition-colors hover:text-fg hover:underline">
          {t('ai.panel.moreProviders')}
        </button>
      </div>
      <p className="mx-auto mt-5 max-w-[260px] text-[11px] leading-snug text-subtle">
        <ShieldCheck className="mr-1 inline size-3.5 -translate-y-px" />
        {t('ai.panel.keyPrivacy')}
      </p>
    </div>
  );
}

function StepIcon({ state }: { state: StepState }) {
  if (state === 'running') return <LoaderCircle className="size-3.5 animate-spin text-accent" />;
  if (state === 'error') return <CircleAlert className="size-3.5 text-[#d48806]" />;
  return <Check className="size-3.5 text-success" />;
}

type PhaseId = 'understand' | 'icons' | 'build' | 'check';

interface Phase {
  id: PhaseId;
  state: StepState;
  steps: Step[];
}

const PHASE_LABEL: Record<PhaseId, MessageKey> = {
  understand: 'ai.phase.understanding',
  icons: 'ai.phase.icons',
  build: 'ai.phase.building',
  check: 'ai.phase.checking',
};

/** Groups the agent's steps into a few phases a person cares about; null when steps carry no kind. */
function phasesOf(run: Run): Phase[] | null {
  if (run.steps.some((st) => !st.kind)) return null;
  const out: Phase[] = [];
  let thinks = 0;
  for (const st of run.steps) {
    const id: PhaseId = st.kind === 'think' ? (thinks++ === 0 ? 'understand' : 'build') : st.kind === 'icons' ? 'icons' : 'check';
    let phase = out.find((ph) => ph.id === id);
    if (!phase) out.push((phase = { id, state: 'done', steps: [] }));
    phase.steps.push(st);
  }
  for (const ph of out) {
    const last = ph.steps[ph.steps.length - 1];
    ph.state = ph.steps.some((st) => st.state === 'running') ? 'running' : run.status === 'error' && last.state === 'error' ? 'error' : 'done';
  }
  return out;
}

/** Friendly progress: a line per phase (icons shown as they're found), with the raw log behind "Show details". */
function RunProgress({ run }: { run: Run }) {
  const t = useT();
  const [details, setDetails] = useState(false);
  const phases = phasesOf(run);
  const raw = (
    <ol className="space-y-1 px-1">
      {run.steps.map((st) => (
        <li key={st.id} className="animate-fade flex items-center gap-2 text-[12px]">
          <StepIcon state={st.state} />
          <span className={cn('truncate', st.state === 'running' ? 'text-fg' : 'text-muted')}>{st.label}</span>
          {st.detail && <span className="ml-auto shrink-0 truncate pl-2 text-[11px] text-subtle">{st.detail}</span>}
        </li>
      ))}
    </ol>
  );
  if (!phases) return raw;
  return (
    <div className="space-y-1.5 px-1">
      {phases.map((ph) => {
        const fixing = ph.id === 'check' && ph.state === 'running' && ph.steps.some((st) => st.state === 'error');
        return (
          <div key={ph.id} className="animate-fade">
            <div className="flex items-center gap-2 text-[12.5px]">
              <StepIcon state={ph.state} />
              <span className={cn('truncate', ph.state === 'running' ? 'font-medium text-fg' : 'text-muted')}>
                {fixing ? t('ai.phase.fixing') : t(PHASE_LABEL[ph.id])}
              </span>
              {ph.id === 'icons' && <span className="text-[11px] tabular-nums text-subtle">{ph.steps.length}</span>}
            </div>
            {ph.id === 'icons' && (
              <div className="mt-1.5 flex flex-wrap gap-1 pl-[22px]">
                {ph.steps.map((st) => (
                  <span
                    key={st.id}
                    title={st.query}
                    className={cn(
                      'flex size-7 items-center justify-center rounded-md bg-white ring-1 ring-line',
                      st.state === 'running' ? 'animate-pulse' : 'animate-pop',
                      st.state !== 'running' && !st.icon && 'border border-dashed border-line bg-transparent ring-0',
                    )}
                  >
                    {st.icon && <img src={`${import.meta.env.BASE_URL}icons/${st.icon}`} alt="" className="size-5 object-contain" draggable={false} />}
                  </span>
                ))}
              </div>
            )}
          </div>
        );
      })}
      <button
        type="button"
        onClick={() => setDetails((v) => !v)}
        className="flex items-center gap-1 pl-[22px] text-[11px] text-subtle transition-colors hover:text-muted"
      >
        <ChevronDown className={cn('size-3 transition-transform', !details && '-rotate-90')} />
        {details ? t('ai.run.hideDetails') : t('ai.run.showDetails')}
      </button>
      {details && <div className="pl-[22px]">{raw}</div>}
    </div>
  );
}

interface ApplyProps {
  docEmpty: boolean;
  onApply: (how: 'insert' | 'replace' | 'edit') => void;
  /** Only for the latest run: undo what it just applied. */
  onUndo?: () => void;
}

function RunCard({ run, onRetry, onOpenSettings, ...apply }: { run: Run; onRetry: () => void; onOpenSettings: () => void } & ApplyProps) {
  const t = useT();
  return (
    <div className="animate-slide-up space-y-2">
      <div className="ml-6 rounded-xl rounded-tr-sm bg-accent-soft px-3 py-2 text-[12.5px] leading-relaxed text-fg">
        <div className="whitespace-pre-wrap break-words">{run.prompt}</div>
      </div>

      {run.steps.length > 0 && <RunProgress run={run} />}

      {run.status === 'running' && run.steps.length === 0 && (
        <div className="flex items-center gap-2 px-1 text-[12px] text-muted">
          <LoaderCircle className="size-3.5 animate-spin text-accent" /> {t('ai.run.starting')}
        </div>
      )}

      {run.status === 'cancelled' && <div className="px-1 text-[12px] text-subtle">{t('ai.run.stopped')}</div>}

      {run.status === 'error' && (
        <div className="animate-pop rounded-xl bg-danger/8 p-3 ring-1 ring-danger/25">
          <div className="flex items-start gap-2 text-[12px] text-fg">
            <CircleAlert className="mt-px size-3.5 shrink-0 text-danger" />
            <span className="min-w-0">
              <span className="line-clamp-6 break-words">{run.error}</span>
              {run.errorDetail && (
                <span title={run.errorDetail} className="mt-1 line-clamp-2 block break-words text-[11px] text-subtle">
                  {run.errorDetail}
                </span>
              )}
            </span>
          </div>
          <div className="mt-2 flex flex-wrap gap-1">
            <Btn size="sm" variant="ghost" icon={<RotateCcw />} onClick={onRetry}>
              {t('ai.run.tryAgain')}
            </Btn>
            {/* Most failures (missing or rejected key, wrong endpoint or model) are fixed in settings. */}
            <Btn size="sm" variant="ghost" icon={<Settings />} onClick={onOpenSettings}>
              {t('ai.settings.title')}
            </Btn>
          </div>
        </div>
      )}

      {run.status === 'done' && run.result && <ResultCard run={run} result={run.result} {...apply} />}
    </div>
  );
}

function ResultCard({ run, result, docEmpty, onApply, onUndo }: { run: Run; result: AgentResult } & ApplyProps) {
  const t = useT();
  const [showNotes, setShowNotes] = useState(false);
  const [reporting, setReporting] = useState(false);
  const stats = useMemo(() => {
    if (result.kind !== 'spec') {
      const count = (op: string) => result.ops.filter((o) => o.op.startsWith(op)).length;
      return { add: count('add'), update: count('update'), remove: count('remove') };
    }
    return null;
  }, [result]);

  return (
    <div className="animate-pop overflow-hidden rounded-xl bg-panel ring-1 ring-line shadow-[0_1px_2px_rgb(0_0_0/0.04)]">
      {result.kind === 'spec' && <MiniPreview result={result} />}
      <div className="p-3">
        <div className="flex items-center gap-2">
          <CircleCheck className="size-4 text-success" />
          <span className="font-medium">{result.kind === 'spec' ? (result.spec.title ?? t('ai.result.diagramReady')) : t('ai.result.changesReady')}</span>
          <span className="ml-auto truncate text-[11px] text-subtle">{run.model}</span>
          {/* Store policy and plain decency: AI output can be reported (see ../report.ts). */}
          <IconBtn size="sm" label={t('ai.report.title')} aria-expanded={reporting} onClick={() => setReporting((v) => !v)} className={cn('-my-1 -mr-1 size-6', reporting && 'text-danger')}>
            <Flag />
          </IconBtn>
        </div>
        <div className="mt-1 text-[12px] text-muted">
          {result.kind === 'spec' ? (
            <>
              {result.spec.nodes.some((n) => n.icon)
                ? t('ai.result.specStatsIcons', { shapes: result.spec.nodes.length, connectors: result.spec.edges.length, icons: result.spec.nodes.filter((n) => n.icon).length })
                : t('ai.result.specStats', { shapes: result.spec.nodes.length, connectors: result.spec.edges.length })}
            </>
          ) : (
            <>
              {result.summary || t('ai.result.editsFallback')}
              <span className="mt-1 flex gap-2 text-[11.5px]">
                {stats!.add > 0 && <span className="text-success">{t('ai.result.added', { count: stats!.add })}</span>}
                {stats!.update > 0 && <span className="text-accent">{t('ai.result.changed', { count: stats!.update })}</span>}
                {stats!.remove > 0 && <span className="text-danger">{t('ai.result.removed', { count: stats!.remove })}</span>}
              </span>
            </>
          )}
        </div>
        {result.message && <p className="mt-2 text-[12px] leading-relaxed text-fg/80">{result.message}</p>}

        {result.warnings.length > 0 && (
          <div className="mt-2">
            <button type="button" onClick={() => setShowNotes((v) => !v)} className="flex items-center gap-1 text-[11.5px] text-subtle hover:text-muted">
              <ChevronDown className={cn('size-3 transition-transform', !showNotes && '-rotate-90')} />
              {t('ai.result.adjustments', { count: result.warnings.length })}
            </button>
            {showNotes && (
              <ul className="animate-fade mt-1 space-y-0.5 pl-4 text-[11.5px] text-subtle">
                {result.warnings.slice(0, 12).map((w, i) => (
                  <li key={i} className="list-disc break-words">
                    {w}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {reporting && <ReportForm prompt={run.prompt} result={result} model={run.model} onClose={() => setReporting(false)} />}

        {(!run.restored || run.applied) && (
          <div className="mt-3 flex items-center gap-2">
            {run.applied ? (
              <>
                <span className="animate-fade flex min-w-0 items-center gap-1.5 text-[12px] text-success">
                  <Check className="size-3.5 shrink-0" />
                  <span className="truncate">{run.applied === 'insert' ? t('ai.result.inserted') : run.applied === 'replace' ? t('ai.result.replaced') : t('ai.result.applied')}</span>
                </span>
                <div className="flex-1" />
                {run.beside && !run.restored && result.kind === 'spec' && (
                  <Btn size="sm" variant="ghost" icon={<Replace />} onClick={() => onApply('replace')}>
                    {t('ai.result.replaceDiagram')}
                  </Btn>
                )}
                {onUndo && (
                  <Btn size="sm" variant="ghost" icon={<Undo2 />} onClick={onUndo} title={`${IS_MAC ? '⌘' : 'Ctrl'}Z`}>
                    {t('ai.result.undo')}
                  </Btn>
                )}
              </>
            ) : result.kind === 'spec' ? (
              <>
                <Btn variant="primary" size="sm" icon={<Plus />} onClick={() => onApply('insert')}>
                  {t('common.insert')}
                </Btn>
                {!docEmpty && (
                  <Btn size="sm" icon={<Replace />} onClick={() => onApply('replace')}>
                    {t('ai.result.replaceDiagram')}
                  </Btn>
                )}
              </>
            ) : (
              <Btn variant="primary" size="sm" icon={<Check />} onClick={() => onApply(result.kind === 'ops' ? 'edit' : 'replace')}>
                {t('ai.result.applyChanges')}
              </Btn>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/** A small schematic of the generated layout. */
function MiniPreview({ result }: { result: Extract<AgentResult, { kind: 'spec' }> }) {
  const data = useMemo(() => {
    try {
      return convertSpec(result.spec, { x: 0, y: 0 }, { anchor: 'topLeft' });
    } catch {
      return null;
    }
  }, [result]);
  if (!data) return null;
  const pad = 24;
  const { w, h } = data.bounds;
  const shapes = data.elements.filter(isShape);
  const conns = data.elements.filter(isConnector);
  const byId = new Map(shapes.map((s) => [s.id, s]));
  const strokeW = Math.max(1, Math.max(w, h) / 260);
  return (
    <div className="diagram-adapt border-b border-line bg-[#f7f7f9]">
      <svg viewBox={`${-pad} ${-pad} ${w + pad * 2} ${h + pad * 2}`} className="block h-[132px] w-full" preserveAspectRatio="xMidYMid meet" aria-hidden>
        {conns.map((c) => {
          const a = c.source.elementId ? byId.get(c.source.elementId) : undefined;
          const b = c.target.elementId ? byId.get(c.target.elementId) : undefined;
          const p1 = a ? { x: a.x + a.w / 2, y: a.y + a.h / 2 } : c.source;
          const p2 = b ? { x: b.x + b.w / 2, y: b.y + b.h / 2 } : c.target;
          return <line key={c.id} x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y} stroke="#94a3b8" strokeWidth={strokeW} />;
        })}
        {shapes.map((s) => {
          const isIcon = s.kind === 'icon' || s.kind.startsWith('net.');
          const fill = isIcon ? '#c7d2fe' : s.style.fill === 'none' ? 'none' : s.style.fill;
          const stroke = isIcon ? '#6366f1' : s.style.stroke === 'none' ? '#cbd5e1' : s.style.stroke;
          return (
            <rect
              key={s.id}
              x={s.x}
              y={s.y}
              width={s.w}
              height={s.h}
              rx={Math.min(10, s.w / 4, s.h / 4)}
              fill={fill}
              stroke={stroke}
              strokeWidth={strokeW}
              strokeDasharray={s.style.strokeStyle === 'dashed' ? `${strokeW * 4} ${strokeW * 3}` : undefined}
            />
          );
        })}
      </svg>
    </div>
  );
}

/** Top-left point just right of the existing content, or null on an empty canvas. */
function contentRight(doc: Doc): { x: number; y: number } | null {
  let maxX = -Infinity;
  let minY = Infinity;
  for (const id of doc.order) {
    const el = doc.elements[id];
    if (!el || !isShape(el)) continue;
    maxX = Math.max(maxX, el.x + el.w);
    minY = Math.min(minY, el.y);
  }
  return Number.isFinite(maxX) ? { x: maxX + 160, y: minY } : null;
}
