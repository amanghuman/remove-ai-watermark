const test = require('node:test');
const assert = require('node:assert/strict');
const sharp = require('sharp');
const { cleanImage, isImageExtension } = require('../lib/image');

test('isImageExtension - validates supported image extensions', () => {
  assert.equal(isImageExtension('.png'), true);
  assert.equal(isImageExtension('.jpg'), true);
  assert.equal(isImageExtension('.webp'), true);
  assert.equal(isImageExtension('.txt'), false);
});

test('cleanImage - re-encodes raw pixel image buffer cleanly', async () => {
  const sampleBuf = await sharp({
    create: {
      width: 100,
      height: 100,
      channels: 4,
      background: { r: 255, g: 0, b: 0, alpha: 1 }
    }
  })
    .png()
    .toBuffer();

  const res = await cleanImage(sampleBuf, { ext: '.png' });
  assert.ok(Buffer.isBuffer(res.buffer));
  assert.equal(res.stats.format, 'png');
  assert.equal(res.stats.changed, true);
});

test('cleanImage - crops bottom-right corner stamp when requested', async () => {
  const sampleBuf = await sharp({
    create: {
      width: 200,
      height: 200,
      channels: 4,
      background: { r: 0, g: 255, b: 0, alpha: 1 }
    }
  })
    .png()
    .toBuffer();

  const res = await cleanImage(sampleBuf, { cropCorner: 'bottom-right', cropPercentage: 0.1 });
  assert.equal(res.stats.cropped, true);

  const meta = await sharp(res.buffer).metadata();
  assert.equal(meta.width, 180);
  assert.equal(meta.height, 180);
});
