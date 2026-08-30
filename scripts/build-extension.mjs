import * as esbuild from 'esbuild';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const extensionRoot = path.join(root, 'src', 'extension');
/** Generated extension bundles only — not static assets. */
const generatedDir = path.join(root, '.generated', 'extension');
const distDir = path.join(root, 'dist', 'candidex', 'browser');
const watch = process.argv.includes('--watch');
// Dev when watching or NODE_ENV=development. Production package build stays quiet.
const isDev = watch || process.env.NODE_ENV === 'development';
// Sourcemaps: watch/dev only. Default production build ships without maps.
const sourcemap = isDev;

const SCRIPT_FILES = [
  'background.js',
  'content.js',
  'background.js.map',
  'content.js.map',
];

const commonOptions = {
  bundle: true,
  sourcemap,
  // Gates candidexDevLog / extraction-logger info behind isCandidexDev().
  define: {
    __CANDIDEX_DEV__: isDev ? 'true' : 'false',
  },
  target: ['chrome109'],
  logLevel: 'info',
};

function createBuildOptions(entryRelativePath, outfileName, format, outDir) {
  return {
    ...commonOptions,
    entryPoints: [path.join(extensionRoot, entryRelativePath)],
    outfile: path.join(outDir, outfileName),
    format,
  };
}

function copyBuiltScripts(fromDir, toDir) {
  if (!fs.existsSync(toDir)) return;

  for (const file of SCRIPT_FILES) {
    const source = path.join(fromDir, file);
    if (fs.existsSync(source)) {
      fs.copyFileSync(source, path.join(toDir, file));
    }
  }
}

/** Remove stale generated JS that may still sit under public/ from older builds. */
function removeLegacyPublicBundles() {
  const publicDir = path.join(root, 'public');
  for (const file of SCRIPT_FILES) {
    const legacy = path.join(publicDir, file);
    if (fs.existsSync(legacy)) {
      fs.unlinkSync(legacy);
    }
  }
}

/** esbuild plugin: mirror generated scripts into dist after every rebuild. */
function mirrorToDistPlugin() {
  return {
    name: 'mirror-to-dist',
    setup(build) {
      build.onEnd((result) => {
        if (result.errors.length > 0) return;
        copyBuiltScripts(generatedDir, distDir);
      });
    },
  };
}

async function buildExtension() {
  fs.mkdirSync(generatedDir, { recursive: true });
  removeLegacyPublicBundles();

  const builds = [
    createBuildOptions('background/index.js', 'background.js', 'esm', generatedDir),
    createBuildOptions('content/index.js', 'content.js', 'iife', generatedDir),
  ];

  if (watch) {
    const withMirror = builds.map((options) => ({
      ...options,
      plugins: [...(options.plugins || []), mirrorToDistPlugin()],
    }));
    const contexts = await Promise.all(withMirror.map((options) => esbuild.context(options)));
    await Promise.all(contexts.map((context) => context.watch()));
    console.log(
      'Watching extension files → .generated/extension/ (mirrored to dist on every rebuild)'
    );
    return;
  }

  await Promise.all(builds.map((options) => esbuild.build(options)));
  copyBuiltScripts(generatedDir, distDir);
  console.log(
    `Extension scripts built to .generated/extension/${sourcemap ? ' (with sourcemaps)' : ' (no sourcemaps)'}`
  );
}

buildExtension().catch((error) => {
  console.error(error);
  process.exit(1);
});