const { cleanText } = require('./text');
const { cleanImage, isImageExtension } = require('./image');
const { cleanDirectory, processFile, collectFiles } = require('./walker');
const { loadConfig, findConfigFile, DEFAULT_CONFIG } = require('./config');
const { initProject, initCI } = require('./init');

async function cleanPath(targetPath, options = {}) {
  const cfg = loadConfig(typeof targetPath === 'string' ? targetPath : process.cwd(), options);
  return cleanDirectory(targetPath, cfg);
}

module.exports = {
  cleanText,
  cleanImage,
  cleanDirectory,
  cleanPath,
  processFile,
  collectFiles,
  loadConfig,
  findConfigFile,
  DEFAULT_CONFIG,
  initProject,
  initCI,
  isImageExtension
};
