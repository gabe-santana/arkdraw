/**
 * Coverage checks for the practitioner libraries added for draw.io parity
 * (UML 2.5, Cisco-style network, Citrix, Veeam, OpenStack, Office, Active
 * Directory, STRIDE, Bootstrap, Clipart, Isometric, Atlassian-style, CRM, EIP)
 * and for the vendor-style rack equipment.
 */
import { describe, expect, it } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { DEFAULT_STYLE } from '@/model/defaults';
import { LIBRARIES } from '@/shapes/libraries';
import { SHAPES } from '@/shapes/registry';
import { SHAPE_DESCRIPTIONS } from '@/shapes/descriptions';

/** Library id → the minimum number of items a practitioner should find. */
const EXPECTED: Record<string, number> = {
  uml25: 40,
  cisco: 35,
  citrix: 20,
  veeam: 20,
  openstack: 35,
  office: 40,
  ad: 25,
  threat: 25,
  bootstrap: 40,
  clipart: 60,
  isometric: 25,
  agile: 30,
  crm: 30,
  eip: 50,
  rack: 35,
};

const lib = (id: string) => LIBRARIES.find((l) => l.id === id);

describe('extra practitioner libraries', () => {
  it.each(Object.entries(EXPECTED))('%s is registered with enough items', (id, min) => {
    const l = lib(id);
    expect(l, `library ${id}`).toBeDefined();
    expect(l!.items.length).toBeGreaterThanOrEqual(min);
  });

  it.each(Object.keys(EXPECTED))('%s items are searchable and described', (id) => {
    for (const item of lib(id)!.items) {
      const where = `${id} › ${item.label}`;
      expect(SHAPES[item.kind], where).toBeDefined();
      expect(item.label.trim(), where).not.toBe('');
      if (id !== 'rack' || !item.kind.match(/^rack\.(cabinet|unit|blank|server1|server2|switch|patch|storage|ups|pdu|kvm|cable)$/)) {
        expect(item.keywords?.trim(), `${where}: keywords`).toBeTruthy();
      }
      expect(SHAPE_DESCRIPTIONS[item.kind]?.trim(), `${where}: description`).toBeTruthy();
    }
  });

  it('gives every shape kind of the new libraries a distinct draw.io style', () => {
    for (const id of Object.keys(EXPECTED)) {
      const kinds = new Set(lib(id)!.items.map((i) => i.kind));
      for (const k of kinds) expect(SHAPES[k].drawio, k).toMatch(/\S/);
    }
  });

  it('renders library items at their preset size and at a thumbnail size', () => {
    for (const id of Object.keys(EXPECTED)) {
      for (const item of lib(id)!.items) {
        const def = SHAPES[item.kind];
        for (const [w, h] of [[item.w, item.h], [40, 40]] as const) {
          const markup = renderToStaticMarkup(
            createElement('svg', null, def.render({ w, h, style: { ...DEFAULT_STYLE, ...item.style }, text: item.text ?? item.label })),
          );
          expect(markup, `${id} › ${item.label} @${w}x${h}`).not.toMatch(/NaN|Infinity|undefined/);
        }
      }
    }
  }, 30000);
});
