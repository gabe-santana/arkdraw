import type { PageSettings, PaperSize } from '@/model/types';

/** Paper sizes in CSS px (96 dpi), portrait. */
export const PAPER_SIZES: Record<Exclude<PaperSize, 'Custom'>, { w: number; h: number; label: string }> = {
  A3: { w: 1123, h: 1587, label: 'A3 (297 × 420 mm)' },
  A4: { w: 794, h: 1123, label: 'A4 (210 × 297 mm)' },
  A5: { w: 559, h: 794, label: 'A5 (148 × 210 mm)' },
  Letter: { w: 816, h: 1056, label: 'US Letter (8.5 × 11 in)' },
  Legal: { w: 816, h: 1344, label: 'US Legal (8.5 × 14 in)' },
  Tabloid: { w: 1056, h: 1632, label: 'Tabloid (11 × 17 in)' },
  '16:9': { w: 1080, h: 1920, label: 'Screen 16:9' },
  '16:10': { w: 1200, h: 1920, label: 'Screen 16:10' },
  '4:3': { w: 1440, h: 1920, label: 'Screen 4:3' },
};

export function paperSize(s: PageSettings): { w: number; h: number } {
  if (s.paper === 'Custom') return { w: s.paperW ?? 800, h: s.paperH ?? 600 };
  const p = PAPER_SIZES[s.paper] ?? PAPER_SIZES.A4;
  // Screen ratios are naturally landscape; paper is portrait unless flipped.
  const landscape = s.paper.includes(':') ? !s.landscape : s.landscape;
  return landscape ? { w: p.h, h: p.w } : { w: p.w, h: p.h };
}

/** Units for rulers and geometry fields. */
export type Unit = 'px' | 'pt' | 'in' | 'mm' | 'm';
export const UNIT_PER_PX: Record<Unit, number> = { px: 1, pt: 0.75, in: 1 / 96, mm: 25.4 / 96, m: 0.0254 / 96 };
