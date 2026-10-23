const { test } = require('node:test');
const assert = require('node:assert/strict');
const Template = require('../template.js');
const signature = {
  name: '  <img onerror="alert(1)"> Éxample  ', position: '', company: ' Company ',
  phone: ' +1 (555) 010-1000 ', email: ' unfinished@ ', imageUrl: ' javascript:unfinished ',
  imageAlt: ' A & B ', imageSize: 137, accent: '#A1b2C3',
  links: [{ label: ' Second ', url: ' broken url ' }, { label: '', url: '' }, { label: 'First', url: '' }]
};
test('template filenames use a safe email handle without changing saved values', () => {
  const examples = [
    ['alex@example.com', 'alex.json'],
    [' Alex.Morgan+work@example.com ', 'alex.morgan+work.json'],
    ['unfinished@', 'unfinished.json'],
    ['', 'email-signature-template.json'],
    ['../alex/path@example.com', 'alex-path.json'],
    ['CON@example.com', 'template-con.json']
  ];
  for (const [email, expected] of examples) {
    const data = { ...signature, email, company: '' };
    assert.equal(Template.filename(data), expected);
    assert.equal(Template.parse(Template.serialize(data)).email, email);
  }
});
test('exact round trip retains every field, whitespace, unfinished values and ordered blank rows', () => {
  const encoded = Template.serialize(signature);
  assert.deepEqual(Template.parse(encoded), signature);
  assert.equal(Template.serialize(Template.parse(encoded)), encoded);
  assert.ok(encoded.endsWith('\n'));
  assert.deepEqual(Object.keys(JSON.parse(encoded)), ['format', 'version', 'signature']);
});
test('rejects malformed, unknown and structurally invalid files without changing source data', () => {
  const before = structuredClone(signature);
  for (const value of [null, [], {}, { format: 'other', version: 1, signature },
    { format: 'email-signature-template', version: 2, signature },
    ...[{ name: null }, { links: [{}] }, { links: 'bad' }, { imageSize: 47 }, { imageSize: 161 }, { imageSize: 80.5 }, { accent: 'red' }, { email: 1 }].map(patch => ({ format: 'email-signature-template', version: 1, signature: { ...signature, ...patch } }))]) {
    assert.throws(() => Template.parse(JSON.stringify(value)));
  }
  assert.throws(() => Template.parse('{'));
  assert.throws(() => Template.parse(' '.repeat(Template.maxBytes + 1)));
  assert.deepEqual(signature, before);
});
test('omits view-only state and returns independent editable values', () => {
  const parsed = Template.parse(Template.serialize({ ...signature, sample: true, warning: 'example' }));
  assert.deepEqual(parsed, signature);
  parsed.links[0].label = 'changed';
  assert.equal(signature.links[0].label, ' Second ');
});

test('template filenames include the company without bold markers or unsafe separators', () => {
  const data = { ...signature, email: '**alex**@example.com', company: '**EXAMPLE** | Digital Solutions' };
  assert.equal(Template.filename(data), 'alex-example-digital-solutions.json');
  assert.deepEqual(Template.parse(Template.serialize(data)), data);
  assert.equal(Template.filename({ email: 'alex@example.com', company: ' /:*? ' }), 'alex.json');
});
