import { describe, expect, it } from 'vitest';
import { parseTextDiagram } from '@/io/import/text';
import { importSql, parseSql } from '@/io/import/sql';
import { isConnector, isShape, type Doc } from '@/model/types';

const shapes = (d: Doc) => d.order.map((id) => d.elements[id]).filter(isShape);
const conns = (d: Doc) => d.order.map((id) => d.elements[id]).filter(isConnector);

describe('from text', () => {
  it('turns an indented list into a tree', () => {
    const d = parseTextDiagram(`Company
  - Sales
      * Inside sales
      * Field sales
  - Engineering
\t1. Platform`).pages[0].doc;
    const s = shapes(d);
    expect(s.map((x) => x.text)).toEqual(['Company', 'Sales', 'Inside sales', 'Field sales', 'Engineering', 'Platform']);
    const cs = conns(d);
    expect(cs).toHaveLength(5);
    const id = (t: string) => s.find((x) => x.text === t)!.id;
    expect(cs.some((c) => c.source.elementId === id('Sales') && c.target.elementId === id('Field sales'))).toBe(true);
    expect(cs.some((c) => c.source.elementId === id('Engineering') && c.target.elementId === id('Platform'))).toBe(true);
    // Tree flows downwards
    expect(s.find((x) => x.text === 'Company')!.y).toBeLessThan(s.find((x) => x.text === 'Sales')!.y);
  });

  it('parses graph notation with labels, directions and chains', () => {
    const d = parseTextDiagram(`; comment
a -> b: calls
b <- c
c <-> d
d -- e
x -> y -> z
lonely`).pages[0].doc;
    expect(shapes(d).map((s) => s.text).sort()).toEqual(['a', 'b', 'c', 'd', 'e', 'lonely', 'x', 'y', 'z']);
    const cs = conns(d);
    expect(cs).toHaveLength(6);
    expect(cs[0].text).toBe('calls');
    expect([cs[1].startArrow, cs[1].endArrow]).toEqual(['triangle', 'none']);
    expect([cs[2].startArrow, cs[2].endArrow]).toEqual(['triangle', 'triangle']);
    expect([cs[3].startArrow, cs[3].endArrow]).toEqual(['none', 'none']);
  });
});

describe('SQL', () => {
  const sql = `
-- MySQL
CREATE TABLE IF NOT EXISTS \`users\` (
  \`id\` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  \`email\` VARCHAR(255) CHARACTER SET utf8mb4 NOT NULL,
  PRIMARY KEY (\`id\`),
  UNIQUE KEY \`uq_email\` (\`email\`)
) ENGINE=InnoDB;

/* PostgreSQL */
CREATE TABLE public."orders" (
  id serial PRIMARY KEY,
  user_id integer NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  placed_at timestamp with time zone DEFAULT now(),
  total numeric(10, 2)
);

# SQL Server
CREATE TABLE [dbo].[OrderItems] (
  [OrderId] [int] NOT NULL,
  [Sku] [nvarchar](32) NOT NULL,
  [Qty] [int] NULL,
  CONSTRAINT [PK_OrderItems] PRIMARY KEY CLUSTERED ([OrderId], [Sku])
)
GO

-- SQLite
CREATE TABLE products (sku TEXT PRIMARY KEY, name TEXT);
CREATE TABLE #temp (x int);

ALTER TABLE [dbo].[OrderItems] ADD CONSTRAINT [FK_Items_Orders] FOREIGN KEY ([OrderId]) REFERENCES [dbo].[orders] ([id]);
ALTER TABLE ONLY OrderItems ADD FOREIGN KEY (Sku) REFERENCES products(sku), ADD CONSTRAINT fk_x FOREIGN KEY (Qty) REFERENCES missing(id);
`;

  it('parses tables, columns, keys across dialects', () => {
    const { tables, foreignKeys, warnings } = parseSql(sql);
    expect(tables.map((t) => t.name)).toEqual(['users', 'orders', 'OrderItems', 'products', '#temp']);
    const users = tables[0];
    expect(users.columns.map((c) => [c.name, c.type, c.pk])).toEqual([
      ['id', 'INT UNSIGNED', true],
      ['email', 'VARCHAR(255)', false],
    ]);
    const orders = tables[1];
    expect(orders.columns.find((c) => c.name === 'placed_at')!.type).toBe('timestamp with time zone');
    expect(orders.columns.find((c) => c.name === 'total')!.type).toBe('numeric(10,2)');
    expect(orders.columns.find((c) => c.name === 'user_id')!.fk).toBe(true);
    const items = tables[2];
    expect(items.columns.map((c) => [c.name, c.type, c.pk, c.fk])).toEqual([
      ['OrderId', 'int', true, true],
      ['Sku', 'nvarchar(32)', true, true],
      ['Qty', 'int', false, true],
    ]);
    expect(foreignKeys.map((f) => `${f.table}->${f.refTable}`)).toEqual(['orders->users', 'OrderItems->orders', 'OrderItems->products']);
    expect(warnings.some((w) => /missing/.test(w))).toBe(true);
  });

  it('builds entities and crow\'s-foot connectors', () => {
    const d = importSql(sql).pages[0].doc;
    const s = shapes(d);
    expect(s).toHaveLength(5);
    expect(s.every((x) => x.kind === 'erd.entity')).toBe(true);
    expect(s.find((x) => x.text.startsWith('OrderItems'))!.text).toBe('OrderItems\n--\nPK,FK OrderId  int\nPK,FK Sku  nvarchar(32)\nFK Qty  int');
    expect(s.find((x) => x.text.startsWith('users'))!.text).toBe('users\n--\nPK id  INT UNSIGNED\nemail  VARCHAR(255)');
    const cs = conns(d);
    expect(cs).toHaveLength(3);
    for (const c of cs) {
      expect(c.startArrow).toBe('erMany');
      expect(c.endArrow).toBe('erOnlyOne');
    }
    const orders = s.find((x) => x.text.startsWith('orders'))!;
    const users = s.find((x) => x.text.startsWith('users'))!;
    expect(cs.some((c) => c.source.elementId === orders.id && c.target.elementId === users.id)).toBe(true);
  });

  it('fails without CREATE TABLE', () => {
    expect(() => importSql('SELECT 1;')).toThrow(/No CREATE TABLE/);
  });
});
