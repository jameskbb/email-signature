(function () {
  'use strict';
  var MAX_BYTES = 100 * 1024;
  var strings = ['name', 'position', 'company', 'phone', 'email', 'imageUrl', 'imageAlt', 'accent'];
  function object(value) { return value && typeof value === 'object' && !Array.isArray(value); }
  function validate(value) {
    if (!object(value) || value.format !== 'email-signature-template' || value.version !== 1) {
      throw new Error('Choose an email signature template saved by this editor (version 1).');
    }
    var data = value.signature;
    if (!object(data) || strings.some(function (key) { return typeof data[key] !== 'string'; }) ||
        !Number.isInteger(data.imageSize) || data.imageSize < 48 || data.imageSize > 160 ||
        !/^#[0-9a-f]{6}$/i.test(data.accent) || !Array.isArray(data.links) ||
        data.links.some(function (link) { return !object(link) || typeof link.label !== 'string' || typeof link.url !== 'string'; })) {
      throw new Error('This template has missing or invalid fields. Choose another template.');
    }
    // Copy only editable fields, retaining their exact values and link order.
    return {
      name: data.name, position: data.position, company: data.company,
      phone: data.phone, email: data.email, imageUrl: data.imageUrl,
      imageAlt: data.imageAlt, imageSize: data.imageSize, accent: data.accent,
      links: data.links.map(function (link) { return { label: link.label, url: link.url }; })
    };
  }
  function checkSize(text) {
    if (new TextEncoder().encode(text).length > MAX_BYTES) throw new Error('This template is too large. Choose a file smaller than 100 KiB.');
  }
  function parse(text) {
    checkSize(text);
    var value;
    try { value = JSON.parse(text); } catch (error) { throw new Error('This file is not valid JSON. Choose a saved signature template.'); }
    return validate(value);
  }
  function serialize(signature) {
    var value = { format: 'email-signature-template', version: 1, signature: signature };
    value.signature = validate(value);
    var text = JSON.stringify(value, null, 2) + '\n';
    checkSize(text);
    return text;
  }
  function filename(signature) {
    var email = signature && typeof signature.email === 'string' ? signature.email : '';
    var company = signature && typeof signature.company === 'string' ? signature.company : '';
    var handle = email.replace(/\*\*([\s\S]+?)\*\*/g, '$1').trim().split('@')[0].toLowerCase().normalize('NFKD')
      .replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9._+-]/g, '-')
      .replace(/-+/g, '-').replace(/^[._+-]+|[._+-]+$/g, '').slice(0, 100)
      .replace(/[._+-]+$/g, '');
    if (!handle) handle = 'email-signature-template';
    var companySlug = company.replace(/\*\*([\s\S]+?)\*\*/g, '$1').toLowerCase().normalize('NFKD')
      .replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '').slice(0, 80).replace(/-+$/g, '');
    if (companySlug) handle += '-' + companySlug;
    // Windows reserves these names even when a file extension is present.
    if (/^(con|prn|aux|nul|com[0-9]|lpt[0-9])(?:\.|$)/i.test(handle)) handle = 'template-' + handle;
    return handle + '.json';
  }
  var api = { parse: parse, serialize: serialize, filename: filename, maxBytes: MAX_BYTES };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else window.SignatureTemplate = api;
})();
