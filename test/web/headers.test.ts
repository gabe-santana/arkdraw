import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const script = path.resolve(process.cwd(), 'scripts/web/csp.mjs');

describe('web build response headers', () => {
  it('sends HSTS and allows the microphone for same-origin dictation', () => {
    const dist = mkdtempSync(path.join(tmpdir(), 'arkdraw-headers-'));
    writeFileSync(path.join(dist, 'index.html'), '<!doctype html><html><body></body></html>');
    execFileSync(process.execPath, [script, dist, '--headers']);
    const headers = readFileSync(path.join(dist, '_headers'), 'utf8');
    expect(headers).toMatch(/Strict-Transport-Security: max-age=31536000; includeSubDomains/);
    expect(headers).toMatch(/Permissions-Policy: .*microphone=\(self\)/);
  });
});
