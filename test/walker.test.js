const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { cleanDirectory, shouldIgnore, parseIgnoreFile } = require('../lib/walker');

test('shouldIgnore - identifies default ignored folders', () => {
  assert.equal(shouldIgnore('node_modules', 'node_modules'), true);
  assert.equal(shouldIgnore('.git', '.git'), true);
  assert.equal(shouldIgnore('src', 'src'), false);
});

test('parseIgnoreFile - parses ignore patterns', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'wm-ign-'));
  const ignPath = path.join(tmpDir, '.gitignore');
  fs.writeFileSync(ignPath, '# Comment\n*.log\ntmp_folder/\n');

  const patterns = parseIgnoreFile(ignPath);
  assert.deepEqual(patterns, ['*.log', 'tmp_folder/']);

  fs.rmSync(tmpDir, { recursive: true, force: true });
});

test('cleanDirectory - recursively processes directory files and ignores node_modules', async () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'wm-walk-'));

  const srcDir = path.join(tmpDir, 'src');
  const nmDir = path.join(tmpDir, 'node_modules');
  fs.mkdirSync(srcDir, { recursive: true });
  fs.mkdirSync(nmDir, { recursive: true });

  const dirtyFile = path.join(srcDir, 'app.js');
  const nmFile = path.join(nmDir, 'dep.js');

  fs.writeFileSync(dirtyFile, 'console.log("Hello\u200BWorld");');
  fs.writeFileSync(nmFile, 'console.log("Dirty\u200BDep");');

  const summary = await cleanDirectory(tmpDir, { inPlace: true });

  assert.equal(summary.totalZeroWidth, 1);
  assert.equal(summary.changedFiles, 1);

  const cleanedContent = fs.readFileSync(dirtyFile, 'utf8');
  assert.equal(cleanedContent, 'console.log("HelloWorld");');

  // Verify node_modules was ignored and untouched
  const nmContent = fs.readFileSync(nmFile, 'utf8');
  assert.equal(nmContent, 'console.log("Dirty\u200BDep");');

  fs.rmSync(tmpDir, { recursive: true, force: true });
});
