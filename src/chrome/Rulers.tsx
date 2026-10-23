/**
 * Horizontal & vertical rulers (View → Rulers) in the chosen unit, with the
 * selection's extent highlighted.
 */
import { useMemo } from 'react';
import { useEditor, selectionBounds } from '@/store/editor';
import { useUi } from '@/store/ui';
import { UNIT_PER_PX } from '@/canvas/paper';
import { formatNumber, useLocale } from '@/i18n';

const SIZE = 20;

export function Rulers() {
  const on = useUi((s) => s.rulers);
  if (!on) return null;
  return (
    <>
      <Ruler axis="x" />
      <Ruler axis="y" />
      <div className="pointer-events-none absolute left-0 top-0 z-[5] bg-panel" style={{ width: SIZE, height: SIZE, boxShadow: 'inset -1px -1px 0 var(--line)' }} />
    </>
  );
}

function niceStep(pxPerUnit: number) {
  // Aim for ~80px between labeled ticks.
  const raw = 80 / pxPerUnit;
  const pow = Math.pow(10, Math.floor(Math.log10(raw)));
  for (const m of [1, 2, 5, 10]) if (m * pow >= raw) return m * pow;
  return 10 * pow;
}

function Ruler({ axis }: { axis: 'x' | 'y' }) {
  const camera = useEditor((s) => s.camera);
  const viewport = useEditor((s) => s.viewport);
  const units = useUi((s) => s.units);
  const sel = useEditor((s) => (s.selection.length ? selectionBounds(s.doc, s.selection) : null));
  const len = axis === 'x' ? viewport.w : viewport.h;
  const offset = axis === 'x' ? camera.x : camera.y;
  const perPx = UNIT_PER_PX[units];
  const pxPerUnit = camera.z / perPx; // screen px per unit
  const step = niceStep(pxPerUnit);
  const locale = useLocale();

  const ticks = useMemo(() => {
    const out: Array<{ pos: number; label?: string; major: boolean }> = [];
    const startUnit = Math.floor((-offset / camera.z) * perPx / step) * step;
    const minor = step / 5;
    for (let u = startUnit; ; u += minor) {
      const pos = (u / perPx) * camera.z + offset;
      if (pos > len) break;
      const major = Math.abs(u / step - Math.round(u / step)) < 1e-6;
      out.push({ pos, major, label: major ? formatNumber(Math.round(u * 100) / 100) : undefined });
      if (out.length > 600) break;
    }
    return out;
  }, [offset, camera.z, perPx, step, len, locale]);

  const highlight = sel
    ? axis === 'x'
      ? [sel.x * camera.z + camera.x, (sel.x + sel.w) * camera.z + camera.x]
      : [sel.y * camera.z + camera.y, (sel.y + sel.h) * camera.z + camera.y]
    : null;

  const horizontal = axis === 'x';
  return (
    <svg
      className="pointer-events-none absolute z-[4] bg-panel"
      style={horizontal ? { left: 0, top: 0, width: '100%', height: SIZE, boxShadow: 'inset 0 -1px 0 var(--line)' } : { left: 0, top: 0, width: SIZE, height: '100%', boxShadow: 'inset -1px 0 0 var(--line)' }}
    >
      {highlight && (
        horizontal ? (
          <rect x={highlight[0]} y={0} width={Math.max(1, highlight[1] - highlight[0])} height={SIZE} fill="var(--accent-soft)" />
        ) : (
          <rect x={0} y={highlight[0]} width={SIZE} height={Math.max(1, highlight[1] - highlight[0])} fill="var(--accent-soft)" />
        )
      )}
      {ticks.map((t, i) =>
        horizontal ? (
          <g key={i}>
            <line x1={t.pos} x2={t.pos} y1={t.major ? 6 : 14} y2={SIZE} stroke="var(--fg-subtle)" strokeWidth={1} />
            {t.label && (
              <text x={t.pos + 3} y={10} fontSize={9} fill="var(--fg-muted)" fontFamily="Inter Variable, system-ui">
                {t.label}
              </text>
            )}
          </g>
        ) : (
          <g key={i}>
            <line y1={t.pos} y2={t.pos} x1={t.major ? 6 : 14} x2={SIZE} stroke="var(--fg-subtle)" strokeWidth={1} />
            {t.label && (
              <text x={9} y={t.pos + 3} fontSize={9} fill="var(--fg-muted)" fontFamily="Inter Variable, system-ui" transform={`rotate(-90 9 ${t.pos + 3})`}>
                {t.label}
              </text>
            )}
          </g>
        ),
      )}
    </svg>
  );
}
