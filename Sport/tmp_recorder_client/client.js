import { checkSubmissionAccess, readClientPairing, unlockClientPairing, uploadSubmission } from '../tmp_recorder/client-pairing.js?v=4';
import {
  createSubmission, deleteSubmission, loadSubmission, restoreSubmissionAccess, selectUpload, storeVideo,
  updateSubmission, updateSubmissionAccess
} from './submission-store.js?v=2';
import {
  CAMERA_TARGET_FRAME_RATE, MAX_RECORDING_MS, formatPlaybackTime, formatRecordingTime,
  nextStepTime, selectSupportedVideoMimeType, videoBitrateForFrameRate
} from '../tmp_recorder/media-utils.js?v=39';

const get = (id) => document.getElementById(id);
const views = {
  scan: get('scan-view'), pin: get('pin-view'), name: get('name-view'), home: get('home-view'),
  gallery: get('gallery-view'), record: get('record-view'), preview: get('preview-view')
};
const scanVideo = get('scan-camera');
const liveVideo = get('live-camera');
const preview = get('preview');
const pinInput = get('pin-input');
const pinSubmit = get('pin-submit');
const nameInput = get('student-name');
const gallery = get('gallery-list');
const uploadButton = get('upload-video');
const uploadDialog = get('upload-dialog');
const scanCanvas = document.createElement('canvas');
const scanContext = scanCanvas.getContext('2d', { willReadFrequently: true });
const pairingPage = new URL('./', location.href);
const expiredMessage = 'Die Abgabesitzung ist nach 90 Minuten abgelaufen.';
let submissionChanges = null;
try {
  submissionChanges = new BroadcastChannel('sportkamera-submission');
} catch {
  // Die Sitzung kann auch ohne Benachrichtigungen zwischen Tabs gespeichert werden.
}

let epoch = 0;
let session = null;
let submission = null;
let expiryTimer = null;
let reconnecting = false;
let writing = false;
let ending = false;
let loading = false;
let pairing = null;
let pending = null;
let studentNames = '';
const savedVideos = [];
let stream = null;
let scanTimer = null;
let recorder = null;
let recordingTimer = null;
let recordingLimit = null;
let startedAt = 0;
let duration = 0;
let chunks = [];
let previewVideo = null;
let previewUrl = null;
let facing = 'environment';

function status(message, error = false) {
  get('status').textContent = message;
  get('status').dataset.error = String(error);
}

function view(name) {
  for (const [id, element] of Object.entries(views)) element.hidden = id !== name;
  get('logout').hidden = !submission && !pairing;
  get('logout').disabled = ending;
  get('logout').textContent = reconnecting ? 'Zurück' : submission ? 'Abmelden' : 'Abbrechen';
  get('renew-qr').hidden = name !== 'pin' || !reconnecting;
}

function showStudentNames(names) {
  studentNames = names;
  get('student-label').textContent = names;
  get('student-label').hidden = !names;
  get('brand').hidden = Boolean(names);
}

function releaseCamera() {
  clearTimeout(scanTimer);
  scanTimer = null;
  stream?.getTracks().forEach((track) => track.stop());
  stream = null;
  for (const element of [scanVideo, liveVideo]) {
    element.pause();
    element.srcObject = null;
  }
  scanCanvas.width = 0;
  scanCanvas.height = 0;
  get('scan-stage').hidden = true;
}

function clearRecordingTimers() {
  clearInterval(recordingTimer);
  clearTimeout(recordingLimit);
  recordingTimer = null;
  recordingLimit = null;
}

function resetRecorder() {
  clearRecordingTimers();
  if (recorder) {
    recorder.ondataavailable = recorder.onstop = recorder.onerror = null;
    if (recorder.state !== 'inactive') recorder.stop();
    recorder = null;
  }
  chunks = [];
  duration = 0;
  get('record-time').hidden = true;
  get('record-time').textContent = '00:00.0';
  get('capture').classList.remove('recording');
  get('capture').textContent = 'Aufnahme starten';
}

function closePreview() {
  if (!previewUrl) return;
  previewVideo = null;
  preview.pause();
  preview.removeAttribute('src');
  preview.load();
  URL.revokeObjectURL(previewUrl);
  previewUrl = null;
  get('play').textContent = 'Abspielen';
  get('timeline').value = '0';
  get('playback-time').textContent = '0:00 / 0:00';
  get('speed').value = '1';
  get('preview-back').disabled = false;
}

function clearSessionView(message) {
  epoch += 1;
  clearTimeout(expiryTimer);
  expiryTimer = null;
  session = null;
  submission = null;
  reconnecting = false;
  ending = false;
  writing = false;
  loading = false;
  pairing = null;
  if (uploadDialog.open) uploadDialog.close();
  pending?.abort();
  pending = null;
  pinInput.value = '';
  pinInput.disabled = false;
  pinSubmit.disabled = false;
  nameInput.value = '';
  showStudentNames('');
  savedVideos.length = 0;
  gallery.replaceChildren();
  facing = 'environment';
  resetRecorder();
  closePreview();
  releaseCamera();
  get('scan-start').hidden = false;
  view('scan');
  status(message);
}

async function removeSubmission(id) {
  await deleteSubmission(id);
  submissionChanges?.postMessage(id);
}

async function logout(message = 'Abgemeldet.') {
  if (ending) return;
  const current = submission;
  if (!current) {
    clearSessionView(message);
    return;
  }
  const generation = ++epoch;
  ending = true;
  reconnecting = false;
  clearTimeout(expiryTimer);
  if (uploadDialog.open) uploadDialog.close();
  pending?.abort();
  pending = null;
  resetRecorder();
  releaseCamera();
  closePreview();
  view('waiting');
  status('Lokale Sitzung wird gelöscht …');
  try {
    await removeSubmission(current.id);
    if (generation === epoch) clearSessionView(message);
  } catch {
    if (generation !== epoch) return;
    ending = false;
    view('waiting');
    status('Die lokalen Aufnahmen konnten nicht gelöscht werden. Tippe erneut auf „Abmelden“.', true);
  }
}

function expired() {
  if (!submission || submission.expiresAt > Date.now()) return false;
  void logout(expiredMessage);
  return true;
}

function setExpiryTimer() {
  clearTimeout(expiryTimer);
  expiryTimer = setTimeout(() => {
    if (submission && !expired()) setExpiryTimer();
  }, Math.max(0, submission.expiresAt - Date.now()));
}

function cameraMessage(error) {
  if (error?.name === 'NotAllowedError' || error?.name === 'SecurityError') {
    return 'Erlaube der Videoabgabe den Kamerazugriff und versuche es erneut.';
  }
  return 'Die Kamera konnte nicht geöffnet werden.';
}

async function openCamera(element, constraints, generation) {
  if (!navigator.mediaDevices?.getUserMedia) throw new Error('Die Kamera benötigt eine HTTPS-Verbindung.');
  const camera = await navigator.mediaDevices.getUserMedia({ audio: false, video: constraints });
  if (generation !== epoch) {
    camera.getTracks().forEach((track) => track.stop());
    return false;
  }
  stream = camera;
  element.srcObject = camera;
  await element.play();
  return generation === epoch;
}

function lookForCode(generation) {
  if (generation !== epoch) return;
  if (scanVideo.videoWidth > 0 && scanVideo.readyState >= 2) {
    const scale = Math.min(1, 640 / Math.max(scanVideo.videoWidth, scanVideo.videoHeight));
    const width = Math.round(scanVideo.videoWidth * scale);
    const height = Math.round(scanVideo.videoHeight * scale);
    if (scanCanvas.width !== width || scanCanvas.height !== height) {
      scanCanvas.width = width;
      scanCanvas.height = height;
    }
    scanContext.drawImage(scanVideo, 0, 0, width, height);
    const frame = scanContext.getImageData(0, 0, width, height);
    const code = window.jsQR(frame.data, width, height, { inversionAttempts: 'dontInvert' });
    if (code) {
      const incoming = readClientPairing(code.data, pairingPage);
      if (incoming) {
        promptForPin(incoming);
        return;
      }
      status('Dieser QR-Code enthält keinen gültigen WebDAV-Abgabezugang.', true);
    }
  }
  scanTimer = setTimeout(() => lookForCode(generation), 180);
}

async function startScan() {
  const generation = ++epoch;
  releaseCamera();
  view('scan');
  get('scan-start').hidden = true;
  status('Kamera wird geöffnet …');
  try {
    if (typeof window.jsQR !== 'function' || !scanContext) throw new Error('Der QR-Scanner konnte nicht geladen werden.');
    get('scan-stage').hidden = false;
    const opened = await openCamera(scanVideo, {
      facingMode: { ideal: 'environment' }, width: { ideal: 640 }, height: { ideal: 480 }
    }, generation);
    if (opened) {
      status('Halte den QR-Code in den Rahmen.');
      lookForCode(generation);
    }
  } catch (error) {
    if (generation !== epoch) return;
    releaseCamera();
    get('scan-start').hidden = false;
    status(error?.name === 'Error' ? error.message : cameraMessage(error), true);
  }
}

function promptForPin(incoming) {
  epoch += 1;
  releaseCamera();
  pairing = incoming;
  view('pin');
  status('');
  pinInput.focus({ preventScroll: true });
}

async function connect(event) {
  event.preventDefault();
  if (!pairing || pending || expired()) return;
  const pin = pinInput.value;
  const packet = pairing;
  const generation = ++epoch;
  const controller = new AbortController();
  pending = controller;
  pinInput.value = '';
  pinInput.disabled = true;
  pinSubmit.disabled = true;
  get('renew-qr').disabled = true;
  status('Zahlencode wird geprüft …');
  try {
    const access = await unlockClientPairing(packet, pin);
    if (generation !== epoch) return;
    if (!access) {
      status('Der Zahlencode stimmt nicht. Versuche es erneut.', true);
      return;
    }
    const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(access.url));
    const destination = btoa(String.fromCharCode(...new Uint8Array(digest)));
    if (generation !== epoch || expired()) return;
    if (submission && submission.destination !== destination) {
      status('Dieser QR-Code gehört zu einem anderen Abgabeordner.', true);
      return;
    }
    status('Videoabgabe wird verbunden …');
    await checkSubmissionAccess(access, controller);
    if (generation !== epoch || expired()) return;
    const current = submission;
    const stored = current ? await updateSubmissionAccess(current, access) : await createSubmission(destination, access);
    if (generation !== epoch) return;
    if (!stored) {
      if (current) clearSessionView('Die bisherige Abgabesitzung ist beendet.');
      else status('In diesem Browser gibt es bereits eine Abgabesitzung. Lade die Seite neu, um sie fortzusetzen.', true);
      return;
    }
    submission = stored;
    session = access;
    pairing = null;
    setExpiryTimer();
  } catch (error) {
    if (generation === epoch) status(error.message, true);
  } finally {
    if (generation === epoch) {
      pending = null;
      pinInput.disabled = false;
      pinSubmit.disabled = false;
      get('renew-qr').disabled = false;
      if (session && reconnecting) {
        leaveReconnect('WebDAV ist verbunden. Du kannst das Video abgeben.');
      } else if (session) {
        view('name');
        status('');
        nameInput.focus({ preventScroll: true });
      } else {
        pinInput.focus({ preventScroll: true });
      }
    }
  }
}

function leaveReconnect(message = '') {
  epoch += 1;
  pending?.abort();
  pending = null;
  pairing = null;
  reconnecting = false;
  pinInput.value = '';
  pinInput.disabled = false;
  pinSubmit.disabled = false;
  get('renew-qr').disabled = false;
  releaseCamera();
  openPreview(previewVideo);
  status(message);
}

function showHome(message = '', focusTarget = 'open-camera') {
  epoch += 1;
  resetRecorder();
  closePreview();
  releaseCamera();
  view('home');
  status(message);
  get(focusTarget).focus({ preventScroll: true });
}

async function acceptNames(event) {
  event.preventDefault();
  if (!submission || writing || expired()) return;
  const names = nameInput.value.trim().replace(/\s+/g, ' ');
  if (!names) {
    status('Gib mindestens einen Namen ein.', true);
    nameInput.focus({ preventScroll: true });
    return;
  }
  const generation = epoch;
  writing = true;
  const button = get('name-form').querySelector('button');
  button.disabled = true;
  try {
    const stored = await updateSubmission(submission.id, { names });
    if (generation !== epoch) return;
    if (!stored) {
      clearSessionView('Die bisherige Abgabesitzung ist beendet.');
      return;
    }
    submission = stored;
    showStudentNames(names);
    nameInput.value = '';
    showHome();
  } catch {
    if (generation === epoch) status('Die Abgabesitzung konnte nicht gespeichert werden. Versuche es erneut.', true);
  } finally {
    writing = false;
    button.disabled = false;
  }
}

async function startVideoCamera() {
  if (!submission || !studentNames || expired()) return;
  const generation = ++epoch;
  resetRecorder();
  closePreview();
  releaseCamera();
  view('record');
  get('capture').disabled = true;
  get('switch-camera').disabled = true;
  get('camera-retry').hidden = true;
  status('Kamera wird geöffnet …');
  try {
    if (!selectSupportedVideoMimeType(window.MediaRecorder)) throw new Error('Dieser Browser kann kein WebM- oder MP4-Video aufnehmen.');
    const opened = await openCamera(liveVideo, {
      facingMode: { ideal: facing }, width: { ideal: 1280 }, height: { ideal: 720 }, frameRate: { ideal: CAMERA_TARGET_FRAME_RATE }
    }, generation);
    if (opened) {
      get('capture').disabled = false;
      get('switch-camera').disabled = false;
      status('');
    }
  } catch (error) {
    if (generation !== epoch) return;
    releaseCamera();
    get('camera-retry').hidden = false;
    status(error?.name === 'Error' ? error.message : cameraMessage(error), true);
  }
}

function stopRecording() {
  if (recorder?.state !== 'recording') return;
  duration = Math.min(MAX_RECORDING_MS, performance.now() - startedAt) / 1000;
  clearRecordingTimers();
  get('capture').disabled = true;
  recorder.stop();
}

function openPreview(video) {
  closePreview();
  const saved = savedVideos.includes(video);
  previewVideo = video;
  previewUrl = URL.createObjectURL(video.file);
  preview.src = previewUrl;
  preview.playbackRate = 1;
  preview.load();
  get('save').hidden = saved;
  get('save').disabled = false;
  get('retake').hidden = saved;
  get('retake').disabled = false;
  uploadButton.hidden = !saved;
  uploadButton.disabled = false;
  view('preview');
  updatePlayback();
  status('');
  get('preview-heading').focus({ preventScroll: true });
}

function showGallery() {
  if (!submission || expired()) return;
  const previousVideo = previewVideo;
  closePreview();
  gallery.replaceChildren();
  let focusTarget = get('gallery-back');
  for (const video of [...savedVideos].reverse()) {
    const item = document.createElement('li');
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'secondary gallery-item';
    const date = new Date(video.recordedAt);
    const time = document.createElement('time');
    time.dateTime = date.toISOString();
    time.textContent = date.toLocaleTimeString('de-DE');
    const length = document.createElement('span');
    length.className = 'duration';
    length.textContent = formatPlaybackTime(video.duration);
    button.append(time, length);
    if (video.id === submission.uploadVideoId) {
      const selection = document.createElement('span');
      selection.textContent = 'Für Abgabe gewählt';
      button.append(selection);
    }
    button.addEventListener('click', () => openPreview(video));
    item.append(button);
    gallery.append(item);
    if (video === previousVideo) focusTarget = button;
  }
  gallery.hidden = savedVideos.length === 0;
  get('gallery-empty').hidden = !gallery.hidden;
  view('gallery');
  status('');
  focusTarget.focus({ preventScroll: true });
}

function startRecording() {
  if (!submission || !stream || recorder || expired()) return;
  const generation = epoch;
  const type = selectSupportedVideoMimeType(window.MediaRecorder);
  try {
    const active = new MediaRecorder(stream, { mimeType: type,
      videoBitsPerSecond: videoBitrateForFrameRate(stream.getVideoTracks()[0]?.getSettings().frameRate) });
    recorder = active;
    active.ondataavailable = ({ data }) => { if (data.size && generation === epoch) chunks.push(data); };
    active.onstop = () => {
      if (generation !== epoch) return;
      clearRecordingTimers();
      const file = new Blob(chunks, { type: active.mimeType || type });
      const videoDuration = duration || Math.min(MAX_RECORDING_MS, performance.now() - startedAt) / 1000;
      chunks = [];
      recorder = null;
      releaseCamera();
      if (file.size) {
        openPreview({ file, duration: videoDuration, id: crypto.randomUUID(), recordedAt: Date.now() });
      } else {
        resetRecorder();
        get('capture').disabled = true;
        get('camera-retry').hidden = false;
        status('Es wurde kein Video aufgezeichnet. Versuche es erneut.', true);
      }
    };
    active.onerror = () => {
      if (generation !== epoch) return;
      resetRecorder();
      releaseCamera();
      get('capture').disabled = true;
      get('camera-retry').hidden = false;
      status('Die Aufnahme wurde unterbrochen. Versuche es erneut.', true);
    };
    active.start(1000);
    startedAt = performance.now();
    get('record-time').hidden = false;
    get('switch-camera').disabled = true;
    get('capture').classList.add('recording');
    get('capture').textContent = 'Aufnahme stoppen';
    recordingTimer = setInterval(() => { get('record-time').textContent = formatRecordingTime(performance.now() - startedAt); }, 100);
    recordingLimit = setTimeout(stopRecording, MAX_RECORDING_MS);
  } catch {
    recorder = null;
    status('Die Videoaufnahme konnte nicht gestartet werden.', true);
  }
}

function playbackDuration() {
  return Number.isFinite(preview.duration) ? preview.duration : (previewVideo?.duration ?? 0);
}

function updatePlayback() {
  const total = playbackDuration();
  get('timeline').value = total ? String(Math.min(1000, Math.round(preview.currentTime / total * 1000))) : '0';
  get('playback-time').textContent = `${formatPlaybackTime(preview.currentTime)} / ${formatPlaybackTime(total)}`;
  get('play').textContent = preview.paused ? 'Abspielen' : 'Pause';
}

async function saveVideo() {
  const video = previewVideo;
  if (!submission || !video || writing || savedVideos.includes(video) || expired()) return;
  const generation = epoch;
  const controls = [get('save'), get('retake'), get('preview-back')];
  writing = true;
  for (const control of controls) control.disabled = true;
  try {
    const stored = await storeVideo(submission.id, video);
    if (generation !== epoch) return;
    if (!stored) {
      clearSessionView('Die bisherige Abgabesitzung ist beendet.');
      return;
    }
    savedVideos.push(video);
    showHome('Video in der Galerie gespeichert.');
  } catch {
    if (generation === epoch) status('Das Video konnte im Browser nicht gespeichert werden. Prüfe den freien Speicher und versuche es erneut.', true);
  } finally {
    writing = false;
    for (const control of controls) control.disabled = false;
  }
}

function canSubmitVideo() {
  return submission && studentNames && savedVideos.includes(previewVideo) && !pending && !expired();
}

function confirmSubmission() {
  if (!canSubmitVideo()) return;
  preview.pause();
  if (!session) {
    reconnecting = true;
    if (submission.pairing) {
      promptForPin(submission.pairing);
      status('Gib den Zahlencode für diese ältere Sitzung einmalig erneut ein.');
    } else {
      void startScan();
    }
    return;
  }
  if (typeof uploadDialog.showModal === 'function') {
    uploadDialog.showModal();
  } else if (window.confirm(get('upload-message').textContent)) {
    void submitVideo();
  }
}

async function submitVideo() {
  if (!canSubmitVideo() || !session) return;
  const video = previewVideo;
  const current = submission;
  const access = session;
  const generation = epoch;
  const controller = new AbortController();
  pending = controller;
  uploadButton.disabled = true;
  get('preview-back').disabled = true;
  status('Verbindung zu WebDAV wird geprüft …');
  try {
    await checkSubmissionAccess(access, controller);
    if (generation !== epoch || expired()) return;
    const selected = await selectUpload(current.id, video.id);
    if (generation !== epoch || expired()) return;
    if (selected === 'ended') {
      clearSessionView('Die bisherige Abgabesitzung ist beendet.');
      return;
    }
    if (selected === 'another-video') {
      status('Für diese Sitzung ist bereits ein anderes Video für die Abgabe gewählt. Setze dessen Upload fort.', true);
      return;
    }
    submission.uploadVideoId = video.id;
    status('Video wird hochgeladen …');
    await uploadSubmission(access, { title: studentNames, id: video.id, file: video.file }, controller.signal);
    if (generation !== epoch) {
      await removeSubmission(current.id);
      return;
    }
    pending = null;
    await logout('Video hochgeladen. Du bist jetzt abgemeldet.');
    get('scan-start').focus({ preventScroll: true });
  } catch (error) {
    if (generation === epoch) {
      if (error.status === 401) session = null;
      status(`${error.message} Das Video bleibt in der Galerie.`, true);
    }
  } finally {
    if (generation === epoch) {
      pending = null;
      uploadButton.disabled = false;
      get('preview-back').disabled = false;
      uploadButton.focus({ preventScroll: true });
    }
  }
}

get('scan-start').addEventListener('click', startScan);
get('logout').addEventListener('click', () => {
  if (reconnecting) leaveReconnect();
  else void logout(submission ? 'Abgemeldet.' : '');
});
get('pin-form').addEventListener('submit', connect);
get('renew-qr').addEventListener('click', () => {
  pairing = null;
  void startScan();
});
get('name-form').addEventListener('submit', acceptNames);
get('open-gallery').addEventListener('click', showGallery);
get('open-camera').addEventListener('click', startVideoCamera);
get('gallery-back').addEventListener('click', () => showHome('', 'open-gallery'));
get('camera-back').addEventListener('click', () => showHome());
get('preview-back').addEventListener('click', () => {
  if (savedVideos.includes(previewVideo)) showGallery();
  else showHome();
});
get('switch-camera').addEventListener('click', () => {
  facing = facing === 'environment' ? 'user' : 'environment';
  void startVideoCamera();
});
get('camera-retry').addEventListener('click', startVideoCamera);
get('capture').addEventListener('click', () => recorder ? stopRecording() : startRecording());
get('retake').addEventListener('click', startVideoCamera);
get('save').addEventListener('click', saveVideo);
uploadButton.addEventListener('click', confirmSubmission);
get('upload-cancel').addEventListener('click', () => uploadDialog.close());
get('upload-confirm').addEventListener('click', () => {
  if (!uploadDialog.open) return;
  uploadDialog.close();
  void submitVideo();
});
get('play').addEventListener('click', () => {
  if (!preview.paused) preview.pause();
  else void preview.play().catch(() => status('Die Vorschau konnte nicht abgespielt werden.', true));
});
get('speed').addEventListener('change', (event) => { preview.playbackRate = Number(event.target.value); });
get('timeline').addEventListener('input', (event) => {
  const total = playbackDuration();
  if (total > 0) preview.currentTime = total * Number(event.target.value) / 1000;
});
for (const [id, direction] of [['back-step', -1], ['forward-step', 1]]) {
  get(id).addEventListener('click', () => {
    preview.pause();
    preview.currentTime = nextStepTime(preview.currentTime, playbackDuration(), direction);
  });
}
for (const event of ['loadedmetadata', 'durationchange', 'timeupdate', 'play', 'pause', 'ended']) {
  preview.addEventListener(event, updatePlayback);
}
function takePairingLink() {
  if (!location.hash) return null;
  const incoming = readClientPairing(location.href, pairingPage);
  history.replaceState(null, '', location.pathname + location.search);
  return incoming;
}

async function restoreSubmission() {
  const incoming = takePairingLink();
  const generation = ++epoch;
  loading = true;
  view('waiting');
  try {
    const saved = await loadSubmission();
    if (generation !== epoch) return;
    if (saved.session) {
      const access = await restoreSubmissionAccess(saved.session).catch(() => null);
      if (generation !== epoch) return;
      submission = saved.session;
      if (expired()) return;
      session = access;
      savedVideos.push(...saved.videos.sort((left, right) => left.recordedAt - right.recordedAt));
      setExpiryTimer();
      showStudentNames(submission.names);
      if (submission.names) {
        showHome(savedVideos.length ? 'Gespeicherte Aufnahmen wiederhergestellt.' : '');
      } else {
        view('name');
        status('');
        nameInput.focus({ preventScroll: true });
      }
    } else if (incoming) {
      promptForPin(incoming);
    } else if (saved.expired) {
      clearSessionView(expiredMessage);
    } else {
      void startScan();
    }
  } catch {
    if (generation === epoch) {
      clearSessionView('');
      status('Der lokale Videospeicher konnte nicht geöffnet werden. Lade die Seite neu und versuche es erneut.', true);
    }
  } finally {
    loading = false;
  }
}

submissionChanges?.addEventListener('message', (event) => {
  if (submission?.id === event.data && !ending) clearSessionView('Die Abgabesitzung wurde in einem anderen Tab beendet.');
});
window.addEventListener('hashchange', () => {
  const incoming = takePairingLink();
  if (incoming && !loading && (!submission || reconnecting) && !pairing && !pending) promptForPin(incoming);
});
document.addEventListener('visibilitychange', () => {
  if (!document.hidden) expired();
});
window.addEventListener('pagehide', () => clearSessionView(''));
window.addEventListener('pageshow', (event) => {
  if (event.persisted) void restoreSubmission();
});
void restoreSubmission();
