/**
 * Quick style presets for the Format panel (mxGraph's style palette): fill,
 * stroke and text color combinations applied to the selection in one step.
 */
import type { DiagramElement, ElementStyle } from '@/model/types';
import { tx } from '@/i18n';

export interface StylePreset {
  id: string;
  label: string;
  fill: string;
  stroke: string;
  textColor: string;
}

/** A preset's name in the UI language ('styling.preset.<id>'). */
export const presetLabel = (preset: Pick<StylePreset, 'id' | 'label'>): string => tx(`styling.preset.${preset.id}`, preset.label);

export const STYLE_PRESETS: StylePreset[] = [
  { id: 'plain', label: 'Plain', fill: '#ffffff', stroke: '#1e293b', textColor: '#0f172a' },
  { id: 'gray', label: 'Gray', fill: '#f5f5f5', stroke: '#666666', textColor: '#333333' },
  { id: 'blue', label: 'Blue', fill: '#dae8fc', stroke: '#6c8ebf', textColor: '#0f172a' },
  { id: 'green', label: 'Green', fill: '#d5e8d4', stroke: '#82b366', textColor: '#0f172a' },
  { id: 'orange', label: 'Orange', fill: '#ffe6cc', stroke: '#d79b00', textColor: '#0f172a' },
  { id: 'yellow', label: 'Yellow', fill: '#fff2cc', stroke: '#d6b656', textColor: '#0f172a' },
  { id: 'red', label: 'Red', fill: '#f8cecc', stroke: '#b85450', textColor: '#0f172a' },
  { id: 'purple', label: 'Purple', fill: '#e1d5e7', stroke: '#9673a6', textColor: '#0f172a' },
  { id: 'ink', label: 'Ink', fill: '#1e293b', stroke: '#0f172a', textColor: '#ffffff' },
  { id: 'indigo', label: 'Indigo', fill: '#4f46e5', stroke: '#3730a3', textColor: '#ffffff' },
  { id: 'teal', label: 'Teal', fill: '#0d9488', stroke: '#115e59', textColor: '#ffffff' },
  { id: 'outline', label: 'Outline', fill: 'none', stroke: '#1e293b', textColor: '#0f172a' },
];

/** Per-element style patches for a preset; connectors only take the line and text colors. */
export function presetPatches(els: DiagramElement[], preset: Pick<StylePreset, 'fill' | 'stroke' | 'textColor'>): Record<string, Partial<DiagramElement>> {
  const out: Record<string, Partial<DiagramElement>> = {};
  for (const el of els) {
    const style: ElementStyle =
      el.type === 'connector'
        ? { ...el.style, stroke: preset.stroke === 'none' ? el.style.stroke : preset.stroke, textColor: preset.textColor === '#ffffff' ? el.style.textColor : preset.textColor }
        : { ...el.style, fill: preset.fill, stroke: preset.stroke, textColor: preset.textColor, gradient: undefined };
    out[el.id] = { style };
  }
  return out;
}

/** Does the element currently look like this preset? */
export function matchesPreset(el: DiagramElement, p: Pick<StylePreset, 'fill' | 'stroke' | 'textColor'>): boolean {
  const s = el.style;
  if (el.type === 'connector') return s.stroke.toLowerCase() === p.stroke.toLowerCase();
  return s.fill.toLowerCase() === p.fill.toLowerCase() && s.stroke.toLowerCase() === p.stroke.toLowerCase() && s.textColor.toLowerCase() === p.textColor.toLowerCase() && !s.gradient;
}
