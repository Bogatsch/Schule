import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createServer } from 'node:http';
import { access, mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const appRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const tempRoot = await mkdtemp(path.join(tmpdir(), 'sportkamera-browser-'));
const profileDirectory = path.join(tempRoot, 'profile');
await mkdir(profileDirectory);

// Eine kurze, lokal erzeugte Y4M-Schleife macht die simulierte Kamera über
// mehrere aufeinanderfolgende getUserMedia-Aufrufe hinweg reproduzierbar.
const fakeVideoPath = path.join(tempRoot, 'fake-camera.y4m');
const fakeWidth = 320;
const fakeHeight = 240;
const fakeFrames = [Buffer.from(`YUV4MPEG2 W${fakeWidth} H${fakeHeight} F30:1 Ip A1:1 C420jpeg\n`,'ascii')];
for (let frameIndex = 0; frameIndex < 30; frameIndex += 1) {
  const yPlaneSize = fakeWidth * fakeHeight;
  const chromaPlaneSize = yPlaneSize / 4;
  const frame = Buffer.alloc(yPlaneSize + chromaPlaneSize * 2);
  for (let y = 0; y < fakeHeight; y += 1) {
    for (let x = 0; x < fakeWidth; x += 1) {
      frame[y * fakeWidth + x] = 48 + ((x + frameIndex * 5) % 160);
    }
  }
  frame.fill(92 + (frameIndex % 20), yPlaneSize, yPlaneSize + chromaPlaneSize);
  frame.fill(174 - (frameIndex % 20), yPlaneSize + chromaPlaneSize);
  fakeFrames.push(Buffer.from('FRAME\n', 'ascii'), frame);
}
await writeFile(fakeVideoPath, Buffer.concat(fakeFrames));

const chromeCandidates = process.platform === 'win32'
  ? [
      'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
      'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
      'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
      'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe'
    ]
  : process.platform === 'darwin'
    ? ['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome']
    : ['/usr/bin/google-chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser'];

let chromePath = process.env.CHROME_PATH;
if (!chromePath) {
  for (const candidate of chromeCandidates) {
    try {
      await access(candidate);
      chromePath = candidate;
      break;
    } catch {
      // Nächsten lokal installierten Browser versuchen.
    }
  }
}
assert.ok(chromePath, 'Kein Chrome-/Edge-Browser für den optionalen Browsertest gefunden.');

const mimeTypes = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.png': 'image/png',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm'
};

const webServer = createServer(async (request, response) => {
  try {
    const requestUrl = new URL(request.url, 'http://127.0.0.1');
    const pathname = requestUrl.pathname === '/' ? '/index.html' : requestUrl.pathname;
    const normalized = path.posix.normalize(decodeURIComponent(pathname)).replace(/^\.\.\//, '');
    const filePath = path.resolve(appRoot, `.${normalized}`);
    assert.ok(filePath.startsWith(appRoot + path.sep));
    const content = await readFile(filePath);
    const headers = {
      'Content-Type': mimeTypes[path.extname(filePath)] ?? 'application/octet-stream',
      'Cache-Control': 'no-store',
      'Accept-Ranges': 'bytes'
    };
    const rangeMatch = request.headers.range?.match(/^bytes=(\d+)-(\d*)$/);
    if (rangeMatch) {
      const start = Number(rangeMatch[1]);
      const requestedEnd = rangeMatch[2] ? Number(rangeMatch[2]) : content.length - 1;
      const end = Math.min(requestedEnd, content.length - 1);
      if (start >= content.length || start > end) {
        response.writeHead(416, { ...headers, 'Content-Range': `bytes */${content.length}` });
        response.end();
        return;
      }
      const partialContent = content.subarray(start, end + 1);
      response.writeHead(206, {
        ...headers,
        'Content-Length': partialContent.length,
        'Content-Range': `bytes ${start}-${end}/${content.length}`
      });
      response.end(partialContent);
      return;
    }
    response.writeHead(200, { ...headers, 'Content-Length': content.length });
    response.end(content);
  } catch {
    response.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    response.end('Nicht gefunden');
  }
});

await new Promise((resolve, reject) => {
  webServer.once('error', reject);
  webServer.listen(0, '127.0.0.1', resolve);
});
const appPort = webServer.address().port;
const appUrl = `http://127.0.0.1:${appPort}/`;

const debugPortServer = createServer();
await new Promise((resolve, reject) => {
  debugPortServer.once('error', reject);
  debugPortServer.listen(0, '127.0.0.1', resolve);
});
const debugPort = debugPortServer.address().port;
await new Promise((resolve) => debugPortServer.close(resolve));

const chromeProcess = spawn(chromePath, [
  '--headless=new',
  `--remote-debugging-port=${debugPort}`,
  '--remote-debugging-address=127.0.0.1',
  `--user-data-dir=${profileDirectory}`,
  '--use-fake-device-for-media-stream',
  '--use-fake-ui-for-media-stream',
  `--use-file-for-fake-video-capture=${fakeVideoPath}`,
  '--autoplay-policy=no-user-gesture-required',
  '--disable-background-networking',
  '--disable-component-update',
  '--disable-default-apps',
  '--disable-domain-reliability',
  '--disable-features=MediaRouter,OptimizationHints,Translate',
  '--disable-sync',
  '--metrics-recording-only',
  '--no-default-browser-check',
  '--no-first-run',
  '--no-pings',
  '--window-size=1024,1366',
  'about:blank'
], {
  stdio: ['ignore', 'ignore', 'pipe'],
  windowsHide: true
});

let chromeError = '';
chromeProcess.stderr.setEncoding('utf8');
chromeProcess.stderr.on('data', (chunk) => {
  chromeError += chunk;
});

async function poll(callback, timeoutMs = 10_000, intervalMs = 100) {
  const deadline = Date.now() + timeoutMs;
  let lastError;
  while (Date.now() < deadline) {
    try {
      const result = await callback();
      if (result) return result;
    } catch (error) {
      lastError = error;
    }
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }
  throw lastError ?? new Error(`Bedingung nach ${timeoutMs} ms nicht erfüllt.`);
}

const targets = await poll(async () => {
  const response = await fetch(`http://127.0.0.1:${debugPort}/json/list`);
  if (!response.ok) return null;
  const list = await response.json();
  return list.some((target) => target.type === 'page') ? list : null;
});
const target = targets.find((entry) => entry.type === 'page');

class CdpClient {
  constructor(webSocketUrl) {
    this.socket = new WebSocket(webSocketUrl);
    this.nextId = 1;
    this.pending = new Map();
    this.listeners = new Map();
  }

  async connect() {
    await new Promise((resolve, reject) => {
      this.socket.addEventListener('open', resolve, { once: true });
      this.socket.addEventListener('error', reject, { once: true });
    });
    this.socket.addEventListener('message', (event) => {
      const message = JSON.parse(event.data);
      if (message.id) {
        const pending = this.pending.get(message.id);
        if (!pending) return;
        this.pending.delete(message.id);
        if (message.error) {
          pending.reject(new Error(`${message.error.message} (${message.error.code})`));
        } else {
          pending.resolve(message.result);
        }
        return;
      }
      for (const listener of this.listeners.get(message.method) ?? []) {
        listener(message.params);
      }
    });
  }

  send(method, params = {}) {
    const id = this.nextId++;
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.pending.delete(id);
        reject(new Error(`CDP-Zeitüberschreitung bei ${method}`));
      }, 30_000);
      this.pending.set(id, {
        resolve: (value) => {
          clearTimeout(timeout);
          resolve(value);
        },
        reject: (error) => {
          clearTimeout(timeout);
          reject(error);
        }
      });
      this.socket.send(JSON.stringify({ id, method, params }));
    });
  }

  on(method, listener) {
    const listeners = this.listeners.get(method) ?? [];
    listeners.push(listener);
    this.listeners.set(method, listeners);
  }

  once(method) {
    return new Promise((resolve) => {
      const listener = (params) => {
        const listeners = this.listeners.get(method) ?? [];
        this.listeners.set(method, listeners.filter((entry) => entry !== listener));
        resolve(params);
      };
      this.on(method, listener);
    });
  }

  close() {
    this.socket.close();
  }
}

const client = new CdpClient(target.webSocketDebuggerUrl);
await client.connect();
await Promise.all([
  client.send('Page.enable'),
  client.send('Runtime.enable'),
  client.send('Network.enable'),
  client.send('Log.enable')
]);

const pageErrors = [];
const networkRequests = [];
client.on('Runtime.exceptionThrown', ({ exceptionDetails }) => {
  pageErrors.push(exceptionDetails.exception?.description ?? exceptionDetails.text);
});
client.on('Log.entryAdded', ({ entry }) => {
  if (entry.level === 'error') pageErrors.push(entry.text);
});
client.on('Network.requestWillBeSent', ({ request }) => {
  networkRequests.push({ method: request.method, url: request.url });
});

async function evaluate(expression) {
  const response = await client.send('Runtime.evaluate', {
    expression,
    awaitPromise: true,
    returnByValue: true,
    userGesture: true
  });
  if (response.exceptionDetails) {
    throw new Error(response.exceptionDetails.exception?.description ?? response.exceptionDetails.text);
  }
  return response.result.value;
}

async function waitFor(expression, timeoutMs = 10_000) {
  try {
    return await poll(() => evaluate(expression), timeoutMs, 100);
  } catch (error) {
    const diagnostic = await evaluate(`({
      view: document.body && document.body.dataset.view,
      error: document.querySelector('#error-message') && document.querySelector('#error-message').textContent,
      cameraStatus: document.querySelector('#camera-status') && document.querySelector('#camera-status').textContent,
      captureDisabled: document.querySelector('#capture-button') && document.querySelector('#capture-button').disabled,
      readyState: document.querySelector('#live-video') && document.querySelector('#live-video').readyState,
      videoWidth: document.querySelector('#live-video') && document.querySelector('#live-video').videoWidth,
      visibility: document.visibilityState
    })`).catch(() => null);
    throw new Error(`${error.message} Zustand: ${JSON.stringify(diagnostic)}`);
  }
}

async function click(selector) {
  const encoded = JSON.stringify(selector);
  assert.equal(await evaluate(`document.querySelectorAll(${encoded}).length`), 1, `Selektor nicht eindeutig: ${selector}`);
  await evaluate(`document.querySelector(${encoded}).click(); true`);
}

async function navigate(url = appUrl) {
  const loaded = client.once('Page.loadEventFired');
  await client.send('Page.navigate', { url });
  await loaded;
  await waitFor(`document.readyState === 'complete'`);
}

async function reload(ignoreCache = true) {
  const loaded = client.once('Page.loadEventFired');
  await client.send('Page.reload', { ignoreCache });
  await loaded;
  await waitFor(`document.readyState === 'complete'`);
}

async function setViewport(width, height) {
  await client.send('Emulation.setDeviceMetricsOverride', {
    width,
    height,
    deviceScaleFactor: 1,
    mobile: width < 700,
    screenWidth: width,
    screenHeight: height
  });
}

async function screenshot(fileName) {
  const { data } = await client.send('Page.captureScreenshot', {
    format: 'png',
    captureBeyondViewport: false,
    fromSurface: true
  });
  const targetPath = path.join(tempRoot, fileName);
  await writeFile(targetPath, Buffer.from(data, 'base64'));
  return targetPath;
}

const results = [];
let lifecycleAutomated = false;

try {
  await setViewport(1024, 1366);
  await navigate();

  const initial = await evaluate(`({
    title: document.title,
    view: document.body.dataset.view,
    secure: window.isSecureContext,
    photoButtons: document.querySelectorAll('[data-start-mode="photo"]').length,
    videoButtons: document.querySelectorAll('[data-start-mode="video"]').length,
    guideLinks: document.querySelectorAll('.guide-entry').length,
    externalResources: [...document.querySelectorAll('[src],[href]')]
      .map((node) => node.src || node.href)
      .filter((url) => /^https?:/.test(url) && !url.startsWith(location.origin)),
    horizontalOverflow: document.documentElement.scrollWidth > innerWidth
  })`);
  assert.equal(initial.title, 'Sportkamera');
  assert.equal(initial.view, 'start');
  assert.equal(initial.secure, true);
  assert.equal(initial.photoButtons, 1);
  assert.equal(initial.videoButtons, 1);
  assert.equal(initial.guideLinks, 1);
  assert.deepEqual(initial.externalResources, []);
  assert.equal(initial.horizontalOverflow, false);
  results.push('Startansicht, HTTPS/localhost-Kontext und lokale Ressourcen');

  const portraitScreenshot = await screenshot('start-portrait.png');

  await click('.guide-entry');
  await waitFor(`document.title === 'Leitbilder | Sportkamera'
    && document.querySelectorAll('[data-category]').length === 2`);
  await click('[data-category="spielsportarten"]');
  await waitFor(`!document.querySelector('[data-category-content="spielsportarten"]').hidden`);
  await click('[data-sport="volleyball"]');
  await waitFor(`document.title === 'Volleyball | Sportkamera'
    && document.querySelectorAll('[data-guide]').length >= 2`);
  await click('[data-guide="pritschen-seitlich"]');
  await waitFor(`document.title === 'Pritschen seitlich | Sportkamera'
    && document.querySelector('#guide-video').readyState >= 1`);
  assert.equal(await evaluate(`document.querySelector('#guide-video').muted`), true);
  await click('[data-guide-speed="0.5"]');
  assert.equal(await evaluate(`document.querySelector('#guide-video').playbackRate`), 0.5);
  await click('.video-back');
  await waitFor(`document.title === 'Volleyball | Sportkamera'`);
  await click('.sport-back');
  await waitFor(`document.title === 'Leitbilder | Sportkamera'
    && !document.querySelector('[data-category-content="spielsportarten"]').hidden`);
  await click('.guides-back');
  await waitFor(`document.title === 'Sportkamera'
    && document.body.dataset.view === 'start'
    && document.body.dataset.ready === 'true'`);
  results.push('Leitbilder-Seite mit Individual- und Spielsportarten');

  await click('[data-start-mode="photo"]');
  await waitFor(`document.body.dataset.view === 'camera'
    && !document.querySelector('#capture-button').disabled
    && document.querySelector('#live-video').readyState >= 2
    && document.querySelector('#live-video').videoWidth > 0`);
  assert.equal(await evaluate(`document.querySelector('#live-video').srcObject.getAudioTracks().length`), 0);
  assert.equal(await evaluate(`document.querySelector('#live-video').srcObject.getVideoTracks().length`), 1);
  results.push('Kameraberechtigung und Livebild ohne Audiospur');

  await click('#capture-button');
  await waitFor(`document.body.dataset.view === 'preview' && document.querySelector('#photo-preview').src.startsWith('blob:')`);
  assert.equal(await evaluate(`document.querySelector('#photo-preview').hidden`), false);
  assert.equal(await evaluate(`document.querySelector('#photo-download-controls').hidden`), false);
  await click('#photo-download-button');
  await waitFor(`document.querySelector('#download-dialog').open`);
  assert.equal(await evaluate(`document.querySelector('#download-dialog-title').textContent`), 'Bild herunterladen');
  await click('#download-cancel');
  await waitFor(`!document.querySelector('#download-dialog').open`);
  results.push('Foto aufnehmen und als temporären Blob anzeigen');

  await click('#discard-button');
  await waitFor(`document.body.dataset.view === 'start'`);
  const discarded = await evaluate(`({
    imageSource: document.querySelector('#photo-preview').getAttribute('src'),
    videoSource: document.querySelector('#video-preview').getAttribute('src'),
    liveStream: document.querySelector('#live-video').srcObject
  })`);
  assert.equal(discarded.imageSource, null);
  assert.equal(discarded.videoSource, null);
  assert.equal(discarded.liveStream, null);
  results.push('Verwerfen entfernt Medienquellen und Kamerastream');

  await click('[data-start-mode="photo"]');
  await waitFor(`!document.querySelector('#capture-button').disabled && document.querySelector('#live-video').videoWidth > 0`);
  await click('#switch-camera');
  await waitFor(`!document.querySelector('#capture-button').disabled && document.querySelector('#live-video').srcObject !== null`);
  assert.equal(await evaluate(`document.querySelector('#camera-facing-label').textContent`), 'Frontkamera');
  await click('[data-camera-mode="video"]');
  await waitFor(`document.querySelector('[data-camera-mode="video"]').getAttribute('aria-pressed') === 'true'
    && !document.querySelector('#capture-button').disabled`);
  results.push('Front-/Rückkamera- und Foto-/Video-Wechsel');

  await click('#capture-button');
  await waitFor(`!document.querySelector('#recording-indicator').hidden`);
  await new Promise((resolve) => setTimeout(resolve, 900));
  await click('#capture-button');
  await waitFor(`document.body.dataset.view === 'preview' && document.querySelector('#video-preview').src.startsWith('blob:')`, 15_000);
  assert.equal(await evaluate(`document.querySelector('#video-preview').hasAttribute('controls')`), false);
  assert.equal(await evaluate(`document.querySelector('#playback-controls').hidden`), false);
  await click('#video-download-button');
  await waitFor(`document.querySelector('#download-dialog').open`);
  await evaluate(`(() => {
    document.querySelector('#download-name').value = 'Mein Testvideo';
    window.__sportkameraOriginalAnchorClick = HTMLAnchorElement.prototype.click;
    window.__sportkameraDownload = null;
    HTMLAnchorElement.prototype.click = function captureDownload() {
      if (this.download) {
        window.__sportkameraDownload = { filename: this.download, href: this.href };
        return;
      }
      return window.__sportkameraOriginalAnchorClick.call(this);
    };
  })()`);
  await click('#download-form button[type="submit"]');
  await waitFor(`window.__sportkameraDownload !== null && !document.querySelector('#download-dialog').open`);
  const videoDownload = await evaluate(`(() => {
    const result = window.__sportkameraDownload;
    HTMLAnchorElement.prototype.click = window.__sportkameraOriginalAnchorClick;
    delete window.__sportkameraOriginalAnchorClick;
    delete window.__sportkameraDownload;
    return result;
  })()`);
  assert.match(videoDownload.filename, /^Mein Testvideo\.(?:webm|mp4)$/);
  assert.match(videoDownload.href, /^blob:/);
  results.push('Video manuell stoppen und mit eigenen Steuerelementen anzeigen');

  await click('#speed-menu summary');
  await waitFor(`document.querySelector('#speed-menu').open`);
  await click('[data-speed="0.25"]');
  assert.equal(await evaluate(`document.querySelector('#video-preview').playbackRate`), 0.25);
  assert.equal(await evaluate(`document.querySelector('#speed-value').textContent`), '0,25×');
  assert.equal(await evaluate(`document.querySelector('#speed-menu').open`), false);
  await click('#speed-menu summary');
  await click('[data-speed="0.5"]');
  assert.equal(await evaluate(`document.querySelector('#video-preview').playbackRate`), 0.5);
  await click('#speed-menu summary');
  await click('[data-speed="1"]');
  assert.equal(await evaluate(`document.querySelector('#video-preview').playbackRate`), 1);

  assert.equal(await evaluate(`document.querySelector('#comparison-controls').hidden`), false);
  await click('#comparison-button');
  await waitFor(`document.querySelector('#comparison-picker').open
    && !document.querySelector('[data-comparison-step="category"]').hidden`);
  await click('[data-comparison-category="individualsportarten"]');
  await waitFor(`!document.querySelector('[data-comparison-step="sport"]').hidden
    && !document.querySelector('[data-comparison-sport-list="individualsportarten"]').hidden`);
  assert.match(
    await evaluate(`document.querySelector('[data-comparison-sport-list="individualsportarten"]').textContent`),
    /noch keine Leitbilder/i
  );
  await click('[data-comparison-back="category"]');
  await waitFor(`!document.querySelector('[data-comparison-step="category"]').hidden`);
  await click('[data-comparison-category="spielsportarten"]');
  await waitFor(`!document.querySelector('[data-comparison-sport-list="spielsportarten"]').hidden`);
  await click('[data-comparison-sport="volleyball"]');
  await waitFor(`!document.querySelector('[data-comparison-step="guide"]').hidden`);
  await click('[data-comparison-title="Volleyball · Pritschen seitlich"]');
  await waitFor(`!document.querySelector('#comparison-pane').hidden
    && !document.querySelector('#comparison-playback-controls').hidden
    && !document.querySelector('#comparison-picker').open
    && document.querySelector('#comparison-video').readyState >= 1`);
  assert.equal(await evaluate(`document.querySelector('#comparison-video').muted`), true);
  assert.equal(await evaluate(`document.querySelector('#preview-stage').classList.contains('comparing')`), true);
  const comparisonPlayerLayout = await evaluate(`(() => {
    const own = document.querySelector('#playback-controls').getBoundingClientRect();
    const guide = document.querySelector('#comparison-playback-controls').getBoundingClientRect();
    return {
      sameRow: Math.abs(own.top - guide.top) < 2,
      ownWidth: own.width,
      guideWidth: guide.width,
      viewportWidth: innerWidth
    };
  })()`);
  assert.equal(comparisonPlayerLayout.sameRow, true);
  assert.ok(comparisonPlayerLayout.ownWidth < comparisonPlayerLayout.viewportWidth * 0.6);
  assert.ok(comparisonPlayerLayout.guideWidth < comparisonPlayerLayout.viewportWidth * 0.6);

  await setViewport(844, 390);
  const compactLandscapeLayout = await evaluate(`(() => {
    const ownControls = document.querySelector('#playback-controls').getBoundingClientRect();
    const guideControls = document.querySelector('#comparison-playback-controls').getBoundingClientRect();
    const timeline = document.querySelector('#comparison-timeline').getBoundingClientRect();
    const speed = document.querySelector('#comparison-speed-menu summary').getBoundingClientRect();
    return {
      overflow: document.documentElement.scrollWidth > innerWidth,
      ownHeight: ownControls.height,
      guideHeight: guideControls.height,
      speedRightOfTimeline: speed.left >= timeline.right - 2
    };
  })()`);
  assert.equal(compactLandscapeLayout.overflow, false);
  assert.ok(compactLandscapeLayout.ownHeight < 155);
  assert.ok(compactLandscapeLayout.guideHeight < 155);
  assert.equal(compactLandscapeLayout.speedRightOfTimeline, true);
  await click('#comparison-speed-menu summary');
  await waitFor(`document.querySelector('#comparison-speed-menu').open`);
  const upwardSpeedMenu = await evaluate(`(() => {
    const summary = document.querySelector('#comparison-speed-menu summary').getBoundingClientRect();
    const options = document.querySelector('#comparison-speed-menu .speed-options').getBoundingClientRect();
    return options.bottom <= summary.top + 2;
  })()`);
  assert.equal(upwardSpeedMenu, true);
  await click('#comparison-speed-menu summary');
  await setViewport(1024, 1366);

  await click('#speed-menu summary');
  await click('[data-speed="0.5"]');
  assert.equal(await evaluate(`document.querySelector('#video-preview').playbackRate`), 0.5);
  assert.equal(await evaluate(`document.querySelector('#comparison-video').playbackRate`), 1);
  await click('#play-button');
  await waitFor(`!document.querySelector('#video-preview').paused
    && document.querySelector('#comparison-video').paused`);
  await click('#play-button');
  await waitFor(`document.querySelector('#video-preview').paused`);

  const ownSeek = await evaluate(`(() => {
    const timeline = document.querySelector('#timeline');
    timeline.value = '500';
    timeline.dispatchEvent(new Event('input', { bubbles: true }));
    return {
      ownTime: document.querySelector('#video-preview').currentTime,
      guideTime: document.querySelector('#comparison-video').currentTime
    };
  })()`);
  assert.ok(ownSeek.ownTime > 0);
  assert.equal(ownSeek.guideTime, 0);

  const ownTimeBeforeGuideSeek = await evaluate(`document.querySelector('#video-preview').currentTime`);
  await evaluate(`(() => {
    const timeline = document.querySelector('#comparison-timeline');
    timeline.value = '250';
    timeline.dispatchEvent(new Event('input', { bubbles: true }));
  })()`);
  await waitFor(`document.querySelector('#comparison-video').currentTime > 0`);
  const guideSeek = await evaluate(`({
    ownTime: document.querySelector('#video-preview').currentTime,
    guideTime: document.querySelector('#comparison-video').currentTime
  })`);
  assert.ok(guideSeek.guideTime > 0);
  assert.ok(Math.abs(guideSeek.ownTime - ownTimeBeforeGuideSeek) < 0.01);

  await click('#comparison-speed-menu summary');
  await waitFor(`document.querySelector('#comparison-speed-menu').open`);
  await click('[data-comparison-speed="0.25"]');
  assert.equal(await evaluate(`document.querySelector('#comparison-video').playbackRate`), 0.25);
  assert.equal(await evaluate(`document.querySelector('#comparison-speed-value').textContent`), '0,25×');
  assert.equal(await evaluate(`document.querySelector('#comparison-speed-menu').open`), false);
  assert.equal(await evaluate(`document.querySelector('#video-preview').playbackRate`), 0.5);
  await click('#comparison-play-button');
  await waitFor(`document.querySelector('#video-preview').paused
    && !document.querySelector('#comparison-video').paused`);
  await click('#comparison-play-button');
  await waitFor(`document.querySelector('#comparison-video').paused`);
  results.push('Eigene Aufnahme und Leitbild unabhängig steuern');

  await click('#comparison-remove');
  await waitFor(`document.querySelector('#comparison-pane').hidden
    && document.querySelector('#comparison-playback-controls').hidden
    && !document.querySelector('#preview-stage').classList.contains('comparing')`);
  await click('#speed-menu summary');
  await click('[data-speed="1"]');
  await click('#play-button');
  await waitFor(`!document.querySelector('#video-preview').paused`);
  await click('#play-button');
  await waitFor(`document.querySelector('#video-preview').paused`);
  results.push('Start/Pause sowie 0,25×, 0,5× und 1×');

  const videoPreviewScreenshot = await screenshot('video-preview-portrait.png');

  await click('#new-recording-button');
  await waitFor(`document.body.dataset.view === 'camera' && !document.querySelector('#capture-button').disabled`);
  await click('#capture-button');
  await waitFor(`!document.querySelector('#recording-indicator').hidden`);
  await waitFor(`document.body.dataset.view === 'preview' && document.querySelector('#video-preview').src.startsWith('blob:')`, 183_000);
  assert.equal(await evaluate(`document.querySelector('#recording-time').textContent`), '03:00.0');
  results.push('Automatisches Aufnahmeende nach 3 Minuten');

  await click('#new-recording-button');
  await waitFor(`document.body.dataset.view === 'camera' && !document.querySelector('#capture-button').disabled`);
  await click('#capture-button');
  await waitFor(`!document.querySelector('#recording-indicator').hidden`);
  try {
    await client.send('Page.setWebLifecycleState', { state: 'frozen' });
    await new Promise((resolve) => setTimeout(resolve, 150));
    await client.send('Page.setWebLifecycleState', { state: 'active' });
    await client.send('Page.bringToFront');
    await waitFor(`document.body.dataset.view === 'start' && document.querySelector('#live-video').srcObject === null`);
    lifecycleAutomated = true;
    results.push('Bereinigung beim Wechsel in den Hintergrund');
  } catch {
    await reload();
  }

  if (await evaluate(`document.body.dataset.view !== 'start'`)) {
    await reload();
  }
  await click('[data-start-mode="photo"]');
  await waitFor(`!document.querySelector('#capture-button').disabled && document.querySelector('#live-video').videoWidth > 0`);
  await click('#capture-button');
  await waitFor(`document.body.dataset.view === 'preview'`);
  await reload();
  assert.equal(await evaluate(`document.body.dataset.view`), 'start');
  assert.equal(await evaluate(`document.querySelector('#photo-preview').getAttribute('src')`), null);
  results.push('Neuladen stellt keine frühere Aufnahme wieder her');

  const workerState = await evaluate(`navigator.serviceWorker.ready.then((registration) => ({
    scope: registration.scope,
    state: registration.active && registration.active.state
  }))`);
  assert.equal(workerState.state, 'activated');
  assert.equal(workerState.scope, appUrl);
  const storageState = await evaluate(`Promise.all([
    caches.keys().then(async (names) => ({
      names,
      requests: (await Promise.all(names.map(async (name) => (await caches.open(name)).keys()))).flat().map((request) => request.url)
    })),
    indexedDB.databases().then((databases) => databases.map((database) => database.name))
  ]).then(([cacheState, databases]) => ({
    cacheState,
    databases,
    localStorageLength: localStorage.length,
    sessionStorageLength: sessionStorage.length
  }))`);
  assert.equal(storageState.localStorageLength, 0);
  assert.equal(storageState.sessionStorageLength, 0);
  assert.deepEqual(storageState.databases, []);
  assert.equal(storageState.cacheState.names.length, 1);
  assert.ok(storageState.cacheState.requests.every((url) => !url.startsWith('blob:')));
  assert.ok(storageState.cacheState.requests.every((url) => url.startsWith(appUrl)));
  results.push('Browser-Speicher und Service-Worker-Cache enthalten keine Medien');

  if (!(await evaluate(`navigator.serviceWorker.controller !== null`))) {
    await navigate(`${appUrl}?installed=1`);
  }
  await waitFor(`navigator.serviceWorker.controller !== null`, 5_000);
  await new Promise((resolve) => webServer.close(resolve));
  try {
    await reload(false);
    assert.equal(await evaluate(`document.title`), 'Sportkamera');
    assert.equal(await evaluate(`document.body.dataset.view`), 'start');
  } finally {
    await new Promise((resolve, reject) => {
      webServer.once('error', reject);
      webServer.listen(appPort, '127.0.0.1', resolve);
    });
  }
  results.push('Offline-Start aus dem statischen App-Cache');

  await setViewport(1366, 1024);
  await reload();
  const landscapeLayout = await evaluate(`({
    overflow: document.documentElement.scrollWidth > innerWidth,
    startColumns: getComputedStyle(document.querySelector('#start-view')).gridTemplateColumns,
    modePanelWidth: document.querySelector('.mode-panel').getBoundingClientRect().width
  })`);
  assert.equal(landscapeLayout.overflow, false);
  assert.notEqual(landscapeLayout.startColumns, 'none');
  assert.ok(landscapeLayout.modePanelWidth > 0 && landscapeLayout.modePanelWidth <= 680);
  const landscapeScreenshot = await screenshot('start-landscape.png');
  await click('[data-start-mode="photo"]');
  await waitFor(`document.body.dataset.view === 'camera'
    && !document.querySelector('#capture-button').disabled
    && document.querySelector('#live-video').videoWidth > 0`);
  const landscapeCameraLayout = await evaluate(`({
    overflow: document.documentElement.scrollWidth > innerWidth,
    stageWidth: document.querySelector('#camera-stage').getBoundingClientRect().width,
    captureSize: document.querySelector('#capture-button').getBoundingClientRect().width
  })`);
  assert.equal(landscapeCameraLayout.overflow, false);
  assert.ok(landscapeCameraLayout.stageWidth <= 1366);
  assert.ok(landscapeCameraLayout.captureSize >= 44);
  const landscapeCameraScreenshot = await screenshot('camera-landscape.png');
  await setViewport(1366, 768);
  const shallowLandscape = await evaluate(`(() => {
    const capture = document.querySelector('#capture-button').getBoundingClientRect();
    return {
      overflow: document.documentElement.scrollWidth > innerWidth,
      captureVisible: capture.top >= 0 && capture.bottom <= innerHeight
    };
  })()`);
  assert.equal(shallowLandscape.overflow, false);
  assert.equal(shallowLandscape.captureVisible, true);
  await click('#camera-back');
  await waitFor(`document.body.dataset.view === 'start'`);

  await setViewport(390, 844);
  await reload();
  const mobileLayout = await evaluate(`({
    overflow: document.documentElement.scrollWidth > innerWidth,
    modeButtons: [...document.querySelectorAll('[data-start-mode]')].map((button) => {
      const box = button.getBoundingClientRect();
      return { width: box.width, height: box.height };
    }),
    viewport: [innerWidth, innerHeight]
  })`);
  assert.equal(mobileLayout.overflow, false);
  assert.deepEqual(mobileLayout.viewport, [390, 844]);
  assert.ok(mobileLayout.modeButtons.every(({ width, height }) => width >= 44 && height >= 44));
  const mobileScreenshot = await screenshot('start-mobile.png');
  await click('[data-start-mode="photo"]');
  await waitFor(`document.body.dataset.view === 'camera'
    && !document.querySelector('#capture-button').disabled
    && document.querySelector('#live-video').videoWidth > 0`);
  assert.equal(await evaluate(`document.documentElement.scrollWidth > innerWidth`), false);
  const mobileCameraScreenshot = await screenshot('camera-mobile.png');
  await click('#capture-button');
  await waitFor(`document.body.dataset.view === 'preview' && document.querySelector('#photo-preview').src.startsWith('blob:')`);
  assert.equal(await evaluate(`document.documentElement.scrollWidth > innerWidth`), false);
  await click('#preview-back');
  await waitFor(`document.body.dataset.view === 'start' && !document.querySelector('#photo-preview').hasAttribute('src')`);
  results.push('Responsive Hoch-, Quer- und Smartphone-Ansichten ohne horizontales Überlaufen');
  results.push('Interne Zurück-Schaltfläche verwirft die Aufnahme vor dem Ansichtswechsel');

  await evaluate(`Object.defineProperty(navigator.mediaDevices, 'getUserMedia', {
    configurable: true,
    value: () => Promise.reject(new DOMException('Kamerazugriff verweigert', 'NotAllowedError'))
  }); true`);
  await click('[data-start-mode="photo"]');
  await waitFor(`document.body.dataset.view === 'error'`);
  assert.match(await evaluate(`document.querySelector('#error-message').textContent`), /abgelehnt/);
  results.push('Verständlicher Fehler bei verweigerter Kameraberechtigung');

  const injection = await client.send('Page.addScriptToEvaluateOnNewDocument', {
    source: `Object.defineProperty(MediaRecorder, 'isTypeSupported', { configurable: true, value: () => false });`
  });
  await reload();
  await click('[data-start-mode="video"]');
  await waitFor(`document.body.dataset.view === 'error'`);
  assert.match(await evaluate(`document.querySelector('#error-message').textContent`), /WebM- oder MP4/);
  await client.send('Page.removeScriptToEvaluateOnNewDocument', { identifier: injection.identifier });
  results.push('Verständlicher Fehler bei nicht unterstütztem Recorder-Format');

  const transmitted = networkRequests.filter(({ url }) => /^https?:/.test(url));
  assert.ok(transmitted.every(({ url }) => url.startsWith(appUrl)), 'Externer Netzwerkrequest entdeckt');
  assert.ok(transmitted.every(({ method }) => method === 'GET'), 'Nicht lesender Netzwerkrequest entdeckt');
  results.push('Keine externen, schreibenden oder Medien-Netzwerkübertragungen');

  assert.deepEqual(pageErrors, [], `Browserfehler entdeckt:\n${pageErrors.join('\n')}`);

  console.log(`Browser-Abnahme erfolgreich: ${results.length} Prüfpunkte.`);
  results.forEach((result) => console.log(`✓ ${result}`));
  if (!lifecycleAutomated) {
    console.log('HINWEIS: Der Browser stellte keine automatisierbare Hintergrund-Lebenszyklusfunktion bereit.');
  }
  console.log(`SCREENSHOT_PORTRAIT=${portraitScreenshot}`);
  console.log(`SCREENSHOT_PREVIEW=${videoPreviewScreenshot}`);
  console.log(`SCREENSHOT_LANDSCAPE=${landscapeScreenshot}`);
  console.log(`SCREENSHOT_CAMERA_LANDSCAPE=${landscapeCameraScreenshot}`);
  console.log(`SCREENSHOT_MOBILE=${mobileScreenshot}`);
  console.log(`SCREENSHOT_CAMERA_MOBILE=${mobileCameraScreenshot}`);
} finally {
  try {
    await client.send('Browser.close');
  } catch {
    chromeProcess.kill();
  }
  client.close();
  await new Promise((resolve) => webServer.close(resolve));
  await new Promise((resolve) => {
    if (chromeProcess.exitCode !== null) {
      resolve();
      return;
    }
    const timeout = setTimeout(() => {
      chromeProcess.kill();
      resolve();
    }, 5_000);
    chromeProcess.once('exit', () => {
      clearTimeout(timeout);
      resolve();
    });
  });
  await rm(profileDirectory, { recursive: true, force: true, maxRetries: 3, retryDelay: 100 }).catch(() => {});
}

if (chromeError && process.env.DEBUG_BROWSER_TEST) {
  console.error(chromeError);
}
