import {
  MAX_RECORDING_MS,
  formatPlaybackTime,
  formatRecordingTime,
  selectSupportedVideoMimeType
} from './media-utils.js?v=26';
import { setupVideoAnnotation } from './annotation.js?v=29';
import {
  deleteMedia,
  getMedia,
  getStorageEstimate,
  isMediaStoreSupported,
  listMedia,
  requestPersistentStorage,
  saveMedia
} from './media-store.js?v=29';
import {
  authenticateWithPlatform,
  enrollPlatformCredential,
  forgetPlatformCredential,
  getTeacherAuthState,
  preloadTeacherAuth,
  verifyTeacherPassword
} from './teacher-auth.js?v=29';

const CAMERA_CONSTRAINTS = Object.freeze({
  width: { ideal: 1280 },
  height: { ideal: 720 },
  frameRate: { ideal: 30 }
});

const elements = {
  startView: document.querySelector('#start-view'),
  cameraView: document.querySelector('#camera-view'),
  previewView: document.querySelector('#preview-view'),
  galleryView: document.querySelector('#gallery-view'),
  errorView: document.querySelector('#error-view'),
  teacherModeButton: document.querySelector('#teacher-mode-button'),
  teacherModeLabel: document.querySelector('#teacher-mode-label'),
  teacherModeDescription: document.querySelector('#teacher-mode-description'),
  galleryEntry: document.querySelector('#gallery-entry'),
  environmentStatus: document.querySelector('#environment-status'),
  cameraBack: document.querySelector('#camera-back'),
  cameraTitle: document.querySelector('#camera-title'),
  cameraKicker: document.querySelector('#camera-kicker'),
  cameraFacingLabel: document.querySelector('#camera-facing-label'),
  cameraStage: document.querySelector('#camera-stage'),
  cameraPlaceholder: document.querySelector('#camera-placeholder'),
  cameraStatus: document.querySelector('#camera-status'),
  switchCamera: document.querySelector('#switch-camera'),
  liveVideo: document.querySelector('#live-video'),
  captureButton: document.querySelector('#capture-button'),
  recordingIndicator: document.querySelector('#recording-indicator'),
  recordingTime: document.querySelector('#recording-time'),
  previewBack: document.querySelector('#preview-back'),
  previewStage: document.querySelector('#preview-stage'),
  photoPreview: document.querySelector('#photo-preview'),
  photoSaveControls: document.querySelector('#photo-save-controls'),
  photoSaveButton: document.querySelector('#photo-save-button'),
  ownVideoPane: document.querySelector('#own-video-pane'),
  videoPreview: document.querySelector('#video-preview'),
  comparisonPane: document.querySelector('#comparison-pane'),
  comparisonPaneLabel: document.querySelector('#comparison-pane-label'),
  comparisonVideo: document.querySelector('#comparison-video'),
  previewPlayerGrid: document.querySelector('#preview-player-grid'),
  playbackControls: document.querySelector('#playback-controls'),
  playButton: document.querySelector('#play-button'),
  timeline: document.querySelector('#timeline'),
  playbackTime: document.querySelector('#playback-time'),
  speedMenu: document.querySelector('#speed-menu'),
  speedValue: document.querySelector('#speed-value'),
  videoSaveButton: document.querySelector('#video-save-button'),
  videoAnnotationButton: document.querySelector('#video-annotation-button'),
  comparisonPlaybackControls: document.querySelector('#comparison-playback-controls'),
  comparisonPlayerLabel: document.querySelector('#comparison-player-label'),
  comparisonPlayButton: document.querySelector('#comparison-play-button'),
  comparisonTimeline: document.querySelector('#comparison-timeline'),
  comparisonPlaybackTime: document.querySelector('#comparison-playback-time'),
  comparisonSpeedMenu: document.querySelector('#comparison-speed-menu'),
  comparisonSpeedValue: document.querySelector('#comparison-speed-value'),
  comparisonAnnotationButton: document.querySelector('#comparison-annotation-button'),
  comparisonControls: document.querySelector('#comparison-controls'),
  comparisonButton: document.querySelector('#comparison-button'),
  comparisonButtonLabel: document.querySelector('#comparison-button-label'),
  comparisonPicker: document.querySelector('#comparison-picker'),
  comparisonClose: document.querySelector('#comparison-close'),
  comparisonSteps: [...document.querySelectorAll('[data-comparison-step]')],
  comparisonSportTitle: document.querySelector('#comparison-sport-title'),
  comparisonSportLists: [...document.querySelectorAll('[data-comparison-sport-list]')],
  comparisonActive: document.querySelector('#comparison-active'),
  comparisonActiveLabel: document.querySelector('#comparison-active-label'),
  comparisonRemove: document.querySelector('#comparison-remove'),
  galleryBack: document.querySelector('#gallery-back'),
  galleryGrid: document.querySelector('#gallery-grid'),
  galleryEmpty: document.querySelector('#gallery-empty'),
  galleryStorageStatus: document.querySelector('#gallery-storage-status'),
  gallerySelectAll: document.querySelector('#gallery-select-all'),
  gallerySelectionCount: document.querySelector('#gallery-selection-count'),
  galleryDeleteSelected: document.querySelector('#gallery-delete-selected'),
  teacherLoginDialog: document.querySelector('#teacher-login-dialog'),
  teacherLoginForm: document.querySelector('#teacher-login-form'),
  teacherLoginStep: document.querySelector('#teacher-login-step'),
  teacherLoginTitle: document.querySelector('#teacher-login-title'),
  teacherBiometricSection: document.querySelector('#teacher-biometric-section'),
  teacherBiometricDivider: document.querySelector('#teacher-biometric-divider'),
  teacherBiometricButton: document.querySelector('#teacher-biometric-button'),
  teacherPassword: document.querySelector('#teacher-password'),
  teacherLoginStatus: document.querySelector('#teacher-login-status'),
  teacherLoginCancel: document.querySelector('#teacher-login-cancel'),
  teacherEnrollmentStep: document.querySelector('#teacher-enrollment-step'),
  teacherEnrollmentButton: document.querySelector('#teacher-enrollment-button'),
  teacherEnrollmentSkip: document.querySelector('#teacher-enrollment-skip'),
  galleryViewerDialog: document.querySelector('#gallery-viewer-dialog'),
  galleryViewerClose: document.querySelector('#gallery-viewer-close'),
  galleryViewerTitle: document.querySelector('#gallery-viewer-title'),
  galleryViewerDate: document.querySelector('#gallery-viewer-date'),
  galleryViewerPhoto: document.querySelector('#gallery-viewer-photo'),
  galleryViewerVideo: document.querySelector('#gallery-viewer-video'),
  galleryPlaybackControls: document.querySelector('#gallery-playback-controls'),
  galleryPlayButton: document.querySelector('#gallery-play-button'),
  galleryTimeline: document.querySelector('#gallery-timeline'),
  galleryPlaybackTime: document.querySelector('#gallery-playback-time'),
  gallerySpeedMenu: document.querySelector('#gallery-speed-menu'),
  gallerySpeedValue: document.querySelector('#gallery-speed-value'),
  galleryAnnotationButton: document.querySelector('#gallery-annotation-button'),
  galleryDownloadButton: document.querySelector('#gallery-download-button'),
  galleryDeleteButton: document.querySelector('#gallery-delete-button'),
  galleryViewerStatus: document.querySelector('#gallery-viewer-status'),
  galleryDeleteDialog: document.querySelector('#gallery-delete-dialog'),
  galleryDeleteForm: document.querySelector('#gallery-delete-form'),
  galleryDeleteTitle: document.querySelector('#gallery-delete-title'),
  galleryDeleteMessage: document.querySelector('#gallery-delete-message'),
  galleryDeleteConfirm: document.querySelector('#gallery-delete-confirm'),
  galleryDeleteCancel: document.querySelector('#gallery-delete-cancel'),
  previewStatus: document.querySelector('#preview-status'),
  discardButton: document.querySelector('#discard-button'),
  newRecordingButton: document.querySelector('#new-recording-button'),
  errorMessage: document.querySelector('#error-message'),
  retryButton: document.querySelector('#retry-button'),
  errorHomeButton: document.querySelector('#error-home-button'),
  canvas: document.querySelector('#capture-canvas')
};

const views = {
  start: elements.startView,
  camera: elements.cameraView,
  preview: elements.previewView,
  gallery: elements.galleryView,
  error: elements.errorView
};

let currentMode = 'photo';
let facingMode = 'environment';
let cameraStream = null;
let mediaRecorder = null;
let mediaChunks = [];
let currentBlob = null;
let currentObjectUrl = null;
let selectedMimeType = null;
let recordingStartedAt = 0;
let recordingTimer = null;
let recordingLimitTimer = null;
let isRecording = false;
let operationId = 0;
let selectedComparisonCategory = 'spielsportarten';
let currentSavedMediaId = null;
let teacherMode = false;
let teacherAuthVerified = false;
let teacherAuthReady = false;
let teacherAuthOperationId = 0;
let teacherPlatformNeedsRepair = false;
let galleryItems = [];
let gallerySelectedIds = new Set();
let galleryLoadId = 0;
let galleryRenderId = 0;
let galleryPreviewObserver = null;
let galleryViewerItem = null;
let galleryViewerObjectUrl = null;
let galleryViewerTrigger = null;
let galleryViewerRequestId = 0;
let pendingDeleteIds = [];
let pendingDeleteTrigger = null;
const galleryCardObjectUrls = new Set();
const galleryLoadedMedia = new Map();
const delayedDownloadObjectUrls = new Set();
const annotation = setupVideoAnnotation({ statusElement: elements.previewStatus });

function setView(name) {
  Object.entries(views).forEach(([viewName, element]) => {
    element.hidden = viewName !== name;
  });
  document.body.dataset.view = name;
}

function setModeUI() {
  document.querySelectorAll('[data-camera-mode]').forEach((button) => {
    button.setAttribute('aria-pressed', String(button.dataset.cameraMode === currentMode));
  });

  const isPhoto = currentMode === 'photo';
  elements.cameraKicker.textContent = isPhoto ? 'Fotoaufnahme' : 'Videoaufnahme · maximal 3 Minuten';
  elements.cameraTitle.textContent = isPhoto ? 'Kamera ausrichten' : 'Bewegung vorbereiten';
  elements.captureButton.setAttribute('aria-label', isPhoto ? 'Foto aufnehmen' : 'Videoaufnahme starten');
  elements.captureButton.classList.toggle('video-mode', !isPhoto);
}

function updateFacingUI() {
  const isFrontCamera = facingMode === 'user';
  elements.liveVideo.classList.toggle('mirrored', isFrontCamera);
  elements.cameraFacingLabel.textContent = isFrontCamera ? 'Frontkamera' : 'Rückkamera';
  elements.switchCamera.setAttribute(
    'aria-label',
    isFrontCamera ? 'Zur Rückkamera wechseln' : 'Zur Frontkamera wechseln'
  );
}

function resetPlaybackUI() {
  elements.playButton.innerHTML = '<span aria-hidden="true">▶</span>';
  elements.playButton.setAttribute('aria-label', 'Video starten');
  elements.timeline.value = '0';
  elements.playbackTime.value = '0:00 / 0:00';
  elements.speedMenu.open = false;
  elements.speedValue.textContent = '1×';
  elements.previewStatus.textContent = '';
  document.querySelectorAll('[data-speed]').forEach((button) => {
    button.setAttribute('aria-pressed', String(button.dataset.speed === '1'));
  });
  resetComparison();
}

function resetComparisonPlaybackUI() {
  elements.comparisonPlayButton.innerHTML = '<span aria-hidden="true">▶</span>';
  elements.comparisonPlayButton.setAttribute('aria-label', 'Leitbild starten');
  elements.comparisonTimeline.value = '0';
  elements.comparisonPlaybackTime.value = '0:00 / 0:00';
  elements.comparisonSpeedMenu.open = false;
  elements.comparisonSpeedValue.textContent = '1×';
  document.querySelectorAll('[data-comparison-speed]').forEach((button) => {
    button.setAttribute('aria-pressed', String(button.dataset.comparisonSpeed === '1'));
  });
}

function showComparisonStep(stepName) {
  let selectedStep = null;
  elements.comparisonSteps.forEach((step) => {
    step.hidden = step.dataset.comparisonStep !== stepName;
    if (!step.hidden) {
      selectedStep = step;
    }
  });
  if (elements.comparisonPicker.open) {
    selectedStep?.querySelector('h3')?.focus({ preventScroll: true });
  }
}

function showComparisonSports(category) {
  selectedComparisonCategory = category;
  const isIndividual = category === 'individualsportarten';
  elements.comparisonSportTitle.textContent = isIndividual
    ? 'Individualsportart auswählen'
    : 'Spielsportart auswählen';
  elements.comparisonSportLists.forEach((list) => {
    list.hidden = list.dataset.comparisonSportList !== category;
  });
  showComparisonStep('sport');
}

function openComparisonPicker() {
  showComparisonStep('category');
  elements.comparisonSportLists.forEach((list) => {
    list.hidden = true;
  });
  elements.comparisonButton.setAttribute('aria-expanded', 'true');
  if (typeof elements.comparisonPicker.showModal === 'function') {
    elements.comparisonPicker.showModal();
  } else {
    elements.comparisonPicker.setAttribute('open', '');
  }
}

function closeComparisonPicker({ restoreFocus = false } = {}) {
  if (elements.comparisonPicker.open) {
    elements.comparisonPicker.close();
  } else {
    elements.comparisonPicker.removeAttribute('open');
  }
  elements.comparisonButton.setAttribute('aria-expanded', 'false');
  if (restoreFocus) {
    elements.comparisonButton.focus({ preventScroll: true });
  }
}

function sanitizeDownloadName(value, fallback) {
  const name = String(value || '')
    .trim()
    .normalize('NFKC')
    .replace(/[<>:"/\\|?*\u0000-\u001f]/g, '-')
    .replace(/\s+/g, ' ')
    .replace(/^[. ]+|[. ]+$/g, '')
    .slice(0, 120)
    .replace(/[. ]+$/g, '');
  return name || fallback;
}

function showModal(dialog) {
  if (typeof dialog?.showModal === 'function') {
    dialog.showModal();
  } else {
    dialog?.setAttribute('open', '');
  }
}

function closeModal(dialog) {
  if (!dialog) {
    return;
  }
  if (dialog.open && typeof dialog.close === 'function') {
    dialog.close();
  } else {
    dialog.removeAttribute('open');
  }
}

function formatMediaDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return 'Datum unbekannt';
  }
  return new Intl.DateTimeFormat('de-DE', {
    dateStyle: 'medium',
    timeStyle: 'short'
  }).format(date);
}

function formatBytes(value) {
  const bytes = Number(value);
  if (!Number.isFinite(bytes) || bytes < 0) {
    return '';
  }
  if (bytes < 1024) {
    return `${Math.round(bytes)} B`;
  }
  const units = ['KB', 'MB', 'GB'];
  let amount = bytes / 1024;
  let unit = units[0];
  for (let index = 1; index < units.length && amount >= 1024; index += 1) {
    amount /= 1024;
    unit = units[index];
  }
  return `${amount >= 10 ? amount.toFixed(0) : amount.toFixed(1)} ${unit}`.replace('.', ',');
}

function resetComparison() {
  elements.comparisonVideo.pause();
  elements.comparisonVideo.removeAttribute('src');
  elements.comparisonVideo.load();
  elements.comparisonPane.hidden = true;
  elements.previewStage.classList.remove('comparing');
  elements.previewPlayerGrid.classList.remove('comparing');
  elements.comparisonPlaybackControls.hidden = true;
  closeComparisonPicker();
  elements.comparisonButtonLabel.textContent = 'Leitbild daneben';
  elements.comparisonActive.hidden = true;
  elements.comparisonActiveLabel.textContent = '';
  resetComparisonPlaybackUI();
}

function selectComparison(button) {
  elements.comparisonVideo.pause();
  resetComparisonPlaybackUI();
  elements.comparisonVideo.src = button.dataset.comparisonSrc;
  elements.comparisonVideo.playbackRate = 1;
  elements.comparisonVideo.load();
  elements.comparisonPaneLabel.textContent = button.dataset.comparisonTitle;
  elements.comparisonPlayerLabel.textContent = button.dataset.comparisonTitle;
  elements.comparisonPane.hidden = false;
  elements.previewStage.classList.add('comparing');
  elements.previewPlayerGrid.classList.add('comparing');
  elements.comparisonPlaybackControls.hidden = false;
  closeComparisonPicker({ restoreFocus: true });
  elements.comparisonButtonLabel.textContent = 'Leitbild wechseln';
  elements.comparisonActiveLabel.textContent = button.dataset.comparisonTitle;
  elements.comparisonActive.hidden = false;
  elements.previewStatus.textContent = `${button.dataset.comparisonTitle} wird daneben angezeigt.`;
}

function stopCameraTracks() {
  if (cameraStream) {
    cameraStream.getTracks().forEach((track) => track.stop());
  }
  cameraStream = null;
  elements.liveVideo.pause();
  elements.liveVideo.srcObject = null;
  elements.liveVideo.removeAttribute('src');
  elements.liveVideo.load();
}

function clearTimers() {
  window.clearInterval(recordingTimer);
  window.clearTimeout(recordingLimitTimer);
  recordingTimer = null;
  recordingLimitTimer = null;
}

function resetCanvas() {
  const context = elements.canvas.getContext('2d');
  if (context && elements.canvas.width && elements.canvas.height) {
    context.clearRect(0, 0, elements.canvas.width, elements.canvas.height);
  }
  elements.canvas.width = 0;
  elements.canvas.height = 0;
}

function releaseObjectUrl() {
  if (currentObjectUrl) {
    URL.revokeObjectURL(currentObjectUrl);
  }
  currentObjectUrl = null;
  currentBlob = null;
}

function resetSaveButtons() {
  currentSavedMediaId = null;
  [elements.photoSaveButton, elements.videoSaveButton].forEach((button) => {
    button.disabled = false;
    button.classList.remove('saved');
    button.removeAttribute('aria-pressed');
  });
  elements.photoSaveButton.setAttribute('aria-label', 'Foto in der Galerie speichern');
  elements.photoSaveButton.title = 'Foto speichern';
  elements.videoSaveButton.setAttribute('aria-label', 'Video in der Galerie speichern');
  elements.videoSaveButton.title = 'Video speichern';
}

/**
 * Zentrale Aufräumfunktion. Sie entfernt alle App-Referenzen auf Kamera- und
 * Aufnahmedaten. Die endgültige Speicherfreigabe übernimmt anschließend der Browser.
 */
function cleanupMedia({ nextView = 'start', errorMessage = '' } = {}) {
  operationId += 1;
  clearTimers();

  if (mediaRecorder) {
    mediaRecorder.ondataavailable = null;
    mediaRecorder.onstop = null;
    mediaRecorder.onerror = null;
    if (mediaRecorder.state !== 'inactive') {
      try {
        mediaRecorder.stop();
      } catch {
        // Der Recorder kann während eines Browserfehlers bereits beendet sein.
      }
    }
  }

  mediaRecorder = null;
  isRecording = false;
  recordingStartedAt = 0;
  selectedMimeType = null;
  mediaChunks.splice(0, mediaChunks.length);
  stopCameraTracks();
  releaseObjectUrl();
  resetSaveButtons();

  elements.videoPreview.pause();
  elements.videoPreview.srcObject = null;
  elements.videoPreview.removeAttribute('src');
  elements.videoPreview.load();
  elements.videoPreview.hidden = true;
  elements.ownVideoPane.hidden = true;
  elements.photoPreview.removeAttribute('src');
  elements.photoPreview.alt = '';
  elements.photoPreview.hidden = true;
  elements.photoSaveControls.hidden = true;
  elements.playbackControls.hidden = true;
  annotation.close({ restoreFocus: false });
  resetPlaybackUI();
  resetCanvas();

  elements.recordingIndicator.hidden = true;
  elements.recordingTime.textContent = '00:00.0';
  elements.captureButton.classList.remove('recording');
  elements.captureButton.disabled = true;
  elements.cameraStage.setAttribute('aria-busy', 'false');
  elements.cameraPlaceholder.hidden = false;
  elements.cameraPlaceholder.lastElementChild.textContent = 'Kamera wird gestartet …';

  if (errorMessage) {
    elements.errorMessage.textContent = errorMessage;
  }
  setView(nextView);
}

function browserSupportMessage(mode) {
  if (!window.isSecureContext) {
    return 'Die Kamera ist nur über HTTPS oder auf localhost verfügbar. Öffne die App über die GitHub-Pages-Adresse oder einen lokalen Webserver.';
  }
  if (!navigator.mediaDevices || typeof navigator.mediaDevices.getUserMedia !== 'function') {
    return 'Dieser Browser stellt keinen unterstützten Kamerazugriff bereit. Verwende eine aktuelle Version von Safari, Chrome, Edge oder Firefox.';
  }
  if (mode === 'video' && typeof window.MediaRecorder === 'undefined') {
    return 'Videoaufnahmen werden von diesem Browser nicht unterstützt. Du kannst stattdessen die Fotoaufnahme verwenden.';
  }
  return '';
}

function cameraErrorMessage(error) {
  switch (error?.name) {
    case 'NotAllowedError':
    case 'PermissionDeniedError':
      return 'Der Kamerazugriff wurde abgelehnt. Erlaube den Zugriff in den Website-Einstellungen des Browsers und versuche es erneut. Eine Mikrofonberechtigung wird nicht benötigt.';
    case 'NotFoundError':
    case 'DevicesNotFoundError':
      return 'Es wurde keine verfügbare Kamera gefunden. Prüfe, ob das Gerät eine Kamera besitzt und sie vom Betriebssystem erkannt wird.';
    case 'NotReadableError':
    case 'TrackStartError':
      return 'Die Kamera wird gerade von einer anderen App verwendet oder konnte nicht gelesen werden. Schließe andere Kamera-Apps und versuche es erneut.';
    case 'OverconstrainedError':
      return 'Die Kamera unterstützt die angeforderte Einstellung nicht. Bitte starte die App neu oder verwende eine andere Kamera.';
    case 'SecurityError':
      return 'Der Browser hat den Kamerazugriff aus Sicherheitsgründen blockiert. Öffne die App über HTTPS und prüfe die Website-Berechtigung.';
    default:
      return 'Die Kamera konnte nicht gestartet werden. Prüfe die Kameraberechtigung und versuche es erneut.';
  }
}

function showError(message) {
  cleanupMedia({ nextView: 'error', errorMessage: message });
  window.setTimeout(() => elements.retryButton.focus(), 0);
}

async function startCamera() {
  const supportMessage = browserSupportMessage(currentMode);
  if (supportMessage) {
    showError(supportMessage);
    return;
  }

  if (currentMode === 'video') {
    selectedMimeType = selectSupportedVideoMimeType(window.MediaRecorder);
    if (!selectedMimeType) {
      showError('Dieser Browser bietet kein unterstütztes WebM- oder MP4-Aufnahmeformat an. Die Fotoaufnahme bleibt verfügbar.');
      return;
    }
  }

  const thisOperation = ++operationId;
  setModeUI();
  updateFacingUI();
  setView('camera');
  elements.cameraStage.setAttribute('aria-busy', 'true');
  elements.cameraPlaceholder.hidden = false;
  elements.cameraStatus.textContent = '';
  elements.captureButton.disabled = true;

  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: false,
      video: {
        ...CAMERA_CONSTRAINTS,
        facingMode: { ideal: facingMode }
      }
    });

    if (thisOperation !== operationId) {
      stream.getTracks().forEach((track) => track.stop());
      return;
    }

    cameraStream = stream;
    elements.liveVideo.srcObject = stream;
    await elements.liveVideo.play();

    if (thisOperation !== operationId) {
      stopCameraTracks();
      return;
    }

    elements.cameraPlaceholder.hidden = true;
    elements.cameraStage.setAttribute('aria-busy', 'false');
    elements.cameraStatus.textContent = '';
    elements.captureButton.disabled = false;
  } catch (error) {
    if (thisOperation === operationId) {
      showError(cameraErrorMessage(error));
    }
  }
}

async function beginNewSession(mode = currentMode) {
  cleanupMedia({ nextView: 'start' });
  currentMode = mode;
  await startCamera();
}

function stopStreamAfterCapture() {
  stopCameraTracks();
  elements.captureButton.disabled = true;
}

function canvasToBlob(canvas, type, quality) {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) {
        resolve(blob);
      } else {
        reject(new Error('Canvas konnte kein Bild erzeugen.'));
      }
    }, type, quality);
  });
}

function mediaSaveErrorMessage(error) {
  if (error?.code === 'quota-exceeded' || error?.name === 'QuotaExceededError') {
    return 'Der lokale App-Speicher ist voll. Bitte lösche ältere Aufnahmen in der Lehrergalerie.';
  }
  if (error?.code === 'unsupported') {
    return 'Dieser Browser bietet keinen privaten App-Speicher. Verwende eine aktuelle Safari-, Chrome-, Edge- oder Firefox-Version über HTTPS.';
  }
  return 'Die Aufnahme konnte nicht gespeichert werden. Sie bleibt noch in dieser Vorschau verfügbar.';
}

async function saveCurrentMedia(kind, button) {
  if (currentSavedMediaId) {
    elements.previewStatus.textContent = 'Diese Aufnahme ist bereits in der Galerie gespeichert.';
    return;
  }
  if (!currentBlob || !currentObjectUrl) {
    elements.previewStatus.textContent = 'Die Aufnahme ist nicht mehr verfügbar.';
    return;
  }
  if (!isMediaStoreSupported()) {
    elements.previewStatus.textContent = mediaSaveErrorMessage({ code: 'unsupported' });
    return;
  }

  const blob = currentBlob;
  const thisOperation = operationId;
  button.disabled = true;
  elements.previewStatus.textContent = kind === 'photo'
    ? 'Foto wird lokal gespeichert …'
    : 'Video wird lokal gespeichert …';

  const dimensions = kind === 'photo'
    ? {
        width: elements.photoPreview.naturalWidth,
        height: elements.photoPreview.naturalHeight
      }
    : {
        width: elements.videoPreview.videoWidth,
        height: elements.videoPreview.videoHeight,
        durationMs: Number.isFinite(elements.videoPreview.duration)
          ? elements.videoPreview.duration * 1000
          : null
      };

  try {
    const persistenceRequest = requestPersistentStorage().catch(() => null);
    const metadata = await saveMedia(blob, { kind, ...dimensions });
    const persistence = await persistenceRequest;

    if (thisOperation !== operationId || currentBlob !== blob) {
      return;
    }
    currentSavedMediaId = metadata.id;
    button.classList.add('saved');
    button.setAttribute('aria-pressed', 'true');
    button.setAttribute(
      'aria-label',
      kind === 'photo' ? 'Foto ist in der Galerie gespeichert' : 'Video ist in der Galerie gespeichert'
    );
    button.title = 'Gespeichert';
    const persistenceNote = persistence?.persisted
      ? ''
      : ' Der Browser kann lokale Daten bei einer Speicherbereinigung trotzdem entfernen.';
    elements.previewStatus.textContent = (kind === 'photo'
      ? 'Foto wurde lokal in der Galerie gespeichert.'
      : 'Video wurde lokal in der Galerie gespeichert.') + persistenceNote;
  } catch (error) {
    if (thisOperation === operationId && currentBlob === blob) {
      button.disabled = false;
      elements.previewStatus.textContent = mediaSaveErrorMessage(error);
    }
  }
}

async function takePhoto() {
  if (!cameraStream || elements.liveVideo.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) {
    elements.cameraStatus.textContent = 'Das Kamerabild ist noch nicht bereit.';
    return;
  }

  elements.captureButton.disabled = true;
  elements.cameraStatus.textContent = 'Foto wird aufgenommen …';
  const thisOperation = operationId;
  const width = elements.liveVideo.videoWidth;
  const height = elements.liveVideo.videoHeight;

  if (!width || !height) {
    showError('Das Kamerabild hatte noch keine gültige Größe. Bitte versuche die Aufnahme erneut.');
    return;
  }

  try {
    elements.canvas.width = width;
    elements.canvas.height = height;
    const context = elements.canvas.getContext('2d', { alpha: false });
    if (!context) {
      throw new Error('Canvas wird nicht unterstützt.');
    }

    if (facingMode === 'user') {
      context.translate(width, 0);
      context.scale(-1, 1);
    }
    context.drawImage(elements.liveVideo, 0, 0, width, height);
    currentBlob = await canvasToBlob(elements.canvas, 'image/jpeg', 0.92);

    if (thisOperation !== operationId) {
      currentBlob = null;
      resetCanvas();
      return;
    }

    currentObjectUrl = URL.createObjectURL(currentBlob);
    elements.photoPreview.src = currentObjectUrl;
    elements.photoPreview.alt = 'Dein gerade aufgenommenes Foto';
    elements.photoPreview.hidden = false;
    resetSaveButtons();
    elements.photoSaveControls.hidden = false;
    elements.videoPreview.hidden = true;
    elements.ownVideoPane.hidden = true;
    elements.playbackControls.hidden = true;
    elements.comparisonControls.hidden = true;
    stopStreamAfterCapture();
    resetCanvas();
    setView('preview');
    window.setTimeout(() => elements.previewBack.focus(), 0);
  } catch {
    showError('Das Foto konnte nicht verarbeitet werden. Bitte versuche es erneut.');
  }
}

function updateRecordingTimer() {
  const elapsed = Math.min(performance.now() - recordingStartedAt, MAX_RECORDING_MS);
  elements.recordingTime.textContent = formatRecordingTime(elapsed);
}

function showVideoPreview(blob) {
  currentBlob = blob;
  currentObjectUrl = URL.createObjectURL(currentBlob);
  elements.videoPreview.src = currentObjectUrl;
  elements.videoPreview.hidden = false;
  elements.ownVideoPane.hidden = false;
  elements.photoPreview.hidden = true;
  elements.photoSaveControls.hidden = true;
  elements.playbackControls.hidden = false;
  elements.comparisonControls.hidden = false;
  elements.videoPreview.playbackRate = 1;
  resetSaveButtons();
  resetPlaybackUI();
  elements.videoPreview.load();
  setView('preview');
  window.setTimeout(() => elements.playButton.focus(), 0);
}

function stopVideoRecording(reason = 'manual') {
  if (!mediaRecorder || mediaRecorder.state === 'inactive') {
    return;
  }

  clearTimers();
  updateRecordingTimer();
  isRecording = false;
  elements.captureButton.disabled = true;
  elements.captureButton.classList.remove('recording');
  elements.captureButton.setAttribute('aria-label', 'Videoaufnahme wird beendet');
  elements.cameraStatus.textContent = reason === 'limit'
    ? '3 Minuten erreicht. Video wird vorbereitet …'
    : 'Video wird vorbereitet …';
  mediaRecorder.stop();
}

function startVideoRecording() {
  if (!cameraStream || isRecording) {
    return;
  }

  const mimeType = selectSupportedVideoMimeType(window.MediaRecorder);
  if (!mimeType) {
    showError('Dieser Browser bietet kein unterstütztes WebM- oder MP4-Aufnahmeformat an. Bitte verwende einen aktuellen Browser oder die Fotoaufnahme.');
    return;
  }

  mediaChunks.splice(0, mediaChunks.length);
  selectedMimeType = mimeType;
  const thisOperation = operationId;

  try {
    mediaRecorder = new MediaRecorder(cameraStream, {
      mimeType,
      videoBitsPerSecond: 4_000_000
    });
  } catch {
    showError('Die Videoaufnahme konnte mit dem erkannten Format nicht gestartet werden. Bitte verwende die Fotoaufnahme oder einen anderen Browser.');
    return;
  }

  mediaRecorder.ondataavailable = (event) => {
    if (thisOperation === operationId && event.data?.size > 0) {
      mediaChunks.push(event.data);
    }
  };

  mediaRecorder.onerror = () => {
    if (thisOperation === operationId) {
      showError('Während der Videoaufnahme ist ein Fehler aufgetreten. Die unvollständige Aufnahme wurde verworfen.');
    }
  };

  mediaRecorder.onstop = () => {
    if (thisOperation !== operationId) {
      return;
    }

    const recordedType = mediaRecorder?.mimeType || selectedMimeType || mimeType;
    mediaRecorder = null;
    const usableChunks = mediaChunks.filter((chunk) => chunk.size > 0);
    mediaChunks = [];

    if (!usableChunks.length) {
      showError('Der Browser hat keine Videodaten geliefert. Die leere Aufnahme wurde verworfen.');
      return;
    }

    const blob = new Blob(usableChunks, { type: recordedType });
    stopStreamAfterCapture();
    elements.recordingIndicator.hidden = true;
    showVideoPreview(blob);
  };

  try {
    mediaRecorder.start(250);
    isRecording = true;
    recordingStartedAt = performance.now();
    elements.recordingIndicator.hidden = false;
    elements.captureButton.classList.add('recording');
    elements.captureButton.setAttribute('aria-label', 'Videoaufnahme stoppen');
    elements.cameraStatus.textContent = 'Videoaufnahme läuft – ohne Ton.';
    updateRecordingTimer();
    recordingTimer = window.setInterval(updateRecordingTimer, 100);
    recordingLimitTimer = window.setTimeout(() => stopVideoRecording('limit'), MAX_RECORDING_MS);
  } catch {
    showError('Die Videoaufnahme konnte nicht gestartet werden. Die Kamera wurde sicher beendet.');
  }
}

function handleCapture() {
  if (currentMode === 'photo') {
    void takePhoto();
  } else if (isRecording) {
    stopVideoRecording('manual');
  } else {
    startVideoRecording();
  }
}

function updatePlaybackUI() {
  const duration = Number.isFinite(elements.videoPreview.duration) ? elements.videoPreview.duration : 0;
  const currentTime = Number.isFinite(elements.videoPreview.currentTime) ? elements.videoPreview.currentTime : 0;
  elements.timeline.value = duration ? String(Math.round((currentTime / duration) * 1000)) : '0';
  elements.playbackTime.value = `${formatPlaybackTime(currentTime)} / ${formatPlaybackTime(duration)}`;
}

function updateComparisonPlaybackUI() {
  const duration = Number.isFinite(elements.comparisonVideo.duration) ? elements.comparisonVideo.duration : 0;
  const currentTime = Number.isFinite(elements.comparisonVideo.currentTime) ? elements.comparisonVideo.currentTime : 0;
  elements.comparisonTimeline.value = duration ? String(Math.round((currentTime / duration) * 1000)) : '0';
  elements.comparisonPlaybackTime.value = `${formatPlaybackTime(currentTime)} / ${formatPlaybackTime(duration)}`;
}

async function togglePlayback() {
  if (elements.videoPreview.paused || elements.videoPreview.ended) {
    if (elements.videoPreview.ended) {
      elements.videoPreview.currentTime = 0;
    }
    try {
      await elements.videoPreview.play();
    } catch {
      elements.videoPreview.pause();
      elements.previewStatus.textContent = 'Die eigene Aufnahme konnte nicht gestartet werden. Tippe erneut auf Start.';
    }
  } else {
    elements.videoPreview.pause();
  }
}

async function toggleComparisonPlayback() {
  if (elements.comparisonVideo.paused || elements.comparisonVideo.ended) {
    if (elements.comparisonVideo.ended) {
      elements.comparisonVideo.currentTime = 0;
    }
    try {
      await elements.comparisonVideo.play();
    } catch {
      elements.comparisonVideo.pause();
      elements.previewStatus.textContent = 'Das Leitbild konnte nicht gestartet werden. Tippe erneut auf Start.';
    }
  } else {
    elements.comparisonVideo.pause();
  }
}

function updatePlayButton() {
  const playing = !elements.videoPreview.paused && !elements.videoPreview.ended;
  elements.playButton.innerHTML = playing
    ? '<span aria-hidden="true">Ⅱ</span>'
    : '<span aria-hidden="true">▶</span>';
  elements.playButton.setAttribute('aria-label', playing ? 'Video pausieren' : 'Video starten');
}

function updateComparisonPlayButton() {
  const playing = !elements.comparisonVideo.paused && !elements.comparisonVideo.ended;
  elements.comparisonPlayButton.innerHTML = playing
    ? '<span aria-hidden="true">Ⅱ</span>'
    : '<span aria-hidden="true">▶</span>';
  elements.comparisonPlayButton.setAttribute('aria-label', playing ? 'Leitbild pausieren' : 'Leitbild starten');
}

function updateTeacherModeUI() {
  elements.teacherModeButton.setAttribute('aria-pressed', String(teacherMode));
  elements.teacherModeButton.setAttribute('aria-haspopup', teacherMode ? 'false' : 'dialog');
  elements.teacherModeLabel.textContent = teacherMode ? 'Lehrermodus beenden' : 'Lehrermodus';
  elements.teacherModeDescription.textContent = teacherMode
    ? 'Galerie wieder sperren'
    : 'Geschützte Galerie und Verwaltung öffnen';
  elements.galleryEntry.hidden = !teacherMode;
}

function resetTeacherLoginDialog() {
  teacherAuthVerified = false;
  teacherPlatformNeedsRepair = false;
  elements.teacherLoginForm.reset();
  elements.teacherLoginStatus.textContent = '';
  elements.teacherLoginStep.hidden = false;
  elements.teacherEnrollmentStep.hidden = true;
  const state = getTeacherAuthState();
  const showPlatformLogin = state.ready && state.platformAvailable && state.platformEnrolled;
  elements.teacherBiometricSection.hidden = !showPlatformLogin;
  elements.teacherBiometricDivider.hidden = !showPlatformLogin;
  elements.teacherBiometricButton.disabled = false;
  elements.teacherEnrollmentButton.disabled = false;
  elements.teacherEnrollmentButton.textContent = 'Gerätebestätigung einrichten';
}

function openTeacherLogin() {
  if (!teacherAuthReady) {
    elements.environmentStatus.textContent = 'Die Anmeldung wird noch vorbereitet. Bitte versuche es gleich erneut.';
    return;
  }
  teacherAuthOperationId += 1;
  resetTeacherLoginDialog();
  showModal(elements.teacherLoginDialog);
  window.requestAnimationFrame(() => {
    if (!elements.teacherLoginDialog.open) {
      return;
    }
    const state = getTeacherAuthState();
    if (state.platformAvailable && state.platformEnrolled) {
      elements.teacherBiometricButton.focus({ preventScroll: true });
    } else {
      elements.teacherPassword.focus({ preventScroll: true });
    }
  });
}

function activateTeacherMode() {
  teacherAuthVerified = false;
  teacherMode = true;
  updateTeacherModeUI();
  setView('start');
  window.setTimeout(() => elements.galleryEntry.focus({ preventScroll: true }), 0);
}

function completeTeacherLogin(authOperation = teacherAuthOperationId) {
  if (
    authOperation !== teacherAuthOperationId
    || !elements.teacherLoginDialog.open
    || document.visibilityState !== 'visible'
  ) {
    return false;
  }
  closeModal(elements.teacherLoginDialog);
  activateTeacherMode();
  return true;
}

function teacherAuthErrorMessage(error) {
  if (error?.code === 'cancelled') {
    return 'Die Gerätebestätigung wurde abgebrochen. Du kannst stattdessen das Passwort verwenden.';
  }
  if (error?.code === 'not-enrolled') {
    return 'Für dieses App-Profil ist noch keine Gerätebestätigung eingerichtet.';
  }
  if (error?.code === 'platform-unavailable') {
    return 'Die Gerätebestätigung ist hier nicht verfügbar. Verwende bitte das Passwort.';
  }
  return 'Die Gerätebestätigung ist fehlgeschlagen. Verwende bitte das Passwort.';
}

function authenticateTeacherWithPlatform() {
  if (elements.teacherBiometricButton.disabled) {
    return;
  }
  const authOperation = teacherAuthOperationId;
  elements.teacherBiometricButton.disabled = true;
  elements.teacherLoginStatus.textContent = 'Gerätebestätigung wird geöffnet …';
  let authentication;
  try {
    authentication = authenticateWithPlatform();
  } catch (error) {
    elements.teacherBiometricButton.disabled = false;
    elements.teacherLoginStatus.textContent = teacherAuthErrorMessage(error);
    return;
  }
  authentication.then(() => {
    completeTeacherLogin(authOperation);
  }).catch((error) => {
    if (authOperation !== teacherAuthOperationId || !elements.teacherLoginDialog.open) {
      return;
    }
    teacherPlatformNeedsRepair = !['cancelled', 'platform-unavailable', 'not-ready'].includes(error?.code);
    elements.teacherBiometricButton.disabled = false;
    elements.teacherLoginStatus.textContent = teacherAuthErrorMessage(error);
    elements.teacherPassword.focus({ preventScroll: true });
  });
}

async function authenticateTeacherWithPassword() {
  if (elements.teacherPassword.disabled) {
    return;
  }
  const authOperation = teacherAuthOperationId;
  const candidate = elements.teacherPassword.value;
  elements.teacherPassword.disabled = true;
  elements.teacherLoginStatus.textContent = 'Passwort wird geprüft …';
  let verified = false;
  try {
    verified = await verifyTeacherPassword(candidate);
  } catch {
    verified = false;
  }
  elements.teacherPassword.value = '';
  elements.teacherPassword.disabled = false;

  if (authOperation !== teacherAuthOperationId || !elements.teacherLoginDialog.open) {
    return;
  }

  if (!verified) {
    elements.teacherLoginStatus.textContent = 'Das Passwort ist nicht korrekt.';
    elements.teacherPassword.focus({ preventScroll: true });
    return;
  }

  const state = getTeacherAuthState();
  if (
    state.platformAvailable
    && state.storageAvailable
    && (!state.platformEnrolled || teacherPlatformNeedsRepair)
  ) {
    if (teacherPlatformNeedsRepair && state.platformEnrolled) {
      try {
        await forgetPlatformCredential({ preserveEnrollmentAuthorization: true });
      } catch {
        completeTeacherLogin(authOperation);
        return;
      }
      if (authOperation !== teacherAuthOperationId || !elements.teacherLoginDialog.open) {
        return;
      }
      elements.teacherEnrollmentButton.textContent = 'Gerätebestätigung neu einrichten';
    }
    teacherAuthVerified = true;
    elements.teacherLoginStep.hidden = true;
    elements.teacherEnrollmentStep.hidden = false;
    elements.teacherLoginStatus.textContent = '';
    elements.teacherEnrollmentButton.focus({ preventScroll: true });
    return;
  }
  completeTeacherLogin(authOperation);
}

function enrollTeacherPlatformCredential() {
  if (!teacherAuthVerified) {
    elements.teacherLoginStatus.textContent = 'Bitte melde dich erneut mit dem Passwort an.';
    return;
  }
  if (elements.teacherEnrollmentButton.disabled) {
    return;
  }
  const authOperation = teacherAuthOperationId;
  elements.teacherEnrollmentButton.disabled = true;
  elements.teacherLoginStatus.textContent = 'Gerätebestätigung wird eingerichtet …';
  let enrollment;
  try {
    enrollment = enrollPlatformCredential();
  } catch (error) {
    elements.teacherEnrollmentButton.disabled = false;
    elements.teacherLoginStatus.textContent = teacherAuthErrorMessage(error);
    return;
  }
  enrollment.then(() => {
    completeTeacherLogin(authOperation);
  }).catch((error) => {
    if (authOperation !== teacherAuthOperationId || !elements.teacherLoginDialog.open) {
      return;
    }
    elements.teacherEnrollmentButton.disabled = false;
    elements.teacherLoginStatus.textContent = error?.code === 'cancelled'
      ? 'Die Einrichtung wurde abgebrochen. Du kannst sie überspringen.'
      : 'Die Gerätebestätigung konnte nicht eingerichtet werden. Du kannst sie überspringen.';
    elements.teacherEnrollmentSkip.focus({ preventScroll: true });
  });
}

function releaseGalleryCardObjectUrls() {
  galleryPreviewObserver?.disconnect();
  galleryPreviewObserver = null;
  galleryCardObjectUrls.forEach((url) => URL.revokeObjectURL(url));
  galleryCardObjectUrls.clear();
  galleryLoadedMedia.clear();
}

function updateGallerySelectionUI() {
  const availableIds = new Set(galleryItems.map((item) => item.id));
  gallerySelectedIds = new Set(
    [...gallerySelectedIds].filter((id) => availableIds.has(id))
  );
  const selectedCount = gallerySelectedIds.size;
  const allSelected = galleryItems.length > 0 && selectedCount === galleryItems.length;
  elements.gallerySelectAll.checked = allSelected;
  elements.gallerySelectAll.indeterminate = selectedCount > 0 && !allSelected;
  elements.gallerySelectAll.disabled = galleryItems.length === 0;
  elements.gallerySelectionCount.textContent = selectedCount === 0
    ? 'Keine Auswahl'
    : `${selectedCount} ${selectedCount === 1 ? 'Aufnahme' : 'Aufnahmen'} ausgewählt`;
  elements.galleryDeleteSelected.disabled = selectedCount === 0;

  elements.galleryGrid.querySelectorAll('.gallery-card').forEach((card) => {
    const selected = gallerySelectedIds.has(card.dataset.mediaId);
    card.classList.toggle('is-selected', selected);
    card.setAttribute('aria-selected', String(selected));
    const checkbox = card.querySelector('.gallery-card-selection input');
    if (checkbox) {
      checkbox.checked = selected;
    }
  });
}

async function updateGalleryStorageStatus(expectedLoadId = galleryLoadId) {
  const isCurrentGallery = () => (
    expectedLoadId === galleryLoadId
    && teacherMode
    && document.body.dataset.view === 'gallery'
  );
  if (!isCurrentGallery()) {
    return;
  }
  if (!isMediaStoreSupported()) {
    elements.galleryStorageStatus.textContent = 'Lokaler App-Speicher wird von diesem Browser nicht unterstützt.';
    return;
  }
  try {
    const estimate = await getStorageEstimate();
    if (!isCurrentGallery()) {
      return;
    }
    if (estimate.usage === null || estimate.quota === null) {
      elements.galleryStorageStatus.textContent = 'Aufnahmen werden nur auf diesem Gerät gespeichert.';
      return;
    }
    elements.galleryStorageStatus.textContent = `${formatBytes(estimate.usage)} von ${formatBytes(estimate.quota)} lokal belegt`;
  } catch {
    if (isCurrentGallery()) {
      elements.galleryStorageStatus.textContent = 'Aufnahmen werden nur auf diesem Gerät gespeichert.';
    }
  }
}

function createGalleryActionButton({ action, id, label, symbol, danger = false }) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = `gallery-icon-button${danger ? ' gallery-delete-button' : ''}`;
  button.dataset.galleryAction = action;
  button.dataset.mediaId = id;
  button.setAttribute('aria-label', label);
  button.title = label;
  const icon = document.createElement('span');
  icon.setAttribute('aria-hidden', 'true');
  icon.textContent = symbol;
  button.append(icon);
  return button;
}

async function hydrateGalleryCardPreview(item, previewButton, renderId) {
  try {
    const stored = await getMedia(item.id);
    if (
      !stored
      || renderId !== galleryRenderId
      || !teacherMode
      || !previewButton.isConnected
    ) {
      return;
    }
    const url = URL.createObjectURL(stored.file);
    galleryLoadedMedia.set(item.id, stored);
    galleryCardObjectUrls.add(url);
    const media = document.createElement(item.kind === 'photo' ? 'img' : 'video');
    media.src = url;
    media.setAttribute('aria-hidden', 'true');
    media.tabIndex = -1;
    if (item.kind === 'photo') {
      media.alt = '';
      media.loading = 'lazy';
      media.draggable = false;
    } else {
      media.muted = true;
      media.playsInline = true;
      media.preload = 'metadata';
      media.disablePictureInPicture = true;
    }
    previewButton.replaceChildren(media);
  } catch {
    const unavailable = document.createElement('span');
    unavailable.className = 'gallery-preview-unavailable';
    unavailable.textContent = 'Vorschau nicht verfügbar';
    previewButton.replaceChildren(unavailable);
  }
}

function renderGallery() {
  const renderId = ++galleryRenderId;
  releaseGalleryCardObjectUrls();
  elements.galleryGrid.replaceChildren();
  elements.galleryEmpty.hidden = galleryItems.length > 0;
  elements.galleryGrid.hidden = galleryItems.length === 0;

  const fragment = document.createDocumentFragment();
  galleryItems.forEach((item) => {
    const card = document.createElement('article');
    card.className = 'gallery-card';
    card.dataset.mediaId = item.id;
    card.dataset.kind = item.kind;
    card.setAttribute('role', 'listitem');
    card.setAttribute('aria-selected', 'false');

    const selection = document.createElement('label');
    selection.className = 'gallery-card-selection';
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.dataset.galleryAction = 'select';
    checkbox.dataset.mediaId = item.id;
    checkbox.setAttribute('aria-label', `${item.kind === 'photo' ? 'Foto' : 'Video'} vom ${formatMediaDate(item.createdAt)} auswählen`);
    selection.append(checkbox);

    const preview = document.createElement('button');
    preview.type = 'button';
    preview.className = 'gallery-card-preview';
    preview.dataset.galleryAction = 'view';
    preview.dataset.mediaId = item.id;
    preview.setAttribute('aria-label', `${item.kind === 'photo' ? 'Foto' : 'Video'} vom ${formatMediaDate(item.createdAt)} ansehen`);
    const loading = document.createElement('span');
    loading.className = 'spinner';
    loading.setAttribute('aria-hidden', 'true');
    preview.append(loading);

    const body = document.createElement('div');
    body.className = 'gallery-card-body';
    const title = document.createElement('h2');
    title.textContent = item.kind === 'photo' ? 'Foto' : 'Video';
    const date = document.createElement('time');
    date.dateTime = item.createdAt;
    date.textContent = formatMediaDate(item.createdAt);
    const size = document.createElement('small');
    size.textContent = formatBytes(item.size);
    body.append(title, date, size);

    const actions = document.createElement('div');
    actions.className = 'gallery-card-actions';
    actions.append(
      createGalleryActionButton({
        action: 'view', id: item.id, label: 'Aufnahme ansehen', symbol: '▶'
      }),
      createGalleryActionButton({
        action: 'download', id: item.id, label: 'Aufnahme herunterladen', symbol: '↓'
      }),
      createGalleryActionButton({
        action: 'delete', id: item.id, label: 'Aufnahme löschen', symbol: '×', danger: true
      })
    );

    card.append(selection, preview, body, actions);
    fragment.append(card);
  });
  elements.galleryGrid.append(fragment);
  const previews = [...elements.galleryGrid.querySelectorAll('.gallery-card-preview')];
  const itemsById = new Map(galleryItems.map((item) => [item.id, item]));
  if ('IntersectionObserver' in window) {
    galleryPreviewObserver = new IntersectionObserver((entries, observer) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) {
          return;
        }
        observer.unobserve(entry.target);
        const item = itemsById.get(entry.target.dataset.mediaId);
        if (item) {
          void hydrateGalleryCardPreview(item, entry.target, renderId);
        }
      });
    }, { rootMargin: '240px 0px' });
    previews.forEach((preview) => galleryPreviewObserver.observe(preview));
  } else {
    previews.forEach((preview) => {
      const item = itemsById.get(preview.dataset.mediaId);
      if (item) {
        void hydrateGalleryCardPreview(item, preview, renderId);
      }
    });
  }
  updateGallerySelectionUI();
}

async function loadGallery() {
  if (!teacherMode) {
    return;
  }
  const loadId = ++galleryLoadId;
  elements.galleryStorageStatus.textContent = 'Galerie wird geladen …';
  try {
    const items = await listMedia();
    if (
      loadId !== galleryLoadId
      || !teacherMode
      || document.body.dataset.view !== 'gallery'
    ) {
      return;
    }
    galleryItems = items;
    renderGallery();
    await updateGalleryStorageStatus(loadId);
  } catch {
    if (
      loadId !== galleryLoadId
      || !teacherMode
      || document.body.dataset.view !== 'gallery'
    ) {
      return;
    }
    galleryItems = [];
    renderGallery();
    elements.galleryStorageStatus.textContent = 'Die Galerie konnte nicht gelesen werden.';
  }
}

function openGallery() {
  if (!teacherMode) {
    openTeacherLogin();
    return;
  }
  gallerySelectedIds.clear();
  setView('gallery');
  void loadGallery();
  window.setTimeout(() => elements.galleryBack.focus({ preventScroll: true }), 0);
}

function resetGalleryPlaybackUI() {
  elements.galleryViewerVideo.pause();
  elements.galleryViewerVideo.playbackRate = 1;
  elements.galleryPlayButton.innerHTML = '<span aria-hidden="true">▶</span>';
  elements.galleryPlayButton.setAttribute('aria-label', 'Gespeichertes Video starten');
  elements.galleryTimeline.value = '0';
  elements.galleryPlaybackTime.value = '0:00 / 0:00';
  elements.gallerySpeedMenu.open = false;
  elements.gallerySpeedValue.textContent = '1×';
  document.querySelectorAll('[data-gallery-speed]').forEach((button) => {
    button.setAttribute('aria-pressed', String(button.dataset.gallerySpeed === '1'));
  });
}

function updateGalleryPlaybackUI() {
  const duration = Number.isFinite(elements.galleryViewerVideo.duration)
    ? elements.galleryViewerVideo.duration
    : 0;
  const currentTime = Number.isFinite(elements.galleryViewerVideo.currentTime)
    ? elements.galleryViewerVideo.currentTime
    : 0;
  elements.galleryTimeline.value = duration
    ? String(Math.round((currentTime / duration) * 1000))
    : '0';
  elements.galleryPlaybackTime.value = `${formatPlaybackTime(currentTime)} / ${formatPlaybackTime(duration)}`;
}

function updateGalleryPlayButton() {
  const playing = !elements.galleryViewerVideo.paused && !elements.galleryViewerVideo.ended;
  elements.galleryPlayButton.innerHTML = playing
    ? '<span aria-hidden="true">Ⅱ</span>'
    : '<span aria-hidden="true">▶</span>';
  elements.galleryPlayButton.setAttribute(
    'aria-label',
    playing ? 'Gespeichertes Video pausieren' : 'Gespeichertes Video starten'
  );
}

async function toggleGalleryPlayback() {
  const video = elements.galleryViewerVideo;
  if (video.paused || video.ended) {
    if (video.ended) {
      video.currentTime = 0;
    }
    try {
      await video.play();
    } catch {
      video.pause();
      elements.galleryViewerStatus.textContent = 'Das Video konnte nicht gestartet werden. Tippe erneut auf Start.';
    }
  } else {
    video.pause();
  }
}

function clearGalleryViewerMedia({ restoreFocus = false } = {}) {
  galleryViewerRequestId += 1;
  const trigger = galleryViewerTrigger;
  galleryViewerTrigger = null;
  galleryViewerItem = null;
  elements.galleryViewerVideo.pause();
  elements.galleryViewerVideo.removeAttribute('src');
  elements.galleryViewerVideo.load();
  elements.galleryViewerVideo.hidden = true;
  elements.galleryViewerPhoto.removeAttribute('src');
  elements.galleryViewerPhoto.alt = '';
  elements.galleryViewerPhoto.hidden = true;
  elements.galleryPlaybackControls.hidden = true;
  elements.galleryAnnotationButton.hidden = true;
  elements.galleryViewerStatus.textContent = '';
  if (galleryViewerObjectUrl) {
    URL.revokeObjectURL(galleryViewerObjectUrl);
    galleryViewerObjectUrl = null;
  }
  resetGalleryPlaybackUI();
  if (restoreFocus && trigger?.isConnected) {
    trigger.focus({ preventScroll: true });
  }
}

function closeGalleryViewer({ restoreFocus = true } = {}) {
  const trigger = galleryViewerTrigger;
  closeModal(elements.galleryViewerDialog);
  clearGalleryViewerMedia({ restoreFocus: false });
  if (restoreFocus && trigger?.isConnected) {
    trigger.focus({ preventScroll: true });
  }
}

async function openGalleryViewer(id, trigger) {
  if (!teacherMode) {
    return;
  }
  clearGalleryViewerMedia();
  const requestId = ++galleryViewerRequestId;
  galleryViewerTrigger = trigger;
  elements.galleryViewerTitle.textContent = 'Aufnahme wird geladen …';
  elements.galleryViewerDate.textContent = '';
  elements.galleryDownloadButton.disabled = true;
  elements.galleryDeleteButton.disabled = true;
  elements.galleryAnnotationButton.hidden = true;
  elements.galleryViewerStatus.textContent = '';
  showModal(elements.galleryViewerDialog);

  try {
    const stored = galleryLoadedMedia.get(id) || await getMedia(id);
    if (
      !stored
      || requestId !== galleryViewerRequestId
      || !teacherMode
      || !elements.galleryViewerDialog.open
    ) {
      throw new Error('unavailable');
    }
    galleryLoadedMedia.set(id, stored);
    galleryViewerItem = stored;
    galleryViewerObjectUrl = URL.createObjectURL(stored.file);
    const { metadata } = stored;
    const isVideo = metadata.kind === 'video';
    elements.galleryViewerTitle.textContent = isVideo ? 'Video' : 'Foto';
    elements.galleryViewerDate.textContent = `${formatMediaDate(metadata.createdAt)} · ${formatBytes(metadata.size)}`;
    elements.galleryDownloadButton.disabled = false;
    elements.galleryDeleteButton.disabled = false;
    elements.galleryAnnotationButton.hidden = !isVideo;
    elements.galleryPlaybackControls.hidden = !isVideo;

    if (isVideo) {
      elements.galleryViewerVideo.src = galleryViewerObjectUrl;
      elements.galleryViewerVideo.hidden = false;
      elements.galleryViewerVideo.load();
      resetGalleryPlaybackUI();
      window.setTimeout(() => {
        if (requestId === galleryViewerRequestId && elements.galleryViewerDialog.open) {
          elements.galleryPlayButton.focus({ preventScroll: true });
        }
      }, 0);
    } else {
      elements.galleryViewerPhoto.src = galleryViewerObjectUrl;
      elements.galleryViewerPhoto.alt = `Gespeichertes Foto vom ${formatMediaDate(metadata.createdAt)}`;
      elements.galleryViewerPhoto.hidden = false;
      window.setTimeout(() => {
        if (requestId === galleryViewerRequestId && elements.galleryViewerDialog.open) {
          elements.galleryDownloadButton.focus({ preventScroll: true });
        }
      }, 0);
    }
  } catch {
    if (requestId !== galleryViewerRequestId || !elements.galleryViewerDialog.open) {
      return;
    }
    elements.galleryViewerTitle.textContent = 'Aufnahme nicht verfügbar';
    elements.galleryViewerStatus.textContent = 'Die gespeicherte Aufnahme konnte nicht gelesen werden.';
  }
}

function triggerGalleryDownload(stored, statusElement) {
  const fallback = stored.metadata.kind === 'photo' ? 'Sportkamera-Foto.jpg' : 'Sportkamera-Video.webm';
  const filename = sanitizeDownloadName(stored.metadata.suggestedDownloadName, fallback);
  const downloadBlob = new Blob([stored.file], { type: 'application/octet-stream' });
  const url = URL.createObjectURL(downloadBlob);
  delayedDownloadObjectUrls.add(url);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.style.position = 'fixed';
  link.style.left = '-10000px';
  link.textContent = 'Download';
  document.body.append(link);
  link.click();
  link.remove();
  window.setTimeout(() => {
    URL.revokeObjectURL(url);
    delayedDownloadObjectUrls.delete(url);
  }, 60_000);
  statusElement.textContent = `Download von ${filename} wurde gestartet.`;
}

function downloadGalleryItem(id, { button = null, statusElement = elements.galleryStorageStatus } = {}) {
  if (!teacherMode) {
    return Promise.resolve();
  }
  if (button) {
    button.disabled = true;
  }
  statusElement.textContent = 'Download wird vorbereitet …';

  const finish = () => {
    if (button?.isConnected) {
      button.disabled = false;
    }
  };
  const cached = galleryViewerItem?.metadata.id === id
    ? galleryViewerItem
    : galleryLoadedMedia.get(id);
  if (cached) {
    try {
      triggerGalleryDownload(cached, statusElement);
    } catch {
      statusElement.textContent = 'Der Download konnte nicht vorbereitet werden.';
    }
    finish();
    return Promise.resolve();
  }

  return getMedia(id).then((stored) => {
    if (!stored || !teacherMode) {
      throw new Error('unavailable');
    }
    galleryLoadedMedia.set(id, stored);
    triggerGalleryDownload(stored, statusElement);
  }).catch(() => {
    statusElement.textContent = 'Der Download konnte nicht vorbereitet werden.';
  }).finally(finish);
}

function closeDeleteConfirmation({ restoreFocus = true } = {}) {
  const trigger = pendingDeleteTrigger;
  pendingDeleteIds = [];
  pendingDeleteTrigger = null;
  elements.galleryDeleteConfirm.disabled = false;
  closeModal(elements.galleryDeleteDialog);
  if (restoreFocus && trigger?.isConnected) {
    trigger.focus({ preventScroll: true });
  }
}

function openDeleteConfirmation(ids, trigger) {
  if (!teacherMode) {
    return;
  }
  const availableIds = new Set(galleryItems.map((item) => item.id));
  pendingDeleteIds = [...new Set(ids)].filter((id) => availableIds.has(id));
  if (!pendingDeleteIds.length) {
    return;
  }
  pendingDeleteTrigger = trigger;
  const count = pendingDeleteIds.length;
  elements.galleryDeleteTitle.textContent = count === 1
    ? 'Aufnahme wirklich löschen?'
    : `${count} Aufnahmen wirklich löschen?`;
  elements.galleryDeleteMessage.textContent = count === 1
    ? 'Die ausgewählte Aufnahme wird dauerhaft aus der Galerie entfernt.'
    : 'Die ausgewählten Aufnahmen werden dauerhaft aus der Galerie entfernt.';
  elements.galleryDeleteConfirm.disabled = false;
  if (typeof elements.galleryDeleteDialog.showModal === 'function') {
    elements.galleryDeleteDialog.showModal();
  } else {
    elements.galleryDeleteDialog.setAttribute('open', '');
  }
  window.setTimeout(() => {
    if (elements.galleryDeleteDialog.open) {
      elements.galleryDeleteCancel.focus({ preventScroll: true });
    }
  }, 0);
}

async function confirmGalleryDeletion() {
  if (!teacherMode || !pendingDeleteIds.length) {
    closeDeleteConfirmation({ restoreFocus: false });
    return;
  }
  const ids = [...pendingDeleteIds];
  const trigger = pendingDeleteTrigger;
  elements.galleryDeleteConfirm.disabled = true;
  elements.galleryDeleteMessage.textContent = 'Aufnahmen werden gelöscht …';
  try {
    const result = await deleteMedia(ids);
    const deleted = new Set([...result.deletedIds, ...result.missingIds]);
    if (galleryViewerItem && deleted.has(galleryViewerItem.metadata.id)) {
      closeGalleryViewer({ restoreFocus: false });
    }
    deleted.forEach((id) => gallerySelectedIds.delete(id));
    pendingDeleteIds = [];
    pendingDeleteTrigger = null;
    closeModal(elements.galleryDeleteDialog);
    await loadGallery();
    if (result.errors.length) {
      elements.galleryStorageStatus.textContent = 'Einige Aufnahmen konnten nicht gelöscht werden.';
    } else {
      elements.galleryStorageStatus.textContent = ids.length === 1
        ? 'Die Aufnahme wurde gelöscht.'
        : `${ids.length} Aufnahmen wurden gelöscht.`;
    }
    if (trigger === elements.galleryDeleteSelected) {
      elements.galleryDeleteSelected.focus({ preventScroll: true });
    } else {
      elements.galleryBack.focus({ preventScroll: true });
    }
  } catch {
    elements.galleryDeleteConfirm.disabled = false;
    elements.galleryDeleteMessage.textContent = 'Die Aufnahme konnte nicht gelöscht werden. Bitte versuche es erneut.';
  }
}

function exitTeacherMode({ restoreFocus = true } = {}) {
  teacherAuthOperationId += 1;
  teacherMode = false;
  teacherAuthVerified = false;
  gallerySelectedIds.clear();
  galleryItems = [];
  galleryLoadId += 1;
  galleryRenderId += 1;
  releaseGalleryCardObjectUrls();
  annotation.close({ restoreFocus: false });
  closeGalleryViewer({ restoreFocus: false });
  closeDeleteConfirmation({ restoreFocus: false });
  closeModal(elements.teacherLoginDialog);
  elements.galleryGrid.replaceChildren();
  elements.galleryEmpty.hidden = false;
  updateTeacherModeUI();
  setView('start');
  if (restoreFocus) {
    window.setTimeout(() => elements.teacherModeButton.focus({ preventScroll: true }), 0);
  }
}

document.querySelectorAll('[data-start-mode]').forEach((button) => {
  button.addEventListener('click', () => void beginNewSession(button.dataset.startMode));
});

document.querySelectorAll('[data-camera-mode]').forEach((button) => {
  button.addEventListener('click', async () => {
    const nextMode = button.dataset.cameraMode;
    if (nextMode === currentMode || isRecording) {
      return;
    }
    cleanupMedia({ nextView: 'camera' });
    currentMode = nextMode;
    await startCamera();
  });
});

elements.switchCamera.addEventListener('click', async () => {
  if (isRecording) {
    return;
  }
  facingMode = facingMode === 'environment' ? 'user' : 'environment';
  cleanupMedia({ nextView: 'camera' });
  await startCamera();
});

elements.captureButton.addEventListener('click', handleCapture);
elements.cameraBack.addEventListener('click', () => cleanupMedia({ nextView: 'start' }));
elements.previewBack.addEventListener('click', () => cleanupMedia({ nextView: 'start' }));
elements.discardButton.addEventListener('click', () => cleanupMedia({ nextView: 'start' }));
elements.newRecordingButton.addEventListener('click', () => void beginNewSession(currentMode));
elements.retryButton.addEventListener('click', () => void beginNewSession(currentMode));
elements.errorHomeButton.addEventListener('click', () => cleanupMedia({ nextView: 'start' }));
elements.playButton.addEventListener('click', () => void togglePlayback());
elements.comparisonPlayButton.addEventListener('click', () => void toggleComparisonPlayback());
elements.photoSaveButton.addEventListener('click', () => {
  void saveCurrentMedia('photo', elements.photoSaveButton);
});
elements.videoSaveButton.addEventListener('click', () => {
  void saveCurrentMedia('video', elements.videoSaveButton);
});
elements.videoAnnotationButton.addEventListener('click', () => {
  annotation.open(elements.videoPreview, 'Eigene Aufnahme', elements.videoAnnotationButton);
});
elements.comparisonAnnotationButton.addEventListener('click', () => {
  annotation.open(
    elements.comparisonVideo,
    elements.comparisonPlayerLabel.textContent,
    elements.comparisonAnnotationButton
  );
});

elements.teacherModeButton.addEventListener('click', () => {
  if (teacherMode) {
    exitTeacherMode();
  } else {
    openTeacherLogin();
  }
});
elements.galleryEntry.addEventListener('click', openGallery);
elements.galleryBack.addEventListener('click', () => {
  galleryLoadId += 1;
  galleryRenderId += 1;
  gallerySelectedIds.clear();
  releaseGalleryCardObjectUrls();
  elements.galleryGrid.replaceChildren();
  setView('start');
  elements.galleryEntry.focus({ preventScroll: true });
});

elements.teacherLoginForm.addEventListener('submit', (event) => {
  event.preventDefault();
  void authenticateTeacherWithPassword();
});
elements.teacherBiometricButton.addEventListener('click', authenticateTeacherWithPlatform);
elements.teacherEnrollmentButton.addEventListener('click', enrollTeacherPlatformCredential);
elements.teacherEnrollmentSkip.addEventListener('click', () => {
  if (teacherAuthVerified) {
    completeTeacherLogin();
  }
});
elements.teacherLoginCancel.addEventListener('click', () => {
  closeModal(elements.teacherLoginDialog);
  elements.teacherModeButton.focus({ preventScroll: true });
});
elements.teacherLoginDialog.addEventListener('close', () => {
  teacherAuthOperationId += 1;
  teacherAuthVerified = false;
  elements.teacherPassword.value = '';
  elements.teacherPassword.disabled = false;
  elements.teacherLoginStatus.textContent = '';
});
elements.teacherLoginDialog.addEventListener('click', (event) => {
  if (event.target === elements.teacherLoginDialog) {
    closeModal(elements.teacherLoginDialog);
    elements.teacherModeButton.focus({ preventScroll: true });
  }
});

elements.galleryGrid.addEventListener('change', (event) => {
  const checkbox = event.target.closest('[data-gallery-action="select"]');
  if (!checkbox || !teacherMode) {
    return;
  }
  if (checkbox.checked) {
    gallerySelectedIds.add(checkbox.dataset.mediaId);
  } else {
    gallerySelectedIds.delete(checkbox.dataset.mediaId);
  }
  updateGallerySelectionUI();
});
elements.galleryGrid.addEventListener('click', (event) => {
  const actionButton = event.target.closest('[data-gallery-action]');
  if (!actionButton || !teacherMode) {
    return;
  }
  const { galleryAction: action, mediaId: id } = actionButton.dataset;
  if (action === 'view') {
    void openGalleryViewer(id, actionButton);
  } else if (action === 'download') {
    void downloadGalleryItem(id, { button: actionButton });
  } else if (action === 'delete') {
    openDeleteConfirmation([id], actionButton);
  }
});
elements.gallerySelectAll.addEventListener('change', () => {
  gallerySelectedIds = elements.gallerySelectAll.checked
    ? new Set(galleryItems.map((item) => item.id))
    : new Set();
  updateGallerySelectionUI();
});
elements.galleryDeleteSelected.addEventListener('click', () => {
  openDeleteConfirmation([...gallerySelectedIds], elements.galleryDeleteSelected);
});

elements.galleryViewerClose.addEventListener('click', () => closeGalleryViewer());
elements.galleryViewerDialog.addEventListener('close', () => clearGalleryViewerMedia({ restoreFocus: true }));
elements.galleryViewerDialog.addEventListener('click', (event) => {
  if (event.target === elements.galleryViewerDialog) {
    closeGalleryViewer();
  }
});
elements.galleryPlayButton.addEventListener('click', () => void toggleGalleryPlayback());
elements.galleryTimeline.addEventListener('input', () => {
  const duration = elements.galleryViewerVideo.duration;
  if (Number.isFinite(duration) && duration > 0) {
    elements.galleryViewerVideo.currentTime = (Number(elements.galleryTimeline.value) / 1000) * duration;
    updateGalleryPlaybackUI();
  }
});
document.querySelectorAll('[data-gallery-speed]').forEach((button) => {
  button.addEventListener('click', () => {
    const rate = Number(button.dataset.gallerySpeed);
    elements.galleryViewerVideo.playbackRate = rate;
    document.querySelectorAll('[data-gallery-speed]').forEach((speedButton) => {
      speedButton.setAttribute('aria-pressed', String(speedButton === button));
    });
    elements.gallerySpeedValue.textContent = button.textContent.trim();
    elements.gallerySpeedMenu.open = false;
    elements.galleryViewerStatus.textContent = `Wiedergabegeschwindigkeit ${button.textContent.trim()}.`;
  });
});
elements.galleryAnnotationButton.addEventListener('click', () => {
  annotation.open(elements.galleryViewerVideo, 'Gespeichertes Video', elements.galleryAnnotationButton, elements.galleryViewerStatus);
});
elements.galleryDownloadButton.addEventListener('click', () => {
  if (galleryViewerItem) {
    void downloadGalleryItem(galleryViewerItem.metadata.id, {
      button: elements.galleryDownloadButton,
      statusElement: elements.galleryViewerStatus
    });
  }
});
elements.galleryDeleteButton.addEventListener('click', () => {
  if (galleryViewerItem) {
    openDeleteConfirmation([galleryViewerItem.metadata.id], elements.galleryDeleteButton);
  }
});

elements.galleryDeleteForm.addEventListener('submit', (event) => {
  event.preventDefault();
  void confirmGalleryDeletion();
});
elements.galleryDeleteCancel.addEventListener('click', () => closeDeleteConfirmation());
elements.galleryDeleteDialog.addEventListener('close', () => {
  const trigger = pendingDeleteTrigger;
  pendingDeleteIds = [];
  pendingDeleteTrigger = null;
  elements.galleryDeleteConfirm.disabled = false;
  if (trigger?.isConnected) {
    trigger.focus({ preventScroll: true });
  }
});
elements.galleryDeleteDialog.addEventListener('click', (event) => {
  if (event.target === elements.galleryDeleteDialog) {
    closeDeleteConfirmation();
  }
});

elements.timeline.addEventListener('input', () => {
  const duration = elements.videoPreview.duration;
  if (Number.isFinite(duration) && duration > 0) {
    elements.videoPreview.currentTime = (Number(elements.timeline.value) / 1000) * duration;
    updatePlaybackUI();
  }
});

elements.comparisonTimeline.addEventListener('input', () => {
  const duration = elements.comparisonVideo.duration;
  if (Number.isFinite(duration) && duration > 0) {
    elements.comparisonVideo.currentTime = (Number(elements.comparisonTimeline.value) / 1000) * duration;
    updateComparisonPlaybackUI();
  }
});

document.querySelectorAll('[data-speed]').forEach((button) => {
  button.addEventListener('click', () => {
    const rate = Number(button.dataset.speed);
    elements.videoPreview.playbackRate = rate;
    document.querySelectorAll('[data-speed]').forEach((speedButton) => {
      speedButton.setAttribute('aria-pressed', String(speedButton === button));
    });
    elements.speedValue.textContent = button.textContent.trim();
    elements.speedMenu.open = false;
    elements.previewStatus.textContent = `Eigene Aufnahme: Wiedergabegeschwindigkeit ${button.textContent.trim()}.`;
  });
});

document.querySelectorAll('[data-comparison-speed]').forEach((button) => {
  button.addEventListener('click', () => {
    const rate = Number(button.dataset.comparisonSpeed);
    elements.comparisonVideo.playbackRate = rate;
    document.querySelectorAll('[data-comparison-speed]').forEach((speedButton) => {
      speedButton.setAttribute('aria-pressed', String(speedButton === button));
    });
    elements.comparisonSpeedValue.textContent = button.textContent.trim();
    elements.comparisonSpeedMenu.open = false;
    elements.previewStatus.textContent = `Leitbild: Wiedergabegeschwindigkeit ${button.textContent.trim()}.`;
  });
});

document.querySelectorAll('.speed-menu').forEach((menu) => {
  menu.addEventListener('toggle', () => {
    if (!menu.open) {
      return;
    }
    document.querySelectorAll('.speed-menu').forEach((otherMenu) => {
      if (otherMenu !== menu) {
        otherMenu.open = false;
      }
    });
  });
  menu.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && menu.open) {
      menu.open = false;
      menu.querySelector('summary')?.focus();
    }
  });
});

document.addEventListener('click', (event) => {
  if (!event.target.closest('.speed-menu')) {
    document.querySelectorAll('.speed-menu').forEach((menu) => {
      menu.open = false;
    });
  }
});

elements.comparisonButton.addEventListener('click', () => {
  openComparisonPicker();
});

elements.comparisonClose.addEventListener('click', () => closeComparisonPicker({ restoreFocus: true }));

elements.comparisonPicker.addEventListener('close', () => {
  elements.comparisonButton.setAttribute('aria-expanded', 'false');
});

elements.comparisonPicker.addEventListener('click', (event) => {
  if (event.target === elements.comparisonPicker) {
    closeComparisonPicker({ restoreFocus: true });
  }
});

document.querySelectorAll('[data-comparison-category]').forEach((button) => {
  button.addEventListener('click', () => showComparisonSports(button.dataset.comparisonCategory));
});

document.querySelectorAll('[data-comparison-sport]').forEach((button) => {
  button.addEventListener('click', () => showComparisonStep('guide'));
});

document.querySelectorAll('[data-comparison-back]').forEach((button) => {
  button.addEventListener('click', () => {
    if (button.dataset.comparisonBack === 'category') {
      showComparisonStep('category');
    } else {
      showComparisonSports(selectedComparisonCategory);
    }
  });
});

document.querySelectorAll('[data-comparison-src]').forEach((button) => {
  button.addEventListener('click', () => selectComparison(button));
});

elements.comparisonRemove.addEventListener('click', () => {
  resetComparison();
  elements.previewStatus.textContent = 'Das Leitbild wurde aus dem Vergleich entfernt.';
});

elements.videoPreview.addEventListener('play', updatePlayButton);
elements.videoPreview.addEventListener('pause', updatePlayButton);
elements.videoPreview.addEventListener('ended', updatePlayButton);
elements.videoPreview.addEventListener('timeupdate', updatePlaybackUI);
elements.videoPreview.addEventListener('durationchange', updatePlaybackUI);
elements.videoPreview.addEventListener('contextmenu', (event) => event.preventDefault());
elements.comparisonVideo.addEventListener('play', updateComparisonPlayButton);
elements.comparisonVideo.addEventListener('pause', updateComparisonPlayButton);
elements.comparisonVideo.addEventListener('ended', updateComparisonPlayButton);
elements.comparisonVideo.addEventListener('timeupdate', updateComparisonPlaybackUI);
elements.comparisonVideo.addEventListener('durationchange', updateComparisonPlaybackUI);
elements.comparisonVideo.addEventListener('loadedmetadata', updateComparisonPlaybackUI);
elements.comparisonVideo.addEventListener('error', () => {
  if (!elements.comparisonPane.hidden && elements.comparisonVideo.hasAttribute('src')) {
    elements.previewStatus.textContent = 'Das ausgewählte Leitbild konnte nicht geladen werden.';
  }
});
elements.comparisonVideo.addEventListener('contextmenu', (event) => event.preventDefault());
elements.photoPreview.addEventListener('contextmenu', (event) => event.preventDefault());
elements.galleryViewerVideo.addEventListener('play', updateGalleryPlayButton);
elements.galleryViewerVideo.addEventListener('pause', updateGalleryPlayButton);
elements.galleryViewerVideo.addEventListener('ended', updateGalleryPlayButton);
elements.galleryViewerVideo.addEventListener('timeupdate', updateGalleryPlaybackUI);
elements.galleryViewerVideo.addEventListener('durationchange', updateGalleryPlaybackUI);
elements.galleryViewerVideo.addEventListener('loadedmetadata', updateGalleryPlaybackUI);
elements.galleryViewerVideo.addEventListener('error', () => {
  if (elements.galleryViewerVideo.hasAttribute('src')) {
    elements.galleryViewerStatus.textContent = 'Das gespeicherte Video konnte nicht geladen werden.';
  }
});
elements.galleryViewerVideo.addEventListener('contextmenu', (event) => event.preventDefault());
elements.galleryViewerPhoto.addEventListener('contextmenu', (event) => event.preventDefault());

window.addEventListener('pagehide', () => {
  teacherAuthOperationId += 1;
  teacherAuthVerified = false;
  closeModal(elements.teacherLoginDialog);
  cleanupMedia({ nextView: 'start' });
  if (teacherMode) {
    exitTeacherMode({ restoreFocus: false });
  }
});
window.addEventListener('beforeunload', () => {
  teacherAuthOperationId += 1;
  teacherAuthVerified = false;
  closeModal(elements.teacherLoginDialog);
  cleanupMedia({ nextView: 'start' });
  if (teacherMode) {
    exitTeacherMode({ restoreFocus: false });
  }
});
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') {
    teacherAuthOperationId += 1;
    teacherAuthVerified = false;
    cleanupMedia({ nextView: 'start' });
    if (teacherMode) {
      exitTeacherMode({ restoreFocus: false });
    } else {
      closeModal(elements.teacherLoginDialog);
    }
  }
});

function initialize() {
  cleanupMedia({ nextView: 'start' });
  teacherMode = false;
  teacherAuthReady = false;
  elements.teacherModeButton.disabled = true;
  updateTeacherModeUI();
  preloadTeacherAuth().then(() => {
    teacherAuthReady = true;
    elements.teacherModeButton.disabled = false;
  }).catch(() => {
    teacherAuthReady = true;
    elements.teacherModeButton.disabled = false;
  });
  const supportMessage = browserSupportMessage('photo');
  if (supportMessage) {
    elements.environmentStatus.textContent = supportMessage;
    elements.environmentStatus.classList.add('warning');
  }

  if ('serviceWorker' in navigator && window.isSecureContext) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('./sw.js').catch(() => {
        elements.environmentStatus.textContent = 'Die App ist nutzbar, konnte aber den Offline-Modus nicht aktivieren.';
      });
    }, { once: true });
  }

  document.body.dataset.ready = 'true';
}

initialize();
