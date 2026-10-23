#!/usr/bin/env node
/**
 * OpenDraw icon library builder.
 *
 * Downloads the official architecture icon packs from each cloud vendor (plus
 * Kubernetes and the Iconify "logos" set), keeps only SVGs, sanitizes and
 * optimizes them with SVGO, and writes them to `public/icons/` together with
 * JSON manifests the app consumes:
 *
 *   public/icons/<provider>/<category-slug>/<icon-slug>.svg
 *   public/icons/<provider>/index.json
 *   public/icons/providers.json
 *   public/icons/LICENSES.md
 *
 * Usage:
 *   node scripts/icons/fetch-icons.mjs [--cache <dir>] [--only aws,azure] [--refresh] [--out <dir>]
 *
 *   --cache <dir>   where archives are downloaded/extracted (default: <os tmp>/opendraw-icon-cache)
 *   --only <ids>    comma separated provider ids to (re)build; others keep their current output
 *   --refresh       ignore cached downloads and fetch everything again
 *   --out <dir>     output directory (default: <repo>/public/icons)
 *
 * Environment: GITHUB_TOKEN (optional) raises the GitHub API rate limit.
 *
 * Safety: every downloaded archive is untrusted data. Each provider gets its own
 * directory under the cache dir; archives are unzipped in-process with fflate,
 * only .svg (and the one OCI draw.io library .xml) entries are extracted, paths
 * are checked against zip-slip, nothing from the archives is ever executed, and
 * every SVG is sanitized (scripts, event handlers, foreignObject, external
 * references removed) before it is written to public/.
 *
 * Every provider is built independently: a failure is logged and the script
 * continues with the next provider (the previous output of a failed provider is
 * left untouched).
 */

// ============================================================================
// CONFIG — vendor download URLs. These change over time (AWS renames the zip
// every quarter, Azure bumps the V<nn> number, ...). When a download fails,
// visit the `page` URL, copy the new link and update it here.
// Last verified: 2026-10-23.
// ============================================================================
const CONFIG = {
  userAgent:
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36 OpenDraw-icon-fetch',
  providers: {
    aws: {
      name: 'AWS',
      page: 'https://aws.amazon.com/architecture/icons/',
      packageUrl:
        'https://d1.awsstatic.com/onedam/marketing-channels/website/public/shared/architecture-icon-release/Icon-package_07312026.5846e92413caa21490223536cc97f1269e44fa92.zip',
      license:
        'AWS Architecture Icons. AWS allows customers and partners to use these icons to create architecture diagrams (and in whitepapers, presentations, data sheets and posters). Not open source; AWS trademarks.',
      terms: [
        '> "We allow customers and partners to use these toolkits and assets to create architecture diagrams." — https://aws.amazon.com/architecture/icons/',
        '> "You can also put icons in materials like whitepapers, presentations, data sheets, and posters." — same page',
        '- Governing terms: AWS Site Terms (https://aws.amazon.com/terms/) and AWS Trademark Guidelines (https://aws.amazon.com/trademark-guidelines/).',
        '- The page does not explicitly address bundling the icons inside third-party diagramming software.',
      ],
    },
    azure: {
      name: 'Microsoft Azure',
      page: 'https://learn.microsoft.com/azure/architecture/icons/',
      packageUrl: 'https://arch-center.azureedge.net/icons/Azure_Public_Service_Icons_V24.zip',
      license:
        'Microsoft permits use of these icons in architectural diagrams, training materials or documentation; copy/distribute/display only for that permitted use. Microsoft reserves all other rights.',
      terms: [
        '> "Microsoft permits the use of these icons in architectural diagrams, training materials, or documentation. You can copy, distribute, and display the icons only for the permitted use unless granted explicit permission by Microsoft. Microsoft reserves all other rights." — https://learn.microsoft.com/azure/architecture/icons/ ("Icon terms")',
        "- Don'ts from the same page: don't crop, flip, or rotate icons; don't distort or change icon shape; don't use Microsoft product icons to represent your product or service.",
        '- The zip also ships `Microsoft_Terms_of_Use.pdf` and `Azure_Icons_FAQ.pdf` (not copied here).',
      ],
    },
    gcp: {
      name: 'Google Cloud',
      page: 'https://cloud.google.com/icons',
      packages: [
        { key: 'core', url: 'https://services.google.com/fh/files/misc/core-products-icons.zip' },
        { key: 'category', url: 'https://services.google.com/fh/files/misc/category-icons.zip' },
        { key: 'legacy', url: 'https://services.google.com/fh/files/misc/google-cloud-legacy-icons.zip' },
      ],
      license:
        'Official Google Cloud icons offered for building architecture diagrams. No explicit license text on the download page; Google trademarks, subject to Google brand guidelines.',
      terms: [
        '- https://cloud.google.com/icons offers the zips for download but states no usage terms or license.',
        '- Google product icons are Google brand features; see https://about.google/brand-resource-center/ and Google Cloud site terms (https://cloud.google.com/terms).',
      ],
    },
    oci: {
      name: 'Oracle Cloud Infrastructure',
      page: 'https://docs.oracle.com/en-us/iaas/Content/General/Reference/graphicsfordiagrams.htm',
      packageUrl: 'https://docs.oracle.com/iaas/Content/Resources/Assets/OCI-Style-Guide-for-Drawio.zip',
      libraryEntry: 'OCI Library.xml',
      license:
        'Official OCI icons published by Oracle for creating architecture diagrams (rendered to SVG from Oracle\'s draw.io library). No explicit license text; Oracle trademarks.',
      terms: [
        '- Oracle publishes these assets on "Graphics for Topologies and Diagrams" for drawing OCI architecture diagrams; the page contains no license text beyond "Copyright © Oracle and/or its affiliates" and links to https://docs.oracle.com/iaas/Content/legalnotices.htm.',
        '- Oracle trademarks: https://www.oracle.com/legal/trademarks.html',
        '- Oracle ships only PowerPoint, Visio and draw.io formats (no SVG). The SVGs here were generated by this script from the shapes in `OCI Library.xml`; labels/text are omitted.',
      ],
    },
    alibaba: {
      name: 'Alibaba Cloud',
      page: 'https://www.iconfont.cn/user/detail?uid=6856114',
      // Alibaba Cloud's own icons help page (help.aliyun.com/document_detail/67830.html)
      // redirects to the "阿里云设计中心" (Alibaba Cloud Design Center) account on iconfont.cn.
      apiBase: 'https://www.iconfont.cn/api/collection/detail.json?id=',
      collections: [
        { id: 21530, category: 'Cloud Infrastructure' },
        { id: 21419, category: 'Big Data' },
        { id: 21532, category: 'Artificial Intelligence' },
        { id: 21426, category: 'Security' },
        { id: 21533, category: 'Enterprise Applications' },
        { id: 21538, category: 'Developer Services' },
        { id: 21539, category: 'IoT' },
        { id: 21408, category: 'Other' }, // "2022 Alibaba Cloud Icons (orange)" full set: leftovers
      ],
      license:
        'Official Alibaba Cloud product icons from the Alibaba Cloud Design Center (iconfont.cn), marked "original" and "free". No explicit license; Alibaba Cloud trademarks.',
      terms: [
        '- Source: Alibaba Cloud Design Center collections on iconfont.cn (the official Alibaba Cloud icons help page redirects there). Collections are flagged `copyright: original`, `fees: free`; no license text is given.',
        '- iconfont.cn terms of service apply: https://www.iconfont.cn/',
        '- Icon names are the vendor\'s own (product code + Chinese product name); no official English names are published with the set.',
      ],
    },
    ibm: {
      name: 'IBM Cloud',
      page: 'https://www.ibm.com/think/architectures/diagram-tools',
      repo: 'IBM-Cloud/architecture-icons',
      branch: 'main',
      dir: 'svg/',
      license:
        'IBM Cloud architecture icons provided by IBM for customers and business partners to create IBM Cloud diagrams. Repository has no LICENSE file; IBM trademarks.',
      terms: [
        '- README: "This repo is intended to provide IBM Cloud Architecture icons for external customers and business partners." — https://github.com/IBM-Cloud/architecture-icons',
        '- The repository contains no LICENSE file. IBM trademarks: https://www.ibm.com/legal/copytrade',
      ],
    },
    kubernetes: {
      name: 'Kubernetes',
      page: 'https://github.com/kubernetes/community/tree/main/icons',
      repo: 'kubernetes/community',
      branch: 'main',
      dir: 'icons/svg/',
      license: 'Apache-2.0 or CC-BY-4.0 (Kubernetes Icons Set). Kubernetes logo is a trademark of The Linux Foundation.',
      terms: [
        '> "The Kubernetes Icons Set is licensed under a choice of either Apache-2.0 or CC-BY-4.0 (Creative Commons Attribution 4.0 International). The Kubernetes logo is a registered trademark of The Linux Foundation, and use of it as a trademark is subject to The Linux Foundation\'s Trademark Usage Guidelines at https://www.linuxfoundation.org/trademark-usage/." — https://github.com/kubernetes/community/blob/main/icons/README.md',
      ],
    },
    logos: {
      name: 'Tech Logos',
      page: 'https://github.com/gilbarbara/logos',
      npmPackage: '@iconify-json/logos',
      license: 'CC0-1.0 (SVG Logos collection by Gil Barbara). Each logo remains a trademark of its owner.',
      terms: [
        '- Collection license: CC0-1.0 — https://raw.githubusercontent.com/gilbarbara/logos/master/LICENSE.txt (via the `@iconify-json/logos` npm package).',
        '- CC0 covers the collection\'s copyright only; the logos themselves are trademarks of their respective owners and their use is subject to each owner\'s brand guidelines.',
      ],
    },
  },
  // Output order of providers.json (priority order).
  order: ['aws', 'azure', 'gcp', 'oci', 'alibaba', 'ibm', 'kubernetes', 'logos'],
};
// ============================================================================

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import zlib from 'node:zlib';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { unzipSync } from 'fflate';
import { optimize } from 'svgo';

const require = createRequire(import.meta.url);
const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(SCRIPT_DIR, '..', '..');
const MAX_ENTRY_BYTES = 25 * 1024 * 1024; // zip-bomb guard for a single entry
const MAX_SVG_BYTES = 3 * 1024 * 1024;

// ----------------------------------------------------------------------------
// CLI
// ----------------------------------------------------------------------------
function parseArgs(argv) {
  const opts = {
    cache: path.join(os.tmpdir(), 'opendraw-icon-cache'),
    out: path.join(REPO_ROOT, 'public', 'icons'),
    only: null,
    refresh: false,
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    const val = () => {
      const v = argv[++i];
      if (v === undefined) throw new Error(`Missing value for ${a}`);
      return v;
    };
    if (a === '--cache') opts.cache = path.resolve(val());
    else if (a.startsWith('--cache=')) opts.cache = path.resolve(a.slice(8));
    else if (a === '--out') opts.out = path.resolve(val());
    else if (a.startsWith('--out=')) opts.out = path.resolve(a.slice(6));
    else if (a === '--only') opts.only = val().split(',').map((s) => s.trim()).filter(Boolean);
    else if (a.startsWith('--only=')) opts.only = a.slice(7).split(',').map((s) => s.trim()).filter(Boolean);
    else if (a === '--refresh') opts.refresh = true;
    else if (a === '--help' || a === '-h') {
      console.log('Usage: node scripts/icons/fetch-icons.mjs [--cache <dir>] [--only aws,azure] [--refresh] [--out <dir>]');
      process.exit(0);
    } else throw new Error(`Unknown argument: ${a}`);
  }
  return opts;
}

// ----------------------------------------------------------------------------
// Generic helpers
// ----------------------------------------------------------------------------
const log = (...a) => console.log(...a);
const sha1 = (s) => crypto.createHash('sha1').update(s).digest('hex');
const isoDate = (d) => (d && !Number.isNaN(+new Date(d)) ? new Date(d).toISOString().slice(0, 10) : null);

function slugify(s) {
  return String(s)
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/([a-z0-9])([A-Z])(?=[a-z])/g, '$1 $2')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/** Replace separators with spaces without changing case. */
function spaced(s) {
  return String(s).replace(/[_]+/g, ' ').replace(/-/g, ' ').replace(/\s+/g, ' ').trim();
}

const WORD_CASE = {
  ai: 'AI', api: 'API', apis: 'APIs', aws: 'AWS', cdn: 'CDN', dns: 'DNS', vpn: 'VPN', nat: 'NAT', vpc: 'VPC',
  gke: 'GKE', gce: 'GCE', tpu: 'TPU', gpu: 'GPU', hsm: 'HSM', ekm: 'EKM', ids: 'IDS', iot: 'IoT', os: 'OS',
  ssd: 'SSD', nlp: 'NLP', sql: 'SQL', vm: 'VM', vms: 'VMs', ip: 'IP', cx: 'CX', qna: 'QnA', id: 'ID', ui: 'UI',
  vmware: 'VMware', automl: 'AutoML', bigquery: 'BigQuery', pubsub: 'Pub/Sub', beyondcorp: 'BeyondCorp',
  kuberun: 'KubeRun', tensorflow: 'TensorFlow', powershell: 'PowerShell', vertexai: 'Vertex AI', devops: 'DevOps',
  mongodb: 'MongoDB', mysql: 'MySQL', postgresql: 'PostgreSQL', db2: 'Db2', ibm: 'IBM', vsi: 'VSI', http: 'HTTP',
  https: 'HTTPS', ssl: 'SSL', tls: 'TLS', lb: 'LB', vlan: 'VLAN', san: 'SAN', nas: 'NAS', ha: 'HA', dr: 'DR',
  saas: 'SaaS', paas: 'PaaS', iaas: 'IaaS', k8s: 'K8s', wifi: 'Wi-Fi', ml: 'ML', ocr: 'OCR', sdk: 'SDK', cli: 'CLI',
  and: 'and', of: 'of', for: 'for', the: 'the', to: 'to', with: 'with', on: 'on', in: 'in',
};

/** Title-case a lowercase/kebab/snake identifier, fixing well-known acronyms. */
function titleCase(s) {
  const words = spaced(s).split(' ').filter(Boolean);
  return words
    .map((w, i) => {
      const lw = w.toLowerCase();
      if (WORD_CASE[lw] !== undefined && !(i === 0 && /^(and|of|for|the|to|with|on|in)$/.test(lw))) return WORD_CASE[lw];
      if (w !== lw) return w; // already has intentional casing
      return lw.charAt(0).toUpperCase() + lw.slice(1);
    })
    .join(' ');
}

const STOPWORDS = new Set(['and', 'the', 'of', 'for', 'to', 'with', 'on', 'in', 'a', 'an', 'icon', 'icons']);
function makeKeywords(...parts) {
  const out = [];
  const seen = new Set();
  for (const p of parts.flat()) {
    if (!p) continue;
    const raw = String(p);
    const tokens = raw
      .normalize('NFKD')
      .replace(/([a-z])([A-Z])/g, '$1 $2')
      .toLowerCase()
      .split(/[^\p{L}\p{N}]+/u);
    for (const t of tokens) {
      if (!t || (t.length < 2 && !/\p{Script=Han}/u.test(t)) || STOPWORDS.has(t) || seen.has(t)) continue;
      seen.add(t);
      out.push(t);
    }
  }
  return out;
}

const ENTITIES = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' };
function decodeEntities(s) {
  return String(s).replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, e) => {
    if (e[0] === '#') {
      const code = e[1].toLowerCase() === 'x' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10);
      return Number.isFinite(code) ? String.fromCodePoint(code) : m;
    }
    return ENTITIES[e.toLowerCase()] ?? m;
  });
}

async function mapPool(items, limit, fn) {
  const results = new Array(items.length);
  let next = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (next < items.length) {
      const i = next++;
      results[i] = await fn(items[i], i);
    }
  });
  await Promise.all(workers);
  return results;
}

/** Read entry modification dates from a zip's central directory (no decompression). */
function zipEntryDates(file) {
  const buf = fs.readFileSync(file);
  const dates = new Map();
  for (let i = buf.length - 22; i >= Math.max(0, buf.length - 65557); i--) {
    if (buf.readUInt32LE(i) !== 0x06054b50) continue; // end of central directory
    let p = buf.readUInt32LE(i + 16);
    const count = buf.readUInt16LE(i + 10);
    for (let n = 0; n < count && p + 46 <= buf.length && buf.readUInt32LE(p) === 0x02014b50; n++) {
      const time = buf.readUInt16LE(p + 12);
      const date = buf.readUInt16LE(p + 14);
      const nameLen = buf.readUInt16LE(p + 28);
      const name = buf.toString('utf8', p + 46, p + 46 + nameLen);
      let d = new Date(Date.UTC(1980 + (date >> 9), ((date >> 5) & 15) - 1, date & 31, time >> 11, (time >> 5) & 63));
      // prefer the "UT" extended timestamp extra field (0x5455) when present
      const extraStart = p + 46 + nameLen;
      const extraEnd = extraStart + buf.readUInt16LE(p + 30);
      for (let q = extraStart; q + 4 <= extraEnd; ) {
        const tag = buf.readUInt16LE(q);
        const size = buf.readUInt16LE(q + 2);
        if (tag === 0x5455 && size >= 5 && buf[q + 4] & 1) d = new Date(buf.readUInt32LE(q + 5) * 1000);
        q += 4 + size;
      }
      if (!name.endsWith('/') && !/(^|\/)(__MACOSX|\.)/.test(name)) dates.set(name, d);
      p += 46 + nameLen + buf.readUInt16LE(p + 30) + buf.readUInt16LE(p + 32);
    }
    break;
  }
  return dates;
}

function rmrf(p) {
  fs.rmSync(p, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
}

// ----------------------------------------------------------------------------
// Downloads (cached per provider under <cache>/<provider>/downloads)
// ----------------------------------------------------------------------------
class Ctx {
  constructor(providerId, opts) {
    this.id = providerId;
    this.opts = opts;
    this.dir = path.join(opts.cache, providerId);
    this.downloads = path.join(this.dir, 'downloads');
    this.extracted = path.join(this.dir, 'extracted');
    fs.mkdirSync(this.downloads, { recursive: true });
  }

  safeName(name) {
    return name.replace(/[^A-Za-z0-9._-]+/g, '_').slice(0, 150);
  }

  /** Download url to downloads/<name>; reuses an existing copy unless --refresh. Returns {file, meta}. */
  async download(url, name, { headers = {}, alwaysFresh = false } = {}) {
    const file = path.join(this.downloads, this.safeName(name));
    const metaFile = `${file}.meta.json`;
    if (!this.opts.refresh && !alwaysFresh && fs.existsSync(file) && fs.existsSync(metaFile)) {
      return { file, meta: JSON.parse(fs.readFileSync(metaFile, 'utf8')), cached: true };
    }
    const res = await fetch(url, {
      headers: { 'User-Agent': CONFIG.userAgent, ...headers },
      redirect: 'follow',
      signal: AbortSignal.timeout(10 * 60 * 1000),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText} for ${url}`);
    const buf = Buffer.from(await res.arrayBuffer());
    const meta = {
      url,
      finalUrl: res.url,
      lastModified: res.headers.get('last-modified'),
      etag: res.headers.get('etag'),
      contentType: res.headers.get('content-type'),
      bytes: buf.length,
      fetchedAt: new Date().toISOString(),
    };
    fs.writeFileSync(`${file}.part`, buf);
    fs.renameSync(`${file}.part`, file);
    fs.writeFileSync(metaFile, JSON.stringify(meta, null, 2));
    return { file, meta, cached: false };
  }

  /** Fetch JSON; falls back to the cached copy when the network call fails. */
  async json(url, name, { headers = {}, alwaysFresh = false } = {}) {
    try {
      const { file } = await this.download(url, name, { headers, alwaysFresh });
      return JSON.parse(fs.readFileSync(file, 'utf8'));
    } catch (err) {
      const file = path.join(this.downloads, this.safeName(name));
      if (fs.existsSync(file)) {
        log(`    ! ${err.message} — using cached ${name}`);
        return JSON.parse(fs.readFileSync(file, 'utf8'));
      }
      throw err;
    }
  }

  /**
   * Extract selected entries of an (untrusted) zip into a fresh directory.
   * Only entries accepted by `accept(name)` are decompressed; zip-slip is rejected.
   * Returns [{ name, abs }].
   */
  unzip(zipFile, subdir, accept) {
    const dest = path.join(this.extracted, subdir);
    rmrf(dest);
    fs.mkdirSync(dest, { recursive: true });
    const data = new Uint8Array(fs.readFileSync(zipFile));
    const entries = unzipSync(data, {
      filter: (f) =>
        !f.name.endsWith('/') &&
        !/(^|\/)(__MACOSX|\.)/.test(f.name) &&
        f.originalSize <= MAX_ENTRY_BYTES &&
        accept(f.name),
    });
    const out = [];
    for (const [name, bytes] of Object.entries(entries)) {
      const norm = name.replace(/\\/g, '/');
      const segs = norm.split('/');
      if (path.isAbsolute(norm) || /^[a-zA-Z]:/.test(norm) || segs.some((s) => s === '..' || s === '')) {
        log(`    ! skipping suspicious zip entry: ${name}`);
        continue;
      }
      const abs = path.join(dest, ...segs);
      if (!abs.startsWith(dest + path.sep)) continue;
      fs.mkdirSync(path.dirname(abs), { recursive: true });
      fs.writeFileSync(abs, bytes);
      out.push({ name: norm, abs });
    }
    out.sort((a, b) => a.name.localeCompare(b.name));
    return out;
  }

  // GitHub ------------------------------------------------------------------
  ghHeaders() {
    const h = { Accept: 'application/vnd.github+json' };
    if (process.env.GITHUB_TOKEN) h.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
    return h;
  }

  async ghCommit(repo, branch) {
    const j = await this.json(`https://api.github.com/repos/${repo}/commits/${branch}`, `gh-commit-${branch}.json`, {
      headers: this.ghHeaders(),
      alwaysFresh: true,
    });
    return { sha: j.sha, date: isoDate(j.commit?.committer?.date) };
  }

  async ghTree(repo, sha) {
    const j = await this.json(`https://api.github.com/repos/${repo}/git/trees/${sha}?recursive=1`, `gh-tree-${sha}.json`, {
      headers: this.ghHeaders(),
    });
    if (j.truncated) log('    ! GitHub tree listing truncated');
    return j.tree;
  }

  /** Download files at a commit into downloads/<sha>/...; returns [{ path, abs }]. */
  async ghFiles(repo, sha, paths) {
    const base = path.join(this.downloads, `files-${sha.slice(0, 12)}`);
    return mapPool(paths, 8, async (p) => {
      const segs = p.split('/');
      if (segs.some((s) => s === '..' || s === '')) throw new Error(`bad path ${p}`);
      const abs = path.join(base, ...segs);
      if (!fs.existsSync(abs) || this.opts.refresh) {
        const url = `https://raw.githubusercontent.com/${repo}/${sha}/${segs.map(encodeURIComponent).join('/')}`;
        const res = await fetch(url, { headers: { 'User-Agent': CONFIG.userAgent }, signal: AbortSignal.timeout(120000) });
        if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
        fs.mkdirSync(path.dirname(abs), { recursive: true });
        fs.writeFileSync(abs, Buffer.from(await res.arrayBuffer()));
      }
      return { path: p, abs };
    });
  }
}

// ----------------------------------------------------------------------------
// SVG sanitizing + optimization
// ----------------------------------------------------------------------------
const DANGEROUS_ELEMENTS = new Set([
  'script', 'foreignobject', 'iframe', 'object', 'embed', 'audio', 'video', 'canvas', 'handler', 'listener',
  'set', 'animate', 'animatemotion', 'animatetransform', 'animatecolor', 'discard',
]);

function isSafeRef(v) {
  const s = String(v).trim();
  return s.startsWith('#') || /^data:image\/(png|jpe?g|gif|webp);base64,[a-z0-9+/=\s]*$/i.test(s);
}

function hasExternalUrl(v) {
  for (const m of String(v).matchAll(/url\(\s*(['"]?)(.*?)\1\s*\)/gi)) {
    if (!m[2].trim().startsWith('#')) return true;
  }
  return false;
}

function cleanCss(css) {
  return String(css)
    .replace(/@import[^;]*;?/gi, '')
    .replace(/url\(\s*(['"]?)(.*?)\1\s*\)/gi, (m, q, u) => (u.trim().startsWith('#') ? m : 'none'))
    .replace(/expression\s*\(/gi, '(')
    .replace(/behavior\s*:/gi, 'x-behavior:');
}

function detach(node, parent) {
  if (parent && Array.isArray(parent.children)) parent.children = parent.children.filter((c) => c !== node);
}

const sanitizePlugin = {
  name: 'opendrawSanitize',
  fn: () => ({
    element: {
      enter(node, parent) {
        if (DANGEROUS_ELEMENTS.has(node.name.toLowerCase())) {
          detach(node, parent);
          return;
        }
        for (const [k, v] of Object.entries(node.attributes)) {
          const key = k.toLowerCase();
          if (key.startsWith('on') || key === 'xml:base') delete node.attributes[k];
          else if (key === 'href' || key.endsWith(':href')) {
            if (!isSafeRef(v)) delete node.attributes[k];
          } else if (key === 'style') node.attributes[k] = cleanCss(v);
          else if (/url\s*\(/i.test(v) && hasExternalUrl(v)) delete node.attributes[k];
          else if (/javascript:/i.test(v)) delete node.attributes[k];
        }
        if (node.name === 'style') {
          for (const c of node.children) if (c.type === 'text' || c.type === 'cdata') c.value = cleanCss(c.value);
        }
        if (node.name === 'a') {
          // unwrap links: keep the graphics, drop the anchor
          const idx = parent.children.indexOf(node);
          if (idx >= 0) parent.children.splice(idx, 1, ...node.children);
        }
      },
    },
  }),
};

function parseLength(v) {
  if (v === undefined || v === null) return NaN;
  const m = /^\s*([0-9]*\.?[0-9]+(?:e[-+]?\d+)?)\s*(px)?\s*$/i.exec(String(v));
  return m ? parseFloat(m[1]) : NaN;
}
const num = (n) => String(+Number(n).toFixed(3));

/** Ensures the root <svg> has a viewBox and explicit numeric width/height. */
function sizePlugin(state) {
  return {
    name: 'opendrawEnsureSize',
    fn: () => ({
      element: {
        enter(node, parent) {
          if (parent.type !== 'root' || node.name !== 'svg') return;
          const a = node.attributes;
          let vb = a.viewBox ? a.viewBox.trim().split(/[\s,]+/).map(Number) : null;
          if (vb && (vb.length !== 4 || vb.some((n) => !Number.isFinite(n)) || vb[2] <= 0 || vb[3] <= 0)) vb = null;
          const w = parseLength(a.width);
          const h = parseLength(a.height);
          if (!vb) {
            if (w > 0 && h > 0) vb = [0, 0, w, h];
            else {
              state.error = 'no viewBox and no numeric width/height';
              return;
            }
          }
          a.viewBox = vb.map(num).join(' ');
          if (!(w > 0 && h > 0)) {
            a.width = num(vb[2]);
            a.height = num(vb[3]);
          } else {
            a.width = num(w);
            a.height = num(h);
          }
          if (a.style) {
            const style = a.style
              .split(';')
              .filter((d) => d.trim() && !/^\s*(width|height|vertical-align)\s*:/i.test(d))
              .join(';');
            if (style) a.style = style;
            else delete a.style;
          }
          delete a.class;
          if (!a.xmlns) a.xmlns = 'http://www.w3.org/2000/svg';
        },
      },
    }),
  };
}

/**
 * Sanitize + optimize an SVG string. Returns the optimized string or null.
 * `idPrefix` prefixes ids/classes (used for SVGs that get embedded in another SVG).
 */
function optimizeSvg(input, { idPrefix, label = '' } = {}) {
  let src = Buffer.isBuffer(input) ? input.toString('utf8') : String(input);
  src = src.replace(/^﻿/, '');
  if (!/<svg[\s>]/i.test(src)) return null;
  try {
    if (idPrefix) {
      src = optimize(src, { multipass: false, plugins: [{ name: 'prefixIds', params: { prefix: idPrefix, delim: '-' } }] }).data;
    }
    const state = {};
    const out = optimize(src, {
      multipass: true,
      floatPrecision: 3,
      plugins: [
        // NOTE: removeViewBox is intentionally NOT used (it is not part of
        // preset-default in SVGO 4, and must stay disabled: the app relies on viewBox).
        'preset-default',
        'removeScripts',
        sanitizePlugin,
        sizePlugin(state),
      ],
    }).data;
    if (state.error) throw new Error(state.error);
    if (/<script|\son[a-z]+\s*=|javascript:|<foreignObject/i.test(out)) throw new Error('sanitization check failed');
    const root = /<svg\b[^>]*>/.exec(out)?.[0] ?? '';
    if (!/\bviewBox=/.test(root) || !/\bwidth=/.test(root) || !/\bheight=/.test(root)) throw new Error('missing viewBox/width/height');
    if (out.length > MAX_SVG_BYTES) throw new Error(`too large (${out.length} bytes)`);
    return out;
  } catch (err) {
    log(`    ! skipped ${label}: ${err.message}`);
    return null;
  }
}

// ----------------------------------------------------------------------------
// Icon set collector: dedupe, slugs, manifest
// ----------------------------------------------------------------------------
class IconSet {
  constructor(id) {
    this.id = id;
    this.icons = [];
    this.byHash = new Set();
    this.paths = new Set();
    this.skipped = 0;
    this.duplicates = 0;
  }

  /** Add an icon. `svg` is raw (unsanitized) markup. */
  add({ category, name, svg, keywords = [], slug }) {
    const label = `${category}/${name}`;
    const out = optimizeSvg(svg, { label });
    if (!out) {
      this.skipped++;
      return false;
    }
    const hash = sha1(out);
    if (this.byHash.has(hash)) {
      this.duplicates++;
      return false;
    }
    this.byHash.add(hash);
    const catSlug = slugify(category) || 'general';
    const base = slugify(slug ?? name) || `icon-${hash.slice(0, 8)}`;
    let s = base;
    for (let i = 2; this.paths.has(`${catSlug}/${s}`); i++) s = `${base}-${i}`;
    this.paths.add(`${catSlug}/${s}`);
    const file = `${catSlug}/${s}.svg`;
    this.icons.push({
      id: `${this.id}/${catSlug}/${s}`,
      name,
      category,
      file,
      keywords: makeKeywords(keywords, name, category),
      _svg: out,
    });
    return true;
  }

  /** Atomically (re)write public/icons/<provider>/. */
  write(outRoot, meta) {
    if (this.icons.length === 0) throw new Error('no icons produced');
    const coll = new Intl.Collator('en', { sensitivity: 'base', numeric: true });
    this.icons.sort((a, b) => coll.compare(a.category, b.category) || coll.compare(a.name, b.name) || coll.compare(a.id, b.id));
    const finalDir = path.join(outRoot, this.id);
    const tmpDir = path.join(outRoot, `.${this.id}.tmp`);
    rmrf(tmpDir);
    for (const icon of this.icons) {
      const abs = path.join(tmpDir, ...icon.file.split('/'));
      fs.mkdirSync(path.dirname(abs), { recursive: true });
      fs.writeFileSync(abs, icon._svg);
    }
    const index = {
      provider: this.id,
      name: meta.name,
      version: meta.version,
      source: meta.source,
      license: meta.license,
      icons: this.icons.map(({ _svg, ...rest }) => rest),
    };
    fs.writeFileSync(path.join(tmpDir, 'index.json'), `${JSON.stringify(index, null, 2)}\n`);
    // Hand-written descriptions are tracked in git and must survive a re-fetch.
    const descriptions = path.join(finalDir, 'descriptions.json');
    if (fs.existsSync(descriptions)) fs.copyFileSync(descriptions, path.join(tmpDir, 'descriptions.json'));
    rmrf(finalDir);
    try {
      fs.renameSync(tmpDir, finalDir);
    } catch {
      fs.cpSync(tmpDir, finalDir, { recursive: true });
      rmrf(tmpDir);
    }
    return index;
  }
}

// ----------------------------------------------------------------------------
// draw.io (mxGraph) → SVG renderer, used for Oracle's OCI draw.io library
// ----------------------------------------------------------------------------
/** Minimal XML parser for machine-generated, well-formed XML. */
function parseXml(src) {
  const root = { name: '#root', attrs: {}, children: [] };
  const stack = [root];
  const re =
    /<!--[\s\S]*?-->|<\?[\s\S]*?\?>|<!\[CDATA\[([\s\S]*?)\]\]>|<!DOCTYPE[^>]*>|<\/([^\s>]+)\s*>|<([^\s/>!?]+)((?:\s+[^\s=/>]+(?:\s*=\s*(?:"[^"]*"|'[^']*'))?)*)\s*(\/?)>|([^<]+)/g;
  let m;
  while ((m = re.exec(src))) {
    const top = stack[stack.length - 1];
    if (m[2]) {
      if (stack.length > 1) stack.pop();
    } else if (m[3]) {
      const attrs = {};
      for (const a of m[4].matchAll(/([^\s=]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g)) attrs[a[1]] = decodeEntities(a[2] ?? a[3]);
      const el = { name: m[3], attrs, children: [] };
      top.children.push(el);
      if (!m[5]) stack.push(el);
    } else if (m[6] !== undefined && m[6].trim()) top.children.push({ name: '#text', text: decodeEntities(m[6]) });
    else if (m[1] !== undefined) top.children.push({ name: '#text', text: m[1] });
  }
  return root;
}

function parseStyle(style = '') {
  const out = { _named: [] };
  for (const part of style.split(';')) {
    if (!part) continue;
    const i = part.indexOf('=');
    if (i < 0) out._named.push(part);
    else out[part.slice(0, i)] = part.slice(i + 1);
  }
  return out;
}

function decodeDrawioCompressed(s) {
  const raw = zlib.inflateRawSync(Buffer.from(s, 'base64')).toString('latin1');
  return decodeURIComponent(raw.replace(/%(?![0-9a-f]{2})/gi, '%25'));
}

const escAttr = (s) => String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
const colorOf = (v, dflt) => (v === undefined || v === 'default' || v === 'inherit' ? dflt : v === 'none' || v === '' ? 'none' : v);

function renderStencil(stencilXml, x, y, w, h, st) {
  const doc = parseXml(stencilXml);
  const shape = doc.children.find((n) => n.name === 'shape');
  if (!shape) return '';
  const w0 = Number(shape.attrs.w) || 100;
  const h0 = Number(shape.attrs.h) || 100;
  let sx = w / w0;
  let sy = h / h0;
  let dx = x;
  let dy = y;
  if (shape.attrs.aspect === 'fixed') {
    const s = Math.min(sx, sy);
    dx += (w - w0 * s) / 2;
    dy += (h - h0 * s) / 2;
    sx = sy = s;
  }
  const X = (v) => num(dx + Number(v) * sx);
  const Y = (v) => num(dy + Number(v) * sy);
  let state = { fill: st.fill, stroke: st.stroke, sw: st.sw, alpha: 1 };
  const saved = [];
  let d = [];
  const out = [];
  const emit = (fill, stroke) => {
    if (!d.length) return;
    const f = fill ? state.fill : 'none';
    const s = stroke ? state.stroke : 'none';
    if (f !== 'none' || s !== 'none') {
      out.push(
        `<path d="${d.join('')}" fill="${escAttr(f)}"${s !== 'none' ? ` stroke="${escAttr(s)}" stroke-width="${num(state.sw)}"` : ''}${
          state.alpha < 1 ? ` opacity="${num(state.alpha)}"` : ''
        }/>`,
      );
    }
    d = [];
  };
  const rectPath = (rx, ry, rw, rh) => `M${X(rx)} ${Y(ry)}H${X(+rx + +rw)}V${Y(+ry + +rh)}H${X(rx)}Z`;
  const ellipsePath = (ex, ey, ew, eh) => {
    const rxx = num((ew / 2) * sx);
    const ryy = num((eh / 2) * sy);
    const cy = Y(+ey + eh / 2);
    return `M${X(ex)} ${cy}A${rxx} ${ryy} 0 1 0 ${X(+ex + +ew)} ${cy}A${rxx} ${ryy} 0 1 0 ${X(ex)} ${cy}Z`;
  };
  const walk = (nodes) => {
    for (const n of nodes) {
      const a = n.attrs || {};
      switch (n.name) {
        case 'path':
          for (const c of n.children) {
            const p = c.attrs || {};
            if (c.name === 'move') d.push(`M${X(p.x)} ${Y(p.y)}`);
            else if (c.name === 'line') d.push(`L${X(p.x)} ${Y(p.y)}`);
            else if (c.name === 'quad') d.push(`Q${X(p.x1)} ${Y(p.y1)} ${X(p.x2)} ${Y(p.y2)}`);
            else if (c.name === 'curve') d.push(`C${X(p.x1)} ${Y(p.y1)} ${X(p.x2)} ${Y(p.y2)} ${X(p.x3)} ${Y(p.y3)}`);
            else if (c.name === 'arc')
              d.push(
                `A${num(p.rx * sx)} ${num(p.ry * sy)} ${num(p['x-axis-rotation'] || 0)} ${+p['large-arc-flag'] ? 1 : 0} ${+p['sweep-flag'] ? 1 : 0} ${X(p.x)} ${Y(p.y)}`,
              );
            else if (c.name === 'close') d.push('Z');
          }
          break;
        case 'rect':
        case 'roundrect':
          d.push(rectPath(a.x, a.y, a.w, a.h));
          break;
        case 'ellipse':
          d.push(ellipsePath(+a.x, +a.y, +a.w, +a.h));
          break;
        case 'fill':
          emit(true, false);
          break;
        case 'stroke':
          emit(false, true);
          break;
        case 'fillstroke':
          emit(true, true);
          break;
        case 'fillcolor':
          state.fill = colorOf(a.color, state.fill);
          break;
        case 'strokecolor':
          state.stroke = colorOf(a.color, state.stroke);
          break;
        case 'strokewidth':
          state.sw = (Number(a.width) || 1) * (a.fixed === '1' ? 1 : Math.min(sx, sy));
          break;
        case 'alpha':
          state.alpha = Number(a.alpha) || 1;
          break;
        case 'save':
          saved.push({ ...state });
          break;
        case 'restore':
          state = saved.pop() || state;
          break;
        default:
          break; // text, include-shape, dashed, linejoin, ... are ignored
      }
    }
  };
  for (const part of shape.children) if (part.name === 'background' || part.name === 'foreground') walk(part.children);
  return out.join('');
}

let embedCounter = 0;
function decodeDataImage(uri) {
  const m = /^data:image\/([a-z+]+)(;base64)?,(.*)$/is.exec(uri);
  if (!m) return null;
  const type = m[1].toLowerCase();
  let payload = m[3];
  const isB64 = !!m[2] || (type === 'svg+xml' && /^[A-Za-z0-9+/=\s]+$/.test(payload) && !payload.includes('<'));
  return { type, data: isB64 ? Buffer.from(payload, 'base64') : Buffer.from(decodeURIComponent(payload), 'utf8') };
}

/** Render a draw.io mxGraphModel (library entry) to an SVG string; text labels and edges are omitted. */
function renderDrawioModel(xml) {
  const doc = parseXml(xml);
  const model = doc.children.find((n) => n.name === 'mxGraphModel');
  const rootEl = model?.children.find((n) => n.name === 'root');
  if (!rootEl) return null;
  const cells = [];
  const byId = new Map();
  for (const el of rootEl.children) {
    let cellEl = el;
    let id = el.attrs?.id;
    if (el.name !== 'mxCell') {
      cellEl = el.children?.find((c) => c.name === 'mxCell');
      if (!cellEl) continue;
    } else id = el.attrs.id;
    const g = cellEl.children.find((c) => c.name === 'mxGeometry');
    const cell = {
      id,
      parent: cellEl.attrs.parent,
      vertex: cellEl.attrs.vertex === '1',
      style: parseStyle(cellEl.attrs.style),
      geo: g
        ? { x: +g.attrs.x || 0, y: +g.attrs.y || 0, w: +g.attrs.width || 0, h: +g.attrs.height || 0, relative: g.attrs.relative === '1' }
        : null,
    };
    cells.push(cell);
    byId.set(id, cell);
  }
  const origin = (cell) => {
    let x = 0;
    let y = 0;
    let p = byId.get(cell.parent);
    while (p && p.vertex && p.geo) {
      x += p.geo.x;
      y += p.geo.y;
      p = byId.get(p.parent);
    }
    return [x, y];
  };
  const parts = [];
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  const grow = (x, y, w, h, pad = 0) => {
    minX = Math.min(minX, x - pad);
    minY = Math.min(minY, y - pad);
    maxX = Math.max(maxX, x + w + pad);
    maxY = Math.max(maxY, y + h + pad);
  };
  for (const c of cells) {
    if (!c.vertex || !c.geo || c.geo.relative || c.geo.w <= 0 || c.geo.h <= 0) continue;
    const s = c.style;
    const named = s._named;
    if (named.includes('text') || named.includes('group') || s.text !== undefined) continue;
    const [ox, oy] = origin(c);
    const x = ox + c.geo.x;
    const y = oy + c.geo.y;
    const { w, h } = c.geo;
    const fill = colorOf(s.fillColor, '#FFFFFF');
    const stroke = colorOf(s.strokeColor, '#000000');
    const sw = Number(s.strokeWidth) || 1;
    const shape = s.shape || named.find((n) => /^(ellipse|rhombus|triangle|image)$/.test(n)) || 'rect';
    let svg = '';
    if (shape.startsWith('stencil(')) {
      const enc = shape.slice(8, shape.lastIndexOf(')'));
      svg = renderStencil(decodeDrawioCompressed(enc), x, y, w, h, { fill, stroke, sw });
    } else if (shape === 'image') {
      const img = s.image && decodeDataImage(s.image.replace(/^(data:image\/svg\+xml),(?=[A-Za-z0-9+/])/, '$1;base64,'));
      if (!img) continue;
      const par = s.imageAspect === '0' ? 'none' : 'xMidYMid meet';
      if (img.type === 'svg+xml') {
        const inner = optimizeSvg(img.data, { idPrefix: `e${++embedCounter}`, label: 'embedded image' });
        const m = inner && /^<svg\b([^>]*)>([\s\S]*)<\/svg>\s*$/.exec(inner);
        if (!m) continue;
        const vb = /viewBox="([^"]+)"/.exec(m[1])?.[1];
        svg = `<svg x="${num(x)}" y="${num(y)}" width="${num(w)}" height="${num(h)}" viewBox="${vb}" preserveAspectRatio="${par}">${m[2]}</svg>`;
      } else if (/^(png|jpe?g|gif|webp)$/.test(img.type)) {
        svg = `<image x="${num(x)}" y="${num(y)}" width="${num(w)}" height="${num(h)}" preserveAspectRatio="${par}" href="data:image/${img.type};base64,${img.data.toString('base64')}"/>`;
      }
    } else {
      const strokeAttrs =
        stroke !== 'none'
          ? ` stroke="${escAttr(stroke)}" stroke-width="${num(sw)}"${
              s.dashed === '1' ? ` stroke-dasharray="${(s.dashPattern || '3 3').split(/\s+/).map((v) => num(v * sw)).join(' ')}"` : ''
            }`
          : '';
      if (fill === 'none' && stroke === 'none') continue;
      const fillAttr = ` fill="${escAttr(fill)}"`;
      if (shape === 'ellipse') {
        svg = `<ellipse cx="${num(x + w / 2)}" cy="${num(y + h / 2)}" rx="${num(w / 2)}" ry="${num(h / 2)}"${fillAttr}${strokeAttrs}/>`;
      } else if (shape === 'trapezoid') {
        const k = w * (Number(s.size) || 0.2);
        svg = `<path d="M${num(x)} ${num(y + h)}L${num(x + k)} ${num(y)}L${num(x + w - k)} ${num(y)}L${num(x + w)} ${num(y + h)}Z"${fillAttr}${strokeAttrs}/>`;
      } else if (shape === 'manualInput') {
        const k = Math.min(h, Number(s.size) || 30);
        svg = `<path d="M${num(x)} ${num(y + k)}L${num(x + w)} ${num(y)}L${num(x + w)} ${num(y + h)}L${num(x)} ${num(y + h)}Z"${fillAttr}${strokeAttrs}/>`;
      } else if (shape === 'partialRectangle') {
        const segs = [];
        if (s.top !== '0') segs.push(`M${num(x)} ${num(y)}H${num(x + w)}`);
        if (s.right !== '0') segs.push(`M${num(x + w)} ${num(y)}V${num(y + h)}`);
        if (s.bottom !== '0') segs.push(`M${num(x)} ${num(y + h)}H${num(x + w)}`);
        if (s.left !== '0') segs.push(`M${num(x)} ${num(y)}V${num(y + h)}`);
        svg = `${fill !== 'none' ? `<rect x="${num(x)}" y="${num(y)}" width="${num(w)}" height="${num(h)}"${fillAttr}/>` : ''}${
          segs.length && stroke !== 'none' ? `<path d="${segs.join('')}" fill="none"${strokeAttrs}/>` : ''
        }`;
      } else if (shape === 'rect' || shape === 'rectangle' || shape === 'label') {
        const r = s.rounded === '1' ? (Math.min(w, h) * (Number(s.arcSize) || 15)) / 100 : 0;
        svg = `<rect x="${num(x)}" y="${num(y)}" width="${num(w)}" height="${num(h)}"${r ? ` rx="${num(r)}"` : ''}${fillAttr}${strokeAttrs}/>`;
      } else continue;
    }
    if (!svg) continue;
    const opacity = s.opacity !== undefined ? Number(s.opacity) / 100 : 1;
    const rot = Number(s.rotation) || 0;
    const attrs = `${opacity < 1 ? ` opacity="${num(opacity)}"` : ''}${rot ? ` transform="rotate(${num(rot)} ${num(x + w / 2)} ${num(y + h / 2)})"` : ''}`;
    parts.push(attrs ? `<g${attrs}>${svg}</g>` : svg);
    grow(x, y, w, h, stroke !== 'none' ? sw / 2 : 0);
  }
  if (!parts.length || !Number.isFinite(minX)) return null;
  const vw = maxX - minX;
  const vh = maxY - minY;
  return `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${num(vw)}" height="${num(vh)}" viewBox="${num(minX)} ${num(minY)} ${num(vw)} ${num(vh)}">${parts.join('')}</svg>`;
}

// ----------------------------------------------------------------------------
// Providers
// ----------------------------------------------------------------------------
const AWS_CATEGORY = {
  'Internet-of-Things': 'Internet of Things',
  IoT: 'Internet of Things',
  'Management-Tools': 'Management & Governance',
  'Management-Governance': 'Management & Governance',
  'Security-Identity': 'Security, Identity & Compliance',
  'Networking-Content-Delivery': 'Networking & Content Delivery',
  'Front-End-Web-Mobile': 'Front-End Web & Mobile',
  'Migration-Modernization': 'Migration & Modernization',
  'Application-Integration': 'Application Integration',
  'Cloud-Financial-Management': 'Cloud Financial Management',
  'End-User-Computing': 'End User Computing',
};
const awsCategory = (raw) => AWS_CATEGORY[raw] ?? spaced(raw);

async function buildAws(ctx, set) {
  const cfg = CONFIG.providers.aws;
  const { file } = await ctx.download(cfg.packageUrl, 'aws-icon-package.zip');
  const entries = ctx.unzip(file, 'package', (n) => /\.svg$/i.test(n));
  const dm = /_(\d{2})(\d{2})(\d{4})[._]/.exec(cfg.packageUrl);
  const version = dm ? `${dm[3]}-${dm[1]}-${dm[2]}` : 'unknown';

  // 1) Service icons: Architecture-Service-Icons_*/Arch_<Cat>/<size>/Arch_<Name>_<size>.svg — prefer 48px.
  const services = new Map();
  const PREF = { 48: 0, 64: 1, 32: 2, 16: 3 };
  for (const e of entries) {
    const m = /^Architecture-Service-Icons[^/]*\/Arch_([^/]+)\/(\d+)\/Arch_(.+?)_(\d+)\.svg$/i.exec(e.name);
    if (!m) continue;
    const key = `${m[1]}|${m[3]}`;
    const rank = PREF[m[2]] ?? 9;
    const cur = services.get(key);
    if (!cur || rank < cur.rank) services.set(key, { rank, cat: m[1], name: m[3], abs: e.abs });
  }
  for (const s of services.values()) {
    const name = spaced(s.name);
    set.add({ category: awsCategory(s.cat), name, svg: fs.readFileSync(s.abs), keywords: ['service'] });
  }

  // 2) Resource icons: Resource-Icons_*/Res_<Cat>/[Res_48_Light/]Res_<Name>_48[_Light].svg (skip _Dark).
  for (const e of entries) {
    const m = /^Resource-Icons[^/]*\/Res_([^/]+)\/(?:[^/]+\/)?Res_(.+?)_48(?:_(Light|Dark))?\.svg$/i.exec(e.name);
    if (!m || m[3] === 'Dark') continue;
    set.add({ category: awsCategory(m[1]), name: spaced(m[2]), svg: fs.readFileSync(e.abs), keywords: ['resource'] });
  }

  // 3) Group icons: Architecture-Group-Icons_*/<Name>_32[_Dark].svg (skip _Dark when a default exists).
  const groups = entries.filter((e) => /^Architecture-Group-Icons[^/]*\/[^/]+\.svg$/i.test(e.name));
  const groupNames = new Set(groups.map((e) => path.basename(e.name)));
  for (const e of groups) {
    const base = path.basename(e.name);
    const m = /^(.+?)_\d+(_Dark)?\.svg$/i.exec(base);
    if (!m) continue;
    if (m[2] && groupNames.has(base.replace(/_Dark\.svg$/i, '.svg'))) continue;
    set.add({ category: 'Groups', name: spaced(m[1]) + (m[2] ? ' (Dark)' : ''), svg: fs.readFileSync(e.abs), keywords: ['group', 'container'] });
  }

  // 4) Category icons: Category-Icons_*/Arch-Category_64/Arch-Category_<Name>_64.svg (largest size).
  for (const e of entries) {
    const m = /^Category-Icons[^/]*\/Arch-Category_64\/Arch-Category_(.+?)_64\.svg$/i.exec(e.name);
    if (!m) continue;
    set.add({ category: 'Categories', name: awsCategory(m[1]), svg: fs.readFileSync(e.abs), keywords: ['category'] });
  }
  return { version, source: cfg.packageUrl };
}

const AZURE_LAST = ['other', 'new icons'];
async function buildAzure(ctx, set) {
  const cfg = CONFIG.providers.azure;
  const { file, meta } = await ctx.download(cfg.packageUrl, 'azure-icons.zip');
  const entries = ctx.unzip(file, 'package', (n) => /\.svg$/i.test(n));
  const items = [];
  for (const e of entries) {
    const m = /(?:^|\/)Icons\/([^/]+)\/([^/]+)\.svg$/i.exec(e.name);
    if (!m) continue;
    const name = spaced(m[2].replace(/^\d+-icon-service-/i, ''));
    items.push({ folder: m[1], name, abs: e.abs });
  }
  // keep the most specific category when the same icon appears in several folders
  items.sort(
    (a, b) =>
      (AZURE_LAST.indexOf(a.folder.toLowerCase()) - AZURE_LAST.indexOf(b.folder.toLowerCase())) ||
      a.folder.localeCompare(b.folder) ||
      a.name.localeCompare(b.name),
  );
  for (const it of items) {
    set.add({ category: titleCase(it.folder), name: it.name, svg: fs.readFileSync(it.abs), keywords: ['azure'] });
  }
  const v = /_V(\d+)\.zip$/i.exec(cfg.packageUrl);
  return { version: `V${v ? v[1] : '?'}${meta.lastModified ? ` (${isoDate(meta.lastModified)})` : ''}`, source: cfg.packageUrl };
}

async function buildGcp(ctx, set) {
  const cfg = CONFIG.providers.gcp;
  const dates = [];
  const ok = [];
  for (const pkg of cfg.packages) {
    try {
      const { file, meta } = await ctx.download(pkg.url, `gcp-${pkg.key}.zip`);
      if (meta.lastModified) dates.push(new Date(meta.lastModified));
      else for (const d of zipEntryDates(file).values()) dates.push(d);
      const entries = ctx.unzip(file, pkg.key, (n) => /\.svg$/i.test(n));
      for (const e of entries) {
        let m;
        if (pkg.key === 'core' && (m = /(?:^|\/)Unique Icons\/([^/]+)\/SVG\/[^/]+\.svg$/i.exec(e.name))) {
          set.add({ category: 'Core Products', name: m[1], svg: fs.readFileSync(e.abs), keywords: ['google', 'gcp'] });
        } else if (pkg.key === 'category' && (m = /(?:^|\/)Category Icons\/([^/]+)\/SVG\/[^/]+\.svg$/i.exec(e.name))) {
          set.add({ category: 'Product Categories', name: m[1].replace(/\s+_\s+/g, ' & '), svg: fs.readFileSync(e.abs), keywords: ['google', 'gcp', 'category'] });
        } else if (pkg.key === 'legacy' && (m = /^([^/]+)\/\1\.svg$/i.exec(e.name))) {
          set.add({ category: 'Products', name: titleCase(m[1]), svg: fs.readFileSync(e.abs), keywords: ['google', 'gcp'] });
        }
      }
      ok.push(pkg.url);
    } catch (err) {
      log(`    ! GCP package "${pkg.key}" failed: ${err.message}`);
    }
  }
  if (!ok.length) throw new Error('all Google Cloud packages failed');
  const latest = dates.length ? isoDate(new Date(Math.max(...dates))) : null;
  return { version: latest ?? 'unknown', source: ok.join(' ') };
}

async function buildOci(ctx, set) {
  const cfg = CONFIG.providers.oci;
  const { file, meta } = await ctx.download(cfg.packageUrl, 'oci-drawio.zip');
  const entries = ctx.unzip(file, 'package', (n) => path.posix.basename(n) === cfg.libraryEntry);
  if (!entries.length) throw new Error(`"${cfg.libraryEntry}" not found in ${cfg.packageUrl}`);
  const text = fs.readFileSync(entries[0].abs, 'utf8');
  const json = text.trim().replace(/^<mxlibrary>/, '').replace(/<\/mxlibrary>$/, '');
  const lib = JSON.parse(json);
  for (const entry of lib) {
    const title = decodeEntities(decodeEntities(entry.title || '')).replace(/\s+/g, ' ').trim();
    if (!title) continue;
    // split on " - " separators only (keep hyphenated names like "E-Business Suite", "ADB-D")
    const parts = title.split(/\s+-\s*|\s*-\s+/).filter(Boolean);
    let category;
    let name;
    if (/^(Logical|Physical)$/i.test(parts[0])) {
      // keep only grouping/component shapes; skip connectors, templates, examples, canvases
      if (!/^(Grouping|Components)$/i.test(parts[1] || '')) continue;
      category = `${parts[0]} ${parts[1]}`;
      name = parts.slice(2).join(' - ') || parts[1];
    } else {
      category = parts.length > 1 ? parts[0] : 'General';
      name = parts.length > 1 ? parts.slice(1).join(' - ') : parts[0];
    }
    let xml = entry.xml || '';
    try {
      if (!xml.trim().startsWith('<')) xml = decodeDrawioCompressed(xml);
    } catch (err) {
      log(`    ! cannot decode ${title}: ${err.message}`);
      set.skipped++;
      continue;
    }
    const svg = renderDrawioModel(xml);
    if (!svg) {
      log(`    ! nothing to render for ${title}`);
      set.skipped++;
      continue;
    }
    set.add({ category, name, svg, keywords: ['oracle', 'oci'] });
  }
  const libDate = [...zipEntryDates(file)].find(([n]) => path.posix.basename(n) === cfg.libraryEntry)?.[1];
  return {
    version: `${cfg.libraryEntry} ${isoDate(libDate) ?? ''}${meta.lastModified ? ` (package ${isoDate(meta.lastModified)})` : ''}`.replace(/\s+/g, ' '),
    source: cfg.packageUrl,
  };
}

async function buildAlibaba(ctx, set) {
  const cfg = CONFIG.providers.alibaba;
  const seenCodes = new Set();
  let latest = null;
  for (const coll of cfg.collections) {
    const j = await ctx.json(`${cfg.apiBase}${coll.id}`, `collection-${coll.id}.json`);
    if (j.code !== 200 || !j.data?.icons) throw new Error(`unexpected iconfont response for collection ${coll.id}`);
    const upd = j.data.collection?.updated_at;
    if (upd && (!latest || upd > latest)) latest = upd;
    for (const icon of j.data.icons) {
      const raw = String(icon.name || '').replace(/\s+/g, ' ').trim();
      const tokens = raw.split(' ');
      const code = tokens.find((t) => /^[A-Za-z][A-Za-z0-9_.-]*$/.test(t));
      if (!code) continue; // unnamed artboard copies ("1备份 17", ...)
      const lc = code.toLowerCase();
      if (seenCodes.has(lc)) continue;
      seenCodes.add(lc);
      const rest = tokens.filter((t) => t !== code).join(' ').trim();
      const name = !rest ? code.toUpperCase() : rest.toLowerCase() === lc ? rest : `${code.toUpperCase()} ${rest}`;
      set.add({ category: coll.category, name, slug: lc.replace(/_/g, '-'), svg: icon.show_svg || '', keywords: [code, rest, 'alibaba', 'aliyun'] });
    }
  }
  return { version: latest ? `${isoDate(latest)} (iconfont collections updated)` : 'unknown', source: cfg.page };
}

const IBM_CATEGORY = { 'DevOps/Network': 'Networking', 'Extra Storage': 'Data & Storage', 'Extra Storage 2': 'Data & Storage' };
async function buildIbm(ctx, set) {
  const cfg = CONFIG.providers.ibm;
  const { sha, date } = await ctx.ghCommit(cfg.repo, cfg.branch);
  const tree = await ctx.ghTree(cfg.repo, sha);
  const paths = tree
    .filter((t) => t.type === 'blob' && t.path.startsWith(cfg.dir) && /\.svg$/i.test(t.path) && !/Sketch Files\//i.test(t.path))
    .map((t) => t.path);
  // canonical folders first so duplicates resolve to them
  const rank = (p) => (/\/(DevOps\/Network|Extra Storage[^/]*)\//.test(p) ? 1 : 0);
  paths.sort((a, b) => rank(a) - rank(b) || a.localeCompare(b));
  const files = await ctx.ghFiles(cfg.repo, sha, paths);
  for (const f of files) {
    const rel = f.path.slice(cfg.dir.length);
    const dir = path.posix.dirname(rel);
    const base = path.posix.basename(rel, path.posix.extname(rel)).replace(/\s*\(\d+\)$/, '');
    const category = IBM_CATEGORY[dir] ?? dir;
    const name = /--|^[a-z0-9-]+$/.test(base) ? titleCase(base.replace(/--/g, ' ')) : base.replace(/\s+/g, ' ').trim();
    set.add({ category, name, svg: fs.readFileSync(f.abs), keywords: ['ibm'] });
  }
  return { version: `${cfg.branch}@${sha.slice(0, 7)}${date ? ` (${date})` : ''}`, source: `https://github.com/${cfg.repo}/tree/${sha}/${cfg.dir}` };
}

const K8S_NAMES = {
  api: 'API Server', 'c-c-m': 'Cloud Controller Manager', 'c-m': 'Controller Manager', 'k-proxy': 'Kube Proxy',
  kubelet: 'Kubelet', sched: 'Scheduler', 'control-plane': 'Control Plane', etcd: 'etcd', node: 'Node',
  'c-role': 'ClusterRole', cm: 'ConfigMap', crb: 'ClusterRoleBinding', crd: 'CustomResourceDefinition',
  cronjob: 'CronJob', deploy: 'Deployment', ds: 'DaemonSet', ep: 'Endpoints', group: 'Group',
  hpa: 'HorizontalPodAutoscaler', ing: 'Ingress', job: 'Job', limits: 'LimitRange', netpol: 'NetworkPolicy',
  ns: 'Namespace', pod: 'Pod', psp: 'PodSecurityPolicy', pv: 'PersistentVolume', pvc: 'PersistentVolumeClaim',
  quota: 'ResourceQuota', rb: 'RoleBinding', role: 'Role', rs: 'ReplicaSet', sa: 'ServiceAccount',
  sc: 'StorageClass', secret: 'Secret', sts: 'StatefulSet', svc: 'Service', user: 'User', vol: 'Volume',
};
async function buildKubernetes(ctx, set) {
  const cfg = CONFIG.providers.kubernetes;
  const { sha, date } = await ctx.ghCommit(cfg.repo, cfg.branch);
  const tree = await ctx.ghTree(cfg.repo, sha);
  // icons/svg/<group>/(labeled|unlabeled)/<abbr>.svg — prefer unlabeled (the app draws its own labels)
  const pick = new Map();
  for (const t of tree) {
    if (t.type !== 'blob' || !t.path.startsWith(cfg.dir)) continue;
    const m = /^([^/]+)\/(labeled|unlabeled)\/([^/]+)\.svg$/i.exec(t.path.slice(cfg.dir.length));
    if (!m) continue;
    const key = `${m[1]}/${m[3]}`;
    const cur = pick.get(key);
    if (!cur || (cur.variant === 'labeled' && m[2] === 'unlabeled')) pick.set(key, { group: m[1], variant: m[2], abbr: m[3], path: t.path });
  }
  const items = [...pick.values()].sort((a, b) => a.path.localeCompare(b.path));
  const files = await ctx.ghFiles(cfg.repo, sha, items.map((i) => i.path));
  items.forEach((it, i) => {
    const name = K8S_NAMES[it.abbr] ?? titleCase(it.abbr);
    set.add({
      category: titleCase(it.group),
      name,
      slug: name.replace(/([a-z])([A-Z])/g, '$1 $2'),
      svg: fs.readFileSync(files[i].abs),
      keywords: [it.abbr, name.toLowerCase(), 'kubernetes', 'k8s'],
    });
  });
  return { version: `${cfg.branch}@${sha.slice(0, 7)}${date ? ` (${date})` : ''}`, source: `https://github.com/${cfg.repo}/tree/${sha}/${cfg.dir}` };
}

async function buildLogos(_ctx, set) {
  const cfg = CONFIG.providers.logos;
  const iconsPath = require.resolve(`${cfg.npmPackage}/icons.json`);
  const pkg = JSON.parse(fs.readFileSync(path.join(path.dirname(iconsPath), 'package.json'), 'utf8'));
  const data = JSON.parse(fs.readFileSync(iconsPath, 'utf8'));
  for (const [key, icon] of Object.entries(data.icons).sort(([a], [b]) => a.localeCompare(b))) {
    if (icon.hidden) continue;
    const w = icon.width ?? data.width ?? 16;
    const h = icon.height ?? data.height ?? 16;
    const left = icon.left ?? data.left ?? 0;
    const top = icon.top ?? data.top ?? 0;
    let body = icon.body;
    const tf = [];
    if (icon.hFlip) tf.push(`translate(${2 * left + w} 0) scale(-1 1)`);
    if (icon.vFlip) tf.push(`translate(0 ${2 * top + h}) scale(1 -1)`);
    if (icon.rotate) {
      log(`    ! skipped logos/${key}: rotated icons not supported`);
      set.skipped++;
      continue;
    }
    if (tf.length) body = `<g transform="${tf.join(' ')}">${body}</g>`;
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${w}" height="${h}" viewBox="${left} ${top} ${w} ${h}">${body}</svg>`;
    const isIcon = /(^|-)icon(-|$)/.test(key);
    const baseName = key.replace(/(^|-)icon(?=-|$)/, '').replace(/^-|-$/g, '') || key;
    set.add({
      category: isIcon ? 'Icons' : 'Wordmarks',
      name: titleCase(baseName),
      slug: baseName,
      svg,
      keywords: [key, 'logo', 'brand'],
    });
  }
  return {
    version: `${cfg.npmPackage}@${pkg.version}${data.lastModified ? ` (${isoDate(data.lastModified * 1000)})` : ''}`,
    source: `https://github.com/gilbarbara/logos (via npm ${cfg.npmPackage})`,
  };
}

const BUILDERS = {
  aws: buildAws,
  azure: buildAzure,
  gcp: buildGcp,
  oci: buildOci,
  alibaba: buildAlibaba,
  ibm: buildIbm,
  kubernetes: buildKubernetes,
  logos: buildLogos,
};

// ----------------------------------------------------------------------------
// Aggregate files
// ----------------------------------------------------------------------------
function readIndex(outRoot, id) {
  const p = path.join(outRoot, id, 'index.json');
  if (!fs.existsSync(p)) return null;
  try {
    return JSON.parse(fs.readFileSync(p, 'utf8'));
  } catch {
    return null;
  }
}

function writeAggregates(outRoot) {
  const coll = new Intl.Collator('en', { sensitivity: 'base', numeric: true });
  const providers = [];
  const indexes = {};
  for (const id of CONFIG.order) {
    const idx = readIndex(outRoot, id);
    if (!idx) continue;
    indexes[id] = idx;
    const categories = [...new Set(idx.icons.map((i) => i.category))].sort(coll.compare);
    providers.push({ id, name: idx.name, count: idx.icons.length, categories });
  }
  fs.writeFileSync(path.join(outRoot, 'providers.json'), `${JSON.stringify(providers, null, 2)}\n`);

  const lines = [
    '# Icon licenses',
    '',
    '> **These icons are NOT covered by the OpenDraw MIT license.** They are third-party assets, and the',
    '> product names, logos and icons are trademarks of their respective owners. They are included solely so',
    '> users can draw architecture diagrams, under each vendor\'s own terms summarised below. Using an icon',
    '> does not imply endorsement by its owner.',
    '>',
    '> Generated by `scripts/icons/fetch-icons.mjs` (`npm run icons:fetch`). SVGs were sanitized and',
    '> optimized with SVGO (no visual changes intended); OCI SVGs were rendered from Oracle\'s draw.io library.',
    '',
  ];
  for (const id of CONFIG.order) {
    const idx = indexes[id];
    const cfg = CONFIG.providers[id];
    if (!idx) continue;
    lines.push(`## ${idx.name} (\`${id}\`)`, '');
    lines.push(`- Icons: ${idx.icons.length}`);
    lines.push(`- Version: ${idx.version}`);
    lines.push(`- Source: ${idx.source}`);
    lines.push(`- Vendor page: ${cfg.page}`);
    lines.push(`- Summary: ${idx.license}`, '');
    for (const t of cfg.terms) lines.push(t, '');
  }
  fs.writeFileSync(path.join(outRoot, 'LICENSES.md'), `${lines.join('\n').trimEnd()}\n`);
  return providers;
}

function dirSize(p) {
  let total = 0;
  for (const e of fs.readdirSync(p, { withFileTypes: true })) {
    const abs = path.join(p, e.name);
    total += e.isDirectory() ? dirSize(abs) : fs.statSync(abs).size;
  }
  return total;
}

// ----------------------------------------------------------------------------
// Main
// ----------------------------------------------------------------------------
async function main() {
  const opts = parseArgs(process.argv.slice(2));
  fs.mkdirSync(opts.out, { recursive: true });
  fs.mkdirSync(opts.cache, { recursive: true });
  log(`Icon cache: ${opts.cache}`);
  log(`Output:     ${opts.out}`);
  const ids = opts.only ?? CONFIG.order;
  const results = [];
  for (const id of ids) {
    if (!BUILDERS[id]) {
      log(`\n[${id}] unknown provider — skipped`);
      continue;
    }
    const cfg = CONFIG.providers[id];
    log(`\n[${id}] ${cfg.name}`);
    const t0 = Date.now();
    try {
      const ctx = new Ctx(id, opts);
      const set = new IconSet(id);
      const meta = await BUILDERS[id](ctx, set);
      const index = set.write(opts.out, { name: cfg.name, license: cfg.license, ...meta });
      log(`    ✓ ${index.icons.length} icons (${set.duplicates} duplicates dropped, ${set.skipped} skipped) in ${((Date.now() - t0) / 1000).toFixed(1)}s`);
      results.push({ id, ok: true, count: index.icons.length });
    } catch (err) {
      log(`    ✗ ${id} failed: ${err.message}`);
      if (process.env.DEBUG) console.error(err);
      results.push({ id, ok: false, error: err.message });
    }
  }
  const providers = writeAggregates(opts.out);
  const size = dirSize(opts.out);
  log('\nSummary');
  for (const p of providers) log(`  ${p.id.padEnd(11)} ${String(p.count).padStart(5)} icons, ${p.categories.length} categories`);
  const failed = results.filter((r) => !r.ok);
  for (const f of failed) log(`  FAILED ${f.id}: ${f.error}`);
  log(`  total size: ${(size / 1024 / 1024).toFixed(2)} MB`);
  if (failed.length === results.length && results.length) process.exitCode = 1;
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
