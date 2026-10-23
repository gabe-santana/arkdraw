/**
 * The tool-calling loop: prompt → (search_icons)* → submit_diagram / submit_edits.
 */
import type { Doc } from '@/model/types';
import { AiError, type ChatMessage, type ChatTool, type ProviderConfig, type ToolResult } from '../providers/types';
import { chat as defaultChat } from '../transport';
import { knownIconPaths, loadIconProviders, searchIcons } from './icons';
import { validateOps, type EditOp } from './ops';
import { editSystemPrompt, editUserMessage, generateSystemPrompt, SEARCH_ICONS_TOOL, SUBMIT_DIAGRAM_TOOL, SUBMIT_EDITS_TOOL } from './prompts';
import { serializeDoc } from './serialize';
import { t } from '@/i18n';
import { validateSpec, type DiagramSpec } from './spec';

export type AssistantMode = 'generate' | 'edit';

export type StepState = 'running' | 'done' | 'error';

export type AgentEvent =
  | { type: 'step'; id: string; label: string; state: StepState; detail?: string }
  | { type: 'text'; text: string };

export type AgentResult =
  | { kind: 'spec'; spec: DiagramSpec; warnings: string[]; message: string }
  | { kind: 'ops'; ops: EditOp[]; summary: string; warnings: string[]; message: string };

export interface RunOptions {
  config: ProviderConfig;
  prompt: string;
  mode: AssistantMode;
  /** Required in edit mode. */
  doc?: Doc;
  selection?: string[];
  onEvent?: (e: AgentEvent) => void;
  signal?: AbortSignal;
  maxTurns?: number;
  /** Injectable for tests. */
  chat?: typeof defaultChat;
}

const iconsIn = (args: unknown): string[] => {
  const out: string[] = [];
  const visit = (v: unknown) => {
    if (Array.isArray(v)) v.forEach(visit);
    else if (v && typeof v === 'object') {
      for (const [k, x] of Object.entries(v)) {
        if (k === 'icon' && typeof x === 'string') out.push(x.replace(/^\/?icons\//, ''));
        else visit(x);
      }
    }
  };
  visit(args);
  return out;
};

export async function runAssistant(opts: RunOptions): Promise<AgentResult> {
  const { config, mode, onEvent, signal } = opts;
  const chat = opts.chat ?? defaultChat;
  const maxTurns = opts.maxTurns ?? 10;
  const emit = (e: AgentEvent) => onEvent?.(e);
  if (mode === 'edit' && !opts.doc) throw new AiError(t('ai.error.nothingToEdit'));

  const providers = await loadIconProviders();
  const tools: ChatTool[] = [
    ...(providers.length ? [SEARCH_ICONS_TOOL] : []),
    SUBMIT_DIAGRAM_TOOL,
    ...(mode === 'edit' ? [SUBMIT_EDITS_TOOL] : []),
  ];
  const system = mode === 'edit' ? editSystemPrompt(providers) : generateSystemPrompt(providers);
  const firstMessage = mode === 'edit' ? editUserMessage(opts.prompt, serializeDoc(opts.doc!, opts.selection)) : opts.prompt;
  const messages: ChatMessage[] = [{ role: 'user', text: firstMessage }];
  let nudged = false;
  let stepSeq = 0;
  const lastText: string[] = [];

  for (let turn = 0; turn < maxTurns; turn++) {
    if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');
    const thinkId = `think-${stepSeq++}`;
    const thinkLabel = turn === 0 ? t('ai.step.planning') : t('ai.step.working');
    emit({ type: 'step', id: thinkId, label: thinkLabel, state: 'running' });
    let res;
    try {
      res = await chat(config, { system, messages, tools }, signal);
    } catch (e) {
      emit({ type: 'step', id: thinkId, label: thinkLabel, state: 'error' });
      throw e;
    }
    emit({ type: 'step', id: thinkId, label: thinkLabel, state: 'done' });
    messages.push({ role: 'assistant', text: res.text, toolCalls: res.toolCalls, native: res.native });
    if (res.text.trim()) {
      lastText.push(res.text.trim());
      emit({ type: 'text', text: res.text.trim() });
    }

    if (!res.toolCalls.length) {
      if (res.stopReason === 'max_tokens') throw new AiError(t('ai.error.cutOff'));
      if (nudged) throw new AiError(res.text.trim() || t('ai.error.noDiagram'));
      nudged = true;
      messages.push({
        role: 'user',
        text: mode === 'edit' ? 'Please apply the change now by calling submit_edits (or submit_diagram for a full replacement).' : 'Please call submit_diagram now with the complete diagram spec.',
      });
      continue;
    }

    const results: ToolResult[] = [];
    let final: AgentResult | undefined;
    for (const call of res.toolCalls) {
      const id = `tool-${stepSeq++}`;
      const args = (call.args ?? {}) as Record<string, unknown>;
      if (call.name === 'search_icons') {
        const query = String(args.query ?? '').slice(0, 120);
        const provider = typeof args.provider === 'string' ? args.provider : undefined;
        const label = provider ? t('ai.step.searchingIconsIn', { query, provider }) : t('ai.step.searchingIcons', { query });
        emit({ type: 'step', id, label, state: 'running' });
        const hits = await searchIcons(query, provider);
        emit({ type: 'step', id, label, state: 'done', detail: t('ai.step.matches', { count: hits.length }) });
        results.push({
          id: call.id,
          name: call.name,
          content: JSON.stringify(hits.length ? { matches: hits } : { matches: [], hint: 'No icon found; try another name or use a generic shape.' }),
        });
      } else if (call.name === 'submit_diagram') {
        emit({ type: 'step', id, label: t('ai.step.validating'), state: 'running' });
        const known = await knownIconPaths(iconsIn(args));
        const v = validateSpec(args, { knownIcons: known });
        if (v.ok) {
          emit({ type: 'step', id, label: t('ai.step.validating'), state: 'done', detail: t('ai.step.nodesEdges', { nodes: v.spec.nodes.length, edges: v.spec.edges.length }) });
          results.push({ id: call.id, name: call.name, content: `Accepted: ${v.spec.nodes.length} nodes, ${v.spec.edges.length} edges.` });
          final ??= { kind: 'spec', spec: v.spec, warnings: v.warnings, message: '' };
        } else {
          emit({ type: 'step', id, label: t('ai.step.fixingValidation'), state: 'error', detail: v.errors[0] });
          results.push({ id: call.id, name: call.name, content: `Invalid diagram:\n- ${v.errors.join('\n- ')}`, isError: true });
        }
      } else if (call.name === 'submit_edits' && mode === 'edit') {
        emit({ type: 'step', id, label: t('ai.step.checkingChanges'), state: 'running' });
        const known = await knownIconPaths(iconsIn(args));
        const v = validateOps(args, opts.doc!, known);
        if (v.ok) {
          emit({ type: 'step', id, label: t('ai.step.checkingChanges'), state: 'done', detail: t('ai.step.operations', { count: v.ops.length }) });
          results.push({ id: call.id, name: call.name, content: `Accepted ${v.ops.length} operations.` });
          final ??= { kind: 'ops', ops: v.ops, summary: typeof args.summary === 'string' ? args.summary : '', warnings: v.warnings, message: '' };
        } else {
          emit({ type: 'step', id, label: t('ai.step.fixingChanges'), state: 'error', detail: v.errors[0] });
          results.push({ id: call.id, name: call.name, content: `Invalid operations:\n- ${v.errors.join('\n- ')}`, isError: true });
        }
      } else {
        results.push({ id: call.id, name: call.name, content: `Unknown tool "${call.name}".`, isError: true });
      }
    }
    messages.push({ role: 'tool', results });
    if (final) {
      final.message = lastText.join('\n\n');
      return final;
    }
  }
  throw new AiError(t('ai.error.notFinished'));
}
