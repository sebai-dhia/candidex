const AdmZip = require('adm-zip');
const path = require('path');

const sourceDir = path.join(__dirname, '../dist/candidex/browser');
const outputFile = path.join(__dirname, '../candidex.zip');

try {
  const zip = new AdmZip();
  zip.addLocalFolder(sourceDir);
  zip.writeZip(outputFile);
  console.log(`✅ Successfully created ${outputFile}`);
} catch (e) {
  console.error('❌ Failed to create zip file:', e);
  process.exit(1);
}
