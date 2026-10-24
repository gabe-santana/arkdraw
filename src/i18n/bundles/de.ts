/** All de translation modules in one lazy chunk (loaded by src/i18n/index.ts). */
export default import.meta.glob<Record<string, string>>('../locales/de/*.ts', { eager: true, import: 'default' });
