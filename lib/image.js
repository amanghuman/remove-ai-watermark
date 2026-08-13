const sharp = require('sharp');
const path = require('path');

const SUPPORTED_EXTENSIONS = new Set([
  '.png', '.jpg', '.jpeg', '.webp', '.avif', '.tiff', '.tif', '.gif'
]);

function isImageExtension(ext) {
  return SUPPORTED_EXTENSIONS.has((ext || '').toLowerCase());
}

async function cleanImage(inputBuffer, options = {}) {
  const opts = {
    cropCorner: null, // 'bottom-right', 'bottom-left', 'top-right', 'top-left'
    cropPercentage: 0.02, // 2% corner crop if requested
    targetFormat: null, // 'png', 'jpeg', 'webp', 'avif', 'tiff', 'gif' or null to keep original format
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

    // Optional corner stamp cropping
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

    // Determine target export format
    const outFormat = opts.targetFormat || metadata.format || 'png';

    // Configure export pipeline without calling withMetadata() -> completely strips EXIF, XMP, IPTC, C2PA, PNG chunks
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
    // If sharp fails to parse binary image, return input unaltered
    return { buffer: inputBuffer, stats };
  }
}

module.exports = {
  cleanImage,
  isImageExtension,
  SUPPORTED_EXTENSIONS
};
