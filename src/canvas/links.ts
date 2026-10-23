import { isTauri } from '@/lib/platform';
import { useEditor } from '@/store/editor';
import { useUi } from '@/store/ui';
import { isActionLink } from '@/automation/linkActions';
import { runEditorActionLink } from '@/automation/editorBridge';

/** Follows an element link: `page:<id>` switches page, `data:action/json,…` runs custom actions, anything else opens externally. */
export async function followLink(link: string) {
  if (isActionLink(link)) {
    if (!runEditorActionLink(link, (l) => void followLink(l))) useUi.getState().toast('This link action is not valid JSON.', 'error');
    return;
  }
  if (link.startsWith('page:')) {
    const id = link.slice(5);
    const s = useEditor.getState();
    if (s.pages.some((p) => p.id === id)) s.switchPage(id);
    else useUi.getState().toast('That page no longer exists.', 'error');
    return;
  }
  const url = /^[a-z][a-z0-9+.-]*:/i.test(link) ? link : `https://${link}`;
  if (!/^(https?|mailto|tel):/i.test(url)) {
    useUi.getState().toast('Only web, mail and phone links can be opened.', 'error');
    return;
  }
  if (isTauri()) {
    const { openUrl } = await import('@tauri-apps/plugin-opener');
    await openUrl(url);
  } else {
    window.open(url, '_blank', 'noopener,noreferrer');
  }
}
