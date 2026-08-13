const fs = require('fs');
const path = require('path');

const DEFAULT_RC_CONTENT = `{
  "ignore": ["node_modules", ".git", "dist", "build", ".next", "vendor", "coverage"],
  "textOnly": false,
  "imageOnly": false,
  "stripZeroWidth": true,
  "stripBidi": true,
  "stripTokens": true,
  "stripComments": true,
  "concurrency": 16
}
`;

const GITHUB_WORKFLOW_CONTENT = `name: Verify AI Watermarks & Artifacts

on:
  push:
    branches: [ main, master ]
  pull_request:
    branches: [ main, master ]

jobs:
  verify-watermarks:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - name: Verify zero watermarks
        run: npx remove-ai-watermark --check .
`;

function initProject(targetDir = process.cwd()) {
  const root = path.resolve(targetDir);
  const rcPath = path.join(root, '.watermarkrc');

  let rcCreated = false;
  if (!fs.existsSync(rcPath)) {
    fs.writeFileSync(rcPath, DEFAULT_RC_CONTENT, 'utf8');
    rcCreated = true;
  }

  // Pre-commit hook setup
  let hookCreated = false;
  const gitHooksDir = path.join(root, '.git', 'hooks');
  if (fs.existsSync(gitHooksDir)) {
    const preCommitPath = path.join(gitHooksDir, 'pre-commit');
    const hookScript = `#!/bin/sh
# Prevent committing files containing AI watermarks or zero-width unicode artifacts
npx remove-ai-watermark --check .
`;
    if (!fs.existsSync(preCommitPath)) {
      fs.writeFileSync(preCommitPath, hookScript, { mode: 0o755 });
      hookCreated = true;
    }
  }

  return { rcCreated, hookCreated, root };
}

function initCI(targetDir = process.cwd()) {
  const root = path.resolve(targetDir);
  const workflowDir = path.join(root, '.github', 'workflows');
  fs.mkdirSync(workflowDir, { recursive: true });

  const workflowPath = path.join(workflowDir, 'verify-watermarks.yml');
  let ciCreated = false;
  if (!fs.existsSync(workflowPath)) {
    fs.writeFileSync(workflowPath, GITHUB_WORKFLOW_CONTENT, 'utf8');
    ciCreated = true;
  }

  return { ciCreated, workflowPath };
}

module.exports = {
  initProject,
  initCI
};
