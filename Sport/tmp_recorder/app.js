import {
  MAX_RECORDING_MS,
  formatPlaybackTime,
  formatRecordingTime,
  selectSupportedVideoMimeType
} from './media-utils.js';

const CAMERA_CONSTRAINTS = Object.freeze({
  width: { ideal: 1280 },
  height: { ideal: 720 },
  frameRate: { ideal: 30 }
});

const elements = {
  startView: document.querySelector('#start-view'),
  cameraView: document.querySelector('#camera-view'),
  previewView: document.querySelector('#preview-view'),
  errorView: document.querySelector('#error-view'),
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
  captureHint: document.querySelector('#capture-hint'),
  recordingIndicator: document.querySelector('#recording-indicator'),
  recordingTime: document.querySelector('#recording-time'),
  previewBack: document.querySelector('#preview-back'),
  previewKicker: document.querySelector('#preview-kicker'),
  previewStage: document.querySelector('#preview-stage'),
  photoPreview: document.querySelector('#photo-preview'),
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
  comparisonPlaybackControls: document.querySelector('#comparison-playback-controls'),
  comparisonPlayerLabel: document.querySelector('#comparison-player-label'),
  comparisonPlayButton: document.querySelector('#comparison-play-button'),
  comparisonTimeline: document.querySelector('#comparison-timeline'),
  comparisonPlaybackTime: document.querySelector('#comparison-playback-time'),
  comparisonControls: document.querySelector('#comparison-controls'),
  comparisonButton: document.querySelector('#comparison-button'),
  comparisonButtonLabel: document.querySelector('#comparison-button-label'),
  comparisonPicker: document.querySelector('#comparison-picker'),
  comparisonActive: document.querySelector('#comparison-active'),
  comparisonActiveLabel: document.querySelector('#comparison-active-label'),
  comparisonRemove: document.querySelector('#comparison-remove'),
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
  elements.captureHint.textContent = isPhoto
    ? 'Tippe auf den Kreis, um ein Foto aufzunehmen.'
    : 'Tippe auf den Kreis zum Starten und erneut zum Stoppen.';
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
  elements.playButton.innerHTML = '<span aria-hidden="true">▶</span><span>Start</span>';
  elements.playButton.setAttribute('aria-label', 'Video starten');
  elements.timeline.value = '0';
  elements.playbackTime.value = '0:00 / 0:00';
  elements.previewStatus.textContent = '';
  document.querySelectorAll('[data-speed]').forEach((button) => {
    button.setAttribute('aria-pressed', String(button.dataset.speed === '1'));
  });
  resetComparison();
}

function resetComparisonPlaybackUI() {
  elements.comparisonPlayButton.innerHTML = '<span aria-hidden="true">▶</span><span>Start</span>';
  elements.comparisonPlayButton.setAttribute('aria-label', 'Leitbild starten');
  elements.comparisonTimeline.value = '0';
  elements.comparisonPlaybackTime.value = '0:00 / 0:00';
  document.querySelectorAll('[data-comparison-speed]').forEach((button) => {
    button.setAttribute('aria-pressed', String(button.dataset.comparisonSpeed === '1'));
  });
}

function resetComparison() {
  elements.comparisonVideo.pause();
  elements.comparisonVideo.removeAttribute('src');
  elements.comparisonVideo.load();
  elements.comparisonPane.hidden = true;
  elements.previewStage.classList.remove('comparing');
  elements.previewPlayerGrid.classList.remove('comparing');
  elements.comparisonPlaybackControls.hidden = true;
  elements.comparisonPicker.hidden = true;
  elements.comparisonButton.setAttribute('aria-expanded', 'false');
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
  elements.comparisonPicker.hidden = true;
  elements.comparisonButton.setAttribute('aria-expanded', 'false');
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

  elements.videoPreview.pause();
  elements.videoPreview.srcObject = null;
  elements.videoPreview.removeAttribute('src');
  elements.videoPreview.load();
  elements.videoPreview.hidden = true;
  elements.ownVideoPane.hidden = true;
  elements.photoPreview.removeAttribute('src');
  elements.photoPreview.alt = '';
  elements.photoPreview.hidden = true;
  elements.playbackControls.hidden = true;
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
      showError('Dieser Browser bietet kein abspielbares MP4- oder WebM-Aufnahmeformat an. Video kann hier nicht sicher aufgenommen werden; die Fotoaufnahme bleibt verfügbar.');
      return;
    }
  }

  const thisOperation = ++operationId;
  setModeUI();
  updateFacingUI();
  setView('camera');
  elements.cameraStage.setAttribute('aria-busy', 'true');
  elements.cameraPlaceholder.hidden = false;
  elements.cameraStatus.textContent = 'Kamera wird vorbereitet.';
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
    elements.cameraStatus.textContent = currentMode === 'photo'
      ? 'Bereit für dein Foto.'
      : 'Bereit für dein Video. Es wird ohne Ton aufgenommen.';
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
    elements.videoPreview.hidden = true;
    elements.ownVideoPane.hidden = true;
    elements.playbackControls.hidden = true;
    elements.comparisonControls.hidden = true;
    elements.previewKicker.textContent = 'Foto aufgenommen';
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

function showVideoPreview(blob, mimeType) {
  currentBlob = blob;
  currentObjectUrl = URL.createObjectURL(currentBlob);
  elements.videoPreview.src = currentObjectUrl;
  elements.videoPreview.hidden = false;
  elements.ownVideoPane.hidden = false;
  elements.photoPreview.hidden = true;
  elements.playbackControls.hidden = false;
  elements.comparisonControls.hidden = false;
  elements.videoPreview.playbackRate = 1;
  elements.previewKicker.textContent = `Video aufgenommen · ${mimeType.startsWith('video/mp4') ? 'MP4' : 'WebM'}`;
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
    showError('Keines der unterstützten MP4- oder WebM-Formate ist in diesem Browser verfügbar.');
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
    showVideoPreview(blob, recordedType);
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
    ? '<span aria-hidden="true">Ⅱ</span><span>Pause</span>'
    : '<span aria-hidden="true">▶</span><span>Start</span>';
  elements.playButton.setAttribute('aria-label', playing ? 'Video pausieren' : 'Video starten');
}

function updateComparisonPlayButton() {
  const playing = !elements.comparisonVideo.paused && !elements.comparisonVideo.ended;
  elements.comparisonPlayButton.innerHTML = playing
    ? '<span aria-hidden="true">Ⅱ</span><span>Pause</span>'
    : '<span aria-hidden="true">▶</span><span>Start</span>';
  elements.comparisonPlayButton.setAttribute('aria-label', playing ? 'Leitbild pausieren' : 'Leitbild starten');
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
    elements.previewStatus.textContent = `Leitbild: Wiedergabegeschwindigkeit ${button.textContent.trim()}.`;
  });
});

elements.comparisonButton.addEventListener('click', () => {
  const willOpen = elements.comparisonPicker.hidden;
  elements.comparisonPicker.hidden = !willOpen;
  elements.comparisonButton.setAttribute('aria-expanded', String(willOpen));
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

window.addEventListener('pagehide', () => cleanupMedia({ nextView: 'start' }));
window.addEventListener('beforeunload', () => cleanupMedia({ nextView: 'start' }));
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') {
    cleanupMedia({ nextView: 'start' });
  }
});

function initialize() {
  cleanupMedia({ nextView: 'start' });
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
