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
import { Field, inputCls, stopKeys, textareaCls } from './formUi';

export const UserCategoryIcon = Bookmark;

/** Rail entry for "My templates", with an import button. Loads the store on mount. */
export function UserTemplatesRail({ active, count, onClick }: { active: boolean; count: number; onClick: () => void }) {
  const fileRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    void useUserTemplates.getState().refresh();
  }, []);
  const onFile = async (f: File) => {
    try {
      const st = await importTemplateFile(await f.text(), f.name);
      useUi.getState().toast(`Imported template “${st.name}”`, 'success');
      onClick();
    } catch (e) {
      useUi.getState().toast(`Could not import template: ${(e as Error)?.message ?? e}`, 'error');
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
        <span className="flex-1 truncate">{USER_CATEGORY}</span>
        <span className={cn('tabular-nums text-[11px] group-hover/rail:opacity-0', active ? 'text-accent' : 'text-subtle')}>{count}</span>
      </button>
      <button
        onClick={() => fileRef.current?.click()}
        className="absolute right-1 top-1 hidden rounded-md p-1 text-muted hover:bg-panel hover:text-fg group-hover/rail:block"
        aria-label="Import template file"
        title={`Import a .${TEMPLATE_EXTENSION} or .opendraw file`}
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
export function UserTemplateTools({ t }: { t: Template }) {
  const [renaming, setRenaming] = useState(false);
  const ui = useUi.getState();
  const exportIt = async () => {
    const f = await templateFile(t.id);
    if (!f) return;
    try {
      await saveFile(f.text, { defaultName: f.name, filters: [{ name: 'OpenDraw template', extensions: [TEMPLATE_EXTENSION] }], mime: 'application/json' });
    } catch (e) {
      ui.toast(String((e as Error)?.message ?? e), 'error');
    }
  };
  const remove = async () => {
    const choice = await ui.ask({ title: `Delete “${t.name}”?`, message: 'The template is removed from this device. Diagrams made from it are not affected.', confirmLabel: 'Delete' });
    if (choice === 'confirm') await deleteTemplate(t.id);
  };
  if (renaming) {
    return (
      <input
        autoFocus
        defaultValue={t.name}
        className={inputCls}
        onKeyDown={(e) => {
          e.stopPropagation();
          if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
          if (e.key === 'Escape') setRenaming(false);
        }}
        onBlur={(e) => {
          void renameTemplate(t.id, e.target.value);
          setRenaming(false);
        }}
      />
    );
  }
  return (
    <div className="flex gap-1.5">
      <Button className="flex-1" size="sm" icon={<Pencil className="size-3.5" />} onClick={() => setRenaming(true)}>
        Rename
      </Button>
      <Button className="flex-1" size="sm" icon={<Download className="size-3.5" />} onClick={() => void exportIt()}>
        Export
      </Button>
      <Button className="flex-1" size="sm" icon={<Trash className="size-3.5" />} onClick={() => void remove()}>
        Delete
      </Button>
    </div>
  );
}

/** File → Save as template… */
export function SaveTemplateBody({ close }: { close: () => void }) {
  const hasSelection = useEditor((s) => s.selection.length > 0);
  const pageCount = useEditor((s) => s.pages.length);
  const fileName = useEditor((s) => s.file.name);
  const [name, setName] = useState(fileName.replace(/\.opendraw$/i, ''));
  const [description, setDescription] = useState('');
  const [scope, setScope] = useState<TemplateScope>(hasSelection ? 'selection' : pageCount > 1 ? 'diagram' : 'page');
  const [busy, setBusy] = useState(false);

  const save = async () => {
    const pages = pagesForScope(scope);
    if (!pages.some((p) => p.doc.order.length)) return useUi.getState().toast('There is nothing to save as a template.', 'info');
    setBusy(true);
    try {
      const st = await saveTemplate(name, description, pages);
      useUi.getState().toast(`Saved “${st.name}” to My templates`, 'success');
      close();
    } catch (e) {
      useUi.getState().toast(`Could not save the template: ${(e as Error)?.message ?? e}`, 'error');
      setBusy(false);
    }
  };

  return (
    <div onKeyDown={stopKeys}>
      <DialogHeader title="Save as template" subtitle="Appears under My templates in File → New from template… on this device." onClose={close} />
      <div className="space-y-3 px-5 pb-4">
        <Field label="Name">
          <input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} autoFocus onKeyDown={(e) => e.key === 'Enter' && void save()} />
        </Field>
        <Field label="Description">
          <textarea className={textareaCls + ' h-16 font-sans text-[12.5px]'} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Optional" />
        </Field>
        <Field label="Contents">
          <Segmented<TemplateScope>
            size="sm"
            value={scope}
            onChange={setScope}
            options={[
              { value: 'diagram', label: `Whole diagram${pageCount > 1 ? ` (${pageCount} pages)` : ''}` },
              { value: 'page', label: 'This page' },
              ...(hasSelection ? [{ value: 'selection' as const, label: 'Selection' }] : []),
            ]}
          />
        </Field>
      </div>
      <div className="flex justify-end gap-2 border-t border-line px-5 py-3">
        <Button onClick={close}>Cancel</Button>
        <Button variant="primary" disabled={busy} onClick={() => void save()}>
          Save template
        </Button>
      </div>
    </div>
  );
}
