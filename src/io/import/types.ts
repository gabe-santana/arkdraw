/**
 * Importer plugin contract. Each module in src/io/import/*.ts (other than this
 * file and index.ts) exports `importer: Importer`; they're discovered
 * automatically and listed in File → Import.
 */
import type { Doc } from '@/model/types';

export interface ImportedPage {
  name: string;
  doc: Doc;
}

export interface ImportResult {
  pages: ImportedPage[];
  /** Non-fatal notes shown to the user (e.g. "3 unsupported shapes became rectangles"). */
  warnings?: string[];
}

export interface Importer {
  id: string;
  /** Menu label, e.g. "Mermaid…". */
  label: string;
  description: string;
  /** File extensions it can open (lowercase, no dot). Empty for text-only importers. */
  extensions: string[];
  /** Whether it accepts pasted/typed text (shows a text editor in the import dialog). */
  acceptsText: boolean;
  /** Example input shown as placeholder in the text editor. */
  example?: string;
  /** Sniff whether some content belongs to this importer (for drag & drop / paste). */
  detect?: (content: string | Uint8Array, fileName?: string) => boolean;
  run: (content: string | Uint8Array, fileName?: string) => Promise<ImportResult>;
}
