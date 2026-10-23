/**
 * Named stencils: targets for `<include-shape name="…"/>` and stencils that
 * plugins or shape configs register. Shapes on the canvas always carry their
 * own XML (`ShapeElement.stencil`), so documents never depend on this registry
 * being populated; it only makes includes resolvable.
 */
import { parseStencil, tryParseStencil, type Stencil } from './parse';

const NAMED = new Map<string, string>();
const listeners = new Set<() => void>();

/** Registers stencil XML under a name. Returns a function that removes it. */
export function registerStencil(name: string, xml: string): () => void {
  parseStencil(xml); // validate early
  NAMED.set(name, xml);
  listeners.forEach((l) => l());
  return () => {
    if (NAMED.get(name) === xml) NAMED.delete(name);
    listeners.forEach((l) => l());
  };
}

export const getNamedStencil = (name: string): string | undefined => NAMED.get(name);
export const namedStencils = (): string[] => [...NAMED.keys()].sort();
export const onStencilsChanged = (cb: () => void) => {
  listeners.add(cb);
  return () => void listeners.delete(cb);
};

/** Resolver for `include-shape` (case-insensitive registry). */
export function resolveStencil(name: string): Stencil | null {
  const xml = NAMED.get(name) ?? NAMED.get(name.toLowerCase()) ?? [...NAMED].find(([k]) => k.toLowerCase() === name.toLowerCase())?.[1];
  return tryParseStencil(xml);
}
