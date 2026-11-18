// Switch between sections.
const items = document.querySelectorAll('[data-section]');
const sections = document.querySelectorAll('.section');

function showSection(item) {
  sections.forEach(section => {
    section.hidden = section.id !== item.dataset.section;
  });
  items.forEach(link => {
    link.classList.toggle('active', link === item);
    link.setAttribute('aria-pressed', String(link === item));
  });
}

items.forEach(item => {
  item.addEventListener('click', () => showSection(item));
  item.addEventListener('keydown', event => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      showSection(item);
    }
  });
});

//подсветка HTML-кода и нумерация строк.

function tokenizeHtml(src) {
  const tokens = [];
  const push = (cls, text) => { if (text) tokens.push([cls, text]); };
  const tagRe = /<!--[\s\S]*?-->|<\/?[A-Za-z][^>]*>/g;
  const attrRe = /([^\s"'<>\/=]+)(?:(\s*=\s*)("[^"]*"|'[^']*'|[^\s"'=<>`]+))?/g;
  let last = 0;
  let match;

  while ((match = tagRe.exec(src))) {
    push('', src.slice(last, match.index));
    last = tagRe.lastIndex;
    const chunk = match[0];

    if (chunk.startsWith('<!--')) {
      push('comment', chunk);
      continue;
    }

    // <  или </   |  имя тега  |  атрибуты  |  > или />
    const parts = /^(<\/?)([A-Za-z][\w:-]*)([\s\S]*?)(\/?>)$/.exec(chunk);
    push('punct', parts[1]);
    push('tag', parts[2]);

    const attrs = parts[3];
    let attrLast = 0;
    let attr;
    attrRe.lastIndex = 0;
    while ((attr = attrRe.exec(attrs))) {
      push('', attrs.slice(attrLast, attr.index));
      push('attr', attr[1]);
      if (attr[2] !== undefined) {
        push('punct', attr[2]);
        push('string', attr[3]);
      }
      attrLast = attrRe.lastIndex;
    }
    push('', attrs.slice(attrLast));
    push('punct', parts[4]);
  }

  push('', src.slice(last));
  return tokens;
}

// Разбивает токены по строкам (токен может занимать несколько строк, например комментарий).
function splitTokensIntoLines(tokens) {
  const lines = [[]];
  tokens.forEach(([cls, text]) => {
    text.split('\n').forEach((part, index) => {
      if (index > 0) lines.push([]);
      if (part) lines[lines.length - 1].push([cls, part]);
    });
  });
  return lines;
}

function renderCodeBlock(pre) {
  const codeEl = pre.querySelector('code') || pre;
  const raw = codeEl.textContent
    .replace(/\r\n?/g, '\n')
    .replace(/^\n+/, '')
    .replace(/\s+$/, '');

  pre.dataset.raw = raw;

  const lines = splitTokensIntoLines(tokenizeHtml(raw));
  const fragment = document.createDocumentFragment();

  lines.forEach(line => {
    const row = document.createElement('span');
    row.className = 'code-line';

    const text = document.createElement('span');
    text.className = 'code-text';

    line.forEach(([cls, str]) => {
      if (!cls) {
        text.append(str);
        return;
      }
      const token = document.createElement('span');
      token.className = 'tok-' + cls;
      token.textContent = str;   // textContent — никакого ручного экранирования < и &
      text.append(token);
    });

    row.append(text);
    fragment.append(row);
  });

  codeEl.replaceChildren(fragment);
  pre.style.setProperty('--digits', String(lines.length).length);
}

document.querySelectorAll('pre.code-box').forEach(renderCodeBlock);

//Show a temporary notification; repeated clicks restart its timer.
let toastTimer;
function showToast(message) {
  const toast = document.getElementById('status');
  clearTimeout(toastTimer);
  toast.textContent = message;
  toast.classList.add('visible');
  toastTimer = setTimeout(() => toast.classList.remove('visible'), 1800);
}

// Copy the text from the matching card field.
document.querySelectorAll('[data-copy]').forEach(button => {
  button.addEventListener('click', async () => {
    const field = document.getElementById(button.dataset.copy);
    //для блоков кода берём исходный текст из data-raw, а не textContent
    const text = field.dataset.raw ?? field.value ?? field.textContent;
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
      } else {
        const buffer = document.createElement('textarea');
        buffer.value = text;
        buffer.style.cssText = 'position:fixed;left:-9999px';
        document.body.append(buffer);
        try {
          buffer.select();
          if (!document.execCommand('copy')) throw new Error();
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