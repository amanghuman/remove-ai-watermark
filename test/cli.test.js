const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { initProject, initCI } = require('../lib/init');

test('initProject - creates .watermarkrc and git pre-commit hook', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'wm-init-'));
  const gitHooks = path.join(tmpDir, '.git', 'hooks');
  fs.mkdirSync(gitHooks, { recursive: true });

  const res = initProject(tmpDir);
  assert.equal(res.rcCreated, true);
  assert.equal(res.hookCreated, true);

  assert.equal(fs.existsSync(path.join(tmpDir, '.watermarkrc')), true);
  assert.equal(fs.existsSync(path.join(gitHooks, 'pre-commit')), true);

  fs.rmSync(tmpDir, { recursive: true, force: true });
});

test('initCI - creates GitHub Action workflow file', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'wm-ci-'));

  const res = initCI(tmpDir);
  assert.equal(res.ciCreated, true);

  const wfPath = path.join(tmpDir, '.github', 'workflows', 'verify-watermarks.yml');
  assert.equal(fs.existsSync(wfPath), true);

  const content = fs.readFileSync(wfPath, 'utf8');
  assert.match(content, /remove-ai-watermark --check/);

  fs.rmSync(tmpDir, { recursive: true, force: true });
});
