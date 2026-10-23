import { describe, expect, it } from 'vitest';
import { outputPaths, pagesFromText, settingsForJob, type CliExportJob } from '@/app/cliExport';
import { serializePages } from '@/io/fileFormat';
import { exportDrawioPages } from '@/io/drawio';
import { exportFiles } from '@/io/export';
import { samplePages } from './fixtures';

const job = (over: Partial<CliExportJob> = {}): CliExportJob => ({
  input: '/tmp/a.opendraw',
  format: 'png',
  output: '/tmp/out.png',
  page: null,
  allPages: false,
  scale: null,
  transparent: false,
  border: null,
  embed: false,
  quality: null,
  ...over,
});

describe('CLI export (front end)', () => {
  it('maps arguments onto export settings', () => {
    const s = settingsForJob(job({ format: 'JPG', scale: 2, border: 10, transparent: true, embed: true, quality: 75, allPages: true }), 3);
    expect(s).toMatchObject({ format: 'jpeg', scale: 2, border: 10, background: 'transparent', embedDiagram: true, quality: 0.75, scope: 'all' });
    expect(settingsForJob(job(), 1)).toMatchObject({ format: 'png', scale: 1, border: 0, background: 'page', scope: 'current' });
    expect(() => settingsForJob(job({ format: 'bmp' }), 1)).toThrow(/Unsupported format/);
    expect(() => settingsForJob(job({ page: 4 }), 3)).toThrow(/out of range/);
  });

  it('names multiple outputs', () => {
    const files = [{ name: 'a-P1.png', mime: '', data: '' }, { name: 'a-P2.png', mime: '', data: '' }];
    expect(outputPaths('/x/out.png', files.slice(0, 1))).toEqual(['/x/out.png']);
    expect(outputPaths('/x/out.png', files)).toEqual(['/x/out-1.png', '/x/out-2.png']);
    expect(outputPaths('C:\\x\\dir\\', files)).toEqual(['C:\\x\\dir\\a-P1.png', 'C:\\x\\dir\\a-P2.png']);
  });

  it('reads .opendraw and .drawio input and exports a selected page', async () => {
    const pages = samplePages(3);
    const fromJson = await pagesFromText(serializePages(pages));
    expect(fromJson.map((p) => p.name)).toEqual(pages.map((p) => p.name));
    const fromXml = await pagesFromText(await exportDrawioPages(pages));
    expect(fromXml).toHaveLength(3);

    const s = settingsForJob(job({ format: 'svg', page: 2 }), 3);
    const [file] = await exportFiles({ pages: fromJson, activePageId: fromJson[1].id, selection: [], fileName: 'a' }, { ...s, embedFonts: false });
    expect(file.data as string).toContain('Box on page 2');
    expect(file.data as string).not.toContain('Box on page 1');
  });
});
