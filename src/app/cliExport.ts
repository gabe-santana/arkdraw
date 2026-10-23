/**
 * Desktop command-line export (`opendraw --export …`, see docs/cli-export.md).
 *
 * The Rust side (src-tauri/src/lib.rs) parses the arguments, keeps the window
 * hidden and hands the job to us through `take_export_job`. We load the input
 * with the regular readers, render with the regular exporters, write the
 * output(s), report through `cli_log` (stdout / stderr) and end the process
 * with `cli_exit(code)`.
 *
 * Imported once for its side effect from App.tsx. In a browser it does nothing.
 */
import { isTauri } from '@/lib/platform';
import { baseName, readFile, saveFile, windowControls } from '@/io/native';
import { parsePages } from '@/io/fileFormat';
import { importDrawioPages } from '@/io/drawio';
import { clearTextCache } from '@/lib/text';
import { newPage } from '@/store/editor';
import type { Page } from '@/model/types';
import { DEFAULT_EXPORT_SETTINGS, FORMATS, exportFiles, type ExportFile, type ExportFormat, type ExportSettings } from '@/io/export';

/** Mirrors `ExportJob` in src-tauri/src/lib.rs (camelCase over IPC). */
export interface CliExportJob {
  input: string;
  format: string;
  output: string | null;
  page: number | null;
  allPages: boolean;
  scale: number | null;
  transparent: boolean;
  border: number | null;
  embed: boolean;
  quality: number | null;
}

export const CLI_FORMATS: Record<string, ExportFormat> = {
  png: 'png',
  svg: 'svg',
  pdf: 'pdf',
  jpg: 'jpeg',
  jpeg: 'jpeg',
  webp: 'webp',
  html: 'html',
  vsdx: 'vsdx',
  drawio: 'drawio',
  xml: 'drawio',
  url: 'url',
};

const core = () => import('@tauri-apps/api/core');

async function log(message: string, error = false) {
  try {
    await (await core()).invoke('cli_log', { message, error });
  } catch {
    (error ? console.error : console.log)(message);
  }
}

async function exit(code: number) {
  await (await core()).invoke('cli_exit', { code });
}

/** Parses diagram text (OpenDraw JSON or draw.io XML) into pages. */
export async function pagesFromText(text: string): Promise<Page[]> {
  const t = text.replace(/^﻿/, '').trimStart();
  if (t.startsWith('{')) return parsePages(t);
  if (t.startsWith('<')) {
    if (/^<svg[\s>]|^<\?xml[^>]*>\s*<svg[\s>]/i.test(t)) {
      const { importEmbedded } = await import('@/io/import/embedded');
      return (await importEmbedded(t, 'input.svg')).pages.map((p) => newPage(p.name, p.doc));
    }
    const pages = await importDrawioPages(t);
    if (!pages.length) throw new Error('No diagram pages found in the input.');
    return pages.map((p) => newPage(p.name, p.doc));
  }
  throw new Error('Unrecognized input format (expected .opendraw or .drawio).');
}

/** Export settings for a CLI job. Throws on invalid arguments. */
export function settingsForJob(job: CliExportJob, pageCount: number): ExportSettings {
  const format = CLI_FORMATS[job.format.toLowerCase()];
  if (!format) throw new Error(`Unsupported format "${job.format}". Use one of: png, svg, pdf, jpg, webp, html, vsdx, drawio.`);
  if (job.page !== null && (job.page < 1 || job.page > pageCount)) throw new Error(`--page ${job.page} is out of range (the diagram has ${pageCount} page${pageCount === 1 ? '' : 's'}).`);
  if (job.scale !== null && !(job.scale > 0 && job.scale <= 16)) throw new Error('--scale must be between 0 and 16.');
  return {
    ...DEFAULT_EXPORT_SETTINGS,
    format,
    scope: job.allPages ? 'all' : 'current',
    scale: job.scale ?? 1,
    border: job.border ?? 0,
    background: job.transparent ? 'transparent' : 'page',
    embedDiagram: job.embed,
    quality: job.quality !== null ? Math.min(1, Math.max(0.01, job.quality > 1 ? job.quality / 100 : job.quality)) : 0.9,
  };
}

const splitExt = (path: string) => {
  const m = /^(.*?)(\.[^.\\/]*)?$/.exec(path)!;
  return { stem: m[1], ext: m[2] ?? '' };
};

/** Output paths: the given path for one file; `name-1.ext`, `name-2.ext`… (or files inside a directory) for several. */
export function outputPaths(output: string, files: ExportFile[]): string[] {
  if (files.length === 1) return [output];
  if (/[\\/]$/.test(output)) return files.map((f) => output + f.name);
  const { stem, ext } = splitExt(output);
  return files.map((f, i) => `${stem}-${i + 1}${ext || '.' + f.name.split('.').pop()}`);
}

export async function runCliExport(job: CliExportJob): Promise<number> {
  try {
    const opened = await readFile(job.input);
    const pages = await pagesFromText(opened.contents);
    const s = settingsForJob(job, pages.length);
    // Text is measured on canvas: wait for the bundled fonts so wrapping matches the editor.
    await document.fonts?.ready;
    clearTextCache();

    const name = baseName(job.input).replace(/(\.drawio)?\.(opendraw|drawio|xml|svg)$/i, '');
    const active = pages[(job.page ?? 1) - 1] ?? pages[0];
    const files = await exportFiles({ pages, activePageId: active.id, selection: [], fileName: name }, s);
    const ext = FORMATS[s.format].ext;
    const output = job.output ?? `${splitExt(job.input).stem}.${ext}`;
    const paths = outputPaths(output, files);
    for (const [i, f] of files.entries()) {
      await saveFile(f.data, { path: paths[i], defaultName: f.name, filters: [], mime: f.mime });
      await log(s.format === 'url' ? `${paths[i]}\n${f.data as string}` : paths[i]);
    }
    return 0;
  } catch (e) {
    await log(`opendraw: export failed: ${(e as Error)?.message ?? String(e)}`, true);
    return 1;
  }
}

/** Starts the CLI job if the app was launched with `--export`. */
async function bootstrap() {
  const { invoke } = await core();
  const job = await invoke<CliExportJob | null>('take_export_job').catch(() => null);
  if (!job) return null;
  void runCliExport(job).then(exit, () => exit(1));
  return job;
}

if (isTauri()) {
  const pending = bootstrap();
  // Keep the window hidden during a CLI export: App reveals it after first paint.
  const show = windowControls.show.bind(windowControls);
  windowControls.show = async () => {
    if (!(await pending.catch(() => null))) await show();
  };
}
