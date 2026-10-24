/**
 * Example ArkDraw plugin: "Export as JSON Lines".
 *
 * Registers an export format (File → Export as JSON Lines…, also in the
 * command palette) that writes one JSON object per element of every page —
 * handy for loading diagrams into scripts, spreadsheets or a database — and
 * an importer for the same format (File → Open… accepts .jsonl).
 *
 * Load it from Extras → Plugins… (URL or "Add from file…"). See docs/extensibility.md.
 */
(function () {
  window.ArkDraw.registerPlugin({
    id: 'json-lines',
    name: 'JSON Lines export',
    version: '1.0.0',
    activate(ctx) {
      ctx.formats.registerExporter({
        id: 'jsonl',
        label: 'JSON Lines',
        extension: 'jsonl',
        mime: 'application/jsonl',
        export({ pages }) {
          const lines = [];
          for (const page of pages) {
            for (const id of page.doc.order) {
              const el = page.doc.elements[id];
              const row = { page: page.name, id: el.id, type: el.type, text: el.text };
              if (el.type === 'shape') Object.assign(row, { kind: el.kind, x: el.x, y: el.y, w: el.w, h: el.h });
              else Object.assign(row, { source: el.source.elementId || null, target: el.target.elementId || null });
              if (el.data) row.data = el.data;
              lines.push(JSON.stringify(row));
            }
          }
          return lines.join('\n') + '\n';
        },
      });

      ctx.formats.registerImporter({
        id: 'jsonl',
        label: 'JSON Lines…',
        description: 'One JSON object per line, as written by "Export as JSON Lines".',
        extensions: ['jsonl'],
        acceptsText: true,
        example: '{"id":"a","type":"shape","kind":"rectangle","text":"Hello","x":0,"y":0,"w":120,"h":60}',
        async run(content) {
          const text = typeof content === 'string' ? content : new TextDecoder().decode(content);
          const elements = {};
          const order = [];
          for (const line of text.split('\n')) {
            if (!line.trim()) continue;
            const r = JSON.parse(line);
            if (r.type !== 'shape') continue;
            elements[r.id] = {
              id: r.id, type: 'shape', kind: r.kind || 'rectangle', x: r.x || 0, y: r.y || 0, w: r.w || 120, h: r.h || 60,
              text: r.text || '', groupIds: [], data: r.data,
              style: { fill: '#ffffff', stroke: '#1e293b', strokeWidth: 1.5, strokeStyle: 'solid', opacity: 1, radius: 8, shadow: false,
                fontFamily: 'sans', fontSize: 14, bold: false, italic: false, textColor: '#0f172a', textAlign: 'center', verticalAlign: 'middle' },
            };
            order.push(r.id);
          }
          for (const line of text.split('\n')) {
            if (!line.trim()) continue;
            const r = JSON.parse(line);
            const a = elements[r.source];
            const b = elements[r.target];
            if (r.type !== 'connector' || !a || !b) continue;
            elements[r.id] = {
              id: r.id, type: 'connector', text: r.text || '', groupIds: [], routing: 'orthogonal', startArrow: 'none', endArrow: 'triangle',
              source: { elementId: a.id, side: 'auto', x: a.x + a.w / 2, y: a.y + a.h / 2 },
              target: { elementId: b.id, side: 'auto', x: b.x + b.w / 2, y: b.y + b.h / 2 },
              style: { fill: 'none', stroke: '#475569', strokeWidth: 1.5, strokeStyle: 'solid', opacity: 1, radius: 0, shadow: false,
                fontFamily: 'sans', fontSize: 13, bold: false, italic: false, textColor: '#0f172a', textAlign: 'center', verticalAlign: 'middle' },
            };
            order.push(r.id);
          }
          return { pages: [{ name: 'Imported', doc: { elements, order } }] };
        },
      });
    },
  });
})();
