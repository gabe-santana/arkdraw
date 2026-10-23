/**
 * Where File → Save goes when it isn't a file on disk: an embedding host page
 * (src/web/embed.ts) registers itself here, and saveDocument hands off to it.
 */
type SaveHandler = () => void;

let handler: SaveHandler | null = null;

/** Registers a save handler; returns a function that removes it. */
export function setSaveTarget(fn: SaveHandler): () => void {
  handler = fn;
  return () => {
    if (handler === fn) handler = null;
  };
}

export const saveTarget = (): SaveHandler | null => handler;
