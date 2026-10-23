/**
 * Extra connector labels (mxGraph child edge labels): dragging one along its
 * connector, and an in-place editor opened by double-clicking it.
 */
import { useEffect, useRef } from 'react';
import { create } from 'zustand';
import type { ConnectorElement, ConnectorLabel, Vec } from '@/model/types';
import { isConnector } from '@/model/types';
import { fontStack } from '@/text/fonts';
import { connectorGeometryInDoc, labelAt } from '@/lib/connectorGeometry';
import { dist } from '@/lib/geometry';
import { lineHeight } from '@/lib/text';
import { uid } from '@/lib/id';
import { useEditor } from '@/store/editor';

interface EditState {
  connId: string | null;
  index: number;
}

export const useExtraLabelEdit = create<EditState>(() => ({ connId: null, index: -1 }));

/** Signed perpendicular offset and fraction of the closest point on a polyline. */
export function projectSigned(pts: Vec[], p: Vec): { t: number; offset: number } {
  let total = 0;
  for (let i = 1; i < pts.length; i++) total += dist(pts[i - 1], pts[i]);
  let best = { d: Infinity, along: 0, offset: 0 };
  let acc = 0;
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1];
    const b = pts[i];
    const l = dist(a, b);
    const k = l ? Math.max(0, Math.min(1, ((p.x - a.x) * (b.x - a.x) + (p.y - a.y) * (b.y - a.y)) / (l * l))) : 0;
    const q = { x: a.x + (b.x - a.x) * k, y: a.y + (b.y - a.y) * k };
    const d = dist(p, q);
    if (d < best.d) {
      const cross = l ? ((b.x - a.x) * (p.y - a.y) - (b.y - a.y) * (p.x - a.x)) / l : 0;
      best = { d, along: acc + k * l, offset: d * Math.sign(cross) };
    }
    acc += l;
  }
  return { t: total ? best.along / total : 0.5, offset: best.offset };
}

/** Moves extra label `index` of `conn` to the point on (or beside) the path nearest `p`. */
export function moveExtraLabel(conn: ConnectorElement, index: number, p: Vec) {
  const labels = conn.labels ?? [];
  if (!labels[index]) return;
  const s = useEditor.getState();
  const g = connectorGeometryInDoc(conn, s.doc.elements);
  const { t, offset } = projectSigned(g.samples, p);
  const next = labels.map((l, i) => (i === index ? { ...l, t: Math.round(t * 1e4) / 1e4, offset: Math.abs(offset) < 4 ? undefined : Math.round(offset) } : l));
  s.updateElements({ [conn.id]: { labels: next } });
}

/** Appends a label to a connector (one undo step) and opens it for editing. */
export function addExtraLabel(connId: string, text = 'Label', t?: number) {
  const s = useEditor.getState();
  const conn = s.doc.elements[connId];
  if (!isConnector(conn)) return;
  const labels = conn.labels ?? [];
  // Spread new labels away from the main one (0.5) and each other.
  const used = [conn.labelT ?? 0.5, ...labels.map((l) => l.t)];
  const pos = t ?? [0.25, 0.75, 0.15, 0.85, 0.35, 0.65].find((c) => used.every((u) => Math.abs(u - c) > 0.05)) ?? 0.3;
  const label: ConnectorLabel = { id: uid(), text, t: pos };
  s.updateElements({ [connId]: { labels: [...labels, label] } });
  useExtraLabelEdit.setState({ connId, index: labels.length });
}

/** Opens the editor if a client point hits an extra label (`data-conn-label="id:index"`). */
export function openExtraLabelEditorAt(clientX: number, clientY: number): boolean {
  for (const node of document.elementsFromPoint(clientX, clientY)) {
    const v = node.closest('[data-conn-label]')?.getAttribute('data-conn-label');
    if (!v) continue;
    const i = v.lastIndexOf(':');
    const connId = v.slice(0, i);
    const index = Number(v.slice(i + 1));
    const s = useEditor.getState();
    if (!isConnector(s.doc.elements[connId])) return false;
    s.select([connId]);
    useExtraLabelEdit.setState({ connId, index });
    return true;
  }
  return false;
}

/** In-place editor for an extra label; Enter commits, Shift+Enter breaks lines, Esc cancels. */
export function ExtraLabelEditor() {
  const { connId, index } = useExtraLabelEdit();
  const conn = useEditor((s) => (connId ? s.doc.elements[connId] : undefined));
  const elements = useEditor((s) => s.doc.elements);
  const camera = useEditor((s) => s.camera);
  const ref = useRef<HTMLTextAreaElement>(null);
  const label = isConnector(conn) ? conn.labels?.[index] : undefined;

  useEffect(() => {
    if (!label) return;
    const node = ref.current;
    node?.focus();
    node?.select();
    // Only when a new session starts.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connId, index, !!label]);

  if (!isConnector(conn) || !label) return null;
  const g = connectorGeometryInDoc(conn, elements);
  const at = labelAt(g.samples, label.t, label.offset);
  const z = camera.z;
  const st = conn.style;
  const close = () => useExtraLabelEdit.setState({ connId: null, index: -1 });
  const commit = (text: string) => {
    const cur = useEditor.getState().doc.elements[conn.id];
    if (isConnector(cur) && cur.labels?.[index]) {
      const labels = text.trim() ? cur.labels.map((l, i) => (i === index ? { ...l, text } : l)) : cur.labels.filter((_, i) => i !== index);
      if (text !== cur.labels[index].text) useEditor.getState().updateElements({ [conn.id]: { labels: labels.length ? labels : undefined } });
    }
    close();
  };
  const lines = Math.max(1, label.text.split('\n').length);
  return (
    <textarea
      ref={ref}
      data-text-editor
      defaultValue={label.text}
      rows={lines}
      spellCheck={false}
      onKeyDown={(e) => {
        e.stopPropagation();
        if (e.key === 'Escape') close();
        else if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          commit(e.currentTarget.value);
        }
      }}
      onBlur={(e) => commit(e.currentTarget.value)}
      className="absolute resize-none overflow-hidden rounded-md bg-panel text-center text-fg shadow-panel outline-none ring-2 ring-accent/50"
      style={{
        left: camera.x + at.x * z,
        top: camera.y + at.y * z,
        transform: 'translate(-50%, -50%)',
        width: Math.max(80, label.text.length * st.fontSize * 0.62 + 24) * z,
        fontFamily: fontStack(st.fontFamily),
        fontSize: st.fontSize * z,
        lineHeight: `${lineHeight(st.fontSize) * z}px`,
        padding: `${2 * z}px ${6 * z}px`,
      }}
    />
  );
}
