'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
require('../signature.js');
const { normalizeUrl, validEmail, render, plainText } = globalThis.Signature;

test('public email validation handles form whitespace and nonstring input', () => {
  assert.equal(validEmail(' ada@example.com '), true);
  assert.equal(validEmail('ada+work@example.com'), true);
  for (const value of [null, undefined, 42, {}, [], '', 'ada', 'ada@example.com?subject=evil', 'a..b@example.com']) {
    assert.equal(validEmail(value), false);
  }
});

test('normalizes domains and accepts HTTP and HTTPS URLs', () => {
  assert.equal(normalizeUrl(' example.com/about '), 'https://example.com/about');
  assert.equal(normalizeUrl('example.com:8080/about'), 'https://example.com:8080/about');
  assert.equal(normalizeUrl('http://example.com'), 'http://example.com/');
});

test('rejects unsafe, ambiguous, credential-bearing, and malformed URLs', () => {
  for (const value of ['javascript:alert(1)', 'data:image/png;base64,abc', 'mailto:hi@example.com', 'ftp://example.com', '//example.com', 'https://user:pass@example.com', 'https://bad_host.com', 'https://example..com', 'https://', 'not-a-domain', 'https://example.com\\@evil.com', 'java\nscript:alert(1)', 'https://example.com\n/path', 'https://example.com:99999', '/relative']) {
    assert.equal(normalizeUrl(value), '', value);
  }
});

test('escapes user text and URL attributes without permitting markup injection', () => {
  const html = render({
    name: '<script>alert("name")</script>',
    position: "R&D's <lead>",
    company: '<img src=x onerror=alert(1)>',
    imageUrl: 'https://example.com/photo.png?a=1&b=2',
    imageAlt: '" onerror="alert(1)',
    links: [{ label: '<b>Website</b>', url: 'https://example.com/?x=1&y=2' }]
  });
  assert.ok(html.includes('&lt;script&gt;alert(&quot;name&quot;)&lt;/script&gt;'));
  assert.ok(html.includes('R&amp;D&#39;s &lt;lead&gt;'));
  assert.ok(html.includes('alt="&quot; onerror=&quot;alert(1)"'));
  assert.ok(html.includes('?x=1&amp;y=2'));
  assert.ok(!html.includes('<script>'));
  assert.ok(!html.includes('<b>Website</b>'));
});

test('omits invalid optional content and constrains styling', () => {
  const html = render({ name: 'Ada', imageUrl: 'data:image/svg+xml,evil', email: 'ada@example.com?subject=evil', accent: 'red;position:fixed', links: [{ label: 'Unsafe', url: 'javascript:alert(1)' }, { label: '', url: 'example.com' }] });
  assert.ok(!html.includes('<img'));
  assert.ok(!html.includes('<a'));
  assert.ok(!html.includes('padding-top'));
  assert.ok(html.includes('border-left:2px solid #285c4d'));
  assert.equal(render({}), '');
  assert.equal(plainText({}), '');
});

test('renders image, divider, identity, and optional contact links', () => {
  const html = render({ name: 'Ada Lovelace', position: 'Engineer', company: 'Example', phone: '+1 (555) 123-4567', email: 'ada@example.com', imageUrl: 'example.com/photo.png', links: [{ label: 'Website', url: 'example.com' }] });
  assert.ok(html.indexOf('<img') < html.indexOf('border-left'));
  assert.ok(html.indexOf('border-left') < html.indexOf('Ada Lovelace'));
  assert.ok(html.includes('href="tel:+15551234567"'));
  assert.ok(html.includes('href="mailto:ada@example.com"'));
  assert.ok(html.includes('width="88"'));
  assert.equal(plainText({ name: 'Ada', company: 'Example', links: [{ label: 'Website', url: 'example.com' }] }), 'Ada\nExample\nWebsite: https://example.com/');
});

test('clamps image size and handles malformed data safely', () => {
  assert.ok(render({ imageUrl: 'example.com/a.png', imageSize: 900 }).includes('width="160"'));
  assert.ok(render({ imageUrl: 'example.com/a.png', imageSize: 1 }).includes('width="48"'));
  assert.ok(render({ imageUrl: 'example.com/a.png', imageSize: '88;evil' }).includes('width="88"'));
  assert.equal(render(null), '');
  assert.equal(render({ links: [null, false, {}] }), '');
});

test('encodes valid mailbox punctuation so it cannot become mailto parameters', () => {
  const html = render({ email: 'ada?subject=hello@example.com' });
  assert.ok(html.includes('href="mailto:ada%3Fsubject%3Dhello@example.com"'));
  assert.ok(!html.includes('href="mailto:ada?'));
});

test('renders selected bold text safely and keeps markup out of link destinations and plain text', () => {
  const data = {
    name: '**Alex** Morgan', position: 'Lead **Designer**', company: '**EXAMPLE** | Digital Solutions',
    phone: '**+1** 555-0100', email: '**alex**@example.com',
    links: [{ label: 'My **Website**', url: 'https://example.com/**literal**' }]
  };
  const html = render(data);
  assert.match(html, /<strong style="font-weight:700;">EXAMPLE<\/strong> \| Digital Solutions/);
  assert.match(html, /href="mailto:alex@example.com"/);
  assert.match(html, /href="tel:\+15550100"/);
  assert.match(html, /href="https:\/\/example.com\/\*\*literal\*\*"/);
  assert.match(html, /My <strong style="font-weight:700;">Website<\/strong>/);
  assert.equal(plainText(data), 'Alex Morgan\nLead Designer\nEXAMPLE | Digital Solutions\n+1 555-0100\nalex@example.com\nMy Website: https://example.com/**literal**');
  assert.equal(globalThis.Signature.format('**<img src=x onerror=alert(1)>**'), '<strong style="font-weight:700;">&lt;img src=x onerror=alert(1)&gt;</strong>');
  assert.equal(globalThis.Signature.format('unmatched **text'), 'unmatched **text');
  assert.equal(globalThis.Signature.unformat('A **bold** B **also**'), 'A bold B also');
});
