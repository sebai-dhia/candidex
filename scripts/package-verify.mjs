/**
 * Verifies dist/candidex/browser contains required extension package files.
 * Run after `npm run build`.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const distDir = path.resolve(__dirname, '..', 'dist', 'candidex', 'browser');

const REQUIRED = [
  'manifest.json',
  'background.js',
  'content.js',
  'index.html',
  'main.js',
  'icon-128.png',
  'styles.css',
];
const NON_EMPTY = ['background.js', 'content.js', 'main.js'];

if (!fs.existsSync(distDir)) {
  console.error(`Missing dist directory: ${distDir}`);
  console.error('Run `npm run build` first.');
  process.exit(1);
}

/** @type {string[]} */
const missing = [];

/** @type {string[]} */
const empty = [];

for (const file of REQUIRED) {
  const full = path.join(distDir, file);
  if (!fs.existsSync(full) || !fs.statSync(full).isFile()) {
    missing.push(file);
    continue;
  }
  if (NON_EMPTY.includes(file) && fs.statSync(full).size === 0) {
    empty.push(file);
  }
}

const manifestPath = path.join(distDir, 'manifest.json');
if (fs.existsSync(manifestPath)) {
  try {
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    const icons = manifest.icons ?? {};
    for (const iconFile of Object.values(icons)) {
      if (typeof iconFile !== 'string') continue;
      const iconPath = path.join(distDir, iconFile);
      if (!fs.existsSync(iconPath) || !fs.statSync(iconPath).isFile()) {
        missing.push(`manifest icon: ${iconFile}`);
      }
    }
  } catch (error) {
    console.error('Failed to parse manifest.json:', error);
    process.exit(1);
  }
}

if (missing.length > 0 || empty.length > 0) {
  console.error(`package:verify failed under ${distDir}:`);
  for (const file of missing) {
    console.error(`  missing: ${file}`);
  }
  for (const file of empty) {
    console.error(`  empty: ${file}`);
  }
  process.exit(1);
}

console.log(`package:verify OK — ${REQUIRED.length} required files present in dist/candidex/browser`);
process.exit(0);