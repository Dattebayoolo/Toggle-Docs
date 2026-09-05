/* ==========================================================================
   Toggle Docs — Find & Replace Module (ES module)
   Google Docs-style floating Find & Replace dialog with live navigation,
   case-sensitivity options, and single/bulk replace.
   ========================================================================== */
'use strict';

import { showToast } from './state.js';
import { scheduleAutoSave } from './documents.js';
import { Editor } from './editor.js';

let barEl = null;
let findInput = null;
let replaceInput = null;
let matchCountEl = null;
let caseCheck = null;
let currentMatches = [];
let currentMatchIndex = -1;

export function initFindReplace() {
  barEl = document.getElementById('find-replace-bar');
  if (!barEl) return;

  findInput = document.getElementById('find-input');
  replaceInput = document.getElementById('replace-input');
  matchCountEl = document.getElementById('find-match-count');
  caseCheck = document.getElementById('find-case-match');

  const btnNext = document.getElementById('btn-find-next');
  const btnPrev = document.getElementById('btn-find-prev');
  const btnReplace = document.getElementById('btn-find-replace');
  const btnReplaceAll = document.getElementById('btn-find-replace-all');
  const btnClose = document.getElementById('btn-find-close');

  if (findInput) {
    findInput.addEventListener('input', () => performSearch());
    findInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        if (e.shiftKey) findPrev();
        else findNext();
      } else if (e.key === 'Escape') {
        closeFindReplace();
      }
    });
  }

  if (replaceInput) {
    replaceInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        replaceCurrent();
      } else if (e.key === 'Escape') {
        closeFindReplace();
      }
    });
  }

  if (caseCheck) caseCheck.addEventListener('change', () => performSearch());
  if (btnNext) btnNext.addEventListener('click', findNext);
  if (btnPrev) btnPrev.addEventListener('click', findPrev);
  if (btnReplace) btnReplace.addEventListener('click', replaceCurrent);
  if (btnReplaceAll) btnReplaceAll.addEventListener('click', replaceAll);
  if (btnClose) btnClose.addEventListener('click', closeFindReplace);
}

export function openFindReplace() {
  if (!barEl) initFindReplace();
  if (!barEl) return;

  barEl.classList.remove('hidden');

  // Pre-fill with current selection if available
  const sel = window.getSelection();
  if (sel && !sel.isCollapsed && sel.toString().trim()) {
    findInput.value = sel.toString().trim();
  }

  findInput.focus();
  findInput.select();
  performSearch();
}

export function closeFindReplace() {
  if (barEl) barEl.classList.add('hidden');
  clearHighlights();
  currentMatches = [];
  currentMatchIndex = -1;
  const editor = document.getElementById('editor');
  if (editor) editor.focus();
}

function clearHighlights() {
  const editor = document.getElementById('editor');
  if (!editor) return;

  const marks = editor.querySelectorAll('mark.td-find-highlight');
  marks.forEach(mark => {
    const parent = mark.parentNode;
    if (parent) {
      while (mark.firstChild) {
        parent.insertBefore(mark.firstChild, mark);
      }
      parent.removeChild(mark);
      parent.normalize();
    }
  });
}

function performSearch() {
  clearHighlights();
  currentMatches = [];
  currentMatchIndex = -1;

  if (!findInput || !matchCountEl) return;
  const query = findInput.value;
  if (!query) {
    matchCountEl.textContent = '0 of 0';
    return;
  }

  const editor = document.getElementById('editor');
  if (!editor) return;

  const isCase = caseCheck && caseCheck.checked;
  const targetText = isCase ? query : query.toLowerCase();

  // Walk text nodes in editor to locate matches
  const walker = document.createTreeWalker(editor, NodeFilter.SHOW_TEXT, null, false);
  const textNodes = [];
  let node;
  while ((node = walker.nextNode())) {
    textNodes.push(node);
  }

  textNodes.forEach(textNode => {
    const content = textNode.nodeValue;
    const compareContent = isCase ? content : content.toLowerCase();
    let pos = 0;
    let index;

    while ((index = compareContent.indexOf(targetText, pos)) !== -1) {
      currentMatches.push({
        node: textNode,
        start: index,
        end: index + query.length,
        length: query.length
      });
      pos = index + query.length;
    }
  });

  if (currentMatches.length > 0) {
    currentMatchIndex = 0;
    highlightMatches();
    updateCounter();
  } else {
    matchCountEl.textContent = '0 of 0';
  }
}

function highlightMatches() {
  clearHighlights();

  const editor = document.getElementById('editor');
  if (!editor || currentMatches.length === 0) return;

  const query = findInput.value;
  const isCase = caseCheck && caseCheck.checked;
  const targetText = isCase ? query : query.toLowerCase();

  const walker = document.createTreeWalker(editor, NodeFilter.SHOW_TEXT, null, false);
  const textNodes = [];
  let node;
  while ((node = walker.nextNode())) {
    textNodes.push(node);
  }

  let matchCounter = 0;
  textNodes.forEach(textNode => {
    const content = textNode.nodeValue;
    const compareContent = isCase ? content : content.toLowerCase();
    let index = compareContent.indexOf(targetText);

    if (index !== -1) {
      const matchLength = query.length;
      const beforeText = content.substring(0, index);
      const matchText = content.substring(index, index + matchLength);
      const afterText = content.substring(index + matchLength);

      const mark = document.createElement('mark');
      mark.className = 'td-find-highlight' + (matchCounter === currentMatchIndex ? ' active' : '');
      mark.textContent = matchText;
      mark.dataset.matchIdx = matchCounter;

      const parent = textNode.parentNode;
      if (parent) {
        if (beforeText) parent.insertBefore(document.createTextNode(beforeText), textNode);
        parent.insertBefore(mark, textNode);
        if (afterText) parent.insertBefore(document.createTextNode(afterText), textNode);
        parent.removeChild(textNode);
      }
      matchCounter++;
    }
  });

  scrollActiveIntoView();
}

function scrollActiveIntoView() {
  const editor = document.getElementById('editor');
  if (!editor) return;

  const activeMark = editor.querySelector('mark.td-find-highlight.active');
  if (activeMark) {
    activeMark.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
}

function updateCounter() {
  if (matchCountEl) {
    if (currentMatches.length === 0) {
      matchCountEl.textContent = '0 of 0';
    } else {
      matchCountEl.textContent = `${currentMatchIndex + 1} of ${currentMatches.length}`;
    }
  }
}

function findNext() {
  if (currentMatches.length === 0) return;
  currentMatchIndex = (currentMatchIndex + 1) % currentMatches.length;
  updateActiveHighlight();
  updateCounter();
}

function findPrev() {
  if (currentMatches.length === 0) return;
  currentMatchIndex = (currentMatchIndex - 1 + currentMatches.length) % currentMatches.length;
  updateActiveHighlight();
  updateCounter();
}

function updateActiveHighlight() {
  const editor = document.getElementById('editor');
  if (!editor) return;

  const allMarks = editor.querySelectorAll('mark.td-find-highlight');
  allMarks.forEach((m, idx) => {
    m.classList.toggle('active', idx === currentMatchIndex);
  });
  scrollActiveIntoView();
}

function replaceCurrent() {
  const editor = document.getElementById('editor');
  if (!editor || currentMatches.length === 0 || currentMatchIndex === -1) return;

  const activeMark = editor.querySelector('mark.td-find-highlight.active');
  if (activeMark) {
    const replacement = replaceInput ? replaceInput.value : '';
    const textNode = document.createTextNode(replacement);
    activeMark.parentNode.replaceChild(textNode, activeMark);
    scheduleAutoSave();
    Editor.updateStats();
    performSearch();
    showToast('Replaced 1 occurrence');
  }
}

function replaceAll() {
  const editor = document.getElementById('editor');
  if (!editor || !findInput.value) return;

  const query = findInput.value;
  const replacement = replaceInput ? replaceInput.value : '';
  const isCase = caseCheck && caseCheck.checked;

  clearHighlights();

  const count = currentMatches.length;
  if (count === 0) {
    showToast('No matches to replace');
    return;
  }

  // Regex replace across editor HTML
  const regexFlags = isCase ? 'g' : 'gi';
  const escapedQuery = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(escapedQuery, regexFlags);

  // Walk text nodes to safely replace without breaking tags
  const walker = document.createTreeWalker(editor, NodeFilter.SHOW_TEXT, null, false);
  const textNodes = [];
  let node;
  while ((node = walker.nextNode())) {
    textNodes.push(node);
  }

  let replacedCount = 0;
  textNodes.forEach(tNode => {
    if (regex.test(tNode.nodeValue)) {
      tNode.nodeValue = tNode.nodeValue.replace(regex, () => {
        replacedCount++;
        return replacement;
      });
    }
  });

  scheduleAutoSave();
  Editor.updateStats();
  performSearch();
  showToast(`Replaced ${replacedCount} occurrence${replacedCount === 1 ? '' : 's'}`);
}
