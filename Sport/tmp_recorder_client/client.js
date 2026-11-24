import { checkSubmissionAccess, readClientPairing, unlockClientPairing, uploadSubmission } from '../tmp_recorder/client-pairing.js?v=4';
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
const scanCanvas = document.createElement('canvas');
const scanContext = scanCanvas.getContext('2d', { willReadFrequently: true });
const pairingPage = new URL('./', location.href);

let epoch = 0;
let session = null;
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
  get('logout').hidden = !session && !pairing;
  get('logout').textContent = session ? 'Abmelden' : 'Abbrechen';
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

function logout(message = 'Abgemeldet.') {
  epoch += 1;
  session = null;
  pairing = null;
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
  if (!pairing || pending) return;
  const pin = pinInput.value;
  const generation = ++epoch;
  const controller = new AbortController();
  pending = controller;
  pinInput.value = '';
  pinInput.disabled = true;
  pinSubmit.disabled = true;
  status('Zahlencode wird geprüft …');
  try {
    const access = await unlockClientPairing(pairing, pin);
    if (generation !== epoch) return;
    if (!access) {
      status('Der Zahlencode stimmt nicht. Versuche es erneut.', true);
      return;
    }
    status('Videoabgabe wird verbunden …');
    await checkSubmissionAccess(access, controller);
    if (generation !== epoch) return;
    session = access;
    pairing = null;
  } catch (error) {
    if (generation === epoch) status(error.message, true);
  } finally {
    if (generation === epoch) {
      pending = null;
      pinInput.disabled = false;
      pinSubmit.disabled = false;
      if (session) {
        view('name');
        status('');
        nameInput.focus({ preventScroll: true });
      } else {
        pinInput.focus({ preventScroll: true });
      }
    }
  }
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

function acceptNames(event) {
  event.preventDefault();
  if (!session) return;
  const names = nameInput.value.trim().replace(/\s+/g, ' ');
  if (!names) {
    status('Gib mindestens einen Namen ein.', true);
    nameInput.focus({ preventScroll: true });
    return;
  }
  showStudentNames(names);
  nameInput.value = '';
  showHome();
}

async function startVideoCamera() {
  if (!session || !studentNames) return;
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
  get('retake').hidden = saved;
  uploadButton.hidden = !saved;
  uploadButton.disabled = video.uploaded;
  uploadButton.textContent = video.uploaded ? 'Hochgeladen' : 'Hochladen';
  view('preview');
  updatePlayback();
  status('');
  get('preview-heading').focus({ preventScroll: true });
}

function showGallery() {
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
    if (video.uploaded) {
      const submitted = document.createElement('span');
      submitted.className = 'submitted';
      submitted.textContent = 'Hochgeladen';
      button.append(submitted);
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
  if (!session || !stream || recorder) return;
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
        openPreview({ file, duration: videoDuration, id: crypto.randomUUID(), recordedAt: Date.now(), uploaded: false });
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

function saveVideo() {
  if (!previewVideo || savedVideos.includes(previewVideo)) return;
  savedVideos.push(previewVideo);
  showHome('Video in der Galerie gespeichert.');
}

async function submitVideo() {
  const video = previewVideo;
  if (!session || !studentNames || !video || video.uploaded || !savedVideos.includes(video) || pending) return;
  const generation = epoch;
  const controller = new AbortController();
  pending = controller;
  uploadButton.disabled = true;
  get('preview-back').disabled = true;
  preview.pause();
  status('Video wird hochgeladen …');
  try {
    await uploadSubmission(session, { title: studentNames, id: video.id, file: video.file }, controller.signal);
    if (generation !== epoch) return;
    video.uploaded = true;
    uploadButton.textContent = 'Hochgeladen';
    status('Video erfolgreich abgegeben.');
  } catch (error) {
    if (generation === epoch) {
      status(error.message, true);
    }
  } finally {
    if (generation === epoch) {
      pending = null;
      uploadButton.disabled = video.uploaded;
      get('preview-back').disabled = false;
    }
  }
}

get('scan-start').addEventListener('click', startScan);
get('logout').addEventListener('click', () => logout(session ? 'Abgemeldet.' : ''));
get('pin-form').addEventListener('submit', connect);
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
uploadButton.addEventListener('click', submitVideo);
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
window.addEventListener('pagehide', () => logout(''));

function connectFromLink() {
  if (!location.hash) return false;
  const incoming = readClientPairing(location.href, pairingPage);
  history.replaceState(null, '', location.pathname + location.search);
  if (!incoming || session || pairing || pending) return false;
  promptForPin(incoming);
  return true;
}

window.addEventListener('hashchange', connectFromLink);
if (!connectFromLink()) void startScan();
