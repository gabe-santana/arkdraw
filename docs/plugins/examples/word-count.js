/**
 * Example OpenDraw plugin: "Word count".
 *
 * Adds Extras → Word count (also in the command palette, Mod+Alt+Shift+W),
 * which counts the words in every label on the current page (or in the
 * selection) and shows the result in a toast. A second command selects the
 * shapes that have no label yet.
 *
 * Load it from Extras → Plugins… (URL or "Add from file…"). See docs/extensibility.md.
 */
(function () {
  const words = (text) => (text.match(/[\p{L}\p{N}][\p{L}\p{N}'’-]*/gu) || []).length;

  window.OpenDraw.registerPlugin({
    id: 'word-count',
    name: 'Word count',
    version: '1.0.0',
    description: 'Counts the words in diagram labels.',
    activate(ctx) {
      ctx.actions.register({
        id: 'count',
        label: 'Word count',
        menu: 'Extras',
        shortcut: 'Mod+Alt+Shift+W',
        keywords: 'words statistics labels text',
        run() {
          const doc = ctx.editor.getDoc();
          const selection = ctx.editor.getSelection();
          const ids = selection.length ? selection : doc.order;
          let total = 0;
          let labelled = 0;
          for (const id of ids) {
            const n = words(doc.elements[id]?.text || '');
            total += n;
            if (n) labelled++;
          }
          const scope = selection.length ? 'selection' : 'page';
          ctx.ui.toast(`${total} word${total === 1 ? '' : 's'} in ${labelled} label${labelled === 1 ? '' : 's'} (${scope})`, 'info');
        },
      });

      ctx.actions.register({
        id: 'select-unlabelled',
        label: 'Select shapes without a label',
        menu: 'Extras',
        keywords: 'empty text missing',
        run() {
          const doc = ctx.editor.getDoc();
          const ids = doc.order.filter((id) => doc.elements[id].type === 'shape' && !doc.elements[id].text.trim());
          ctx.editor.select(ids);
          ctx.ui.toast(ids.length ? `Selected ${ids.length} shape${ids.length === 1 ? '' : 's'}` : 'Every shape has a label', 'info');
        },
      });
    },
  });
})();
