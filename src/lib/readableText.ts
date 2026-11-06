/**
 * Makes every label readable: nothing overflows, covers or overlaps text.
 * Runs on pages with `settings.readableText` when they load (new diagrams,
 * generated files) and as the "Make text readable" command; pages without the
 * flag (existing files) are never touched on load.
 *
 * Pure: returns a new Doc. In order:
 * 1. Overflowing text: text elements grow to fit (anchored by their
 *    alignment); a label that overflows its shape (cards, table cells) wraps,
 *    then steps its font size down, so the layout around it does not move.
 * 2. Shapes drawn over text: a small shape (a badge) moves out of the way; a
 *    big one (a card) goes behind the text instead.
 * 3. Text over text: free text elements move down until they are clear.
 * 4. Connectors keep clear of text (avoidText; see src/lib/connectorGeometry.ts).
 * What it cannot fix stays visible to checkLayout (src/lib/layoutCheck.ts).
 */
import type { ConnectorElement, DiagramElement, Doc, Page, Rect, ShapeElement } from '@/model/types';
import { containsRect, inflate } from '@/lib/geometry';
import { hasOutsideLabel, labelInkBox } from '@/text/labelLayout';
import { getShapeDef } from '@/shapes/registry';

/** Space kept between text and whatever moved away from it (px). */
const GAP = 4;
/** Labels never shrink below this font size, nor below this share of their size. */
const MIN_FONT = 8;
const MIN_FONT_SHARE = 0.7;
/** Overflow up to this many px is line-height rounding, not overflow. */
const SLACK = 2;

const rectOf = (s: ShapeElement): Rect => ({ x: s.x, y: s.y, w: s.w, h: s.h });
const overlaps = (a: Rect, b: Rect) => Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x) > 1 && Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y) > 1;
const area = (r: Rect) => r.w * r.h;
const fits = (s: ShapeElement, ink: Rect) => containsRect(inflate(rectOf(s), SLACK), ink);
const isFreeText = (s: ShapeElement) => s.kind === 'text' && !s.rotation && !s.locked && s.behavior?.movable !== false;
// Same rule as isContainerShape (src/interaction/container.ts), which can't be imported here: it reads the store.
const isContainer = (s: ShapeElement) => s.container ?? !!getShapeDef(s.kind).container;
const isMovable = (s: ShapeElement) => !s.rotation && !s.locked && s.behavior?.movable !== false && !isContainer(s);

/** Text elements: grow the box to the text, keeping the side the text is aligned to in place. */
function growText(s: ShapeElement): ShapeElement {
  const ink = labelInkBox(s);
  if (!ink || fits(s, ink)) return s;
  const w = Math.max(s.w, Math.ceil(ink.w));
  const h = Math.max(s.h, Math.ceil(ink.h));
  const { textAlign, verticalAlign } = s.style;
  const x = textAlign === 'center' ? s.x - (w - s.w) / 2 : textAlign === 'right' ? s.x - (w - s.w) : s.x;
  const y = verticalAlign === 'middle' ? s.y - (h - s.h) / 2 : verticalAlign === 'bottom' ? s.y - (h - s.h) : s.y;
  return { ...s, x, y, w, h };
}

/** Labels inside a shape: wrap, then smaller font, never a bigger shape. */
function fitLabel(s: ShapeElement): ShapeElement {
  const ink = labelInkBox(s);
  if (!ink || fits(s, ink)) return s;
  const wrapped = s.style.wrap === false ? { ...s, style: { ...s.style, wrap: true } } : s;
  const min = Math.max(MIN_FONT, Math.floor(s.style.fontSize * MIN_FONT_SHARE));
  for (let size = wrapped.style.fontSize; size >= min; size--) {
    const t = size === wrapped.style.fontSize ? wrapped : { ...wrapped, style: { ...wrapped.style, fontSize: size } };
    const r = labelInkBox(t);
    if (r && fits(t, r)) return t;
  }
  // ponytail: rich labels with inline font sizes don't follow style.fontSize; they stay as they are (checkLayout reports them).
  return s;
}

/** The smallest move that takes `r` clear of `ink`, among those that do not land on other text. */
function moveClear(r: Rect, ink: Rect, others: Rect[]): { dx: number; dy: number } | null {
  const options = [
    { dx: 0, dy: ink.y - GAP - (r.y + r.h) },
    { dx: 0, dy: ink.y + ink.h + GAP - r.y },
    { dx: ink.x - GAP - (r.x + r.w), dy: 0 },
    { dx: ink.x + ink.w + GAP - r.x, dy: 0 },
  ].sort((a, b) => Math.abs(a.dx) + Math.abs(a.dy) - Math.abs(b.dx) - Math.abs(b.dy));
  return options.find((m) => !others.some((o) => overlaps({ ...r, x: r.x + m.dx, y: r.y + m.dy }, o))) ?? null;
}

export function makeTextReadable(doc: Doc): Doc {
  const els: Record<string, DiagramElement> = { ...doc.elements };
  let order = doc.order.slice();
  const shapes = () => order.map((id) => els[id]).filter((e): e is ShapeElement => e?.type === 'shape' && !e.hidden);

  // 1. Overflow.
  for (const s of shapes()) {
    if (!s.text || s.rotation || hasOutsideLabel(s)) continue;
    els[s.id] = s.kind === 'text' ? growText(s) : fitLabel(s);
  }

  // 2. Shapes over text.
  const inks = () => shapes().flatMap((s) => {
    const ink = labelInkBox(s);
    return ink ? [{ s, ink }] : [];
  });
  for (const { s: t, ink } of inks()) {
    for (const o of shapes()) {
      const above = order.indexOf(o.id) > order.indexOf(t.id);
      if (o.id === t.id || o.kind === 'text' || o.style.fill === 'none' || !above || !overlaps(rectOf(o), ink)) continue;
      const small = area(rectOf(o)) < area(ink) && isMovable(o);
      const move = small ? moveClear(rectOf(o), ink, inks().filter((i) => i.s.id !== o.id && i.s.id !== t.id).map((i) => i.ink)) : null;
      if (move) {
        els[o.id] = { ...o, x: o.x + move.dx, y: o.y + move.dy };
      } else {
        // Big shape (or nowhere to go): the text comes in front of it.
        order = order.filter((id) => id !== t.id);
        order.splice(order.indexOf(o.id) + 1, 0, t.id);
      }
    }
  }

  // 3. Text over text: top to bottom, a free text element moves below the text it lands on.
  // ponytail: a few passes, enough for stacked captions; a pile-up beyond that stays reported by checkLayout.
  for (let pass = 0; pass < 3; pass++) {
    let moved = false;
    const list = inks().sort((a, b) => a.ink.y - b.ink.y || a.ink.x - b.ink.x);
    for (let i = 0; i < list.length; i++) {
      for (let j = 0; j < i; j++) {
        const a = list[j];
        const b = list[i];
        if (!overlaps(a.ink, b.ink)) continue;
        const [still, mover] = isFreeText(b.s) ? [a, b] : isFreeText(a.s) ? [b, a] : [null, null];
        if (!still || !mover) continue;
        const cur = els[mover.s.id] as ShapeElement;
        const dy = still.ink.y + still.ink.h + GAP - mover.ink.y;
        els[cur.id] = { ...cur, y: cur.y + dy };
        mover.ink = { ...mover.ink, y: mover.ink.y + dy };
        moved = true;
      }
    }
    if (!moved) break;
  }

  // 4. Connectors keep clear of text.
  for (const id of order) {
    const c = els[id];
    if (c?.type === 'connector' && c.avoidText === undefined) els[id] = { ...c, avoidText: true } as ConnectorElement;
  }

  return { ...doc, elements: els, order };
}

/** Pages with `settings.readableText` made readable; other pages (existing files) as they are. */
export function readablePages(pages: Page[]): Page[] {
  return pages.map((p) => (p.settings.readableText && p.doc.order.length ? { ...p, doc: makeTextReadable(p.doc) } : p));
}
