import { describe, expect, it } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { editDistance, SearchIndex } from '@/search/engine';

interface Icon { id: string; name: string; category: string; keywords: string[] }
const providers = ['aws', 'azure', 'gcp', 'oci', 'alibaba', 'ibm', 'kubernetes', 'logos'];
const icons: Array<Icon & { provider: string }> = [];
for (const p of providers) {
  const f = `public/icons/${p}/index.json`;
  if (existsSync(f)) for (const i of JSON.parse(readFileSync(f, 'utf-8')).icons) icons.push({ ...i, provider: p });
}
const index = new SearchIndex(icons, (i) => [
  { text: i.name, weight: 3 },
  { text: i.keywords.join(' '), weight: 1.5 },
  { text: i.category, weight: 1 },
  { text: i.provider, weight: 1.2 },
]);
const top = (q: string, n = 8) => index.search(q, n).map((r) => `${r.item.provider}:${r.item.name}`);

describe.skipIf(!icons.length)('icon search', () => {
  it('understands acronyms and common terms', () => {
    expect(top('vnet').join('|')).toMatch(/azure:Virtual Networks?/i);
    expect(top('s3', 10).join('|')).toMatch(/aws:.*Simple Storage Service/i);
    expect(top('k8s').some((t) => /kubernetes|eks|aks|gke/i.test(t))).toBe(true);
    expect(top('vm', 15).join('|')).toMatch(/EC2|Virtual Machine|Compute Engine/i);
    expect(top('apigw').join('|')).toMatch(/API Gateway/i);
  });

  it('tolerates typos', () => {
    expect(top('kubernets').some((t) => /kubernetes/i.test(t))).toBe(true);
    expect(top('lamda').join('|')).toMatch(/aws:AWS Lambda/i);
    expect(top('cosmo db').join('|')).toMatch(/Cosmos/i);
    expect(top('load balancr').join('|')).toMatch(/Load Balanc/i);
    expect(top('dyanmodb').join('|')).toMatch(/DynamoDB/i);
  });

  it('combines provider and service words', () => {
    expect(top('azure function')[0]).toMatch(/azure:.*Function/i);
    expect(top('aws queue').join('|')).toMatch(/aws:.*(SQS|Simple Queue)/i);
    expect(top('google bucket').join('|')).toMatch(/gcp:.*Storage/i);
  });
});

describe.skipIf(!icons.length)('icon ranking', () => {
  // What the user typed (or clearly meant) comes first; synonyms follow.
  it.each([
    ['vnet', /azure:Virtual Networks$/],
    ['lamda', /aws:AWS Lambda$/],
    ['lambda', /aws:AWS Lambda$/],
    ['dyanmodb', /DynamoDB$/i],
    ['azure function', /azure:Function Apps$/],
    ['aws queue', /aws:Amazon Simple Queue Service$/],
    ['google bucket', /gcp:Cloud Storage$/],
    ['vm', /azure:Virtual Machine$/],
    ['cosmo db', /azure:Azure Cosmos DB$/],
  ])('%s', (q, expected) => {
    expect(top(q, 1)[0]).toMatch(expected);
  });

  it('keeps cross-cloud equivalents close behind', () => {
    expect(top('lambda', 10).join('|')).toMatch(/Functions/);
    expect(top('s3', 3).some((t) => /^aws:Amazon Simple Storage Service$/.test(t))).toBe(true);
  });
});

describe('edit distance', () => {
  it('handles transpositions and bounds', () => {
    expect(editDistance('dyanmo', 'dynamo', 2)).toBe(1);
    expect(editDistance('kitten', 'sitting', 5)).toBe(3);
    expect(editDistance('abc', 'xyzxyz', 1)).toBeGreaterThan(1);
  });
});
