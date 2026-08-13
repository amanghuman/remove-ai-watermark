const test = require('node:test');
const assert = require('node:assert/strict');
const { cleanText, identifyText } = require('../lib/text');

test('cleanText - strips zero-width spaces', () => {
  const dirty = 'Hello\u200BWorld\uFEFFTest\u200C';
  const res = cleanText(dirty);
  assert.equal(res.text, 'HelloWorldTest');
  assert.equal(res.stats.zeroWidthCount, 3);
  assert.equal(res.stats.changed, true);
});

test('cleanText - strips Bidi override security characters', () => {
  const dirty = 'Safe\u202EText\u2066Code';
  const res = cleanText(dirty);
  assert.equal(res.text, 'SafeTextCode');
  assert.equal(res.stats.bidiCount, 2);
  assert.equal(res.stats.changed, true);
});

test('cleanText - strips LLM prompt tokens', () => {
  const t1 = '<|im_' + 'start|>';
  const t2 = '<|im_' + 'end|>';
  const t3 = '[' + 'INST]';
  const t4 = '[/' + 'INST]';
  const dirty = `${t1}system\nYou are helpful.${t2}${t3}Hello${t4}`;
  const res = cleanText(dirty);
  assert.equal(res.text, 'system\nYou are helpful.Hello');
  assert.equal(res.stats.tokenCount, 4);
  assert.equal(res.stats.changed, true);
});

test('cleanText - normalizes obscure spaces', () => {
  const dirty = 'Space\u00A0Test\u2003Here';
  const res = cleanText(dirty);
  assert.equal(res.text, 'Space Test Here');
  assert.equal(res.stats.spaceCount, 2);
});

test('cleanText - normalizes smart quotes when enabled', () => {
  const dirty = '“Hello” and ‘World’';
  const res = cleanText(dirty, { normalizeQuotes: true });
  assert.equal(res.text, '"Hello" and \'World\'');
  assert.equal(res.stats.quoteCount, 4);
});

test('cleanText - strips AI comment signatures in JavaScript', () => {
  const sig = 'Auto-generated' + ' by AI';
  const code = `// ${sig}\nfunction add(a, b) {\n  return a + b;\n}`;
  const res = cleanText(code, { ext: '.js' });
  assert.match(res.text, /function add/);
  assert.doesNotMatch(res.text, new RegExp(sig));
  assert.equal(res.stats.commentCount, 1);
});

test('cleanText - strips AI comment signatures in Python', () => {
  const sig = 'Written' + ' by AI';
  const code = `# ${sig}\ndef greet():\n    pass\n`;
  const res = cleanText(code, { ext: '.py' });
  assert.doesNotMatch(res.text, new RegExp(sig));
  assert.equal(res.stats.commentCount, 1);
});

test('identifyText - reports zero width and prompt tokens', () => {
  const t1 = '<|im_' + 'start|>';
  const dirty = `Hello\u200BWorld ${t1}`;
  const report = identifyText(dirty);
  assert.equal(report.hasArtifacts, true);
  assert.equal(report.zeroWidth, 1);
  assert.equal(report.tokens, 1);
});
