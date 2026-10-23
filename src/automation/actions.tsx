/**
 * Commands for data, storage, import/export and automation features. Spread
 * into ACTIONS (src/app/actions.tsx), so they reach menus, the palette and
 * shortcuts like every other command.
 */
import {
  BookmarkPlus, Code, Compass, Database, EyeOff, FileText, HardDrive, HardDriveDownload, Mic, Network, Rewind, Settings, Spline, VenetianMask,
} from 'lucide-react';
import type { Action } from '@/app/actions';
import { useEditor } from '@/store/editor';
import { useUi } from '@/store/ui';
import { isTauri } from '@/lib/platform';
import { openAutomationDialog } from './ui';
import { commitDoc, useHighlights } from './editorBridge';
import { revealAll } from './linkActions';
import { parallelEdgesPatches } from './layouts';
import { anonymizePage, canDictate, dictateLabel, toggleExplore } from './plugins';
import { selectedMermaidGroup } from './mermaidRegen';

const ed = () => useEditor.getState();

function parallelEdges() {
  const s = ed();
  const patches = parallelEdgesPatches(s.doc, s.selection);
  if (!Object.keys(patches).length) return useUi.getState().toast('No connectors share the same two shapes.', 'info');
  s.updateElements(patches);
}

async function saveToBrowser() {
  const { saveCurrentToLibrary } = await import('@/storage/library');
  const entry = await saveCurrentToLibrary();
  if (entry) useUi.getState().toast(`Saved “${entry.name}” to the browser`, 'success');
}

export const AUTOMATION_ACTIONS: Action[] = [
  // --- File
  { id: 'file.saveTemplate', label: 'Save as template…', group: 'File', icon: <BookmarkPlus />, run: () => openAutomationDialog({ kind: 'saveTemplate' }), keywords: 'custom template my templates' },
  { id: 'file.openBrowser', label: 'Open from browser…', group: 'File', icon: <HardDrive />, run: () => openAutomationDialog({ kind: 'library' }), keywords: 'browser storage indexeddb library local', hidden: isTauri() },
  { id: 'file.saveBrowser', label: 'Save to browser', group: 'File', icon: <HardDriveDownload />, run: () => void saveToBrowser(), keywords: 'browser storage indexeddb library local', hidden: isTauri() },
  { id: 'file.properties', label: 'Properties…', group: 'File', icon: <FileText />, run: () => openAutomationDialog({ kind: 'properties' }), keywords: 'title author description metadata info statistics' },
  { id: 'file.embed', label: 'Embed…', group: 'File', icon: <Code />, run: () => openAutomationDialog({ kind: 'embed' }), keywords: 'iframe html snippet markdown image share publish' },

  // --- Edit
  { id: 'edit.pageData', label: 'Edit page data…', group: 'Edit', icon: <Database />, run: () => openAutomationDialog({ kind: 'data', target: { type: 'page', id: ed().activePageId } }), keywords: 'properties metadata placeholders' },
  { id: 'edit.documentData', label: 'Edit document data…', group: 'Edit', icon: <Database />, run: () => openAutomationDialog({ kind: 'data', target: { type: 'document' } }), keywords: 'properties metadata placeholders file' },
  {
    id: 'edit.revealHidden',
    label: 'Show hidden elements',
    group: 'Edit',
    icon: <EyeOff />,
    run: () => commitDoc(revealAll(ed().doc)),
    enabled: () => ed().doc.order.some((id) => ed().doc.elements[id]?.hidden),
    keywords: 'visible unhide link action',
  },
  { id: 'edit.mermaid', label: 'Edit Mermaid…', group: 'Edit', icon: <Code />, run: () => openAutomationDialog({ kind: 'mermaid', groupId: ed().selection[0] }), enabled: () => !!selectedMermaidGroup(), keywords: 'mermaid source regenerate' },

  // --- Extras
  { id: 'extras.configuration', label: 'Configuration…', group: 'AI', icon: <Settings />, run: () => openAutomationDialog({ kind: 'configuration' }), keywords: 'json config default styles fonts libraries colors' },
  { id: 'extras.explore', label: 'Explore from selection', group: 'Tools', icon: <Compass />, run: toggleExplore, checked: () => !!useHighlights.getState().explore, keywords: 'plugin focus neighbours neighbors' },
  { id: 'extras.anonymize', label: 'Anonymize page…', group: 'Tools', icon: <VenetianMask />, run: () => void anonymizePage(), keywords: 'plugin redact privacy share' },
  { id: 'extras.replay', label: 'Replay revisions…', group: 'Tools', icon: <Rewind />, run: () => openAutomationDialog({ kind: 'replay' }), keywords: 'plugin history animation timeline' },
  { id: 'extras.dictate', label: 'Dictate label', group: 'Tools', icon: <Mic />, run: dictateLabel, enabled: () => ed().selection.length === 1, hidden: !canDictate(), keywords: 'voice speech plugin microphone' },

  // --- Layout
  { id: 'layout.parallelEdges', label: 'Parallel Edges', group: 'Layout', icon: <Spline />, run: parallelEdges, keywords: 'layout spread connectors bundle multiple' },
  { id: 'layout.fromJson', label: 'Apply layout from JSON…', group: 'Layout', icon: <Network />, run: () => openAutomationDialog({ kind: 'layoutJson' }), keywords: 'layout json mxgraph drawio' },
];
