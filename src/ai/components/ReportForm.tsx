/**
 * "Report this response": flags offensive, harmful or wrong AI output to the
 * maintainer. The report opens in the user's mail app (see ../report.ts), so
 * nothing leaves the device until they send it.
 */
import { useEffect, useRef, useState } from 'react';
import { Check, Copy, Flag } from 'lucide-react';
import { cn } from '@/lib/cn';
import { useT, type MessageKey } from '@/i18n';
import type { AgentResult } from '../generate/agent';
import { REPORT_EMAIL, REPORT_REASONS, reportMailto, reportText, type AiReport, type ReportReason } from '../report';
import { isTauri } from '../transport';
import { Btn, openLink } from './ui';

const REASON_LABEL: Record<ReportReason, MessageKey> = {
  harmful: 'ai.report.reason.harmful',
  offensive: 'ai.report.reason.offensive',
  inaccurate: 'ai.report.reason.inaccurate',
  other: 'ai.report.reason.other',
};

export function ReportForm({ prompt, result, model, onClose }: { prompt: string; result: AgentResult; model: string; onClose: () => void }) {
  const t = useT();
  const [reason, setReason] = useState<ReportReason | null>(null);
  const [details, setDetails] = useState('');
  const [include, setInclude] = useState(true);
  const [sent, setSent] = useState(false);
  const [copied, setCopied] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  // It opens below the result, often under the fold of the conversation.
  useEffect(() => {
    ref.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, [sent]);

  const report = (): AiReport => ({
    reason: reason ?? 'other',
    details,
    content: include ? { prompt, result } : undefined,
    model,
    version: __APP_VERSION__,
    platform: isTauri() ? 'desktop' : 'web',
  });
  const send = () => {
    void openLink(reportMailto(report()));
    setSent(true);
  };
  const copy = async () => {
    await navigator.clipboard?.writeText(`To: ${REPORT_EMAIL}\n\n${reportText(report())}`);
    setCopied(true);
  };

  return (
    <div ref={ref} className="animate-fade mt-3 rounded-lg bg-panel-2 p-2.5 ring-1 ring-line" role="group" aria-label={t('ai.report.title')}>
      <div className="flex items-center gap-1.5 text-[12px] font-medium text-fg">
        <Flag className="size-3.5 text-danger" />
        {t('ai.report.title')}
      </div>
      {sent ? (
        <>
          <p className="mt-1.5 text-[12px] leading-snug text-muted">{t('ai.report.sent')}</p>
          <p className="mt-1 text-[11.5px] leading-snug text-subtle">{t('ai.report.noMail', { email: REPORT_EMAIL })}</p>
          <div className="mt-2 flex justify-end gap-1">
            <Btn size="sm" variant="ghost" icon={copied ? <Check /> : <Copy />} onClick={() => void copy()}>
              {copied ? t('ai.report.copied') : t('ai.report.copy')}
            </Btn>
            <Btn size="sm" onClick={onClose}>
              {t('common.close')}
            </Btn>
          </div>
        </>
      ) : (
        <>
          <div className="mt-2 flex flex-wrap gap-1" role="radiogroup" aria-label={t('ai.report.title')}>
            {REPORT_REASONS.map((r) => (
              <button
                key={r}
                type="button"
                role="radio"
                aria-checked={reason === r}
                onClick={() => setReason(r)}
                className={cn(
                  'rounded-full px-2.5 py-1 text-[11.5px] ring-1 transition-colors',
                  reason === r ? 'bg-accent-soft text-accent ring-accent/40' : 'bg-panel text-muted ring-line hover:bg-hover hover:text-fg',
                )}
              >
                {t(REASON_LABEL[r])}
              </button>
            ))}
          </div>
          <textarea
            value={details}
            onChange={(e) => setDetails(e.target.value)}
            rows={2}
            placeholder={t('ai.report.details')}
            className="mt-2 w-full resize-none rounded-lg bg-panel px-2.5 py-1.5 text-[12px] text-fg outline-none ring-1 ring-line placeholder:text-subtle focus:ring-2 focus:ring-accent/40"
          />
          <label className="mt-1.5 flex cursor-pointer items-start gap-2 text-[12px] leading-snug text-muted">
            <input type="checkbox" className="mt-px size-3.5 shrink-0 accent-[var(--accent)]" checked={include} onChange={(e) => setInclude(e.target.checked)} />
            <span>{t('ai.report.include')}</span>
          </label>
          <p className="mt-1.5 text-[11.5px] leading-snug text-subtle">{t('ai.report.hint')}</p>
          <div className="mt-2 flex justify-end gap-1">
            <Btn size="sm" variant="ghost" onClick={onClose}>
              {t('common.cancel')}
            </Btn>
            <Btn size="sm" variant="primary" icon={<Flag />} disabled={!reason} onClick={send}>
              {t('ai.report.send')}
            </Btn>
          </div>
        </>
      )}
    </div>
  );
}
