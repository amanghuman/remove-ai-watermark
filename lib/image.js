const sharp = require('sharp');
const path = require('path');

const SUPPORTED_EXTENSIONS = new Set([
  '.png', '.jpg', '.jpeg', '.webp', '.avif', '.tiff', '.tif', '.gif'
]);

const C2PA_UUID_HEX = 'd8fec3d61b0e483c92975828877ec481';
const C2PA_UUID_BUF = Buffer.from(C2PA_UUID_HEX, 'hex');

const IPTC_AI_MARKERS = [
  Buffer.from('trainedAlgorithmicMedia'),
  Buffer.from('compositeSynthetic')
];

const KNOWN_AI_METADATA_KEYS = [
  'parameters', 'prompt', 'negative_prompt', 'workflow', 'comfyui',
  'sd-metadata', 'invokeai_metadata', 'generation_data', 'ai_metadata',
  'sd:prompt', 'c2pa', 'software'
];

function isImageExtension(ext) {
  return SUPPORTED_EXTENSIONS.has((ext || '').toLowerCase());
}

function identifyImage(buffer) {
  const result = {
    hasMetadata: false,
    hasC2pa: false,
    hasIptcAi: false,
    detectedKeys: []
  };

  if (!Buffer.isBuffer(buffer) || buffer.length === 0) {
    return result;
  }

  // Check C2PA markers
  const containsC2paUuid = buffer.includes(C2PA_UUID_BUF);
  const containsJumb = buffer.includes(Buffer.from('jumb')) && buffer.includes(Buffer.from('c2pa'));
  if (containsC2paUuid || containsJumb) {
    result.hasC2pa = true;
    result.hasMetadata = true;
    result.detectedKeys.push('C2PA Content Credentials');
  }

  // Check IPTC AI markers
  for (const marker of IPTC_AI_MARKERS) {
    if (buffer.includes(marker)) {
      result.hasIptcAi = true;
      result.hasMetadata = true;
      result.detectedKeys.push(`IPTC AI Marker (${marker.toString()})`);
    }
  }

  // Check text keys in buffer
  const bufStr = buffer.slice(0, Math.min(buffer.length, 1024 * 512)).toString('latin1').toLowerCase();
  for (const key of KNOWN_AI_METADATA_KEYS) {
    if (bufStr.includes(key.toLowerCase())) {
      result.hasMetadata = true;
      if (!result.detectedKeys.includes(key)) {
        result.detectedKeys.push(key);
      }
    }
  }

  return result;
}

async function cleanImage(inputBuffer, options = {}) {
  const opts = {
    cropCorner: null,
    cropPercentage: 0.02,
    targetFormat: null,
    quality: 92,
    ext: '.png',
    ...options
  };

  const originalSize = inputBuffer.length;
  const stats = {
    originalSize,
    cleanedSize: originalSize,
    bytesSaved: 0,
    format: 'unknown',
    cropped: false,
    changed: false
  };

  if (!Buffer.isBuffer(inputBuffer) || inputBuffer.length === 0) {
    return { buffer: inputBuffer, stats };
  }

  try {
    let pipeline = sharp(inputBuffer);
    const metadata = await pipeline.metadata();
    stats.format = metadata.format || 'png';

    let width = metadata.width;
    let height = metadata.height;

    if (opts.cropCorner && width && height) {
      const cropW = Math.round(width * opts.cropPercentage);
      const cropH = Math.round(height * opts.cropPercentage);

      if (cropW > 0 && cropH > 0) {
        let extractRegion;
        if (opts.cropCorner === 'bottom-right') {
          extractRegion = { left: 0, top: 0, width: width - cropW, height: height - cropH };
        } else if (opts.cropCorner === 'bottom-left') {
          extractRegion = { left: cropW, top: 0, width: width - cropW, height: height - cropH };
        } else if (opts.cropCorner === 'top-right') {
          extractRegion = { left: 0, top: cropH, width: width - cropW, height: height - cropH };
        } else if (opts.cropCorner === 'top-left') {
          extractRegion = { left: cropW, top: cropH, width: width - cropW, height: height - cropH };
        }

        if (extractRegion) {
          pipeline = pipeline.extract(extractRegion);
          stats.cropped = true;
        }
      }
    }

    const outFormat = opts.targetFormat || metadata.format || 'png';

    if (outFormat === 'jpeg' || outFormat === 'jpg') {
      pipeline = pipeline.jpeg({ quality: opts.quality, mozjpeg: true });
    } else if (outFormat === 'webp') {
      pipeline = pipeline.webp({ quality: opts.quality });
    } else if (outFormat === 'avif') {
      pipeline = pipeline.avif({ quality: opts.quality });
    } else if (outFormat === 'png') {
      pipeline = pipeline.png({ compressionLevel: 9, palette: false });
    } else if (outFormat === 'gif') {
      pipeline = pipeline.gif();
    } else if (outFormat === 'tiff' || outFormat === 'tif') {
      pipeline = pipeline.tiff({ quality: opts.quality });
    } else {
      pipeline = pipeline.png({ compressionLevel: 9 });
    }

    const outputBuffer = await pipeline.toBuffer();
    stats.cleanedSize = outputBuffer.length;
    stats.bytesSaved = Math.max(0, originalSize - outputBuffer.length);
    stats.changed = true;

    return { buffer: outputBuffer, stats };
  } catch (err) {
    return { buffer: inputBuffer, stats };
  }
}

module.exports = {
  cleanImage,
  identifyImage,
  isImageExtension,
  SUPPORTED_EXTENSIONS
};
