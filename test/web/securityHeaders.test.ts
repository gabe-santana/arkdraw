import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();
const hsts = 'max-age=31536000; includeSubDomains';
const permissions = 'camera=(), microphone=(self), geolocation=(), payment=()';

describe('web security headers', () => {
  it('generates HSTS and permits same-origin microphone access in static hosting', () => {
    const dist = mkdtempSync(path.join(tmpdir(), 'arkdraw-headers-'));
    try {
      writeFileSync(path.join(dist, 'index.html'), '<!doctype html><title>test</title>');
      execFileSync(process.execPath, [path.join(root, 'scripts/web/csp.mjs'), dist, '--headers']);

      const headers = readFileSync(path.join(dist, '_headers'), 'utf8');
      expect(headers).toContain(`Strict-Transport-Security: ${hsts}`);
      expect(headers).toContain(`Permissions-Policy: ${permissions}`);
    } finally {
      rmSync(dist, { recursive: true, force: true });
    }
  });

  it('configures matching nginx headers on every response', () => {
    const nginx = readFileSync(path.join(root, 'deploy/nginx.conf'), 'utf8');
    expect(nginx).toContain(`add_header Strict-Transport-Security "${hsts}" always;`);
    expect(nginx).toContain(`add_header Permissions-Policy "${permissions}" always;`);
  });
});
