/**
 * Generate store icons (into public/) and listing screenshots/promo (into store-assets/).
 * Never modifies source files: public/candidex_logo.png or landing/images/**.
 *
 * Usage: node scripts/generate-store-assets.mjs [--force]
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');

const force = process.argv.includes('--force');
const LOGO = path.join(root, 'public', 'candidex_logo.png');
const STORE_ASSETS = path.join(root, 'store-assets');
const BRAND = '#4f46e5';

const ICON_OUTPUTS = [
  path.join(root, 'public', 'icon-16.png'),
  path.join(root, 'public', 'icon-48.png'),
  path.join(root, 'public', 'icon-128.png')
];

const SCREENSHOT_NAMES = ['01-select', '02-process', '03-review', '04-saved'];

/** @param {string} file */
function assertSourceExists(file) {
  if (!fs.existsSync(file)) {
    console.error(`Missing source file: ${file}`);
    process.exit(1);
  }
}

/** @param {string[]} outputs */
function guardExisting(outputs) {
  const existing = outputs.filter((f) => fs.existsSync(f));
  if (existing.length === 0) return;
  if (force) return;
  console.error('Output already exists (use --force to overwrite):');
  for (const file of existing) {
    console.error(`  - ${path.relative(root, file)}`);
  }
  process.exit(1);
}

assertSourceExists(LOGO);

const screenshotOutputs = SCREENSHOT_NAMES.map((name, i) =>
  path.join(STORE_ASSETS, `screenshot-${i + 1}.png`),
);
const promoOutput = path.join(STORE_ASSETS, 'promo-small-440x280.png');

guardExisting([...ICON_OUTPUTS, ...screenshotOutputs, promoOutput]);

fs.mkdirSync(STORE_ASSETS, { recursive: true });

const artwork = await sharp(LOGO).trim().toBuffer();

await sharp(artwork)
  .resize(96, 96, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
  .extend({
    top: 16,
    bottom: 16,
    left: 16,
    right: 16,
    background: { r: 0, g: 0, b: 0, alpha: 0 }
  })
  .png()
  .toFile(path.join(root, 'public', 'icon-128.png'));

for (const size of [16, 48]) {
  await sharp(artwork)
    .resize(size, size, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toFile(path.join(root, 'public', `icon-${size}.png`));
}

for (const [i, name] of SCREENSHOT_NAMES.entries()) {
  const source = path.join(root, 'landing', 'images', `ai-capture-${name}.png`);
  assertSourceExists(source);
  await sharp(source)
    .resize(1280, 800, { fit: 'cover', position: 'center' })
    .png()
    .toFile(screenshotOutputs[i]);
}

const logoForPromo = await sharp(artwork)
  .resize(160, 160, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
  .toBuffer();

await sharp({
  create: { width: 440, height: 280, channels: 3, background: BRAND },
})
  .composite([{ input: logoForPromo, gravity: 'center' }])
  .flatten({ background: BRAND })
  .png()
  .toFile(promoOutput);

console.log('Generated store assets:');
for (const file of [...ICON_OUTPUTS, ...screenshotOutputs, promoOutput]) {
  console.log(`  ${path.relative(root, file)}`);
}