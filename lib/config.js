const fs = require('fs');
const path = require('path');

const DEFAULT_CONFIG = {
  ignore: ['node_modules', '.git', 'dist', 'build', '.next', 'vendor', 'coverage', '.cache'],
  textOnly: false,
  imageOnly: false,
  cropCorner: null,
  concurrency: 16,
  verbose: false,
  stripZeroWidth: true,
  stripBidi: true,
  stripTokens: true,
  stripComments: true,
  normalizeQuotes: false
};

function findConfigFile(dir) {
  const targetDir = dir ? path.resolve(dir) : process.cwd();
  let current = targetDir;

  while (current) {
    const rcPath = path.join(current, '.watermarkrc');
    if (fs.existsSync(rcPath)) {
      try {
        const content = fs.readFileSync(rcPath, 'utf8');
        return JSON.parse(content);
      } catch (err) {
        // Fallback for non-JSON text format or parse error
        return {};
      }
    }

    const rcJsonPath = path.join(current, '.watermarkrc.json');
    if (fs.existsSync(rcJsonPath)) {
      try {
        return JSON.parse(fs.readFileSync(rcJsonPath, 'utf8'));
      } catch (err) {
        return {};
      }
    }

    const pkgPath = path.join(current, 'package.json');
    if (fs.existsSync(pkgPath)) {
      try {
        const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
        if (pkg.watermark && typeof pkg.watermark === 'object') {
          return pkg.watermark;
        }
      } catch (err) {
        // ignore JSON parse error in package.json
      }
    }

    const parent = path.dirname(current);
    if (parent === current) break;
    current = parent;
  }

  return {};
}

function loadConfig(dir, cliFlags = {}) {
  const fileConfig = findConfigFile(dir);
  const merged = { ...DEFAULT_CONFIG, ...fileConfig };

  // CLI flags override file configuration
  for (const [key, val] of Object.entries(cliFlags)) {
    if (val !== undefined && val !== null) {
      merged[key] = val;
    }
  }

  return merged;
}

module.exports = {
  DEFAULT_CONFIG,
  loadConfig,
  findConfigFile
};
