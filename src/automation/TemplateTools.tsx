/**
 * "My templates" UI pieces for the Templates dialog (rail entry with import,
 * rename / delete / export in the preview) and the Save as template dialog.
 */
import { useEffect, useRef, useState } from 'react';
import { Bookmark, Download, FileUp, Pencil, Trash } from 'lucide-react';
import type { Template } from '@/templates/types';
import { cn } from '@/lib/cn';
import { useEditor } from '@/store/editor';
import { useUi } from '@/store/ui';
import { saveFile } from '@/io/native';
import { Button } from '@/ui/Button';
import { DialogHeader } from '@/ui/Dialog';
import { Segmented } from '@/ui/controls';
import {
  TEMPLATE_EXTENSION, USER_CATEGORY, deleteTemplate, importTemplateFile, pagesForScope, renameTemplate, saveTemplate, templateFile, useUserTemplates,
  type TemplateScope,
} from '@/storage/userTemplates';
import { Field, inputCls, segLabel, stopKeys, textareaCls } from './formUi';
import { t as tNow, useT } from '@/i18n';
import { templateCategory } from '@/i18n/catalog';

export const UserCategoryIcon = Bookmark;

/** Rail entry for "My templates", with an import button. Loads the store on mount. */
export function UserTemplatesRail({ active, count, onClick }: { active: boolean; count: number; onClick: () => void }) {
  const t = useT();
  const fileRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    void useUserTemplates.getState().refresh();
  }, []);
  const onFile = async (f: File) => {
    try {
      const st = await importTemplateFile(await f.text(), f.name);
      useUi.getState().toast(tNow('automation.templates.imported', { name: st.name }), 'success');
      onClick();
    } catch (e) {
      useUi.getState().toast(tNow('automation.templates.importFailed', { error: (e as Error)?.message ?? String(e) }), 'error');
    }
  };
  return (
    <div className="group/rail relative">
      <button
        onClick={onClick}
        aria-current={active || undefined}
        className={cn(
          'group flex h-8 w-full items-center gap-2.5 rounded-lg px-2.5 text-left text-[12.5px] transition-colors',
          active ? 'bg-accent-soft font-medium text-accent' : 'text-fg hover:bg-hover',
          count === 0 && !active && 'opacity-60',
        )}
      >
        <Bookmark className={cn('size-[15px] shrink-0', active ? 'text-accent' : 'text-muted group-hover:text-fg')} strokeWidth={1.75} />
        <span className="flex-1 truncate">{templateCategory(USER_CATEGORY)}</span>
        <span className={cn('tabular-nums text-[11px] group-hover/rail:opacity-0', active ? 'text-accent' : 'text-subtle')}>{count}</span>
      </button>
      <button
        onClick={() => fileRef.current?.click()}
        className="absolute right-1 top-1 hidden rounded-md p-1 text-muted hover:bg-panel hover:text-fg group-hover/rail:block"
        aria-label={t('automation.templates.importFile')}
        title={t('automation.templates.importTooltip', { ext: TEMPLATE_EXTENSION })}
      >
        <FileUp className="size-3.5" />
      </button>
      <input
        ref={fileRef}
        type="file"
        hidden
        accept={`.${TEMPLATE_EXTENSION},.opendraw,.json`}
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) void onFile(f);
          e.target.value = '';
        }}
      />
    </div>
  );
}

/** Rename / export / delete for a user template (Templates dialog preview). */
export function UserTemplateTools({ t: tpl }: { t: Template }) {
  const t = useT();
  const [renaming, setRenaming] = useState(false);
  const ui = useUi.getState();
  const exportIt = async () => {
    const f = await templateFile(tpl.id);
    if (!f) return;
    try {
      await saveFile(f.text, { defaultName: f.name, filters: [{ name: tNow('automation.templates.fileType'), extensions: [TEMPLATE_EXTENSION] }], mime: 'application/json' });
    } catch (e) {
      ui.toast(String((e as Error)?.message ?? e), 'error');
    }
  };
  const remove = async () => {
    const choice = await ui.ask({
      title: tNow('automation.templates.deleteTitle', { name: tpl.name }),
      message: tNow('automation.templates.deleteMessage'),
      confirmLabel: tNow('common.delete'),
    });
    if (choice === 'confirm') await deleteTemplate(tpl.id);
  };
  if (renaming) {
    return (
      <input
        autoFocus
        defaultValue={tpl.name}
        className={inputCls}
        onKeyDown={(e) => {
          e.stopPropagation();
          if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
          if (e.key === 'Escape') setRenaming(false);
        }}
        onBlur={(e) => {
          void renameTemplate(tpl.id, e.target.value);
          setRenaming(false);
        }}
      />
    );
  }
  return (
    <div className="flex gap-1.5">
      <Button className="flex-1" size="sm" icon={<Pencil className="size-3.5" />} onClick={() => setRenaming(true)}>
        <span className="min-w-0 truncate">{t('common.rename')}</span>
      </Button>
      <Button className="flex-1" size="sm" icon={<Download className="size-3.5" />} onClick={() => void exportIt()}>
        <span className="min-w-0 truncate">{t('common.export')}</span>
      </Button>
      <Button className="flex-1" size="sm" icon={<Trash className="size-3.5" />} onClick={() => void remove()}>
        <span className="min-w-0 truncate">{t('common.delete')}</span>
      </Button>
    </div>
  );
}

/** File → Save as template… */
export function SaveTemplateBody({ close }: { close: () => void }) {
  const t = useT();
  const hasSelection = useEditor((s) => s.selection.length > 0);
  const pageCount = useEditor((s) => s.pages.length);
  const fileName = useEditor((s) => s.file.name);
  const [name, setName] = useState(fileName.replace(/\.opendraw$/i, ''));
  const [description, setDescription] = useState('');
  const [scope, setScope] = useState<TemplateScope>(hasSelection ? 'selection' : pageCount > 1 ? 'diagram' : 'page');
  const [busy, setBusy] = useState(false);

  const save = async () => {
    const pages = pagesForScope(scope);
    if (!pages.some((p) => p.doc.order.length)) return useUi.getState().toast(tNow('automation.templates.nothingToSave'), 'info');
    setBusy(true);
    try {
      const st = await saveTemplate(name, description, pages);
      useUi.getState().toast(tNow('automation.templates.saved', { name: st.name }), 'success');
      close();
    } catch (e) {
      useUi.getState().toast(tNow('automation.templates.saveFailed', { error: (e as Error)?.message ?? String(e) }), 'error');
      setBusy(false);
    }
  };

  return (
    <div onKeyDown={stopKeys}>
      <DialogHeader title={t('automation.templates.saveTitle')} subtitle={t('automation.templates.saveSubtitle')} onClose={close} />
      <div className="space-y-3 px-5 pb-4">
        <Field label={t('common.name')}>
          <input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} autoFocus onKeyDown={(e) => e.key === 'Enter' && void save()} />
        </Field>
        <Field label={t('common.description')}>
          <textarea className={textareaCls + ' h-16 font-sans text-[12.5px]'} value={description} onChange={(e) => setDescription(e.target.value)} placeholder={t('automation.templates.optional')} />
        </Field>
        <Field label={t('automation.templates.contents')}>
          <Segmented<TemplateScope>
            size="sm"
            value={scope}
            onChange={setScope}
            options={[
              { value: 'diagram', label: segLabel(t('automation.templates.wholeDiagram', { count: pageCount })) },
              { value: 'page', label: segLabel(t('automation.templates.thisPage')) },
              ...(hasSelection ? [{ value: 'selection' as const, label: segLabel(t('common.selection')) }] : []),
            ]}
          />
        </Field>
      </div>
      <div className="flex justify-end gap-2 border-t border-line px-5 py-3">
        <Button onClick={close}>{t('common.cancel')}</Button>
        <Button variant="primary" disabled={busy} onClick={() => void save()}>
          {t('automation.templates.save')}
        </Button>
      </div>
    </div>
  );
}
