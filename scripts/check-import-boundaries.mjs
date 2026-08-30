/**
 * Fails if src/app/** statically imports from src/extension/**.
 * Exit 0 when clean.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const appRoot = path.join(root, 'src', 'app');

const SOURCE_EXT = /\.(ts|js|mjs|tsx|jsx)$/;
const SKIP_DIRS = new Set(['node_modules', 'dist', '.angular']);

const SPECIFIER_PATTERNS = [
  /\bfrom\s+['"]([^'"]+)['"]/g,
  /\bimport\s*\(\s*['"]([^'"]+)['"]\s*\)/g,
  /\bimport\s+['"]([^'"]+)['"]/g,
  /\bexport\s+\*\s+from\s+['"]([^'"]+)['"]/g,
  /\brequire\s*\(\s*['"]([^'"]+)['"]\s*\)/g,
];

/** @param {string} dir @returns {string[]} */
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

/** @param {string} source @returns {string[]} */
function collectModuleSpecifiers(source) {
  /** @type {string[]} */
  const specs = [];
  for (const pattern of SPECIFIER_PATTERNS) {
    pattern.lastIndex = 0;
    let match;
    while ((match = pattern.exec(source))) {
      specs.push(match[1]);
    }
  }
  return specs;
}

/**
 * @param {string} fromFile
 * @param {string} specifier
 * @returns {string | null}
 */
function resolveRelative(fromFile, specifier) {
  if (!specifier.startsWith('.')) return null;
  const base = path.resolve(path.dirname(fromFile), specifier);
  const candidates = [
    base,
    `${base}.ts`,
    `${base}.js`,
    `${base}.mjs`,
    path.join(base, 'index.ts'),
    path.join(base, 'index.js'),
  ];
  for (const candidate of candidates) {
    if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
      return path.normalize(candidate);
    }
  }
  return path.normalize(base);
}

/** @param {string} absolutePath */
function toRepoRelative(absolutePath) {
  return path.relative(root, absolutePath).split(path.sep).join('/');
}

/** @param {string} absolutePath */
function isUnderExtension(absolutePath) {
  const rel = path.relative(path.join(root, 'src'), absolutePath).split(path.sep).join('/');
  return rel === 'extension' || rel.startsWith('extension/');
}

/** @param {string} specifier */
function looksLikeExtensionImport(specifier) {
  return (
    /(?:^|\/)extension\//.test(specifier) ||
    specifier.includes('extension/shared') ||
    specifier.includes('extension/background') ||
    specifier.includes('extension/content')
  );
}

const violations = [];
const appFiles = listSourceFiles(appRoot);

for (const file of appFiles) {
  const source = fs.readFileSync(file, 'utf8');
  for (const spec of collectModuleSpecifiers(source)) {
    const resolved = resolveRelative(file, spec);
    if (resolved && isUnderExtension(resolved)) {
      violations.push(`${toRepoRelative(file)} → ${spec}`);
      continue;
    }
    if (looksLikeExtensionImport(spec)) {
      violations.push(`${toRepoRelative(file)} → ${spec}`);
    }
  }
}

if (violations.length > 0) {
  console.error('Import boundary violations (src/app must not import src/extension):\n');
  for (const v of violations) {
    console.error(`  ${v}`);
  }
  process.exit(1);
}

console.log('Import boundaries OK (src/app ↛ src/extension)');
process.exit(0);
