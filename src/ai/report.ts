/**
 * Reporting what the assistant generated (offensive, harmful or wrong output).
 * ArkDraw has no server: a report is an email the user sends from their own
 * mail app, holding only what they chose to include. See PRIVACY.md.
 */
import type { AgentResult } from './generate/agent';

export const REPORT_EMAIL = 'gsantana.sza@gmail.com';

export const REPORT_REASONS = ['harmful', 'offensive', 'inaccurate', 'other'] as const;
export type ReportReason = (typeof REPORT_REASONS)[number];

export interface AiReport {
  reason: ReportReason;
  details: string;
  /** The request and the generated output; only when the user ticks "include". */
  content?: { prompt: string; result: AgentResult };
  model: string;
  version: string;
  platform: 'web' | 'desktop';
}

/** Mail links longer than this are cut by some mail apps and browsers. */
const MAX_BODY = 1900;

const clip = (s: string, n: number) => (s.length > n ? `${s.slice(0, n - 1)}…` : s);

/** What the assistant produced, as plain text: its reply and the labels it drew or changed. */
export function describeResult(result: AgentResult): string {
  const lines: string[] = [];
  if (result.kind === 'spec') {
    if (result.spec.title) lines.push(`Title: ${result.spec.title}`);
    const labels = [...result.spec.nodes.map((n) => n.text), ...result.spec.edges.map((e) => e.label)].filter((s): s is string => !!s?.trim());
    if (labels.length) lines.push(`Labels: ${labels.join(' | ')}`);
  } else {
    if (result.summary) lines.push(`Summary: ${result.summary}`);
    const texts = result.ops
      .flatMap((o) =>
        o.op === 'add_node' ? [o.node.text, o.node.description]
        : o.op === 'update_node' ? [o.text, o.description]
        : o.op === 'add_edge' ? [o.edge.label]
        : o.op === 'update_edge' ? [o.label]
        : [],
      )
      .filter((s): s is string => !!s?.trim());
    if (texts.length) lines.push(`Text: ${texts.join(' | ')}`);
  }
  if (result.message) lines.push(`Reply: ${result.message}`);
  return lines.join('\n');
}

export function reportText(r: AiReport): string {
  const parts = [
    `Reason: ${r.reason}`,
    r.details.trim() && `Details: ${clip(r.details.trim(), 400)}`,
    r.content && `Request: ${clip(r.content.prompt, 400)}`,
    r.content && `Generated:\n${clip(describeResult(r.content.result), 900)}`,
    `Model: ${r.model}`,
    `ArkDraw ${r.version} (${r.platform})`,
  ];
  return parts.filter(Boolean).join('\n\n');
}

/** A mailto: link with the report as the body, shortened to fit. */
export function reportMailto(r: AiReport): string {
  const subject = `ArkDraw AI content report: ${r.reason}`;
  return `mailto:${REPORT_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(clip(reportText(r), MAX_BODY))}`;
}
