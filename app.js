(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  var fields = ['name', 'position', 'company', 'phone', 'email', 'imageUrl', 'imageAlt', 'imageSize', 'accent'];
  var draftKey = 'email-signature-draft-v1';
  var sample = { name: 'Alex Morgan', position: 'Product Designer', company: 'North & Co.', phone: '', email: 'alex@example.com', imageUrl: '', imageAlt: '', imageSize: 88, accent: '#315c49', links: [{ label: 'GitHub', url: '' }, { label: 'Website', url: '' }, { label: 'Facebook', url: '' }] };
  var state;
  var undoState = null;
  var linkCounter = 0;
  var saveTimer;
  var renderTimer;
  var storageUnavailable = false;
  var lastImageUrl = '';
  var imageFailed = false;
  var valid = true;

  function clone(data) { return JSON.parse(JSON.stringify(data)); }
  function safeDraft(value) {
    if (!value || typeof value !== 'object' || !Array.isArray(value.links)) return null;
    var result = {};
    fields.forEach(function (key) { result[key] = typeof value[key] === 'string' || typeof value[key] === 'number' ? String(value[key]) : ''; });
    result.imageSize = Math.min(160, Math.max(48, Number(result.imageSize) || 88));
    result.accent = /^#[0-9a-f]{6}$/i.test(result.accent) ? result.accent : '#315c49';
    result.links = value.links.filter(function (link) { return link && typeof link.label === 'string' && typeof link.url === 'string'; }).map(function (link) { return { label: link.label, url: link.url }; });
    return result;
  }
  try {
    var saved = localStorage.getItem(draftKey);
    state = saved ? safeDraft(JSON.parse(saved)) : null;
    if (saved && !state) throw new Error('Invalid draft');
    if (state) $('sample-note').textContent = 'Your saved draft. Every change appears in the preview.';
  } catch (error) {
    storageUnavailable = true;
    $('storage-status').textContent = 'The saved draft could not be read. You can still create and download a signature.';
  }
  state = state || clone(sample);

  function persist() {
    clearTimeout(saveTimer);
    try {
      localStorage.setItem(draftKey, JSON.stringify(state));
      storageUnavailable = false;
      $('storage-status').textContent = 'Draft saved in this browser.';
    } catch (error) {
      storageUnavailable = true;
      $('storage-status').textContent = 'This browser cannot save your draft. Save a template before closing this page.';
    }
  }
  function save() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(persist, 250);
  }

  function templateStatus(message, error) {
    $('template-status').hidden = false;
    $('template-status').textContent = message;
    $('template-status').classList.toggle('warning', Boolean(error));
  }
  function downloadFile(contents, type, filename) {
    var url = URL.createObjectURL(new Blob([contents], { type: type }));
    var anchor = document.createElement('a');
    anchor.href = url; anchor.download = filename;
    document.body.appendChild(anchor); anchor.click(); anchor.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
  }
  $('save-template').addEventListener('click', function () {
    try {
      downloadFile(SignatureTemplate.serialize(state), 'application/json;charset=utf-8', SignatureTemplate.filename(state));
      templateStatus('Template saved. Load this file to restore every field, including unfinished details.');
    } catch (error) { templateStatus(error.message, true); }
  });
  $('load-template').addEventListener('click', function () { $('template-file').click(); });
  $('template-file').addEventListener('change', async function () {
    var file = this.files[0];
    this.value = '';
    if (!file) return;
    try {
      if (file.size > SignatureTemplate.maxBytes) throw new Error('This template is too large. Choose a file smaller than 100 KiB.');
      var loaded = SignatureTemplate.parse(await file.text());
      clearTimeout(saveTimer);
      clearTimeout(renderTimer);
      undoState = clone(state);
      state = loaded;
      lastImageUrl = ''; imageFailed = false;
      fillForm(); changed();
      clearTimeout(renderTimer);
      persist();
      $('restore').textContent = 'Undo load';
      $('restore').hidden = false;
      templateStatus('Template loaded. Every field is restored. Use Undo load to restore your previous draft.');
    } catch (error) { templateStatus(error.message + ' Your draft has not changed.', true); }
  });

  function setError(input, output, message) {
    input.setAttribute('aria-invalid', message ? 'true' : 'false');
    output.textContent = message;
    output.hidden = !message;
    if (message) valid = false;
  }

  function validate() {
    valid = true;
    var email = state.email.trim();
    setError($('email'), $('email-error'), email && !Signature.validEmail(email) ? 'Enter an email address such as alex@example.com, or leave this blank.' : '');
    setError($('imageUrl'), $('image-error'), state.imageUrl.trim() && !Signature.normalizeUrl(state.imageUrl) ? 'Enter a public http:// or https:// image URL, or leave this blank.' : '');
    Array.prototype.forEach.call($('links').children, function (row, index) {
      var link = state.links[index];
      var url = row.querySelector('.link-url');
      var label = row.querySelector('.link-label');
      setError(url, row.querySelector('.url-error'), link.url.trim() && !Signature.normalizeUrl(link.url) ? 'Enter a valid website URL, or leave this blank.' : '');
      setError(label, row.querySelector('.label-error'), link.url.trim() && !link.label.trim() ? 'Give this link a label.' : '');
    });
    $('copy').disabled = !valid;
    $('download').disabled = !valid;
    $('export-error').hidden = valid;
    return valid;
  }

  function render() {
    clearTimeout(renderTimer);
    validate();
    var preview = $('preview');
    // Invalid values are excluded by the renderer; exports stay blocked until fixed.
    preview.innerHTML = Signature.render(state);
    var imageUrl = Signature.normalizeUrl(state.imageUrl);
    if (imageUrl !== lastImageUrl) { imageFailed = false; lastImageUrl = imageUrl; }
    $('image-status').classList.toggle('warning', imageFailed);
    $('image-status').textContent = imageFailed ? 'This image could not load. Check that its URL opens an image without a login.' : imageUrl ? 'Images are loaded from your URL. Recipients may need to allow images.' : 'Add an image URL to place your photo or logo beside your details.';
    var img = preview.querySelector('img');
    if (img) {
      img.addEventListener('error', function () {
        if (imageUrl !== lastImageUrl) return;
        imageFailed = true;
        $('image-status').classList.add('warning');
        $('image-status').textContent = 'This image could not load. Check that its URL opens an image without a login.';
      });
      img.addEventListener('load', function () {
        if (imageUrl !== lastImageUrl) return;
        imageFailed = false;
        $('image-status').classList.remove('warning');
        $('image-status').textContent = 'Images are loaded from your URL. Recipients may need to allow images.';
      });
    }
    var hasContent = Boolean(preview.innerHTML.trim());
    $('empty-note').hidden = hasContent;
    $('copy').disabled = !valid || !hasContent;
    $('download').disabled = !valid || !hasContent;
    $('size-value').value = state.imageSize + ' px';
    $('color-value').textContent = state.accent;
  }

  function changed() {
    $('sample-note').textContent = 'Every change appears in the preview. Empty fields are left out.';
    $('action-status').textContent = '';
    $('manual-copy').hidden = true;
    validate();
    clearTimeout(renderTimer);
    // Avoid requesting a partial image URL for every keystroke.
    renderTimer = setTimeout(render, 350);
    save();
  }

  function createLinkRow(link) {
    var id = ++linkCounter;
    var row = document.createElement('div');
    row.className = 'link-row';
    row.innerHTML = '<div><label for="link-label-' + id + '">Label</label><input class="link-label" id="link-label-' + id + '" maxlength="80" aria-describedby="label-error-' + id + '"><p class="field-error label-error" id="label-error-' + id + '" hidden></p></div><div><label for="link-url-' + id + '">URL</label><input class="link-url" id="link-url-' + id + '" inputmode="url" placeholder="https://" aria-describedby="url-error-' + id + '"><p class="field-error url-error" id="url-error-' + id + '" hidden></p></div><button class="remove-link" type="button"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><path d="M6 6l12 12M6 18L18 6"/></svg></button>';
    var label = row.querySelector('.link-label');
    var url = row.querySelector('.link-url');
    var remove = row.querySelector('button');
    label.value = link.label;
    url.value = link.url;
    function nameRemove() { remove.setAttribute('aria-label', 'Remove ' + (link.label.trim() || 'untitled') + ' link'); }
    nameRemove();
    label.addEventListener('input', function () { link.label = label.value; nameRemove(); changed(); });
    url.addEventListener('input', function () { link.url = url.value; changed(); });
    remove.addEventListener('click', function () {
      var index = state.links.indexOf(link);
      state.links.splice(index, 1);
      row.remove();
      var next = $('links').children[index] || $('links').children[index - 1];
      (next ? next.querySelector('input') : $('add-link')).focus();
      changed(); render();
    });
    $('links').appendChild(row);
    return row;
  }

  function fillForm() {
    fields.forEach(function (key) { $(key).value = state[key]; });
    $('links').textContent = '';
    state.links.forEach(createLinkRow);
    render();
  }

  fields.forEach(function (key) {
    $(key).addEventListener('input', function () {
      state[key] = key === 'imageSize' ? Number($(key).value) : $(key).value;
      changed();
      if (key !== 'imageUrl') render();
    });
    $(key).addEventListener('change', render);
  });
  $('editor').addEventListener('submit', function (event) { event.preventDefault(); });
  $('add-link').addEventListener('click', function () {
    var link = { label: '', url: '' };
    state.links.push(link);
    createLinkRow(link).querySelector('input').focus();
    changed();
  });
  $('clear').addEventListener('click', function () {
    undoState = clone(state);
    state = { name: '', position: '', company: '', phone: '', email: '', imageUrl: '', imageAlt: '', imageSize: 88, accent: '#315c49', links: [] };
    fillForm(); changed();
    $('restore').textContent = 'Undo clear';
    $('restore').hidden = false;
    $('action-status').textContent = 'Details cleared. Use Undo clear to restore them.';
    $('name').focus();
  });
  $('restore').addEventListener('click', function () {
    if (!undoState) return;
    state = undoState; undoState = null;
    $('restore').hidden = true;
    fillForm(); changed(); persist();
    templateStatus('Your previous draft is restored.');
    $('action-status').textContent = 'Your previous details are restored.';
    $('name').focus();
  });

  function selectSignature() {
    $('preview').focus();
    var range = document.createRange();
    range.selectNodeContents($('preview'));
    var selection = window.getSelection();
    selection.removeAllRanges(); selection.addRange(range);
  }
  function fallbackCopy() {
    selectSignature();
    var copied = false;
    try { copied = document.execCommand('copy'); } catch (error) { /* Manual selection remains available. */ }
    if (copied) {
      $('action-status').textContent = 'Signature copied. Paste it into your email signature settings.';
    } else {
      $('manual-copy').hidden = false;
      $('action-status').textContent = 'Use the manual copy instructions below, or download the HTML.';
    }
  }
  $('select-signature').addEventListener('click', selectSignature);
  $('copy').addEventListener('click', async function () {
    render();
    if (!valid || !$('preview').innerHTML.trim()) return;
    $('manual-copy').hidden = true;
    try {
      if (!navigator.clipboard || !navigator.clipboard.write || !window.ClipboardItem) { fallbackCopy(); return; }
      await navigator.clipboard.write([new ClipboardItem({
        'text/html': new Blob([Signature.render(state)], { type: 'text/html' }),
        'text/plain': new Blob([Signature.plainText(state)], { type: 'text/plain' })
      })]);
      $('action-status').textContent = 'Signature copied. Paste it into your email signature settings.';
    } catch (error) { fallbackCopy(); }
  });
  $('download').addEventListener('click', function () {
    render();
    if (!valid || !$('preview').innerHTML.trim()) return;
    var html = '<!doctype html>\n<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Email signature</title></head><body>\n' + Signature.render(state) + '\n</body></html>\n';
    downloadFile(html, 'text/html;charset=utf-8', 'email-signature.html');
    $('action-status').textContent = 'HTML download started. Open the file to view your signature.';
  });
  window.addEventListener('pagehide', function () {
    clearTimeout(saveTimer);
    if (!storageUnavailable) {
      try { localStorage.setItem(draftKey, JSON.stringify(state)); } catch (error) { /* The page is closing; exports remain available next visit. */ }
    }
  });
  fillForm();
})();
