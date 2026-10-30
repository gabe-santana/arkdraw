/**
 * Docked panels draw their own floating card in a stacked column (the left
 * one). In the right column they are tabs of one shared card, so they drop
 * their own (src/chrome/Dock.tsx provides `InTabs`).
 */
import { createContext, useContext } from 'react';

export const InTabs = createContext(false);

/** True when the panel is a tab of the right column's card. */
export const useInTabs = () => useContext(InTabs);

/** The panel's own card, unless it is a tab. */
export const usePanelCard = () => (useInTabs() ? '' : 'animate-slide-up rounded-2xl bg-panel shadow-panel');
