(function () {
  'use strict';

  var DEFAULT_ACCENT = '#285c4d';

  function text(value) {
    return typeof value === 'string' ? value.trim() : '';
  }

  function escape(value) {
    return String(value).replace(/[&<>"']/g, function (character) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character];
    });
  }

  function unformat(value) {
    return typeof value === 'string' ? value.replace(/\*\*([\s\S]+?)\*\*/g, '$1') : '';
  }

  function format(value) {
    var input = typeof value === 'string' ? value : '';
    var result = '', start = 0;
    input.replace(/\*\*([\s\S]+?)\*\*/g, function (match, bold, offset) {
      result += escape(input.slice(start, offset)) + '<strong style="font-weight:700;">' + escape(bold) + '</strong>';
      start = offset + match.length;
      return match;
    });
    return result + escape(input.slice(start));
  }

  function normalizeUrl(value) {
    var input = text(value);
    if (!input || /[\u0000-\u0020\u007f\\]/.test(input)) return '';
    if (!/^https?:\/\//i.test(input)) {
      // Bare domains may include a port, but arbitrary schemes are never links.
      if (/^[a-z][a-z\d+.-]*:/i.test(input) && !/^[^/:]+:\d+(?:[/?#]|$)/.test(input)) return '';
      if (input.indexOf('//') === 0 || input.charAt(0) === '/') return '';
      input = 'https://' + input;
    }
    try {
      var url = new URL(input);
      if (!/^https?:$/.test(url.protocol) || url.username || url.password) return '';
      var hostname = url.hostname;
      var domain = hostname.replace(/\.$/, '');
      var validHost = hostname.charAt(0) === '[' || domain === 'localhost' || (
        domain.indexOf('.') > 0 && domain.length <= 253 && domain.split('.').every(function (label) {
          return /^[a-z\d](?:[a-z\d-]{0,61}[a-z\d])?$/i.test(label);
        })
      );
      return validHost ? url.href : '';
    } catch (_) {
      return '';
    }
  }

  function validEmail(value) {
    value = text(value);
    if (value.length > 254 || !/^[a-z\d!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z\d!#$%&'*+/=?^_`{|}~-]+)*@[a-z\d](?:[a-z\d-]*[a-z\d])?(?:\.[a-z\d](?:[a-z\d-]*[a-z\d])?)+$/i.test(value)) return false;
    return value.split('@')[0].length <= 64;
  }

  function clean(data) {
    data = data && typeof data === 'object' ? data : {};
    var size = Number(data.imageSize);
    var email = text(data.email);
    return {
      name: text(data.name),
      position: text(data.position),
      company: text(data.company),
      phone: text(data.phone),
      email: validEmail(unformat(email)) ? email : '',
      imageUrl: normalizeUrl(data.imageUrl),
      imageAlt: text(data.imageAlt),
      imageSize: Number.isFinite(size) && size > 0 ? Math.round(Math.min(160, Math.max(48, size))) : 88,
      accent: /^#[a-f\d]{6}$/i.test(text(data.accent)) ? text(data.accent) : DEFAULT_ACCENT,
      links: (Array.isArray(data.links) ? data.links : []).map(function (link) {
        return { label: text(link && link.label), url: normalizeUrl(link && link.url) };
      }).filter(function (link) { return link.url && link.label; })
    };
  }

  function anchor(label, href, accent) {
    return '<a href="' + escape(href) + '" style="color:' + accent + ';text-decoration:none;">' + format(label) + '</a>';
  }

  function render(data) {
    var signature = clean(data);
    var lines = [];
    if (signature.name) lines.push('<div style="font-size:18px;line-height:24px;font-weight:700;color:#202a26;">' + format(signature.name) + '</div>');
    if (signature.position) lines.push('<div style="font-size:13px;line-height:20px;">' + format(signature.position) + '</div>');
    if (signature.company) lines.push('<div style="font-size:13px;line-height:20px;">' + format(signature.company) + '</div>');
    var contacts = [];
    if (signature.phone) {
      var number = unformat(signature.phone).replace(/[\s().-]/g, '');
      contacts.push(/^\+?\d+$/.test(number) ? anchor(signature.phone, 'tel:' + number, signature.accent) : format(signature.phone));
    }
    if (signature.email) contacts.push(anchor(signature.email, 'mailto:' + encodeURIComponent(unformat(signature.email)).replace('%40', '@'), signature.accent));
    signature.links.forEach(function (link) { contacts.push(anchor(link.label, link.url, signature.accent)); });
    if (contacts.length) lines.push('<div style="padding-top:' + (lines.length ? '8' : '0') + 'px;font-size:12px;line-height:20px;">' + contacts.join('<br>') + '</div>');
    if (!lines.length && !signature.imageUrl) return '';
    var image = signature.imageUrl ? '<td style="vertical-align:top;padding:0 18px 0 0;"><img src="' + escape(signature.imageUrl) + '" alt="' + escape(signature.imageAlt) + '" width="' + signature.imageSize + '" height="' + signature.imageSize + '" style="display:block;width:' + signature.imageSize + 'px;height:' + signature.imageSize + 'px;object-fit:cover;border:0;"></td>' : '';
    return '<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;font-family:Arial,Helvetica,sans-serif;color:#46534d;"><tbody><tr>' + image + '<td style="vertical-align:top;border-left:2px solid ' + signature.accent + ';padding:0 0 0 18px;">' + lines.join('') + '</td></tr></tbody></table>';
  }

  function plainText(data) {
    var signature = clean(data);
    return [signature.name, signature.position, signature.company, signature.phone, signature.email].filter(Boolean).map(unformat).concat(signature.links.map(function (link) {
      return unformat(link.label) + ': ' + link.url;
    })).join('\n');
  }

  globalThis.Signature = Object.freeze({ normalizeUrl: normalizeUrl, validEmail: validEmail, format: format, unformat: unformat, render: render, plainText: plainText });
}());
