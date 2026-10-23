/**
 * Printing: every page is rendered to SVG and laid out one per sheet in a
 * hidden iframe, then the system print dialog opens (WebView2 / WebKit /
 * browsers all support it). Pages are scaled to fit the sheet.
 */
import { useEditor } from '@/store/editor';
import { useUi } from '@/store/ui';
import { inlineIcons, renderSvg } from '@/io/export/svg';
import { paperSize } from '@/canvas/paper';

export async function printDiagram(pageIds?: string[]) {
  const s = useEditor.getState();
  const pages = s.allPages().filter((p) => (!pageIds || pageIds.includes(p.id)) && p.doc.order.length);
  if (!pages.length) {
    useUi.getState().toast('Nothing to print');
    return;
  }
  const sheets: string[] = [];
  for (const page of pages) {
    const resolver = await inlineIcons(page.doc.order.map((id) => page.doc.elements[id]));
    const { svg } = renderSvg(page.doc, { background: page.settings.background ?? null, padding: 16 }, resolver);
    sheets.push(svg.replace(/^<\?xml[^>]*>\s*/, ''));
  }
  const first = paperSize(pages[0].settings);
  const landscape = first.w > first.h;
  const html = `<!doctype html><html><head><meta charset="utf-8"><title>${s.file.name}</title><style>
    @page { size: ${pages[0].settings.paper === 'Letter' ? 'letter' : 'A4'} ${landscape ? 'landscape' : 'portrait'}; margin: 10mm; }
    html, body { margin: 0; }
    .sheet { page-break-after: always; display: flex; align-items: center; justify-content: center; width: 100%; height: 100vh; }
    .sheet:last-child { page-break-after: auto; }
    .sheet svg { max-width: 100%; max-height: 100%; width: auto; height: auto; }
  </style></head><body>${sheets.map((svg) => `<div class="sheet">${svg}</div>`).join('')}</body></html>`;

  const frame = document.createElement('iframe');
  frame.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;visibility:hidden';
  document.body.appendChild(frame);
  const doc = frame.contentDocument!;
  doc.open();
  doc.write(html);
  doc.close();
  await new Promise((r) => setTimeout(r, 250));
  frame.contentWindow!.focus();
  frame.contentWindow!.print();
  setTimeout(() => frame.remove(), 60_000);
}
