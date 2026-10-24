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
import { formatDate, useT } from '@/i18n';

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
  const t = useT();
  const doc = useEditor((s) => s.doc);
  const pages = useEditor((s) => s.pages);
  const meta = useEditor((s) => s.docMeta);
  const info = useMemo(() => {
    if (target.type === 'layer') {
      const l = layersOf(doc).find((x) => x.id === target.id);
      return { title: 'automation.data.layerTitle' as const, name: l?.name ?? '', data: l?.data, id: target.id };
    }
    if (target.type === 'page') {
      const p = pages.find((x) => x.id === target.id);
      return { title: 'automation.data.pageTitle' as const, name: p?.name ?? '', data: p?.data, id: target.id };
    }
    return { title: 'automation.data.documentTitle' as const, name: '', data: meta.data, id: '' };
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
        title={t(info.title)}
        subtitle={info.id ? <span className="font-mono text-[11.5px]">{t('automation.data.id', { id: info.id })}</span> : t('automation.data.documentSubtitle')}
        onClose={close}
      />
      <div className="scroll-thin max-h-[60vh] space-y-3 overflow-y-auto px-5 pb-4">
        {target.type !== 'document' && (
          <Field label={t('common.name')}>
            <input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} />
          </Field>
        )}
        <Field label={t('automation.data.properties')} hint={t('automation.data.propertiesHint')}>
          <KeyValueEditor rows={rows} onChange={setRows} />
        </Field>
      </div>
      <div className="flex justify-end gap-2 border-t border-line px-5 py-3">
        <Button onClick={close}>{t('common.cancel')}</Button>
        <Button variant="primary" onClick={save}>
          {t('common.apply')}
        </Button>
      </div>
    </div>
  );
}

const fmtDate = (iso?: string) => (iso ? formatDate(new Date(iso)) : '—');

export function PropertiesBody({ close }: { close: () => void }) {
  const t = useT();
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
      <div className="truncate text-[11px] text-muted" title={label}>
        {label}
      </div>
    </div>
  );

  return (
    <div onKeyDown={stopKeys}>
      <DialogHeader title={t('automation.props.title')} subtitle={file.path ?? file.name} onClose={close} />
      <div className="space-y-3 px-5 pb-4">
        <Field label={t('common.title')}>
          <input className={inputCls} value={title} onChange={(e) => setTitle(e.target.value)} placeholder={file.name.replace(/\.arkdraw$/i, '')} autoFocus />
        </Field>
        <Field label={t('automation.props.author')}>
          <input className={inputCls} value={author} onChange={(e) => setAuthor(e.target.value)} placeholder={t('automation.props.authorPlaceholder')} />
        </Field>
        <Field label={t('common.description')}>
          <textarea className={textareaCls + ' h-20 font-sans text-[12.5px]'} value={description} onChange={(e) => setDescription(e.target.value)} placeholder={t('automation.props.descriptionPlaceholder')} />
        </Field>
        <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[12px]">
          <span className="text-muted">{t('automation.props.created')}</span>
          <span className="text-fg">{fmtDate(meta.created)}</span>
          <span className="text-muted">{t('automation.props.lastSaved')}</span>
          <span className="text-fg">{fmtDate(meta.modified)}</span>
        </div>
        <div className="grid grid-cols-4 gap-1.5">
          {stat(stats.pages === 1 ? t('common.page') : t('common.pages'), stats.pages)}
          {stat(t('common.shapes'), stats.shapes)}
          {stat(t('common.connectors'), stats.connectors)}
          {stat(t('common.layers'), stats.layers)}
          {stat(t('automation.props.labels'), stats.labels)}
          {stat(t('automation.props.images'), stats.images)}
          {stat(t('automation.props.comments'), stats.comments)}
          {stat(t('automation.props.docData'), Object.keys(meta.data ?? {}).length)}
        </div>
        <p className="text-[11.5px] text-subtle">{t('automation.props.note')}</p>
      </div>
      <div className="flex justify-end gap-2 border-t border-line px-5 py-3">
        <Button onClick={close}>{t('common.cancel')}</Button>
        <Button variant="primary" onClick={save}>
          {t('common.apply')}
        </Button>
      </div>
    </div>
  );
}
