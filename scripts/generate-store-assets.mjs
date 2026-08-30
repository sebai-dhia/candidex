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
// Light field so the purple icon plate reads as an icon. Do not use #4f46e5 —
// that is the logo tile color, so the squircle vanishes into the canvas.
const PROMO_BG = '#f4f6fa';

const ICON_OUTPUTS = [
  path.join(root, 'public', 'icon-16.png'),
  path.join(root, 'public', 'icon-48.png'),
  path.join(root, 'public', 'icon-128.png'),
];

const SCREENSHOTS = [
  { source: 'ai-capture-01-select.png', out: 'screenshot-1.png', position: 'centre' },
  { source: 'ai-capture-02-process.png', out: 'screenshot-2.png', position: 'centre' },
  { source: 'ai-capture-03-review.png', out: 'screenshot-3.png', position: 'centre' },
  { source: 'ai-capture-04-saved.png', out: 'screenshot-4.png', position: 'centre' },
  { source: 'manual_fill.png', out: 'screenshot-5.png', position: 'north' },
];

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
  console.log('Store assets already present (use --force to regenerate):');
  for (const file of existing) {
    console.log(`  - ${path.relative(root, file)}`);
  }
  process.exit(0);
}

/**
 * Chrome Web Store: JPEG or 24-bit PNG with no alpha.
 * @param {import('sharp').Sharp} image
 * @param {string} output
 */
async function writeStorePng(image, output) {
  await image.flatten({ background: '#ffffff' }).removeAlpha().png({ compressionLevel: 9 }).toFile(output);
}

assertSourceExists(LOGO);

const screenshotOutputs = SCREENSHOTS.map((shot) => path.join(STORE_ASSETS, shot.out));
const promoOutput = path.join(STORE_ASSETS, 'promo-small-440x280.png');
const marqueeOutput = path.join(STORE_ASSETS, 'promo-marquee-1400x560.png');

guardExisting([...ICON_OUTPUTS, ...screenshotOutputs, promoOutput, marqueeOutput]);

fs.mkdirSync(STORE_ASSETS, { recursive: true });

const artwork = await sharp(LOGO).trim().toBuffer();

await sharp(artwork)
  .resize(96, 96, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
  .extend({
    top: 16,
    bottom: 16,
    left: 16,
    right: 16,
    background: { r: 0, g: 0, b: 0, alpha: 0 },
  })
  .png()
  .toFile(path.join(root, 'public', 'icon-128.png'));

for (const size of [16, 48]) {
  await sharp(artwork)
    .resize(size, size, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toFile(path.join(root, 'public', `icon-${size}.png`));
}

for (const shot of SCREENSHOTS) {
  const source = path.join(root, 'landing', 'images', shot.source);
  assertSourceExists(source);
  await writeStorePng(
    sharp(source).resize(1280, 800, { fit: 'cover', position: shot.position }),
    path.join(STORE_ASSETS, shot.out),
  );
}

const logoForPromo = await sharp(artwork)
  .resize(160, 160, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
  .toBuffer();

await sharp({
  create: { width: 440, height: 280, channels: 3, background: PROMO_BG },
})
  .composite([{ input: logoForPromo, gravity: 'center' }])
  .flatten({ background: PROMO_BG })
  .removeAlpha()
  .png()
  .toFile(promoOutput);

const logoForMarquee = await sharp(artwork)
  .resize(280, 280, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
  .toBuffer();

await sharp({
  create: { width: 1400, height: 560, channels: 3, background: PROMO_BG },
})
  .composite([{ input: logoForMarquee, gravity: 'center' }])
  .flatten({ background: PROMO_BG })
  .removeAlpha()
  .png()
  .toFile(marqueeOutput);

console.log('Generated store assets:');
for (const file of [...ICON_OUTPUTS, ...screenshotOutputs, promoOutput, marqueeOutput]) {
  console.log(`  ${path.relative(root, file)}`);
}
