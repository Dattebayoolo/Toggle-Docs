/* ==========================================================================
   Toggle Docs - SSO account integration (frontend)
   The dev server signs the user in via the Toggle Account System and sets a
   JS-readable `toggle_docs_user` cookie with the account email. This module
   renders it in the dashboard account card and wires Sign out to the server
   logout route.
   ========================================================================== */

const USER_COOKIE = 'toggle_docs_user';

export function readUserEmail() {
  for (const pair of String(document.cookie || '').split(';')) {
    const trimmed = pair.trim();
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    if (trimmed.slice(0, eq) === USER_COOKIE) {
      try {
        return decodeURIComponent(trimmed.slice(eq + 1));
      } catch (_error) {
        return trimmed.slice(eq + 1);
      }
    }
  }
  return '';
}

function initialsFromEmail(email) {
  const name = String(email || '').split('@')[0].trim();
  if (!name) return 'U';
  const parts = name.split(/[._-]+/).filter(Boolean);
  return (parts.length > 1 ? parts[0][0] + parts[1][0] : name.slice(0, 2)).toUpperCase();
}

export function initAuthUi() {
  const email = readUserEmail();

  const nameEl = document.querySelector('.account-menu .account-name');
  const emailEl = document.querySelector('.account-menu .account-email');

  if (nameEl) nameEl.textContent = email ? email.split('@')[0] : 'Local User';
  if (emailEl) emailEl.textContent = email || 'Signed in via Toggle Account';

  if (email) {
    const avatarBtn = document.querySelector('.account-dropdown .gdocs-avatar');
    if (avatarBtn) avatarBtn.setAttribute('title', 'Account: ' + email);
    const avatarLg = document.querySelector('.account-menu .account-avatar-lg');
    if (avatarLg) avatarLg.textContent = initialsFromEmail(email);
  }

  /* Sign-out is handled by editor-events.js (data-action case) so it works no
     matter how the account menu dispatches the action. */
}
