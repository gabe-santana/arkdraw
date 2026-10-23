/**
 * Which automation / data / storage dialog is open. Kept apart from the main
 * UI store so these features stay self-contained (mounted by AutomationHost).
 */
import { create } from 'zustand';

export type DataTarget = { type: 'layer'; id: string } | { type: 'page'; id: string } | { type: 'document' };

export type AutomationDialog =
  | { kind: 'data'; target: DataTarget }
  | { kind: 'properties' }
  | { kind: 'configuration' }
  | { kind: 'layoutJson' }
  | { kind: 'saveTemplate' }
  | { kind: 'library' }
  | { kind: 'start' }
  | { kind: 'print' }
  | { kind: 'embed' }
  | { kind: 'mermaid'; groupId: string }
  | { kind: 'replay' };

interface AutomationUiState {
  dialog: AutomationDialog | null;
  open: (d: AutomationDialog) => void;
  close: () => void;
}

export const useAutomationUi = create<AutomationUiState>((set) => ({
  dialog: null,
  open: (dialog) => set({ dialog }),
  close: () => set({ dialog: null }),
}));

export const openAutomationDialog = (d: AutomationDialog) => useAutomationUi.getState().open(d);
