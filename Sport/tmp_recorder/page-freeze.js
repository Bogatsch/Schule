import { drawSubmissionQr } from './webdav-qr.js?v=3';

const FREEZE_KEY = 'sportkamera-page-frozen-v1';

export function createPageFreeze({ appShell, view, verifyPassword, onUnlock }) {
  const title = view.querySelector('#page-freeze-title');
  const display = view.querySelector('#page-freeze-qr-display');
  const canvas = view.querySelector('#page-freeze-qr');
  const pin = view.querySelector('#page-freeze-pin');
  const missingQr = view.querySelector('#page-freeze-missing-qr');
  const form = view.querySelector('#page-freeze-form');
  const password = view.querySelector('#page-freeze-password');
  const submit = view.querySelector('#page-freeze-submit');
  const status = view.querySelector('#page-freeze-status');
  let active = false;
  let passwordAvailable = false;
  let submission = null;
  let unlockAttempt = 0;
  let wakeLock = null;
  let requestingWakeLock = false;

  function showStatus(message, failed = false) {
    status.textContent = message;
    status.dataset.status = failed ? 'error' : '';
    status.hidden = !message;
  }

  function setBusy(busy) {
    password.disabled = busy || !passwordAvailable;
    submit.disabled = password.disabled;
  }

  function updateQr(value) {
    submission = value;
    display.hidden = !value;
    missingQr.hidden = Boolean(value);
    pin.textContent = value?.pin ?? '';
    if (value) {
      drawSubmissionQr(canvas, value.link);
    } else {
      canvas.width = 0;
      canvas.height = 0;
    }
  }

  async function resume() {
    if (!active || document.hidden || !navigator.wakeLock || requestingWakeLock
      || (wakeLock && !wakeLock.released)) return;
    requestingWakeLock = true;
    try {
      const lock = await navigator.wakeLock.request('screen');
      if (active && !document.hidden) wakeLock = lock;
      else await lock.release();
    } catch {
      // Die Sperransicht funktioniert auch ohne Wachhaltesperre.
    } finally {
      requestingWakeLock = false;
    }
  }

  function releaseWakeLock() {
    const lock = wakeLock;
    wakeLock = null;
    if (lock && !lock.released) void lock.release().catch(() => {});
  }

  function show(frozen) {
    active = frozen;
    appShell.hidden = frozen;
    view.hidden = !frozen;
    if (frozen) {
      title.focus({ preventScroll: true });
      void resume();
    } else {
      releaseWakeLock();
    }
  }

  function saveState(frozen) {
    try {
      if (frozen) sessionStorage.setItem(FREEZE_KEY, '1');
      else sessionStorage.removeItem(FREEZE_KEY);
    } catch {
      // Ohne Sitzungsspeicher bleibt die Sperre im geöffneten Dokument aktiv.
    }
  }

  function restore() {
    let frozen = false;
    try {
      frozen = sessionStorage.getItem(FREEZE_KEY) === '1';
    } catch {
      // Der Browser stellt den Sitzungsspeicher nicht bereit.
    }
    show(frozen);
  }

  function lock(value) {
    updateQr(value);
    saveState(true);
    showStatus('');
    show(true);
  }

  function updateConnection(connectionId, ready) {
    if (submission && (!ready || submission.connectionId !== connectionId)) updateQr(null);
  }

  function setPasswordAvailable(available) {
    passwordAvailable = available;
    setBusy(false);
    if (active && !available) showStatus('Das Lehrkraft-Passwort konnte nicht geladen werden.', true);
  }

  function suspend() {
    if (!active) return;
    unlockAttempt += 1;
    password.value = '';
    password.blur();
    setBusy(false);
    if (passwordAvailable) showStatus('');
    releaseWakeLock();
  }

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (!active || submit.disabled || !password.value) return;
    const attempt = ++unlockAttempt;
    const candidate = password.value;
    password.value = '';
    setBusy(true);
    showStatus('Passwort wird geprüft …');
    let verified = false;
    let errorMessage = 'Das Passwort ist nicht korrekt.';
    try {
      verified = await verifyPassword(candidate);
    } catch {
      errorMessage = 'Das Passwort konnte nicht geprüft werden.';
    }
    if (attempt !== unlockAttempt) return;
    setBusy(false);
    if (!verified) {
      showStatus(errorMessage, true);
      password.focus({ preventScroll: true });
      return;
    }
    const previousSubmission = submission;
    saveState(false);
    show(false);
    updateQr(null);
    showStatus('');
    onUnlock(previousSubmission);
  });

  return {
    get active() { return active; },
    lock, restore, updateConnection, setPasswordAvailable, suspend, resume
  };
}
