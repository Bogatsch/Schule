import {
  CAMERA_TARGET_FRAME_RATE,
  DELAY_DEFAULT_SECONDS,
  DELAY_KNOB_SWEEP_DEGREES,
  DELAY_MAX_SECONDS,
  DELAY_MIN_SECONDS,
  MAX_RECORDING_MS,
  clampDelaySeconds,
  delayCaptureIntervalMs,
  delayKnobProgress,
  delaySecondsToKnobAngle,
  formatDelayCountdown,
  formatPlaybackTime,
  formatRecordingTime,
  knobAngleToDelaySeconds,
  nextStepTime,
  selectSupportedVideoMimeType,
  videoBitrateForFrameRate
} from './media-utils.js?v=39';
import { setupVideoAnnotation } from './annotation.js?v=29';
import { convertWebMToMp4, isWebMVideo } from './video-converter.js?v=35';
import { createZip } from './zip-utils.js?v=33';
import { GUIDE_TREE } from './pages/leitbilder/guide-tree.js?v=0da59186';
import {
  deleteMedia,
  getMedia,
  getStorageEstimate,
  isMediaStoreSupported,
  listMedia,
  requestPersistentStorage,
  resetMediaStore,
  saveMedia
} from './media-store.js?v=31';
import {
  authenticateWithPlatform,
  enrollPlatformCredential,
  forgetPlatformCredential,
  getTeacherAuthState,
  preloadTeacherAuth,
  resetAuthentication,
  verifyPassword
} from './teacher-auth.js?v=31';

const CAMERA_CONSTRAINTS = Object.freeze({
  width: { ideal: 1280 },
  height: { ideal: 720 },
  frameRate: { ideal: CAMERA_TARGET_FRAME_RATE }
});

// Die verzögerte Wiedergabe puffert JPEG-Einzelbilder im Arbeitsspeicher. Breite
// und Qualität halten zusammen mit dem Bildbudget aus `delayCaptureIntervalMs`
// auch 60 Sekunden Vorlauf bei rund 30 MB.
const DELAY_CAPTURE_MAX_WIDTH = 720;
const DELAY_FRAME_QUALITY = 0.6;
const DELAY_BUFFER_MARGIN_MS = 2000;

const elements = {
  startView: document.querySelector('#start-view'),
  cameraView: document.querySelector('#camera-view'),
  previewView: document.querySelector('#preview-view'),
  galleryView: document.querySelector('#gallery-view'),
  errorView: document.querySelector('#error-view'),
  settingsButton: document.querySelector('#settings-button'),
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
  delayView: document.querySelector('#delay-view'),
  delayEntry: document.querySelector('#delay-entry'),
  delayBack: document.querySelector('#delay-back'),
  delaySwitchCamera: document.querySelector('#delay-switch-camera'),
  delaySettings: document.querySelector('#delay-settings'),
  delayValueLabel: document.querySelector('#delay-value-label'),
  delayStage: document.querySelector('#delay-stage'),
  delayVideo: document.querySelector('#delay-video'),
  delayCanvas: document.querySelector('#delay-canvas'),
  delayPlaceholder: document.querySelector('#delay-placeholder'),
  delayCountdown: document.querySelector('#delay-countdown'),
  delayCountdownValue: document.querySelector('#delay-countdown-value'),
  delayDialog: document.querySelector('#delay-dialog'),
  delayDialogClose: document.querySelector('#delay-dialog-close'),
  delayKnob: document.querySelector('#delay-knob'),
  delayKnobValue: document.querySelector('#delay-knob-value'),
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
  stepBack: document.querySelector('#step-back'),
  stepForward: document.querySelector('#step-forward'),
  playbackTime: document.querySelector('#playback-time'),
  speedMenu: document.querySelector('#speed-menu'),
  speedValue: document.querySelector('#speed-value'),
  videoSaveButton: document.querySelector('#video-save-button'),
  videoNameDialog: document.querySelector('#video-name-dialog'),
  videoNameForm: document.querySelector('#video-name-form'),
  videoNameInput: document.querySelector('#video-name'),
  videoNameSubmit: document.querySelector('#video-name-submit'),
  videoNameCancel: document.querySelector('#video-name-cancel'),
  videoNameStatus: document.querySelector('#video-name-status'),
  videoAnnotationButton: document.querySelector('#video-annotation-button'),
  comparisonPlaybackControls: document.querySelector('#comparison-playback-controls'),
  comparisonPlayerLabel: document.querySelector('#comparison-player-label'),
  comparisonPlayButton: document.querySelector('#comparison-play-button'),
  comparisonTimeline: document.querySelector('#comparison-timeline'),
  comparisonStepBack: document.querySelector('#comparison-step-back'),
  comparisonStepForward: document.querySelector('#comparison-step-forward'),
  comparisonPlaybackTime: document.querySelector('#comparison-playback-time'),
  comparisonSpeedMenu: document.querySelector('#comparison-speed-menu'),
  comparisonSpeedValue: document.querySelector('#comparison-speed-value'),
  comparisonAnnotationButton: document.querySelector('#comparison-annotation-button'),
  comparisonControls: document.querySelector('#comparison-controls'),
  comparisonButton: document.querySelector('#comparison-button'),
  comparisonButtonLabel: document.querySelector('#comparison-button-label'),
  comparisonPicker: document.querySelector('#comparison-picker'),
  comparisonClose: document.querySelector('#comparison-close'),
  comparisonUp: document.querySelector('#comparison-up'),
  comparisonBreadcrumb: document.querySelector('#comparison-breadcrumb'),
  comparisonBrowseTitle: document.querySelector('#comparison-browse-title'),
  comparisonList: document.querySelector('#comparison-list'),
  comparisonEmpty: document.querySelector('#comparison-empty'),
  comparisonActive: document.querySelector('#comparison-active'),
  comparisonActiveLabel: document.querySelector('#comparison-active-label'),
  comparisonRemove: document.querySelector('#comparison-remove'),
  galleryBack: document.querySelector('#gallery-back'),
  galleryGrid: document.querySelector('#gallery-grid'),
  galleryEmpty: document.querySelector('#gallery-empty'),
  galleryStorageStatus: document.querySelector('#gallery-storage-status'),
  gallerySelectAll: document.querySelector('#gallery-select-all'),
  gallerySelectionCount: document.querySelector('#gallery-selection-count'),
  galleryDownloadSelected: document.querySelector('#gallery-download-selected'),
  galleryDeleteSelected: document.querySelector('#gallery-delete-selected'),
  accountDialog: document.querySelector('#account-dialog'),
  accountClose: document.querySelector('#account-close'),
  accountLoginTab: document.querySelector('#account-login-tab'),
  accountResetTab: document.querySelector('#account-reset-tab'),
  accountLoginForm: document.querySelector('#account-login-form'),
  accountLoginPanel: document.querySelector('#account-login-panel'),
  accountAuthenticatedStep: document.querySelector('#account-authenticated-step'),
  accountPasswordStep: document.querySelector('#account-password-step'),
  accountPassword: document.querySelector('#account-password'),
  accountPasswordSubmit: document.querySelector('#account-password-submit'),
  accountBiometricSection: document.querySelector('#account-biometric-section'),
  accountBiometricDivider: document.querySelector('#account-biometric-divider'),
  accountBiometricButton: document.querySelector('#account-biometric-button'),
  accountEnrollmentStep: document.querySelector('#account-enrollment-step'),
  accountEnrollmentButton: document.querySelector('#account-enrollment-button'),
  accountEnrollmentSkip: document.querySelector('#account-enrollment-skip'),
  accountLogout: document.querySelector('#account-logout'),
  accountResetForm: document.querySelector('#account-reset-form'),
  accountResetPanel: document.querySelector('#account-reset-panel'),
  accountResetConfirmation: document.querySelector('#account-reset-confirmation'),
  accountResetSubmit: document.querySelector('#account-reset-submit'),
  accountStatus: document.querySelector('#account-status'),
  galleryViewerDialog: document.querySelector('#gallery-viewer-dialog'),
  galleryViewerClose: document.querySelector('#gallery-viewer-close'),
  galleryViewerTitle: document.querySelector('#gallery-viewer-title'),
  galleryViewerDate: document.querySelector('#gallery-viewer-date'),
  galleryViewerPhoto: document.querySelector('#gallery-viewer-photo'),
  galleryViewerVideo: document.querySelector('#gallery-viewer-video'),
  galleryPlaybackControls: document.querySelector('#gallery-playback-controls'),
  galleryPlayButton: document.querySelector('#gallery-play-button'),
  galleryTimeline: document.querySelector('#gallery-timeline'),
  galleryStepBack: document.querySelector('#gallery-step-back'),
  galleryStepForward: document.querySelector('#gallery-step-forward'),
  galleryPlaybackTime: document.querySelector('#gallery-playback-time'),
  gallerySpeedMenu: document.querySelector('#gallery-speed-menu'),
  gallerySpeedValue: document.querySelector('#gallery-speed-value'),
  galleryAnnotationButton: document.querySelector('#gallery-annotation-button'),
  galleryDownloadButton: document.querySelector('#gallery-download-button'),
  galleryDeleteButton: document.querySelector('#gallery-delete-button'),
  galleryViewerStatus: document.querySelector('#gallery-viewer-status'),
  mp4ConversionDialog: document.querySelector('#mp4-conversion-dialog'),
  mp4ConversionSpinner: document.querySelector('#mp4-conversion-spinner'),
  mp4ConversionTitle: document.querySelector('#mp4-conversion-title'),
  mp4ConversionDescription: document.querySelector('#mp4-conversion-description'),
  mp4ConversionProgress: document.querySelector('#mp4-conversion-progress'),
  mp4ConversionStatus: document.querySelector('#mp4-conversion-status'),
  mp4ConversionDownload: document.querySelector('#mp4-conversion-download'),
  mp4ConversionCancel: document.querySelector('#mp4-conversion-cancel'),
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
  delay: elements.delayView,
  preview: elements.previewView,
  gallery: elements.galleryView,
  error: elements.errorView
};

let currentMode = 'photo';
let facingMode = 'environment';
let delaySeconds = DELAY_DEFAULT_SECONDS;
let delayFrames = [];
let delayFrameCounter = 0;
let delayRenderedFrameId = 0;
let delaySessionStart = 0;
let delayLoopHandle = null;
let delayLastCaptureAt = 0;
let delayCapturePending = false;
let delayDecodePending = false;
let delayShownCountdown = '';
const delayCaptureCanvas = document.createElement('canvas');
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
let comparisonPath = [];
let currentSavedMediaId = null;
let videoNameSaving = false;
let videoNameRestoreFocus = true;
let teacherMode = false;
let teacherAuthVerified = false;
let teacherAuthReady = false;
let teacherAuthOperationId = 0;
let teacherPlatformNeedsRepair = false;
let accountResetInProgress = false;
let galleryItems = [];
let gallerySelectedIds = new Set();
let galleryLoadId = 0;
let galleryRenderId = 0;
let galleryPreviewObserver = null;
let galleryViewerItem = null;
let galleryViewerObjectUrl = null;
let galleryViewerTrigger = null;
let galleryViewerRequestId = 0;
let galleryZipDownloadRequestId = 0;
let galleryZipDownloadInProgress = false;
let pendingDeleteIds = [];
let pendingDeleteTrigger = null;
let mp4ConversionController = null;
let mp4ConversionRequestId = 0;
let mp4ConversionTrigger = null;
let mp4ConversionRestoreFocus = true;
let mp4ConversionStatusElement = null;
let preparedConvertedDownload = null;
const galleryCardObjectUrls = new Set();
const galleryLoadedMedia = new Map();
const delayedDownloadObjectUrls = new Set();
const annotation = setupVideoAnnotation({ statusElement: elements.previewStatus });

let accountSyncChannel = null;
if ('BroadcastChannel' in window) {
  try {
    accountSyncChannel = new BroadcastChannel('sportkamera-account-v1');
  } catch {
    accountSyncChannel = null;
  }
}

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

function comparisonNodeAt(pathSegments) {
  let node = GUIDE_TREE;
  for (const segment of pathSegments) {
    const next = node.children?.find((child) => child.name === segment);
    if (!next) {
      return GUIDE_TREE;
    }
    node = next;
  }
  return node;
}

function countComparisonVideos(node) {
  if (node.src) {
    return 1;
  }
  return node.children.reduce((total, child) => total + countComparisonVideos(child), 0);
}

function comparisonEntryCard(child) {
  const button = document.createElement('button');
  button.className = 'comparison-list-card';
  button.type = 'button';
  button.dataset.comparisonPath = child.path;

  const text = document.createElement('span');
  text.className = 'comparison-card-text';
  const name = document.createElement('strong');
  name.textContent = child.name;
  const subtitle = document.createElement('small');
  const count = child.src ? 0 : countComparisonVideos(child);
  subtitle.textContent = child.src
    ? 'Video auswählen'
    : `${count} ${count === 1 ? 'Leitbild' : 'Leitbilder'}`;
  text.append(name, subtitle);

  const arrow = document.createElement('span');
  arrow.className = 'arrow';
  arrow.setAttribute('aria-hidden', 'true');
  arrow.textContent = '→';

  button.append(text, arrow);
  button.addEventListener('click', () => {
    if (child.src) {
      selectComparison(child);
    } else {
      showComparisonLevel([...comparisonPath, child.name]);
    }
  });
  return button;
}

function showComparisonLevel(pathSegments, { focusHeading = true } = {}) {
  comparisonPath = pathSegments;
  const node = comparisonNodeAt(pathSegments);
  const entries = node.children ?? [];

  elements.comparisonUp.hidden = pathSegments.length === 0;
  elements.comparisonBreadcrumb.textContent = pathSegments.length === 0
    ? 'Leitbilder'
    : pathSegments.join(' › ');
  elements.comparisonBrowseTitle.textContent = pathSegments.length === 0
    ? 'Leitbilder'
    : node.name;
  elements.comparisonList.replaceChildren(...entries.map(comparisonEntryCard));
  elements.comparisonList.hidden = entries.length === 0;
  elements.comparisonEmpty.hidden = entries.length > 0;

  if (focusHeading && elements.comparisonPicker.open) {
    elements.comparisonBrowseTitle.focus({ preventScroll: true });
  }
}

function openComparisonPicker() {
  showComparisonLevel([], { focusHeading: false });
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

function normalizeVideoTitle(value) {
  return String(value || '')
    .normalize('NFKC')
    .replace(/[\u0000-\u001f\u007f]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 80)
    .trim();
}

function openVideoNameDialog() {
  if (elements.videoNameDialog.open) {
    return;
  }
  if (currentSavedMediaId) {
    elements.previewStatus.textContent = 'Diese Aufnahme ist bereits in der Galerie gespeichert.';
    return;
  }
  if (!currentBlob || !currentObjectUrl || currentMode !== 'video') {
    elements.previewStatus.textContent = 'Die Aufnahme ist nicht mehr verfügbar.';
    return;
  }
  if (!isMediaStoreSupported()) {
    elements.previewStatus.textContent = mediaSaveErrorMessage({ code: 'unsupported' });
    return;
  }

  elements.videoPreview.pause();
  elements.videoNameForm.reset();
  elements.videoNameInput.value = `Video ${formatMediaDate(Date.now())}`;
  elements.videoNameStatus.textContent = '';
  elements.videoNameStatus.dataset.status = '';
  videoNameRestoreFocus = true;
  showModal(elements.videoNameDialog);
  window.setTimeout(() => {
    elements.videoNameInput.focus({ preventScroll: true });
    elements.videoNameInput.select();
  }, 0);
}

function closeVideoNameDialog({ restoreFocus = true } = {}) {
  videoNameRestoreFocus = restoreFocus;
  closeModal(elements.videoNameDialog);
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

function selectComparison(guide) {
  elements.comparisonVideo.pause();
  resetComparisonPlaybackUI();
  elements.comparisonVideo.muted = true;
  elements.comparisonVideo.src = `./${guide.src}`;
  elements.comparisonVideo.playbackRate = 1;
  elements.comparisonVideo.load();
  elements.comparisonPaneLabel.textContent = guide.name;
  elements.comparisonPlayerLabel.textContent = guide.name;
  elements.comparisonPane.hidden = false;
  elements.previewStage.classList.add('comparing');
  elements.previewPlayerGrid.classList.add('comparing');
  elements.comparisonPlaybackControls.hidden = false;
  closeComparisonPicker({ restoreFocus: true });
  elements.comparisonButtonLabel.textContent = 'Leitbild wechseln';
  elements.comparisonActiveLabel.textContent = guide.name;
  elements.comparisonActive.hidden = false;
  elements.previewStatus.textContent = `${guide.name} wird daneben angezeigt.`;
}

function stopCameraTracks() {
  if (cameraStream) {
    cameraStream.getTracks().forEach((track) => track.stop());
  }
  cameraStream = null;
  [elements.liveVideo, elements.delayVideo].forEach((video) => {
    video.pause();
    video.srcObject = null;
    video.removeAttribute('src');
    video.load();
  });
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
  stopDelaySession();

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
  videoNameSaving = false;
  closeVideoNameDialog({ restoreFocus: false });
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

function delayedPlaybackSupportMessage() {
  const cameraMessage = browserSupportMessage('photo');
  if (cameraMessage) {
    return cameraMessage;
  }
  if (typeof globalThis.createImageBitmap !== 'function') {
    return 'Die verzögerte Wiedergabe wird von diesem Browser nicht unterstützt. Die Aufnahme bleibt verfügbar.';
  }
  return '';
}

function updateDelayFacingUI() {
  const isFrontCamera = facingMode === 'user';
  elements.delayVideo.classList.toggle('mirrored', isFrontCamera);
  elements.delayCanvas.classList.toggle('mirrored', isFrontCamera);
  elements.delaySwitchCamera.setAttribute(
    'aria-label',
    isFrontCamera ? 'Zur Rückkamera wechseln' : 'Zur Frontkamera wechseln'
  );
}

function updateDelayValueUI() {
  elements.delayValueLabel.textContent = `${delaySeconds} s`;
  elements.delayKnobValue.textContent = String(delaySeconds);
  elements.delayKnob.setAttribute('aria-valuenow', String(delaySeconds));
  elements.delayKnob.setAttribute('aria-valuetext', `${delaySeconds} Sekunden`);
  elements.delayKnob.style.setProperty('--delay-angle', `${delaySecondsToKnobAngle(delaySeconds)}deg`);
  elements.delayKnob.style.setProperty(
    '--delay-sweep',
    `${delayKnobProgress(delaySeconds) * DELAY_KNOB_SWEEP_DEGREES}deg`
  );
}

function clearDelayCanvas() {
  const context = elements.delayCanvas.getContext('2d');
  if (context && elements.delayCanvas.width && elements.delayCanvas.height) {
    context.clearRect(0, 0, elements.delayCanvas.width, elements.delayCanvas.height);
  }
  elements.delayCanvas.width = 0;
  elements.delayCanvas.height = 0;
  elements.delayCanvas.classList.add('waiting');
}

/** Verwirft alle gepufferten Einzelbilder und startet Countdown und Wiedergabe neu. */
function restartDelaySession() {
  delayFrames.splice(0, delayFrames.length);
  delayRenderedFrameId = 0;
  delayShownCountdown = '';
  delayLastCaptureAt = 0;
  delaySessionStart = performance.now();
  clearDelayCanvas();
  elements.delayCountdown.hidden = false;
  elements.delayCountdownValue.textContent = formatDelayCountdown(delaySeconds * 1000);
  if (delayLoopHandle === null) {
    delayLoopHandle = window.requestAnimationFrame(runDelayLoop);
  }
}

function stopDelaySession() {
  if (delayLoopHandle !== null) {
    window.cancelAnimationFrame(delayLoopHandle);
  }
  delayLoopHandle = null;
  delaySessionStart = 0;
  delayFrames.splice(0, delayFrames.length);
  delayRenderedFrameId = 0;
  delayCapturePending = false;
  delayDecodePending = false;
  delayShownCountdown = '';
  clearDelayCanvas();
  elements.delayCountdown.hidden = true;
  elements.delayStage.setAttribute('aria-busy', 'false');
  elements.delayPlaceholder.hidden = false;
  closeModal(elements.delayDialog);
}

function setDelaySeconds(value) {
  const next = clampDelaySeconds(value);
  if (next === delaySeconds) {
    return;
  }
  delaySeconds = next;
  updateDelayValueUI();
  // Ein geänderter Vorlauf macht den bisherigen Puffer wertlos.
  if (delaySessionStart) {
    restartDelaySession();
  }
}

/**
 * Hält nur so viele Einzelbilder vor, wie der eingestellte Vorlauf braucht.
 * Das aktuell angezeigte älteste Bild bleibt als Rückfall erhalten.
 */
function pruneDelayFrames() {
  const cutoff = performance.now() - (delaySeconds * 1000 + DELAY_BUFFER_MARGIN_MS);
  let removable = 0;
  while (removable + 1 < delayFrames.length && delayFrames[removable + 1].timestamp <= cutoff) {
    removable += 1;
  }
  if (removable > 0) {
    delayFrames.splice(0, removable);
  }
}

async function captureDelayFrame() {
  if (delayCapturePending) {
    return;
  }
  const video = elements.delayVideo;
  if (!video.videoWidth || !video.videoHeight) {
    return;
  }
  delayCapturePending = true;
  const thisOperation = operationId;
  const thisSession = delaySessionStart;
  try {
    const scale = Math.min(1, DELAY_CAPTURE_MAX_WIDTH / video.videoWidth);
    const width = Math.max(2, Math.round(video.videoWidth * scale));
    const height = Math.max(2, Math.round(video.videoHeight * scale));
    if (delayCaptureCanvas.width !== width || delayCaptureCanvas.height !== height) {
      delayCaptureCanvas.width = width;
      delayCaptureCanvas.height = height;
    }
    const context = delayCaptureCanvas.getContext('2d');
    if (!context) {
      return;
    }
    context.drawImage(video, 0, 0, width, height);
    const blob = await canvasToBlob(delayCaptureCanvas, 'image/jpeg', DELAY_FRAME_QUALITY);
    if (thisOperation !== operationId || thisSession !== delaySessionStart) {
      return;
    }
    delayFrameCounter += 1;
    delayFrames.push({ id: delayFrameCounter, timestamp: performance.now(), blob });
    pruneDelayFrames();
  } catch {
    // Ein einzelnes verworfenes Bild unterbricht die Wiedergabe nicht.
  } finally {
    delayCapturePending = false;
  }
}

function paintDelayFrame(bitmap) {
  const canvas = elements.delayCanvas;
  // Safari setzt object-fit auf einer Zeichenfläche nicht um. Der Ausschnitt wird
  // deshalb selbst berechnet: Die Fläche bekommt die Größe ihres Anzeigebereichs,
  // das Bild wird formatfüllend und mittig hineingezeichnet.
  const pixelRatio = Math.min(globalThis.devicePixelRatio || 1, 2);
  const width = Math.round(canvas.clientWidth * pixelRatio);
  const height = Math.round(canvas.clientHeight * pixelRatio);
  if (width < 2 || height < 2) {
    return;
  }
  if (canvas.width !== width || canvas.height !== height) {
    canvas.width = width;
    canvas.height = height;
  }
  const context = canvas.getContext('2d');
  if (!context) {
    return;
  }
  const scale = Math.max(width / bitmap.width, height / bitmap.height);
  const drawWidth = bitmap.width * scale;
  const drawHeight = bitmap.height * scale;
  context.drawImage(
    bitmap,
    (width - drawWidth) / 2,
    (height - drawHeight) / 2,
    drawWidth,
    drawHeight
  );
  canvas.classList.remove('waiting');
}

function drawDelayedFrame(targetTimestamp) {
  if (delayDecodePending) {
    return;
  }
  let frame = null;
  for (let index = delayFrames.length - 1; index >= 0; index -= 1) {
    if (delayFrames[index].timestamp <= targetTimestamp) {
      frame = delayFrames[index];
      break;
    }
  }
  if (!frame || frame.id === delayRenderedFrameId) {
    return;
  }
  delayDecodePending = true;
  const thisOperation = operationId;
  const thisSession = delaySessionStart;
  createImageBitmap(frame.blob).then((bitmap) => {
    if (thisOperation === operationId && thisSession === delaySessionStart) {
      paintDelayFrame(bitmap);
      delayRenderedFrameId = frame.id;
    }
    bitmap.close();
  }).catch(() => {
    // Ein nicht dekodierbares Bild wird beim nächsten Durchlauf übersprungen.
  }).finally(() => {
    delayDecodePending = false;
  });
}

function runDelayLoop() {
  delayLoopHandle = window.requestAnimationFrame(runDelayLoop);
  if (!delaySessionStart) {
    return;
  }
  const now = performance.now();
  if (now - delayLastCaptureAt >= delayCaptureIntervalMs(delaySeconds)) {
    delayLastCaptureAt = now;
    void captureDelayFrame();
  }

  const delayMs = delaySeconds * 1000;
  const remaining = delaySessionStart + delayMs - now;
  if (remaining > 0) {
    const countdown = formatDelayCountdown(remaining);
    if (delayShownCountdown !== countdown) {
      delayShownCountdown = countdown;
      elements.delayCountdownValue.textContent = countdown;
    }
    return;
  }

  if (!elements.delayCountdown.hidden) {
    elements.delayCountdown.hidden = true;
  }
  drawDelayedFrame(now - delayMs);
}

async function startDelayedPlayback() {
  const supportMessage = delayedPlaybackSupportMessage();
  if (supportMessage) {
    showError(supportMessage);
    return;
  }

  const thisOperation = ++operationId;
  updateDelayFacingUI();
  updateDelayValueUI();
  setView('delay');
  elements.delayStage.setAttribute('aria-busy', 'true');
  elements.delayPlaceholder.hidden = false;

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
    elements.delayVideo.srcObject = stream;
    await elements.delayVideo.play();

    if (thisOperation !== operationId) {
      stopCameraTracks();
      return;
    }

    elements.delayPlaceholder.hidden = true;
    elements.delayStage.setAttribute('aria-busy', 'false');
    restartDelaySession();
  } catch (error) {
    if (thisOperation === operationId) {
      showError(cameraErrorMessage(error));
    }
  }
}

async function beginDelayedPlayback() {
  cleanupMedia({ nextView: 'start' });
  await startDelayedPlayback();
}

function delayKnobAngleFromPointer(event) {
  const bounds = elements.delayKnob.getBoundingClientRect();
  const offsetX = event.clientX - (bounds.left + bounds.width / 2);
  const offsetY = event.clientY - (bounds.top + bounds.height / 2);
  // 0 Grad zeigt nach oben, positive Werte laufen im Uhrzeigersinn.
  return Math.atan2(offsetX, -offsetY) * (180 / Math.PI);
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
    return 'Der lokale App-Speicher ist voll. Bitte lösche ältere Aufnahmen in der geschützten Galerie.';
  }
  if (error?.code === 'unsupported') {
    return 'Dieser Browser bietet keinen privaten App-Speicher. Verwende eine aktuelle Safari-, Chrome-, Edge- oder Firefox-Version über HTTPS.';
  }
  return 'Die Aufnahme konnte nicht gespeichert werden. Sie bleibt noch in dieser Vorschau verfügbar.';
}

async function saveCurrentMedia(kind, button, { title = null } = {}) {
  if (currentSavedMediaId) {
    elements.previewStatus.textContent = 'Diese Aufnahme ist bereits in der Galerie gespeichert.';
    return null;
  }
  if (!currentBlob || !currentObjectUrl) {
    elements.previewStatus.textContent = 'Die Aufnahme ist nicht mehr verfügbar.';
    return null;
  }
  if (!isMediaStoreSupported()) {
    elements.previewStatus.textContent = mediaSaveErrorMessage({ code: 'unsupported' });
    return null;
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
    const metadata = await saveMedia(blob, { kind, ...dimensions, title });
    const persistence = await persistenceRequest;

    if (thisOperation !== operationId || currentBlob !== blob) {
      return null;
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
    return metadata;
  } catch (error) {
    if (thisOperation === operationId && currentBlob === blob) {
      button.disabled = false;
      elements.previewStatus.textContent = mediaSaveErrorMessage(error);
    }
    return null;
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

/**
 * Liest die Bildrate, die die Kamera wirklich liefert. Der Wunsch aus den
 * Constraints sagt darüber nichts aus: Ältere Geräte bleiben bei 30 Bildern.
 */
function activeFrameRate(stream) {
  const track = stream?.getVideoTracks?.()[0];
  if (typeof track?.getSettings !== 'function') {
    return 0;
  }
  const { frameRate } = track.getSettings();
  return Number.isFinite(frameRate) && frameRate > 0 ? frameRate : 0;
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
      videoBitsPerSecond: videoBitrateForFrameRate(activeFrameRate(cameraStream))
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

/** Springt mit den Tasten neben dem Zeitstrahl durch das Video. */
function stepPlayback(video, direction) {
  const duration = Number.isFinite(video.duration) ? video.duration : 0;
  if (!duration) {
    return;
  }
  video.pause();
  video.currentTime = nextStepTime(video.currentTime, duration, direction);
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

function updateProtectedAccessUI() {
  elements.galleryEntry.hidden = !teacherMode;
  elements.settingsButton.dataset.authenticated = String(teacherMode);
  elements.settingsButton.setAttribute(
    'aria-label',
    teacherMode
      ? 'Anmeldung und Einstellungen öffnen, derzeit angemeldet'
      : 'Anmeldung und Einstellungen öffnen'
  );
}

function setAccountPanel(panel, { focus = false } = {}) {
  const showLogin = panel === 'login';
  elements.accountLoginForm.hidden = !showLogin;
  elements.accountResetForm.hidden = showLogin;
  elements.accountLoginTab.setAttribute('aria-selected', String(showLogin));
  elements.accountResetTab.setAttribute('aria-selected', String(!showLogin));
  elements.accountLoginTab.tabIndex = showLogin ? 0 : -1;
  elements.accountResetTab.tabIndex = showLogin ? -1 : 0;
  elements.accountStatus.textContent = '';
  elements.accountStatus.dataset.status = '';
  if (!focus || !elements.accountDialog.open) {
    return;
  }
  window.requestAnimationFrame(() => {
    if (showLogin) {
      const state = getTeacherAuthState();
      if (teacherMode) {
        elements.accountLogout.focus({ preventScroll: true });
      } else if (state.platformAvailable && state.platformEnrolled) {
        elements.accountBiometricButton.focus({ preventScroll: true });
      } else {
        elements.accountPassword.focus({ preventScroll: true });
      }
    } else {
      elements.accountResetConfirmation.focus({ preventScroll: true });
    }
  });
}

function selectAccountPanel(panel, { focus = true } = {}) {
  if (accountResetInProgress) {
    return;
  }
  teacherAuthOperationId += 1;
  teacherAuthVerified = false;
  teacherPlatformNeedsRepair = false;
  elements.accountEnrollmentStep.hidden = true;
  elements.accountAuthenticatedStep.hidden = !teacherMode;
  elements.accountPasswordStep.hidden = teacherMode;
  setAccountPanel(panel, { focus });
}

function resetAccountDialog() {
  accountResetInProgress = false;
  teacherAuthVerified = false;
  teacherPlatformNeedsRepair = false;
  elements.accountLoginForm.reset();
  elements.accountResetForm.reset();
  elements.accountStatus.textContent = '';
  elements.accountStatus.dataset.status = '';
  elements.accountEnrollmentStep.hidden = true;
  const state = getTeacherAuthState();
  elements.accountAuthenticatedStep.hidden = !teacherMode;
  elements.accountPasswordStep.hidden = teacherMode;
  const showPlatformLogin = !teacherMode
    && state.ready
    && state.platformAvailable
    && state.platformEnrolled;
  elements.accountBiometricSection.hidden = !showPlatformLogin;
  elements.accountBiometricDivider.hidden = !showPlatformLogin;
  elements.accountBiometricButton.disabled = false;
  elements.accountEnrollmentButton.disabled = false;
  elements.accountEnrollmentButton.textContent = 'Gerätebestätigung einrichten';
  elements.accountPassword.disabled = false;
  elements.accountPasswordSubmit.disabled = false;
  elements.accountResetConfirmation.disabled = false;
  elements.accountResetSubmit.disabled = true;
  elements.accountLoginTab.disabled = false;
  elements.accountResetTab.disabled = false;
  elements.accountClose.disabled = false;
  setAccountPanel('login');
}

function openAccountDialog() {
  if (!teacherAuthReady) {
    elements.environmentStatus.textContent = 'Die Anmeldung wird noch vorbereitet. Bitte versuche es gleich erneut.';
    return;
  }
  teacherAuthOperationId += 1;
  resetAccountDialog();
  showModal(elements.accountDialog);
  setAccountPanel('login', { focus: true });
}

function activateProtectedAccess() {
  teacherAuthVerified = false;
  teacherMode = true;
  cleanupMedia({ nextView: 'start' });
  updateProtectedAccessUI();
  window.setTimeout(() => elements.galleryEntry.focus({ preventScroll: true }), 0);
}

function completeAuthentication(authOperation = teacherAuthOperationId) {
  if (
    authOperation !== teacherAuthOperationId
    || !elements.accountDialog.open
    || document.visibilityState !== 'visible'
  ) {
    return false;
  }
  closeModal(elements.accountDialog);
  activateProtectedAccess();
  return true;
}

function authenticationErrorMessage(error) {
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

function authenticateWithDevice() {
  if (elements.accountBiometricButton.disabled) {
    return;
  }
  const authOperation = teacherAuthOperationId;
  elements.accountBiometricButton.disabled = true;
  elements.accountStatus.textContent = 'Gerätebestätigung wird geöffnet …';
  let authentication;
  try {
    authentication = authenticateWithPlatform();
  } catch (error) {
    elements.accountBiometricButton.disabled = false;
    elements.accountStatus.textContent = authenticationErrorMessage(error);
    return;
  }
  authentication.then(() => {
    completeAuthentication(authOperation);
  }).catch((error) => {
    if (authOperation !== teacherAuthOperationId || !elements.accountDialog.open) {
      return;
    }
    teacherPlatformNeedsRepair = !['cancelled', 'platform-unavailable', 'not-ready'].includes(error?.code);
    elements.accountBiometricButton.disabled = false;
    elements.accountStatus.textContent = authenticationErrorMessage(error);
    elements.accountPassword.focus({ preventScroll: true });
  });
}

async function submitAccountLogin() {
  if (elements.accountPassword.disabled) {
    return;
  }
  const authOperation = teacherAuthOperationId;
  const candidate = elements.accountPassword.value;
  elements.accountStatus.dataset.status = '';
  elements.accountPassword.disabled = true;
  elements.accountPasswordSubmit.disabled = true;
  elements.accountStatus.textContent = 'Passwort wird geprüft …';
  let verified = false;
  try {
    verified = await verifyPassword(candidate);
  } catch (error) {
    if (error?.message) {
      elements.accountStatus.textContent = error.message;
    }
    verified = false;
  }
  elements.accountPassword.value = '';
  elements.accountPassword.disabled = false;
  elements.accountPasswordSubmit.disabled = false;

  if (authOperation !== teacherAuthOperationId || !elements.accountDialog.open) {
    return;
  }

  if (!verified) {
    if (!elements.accountStatus.textContent || elements.accountStatus.textContent.includes('wird')) {
      elements.accountStatus.textContent = 'Das Passwort ist nicht korrekt.';
    }
    elements.accountStatus.dataset.status = 'error';
    elements.accountPassword.focus({ preventScroll: true });
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
        completeAuthentication(authOperation);
        return;
      }
      if (authOperation !== teacherAuthOperationId || !elements.accountDialog.open) {
        return;
      }
      elements.accountEnrollmentButton.textContent = 'Gerätebestätigung neu einrichten';
    }
    teacherAuthVerified = true;
    elements.accountPasswordStep.hidden = true;
    elements.accountEnrollmentStep.hidden = false;
    elements.accountStatus.textContent = '';
    elements.accountStatus.dataset.status = '';
    elements.accountEnrollmentButton.focus({ preventScroll: true });
    return;
  }
  completeAuthentication(authOperation);
}

function enrollAccountPlatformCredential() {
  if (!teacherAuthVerified) {
    elements.accountStatus.textContent = 'Bitte melde dich erneut mit dem Passwort an.';
    return;
  }
  if (elements.accountEnrollmentButton.disabled) {
    return;
  }
  const authOperation = teacherAuthOperationId;
  elements.accountEnrollmentButton.disabled = true;
  elements.accountStatus.textContent = 'Gerätebestätigung wird eingerichtet …';
  let enrollment;
  try {
    enrollment = enrollPlatformCredential();
  } catch (error) {
    elements.accountEnrollmentButton.disabled = false;
    elements.accountStatus.textContent = authenticationErrorMessage(error);
    return;
  }
  enrollment.then(() => {
    completeAuthentication(authOperation);
  }).catch((error) => {
    if (authOperation !== teacherAuthOperationId || !elements.accountDialog.open) {
      return;
    }
    elements.accountEnrollmentButton.disabled = false;
    elements.accountStatus.textContent = error?.code === 'cancelled'
      ? 'Die Einrichtung wurde abgebrochen. Du kannst sie überspringen.'
      : 'Die Gerätebestätigung konnte nicht eingerichtet werden. Du kannst sie überspringen.';
    elements.accountEnrollmentSkip.focus({ preventScroll: true });
  });
}

async function resetLocalAccess() {
  if (elements.accountResetConfirmation.value !== 'Zurücksetzen') {
    elements.accountStatus.textContent = 'Bitte gib „Zurücksetzen“ genau wie angezeigt ein.';
    elements.accountStatus.dataset.status = 'error';
    elements.accountResetConfirmation.focus({ preventScroll: true });
    return;
  }
  teacherAuthOperationId += 1;
  accountResetInProgress = true;
  elements.accountLoginTab.disabled = true;
  elements.accountResetTab.disabled = true;
  elements.accountClose.disabled = true;
  elements.accountResetConfirmation.disabled = true;
  elements.accountResetSubmit.disabled = true;
  elements.accountStatus.dataset.status = '';
  elements.accountStatus.textContent = 'Gespeicherte Aufnahmen und Zugang werden gelöscht …';

  try {
    await resetMediaStore();
    gallerySelectedIds.clear();
    galleryItems = [];
    galleryLoadId += 1;
    galleryRenderId += 1;
    releaseGalleryCardObjectUrls();
    closeGalleryViewer({ restoreFocus: false });
    closeDeleteConfirmation({ restoreFocus: false });
    elements.galleryGrid.replaceChildren();
    elements.galleryGrid.hidden = true;
    elements.galleryEmpty.hidden = false;
    await resetAuthentication();
  } catch {
    accountResetInProgress = false;
    if (elements.accountDialog.open) {
      elements.accountLoginTab.disabled = false;
      elements.accountResetTab.disabled = false;
      elements.accountClose.disabled = false;
      elements.accountResetConfirmation.disabled = false;
      elements.accountResetConfirmation.value = '';
      elements.accountStatus.textContent = 'Das Zurücksetzen konnte nicht vollständig abgeschlossen werden. Bitte versuche es erneut.';
      elements.accountStatus.dataset.status = 'error';
      elements.accountResetConfirmation.focus({ preventScroll: true });
    } else {
      elements.environmentStatus.textContent = 'Das Zurücksetzen konnte nicht vollständig abgeschlossen werden. Öffne das Zahnrad und versuche es erneut.';
    }
    return;
  }

  accountResetInProgress = false;
  teacherAuthReady = true;
  accountSyncChannel?.postMessage({ type: 'reset' });
  exitTeacherMode({ restoreFocus: false });
  elements.environmentStatus.textContent = 'Alle gespeicherten Aufnahmen und Anmeldedaten wurden gelöscht. Für den Zugang gilt weiterhin das feste Passwort.';
  window.setTimeout(() => elements.settingsButton.focus({ preventScroll: true }), 0);
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
  elements.gallerySelectAll.disabled = galleryItems.length === 0 || galleryZipDownloadInProgress;
  elements.gallerySelectionCount.textContent = selectedCount === 0
    ? 'Keine Auswahl'
    : `${selectedCount} ${selectedCount === 1 ? 'Aufnahme' : 'Aufnahmen'} ausgewählt`;
  const downloadLabel = selectedCount === 1
    ? 'Ausgewählte Aufnahme herunterladen'
    : selectedCount > 1
      ? `${selectedCount} ausgewählte Aufnahmen als ZIP herunterladen`
      : 'Ausgewählte Aufnahmen herunterladen';
  elements.galleryDownloadSelected.setAttribute('aria-label', downloadLabel);
  elements.galleryDownloadSelected.title = downloadLabel;
  elements.galleryDownloadSelected.disabled = selectedCount === 0 || galleryZipDownloadInProgress;
  elements.galleryDeleteSelected.disabled = selectedCount === 0 || galleryZipDownloadInProgress;

  elements.galleryGrid.querySelectorAll('.gallery-card').forEach((card) => {
    const selected = gallerySelectedIds.has(card.dataset.mediaId);
    card.classList.toggle('is-selected', selected);
    card.setAttribute('aria-selected', String(selected));
    const checkbox = card.querySelector('.gallery-card-selection input');
    if (checkbox) {
      checkbox.checked = selected;
      checkbox.disabled = galleryZipDownloadInProgress;
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
    const kindLabel = item.kind === 'photo' ? 'Foto' : 'Video';
    const accessibleLabel = item.title ? `${kindLabel} „${item.title}“` : kindLabel;
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
    checkbox.setAttribute('aria-label', `${accessibleLabel} vom ${formatMediaDate(item.createdAt)} auswählen`);
    selection.append(checkbox);

    const preview = document.createElement('button');
    preview.type = 'button';
    preview.className = 'gallery-card-preview';
    preview.dataset.galleryAction = 'view';
    preview.dataset.mediaId = item.id;
    preview.setAttribute('aria-label', `${accessibleLabel} vom ${formatMediaDate(item.createdAt)} ansehen`);
    const loading = document.createElement('span');
    loading.className = 'spinner';
    loading.setAttribute('aria-hidden', 'true');
    preview.append(loading);

    const body = document.createElement('div');
    body.className = 'gallery-card-body';
    const title = document.createElement('h2');
    title.textContent = item.title || kindLabel;
    const mediaKind = document.createElement('small');
    mediaKind.className = 'gallery-card-kind';
    mediaKind.textContent = kindLabel;
    const date = document.createElement('time');
    date.dateTime = item.createdAt;
    date.textContent = formatMediaDate(item.createdAt);
    const size = document.createElement('small');
    size.textContent = formatBytes(item.size);
    body.append(title);
    if (item.title) {
      body.append(mediaKind);
    }
    body.append(date, size);

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
    openAccountDialog();
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
    elements.galleryViewerTitle.textContent = metadata.title || (isVideo ? 'Video' : 'Foto');
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

function triggerBlobDownload(blob, filename, statusElement) {
  const downloadBlob = new Blob([blob], { type: 'application/octet-stream' });
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

function triggerStoredDownload(stored, statusElement) {
  const fallback = stored.metadata.kind === 'photo' ? 'Sportkamera-Foto.jpg' : 'Sportkamera-Video.webm';
  const filename = sanitizeDownloadName(stored.metadata.suggestedDownloadName, fallback);
  triggerBlobDownload(stored.file, filename, statusElement);
}

function mp4DownloadName(metadata) {
  const sourceName = sanitizeDownloadName(
    metadata.suggestedDownloadName,
    'Sportkamera-Video.webm'
  );
  const stem = sourceName.replace(/\.[a-z0-9]{2,5}$/i, '');
  return sanitizeDownloadName(`${stem}.mp4`, 'Sportkamera-Video.mp4');
}

function resetMp4ConversionDialog() {
  mp4ConversionController?.abort();
  mp4ConversionController = null;
  preparedConvertedDownload = null;
  elements.mp4ConversionSpinner.hidden = false;
  elements.mp4ConversionTitle.textContent = 'MP4 wird erstellt';
  elements.mp4ConversionDescription.textContent = 'Das WebM-Video wird ausschließlich auf diesem Gerät in MP4 umgewandelt. Bitte lasse die App währenddessen geöffnet.';
  elements.mp4ConversionProgress.hidden = false;
  elements.mp4ConversionProgress.value = 0;
  elements.mp4ConversionProgress.textContent = '0 %';
  elements.mp4ConversionStatus.textContent = 'Konverter wird vorbereitet …';
  elements.mp4ConversionStatus.dataset.status = '';
  elements.mp4ConversionDownload.hidden = true;
  elements.mp4ConversionDownload.textContent = 'MP4 herunterladen';
  elements.mp4ConversionCancel.textContent = 'Abbrechen';
}

function closeMp4ConversionDialog({ restoreFocus = true } = {}) {
  mp4ConversionRestoreFocus = restoreFocus;
  mp4ConversionRequestId += 1;
  mp4ConversionController?.abort();
  closeModal(elements.mp4ConversionDialog);
}

async function prepareWebMAsMp4(stored, trigger, statusElement) {
  if (elements.mp4ConversionDialog.open) {
    return;
  }
  resetMp4ConversionDialog();
  const requestId = ++mp4ConversionRequestId;
  const controller = new AbortController();
  mp4ConversionController = controller;
  mp4ConversionTrigger = trigger;
  mp4ConversionRestoreFocus = true;
  mp4ConversionStatusElement = statusElement;
  statusElement.textContent = 'WebM-Video wird lokal in MP4 umgewandelt …';
  showModal(elements.mp4ConversionDialog);

  try {
    const mp4Blob = await convertWebMToMp4(stored.file, {
      title: stored.metadata.title || '',
      signal: controller.signal,
      onProgress: ({ phase, progress }) => {
        if (requestId !== mp4ConversionRequestId || !elements.mp4ConversionDialog.open) {
          return;
        }
        const percentage = Math.round(progress * 100);
        elements.mp4ConversionProgress.value = percentage;
        elements.mp4ConversionProgress.textContent = `${percentage} %`;
        elements.mp4ConversionStatus.textContent = phase === 'loading'
          ? 'Konverter wird vorbereitet …'
          : phase === 'finalizing'
            ? 'MP4-Datei wird fertiggestellt …'
            : phase === 'remuxing'
              ? `Video wird browserkompatibel als MP4 verpackt … ${percentage} %`
              : `Video wird umgewandelt … ${percentage} %`;
      }
    });

    if (
      requestId !== mp4ConversionRequestId
      || controller.signal.aborted
      || !teacherMode
      || !elements.mp4ConversionDialog.open
    ) {
      return;
    }
    preparedConvertedDownload = {
      blob: mp4Blob,
      filename: mp4DownloadName(stored.metadata),
      statusElement
    };
    mp4ConversionController = null;
    elements.mp4ConversionSpinner.hidden = true;
    elements.mp4ConversionTitle.textContent = 'MP4 ist bereit';
    elements.mp4ConversionDescription.textContent = 'Die Umwandlung ist abgeschlossen. Tippe jetzt auf „MP4 herunterladen“.';
    elements.mp4ConversionProgress.value = 100;
    elements.mp4ConversionProgress.textContent = '100 %';
    elements.mp4ConversionStatus.textContent = 'Die Datei wurde vollständig auf diesem Gerät erstellt.';
    elements.mp4ConversionDownload.hidden = false;
    elements.mp4ConversionCancel.textContent = 'Schließen';
    statusElement.textContent = 'MP4 ist bereit zum Herunterladen.';
    window.setTimeout(() => elements.mp4ConversionDownload.focus({ preventScroll: true }), 0);
  } catch (error) {
    if (requestId !== mp4ConversionRequestId || error?.name === 'AbortError') {
      return;
    }
    preparedConvertedDownload = {
      blob: stored.file,
      filename: sanitizeDownloadName(
        stored.metadata.suggestedDownloadName,
        'Sportkamera-Video.webm'
      ),
      statusElement
    };
    mp4ConversionController = null;
    elements.mp4ConversionSpinner.hidden = true;
    elements.mp4ConversionTitle.textContent = 'MP4 nicht möglich';
    elements.mp4ConversionDescription.textContent = 'Dieses Gerät konnte das Video nicht in MP4 umwandeln. Das unveränderte WebM-Original kann weiterhin gespeichert werden.';
    elements.mp4ConversionProgress.hidden = true;
    elements.mp4ConversionStatus.textContent = 'Die ursprüngliche Aufnahme bleibt unverändert erhalten.';
    elements.mp4ConversionStatus.dataset.status = 'error';
    elements.mp4ConversionDownload.textContent = 'WebM herunterladen';
    elements.mp4ConversionDownload.hidden = false;
    elements.mp4ConversionCancel.textContent = 'Schließen';
    statusElement.textContent = 'MP4-Konvertierung war auf diesem Gerät nicht möglich.';
    window.setTimeout(() => elements.mp4ConversionDownload.focus({ preventScroll: true }), 0);
  }
}

async function downloadGalleryItem(id, { button = null, statusElement = elements.galleryStorageStatus } = {}) {
  if (!teacherMode) {
    return;
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
  try {
    const cached = galleryViewerItem?.metadata.id === id
      ? galleryViewerItem
      : galleryLoadedMedia.get(id);
    const stored = cached || await getMedia(id);
    if (!stored || !teacherMode) {
      throw new Error('unavailable');
    }
    galleryLoadedMedia.set(id, stored);
    if (stored.metadata.kind === 'video' && isWebMVideo(stored.metadata.mimeType)) {
      await prepareWebMAsMp4(stored, button, statusElement);
    } else {
      triggerStoredDownload(stored, statusElement);
    }
  } catch {
    statusElement.textContent = 'Der Download konnte nicht vorbereitet werden.';
  } finally {
    finish();
  }
}

function galleryZipDownloadName() {
  const now = new Date();
  const date = [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, '0'),
    String(now.getDate()).padStart(2, '0')
  ].join('-');
  return `Sportkamera-Aufnahmen-${date}.zip`;
}

async function downloadGallerySelection() {
  if (!teacherMode || galleryZipDownloadInProgress) {
    return;
  }
  const selectedItems = galleryItems.filter((item) => gallerySelectedIds.has(item.id));
  if (!selectedItems.length) {
    return;
  }
  if (selectedItems.length === 1) {
    await downloadGalleryItem(selectedItems[0].id, {
      button: elements.galleryDownloadSelected,
      statusElement: elements.galleryStorageStatus
    });
    updateGallerySelectionUI();
    return;
  }

  const requestId = ++galleryZipDownloadRequestId;
  galleryZipDownloadInProgress = true;
  updateGallerySelectionUI();
  elements.galleryStorageStatus.textContent = `ZIP wird vorbereitet … 0 von ${selectedItems.length}`;

  try {
    const entries = [];
    for (let index = 0; index < selectedItems.length; index += 1) {
      const item = selectedItems[index];
      const stored = galleryLoadedMedia.get(item.id) || await getMedia(item.id);
      if (!stored || requestId !== galleryZipDownloadRequestId || !teacherMode) {
        throw new Error('unavailable');
      }
      galleryLoadedMedia.set(item.id, stored);
      const fallback = stored.metadata.kind === 'photo'
        ? `Sportkamera-Foto-${index + 1}.jpg`
        : `Sportkamera-Video-${index + 1}.webm`;
      entries.push({
        blob: stored.file,
        name: sanitizeDownloadName(stored.metadata.suggestedDownloadName, fallback),
        lastModified: stored.metadata.createdAt
      });
      elements.galleryStorageStatus.textContent = `Aufnahmen werden geladen … ${index + 1} von ${selectedItems.length}`;
    }

    elements.galleryStorageStatus.textContent = 'ZIP wird erstellt …';
    const zip = await createZip(entries, {
      onProgress: ({ completed, total }) => {
        if (requestId === galleryZipDownloadRequestId && teacherMode) {
          elements.galleryStorageStatus.textContent = `ZIP wird erstellt … ${completed} von ${total}`;
        }
      }
    });
    if (requestId !== galleryZipDownloadRequestId || !teacherMode) {
      return;
    }
    triggerBlobDownload(zip, galleryZipDownloadName(), elements.galleryStorageStatus);
  } catch {
    if (requestId === galleryZipDownloadRequestId && teacherMode) {
      elements.galleryStorageStatus.textContent = 'Das ZIP konnte nicht erstellt werden. Bitte wähle weniger Aufnahmen aus und versuche es erneut.';
    }
  } finally {
    if (requestId === galleryZipDownloadRequestId) {
      galleryZipDownloadInProgress = false;
      updateGallerySelectionUI();
    }
  }
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
  galleryZipDownloadRequestId += 1;
  galleryZipDownloadInProgress = false;
  gallerySelectedIds.clear();
  galleryItems = [];
  galleryLoadId += 1;
  galleryRenderId += 1;
  releaseGalleryCardObjectUrls();
  annotation.close({ restoreFocus: false });
  closeGalleryViewer({ restoreFocus: false });
  closeDeleteConfirmation({ restoreFocus: false });
  closeMp4ConversionDialog({ restoreFocus: false });
  closeModal(elements.accountDialog);
  elements.galleryGrid.replaceChildren();
  elements.galleryEmpty.hidden = false;
  updateProtectedAccessUI();
  cleanupMedia({ nextView: 'start' });
  if (restoreFocus) {
    window.setTimeout(() => elements.settingsButton.focus({ preventScroll: true }), 0);
  }
}

document.querySelectorAll('[data-start-mode]').forEach((button) => {
  button.addEventListener('click', () => void beginNewSession(button.dataset.startMode));
});

elements.delayEntry.addEventListener('click', () => void beginDelayedPlayback());
elements.delayBack.addEventListener('click', () => cleanupMedia({ nextView: 'start' }));
elements.delaySwitchCamera.addEventListener('click', () => {
  facingMode = facingMode === 'environment' ? 'user' : 'environment';
  void beginDelayedPlayback();
});
elements.delaySettings.addEventListener('click', () => {
  updateDelayValueUI();
  showModal(elements.delayDialog);
  window.requestAnimationFrame(() => elements.delayKnob.focus({ preventScroll: true }));
});
elements.delayDialogClose.addEventListener('click', () => {
  closeModal(elements.delayDialog);
  elements.delaySettings.focus({ preventScroll: true });
});
elements.delayDialog.addEventListener('click', (event) => {
  if (event.target === elements.delayDialog) {
    closeModal(elements.delayDialog);
  }
});
elements.delayKnob.addEventListener('pointerdown', (event) => {
  event.preventDefault();
  elements.delayKnob.setPointerCapture(event.pointerId);
  elements.delayKnob.focus({ preventScroll: true });
  setDelaySeconds(knobAngleToDelaySeconds(delayKnobAngleFromPointer(event)));
});
elements.delayKnob.addEventListener('pointermove', (event) => {
  if (!elements.delayKnob.hasPointerCapture(event.pointerId)) {
    return;
  }
  setDelaySeconds(knobAngleToDelaySeconds(delayKnobAngleFromPointer(event)));
});
['pointerup', 'pointercancel'].forEach((eventName) => {
  elements.delayKnob.addEventListener(eventName, (event) => {
    if (elements.delayKnob.hasPointerCapture(event.pointerId)) {
      elements.delayKnob.releasePointerCapture(event.pointerId);
    }
  });
});
elements.delayKnob.addEventListener('keydown', (event) => {
  if (event.key === 'Home') {
    event.preventDefault();
    setDelaySeconds(DELAY_MIN_SECONDS);
    return;
  }
  if (event.key === 'End') {
    event.preventDefault();
    setDelaySeconds(DELAY_MAX_SECONDS);
    return;
  }
  const steps = {
    ArrowRight: 1,
    ArrowUp: 1,
    ArrowLeft: -1,
    ArrowDown: -1,
    PageUp: 5,
    PageDown: -5
  };
  const step = steps[event.key];
  if (!step) {
    return;
  }
  event.preventDefault();
  setDelaySeconds(delaySeconds + step);
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
  openVideoNameDialog();
});
elements.videoNameForm.addEventListener('submit', (event) => {
  event.preventDefault();
  if (videoNameSaving) {
    return;
  }
  const title = normalizeVideoTitle(elements.videoNameInput.value);
  if (!title) {
    elements.videoNameStatus.textContent = 'Bitte gib dem Video einen Namen.';
    elements.videoNameStatus.dataset.status = 'error';
    elements.videoNameInput.focus();
    return;
  }

  elements.videoNameInput.value = title;
  videoNameSaving = true;
  elements.videoNameInput.disabled = true;
  elements.videoNameSubmit.disabled = true;
  elements.videoNameCancel.disabled = true;
  elements.videoNameStatus.textContent = 'Video wird lokal gespeichert …';
  elements.videoNameStatus.dataset.status = '';
  void saveCurrentMedia('video', elements.videoSaveButton, { title }).then((metadata) => {
    videoNameSaving = false;
    elements.videoNameInput.disabled = false;
    elements.videoNameSubmit.disabled = false;
    elements.videoNameCancel.disabled = false;
    if (metadata) {
      closeVideoNameDialog();
      return;
    }
    if (elements.videoNameDialog.open) {
      elements.videoNameStatus.textContent = elements.previewStatus.textContent;
      elements.videoNameStatus.dataset.status = 'error';
    }
  });
});
elements.videoNameCancel.addEventListener('click', () => {
  if (!videoNameSaving) {
    closeVideoNameDialog();
  }
});
elements.videoNameInput.addEventListener('input', () => {
  elements.videoNameStatus.textContent = '';
  elements.videoNameStatus.dataset.status = '';
});
elements.videoNameDialog.addEventListener('cancel', (event) => {
  if (videoNameSaving) {
    event.preventDefault();
  }
});
elements.videoNameDialog.addEventListener('close', () => {
  const restoreFocus = videoNameRestoreFocus;
  elements.videoNameForm.reset();
  elements.videoNameInput.disabled = false;
  elements.videoNameSubmit.disabled = false;
  elements.videoNameCancel.disabled = false;
  elements.videoNameStatus.textContent = '';
  elements.videoNameStatus.dataset.status = '';
  videoNameSaving = false;
  videoNameRestoreFocus = true;
  if (restoreFocus && currentBlob && document.body.dataset.view === 'preview') {
    elements.videoSaveButton.focus({ preventScroll: true });
  }
});
elements.videoNameDialog.addEventListener('click', (event) => {
  if (event.target === elements.videoNameDialog && !videoNameSaving) {
    closeVideoNameDialog();
  }
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

elements.settingsButton.addEventListener('click', openAccountDialog);
elements.galleryEntry.addEventListener('click', openGallery);
elements.galleryBack.addEventListener('click', () => {
  galleryZipDownloadRequestId += 1;
  galleryZipDownloadInProgress = false;
  galleryLoadId += 1;
  galleryRenderId += 1;
  gallerySelectedIds.clear();
  releaseGalleryCardObjectUrls();
  elements.galleryGrid.replaceChildren();
  setView('start');
  elements.galleryEntry.focus({ preventScroll: true });
});

elements.accountLoginTab.addEventListener('click', () => selectAccountPanel('login'));
elements.accountResetTab.addEventListener('click', () => selectAccountPanel('reset'));
[elements.accountLoginTab, elements.accountResetTab].forEach((tab) => {
  tab.addEventListener('keydown', (event) => {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) {
      return;
    }
    event.preventDefault();
    const showReset = event.key === 'Home'
      ? false
      : event.key === 'End'
        ? true
        : tab === elements.accountLoginTab;
    selectAccountPanel(showReset ? 'reset' : 'login', { focus: false });
    (showReset ? elements.accountResetTab : elements.accountLoginTab).focus();
  });
});
elements.accountLoginForm.addEventListener('submit', (event) => {
  event.preventDefault();
  void submitAccountLogin();
});
elements.accountBiometricButton.addEventListener('click', authenticateWithDevice);
elements.accountEnrollmentButton.addEventListener('click', enrollAccountPlatformCredential);
elements.accountEnrollmentSkip.addEventListener('click', () => {
  if (teacherAuthVerified) {
    completeAuthentication();
  }
});
elements.accountLogout.addEventListener('click', () => exitTeacherMode());
elements.accountResetConfirmation.addEventListener('input', () => {
  elements.accountResetSubmit.disabled = elements.accountResetConfirmation.value !== 'Zurücksetzen';
  elements.accountStatus.textContent = '';
  elements.accountStatus.dataset.status = '';
});
elements.accountResetForm.addEventListener('submit', (event) => {
  event.preventDefault();
  void resetLocalAccess();
});
elements.accountClose.addEventListener('click', () => {
  if (accountResetInProgress) {
    return;
  }
  closeModal(elements.accountDialog);
  elements.settingsButton.focus({ preventScroll: true });
});
elements.accountDialog.addEventListener('close', () => {
  teacherAuthOperationId += 1;
  teacherAuthVerified = false;
  elements.accountLoginForm.reset();
  elements.accountResetForm.reset();
  elements.accountPassword.disabled = false;
  elements.accountResetConfirmation.disabled = false;
  elements.accountStatus.textContent = '';
  elements.accountStatus.dataset.status = '';
});
elements.accountDialog.addEventListener('cancel', (event) => {
  if (accountResetInProgress) {
    event.preventDefault();
  }
});
elements.accountDialog.addEventListener('click', (event) => {
  if (event.target === elements.accountDialog && !accountResetInProgress) {
    closeModal(elements.accountDialog);
    elements.settingsButton.focus({ preventScroll: true });
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
elements.galleryDownloadSelected.addEventListener('click', () => {
  void downloadGallerySelection();
});

elements.galleryViewerClose.addEventListener('click', () => closeGalleryViewer());
elements.galleryViewerDialog.addEventListener('close', () => clearGalleryViewerMedia({ restoreFocus: true }));
elements.galleryViewerDialog.addEventListener('click', (event) => {
  if (event.target === elements.galleryViewerDialog) {
    closeGalleryViewer();
  }
});
elements.galleryPlayButton.addEventListener('click', () => void toggleGalleryPlayback());
elements.galleryStepBack.addEventListener('click', () => stepPlayback(elements.galleryViewerVideo, -1));
elements.galleryStepForward.addEventListener('click', () => stepPlayback(elements.galleryViewerVideo, 1));
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
  annotation.open(elements.galleryViewerVideo,
    galleryViewerItem?.metadata.title || 'Gespeichertes Video',
    elements.galleryAnnotationButton,
    elements.galleryViewerStatus
  );
});
elements.galleryDownloadButton.addEventListener('click', () => {
  if (galleryViewerItem) {
    void downloadGalleryItem(galleryViewerItem.metadata.id, {
      button: elements.galleryDownloadButton,
      statusElement: elements.galleryViewerStatus
    });
  }
});
elements.mp4ConversionDownload.addEventListener('click', () => {
  if (!preparedConvertedDownload) {
    return;
  }
  const prepared = preparedConvertedDownload;
  preparedConvertedDownload = null;
  try {
    triggerBlobDownload(prepared.blob, prepared.filename, prepared.statusElement);
  } catch {
    prepared.statusElement.textContent = 'Der vorbereitete Download konnte nicht gestartet werden.';
  }
  closeMp4ConversionDialog();
});
elements.mp4ConversionCancel.addEventListener('click', () => closeMp4ConversionDialog());
elements.mp4ConversionDialog.addEventListener('cancel', (event) => {
  event.preventDefault();
  closeMp4ConversionDialog();
});
elements.mp4ConversionDialog.addEventListener('click', (event) => {
  if (event.target === elements.mp4ConversionDialog) {
    closeMp4ConversionDialog();
  }
});
elements.mp4ConversionDialog.addEventListener('close', () => {
  const trigger = mp4ConversionTrigger;
  const restoreFocus = mp4ConversionRestoreFocus;
  const statusElement = mp4ConversionStatusElement;
  const wasConverting = Boolean(mp4ConversionController);
  resetMp4ConversionDialog();
  mp4ConversionTrigger = null;
  mp4ConversionRestoreFocus = true;
  mp4ConversionStatusElement = null;
  if (wasConverting && teacherMode && statusElement) {
    statusElement.textContent = 'MP4-Konvertierung wurde abgebrochen.';
  }
  if (restoreFocus && teacherMode && trigger?.isConnected) {
    trigger.focus({ preventScroll: true });
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

elements.stepBack.addEventListener('click', () => stepPlayback(elements.videoPreview, -1));
elements.stepForward.addEventListener('click', () => stepPlayback(elements.videoPreview, 1));
elements.comparisonStepBack.addEventListener('click', () => stepPlayback(elements.comparisonVideo, -1));
elements.comparisonStepForward.addEventListener('click', () => stepPlayback(elements.comparisonVideo, 1));

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

elements.comparisonUp.addEventListener('click', () => {
  showComparisonLevel(comparisonPath.slice(0, -1));
});

elements.comparisonRemove.addEventListener('click', () => {
  resetComparison();
  elements.previewStatus.textContent = 'Das Leitbild wurde aus dem Vergleich entfernt.';
});

elements.videoPreview.addEventListener('play', updatePlayButton);
elements.videoPreview.addEventListener('pause', updatePlayButton);
elements.videoPreview.addEventListener('ended', updatePlayButton);
elements.videoPreview.addEventListener('timeupdate', updatePlaybackUI);
elements.videoPreview.addEventListener('seeked', updatePlaybackUI);
elements.videoPreview.addEventListener('durationchange', updatePlaybackUI);
elements.videoPreview.addEventListener('contextmenu', (event) => event.preventDefault());
elements.comparisonVideo.addEventListener('play', updateComparisonPlayButton);
elements.comparisonVideo.addEventListener('pause', updateComparisonPlayButton);
elements.comparisonVideo.addEventListener('ended', updateComparisonPlayButton);
elements.comparisonVideo.addEventListener('timeupdate', updateComparisonPlaybackUI);
elements.comparisonVideo.addEventListener('seeked', updateComparisonPlaybackUI);
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
elements.galleryViewerVideo.addEventListener('seeked', updateGalleryPlaybackUI);
elements.galleryViewerVideo.addEventListener('durationchange', updateGalleryPlaybackUI);
elements.galleryViewerVideo.addEventListener('loadedmetadata', updateGalleryPlaybackUI);
elements.galleryViewerVideo.addEventListener('error', () => {
  if (elements.galleryViewerVideo.hasAttribute('src')) {
    elements.galleryViewerStatus.textContent = 'Das gespeicherte Video konnte nicht geladen werden.';
  }
});
elements.galleryViewerVideo.addEventListener('contextmenu', (event) => event.preventDefault());
elements.galleryViewerPhoto.addEventListener('contextmenu', (event) => event.preventDefault());

accountSyncChannel?.addEventListener('message', (event) => {
  if (event.data?.type !== 'reset') {
    return;
  }
  teacherAuthOperationId += 1;
  teacherAuthReady = false;
  exitTeacherMode({ restoreFocus: false });
  window.location.reload();
});

window.addEventListener('pagehide', () => {
  teacherAuthOperationId += 1;
  teacherAuthVerified = false;
  closeModal(elements.accountDialog);
  cleanupMedia({ nextView: 'start' });
  if (teacherMode) {
    exitTeacherMode({ restoreFocus: false });
  }
});
window.addEventListener('beforeunload', () => {
  teacherAuthOperationId += 1;
  teacherAuthVerified = false;
  closeModal(elements.accountDialog);
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
      closeModal(elements.accountDialog);
    }
  }
});

function initialize() {
  cleanupMedia({ nextView: 'start' });
  teacherMode = false;
  teacherAuthReady = false;
  elements.settingsButton.disabled = true;
  updateProtectedAccessUI();
  preloadTeacherAuth().then(() => {
    teacherAuthReady = true;
    elements.settingsButton.disabled = false;
  }).catch(() => {
    teacherAuthReady = true;
    elements.settingsButton.disabled = false;
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
