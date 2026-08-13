const fs = require('fs');
const path = require('path');
const { cleanText } = require('./text');
const { cleanImage, isImageExtension } = require('./image');

const DEFAULT_IGNORES = [
  'node_modules',
  '.git',
  'dist',
  'build',
  '.next',
  'vendor',
  'coverage',
  '.cache',
  '.DS_Store'
];

const TEXT_EXTENSIONS = new Set([
  '.js', '.jsx', '.ts', '.tsx', '.mjs', '.cjs',
  '.py', '.pyw',
  '.swift', '.m', '.mm', '.h', '.hpp', '.c', '.cpp', '.cc',
  '.java', '.kt', '.kts', '.rs', '.go', '.rb', '.sh', '.bash',
  '.html', '.htm', '.css', '.scss', '.less',
  '.json', '.yaml', '.yml', '.xml', '.plist', '.md', '.txt',
  '.sql', '.toml', '.graphql', '.env', '.gitignore', '.watermarkrc'
]);

function isTextExtension(ext) {
  if (!ext) return false;
  return TEXT_EXTENSIONS.has(ext.toLowerCase());
}

function parseIgnoreFile(filePath) {
  if (!fs.existsSync(filePath)) return [];
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    return content
      .split(/\r?\n/)
      .map(line => line.trim())
      .filter(line => line && !line.startsWith('#'));
  } catch (err) {
    return [];
  }
}

function shouldIgnore(fileName, relativePath, customIgnores = []) {
  const allIgnores = [...DEFAULT_IGNORES, ...customIgnores];
  return allIgnores.some(pattern => {
    if (pattern === fileName) return true;
    if (relativePath.includes(pattern)) return true;
    if (pattern.startsWith('*') && fileName.endsWith(pattern.slice(1))) return true;
    return false;
  });
}

async function runConcurrentPool(items, concurrency, fn) {
  const results = [];
  const pool = new Set();

  for (const item of items) {
    const promise = Promise.resolve().then(() => fn(item));
    results.push(promise);
    pool.add(promise);

    const clean = () => pool.delete(promise);
    promise.then(clean, clean);

    if (pool.size >= concurrency) {
      await Promise.race(pool);
    }
  }

  return Promise.all(results);
}

function collectFiles(targetPath, baseDir, options = {}, fileList = []) {
  const absPath = path.resolve(targetPath);
  if (!fs.existsSync(absPath)) return fileList;

  const stat = fs.statSync(absPath);
  const relPath = path.relative(baseDir, absPath) || path.basename(absPath);

  if (stat.isDirectory()) {
    const dirName = path.basename(absPath);
    if (shouldIgnore(dirName, relPath, options.ignore || [])) {
      return fileList;
    }

    const localGitIgnore = parseIgnoreFile(path.join(absPath, '.gitignore'));
    const localWmIgnore = parseIgnoreFile(path.join(absPath, '.watermarkignore'));
    const combinedIgnores = [...(options.ignore || []), ...localGitIgnore, ...localWmIgnore];
    const childOptions = { ...options, ignore: combinedIgnores };

    const entries = fs.readdirSync(absPath);
    for (const entry of entries) {
      collectFiles(path.join(absPath, entry), baseDir, childOptions, fileList);
    }
  } else if (stat.isFile()) {
    const fileName = path.basename(absPath);
    if (!shouldIgnore(fileName, relPath, options.ignore || [])) {
      fileList.push({ absPath, relPath, baseDir });
    }
  }

  return fileList;
}

async function processFile(fileItem, options = {}) {
  const { absPath, relPath } = fileItem;
  const ext = path.extname(absPath).toLowerCase();
  const isImage = isImageExtension(ext);
  const isText = isTextExtension(ext);

  const fileResult = {
    filePath: absPath,
    relPath,
    isImage,
    isText,
    changed: false,
    zeroWidthCount: 0,
    bidiCount: 0,
    tokenCount: 0,
    commentCount: 0,
    bytesSaved: 0,
    error: null
  };

  if (options.textOnly && !isText) return fileResult;
  if (options.imageOnly && !isImage) return fileResult;
  if (!isImage && !isText) return fileResult; // Skip non-text non-image binary formats like PDF, ZIP, DYLIB

  try {
    if (isImage) {
      const inputBuf = fs.readFileSync(absPath);
      const imgRes = await cleanImage(inputBuf, { ...options, ext });
      fileResult.changed = imgRes.stats.changed;
      fileResult.bytesSaved = imgRes.stats.bytesSaved;

      if (imgRes.stats.changed && !options.dryRun && !options.check) {
        let destPath = absPath;
        if (options.outDir) {
          destPath = path.join(options.outDir, relPath);
          fs.mkdirSync(path.dirname(destPath), { recursive: true });
        }
        fs.writeFileSync(destPath, imgRes.buffer);
      }
    } else if (isText) {
      const content = fs.readFileSync(absPath, 'utf8');
      const textRes = cleanText(content, { ...options, ext });

      fileResult.changed = textRes.stats.changed;
      fileResult.zeroWidthCount = textRes.stats.zeroWidthCount;
      fileResult.bidiCount = textRes.stats.bidiCount;
      fileResult.tokenCount = textRes.stats.tokenCount;
      fileResult.commentCount = textRes.stats.commentCount;

      if (textRes.stats.changed && !options.dryRun && !options.check) {
        let destPath = absPath;
        if (options.outDir) {
          destPath = path.join(options.outDir, relPath);
          fs.mkdirSync(path.dirname(destPath), { recursive: true });
        }
        fs.writeFileSync(destPath, textRes.text, 'utf8');
      }
    }
  } catch (err) {
    fileResult.error = err.message;
  }

  return fileResult;
}

async function cleanDirectory(targetPaths, options = {}) {
  const targets = Array.isArray(targetPaths) ? targetPaths : [targetPaths];
  const allFiles = [];

  for (const target of targets) {
    const baseDir = fs.existsSync(target) && fs.statSync(target).isDirectory()
      ? path.resolve(target)
      : path.dirname(path.resolve(target));
    collectFiles(target, baseDir, options, allFiles);
  }

  const concurrency = options.concurrency || 16;
  const fileResults = await runConcurrentPool(allFiles, concurrency, item => processFile(item, options));

  const summary = {
    totalFiles: fileResults.length,
    changedFiles: 0,
    totalZeroWidth: 0,
    totalBidi: 0,
    totalTokens: 0,
    totalComments: 0,
    totalBytesSaved: 0,
    errors: [],
    details: fileResults
  };

  for (const res of fileResults) {
    if (res.changed) summary.changedFiles++;
    summary.totalZeroWidth += res.zeroWidthCount;
    summary.totalBidi += res.bidiCount;
    summary.totalTokens += res.tokenCount;
    summary.totalComments += res.commentCount;
    summary.totalBytesSaved += res.bytesSaved;
    if (res.error) summary.errors.push({ file: res.relPath, error: res.error });
  }

  return summary;
}

module.exports = {
  cleanDirectory,
  collectFiles,
  processFile,
  parseIgnoreFile,
  shouldIgnore,
  isTextExtension
};
