/* ==========================================================================
   Toggle Docs - Collaborative Workspace Module (ES module)
   Google Docs-style sharing UI + live multi-window collaboration.
   - Share modal: per-doc people access, roles, general access, copy link.
   - Live sync: BroadcastChannel keeps every open window of the same
     document in real time (typed updates, title, share settings).
   100% local-first: nothing ever leaves the device.
   ========================================================================== */

import { state, showToast } from './state.js';
import { DB } from './db.js';
import { showEditor } from './dashboard.js';

'use strict';

const CHANNEL_NAME = 'toggle-docs-collab';
const ROLE_LABELS = { viewer: 'Viewer', commenter: 'Commenter', editor: 'Editor' };
const AVATAR_COLORS = ['#0e7a3d', '#1a73e8', '#b06000', '#8430ce', '#c5221f', '#0b8043'];
const PEER_TTL = 10000;      // ms without a heartbeat before a peer is pruned
const HEARTBEAT_MS = 3000;   // presence ping interval
const MAX_AVATARS = 3;       // visible chips before a "+N" overflow chip

// Unique id for this window/session + peers we know about.
const CLIENT_ID = 'c_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
const PEERS = new Map(); // id -> { name, docId, lastSeen }

let channel = null;
let broadcastTimer = null;

function getShare(doc) {
  if (!doc.share) doc.share = { general: 'restricted', generalRole: 'viewer', users: [] };
  return doc.share;
}

function isShared(doc) {
  return !!(doc && doc.share && (doc.share.general === 'link' || (doc.share.users && doc.share.users.length)));
}

function initialsOf(name) {
  const clean = String(name || '?').replace(/[^a-zA-Z0-9 ]/g, ' ').trim();
  const parts = clean.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function colorFor(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) hash = (hash * 31 + str.charCodeAt(i)) >>> 0;
  return AVATAR_COLORS[hash % AVATAR_COLORS.length];
}

function escapeUser(str) {
  return String(str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/* ------------------------------------------------------------------
   Live collaboration (BroadcastChannel across same-device windows)
   ------------------------------------------------------------------ */

function broadcast(msg) {
  if (channel) {
    try { channel.postMessage(msg); } catch (e) { /* channel closed */ }
  }
}

function scheduleContentBroadcast() {
  clearTimeout(broadcastTimer);
  broadcastTimer = setTimeout(() => {
    const doc = state.currentDoc;
    if (!doc) return;
    const editor = document.getElementById('editor');
    const titleInput = document.getElementById('doc-title');
    broadcast({
      type: 'doc-update',
      from: CLIENT_ID,
      id: doc.id,
      title: titleInput ? titleInput.value : doc.title,
      html: editor ? editor.innerHTML : doc.content,
      ts: Date.now()
    });
  }, 250);
}

let pendingRemote = null;
let flushTimer = null;

function flushPendingRemote() {
  clearTimeout(flushTimer);
  const editor = document.getElementById('editor');
  const titleInput = document.getElementById('doc-title');
  const locallyTyping = document.activeElement === editor || document.activeElement === titleInput;
  if (pendingRemote && !locallyTyping) {
    const msg = pendingRemote;
    pendingRemote = null;
    applyRemoteUpdate(msg);
  } else if (pendingRemote) {
    flushTimer = setTimeout(flushPendingRemote, 800);
  }
}

function applyRemoteUpdate(msg) {
  const doc = state.currentDoc;
  if (!doc || doc.id !== msg.id) return;

  // Mark the sending peer as actively typing (for the avatar pulse ring).
  const peer = PEERS.get(msg.from);
  if (peer) {
    peer.typingUntil = Date.now() + 2000;
    renderCollabAvatars();
  }

  doc.title = msg.title;
  doc.content = msg.html;
  doc.updatedAt = msg.ts;

  const editor = document.getElementById('editor');
  const titleInput = document.getElementById('doc-title');

  // Never clobber what the local user is actively typing: hold the remote
  // snapshot and apply it as soon as they pause or leave the field.
  const locallyTyping = document.activeElement === editor || document.activeElement === titleInput;
  if (locallyTyping) {
    pendingRemote = msg;
    clearTimeout(flushTimer);
    flushTimer = setTimeout(flushPendingRemote, 800);
    return;
  }

  if (editor) editor.innerHTML = msg.html;
  if (titleInput && titleInput.value !== msg.title) titleInput.value = msg.title;
}

function applyRemoteShare(msg) {
  const target = state.allDocs.find(d => d.id === msg.id);
  if (target) target.share = msg.share;
  if (state.currentDoc && state.currentDoc.id === msg.id) {
    state.currentDoc.share = msg.share;
    updateShareButton();
  }
}

function initChannel() {
  if (typeof BroadcastChannel === 'undefined') return;
  channel = new BroadcastChannel(CHANNEL_NAME);

  channel.onmessage = (e) => {
    const msg = e.data || {};
    if (msg.from === CLIENT_ID) return; // ignore own loops
    switch (msg.type) {
      case 'hello':
        upsertPeer(msg);
        sendPresence();
        broadcast({ type: 'here', from: CLIENT_ID, id: CLIENT_ID, name: myName(), docId: currentDocId() });
        break;
      case 'here':
      case 'presence':
        upsertPeer(msg);
        break;
      case 'leave':
        PEERS.delete(msg.id);
        renderCollabAvatars();
        break;
      case 'sync-req':
        // A window that just opened this document asks for the latest state.
        if (msg.docId === currentDocId() && state.currentDoc) {
          const editor = document.getElementById('editor');
          broadcast({
            type: 'sync-state',
            to: msg.from,
            id: msg.docId,
            title: document.getElementById('doc-title') ? document.getElementById('doc-title').value : state.currentDoc.title,
            html: editor ? editor.innerHTML : state.currentDoc.content,
            ts: Date.now()
          });
        }
        break;
      case 'sync-state':
        if (msg.to === CLIENT_ID) applyRemoteUpdate(msg);
        break;
      case 'doc-update':
        applyRemoteUpdate(msg);
        break;
      case 'share-changed':
        applyRemoteShare(msg);
        break;
    }
  };

  broadcast({ type: 'hello', from: CLIENT_ID, id: CLIENT_ID, name: myName(), docId: currentDocId() });
  setInterval(presenceTick, HEARTBEAT_MS);
  // Re-announce as soon as the window becomes visible/focused again.
  document.addEventListener('visibilitychange', () => { if (!document.hidden) { sendPresence(); presenceTick(); } });
  window.addEventListener('focus', () => { sendPresence(); });
  window.addEventListener('beforeunload', () => {
    broadcast({ type: 'leave', id: CLIENT_ID });
  });
}

function currentDocId() {
  return state.currentDoc ? state.currentDoc.id : null;
}

function myName() {
  return 'Guest ' + CLIENT_ID.slice(-2).toUpperCase();
}

function upsertPeer(msg) {
  if (!msg.id || msg.id === CLIENT_ID) return;
  PEERS.set(msg.id, {
    name: msg.name || ('Guest ' + msg.id.slice(-2).toUpperCase()),
    docId: msg.docId || null,
    lastSeen: Date.now()
  });
  renderCollabAvatars();
}

function sendPresence() {
  broadcast({ type: 'presence', from: CLIENT_ID, id: CLIENT_ID, name: myName(), docId: currentDocId() });
}

function presenceTick() {
  sendPresence();
  const now = Date.now();
  let changed = false;
  PEERS.forEach((peer, id) => {
    if (now - peer.lastSeen > PEER_TTL) { PEERS.delete(id); changed = true; }
  });
  if (changed) renderCollabAvatars();
}

/* ------------------------------------------------------------------
   Collaborator avatar stack (Google Docs-style header presence)
   ------------------------------------------------------------------ */

let typingRefreshTimer = null;

function scheduleTypingRefresh() {
  if (typingRefreshTimer) return;
  typingRefreshTimer = setTimeout(() => {
    typingRefreshTimer = null;
    renderCollabAvatars();
  }, 1000);
}

function renderCollabAvatars() {
  const wrap = document.getElementById('collab-avatars');
  if (!wrap) return;
  const docId = currentDocId();

  const here = [];
  PEERS.forEach((peer, id) => {
    if (peer.docId && peer.docId === docId) here.push({ id, name: peer.name });
  });
  here.sort((a, b) => a.id.localeCompare(b.id));

  const shown = here.slice(0, MAX_AVATARS);
  const overflow = here.length - shown.length;

  let html = shown.map((p, i) => {
    const peer = PEERS.get(p.id);
    const typing = peer && peer.typingUntil && peer.typingUntil > Date.now();
    if (typing) scheduleTypingRefresh();
    return `
    <span class="collab-avatar${typing ? ' typing' : ''}" style="background:${colorFor(p.id)}; z-index:${20 - i}"
          title="${escapeUser(p.name)}${typing ? ' — typing…' : ' — viewing this document'}">
      ${initialsOf(p.name)}
    </span>`;
  }).join('');

  if (overflow > 0) {
    html += `<span class="collab-avatar collab-avatar-more" title="${overflow} more collaborator${overflow > 1 ? 's' : ''} in this document">+${overflow}</span>`;
  }

  wrap.innerHTML = html;
  wrap.classList.toggle('hidden', here.length === 0);
}

/* ------------------------------------------------------------------
   Share modal (Google Docs-style)
   ------------------------------------------------------------------ */

function renderPeopleList() {
  const list = document.getElementById('share-people-list');
  const doc = state.currentDoc;
  if (!list || !doc) return;
  const share = getShare(doc);

  const ownerRow = `
    <div class="share-person">
      <span class="share-avatar" style="background:#0e7a3d">LU</span>
      <span class="share-person-info">
        <span class="share-person-name">Local User <em>(you)</em></span>
        <span class="share-person-email">owner · this device</span>
      </span>
      <span class="share-person-role">Owner</span>
    </div>`;

  const userRows = share.users.map((u, i) => `
    <div class="share-person">
      <span class="share-avatar" style="background:${colorFor(u.email)}">${initialsOf(u.name || u.email)}</span>
      <span class="share-person-info">
        <span class="share-person-name">${escapeUser(u.name || u.email)}</span>
        <span class="share-person-email">${escapeUser(u.email)}</span>
      </span>
      <select class="share-role-select" data-index="${i}" aria-label="Role">
        ${Object.entries(ROLE_LABELS).map(([v, l]) =>
          `<option value="${v}" ${u.role === v ? 'selected' : ''}>${l}</option>`).join('')}
      </select>
      <button class="icon-btn share-person-remove" data-index="${i}" title="Remove access" aria-label="Remove access">
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
      </button>
    </div>`).join('');

  list.innerHTML = ownerRow + userRows;

  list.querySelectorAll('.share-role-select').forEach(sel => {
    sel.addEventListener('change', async () => {
      share.users[Number(sel.dataset.index)].role = sel.value;
      await persistShare(doc);
    });
  });
  list.querySelectorAll('.share-person-remove').forEach(btn => {
    btn.addEventListener('click', async () => {
      share.users.splice(Number(btn.dataset.index), 1);
      await persistShare(doc);
      renderPeopleList();
      showToast('Access removed');
    });
  });
}

async function persistShare(doc) {
  doc.updatedAt = Date.now();
  await DB.putDocument(doc);
  updateShareButton();
  broadcast({ type: 'share-changed', id: doc.id, share: doc.share });
}

function updateGeneralAccessUI() {
  const doc = state.currentDoc;
  if (!doc) return;
  const share = getShare(doc);
  const sel = document.getElementById('share-general-access');
  const desc = document.getElementById('share-general-desc');
  const copyBtn = document.getElementById('btn-share-copy-link');
  if (sel && sel.value !== share.general) sel.value = share.general;
  if (desc) {
    desc.textContent = share.general === 'link'
      ? 'Anyone in this workspace with the link can ' + (share.generalRole === 'editor' ? 'edit' : 'view')
      : 'Only people with access can open with the link';
  }
  if (copyBtn) copyBtn.classList.toggle('hidden', share.general !== 'link');
}

async function openShareModal() {
  const modal = document.getElementById('modal-share');
  const doc = state.currentDoc;
  if (!modal || !doc) return;

  const nameEl = document.getElementById('share-doc-name');
  if (nameEl) nameEl.textContent = doc.title || 'Untitled document';

  getShare(doc);
  const inviteInput = document.getElementById('share-invite-input');
  if (inviteInput) inviteInput.value = '';

  renderPeopleList();
  updateGeneralAccessUI();
  modal.classList.remove('hidden');
}

async function addCollaborator() {
  const doc = state.currentDoc;
  const input = document.getElementById('share-invite-input');
  const roleSel = document.getElementById('share-invite-role');
  if (!doc || !input) return;

  const value = input.value.trim();
  if (!value) { input.focus(); return; }

  const share = getShare(doc);
  const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
  const email = isEmail ? value : value.replace(/\s+/g, '').toLowerCase() + '@local.workspace';

  if (share.users.some(u => u.email === email)) {
    showToast('That person already has access');
    return;
  }

  const role = roleSel ? roleSel.value : 'viewer';
  share.users.push({ name: value, email, role });
  await persistShare(doc);
  renderPeopleList();
  input.value = '';
  input.focus();
  showToast('Shared with ' + value + ' — ' + ROLE_LABELS[role]);
}

function updateShareButton() {
  const btn = document.getElementById('btn-share');
  const doc = state.currentDoc;
  if (!btn || !doc) return;
  const label = btn.querySelector('span');
  const shared = isShared(doc);
  if (label) label.textContent = shared ? 'Shared' : 'Private';
  btn.title = shared ? 'Shared with ' + doc.share.users.length + ' people' : 'Share this document';
}

/* ------------------------------------------------------------------
   Public setup
   ------------------------------------------------------------------ */

export function setupShareEvents() {
  const btnShare = document.getElementById('btn-share');
  if (btnShare) btnShare.addEventListener('click', openShareModal);

  const addBtn = document.getElementById('btn-share-add');
  if (addBtn) addBtn.addEventListener('click', addCollaborator);

  const inviteInput = document.getElementById('share-invite-input');
  if (inviteInput) {
    inviteInput.addEventListener('keydown', e => {
      if (e.key === 'Enter') { e.preventDefault(); addCollaborator(); }
    });
  }

  const generalSel = document.getElementById('share-general-access');
  if (generalSel) {
    generalSel.addEventListener('change', async () => {
      const doc = state.currentDoc;
      if (!doc) return;
      const share = getShare(doc);
      share.general = generalSel.value;
      await persistShare(doc);
      updateGeneralAccessUI();
      showToast(share.general === 'link' ? 'Link sharing turned on' : 'Sharing restricted');
    });
  }

  const copyBtn = document.getElementById('btn-share-copy-link');
  if (copyBtn) {
    copyBtn.addEventListener('click', async () => {
      const doc = state.currentDoc;
      if (!doc) return;
      const url = location.origin + location.pathname + '#doc=' + doc.id;
      try {
        await navigator.clipboard.writeText(url);
        showToast('Workspace link copied to clipboard');
      } catch (e) {
        showToast(url);
      }
    });
  }

  // Keep the share button label in sync whenever a document is opened.
  document.addEventListener('td:doc-opened', updateShareButton);
}

export function initCollab() {
  initChannel();

  const editor = document.getElementById('editor');
  if (editor) editor.addEventListener('input', scheduleContentBroadcast);
  const titleInput = document.getElementById('doc-title');
  if (titleInput) titleInput.addEventListener('input', scheduleContentBroadcast);

  // Announce presence, refresh the avatar stack, and pull the latest document
  // state from collaborators already in it (perfect sync on join).
  document.addEventListener('td:doc-opened', () => {
    sendPresence();
    renderCollabAvatars();
    broadcast({ type: 'sync-req', from: CLIENT_ID, docId: currentDocId() });
  });

  // Apply held-back remote edits as soon as the user leaves the fields.
  const editorEl = document.getElementById('editor');
  if (editorEl) editorEl.addEventListener('blur', flushPendingRemote);
  const titleEl = document.getElementById('doc-title');
  if (titleEl) titleEl.addEventListener('blur', flushPendingRemote);

  // Open a shared workspace link: index.html#doc=<id>
  const match = /^#doc=(.+)$/.exec(location.hash || '');
  if (match) {
    history.replaceState(null, '', location.pathname);
    setTimeout(() => showEditor(match[1]), 150);
  }

  updateShareButton();
}
