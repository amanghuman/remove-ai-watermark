const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { loadConfig, findConfigFile } = require('../lib/config');

test('loadConfig - returns default config when no file exists', () => {
  const cfg = loadConfig('/non/existent/path');
  assert.equal(cfg.concurrency, 16);
  assert.equal(cfg.stripZeroWidth, true);
  assert.ok(Array.isArray(cfg.ignore));
});

test('loadConfig - merges CLI flags over defaults', () => {
  const cfg = loadConfig('/non/existent/path', { textOnly: true, concurrency: 4 });
  assert.equal(cfg.textOnly, true);
  assert.equal(cfg.concurrency, 4);
});

test('findConfigFile - reads .watermarkrc json', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'wm-test-'));
  const rcPath = path.join(tmpDir, '.watermarkrc');
  fs.writeFileSync(rcPath, JSON.stringify({ concurrency: 8, textOnly: true }));

  const cfg = findConfigFile(tmpDir);
  assert.equal(cfg.concurrency, 8);
  assert.equal(cfg.textOnly, true);

  fs.rmSync(tmpDir, { recursive: true, force: true });
});
