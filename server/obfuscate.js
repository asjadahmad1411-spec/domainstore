const fs = require('fs');
const path = require('path');
const JavaScriptObfuscator = require('javascript-obfuscator');

const SRC_DIR = path.join(__dirname, '../src-js');
const DEST_DIR = path.join(__dirname, '../public/js');

function ensureDirectoryExistence(filePath) {
  const dirname = path.dirname(filePath);
  if (fs.existsSync(dirname)) {
    return true;
  }
  ensureDirectoryExistence(dirname);
  fs.mkdirSync(dirname);
}

function walk(dir, callback) {
  fs.readdirSync(dir).forEach(file => {
    const filepath = path.join(dir, file);
    const stat = fs.statSync(filepath);
    if (stat.isDirectory()) {
      walk(filepath, callback);
    } else if (stat.isFile() && file.endsWith('.js')) {
      callback(filepath);
    }
  });
}

console.log('🔒 Starting JavaScript obfuscation...');

try {
  walk(SRC_DIR, (filePath) => {
    const relativePath = path.relative(SRC_DIR, filePath);
    const destPath = path.join(DEST_DIR, relativePath);

    console.log(`Processing: ${relativePath}`);

    const code = fs.readFileSync(filePath, 'utf8');

    // Safe and highly secure obfuscation options
    const obfuscationResult = JavaScriptObfuscator.obfuscate(code, {
      compact: true,
      controlFlowFlattening: false, // Turn off flow flattening to avoid high CPU load/browser sluggishness
      deadCodeInjection: false,
      debugProtection: false,
      disableConsoleOutput: false,
      identifierNamesGenerator: 'hexadecimal',
      log: false,
      numbersToExpressions: true,
      renameGlobals: false, // Crucial: false to not break global functions/variables referenced across scripts
      selfDefending: false,
      simplify: true,
      splitStrings: true,
      splitStringsChunkLength: 10,
      stringArray: true,
      stringArrayCallsTransform: true,
      stringArrayEncoding: ['base64'],
      stringArrayThreshold: 0.8
    });

    ensureDirectoryExistence(destPath);
    fs.writeFileSync(destPath, obfuscationResult.getObfuscatedCode(), 'utf8');
  });

  console.log('✅ JavaScript obfuscation completed successfully!');
} catch (err) {
  console.error('❌ Error during JavaScript obfuscation:', err);
  process.exit(1);
}
