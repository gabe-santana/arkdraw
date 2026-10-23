/**
 * Edit Data for layers, pages and the document, and File → Properties.
 */
import { useMemo, useState } from 'react';
import { layersOf, useEditor } from '@/store/editor';
import { Button } from '@/ui/Button';
import { DialogHeader } from '@/ui/Dialog';
import { documentStats, updateDocMeta } from './fileProperties';
import { dataOf, Field, inputCls, KeyValueEditor, rowsOf, stopKeys, textareaCls, type Rows } from './formUi';
import type { DataTarget } from './ui';

/** Writes key/value data to a layer (undoable), a page or the document. */
export function applyTargetData(target: DataTarget, data: Record<string, string> | undefined, name?: string) {
  const s = useEditor.getState();
  if (target.type === 'layer') {
    s.updateLayer(target.id, { data, ...(name ? { name } : {}) });
  } else if (target.type === 'page') {
    useEditor.setState({
      pages: s.pages.map((p) => {
        if (p.id !== target.id) return p;
        const next = { ...p, ...(name ? { name } : {}) };
        if (data) next.data = data;
        else delete next.data;
        return next;
      }),
    });
  } else updateDocMeta({ data });
}

export function DataBody({ target, close }: { target: DataTarget; close: () => void }) {
  const doc = useEditor((s) => s.doc);
  const pages = useEditor((s) => s.pages);
  const meta = useEditor((s) => s.docMeta);
  const info = useMemo(() => {
    if (target.type === 'layer') {
      const l = layersOf(doc).find((x) => x.id === target.id);
      return { title: 'Edit layer data', name: l?.name ?? '', data: l?.data, id: target.id };
    }
    if (target.type === 'page') {
      const p = pages.find((x) => x.id === target.id);
      return { title: 'Edit page data', name: p?.name ?? '', data: p?.data, id: target.id };
    }
    return { title: 'Edit document data', name: '', data: meta.data, id: '' };
    // Snapshot when the dialog opens.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const [name, setName] = useState(info.name);
  const [rows, setRows] = useState<Rows>(rowsOf(info.data));

  const save = () => {
    applyTargetData(target, dataOf(rows), target.type !== 'document' && name.trim() ? name.trim() : undefined);
    close();
  };

  return (
    <div onKeyDown={stopKeys}>
      <DialogHeader
        title={info.title}
        subtitle={info.id ? <span className="font-mono text-[11.5px]">ID {info.id}</span> : 'Values every page can use as %placeholders%.'}
        onClose={close}
      />
      <div className="scroll-thin max-h-[60vh] space-y-3 overflow-y-auto px-5 pb-4">
        {target.type !== 'document' && (
          <Field label="Name">
            <input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} />
          </Field>
        )}
        <Field label="Properties" hint="Labels with placeholders on, inside this scope, show %key% values">
          <KeyValueEditor rows={rows} onChange={setRows} />
        </Field>
      </div>
      <div className="flex justify-end gap-2 border-t border-line px-5 py-3">
        <Button onClick={close}>Cancel</Button>
        <Button variant="primary" onClick={save}>
          Apply
        </Button>
      </div>
    </div>
  );
}

const fmtDate = (iso?: string) => (iso ? new Date(iso).toLocaleString() : '—');

export function PropertiesBody({ close }: { close: () => void }) {
  const meta = useEditor((s) => s.docMeta);
  const file = useEditor((s) => s.file);
  const livePages = useEditor((s) => s.pages);
  const liveDoc = useEditor((s) => s.doc);
  const stats = useMemo(() => documentStats(useEditor.getState().allPages()), [livePages, liveDoc]);
  const [title, setTitle] = useState(meta.title ?? '');
  const [author, setAuthor] = useState(meta.author ?? '');
  const [description, setDescription] = useState(meta.description ?? '');

  const save = () => {
    const patch = { title: title.trim() || undefined, author: author.trim() || undefined, description: description.trim() || undefined };
    if (patch.title !== meta.title || patch.author !== meta.author || patch.description !== meta.description) updateDocMeta(patch);
    close();
  };

  const stat = (label: string, value: number | string) => (
    <div className="rounded-lg bg-panel-2 px-2.5 py-2">
      <div className="text-[15px] font-semibold tabular-nums text-fg">{value}</div>
      <div className="text-[11px] text-muted">{label}</div>
    </div>
  );

  return (
    <div onKeyDown={stopKeys}>
      <DialogHeader title="File properties" subtitle={file.path ?? file.name} onClose={close} />
      <div className="space-y-3 px-5 pb-4">
        <Field label="Title">
          <input className={inputCls} value={title} onChange={(e) => setTitle(e.target.value)} placeholder={file.name.replace(/\.opendraw$/i, '')} autoFocus />
        </Field>
        <Field label="Author">
          <input className={inputCls} value={author} onChange={(e) => setAuthor(e.target.value)} placeholder="Who made this diagram" />
        </Field>
        <Field label="Description">
          <textarea className={textareaCls + ' h-20 font-sans text-[12.5px]'} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What this diagram is about" />
        </Field>
        <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[12px]">
          <span className="text-muted">Created</span>
          <span className="text-fg">{fmtDate(meta.created)}</span>
          <span className="text-muted">Last saved</span>
          <span className="text-fg">{fmtDate(meta.modified)}</span>
        </div>
        <div className="grid grid-cols-4 gap-1.5">
          {stat(stats.pages === 1 ? 'Page' : 'Pages', stats.pages)}
          {stat('Shapes', stats.shapes)}
          {stat('Connectors', stats.connectors)}
          {stat('Layers', stats.layers)}
          {stat('Labels', stats.labels)}
          {stat('Images & icons', stats.images)}
          {stat('Comments', stats.comments)}
          {stat('Doc data', Object.keys(meta.data ?? {}).length)}
        </div>
        <p className="text-[11.5px] text-subtle">Title, author and description are saved in the .opendraw file and can be used in labels as %title%, %author% and %description%.</p>
      </div>
      <div className="flex justify-end gap-2 border-t border-line px-5 py-3">
        <Button onClick={close}>Cancel</Button>
        <Button variant="primary" onClick={save}>
          Apply
        </Button>
      </div>
    </div>
  );
}
