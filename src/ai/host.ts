import type { DiagramElement, Doc } from '@/model/types';

/** What the AI panel needs from the editor. */
export interface AiHostApi {
  getDoc(): Doc;
  getSelection(): string[];
  /** Insert new elements (already positioned in world coords) and select them. */
  insertElements(elements: DiagramElement[]): void;
  /** Replace the whole document (undoable on the host side). */
  replaceDoc(elements: DiagramElement[]): void;
  /** World-space point at the center of the viewport, for placing inserted diagrams. */
  getViewportCenter(): { x: number; y: number };
  /** Undo the last change (offered right after the assistant applies its result). */
  undo?(): void;
  /** The assistant started (with what it's doing and how to stop it) or stopped working. */
  setActivity?(activity: { label: string; stop: () => void } | null): void;
}
