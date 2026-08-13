const fs = require('fs');
const path = require('path');
const { cleanText, identifyText } = require('./text');
const { cleanImage, identifyImage, isImageExtension } = require('./image');
const { cleanDirectory, processFile, collectFiles, isTextExtension } = require('./walker');
const { loadConfig, findConfigFile, DEFAULT_CONFIG } = require('./config');
const { initProject, initCI } = require('./init');

async function cleanPath(targetPath, options = {}) {
  const cfg = loadConfig(typeof targetPath === 'string' ? targetPath : process.cwd(), options);
  return cleanDirectory(targetPath, cfg);
}

function identifyPath(targetPath) {
  const absPath = path.resolve(targetPath);
  if (!fs.existsSync(absPath)) return null;

  const ext = path.extname(absPath).toLowerCase();
  if (isImageExtension(ext)) {
    const buf = fs.readFileSync(absPath);
    return { type: 'image', path: absPath, ...identifyImage(buf) };
  } else if (isTextExtension(ext)) {
    const text = fs.readFileSync(absPath, 'utf8');
    return { type: 'text', path: absPath, ...identifyText(text) };
  }

  return { type: 'unknown', path: absPath, hasArtifacts: false };
}

module.exports = {
  cleanText,
  identifyText,
  cleanImage,
  identifyImage,
  cleanDirectory,
  cleanPath,
  identifyPath,
  processFile,
  collectFiles,
  loadConfig,
  findConfigFile,
  DEFAULT_CONFIG,
  initProject,
  initCI,
  isImageExtension,
  isTextExtension
};
