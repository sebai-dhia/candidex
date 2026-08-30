import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const srcRoot = path.resolve(__dirname, '..');

const SOURCE_EXT = /\.(ts|js|mjs|tsx|jsx)$/;
const SKIP_DIRS = new Set(['node_modules', 'dist', '.angular']);

/**
 * @param {string} dir
 * @returns {string[]}
 */
function listSourceFiles(dir) {
  /** @type {string[]} */
  const out = [];
  if (!fs.existsSync(dir)) return out;

  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (SKIP_DIRS.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...listSourceFiles(full));
      continue;
    }
    if (SOURCE_EXT.test(entry.name)) out.push(full);
  }
  return out;
}

/**
 * Collect static import/export/require/dynamic-import module specifiers.
 * @param {string} source
 * @returns {string[]}
 */
function collectModuleSpecifiers(source) {
  /** @type {string[]} */
  const specs = [];
  const patterns = [
    /\bfrom\s+['"]([^'"]+)['"]/g,
    /\bimport\s*\(\s*['"]([^'"]+)['"]\s*\)/g,
    /\bimport\s+['"]([^'"]+)['"]/g,
    /\bexport\s+\*\s+from\s+['"]([^'"]+)['"]/g,
    /\brequire\s*\(\s*['"]([^'"]+)['"]\s*\)/g,
  ];
  for (const pattern of patterns) {
    let match;
    while ((match = pattern.exec(source))) {
      specs.push(match[1]);
    }
  }
  return specs;
}

/**
 * Resolve a relative import to an absolute path under src (best-effort).
 * @param {string} fromFile
 * @param {string} specifier
 */
function resolveUnderSrc(fromFile, specifier) {
  if (!specifier.startsWith('.')) return null;
  const base = path.resolve(path.dirname(fromFile), specifier);
  const candidates = [
    base,
    `${base}.ts`,
    `${base}.js`,
    `${base}.mjs`,
    path.join(base, 'index.ts'),
    path.join(base, 'index.js')
  ];
  for (const candidate of candidates) {
    if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
      return path.normalize(candidate);
    }
  }
  return path.normalize(base);
}

/**
 * @param {string} absolutePath
 */
function toSrcRelative(absolutePath) {
  return path.relative(srcRoot, absolutePath).split(path.sep).join('/');
}

describe('import boundaries', () => {
  it('forbids src/app from importing src/extension', () => {
    const appFiles = listSourceFiles(path.join(srcRoot, 'app'));
    /** @type {string[]} */
    const violations = [];

    for (const file of appFiles) {
      const source = fs.readFileSync(file, 'utf8');
      for (const spec of collectModuleSpecifiers(source)) {
        const resolved = resolveUnderSrc(file, spec);
        if (!resolved) continue;
        const rel = toSrcRelative(resolved);
        if (rel.startsWith('extension/') || rel.includes('/extension/')) {
          violations.push(`${toSrcRelative(file)} → ${spec}`);
        }
        // Also catch path segments that clearly target extension even if unresolved
        if (
          /\/extension\//.test(spec) ||
          spec.includes('extension/shared') ||
          spec.includes('extension/background') ||
          spec.includes('extension/content')
        ) {
          violations.push(`${toSrcRelative(file)} → ${spec}`);
        }
      }
    }

    expect(violations, violations.join('\n')).toEqual([]);
  });

  it('forbids content from importing extension/background', () => {
    const contentFiles = listSourceFiles(path.join(srcRoot, 'extension', 'content'));
    /** @type {string[]} */
    const violations = [];

    for (const file of contentFiles) {
      const fileRel = toSrcRelative(file);
      const source = fs.readFileSync(file, 'utf8');
      for (const spec of collectModuleSpecifiers(source)) {
        const resolved = resolveUnderSrc(file, spec);
        const rel = resolved ? toSrcRelative(resolved) : '';
        if (rel.startsWith('extension/background/') || /(?:^|\/)\.\.\/background\//.test(spec)) {
          violations.push(`${fileRel} → ${spec}`);
        }
      }
    }

    expect(violations, violations.join('\n')).toEqual([]);
  });

  it('forbids domain and contracts from importing Angular or Chrome infrastructure', () => {
    const roots = [path.join(srcRoot, 'domain'), path.join(srcRoot, 'contracts')];
    /** @type {string[]} */
    const violations = [];
    const forbidden = [
      /@angular\//,
      /from ['"]chrome['"]/,
      /\bchrome\./,
      /app\/infrastructure/,
      /app\/core\/services/,
      /app\/features/
    ];

    for (const root of roots) {
      for (const file of listSourceFiles(root)) {
        const source = fs.readFileSync(file, 'utf8');
        // Skip chrome. API mentions in comments? Still forbid real imports of Angular.
        for (const spec of collectModuleSpecifiers(source)) {
          if (forbidden.some((re) => re.test(spec))) {
            violations.push(`${toSrcRelative(file)} → ${spec}`);
          }
        }
        if (/from ['"]@angular\//.test(source) || /require\(['"]@angular\//.test(source)) {
          violations.push(`${toSrcRelative(file)} imports @angular`);
        }
      }
    }

    expect(violations, violations.join('\n')).toEqual([]);
  });
});