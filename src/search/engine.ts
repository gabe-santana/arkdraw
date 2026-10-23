/**
 * Fuzzy, synonym-aware search used by every search box in the app
 * (shape libraries, cloud icons, command palette, shape picker, layers).
 *
 * Matching per query word, best first:
 *   exact > prefix > initials ("apigw") > typo (Damerau–Levenshtein,
 *   tolerance grows with word length) > substring
 * Queries are expanded with well-known terms (src/search/synonyms.ts):
 * "vnet" also searches "virtual network", "vpc", …; multi-word phrases
 * ("load balancer") are recognised as a unit. Every query part must match
 * (AND); if nothing matches everything, partial matches are returned with a
 * lower score so the user still sees the closest results.
 */
import { SPELLING, SYNONYM_GROUPS } from './synonyms';

export interface SearchField {
  text: string;
  /** Relative importance (name ≈ 3, keywords ≈ 1.5, category ≈ 1). */
  weight: number;
}

export interface SearchResult<T> {
  item: T;
  score: number;
}

// ---------------------------------------------------------------------------
// Text normalisation
// ---------------------------------------------------------------------------

export function normalize(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

export function tokenize(text: string): string[] {
  const n = normalize(text);
  return n ? n.split(' ') : [];
}

/** Light English stemming: plural → singular. */
function stem(t: string): string {
  if (t.length > 4 && t.endsWith('ies')) return t.slice(0, -3) + 'y';
  if (t.length > 4 && /(ses|xes|zes|ches|shes)$/.test(t)) return t.slice(0, -2);
  if (t.length > 3 && t.endsWith('s') && !t.endsWith('ss') && !t.endsWith('us')) return t.slice(0, -1);
  return t;
}

/** Damerau–Levenshtein distance with an early exit above `max`. */
export function editDistance(a: string, b: string, max: number): number {
  if (Math.abs(a.length - b.length) > max) return max + 1;
  const n = a.length;
  const m = b.length;
  let prev2 = new Array<number>(m + 1).fill(0);
  let prev = Array.from({ length: m + 1 }, (_, j) => j);
  let cur = new Array<number>(m + 1).fill(0);
  for (let i = 1; i <= n; i++) {
    cur[0] = i;
    let rowMin = cur[0];
    for (let j = 1; j <= m; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      let v = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + cost);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) v = Math.min(v, prev2[j - 2] + 1);
      cur[j] = v;
      if (v < rowMin) rowMin = v;
    }
    if (rowMin > max) return max + 1;
    [prev2, prev, cur] = [prev, cur, prev2];
  }
  return prev[m];
}

/** Vendor words: they narrow results to a provider but say nothing about the service. */
const VENDORS = new Set(['aws', 'amazon', 'azure', 'microsoft', 'google', 'gcp', 'oci', 'oracle', 'ibm', 'alibaba', 'aliyun']);
const withoutVendors = (tokens: string[]) => {
  const rest = tokens.filter((t) => !VENDORS.has(t));
  return rest.length ? rest : tokens;
};

const maxTypos = (len: number) => (len <= 3 ? 0 : len <= 5 ? 1 : len <= 9 ? 2 : 3);

// ---------------------------------------------------------------------------
// Synonym expansion
// ---------------------------------------------------------------------------

interface Phrase {
  tokens: string[];
  group: number;
  /** Position inside its group (members listed first are closer synonyms). */
  rank: number;
}

const PHRASES: Phrase[] = SYNONYM_GROUPS.flatMap((g, gi) => g.map((p, rank) => ({ tokens: tokenize(p).map(stem), group: gi, rank }))).filter(
  (p) => p.tokens.length,
);
/** Synonym weight: closer members of the group count more. */
const synPenalty = (a: Phrase, b: Phrase) => Math.max(0.7, 0.9 - 0.015 * Math.abs(a.rank - b.rank));
/** Longest phrases first, so "load balancer" wins over "load". */
PHRASES.sort((a, b) => b.tokens.length - a.tokens.length);

/** "vnet" abbreviates "virtual network": built from a prefix of each word, in order. */
function isAbbreviation(abbr: string, words: string[]): boolean {
  if (words.length < 2 || abbr.length < 2) return false;
  const go = (i: number, w: number): boolean => {
    if (w === words.length) return i === abbr.length;
    for (let k = 1; k <= words[w].length && i + k <= abbr.length; k++) {
      if (words[w][k - 1] !== abbr[i + k - 1]) break;
      if (go(i + k, w + 1)) return true;
    }
    return false;
  };
  return go(0, 0);
}

/** Groups list an acronym's expansion right after it: ['s3', 'simple storage service', …]. */
const isExpansion = (acronym: Phrase, p: Phrase) =>
  acronym.tokens[0].length <= 5 && p.group === acronym.group && p.rank === acronym.rank + 1 && p.tokens.length >= 2 && p.tokens[0][0] === acronym.tokens[0][0];

/** One part of the query that must be satisfied, with interchangeable alternatives. */
interface Slot {
  /** Alternatives: each is a token sequence; the first is what the user typed. */
  alts: Array<{ tokens: string[]; penalty: number; direct?: boolean }>;
}

function querySlots(query: string): Slot[] {
  const raw = tokenize(query).map((t) => SPELLING[t] ?? t);
  const tokens = raw.map(stem);
  const slots: Slot[] = [];
  let i = 0;
  while (i < tokens.length) {
    // Recognise known phrases inside the query (exact words only).
    const phrase = PHRASES.find((p) => p.tokens.length > 0 && p.tokens.every((t, k) => tokens[i + k] === t));
    if (phrase) {
      const group = PHRASES.filter((p) => p.group === phrase.group && p !== phrase);
      slots.push({
        alts: [{ tokens: phrase.tokens, penalty: 1, direct: true }, ...group.map((p) => ({
            tokens: p.tokens,
            penalty: synPenalty(phrase, p),
            // The spelled-out form of an acronym is what the user meant
            // ("vnet" → "virtual network", "s3" → "simple storage service").
            // A synonym containing the typed service word refines it ("azure function" → "function app").
            direct:
              (phrase.tokens.length === 1 && (isAbbreviation(phrase.tokens[0], p.tokens) || isExpansion(phrase, p))) ||
              withoutVendors(phrase.tokens).every((t) => p.tokens.includes(t)),
          })),
        ],
      });
      i += phrase.tokens.length;
      continue;
    }
    // Unknown word: itself, plus synonym groups whose single-word members are a near-typo of it.
    const t = tokens[i];
    const alts: Slot['alts'] = [{ tokens: [t], penalty: 1, direct: true }];
    if (t.length >= 4) {
      const near = PHRASES.find((p) => p.tokens.length === 1 && p.tokens[0].length >= 4 && editDistance(t, p.tokens[0], 1) <= 1);
      if (near) {
        // The corrected word counts as what the user meant; its synonyms rank below it.
        alts.push({ tokens: near.tokens, penalty: 0.95, direct: true });
        for (const p of PHRASES.filter((q) => q.group === near.group && q !== near)) alts.push({ tokens: p.tokens, penalty: 0.8 * synPenalty(near, p) });
      }
    }
    slots.push({ alts });
    i++;
  }
  return slots;
}

/** Adjacent words joined ("dynamo db" → "dynamodb"); camelCase names split apart on indexing. */
const pairs = (tokens: string[]) => tokens.slice(1).map((t, i) => tokens[i] + t);

// ---------------------------------------------------------------------------
// Index
// ---------------------------------------------------------------------------

interface Posting {
  doc: number;
  weight: number;
}

export class SearchIndex<T> {
  private vocab = new Map<string, Posting[]>();
  private vocabList: string[] = [];
  private initials: string[][] = [];
  private names: string[] = [];
  /** Stemmed name, for "the whole name is this synonym" bonuses. */
  private stemNames: string[] = [];
  /** Stemmed name words, for "the name contains what was typed" bonuses. */
  private nameWords: Array<Set<string>> = [];
  private tokenCache = new Map<string, Array<{ token: string; score: number }>>();

  constructor(
    private items: T[],
    fields: (item: T) => SearchField[],
  ) {
    items.forEach((item, doc) => {
      const fs = fields(item);
      const name = fs[0]?.text ?? '';
      this.names[doc] = normalize(name);
      const nameTokens = tokenize(name);
      this.stemNames[doc] = withoutVendors(nameTokens.map(stem)).join(' ');
      this.nameWords[doc] = new Set([...nameTokens.map(stem), ...pairs(nameTokens)]);
      // Initials of the name, with and without a leading vendor word ("Amazon API Gateway" → aag / ag).
      const ini = nameTokens.map((t) => t[0]).join('');
      this.initials[doc] = [ini, ini.slice(1)].filter((s) => s.length >= 2);
      const best = new Map<string, number>();
      for (const f of fs) {
        for (const tok of tokenize(f.text)) {
          for (const t of new Set([tok, stem(tok)])) best.set(t, Math.max(best.get(t) ?? 0, f.weight));
        }
        // Also index joined compounds ("Cloud Front" ↔ "cloudfront", "Dynamo DB" ↔ "dynamodb").
        const toks = tokenize(f.text);
        for (const joined of [toks.join(''), ...pairs(toks)]) {
          if (joined.length > 3) best.set(joined, Math.max(best.get(joined) ?? 0, f.weight * 0.9));
        }
      }
      for (const [t, w] of best) {
        let list = this.vocab.get(t);
        if (!list) this.vocab.set(t, (list = []));
        list.push({ doc, weight: w });
      }
    });
    this.vocabList = [...this.vocab.keys()];
  }

  /** Vocabulary words matching one query word, with match quality 0..1. */
  private matches(q: string): Array<{ token: string; score: number }> {
    const hit = this.tokenCache.get(q);
    if (hit) return hit;
    const out: Array<{ token: string; score: number }> = [];
    const typos = maxTypos(q.length);
    for (const v of this.vocabList) {
      let score = 0;
      if (v === q) score = 1;
      else if (q.length >= 2 && v.startsWith(q)) score = 0.82 + 0.12 * (q.length / v.length);
      else {
        if (typos > 0 && Math.abs(v.length - q.length) <= typos) {
          const d = editDistance(q, v, typos);
          if (d <= typos) score = 0.78 - 0.12 * d;
        }
        if (!score && q.length >= 4 && typos > 0 && v.length > q.length) {
          // Typo inside a prefix ("kuberne" vs "kubernetes").
          const d = editDistance(q, v.slice(0, q.length), Math.max(1, typos - 1));
          if (d <= Math.max(1, typos - 1)) score = 0.62 - 0.1 * d;
        }
        if (!score && q.length >= 3 && v.includes(q)) score = 0.55;
      }
      if (score > 0) out.push({ token: v, score });
    }
    if (this.tokenCache.size > 2000) this.tokenCache.clear();
    this.tokenCache.set(q, out);
    return out;
  }

  /** Per-document score for one query word. */
  private scoreToken(q: string, acc: Map<number, number>) {
    for (const { token, score } of this.matches(q)) {
      for (const p of this.vocab.get(token)!) {
        const s = score * p.weight;
        if (s > (acc.get(p.doc) ?? 0)) acc.set(p.doc, s);
      }
    }
    // Initials ("apigw" isn't a word, but "agw"/"ag" can be): exact initials only.
    if (q.length >= 2 && q.length <= 6) {
      this.initials.forEach((ini, doc) => {
        if (ini.includes(q)) acc.set(doc, Math.max(acc.get(doc) ?? 0, 0.72 * 3));
      });
    }
  }

  search(query: string, limit = 200): Array<SearchResult<T>> {
    const slots = querySlots(query);
    if (!slots.length) return [];
    // Name bonuses. What the user typed (or its correction) beats synonyms:
    // "lambda" → "AWS Lambda" above "Functions", although both are relevant.
    // Bonuses only go to items that matched that alternative (vendor words included),
    // so "azure function" doesn't promote OCI "Functions".
    const nameBonus = new Map<number, number>();
    const bump = (doc: number, v: number) => nameBonus.set(doc, Math.max(nameBonus.get(doc) ?? 0, v));
    const isVendorSlot = (slot: Slot) => slot.alts[0].tokens.every((t) => VENDORS.has(t));
    /** Per service slot: items whose name contains what was typed, as whole words. */
    const wordHits: Array<Set<number>> = [];
    const slotScores: Array<Map<number, number>> = slots.map((slot) => {
      const hits = new Set<number>();
      if (!isVendorSlot(slot)) wordHits.push(hits);
      const best = new Map<number, number>();
      for (const alt of slot.alts) {
        // All tokens of an alternative must match; its score is their mean.
        let altScores: Map<number, number> | null = null;
        for (const t of alt.tokens) {
          const m = new Map<number, number>();
          this.scoreToken(t, m);
          if (!altScores) altScores = m;
          else {
            const merged = new Map<number, number>();
            for (const [doc, s] of altScores) {
              const o = m.get(doc);
              if (o !== undefined) merged.set(doc, s + o);
            }
            altScores = merged;
          }
        }
        const phrase = withoutVendors(alt.tokens);
        for (const [doc, s] of altScores ?? []) {
          const v = (s / alt.tokens.length) * alt.penalty;
          if (v > (best.get(doc) ?? 0)) best.set(doc, v);
          if (slots.length === 1 && this.stemNames[doc] === phrase.join(' ')) bump(doc, alt.direct ? 1.6 * alt.penalty : 0.55 * alt.penalty);
          if (alt.direct && phrase.every((t) => this.nameWords[doc].has(t))) hits.add(doc);
        }
      }
      return best;
    });
    if (wordHits.length) for (const doc of wordHits[0]) if (wordHits.every((h) => h.has(doc))) bump(doc, 0.95);

    const totals = new Map<number, { score: number; matched: number }>();
    slotScores.forEach((m, si) => {
      const vendorOnly = slots.length > 1 && slots[si].alts[0].tokens.every((t) => VENDORS.has(t));
      for (const [doc, raw] of m) {
        const s = vendorOnly ? Math.min(raw, 1.2) : raw;
        const cur = totals.get(doc) ?? { score: 0, matched: 0 };
        cur.score += s;
        cur.matched++;
        totals.set(doc, cur);
      }
    });

    const qn = normalize(query);
    const results: Array<SearchResult<T>> = [];
    let anyComplete = false;
    for (const [, t] of totals) if (t.matched === slots.length) anyComplete = true;
    for (const [doc, t] of totals) {
      if (anyComplete && t.matched < slots.length) continue;
      let score = (t.score / slots.length) * (t.matched / slots.length) * (t.matched < slots.length ? 0.6 : 1);
      const name = this.names[doc];
      if (name === qn) score += 1.6;
      else if (nameBonus.has(doc)) score += nameBonus.get(doc)!;
      else if (name.startsWith(qn)) score += 0.6;
      else if (` ${name}`.includes(` ${qn}`)) score += 0.3;
      score -= name.length / 400; // Prefer concise names on ties.
      results.push({ item: this.items[doc], score });
    }
    return results.sort((a, b) => b.score - a.score).slice(0, limit);
  }
}
