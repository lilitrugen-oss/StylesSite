/*
 * Polaris Penumbra — общий script.js
 * Навбар остаётся в index.html; страницы открываются внутри iframe.
 * Дополнительно исправляет отступы кода внутри загруженных страниц.
 * HTML и CSS менять не нужно.
 */
(() => {
  'use strict';

  const pages = ['cave_css', 'den_css', 'html_codes', 'tutorials_and_rules'];
  const tabs = [...document.querySelectorAll('.nav-item[data-page]')];
  const frame = document.getElementById('section-frame');

  // Remove only the indentation inherited from the HTML file's formatting.
  // Preserve the indentation *inside* the code sample.
  function normalizeCodeBlocks(doc) {
    doc.querySelectorAll('.code-box code').forEach(block => {
      const lines = block.textContent.replace(/\r\n?/g, '\n').split('\n');

      // Empty first/last lines are usually introduced by <pre><code> markup.
      while (lines.length && !lines[0].trim()) lines.shift();
      while (lines.length && !lines[lines.length - 1].trim()) lines.pop();

      if (!lines.length) {
        block.textContent = '';
        return;
      }

      // Spaces copied from editors can include non-breaking whitespace.
      const normalized = lines.map(line =>
        line.replace(/^[ \t\u00a0\u2007\u202f]+/, prefix =>
          prefix.replace(/[\u00a0\u2007\u202f]/g, ' ')
        )
      );

      // Use the first non-empty line as the beginning of the sample.
      // This also handles snippets where a later line has a smaller indent.
      const firstLine = normalized.find(line => line.trim());
      const baseIndent = (firstLine.match(/^[ \t]*/) || [''])[0].length;

      block.textContent = normalized.map(line => {
        if (!line.trim()) return '';
        const currentIndent = (line.match(/^[ \t]*/) || [''])[0].length;
        return line.slice(Math.min(baseIndent, currentIndent));
      }).join('\n');
    });
  }

  // Preserve the original Copy buttons and toast for documents that do not
  // already have the section-specific pages/page.js script attached.
  const copyDocuments = new WeakSet();
  function setupCopyButtons(doc) {
    if (copyDocuments.has(doc)) return;
    copyDocuments.add(doc);

    let toastTimer;
    function showToast(message) {
      const toast = doc.getElementById('status');
      if (!toast) return;
      clearTimeout(toastTimer);
      toast.textContent = message;
      toast.classList.add('visible');
      toastTimer = setTimeout(() => toast.classList.remove('visible'), 1800);
    }

    doc.querySelectorAll('[data-copy]').forEach(button => {
      button.addEventListener('click', async () => {
        const field = doc.getElementById(button.dataset.copy);
        if (!field) return;
        const value = field.value ?? field.textContent;
        try {
          if (navigator.clipboard && window.isSecureContext) {
            await navigator.clipboard.writeText(value);
          } else {
            const buffer = doc.createElement('textarea');
            buffer.value = value;
            buffer.style.cssText = 'position:fixed;left:-9999px';
            doc.body.append(buffer);
            try {
              buffer.select();
              if (!doc.execCommand('copy')) throw new Error('Copy failed');
            } finally {
              buffer.remove();
              button.focus();
            }
          }
          showToast(field.classList.contains('code-box') ? 'HTML code copied!' : 'Link copied!');
        } catch {
          showToast('Copy failed. Select the text and press Ctrl+C.');
        }
      });
    });
  }

  // If the page contains code directly, format it as in the original script.
  normalizeCodeBlocks(document);
  setupCopyButtons(document);

  // A separate HTML page inside iframe has its own DOM. Format it ON LOAD,
  // after the child page (and its own page.js, if any) has finished loading.
  if (frame) {
    frame.addEventListener('load', () => {
      try {
        const child = frame.contentDocument;
        if (!child) return;
        normalizeCodeBlocks(child);
        // Do not install a second Copy handler when pages/page.js already
        // handles it (the standard structure of this website).
        const ownsCopy = [...child.scripts].some(script =>
          /(?:^|\/)page\.js(?:[?#]|$)/.test(script.getAttribute('src') || '')
        );
        if (!ownsCopy) setupCopyButtons(child);
      } catch (error) {
        // Some browsers restrict access between local file:// documents.
        // In that case code in the child page must be formatted by pages/page.js.
        console.warn('Cannot format iframe content from the parent page:', error);
      }
    });
  }

  // Keep the existing persistent navigation. No redirect to a standalone page.
  function pageFromHash() {
    const name = decodeURIComponent(location.hash.slice(1));
    return pages.includes(name) ? name : 'cave_css';
  }

  function showPage() {
    const selected = pageFromHash();

    tabs.forEach(tab => {
      const active = tab.dataset.page === selected;
      tab.classList.toggle('active', active);
      tab.setAttribute('aria-pressed', String(active));
      if (active) tab.setAttribute('aria-current', 'page');
      else tab.removeAttribute('aria-current');
    });

    if (!frame) return;
    const url = `pages/${selected}.html`;
    if (frame.getAttribute('src') !== url) frame.setAttribute('src', url);
    frame.title = tabs.find(tab => tab.dataset.page === selected)?.textContent.trim() || selected;
  }

  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const hash = `#${tab.dataset.page}`;
      if (location.hash !== hash) location.hash = hash;
      else showPage();
    });

    tab.addEventListener('keydown', event => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        tab.click();
      }
    });
  });

  window.addEventListener('hashchange', showPage);
  showPage();
})();
