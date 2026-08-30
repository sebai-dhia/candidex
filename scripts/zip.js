const AdmZip = require('adm-zip');
const fs = require('fs');
const path = require('path');
const sourceDir = path.join(__dirname, '../dist/candidex/browser');
const outputFile = path.join(__dirname, '../candidex.zip');
const oauthPath = path.join(__dirname, '../.generated/oauth-clients.json');
const CLIENT_ID_RE = /^[0-9]+-[a-z0-9]+\.apps\.googleusercontent\.com$/i;

function isValidClientId(value) {
  return typeof value === 'string' && CLIENT_ID_RE.test(value.trim());
}

try {
  if (!fs.existsSync(oauthPath)) {
    throw new Error('Missing .generated/oauth-clients.json. Run `npm run package` from a clean tree.');
  }

  const oauth = JSON.parse(fs.readFileSync(oauthPath, 'utf8'));
  if (!isValidClientId(oauth.chrome) || !isValidClientId(oauth.webFlow)) {
    throw new Error(
      'Store ZIP requires valid OAuth client IDs. Copy .env.example to .env, set CANDIDEX_CHROME_OAUTH_CLIENT_ID and CANDIDEX_WEB_FLOW_OAUTH_CLIENT_ID, then run `npm run package` again.'
    );
  }

  const manifestPath = path.join(sourceDir, 'manifest.json');
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  if (manifest?.oauth2?.client_id !== oauth.chrome) {
    throw new Error('dist/manifest.json OAuth client ID does not match .env. Rebuild with `npm run package`.');
  }

  const mainJs = fs.readFileSync(path.join(sourceDir, 'main.js'), 'utf8');
  if (!mainJs.includes(oauth.webFlow)) {
    throw new Error('Built main.js is missing the web-flow OAuth client ID. Rebuild with `npm run package`.');
  }

  // CWS rejects "key" on first upload. Keep it in src/ for unpacked ID stability.
  const storeManifest = { ...manifest };
  delete storeManifest.key;

  const zip = new AdmZip();
  zip.addLocalFolder(sourceDir);
  zip.updateFile('manifest.json', Buffer.from(`${JSON.stringify(storeManifest, null, 2)}\n`));
  zip.writeZip(outputFile);

  const packed = JSON.parse(new AdmZip(outputFile).readAsText('manifest.json'));
  if (Object.prototype.hasOwnProperty.call(packed, 'key')) {
    throw new Error('Store ZIP still contains manifest.key; CWS will reject the upload.');
  }

  console.log(`✅ Successfully created ${outputFile}`);
} catch (e) {
  console.error('❌ Failed to create zip file:', e.message || e);
  process.exit(1);
}