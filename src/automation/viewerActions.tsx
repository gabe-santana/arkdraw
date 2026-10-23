/**
 * Custom link actions in the read-only viewer: visibility changes live in
 * viewer state (per page, never written back), `select` and `highlight` draw
 * a transient outline, and `scroll` centres the camera on the targets.
 */
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { Doc, Rect } from '@/model/types';
import { elementBounds } from '@/store/editor';
import { unionRects } from '@/lib/geometry';
import { isActionLink, runActionLink } from './linkActions';

interface Mark {
  key: number;
  rects: Rect[];
  color: string;
}

let seq = 0;

/**
 * `baseDoc` is the page as authored; the returned `doc` has the action
 * overrides applied. `run` returns false for links that aren't actions.
 */
export function useViewerActions(pageId: string, baseDoc: Doc, opts: { scrollTo: (r: Rect) => void; open: (link: string) => void }) {
  const [docs, setDocs] = useState<Record<string, Doc>>({});
  const [marks, setMarks] = useState<Mark[]>([]);
  const doc = docs[pageId] ?? baseDoc;
  const docRef = useRef(doc);
  docRef.current = doc;
  const optsRef = useRef(opts);
  optsRef.current = opts;
  const timers = useRef<number[]>([]);
  useEffect(() => () => timers.current.forEach((t) => window.clearTimeout(t)), []);

  const run = useCallback(
    (link: string): boolean => {
      if (!isActionLink(link)) return false;
      const rectsOf = (ids: string[]) => ids.map((id) => docRef.current.elements[id]).filter(Boolean).map((el) => elementBounds(el, docRef.current));
      const mark = (ids: string[], color: string, ms: number) => {
        const rects = rectsOf(ids);
        if (!rects.length) return;
        const m = { key: ++seq, rects, color };
        setMarks((list) => [...list, m]);
        timers.current.push(window.setTimeout(() => setMarks((list) => list.filter((x) => x.key !== m.key)), ms));
      };
      runActionLink(link, {
        getDoc: () => docRef.current,
        setDoc: (d) => {
          docRef.current = d;
          setDocs((all) => ({ ...all, [pageId]: d }));
        },
        select: (ids) => mark(ids, '#6366f1', 2500),
        highlight: mark,
        scrollTo: (ids) => {
          const b = unionRects(rectsOf(ids));
          if (b) optsRef.current.scrollTo(b);
        },
        open: (l) => optsRef.current.open(l),
      });
      return true;
    },
    [pageId],
  );

  const overlay: ReactNode = useMemo(
    () =>
      marks.map((m) =>
        m.rects.map((r, i) => (
          <rect
            key={`${m.key}-${i}`}
            x={r.x - 6}
            y={r.y - 6}
            width={r.w + 12}
            height={r.h + 12}
            rx={8}
            fill={m.color}
            fillOpacity={0.12}
            stroke={m.color}
            strokeWidth={2.5}
            vectorEffect="non-scaling-stroke"
            pointerEvents="none"
            className="animate-fade"
          />
        )),
      ),
    [marks],
  );

  return { doc, run, overlay };
}
