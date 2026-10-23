/**
 * Formatted labels — implementation lives in src/text/RichTextBlock.tsx
 * (Markdown subset + sanitized inline HTML, math, tables, images).
 * Re-exported here so existing imports keep working.
 */
export { layoutRich, needsRich, richSize, RichTextBlock } from '@/text/RichTextBlock';
