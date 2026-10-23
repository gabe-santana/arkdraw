/**
 * The AI assistant panel: prompt → tool-calling run with live progress →
 * result card (Insert / Replace, or Apply for edits).
 */
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowUp, Check, ChevronDown, CircleAlert, CircleCheck, LoaderCircle, Plus, Replace, RotateCcw, Settings, Sparkles,
  Square, SquarePen, TriangleAlert, Wand, X,
} from 'lucide-react';
import { cn } from '@/lib/cn';
import { isConnector, isShape } from '@/model/types';
import type { AiHostApi } from '../host';
import { PROVIDER_META } from '../providers';
import { modelFor, providerConfig, useAiSettings } from '../settings';
import { isTauri } from '../transport';
import { runAssistant, type AgentEvent, type AgentResult, type AssistantMode, type StepState } from '../generate/agent';
import { applyOps } from '../generate/ops';
import { convertSpec } from '../generate/toElements';
import { AiSettingsDialog } from './AiSettingsDialog';
import { Btn, IconBtn, IS_MAC, ProviderMark, stopKeys } from './ui';
import { useAiReady } from './useAiReady';

export interface AiPanelProps {
  host: AiHostApi;
  /** Shows a close button when provided. */
  onClose?: () => void;
  /** Open settings yourself; when omitted the panel shows its own `AiSettingsDialog`. */
  onOpenSettings?: () => void;
  className?: string;
}

interface Step {
  id: string;
  label: string;
  state: StepState;
  detail?: string;
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
  applied?: 'insert' | 'replace' | 'edit';
}

const GENERATE_EXAMPLES = [
  'AWS 3-tier web app',
  'C4 container diagram for an e-commerce',
  'ER diagram for a blog',
  'Flowchart for a password reset',
  'Sequence diagram of an OAuth login',
  'Azure event-driven pipeline',
];
const EDIT_EXAMPLES = ['Add a Redis cache in front of the database', 'Label every connection', 'Add a monitoring service connected to all servers', 'Mark external systems as grey'];

let runSeq = 0;

export function AiPanel({ host, onClose, onOpenSettings, className }: AiPanelProps) {
  const settings = useAiSettings();
  const { ready, reason } = useAiReady();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [prompt, setPrompt] = useState('');
  const [mode, setMode] = useState<AssistantMode>('generate');
  const [runs, setRuns] = useState<Run[]>([]);
  const abortRef = useRef<AbortController | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLTextAreaElement>(null);

  const doc = host.getDoc();
  const docCount = doc.order.length;
  const selectionCount = host.getSelection().length;
  const running = runs.some((r) => r.status === 'running');
  const meta = PROVIDER_META[settings.provider];
  const model = modelFor(settings);
  const modelLabel = meta.models.find((m) => m.id === model)?.label ?? model;

  useEffect(() => {
    if (docCount === 0 && mode === 'edit') setMode('generate');
  }, [docCount, mode]);

  useEffect(() => () => abortRef.current?.abort(), []);

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
    const runMode: AssistantMode = mode === 'edit' && host.getDoc().order.length ? 'edit' : 'generate';
    setRuns((rs) => [...rs.slice(-9), { id, prompt: p, mode: runMode, model: modelLabel, status: 'running', steps: [] }]);
    setPrompt('');
    const ac = new AbortController();
    abortRef.current = ac;
    const onEvent = (e: AgentEvent) => {
      if (e.type !== 'step') return;
      patchRun(id, (r) => {
        const i = r.steps.findIndex((s) => s.id === e.id);
        const step = { id: e.id, label: e.label, state: e.state, detail: e.detail };
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
    } catch (e) {
      const aborted = (e as Error)?.name === 'AbortError';
      patchRun(id, (r) => ({
        ...r,
        status: aborted ? 'cancelled' : 'error',
        error: aborted ? undefined : e instanceof Error ? e.message : String(e),
        steps: r.steps.map((s) => (s.state === 'running' ? { ...s, state: aborted ? 'done' : 'error' } : s)),
      }));
    } finally {
      if (abortRef.current === ac) abortRef.current = null;
    }
  };

  const stop = () => abortRef.current?.abort();

  const apply = (run: Run, how: 'insert' | 'replace' | 'edit') => {
    const res = run.result;
    if (!res) return;
    if (res.kind === 'spec') {
      const els = convertSpec(res.spec, host.getViewportCenter()).elements;
      if (how === 'insert') host.insertElements(els);
      else host.replaceDoc(els);
    } else {
      host.replaceDoc(applyOps(host.getDoc(), res.ops).elements);
    }
    patchRun(run.id, (r) => ({ ...r, applied: how }));
  };

  const examples = mode === 'edit' ? EDIT_EXAMPLES : GENERATE_EXAMPLES;

  return (
    <div className={cn('flex h-full min-h-0 w-full flex-col bg-panel text-[13px] text-fg', className)} onKeyDown={stopKeys}>
      {/* Header */}
      <div className="flex h-12 shrink-0 items-center gap-2 border-b border-line pl-3.5 pr-2">
        <div className="flex size-6 items-center justify-center rounded-md bg-accent-soft text-accent">
          <Sparkles className="size-3.5" />
        </div>
        <span className="font-semibold">Assistant</span>
        <button
          type="button"
          onClick={openSettings}
          title="Model settings"
          className="ml-1 flex min-w-0 items-center gap-1.5 rounded-md py-1 pl-1 pr-1.5 text-[11.5px] text-muted ring-1 ring-line transition-colors hover:bg-hover hover:text-fg"
        >
          <ProviderMark provider={settings.provider} size={16} className="rounded" />
          <span className="truncate">{modelLabel || 'No model'}</span>
          <ChevronDown className="size-3 shrink-0" />
        </button>
        <div className="flex-1" />
        <IconBtn label="AI settings" size="sm" onClick={openSettings}>
          <Settings />
        </IconBtn>
        {onClose && (
          <IconBtn label="Close" size="sm" onClick={onClose}>
            <X />
          </IconBtn>
        )}
      </div>

      {/* Mode switch */}
      <div className="flex shrink-0 items-center gap-2 px-3 pt-3">
        <div className="grid flex-1 grid-cols-2 rounded-lg bg-panel-2 p-0.5 ring-1 ring-line">
          <ModeTab active={mode === 'generate'} onClick={() => setMode('generate')} icon={<Wand className="size-3.5" />}>
            Create
          </ModeTab>
          <ModeTab active={mode === 'edit'} disabled={docCount === 0} onClick={() => setMode('edit')} icon={<SquarePen className="size-3.5" />} title={docCount === 0 ? 'The canvas is empty' : undefined}>
            Edit diagram
          </ModeTab>
        </div>
      </div>

      {/* Activity */}
      <div ref={scrollRef} className="scroll-thin min-h-0 flex-1 space-y-3 overflow-y-auto px-3 py-3">
        {!isTauri() && (
          <div className="flex gap-2 rounded-lg bg-[#f5a524]/12 px-2.5 py-2 text-[11.5px] leading-snug text-muted ring-1 ring-[#f5a524]/30">
            <TriangleAlert className="mt-px size-3.5 shrink-0 text-[#d48806]" />
            Browser preview: API keys stay in memory for this tab and requests go straight from the page.
          </div>
        )}

        {ready === false && (
          <div className="animate-slide-up rounded-xl bg-panel-2 p-4 ring-1 ring-line">
            <div className="flex items-center gap-2 font-medium">
              <Sparkles className="size-4 text-accent" /> Connect a model
            </div>
            <p className="mt-1.5 text-[12px] leading-relaxed text-muted">
              Use your own key for Anthropic, OpenAI or Gemini — or run fully offline with Ollama. {reason ? `${reason} to get started.` : ''}
            </p>
            <Btn variant="primary" size="sm" className="mt-3" onClick={openSettings}>
              Set up AI
            </Btn>
          </div>
        )}

        {runs.length === 0 && ready !== false && (
          <div className="animate-fade px-1 pt-6 text-center">
            <div className="mx-auto flex size-10 items-center justify-center rounded-xl bg-accent-soft text-accent">
              <Sparkles className="size-5" />
            </div>
            <div className="mt-3 text-[14px] font-semibold">{mode === 'edit' ? 'What should change?' : 'What should we draw?'}</div>
            <p className="mx-auto mt-1 max-w-[260px] text-[12px] text-muted">
              {mode === 'edit'
                ? selectionCount
                  ? `Describe a change. “This” refers to the ${selectionCount} selected item${selectionCount === 1 ? '' : 's'}.`
                  : 'Describe a change to the current diagram.'
                : 'Describe a system, process or schema. Cloud diagrams use real AWS, Azure and GCP icons.'}
            </p>
          </div>
        )}

        {runs.map((run) => (
          <RunCard key={run.id} run={run} docEmpty={docCount === 0} onApply={(how) => apply(run, how)} onRetry={() => send(run.prompt)} />
        ))}
      </div>

      {/* Composer */}
      <div className="shrink-0 border-t border-line p-3">
        {(runs.length === 0 || !prompt) && !running && (
          <div className="mb-2 flex flex-wrap gap-1.5">
            {examples.slice(0, runs.length ? 3 : 6).map((ex) => (
              <button
                key={ex}
                type="button"
                onClick={() => {
                  setPrompt(ex);
                  textRef.current?.focus();
                }}
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
            placeholder={mode === 'edit' ? 'e.g. Add a CDN in front of the load balancer' : 'e.g. Serverless image upload pipeline on AWS'}
            className="block w-full resize-none bg-transparent px-3 pt-2.5 text-[13px] leading-relaxed text-fg outline-none placeholder:text-subtle"
          />
          <div className="flex items-center gap-2 px-2 pb-2">
            <span className="pl-1 text-[11px] text-subtle">{IS_MAC ? '⌘' : 'Ctrl'} ↵ to send</span>
            <div className="flex-1" />
            {running ? (
              <button
                type="button"
                onClick={stop}
                title="Stop"
                aria-label="Stop"
                className="flex size-7 items-center justify-center rounded-lg bg-fg text-panel transition-transform active:scale-95"
              >
                <Square className="size-3 fill-current" />
              </button>
            ) : (
              <button
                type="button"
                onClick={() => void send()}
                disabled={!prompt.trim()}
                title="Send"
                aria-label="Send"
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

function ModeTab({
  active, disabled, onClick, icon, title, children,
}: { active: boolean; disabled?: boolean; onClick: () => void; icon: React.ReactNode; title?: string; children: React.ReactNode }) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      title={title}
      className={cn(
        'flex h-7 items-center justify-center gap-1.5 rounded-md text-[12px] font-medium transition-[background,color,box-shadow] duration-150 disabled:opacity-40',
        active ? 'bg-panel text-fg shadow-[0_0_0_1px_var(--line),0_1px_2px_rgb(0_0_0/0.06)]' : 'text-muted hover:text-fg',
      )}
    >
      {icon}
      {children}
    </button>
  );
}

function StepIcon({ state }: { state: StepState }) {
  if (state === 'running') return <LoaderCircle className="size-3.5 animate-spin text-accent" />;
  if (state === 'error') return <CircleAlert className="size-3.5 text-[#d48806]" />;
  return <Check className="size-3.5 text-success" />;
}

function RunCard({ run, docEmpty, onApply, onRetry }: { run: Run; docEmpty: boolean; onApply: (how: 'insert' | 'replace' | 'edit') => void; onRetry: () => void }) {
  return (
    <div className="animate-slide-up space-y-2">
      <div className="ml-6 rounded-xl rounded-tr-sm bg-accent-soft px-3 py-2 text-[12.5px] leading-relaxed text-fg">
        <div className="whitespace-pre-wrap break-words">{run.prompt}</div>
        {run.mode === 'edit' && <div className="mt-1 text-[10.5px] font-medium uppercase tracking-wide text-accent">Edit</div>}
      </div>

      {run.steps.length > 0 && (
        <ol className="space-y-1 px-1">
          {run.steps.map((s) => (
            <li key={s.id} className="animate-fade flex items-center gap-2 text-[12px]">
              <StepIcon state={s.state} />
              <span className={cn('truncate', s.state === 'running' ? 'text-fg' : 'text-muted')}>{s.label}</span>
              {s.detail && <span className="ml-auto shrink-0 truncate pl-2 text-[11px] text-subtle">{s.detail}</span>}
            </li>
          ))}
        </ol>
      )}

      {run.status === 'running' && run.steps.length === 0 && (
        <div className="flex items-center gap-2 px-1 text-[12px] text-muted">
          <LoaderCircle className="size-3.5 animate-spin text-accent" /> Starting…
        </div>
      )}

      {run.status === 'cancelled' && <div className="px-1 text-[12px] text-subtle">Stopped.</div>}

      {run.status === 'error' && (
        <div className="animate-pop rounded-xl bg-danger/8 p-3 ring-1 ring-danger/25">
          <div className="flex items-start gap-2 text-[12px] text-fg">
            <CircleAlert className="mt-px size-3.5 shrink-0 text-danger" />
            <span className="line-clamp-6 break-words">{run.error}</span>
          </div>
          <Btn size="sm" variant="ghost" className="mt-2" icon={<RotateCcw />} onClick={onRetry}>
            Try again
          </Btn>
        </div>
      )}

      {run.status === 'done' && run.result && <ResultCard run={run} result={run.result} docEmpty={docEmpty} onApply={onApply} />}
    </div>
  );
}

function ResultCard({ run, result, docEmpty, onApply }: { run: Run; result: AgentResult; docEmpty: boolean; onApply: (how: 'insert' | 'replace' | 'edit') => void }) {
  const [showNotes, setShowNotes] = useState(false);
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
          <span className="font-medium">{result.kind === 'spec' ? (result.spec.title ?? 'Diagram ready') : 'Changes ready'}</span>
          <span className="ml-auto truncate text-[11px] text-subtle">{run.model}</span>
        </div>
        <div className="mt-1 text-[12px] text-muted">
          {result.kind === 'spec' ? (
            <>
              {result.spec.nodes.length} shapes · {result.spec.edges.length} connectors
              {result.spec.nodes.some((n) => n.icon) ? ` · ${result.spec.nodes.filter((n) => n.icon).length} icons` : ''}
            </>
          ) : (
            <>
              {result.summary || 'Edits to the current diagram'}
              <span className="mt-1 flex gap-2 text-[11.5px]">
                {stats!.add > 0 && <span className="text-success">+{stats!.add} added</span>}
                {stats!.update > 0 && <span className="text-accent">~{stats!.update} changed</span>}
                {stats!.remove > 0 && <span className="text-danger">−{stats!.remove} removed</span>}
              </span>
            </>
          )}
        </div>
        {result.message && <p className="mt-2 text-[12px] leading-relaxed text-fg/80">{result.message}</p>}

        {result.warnings.length > 0 && (
          <div className="mt-2">
            <button type="button" onClick={() => setShowNotes((v) => !v)} className="flex items-center gap-1 text-[11.5px] text-subtle hover:text-muted">
              <ChevronDown className={cn('size-3 transition-transform', !showNotes && '-rotate-90')} />
              {result.warnings.length} adjustment{result.warnings.length === 1 ? '' : 's'}
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

        <div className="mt-3 flex items-center gap-2">
          {run.applied ? (
            <span className="animate-fade flex items-center gap-1.5 text-[12px] text-success">
              <Check className="size-3.5" />
              {run.applied === 'insert' ? 'Inserted' : run.applied === 'replace' ? 'Replaced the diagram' : 'Applied'}
              <span className="text-subtle">· {IS_MAC ? '⌘' : 'Ctrl'}Z to undo</span>
            </span>
          ) : result.kind === 'spec' ? (
            <>
              <Btn variant="primary" size="sm" icon={<Plus />} onClick={() => onApply('insert')}>
                Insert
              </Btn>
              {!docEmpty && (
                <Btn size="sm" icon={<Replace />} onClick={() => onApply('replace')}>
                  Replace diagram
                </Btn>
              )}
            </>
          ) : (
            <Btn variant="primary" size="sm" icon={<Check />} onClick={() => onApply(result.kind === 'ops' ? 'edit' : 'replace')}>
              Apply changes
            </Btn>
          )}
        </div>
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
