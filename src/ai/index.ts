/**
 * OpenDraw AI assistant (bring-your-own-key).
 *
 *   <AiPanel host={hostApi} onClose={…} />      assistant panel
 *   <AiSettingsDialog open onClose={…} />      BYOK settings (the panel also opens it itself)
 *   specToElements(spec, origin)               pure spec → elements conversion
 */
export { AiPanel, type AiPanelProps } from './components/AiPanel';
export { AiSettingsDialog, type AiSettingsDialogProps } from './components/AiSettingsDialog';
export type { AiHostApi } from './host';
export { specToElements, convertSpec } from './generate/toElements';
export { validateSpec, type DiagramSpec, type SpecNode, type SpecEdge, type DiagramType } from './generate/spec';
export { applyOps, type EditOp } from './generate/ops';
export { runAssistant, type AgentResult, type AgentEvent } from './generate/agent';
export { useAiSettings, getAiSettings, updateAiSettings, type AiSettings } from './settings';
export { isTauri as isDesktopAi } from './transport';
