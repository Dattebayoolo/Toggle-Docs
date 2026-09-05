import { I18N as i18n } from './urdu.js';

/* ==========================================================================
 Toggle Docs — Rich Text Editor & Urdu Input Controller
 ========================================================================== */
'use strict';

let editorEl = null;
let savedRange = null;

function initEditor() {
  editorEl = document.getElementById('editor');
  if (!editorEl) return;

  // Save selection range when editor loses focus or selection changes
  document.addEventListener('selectionchange', onSelectionChange);
  editorEl.addEventListener('keyup', updateStats);
  editorEl.addEventListener('input', updateStats);
  editorEl.addEventListener('paste', handlePaste);

  setupToolbar();
  setupUrduKeyboard();
  updateStats();
}

/* ------------------------------------------------------------------------
   Selection & Range Utilities
   ------------------------------------------------------------------------ */
function saveSelection() {
  const sel = window.getSelection();
  if (sel && sel.rangeCount > 0) {
    const range = sel.getRangeAt(0);
    if (editorEl.contains(range.commonAncestorContainer)) {
      savedRange = range.cloneRange();
    }
  }
}

function restoreSelection() {
  if (!savedRange) return false;

  // Discard stale ranges that are no longer attached to the live DOM
  // (e.g. after openDocument() replaces editor.innerHTML)
  const startContainer = savedRange.startContainer;
  if (!startContainer || !startContainer.isConnected ||
      !editorEl || !editorEl.contains(startContainer)) {
    savedRange = null;
    return false;
  }

  const sel = window.getSelection();
  if (sel) {
    sel.removeAllRanges();
    sel.addRange(savedRange);
    return true;
  }
  return false;
}

function onSelectionChange() {
  saveSelection();
  updateToolbarActiveStates();
}

function handlePaste(e) {
  e.preventDefault();

  const clipboard = (e.clipboardData || window.clipboardData) || {};
  const html = clipboard.getData && clipboard.getData('text/html');
  const text = clipboard.getData && clipboard.getData('text/plain');

  // Sanitize external HTML before inserting: strip scripts, styles, event
  // handlers and all attributes except a small formatting allowlist.
  if (html && html.trim()) {
    const clean = sanitizePastedHtml(html);
    document.execCommand('insertHTML', false, clean);
  } else if (text) {
    // Plain text: keep line breaks, escape everything else.
    const escaped = escapeHtml(text).replace(/\r?\n/g, '<br>');
    document.execCommand('insertHTML', false, escaped);
  }

  setTimeout(updateStats, 10);
}

/* ------------------------------------------------------------------------
   Paste Sanitizer (allowlist-based)
   ------------------------------------------------------------------------ */
var PASTE_ALLOWED_TAGS = {
  P: 1, BR: 1, DIV: 1, SPAN: 1, B: 1, STRONG: 1, I: 1, EM: 1, U: 1, S: 1,
  STRIKE: 1, H1: 1, H2: 1, H3: 1, H4: 1, UL: 1, OL: 1, LI: 1,
  BLOCKQUOTE: 1, PRE: 1, CODE: 1, A: 1, SUB: 1, SUP: 1,
  TABLE: 1, THEAD: 1, TBODY: 1, TR: 1, TD: 1, TH: 1
};

var PASTE_ALLOWED_ATTRS = { href: 1, dir: 1, colspan: 1, rowspan: 1 };

function sanitizePastedHtml(html) {
  var tpl = document.createElement('template');
  tpl.innerHTML = html;

  (function clean(node) {
    var children = Array.prototype.slice.call(node.childNodes);
    children.forEach(function (child) {
      if (child.nodeType === 1) { // element
        var tag = child.nodeName;
        if (tag === 'SCRIPT' || tag === 'STYLE' || tag === 'IFRAME' ||
            tag === 'OBJECT' || tag === 'EMBED' || tag === 'LINK' ||
            tag === 'META' || tag === 'SVG' || tag === 'IMG' ||
            tag === 'VIDEO' || tag === 'AUDIO' || tag === 'FORM' ||
            tag === 'INPUT' || tag === 'BUTTON' || tag === 'TEXTAREA') {
          child.parentNode.removeChild(child);
          return;
        }
        if (!PASTE_ALLOWED_TAGS[tag]) {
          // Unknown but harmless container: unwrap, keep its children.
          var frag = document.createDocumentFragment();
          while (child.firstChild) frag.appendChild(child.firstChild);
          child.parentNode.replaceChild(frag, child);
          // Recurse into the moved children.
          Array.prototype.slice.call(frag.childNodes).forEach(function (n) {
            if (n.nodeType === 1) clean(n);
          });
          return;
        }
        // Strip all attributes except the allowlist; drop javascript: URLs.
        Array.prototype.slice.call(child.attributes).forEach(function (attr) {
          var name = attr.name.toLowerCase();
          var keep = PASTE_ALLOWED_ATTRS[name] === 1;
          if (keep && name === 'href' &&
              /^\s*(javascript|data|vbscript):/i.test(attr.value)) {
            keep = false;
          }
          if (!keep) child.removeAttribute(attr.name);
        });
        clean(child);
      } else if (child.nodeType === 8) { // comment
        child.parentNode.removeChild(child);
      }
    });
  })(tpl.content);

  return tpl.innerHTML;
}

/* ------------------------------------------------------------------------
   Toolbar Formatting Commands
   ------------------------------------------------------------------------ */
function setupToolbar() {
  const toolbar = document.getElementById('toolbar');
  if (!toolbar) return;

  // Command buttons with data-cmd
  toolbar.querySelectorAll('button[data-cmd]').forEach(function (btn) {
    btn.addEventListener('click', function (e) {
      e.preventDefault();
      const cmd = btn.getAttribute('data-cmd');
      if (!cmd) return;

      if (cmd === 'link') {
        openLinkDialog();
        return;
      }

      executeCommand(cmd);
    });
  });

  // Direction buttons
  toolbar.querySelectorAll('button[data-dir]').forEach(function (btn) {
    btn.addEventListener('click', function (e) {
      e.preventDefault();
      const dir = btn.getAttribute('data-dir');
      setParagraphDirection(dir);
    });
  });

  // Block type selector (p, h1, h2, h3, blockquote, pre)
  const blockSelect = document.getElementById('block-type');
  if (blockSelect) {
    blockSelect.addEventListener('change', function () {
      const val = blockSelect.value;
      if (val === 'p') {
        document.execCommand('formatBlock', false, '<p>');
      } else if (val === 'blockquote') {
        document.execCommand('formatBlock', false, '<blockquote>');
      } else if (val === 'pre') {
        document.execCommand('formatBlock', false, '<pre>');
      } else {
        document.execCommand('formatBlock', false, '<' + val + '>');
      }
      editorEl.focus();
      updateToolbarActiveStates();
    });
  }

  // Font family selector
  const fontSelect = document.getElementById('font');
  if (fontSelect) {
    fontSelect.addEventListener('change', function () {
      const val = fontSelect.value;
      if (editorEl) {
        editorEl.setAttribute('data-font', val);
      }
      editorEl.focus();
    });
  }

  // Zoom selector
  const zoomSelect = document.getElementById('zoom');
  if (zoomSelect) {
    zoomSelect.addEventListener('change', function () {
      const zoomVal = parseInt(zoomSelect.value, 10) / 100;
      const container = document.getElementById('paper-container');
      if (container) {
        container.style.transform = 'scale(' + zoomVal + ')';
      }
    });
  }

  // Text color picker
  const colorText = document.getElementById('color-text');
  const colorTextBar = document.getElementById('color-text-bar');
  if (colorText) {
    colorText.addEventListener('input', function () {
      const color = colorText.value;
      if (colorTextBar) colorTextBar.style.backgroundColor = color;
      restoreSelection();
      document.execCommand('foreColor', false, color);
    });
  }

  // Highlight color picker
  const colorHighlight = document.getElementById('color-highlight');
  const colorHighlightBar = document.getElementById('color-highlight-bar');
  if (colorHighlight) {
    colorHighlight.addEventListener('input', function () {
      const color = colorHighlight.value;
      if (colorHighlightBar) colorHighlightBar.style.backgroundColor = color;
      restoreSelection();
      document.execCommand('hiliteColor', false, color);
    });
  }

  // Print button
  const printBtn = toolbar.querySelector('button[data-action="print-btn"]');
  if (printBtn) {
    printBtn.addEventListener('click', function () {
      window.print();
    });
  }
}

function executeCommand(cmd, value) {
  editorEl.focus();
  restoreSelection();
  document.execCommand(cmd, false, value || null);
  updateToolbarActiveStates();
  updateStats();
}

function setParagraphDirection(dir) {
  editorEl.focus();
  restoreSelection();

  const sel = window.getSelection();
  if (!sel || !sel.anchorNode) return;

  let node = sel.anchorNode;
  if (node.nodeType === 3) node = node.parentNode;

  // Find nearest block parent
  while (node && node !== editorEl && !['P', 'H1', 'H2', 'H3', 'BLOCKQUOTE', 'PRE', 'LI', 'DIV'].includes(node.nodeName)) {
    node = node.parentNode;
  }

  if (node && node !== editorEl) {
    node.setAttribute('dir', dir);
    if (dir === 'rtl') {
      node.style.fontFamily = "'Noto Nastaliq Urdu', 'Noto Naskh Arabic', serif";
      node.style.textAlign = 'right';
    } else {
      node.style.fontFamily = '';
      node.style.textAlign = 'left';
    }
  } else {
    editorEl.setAttribute('dir', dir);
  }

  updateToolbarActiveStates();
}

/* ------------------------------------------------------------------------
   Toolbar State Synchronization
   ------------------------------------------------------------------------ */
function updateToolbarActiveStates() {
  const toolbar = document.getElementById('toolbar');
  if (!toolbar) return;

  const cmds = ['bold', 'italic', 'underline', 'strikeThrough', 'justifyLeft', 'justifyCenter', 'justifyRight', 'justifyFull', 'insertUnorderedList', 'insertOrderedList'];
  cmds.forEach(function (cmd) {
    const btn = toolbar.querySelector('button[data-cmd="' + cmd + '"]');
    if (btn) {
      try {
        if (document.queryCommandState(cmd)) {
          btn.classList.add('active');
        } else {
          btn.classList.remove('active');
        }
      } catch (e) {
        btn.classList.remove('active');
      }
    }
  });

  // Paragraph direction buttons
  const sel = window.getSelection();
  if (sel && sel.anchorNode) {
    let node = sel.anchorNode;
    if (node.nodeType === 3) node = node.parentNode;
    while (node && node !== editorEl && !(node.getAttribute && node.getAttribute('dir'))) {
      node = node.parentNode;
    }
    const dir = (node && node.getAttribute && node.getAttribute('dir')) || editorEl.getAttribute('dir') || 'ltr';
    toolbar.querySelectorAll('.dir-btn').forEach(function (b) {
      if (b.getAttribute('data-dir') === dir) {
        b.classList.add('active');
      } else {
        b.classList.remove('active');
      }
    });
  }
}

/* ------------------------------------------------------------------------
   Urdu Virtual Keyboard Handling
   ------------------------------------------------------------------------ */
function setupUrduKeyboard() {
  const kbDrawer = document.getElementById('urdu-kb');
  const toggleBtn = document.getElementById('btn-toggle-kb');
  const statusbarBtn = document.getElementById('btn-statusbar-kb');
  const closeBtn = document.getElementById('kb-btn-close');
  const minBtn = document.getElementById('kb-btn-minimize');

  function toggleKb() {
    if (!kbDrawer) return;
    kbDrawer.classList.toggle('hidden');
    if (toggleBtn) toggleBtn.classList.toggle('active', !kbDrawer.classList.contains('hidden'));
  }

  if (toggleBtn) toggleBtn.addEventListener('click', toggleKb);
  if (statusbarBtn) statusbarBtn.addEventListener('click', toggleKb);
  if (closeBtn) closeBtn.addEventListener('click', function () {
    if (kbDrawer) kbDrawer.classList.add('hidden');
    if (toggleBtn) toggleBtn.classList.remove('active');
  });

  if (minBtn) minBtn.addEventListener('click', function () {
    if (kbDrawer) kbDrawer.classList.toggle('minimized');
  });

  // Populate phrases and keys from TDI18N if available
  const phrasesContainer = document.getElementById('kb-phrases');
  const rowsContainer = document.getElementById('kb-rows');
  const specialsContainer = document.getElementById('kb-specials');

  if (phrasesContainer && i18n.KB_PHRASES) {
    phrasesContainer.innerHTML = '';
    i18n.KB_PHRASES.forEach(function (phrase) {
      const chip = document.createElement('button');
      chip.className = 'kb-phrase-chip';
      chip.textContent = phrase;
      chip.addEventListener('click', function () {
        insertTextAtCaret(phrase + ' ');
      });
      phrasesContainer.appendChild(chip);
    });
  }

  if (rowsContainer && i18n.KB_ROWS) {
    rowsContainer.innerHTML = '';
    i18n.KB_ROWS.forEach(function (rowChars) {
      const row = document.createElement('div');
      row.className = 'kb-row';
      rowChars.forEach(function (ch) {
        const key = document.createElement('button');
        key.className = 'kb-key';
        key.textContent = ch;
        key.setAttribute('data-insert', ch);
        key.addEventListener('click', function () {
          insertTextAtCaret(ch);
        });
        row.appendChild(key);
      });
      rowsContainer.appendChild(row);
    });
  }

  if (specialsContainer && i18n.KB_SPECIALS) {
    specialsContainer.innerHTML = '';
    i18n.KB_SPECIALS.forEach(function (sp) {
      const key = document.createElement('button');
      key.className = 'kb-key';
      key.textContent = sp.label;
      key.setAttribute('data-insert', sp.ch);
      key.addEventListener('click', function () {
        insertTextAtCaret(sp.ch);
      });
      specialsContainer.appendChild(key);
    });
  }

  // Action keys (Space, Backspace, Enter)
  if (kbDrawer) {
    const spaceKey = kbDrawer.querySelector('.kb-key-space');
    if (spaceKey) {
      spaceKey.addEventListener('click', function () {
        insertTextAtCaret(' ');
      });
    }

    kbDrawer.querySelectorAll('button[data-action="backspace"]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        editorEl.focus();
        restoreSelection();
        document.execCommand('delete', false, null);
        updateStats();
      });
    });

    kbDrawer.querySelectorAll('button[data-action="enter"]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        insertTextAtCaret('\n');
      });
    });
  }
}

function insertTextAtCaret(text) {
  editorEl.focus();
  restoreSelection();

  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0) return;

  const range = sel.getRangeAt(0);

  // If the caret is outside the editor (e.g. it moved to <body> after a
  // toolbar click), re-anchor it to the start of the editor instead of
  // inserting text into the wrong node.
  if (!editorEl || !editorEl.contains(range.commonAncestorContainer)) {
    range.selectNodeContents(editorEl);
    range.collapse(true);
    sel.removeAllRanges();
    sel.addRange(range);
  }

  range.deleteContents();

  if (text === '\n') {
    const br = document.createElement('br');
    range.insertNode(br);
    range.setStartAfter(br);
    range.collapse(true);
  } else {
    const textNode = document.createTextNode(text);
    range.insertNode(textNode);
    range.setStartAfter(textNode);
    range.collapse(true);
  }

  sel.removeAllRanges();
  sel.addRange(range);
  saveSelection();
  updateStats();
}

/* ------------------------------------------------------------------------
   Link Modal Dialog
   ------------------------------------------------------------------------ */
function openLinkDialog() {
  saveSelection();
  const modal = document.getElementById('modal-link');
  const textInput = document.getElementById('link-text-input');
  const urlInput = document.getElementById('link-url-input');
  const applyBtn = document.getElementById('btn-link-apply');
  const removeBtn = document.getElementById('btn-link-remove');

  if (!modal || !urlInput || !textInput || !applyBtn) return;

  // Check if selection is already a link
  let existingLink = null;
  if (savedRange) {
    let node = savedRange.commonAncestorContainer;
    if (node.nodeType === 3) node = node.parentNode;
    if (node && node.nodeName === 'A') existingLink = node;
  }

  if (existingLink) {
    urlInput.value = existingLink.getAttribute('href') || '';
    textInput.value = existingLink.textContent || '';
    if (removeBtn) removeBtn.classList.remove('hidden');
  } else {
    urlInput.value = '';
    textInput.value = savedRange ? savedRange.toString() : '';
    if (removeBtn) removeBtn.classList.add('hidden');
  }

  modal.classList.remove('hidden');
  urlInput.focus();

  function onApply() {
    const url = urlInput.value.trim();
    if (url) {
      restoreSelection();
      const formattedUrl = (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('mailto:')) ? url : 'https://' + url;
      document.execCommand('createLink', false, formattedUrl);
    }
    closeModal();
  }

  function onRemove() {
    restoreSelection();
    document.execCommand('unlink', false, null);
    closeModal();
  }

  function closeModal() {
    modal.classList.add('hidden');
    applyBtn.removeEventListener('click', onApply);
    if (removeBtn) removeBtn.removeEventListener('click', onRemove);
  }

  applyBtn.addEventListener('click', onApply);
  if (removeBtn) removeBtn.addEventListener('click', onRemove);
}

/* ------------------------------------------------------------------------
   Document Statistics (Words, Characters, Reading Time)
   ------------------------------------------------------------------------ */
function updateStats() {
  if (!editorEl) return;
  const text = editorEl.innerText || '';

  // Matches Unicode words including Urdu & English
  const wordsMatch = text.match(/[\p{L}\p{N}]+/gu);
  const words = wordsMatch ? wordsMatch.length : 0;
  const chars = text.replace(/\n/g, '').length;
  const readTime = Math.max(1, Math.ceil(words / 200));

  const statWords = document.getElementById('stat-words');
  const statChars = document.getElementById('stat-chars');
  const statRead = document.getElementById('stat-readtime');

  if (statWords) statWords.textContent = words;
  if (statChars) statChars.textContent = chars;
  if (statRead) statRead.textContent = readTime;
}

// Export to global
export const TDEditor = {
  init: initEditor,
  insertTextAtCaret: insertTextAtCaret,
  updateStats: updateStats,
  setParagraphDirection: setParagraphDirection,
  executeCommand: executeCommand
};

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initEditor);
} else {
  initEditor();
}

export { TDEditor as Editor };
