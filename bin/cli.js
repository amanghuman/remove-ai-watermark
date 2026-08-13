#!/usr/bin/env node

const path = require('path');
const { cleanDirectory, loadConfig, initProject, initCI } = require('../lib');
const pkg = require('../package.json');

const args = process.argv.slice(2);

if (args.includes('-h') || args.includes('--help')) {
  console.log(`
remove-ai-watermark v${pkg.version}
Sanitize images, text documents, and codebases by stripping EXIF/C2PA metadata, zero-width unicode, Bidi control characters, LLM prompt tokens, and steganography signals.

Usage:
  npx remove-ai-watermark [options] [files/directories...]
  npx remove-ai-watermark init [--ci]

Commands:
  init                     Initialize .watermarkrc config and git pre-commit hook
  init --ci                Generate GitHub Actions CI verification workflow

Options:
  -i, --in-place           Overwrite files in place
  -o, --out-dir <dir>      Write cleaned files to destination directory
  --dry-run                Preview changes without writing to disk
  --check                  Audit mode (exits with code 1 if watermarks are found)
  --crop-corner <corner>   Crop corner stamp (bottom-right, bottom-left, top-right, top-left)
  --text-only              Clean text/code files only
  --image-only             Clean image files only
  --concurrency <N>        Set concurrent processing batch limit (default: 16)
  -v, --verbose            Print detailed file-by-file log
  -h, --help               Display help information
  --version                Display version number
`);
  process.exit(0);
}

if (args.includes('--version')) {
  console.log(`v${pkg.version}`);
  process.exit(0);
}

if (args[0] === 'init') {
  if (args.includes('--ci')) {
    const ciRes = initCI();
    console.log(`Created GitHub Action workflow: ${ciRes.workflowPath}`);
  } else {
    const res = initProject();
    console.log(`Initialized .watermarkrc in ${res.root}`);
    if (res.hookCreated) {
      console.log('Installed git pre-commit hook in .git/hooks/pre-commit');
    }
  }
  process.exit(0);
}

const flags = {
  inPlace: false,
  outDir: null,
  dryRun: false,
  check: false,
  cropCorner: null,
  textOnly: false,
  imageOnly: false,
  concurrency: 16,
  verbose: false,
  targets: []
};

for (let i = 0; i < args.length; i++) {
  const arg = args[i];
  if (arg === '-i' || arg === '--in-place') {
    flags.inPlace = true;
  } else if (arg === '-o' || arg === '--out-dir') {
    flags.outDir = args[++i];
  } else if (arg === '--dry-run') {
    flags.dryRun = true;
  } else if (arg === '--check') {
    flags.check = true;
  } else if (arg === '--crop-corner') {
    flags.cropCorner = args[++i];
  } else if (arg === '--text-only') {
    flags.textOnly = true;
  } else if (arg === '--image-only') {
    flags.imageOnly = true;
  } else if (arg === '--concurrency') {
    flags.concurrency = parseInt(args[++i], 10) || 16;
  } else if (arg === '-v' || arg === '--verbose') {
    flags.verbose = true;
  } else if (!arg.startsWith('-')) {
    flags.targets.push(arg);
  }
}

if (flags.targets.length === 0) {
  flags.targets.push('.');
}

async function runCLI() {
  const config = loadConfig(process.cwd(), flags);
  const summary = await cleanDirectory(flags.targets, { ...config, ...flags });

  if (flags.verbose) {
    for (const res of summary.details) {
      if (res.changed) {
        console.log(`[CLEANED] ${res.relPath} (zero-width: ${res.zeroWidthCount}, bidi: ${res.bidiCount}, tokens: ${res.tokenCount}, bytes: ${res.bytesSaved})`);
      }
    }
  }

  console.log(`
Sanitization Summary:
--------------------
Total Files Scanned: ${summary.totalFiles}
Files Modified/Flagged: ${summary.changedFiles}
Zero-Width Characters Removed: ${summary.totalZeroWidth}
Bidi Override Controls Removed: ${summary.totalBidi}
LLM Prompt Tokens Removed: ${summary.totalTokens}
AI Attribution Comments Removed: ${summary.totalComments}
Image Metadata Bytes Freed: ${summary.totalBytesSaved} bytes
`);

  if (flags.check && summary.changedFiles > 0) {
    console.error(`ERROR: Found ${summary.changedFiles} files with AI watermarks or hidden unicode artifacts.`);
    process.exit(1);
  }
}

runCLI().catch(err => {
  console.error(`Execution error: ${err.message}`);
  process.exit(1);
});
