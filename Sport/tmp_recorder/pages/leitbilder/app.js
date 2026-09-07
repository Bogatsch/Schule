import { GUIDE_TREE } from './guide-tree.js?v=39';
import { formatPlaybackTime } from '../../media-utils.js?v=38';
import { setupVideoAnnotation } from '../../annotation.js?v=29';

const elements = {
  back: document.querySelector('#guides-back'),
  breadcrumb: document.querySelector('#guides-breadcrumb'),
  title: document.querySelector('#guides-title'),
  list: document.querySelector('#guides-list'),
  empty: document.querySelector('#guides-empty'),
  player: document.querySelector('#guides-player'),
  video: document.querySelector('#guide-video'),
  playButton: document.querySelector('#guide-play-button'),
  timeline: document.querySelector('#guide-timeline'),
  playbackTime: document.querySelector('#guide-playback-time'),
  status: document.querySelector('#guide-video-status'),
  annotationButton: document.querySelector('#guide-annotation-button')
};

const speedButtons = [...document.querySelectorAll('[data-guide-speed]')];
const annotation = setupVideoAnnotation({ statusElement: elements.status });
const APP_ROOT = '../../';

/** Leitbilder sind stumme Bewegungsvorlagen; der Ton bleibt in jedem Fall aus. */
function enforceMuted() {
  elements.video.muted = true;
  elements.video.volume = 0;
}

function findNode(pathSegments) {
  let node = GUIDE_TREE;
  for (const segment of pathSegments) {
    if (!node.children) {
      return null;
    }
    const next = node.children.find((child) => child.name === segment);
    if (!next) {
      return null;
    }
    node = next;
  }
  return node;
}

function currentPathSegments() {
  const hash = window.location.hash.replace(/^#\/?/u, '');
  if (!hash) {
    return [];
  }
  return hash.split('/').filter(Boolean).map((segment) => {
    try {
      return decodeURIComponent(segment);
    } catch {
      return segment;
    }
  });
}

function hashForPath(pathSegments) {
  return pathSegments.length === 0
    ? '#/'
    : `#/${pathSegments.map((segment) => encodeURIComponent(segment)).join('/')}`;
}

function countVideos(node) {
  if (node.src) {
    return 1;
  }
  return node.children.reduce((total, child) => total + countVideos(child), 0);
}

function entrySubtitle(node) {
  if (node.src) {
    return 'Video ansehen';
  }
  const count = countVideos(node);
  return count === 1 ? '1 Leitbild' : `${count} Leitbilder`;
}

function stopPlayback() {
  elements.video.pause();
  annotation.close({ restoreFocus: false });
  elements.video.removeAttribute('src');
  elements.video.load();
  elements.status.textContent = '';
}

function updatePlaybackUI() {
  const duration = Number.isFinite(elements.video.duration) ? elements.video.duration : 0;
  const currentTime = Number.isFinite(elements.video.currentTime) ? elements.video.currentTime : 0;
  elements.timeline.value = duration ? String(Math.round((currentTime / duration) * 1000)) : '0';
  elements.playbackTime.value = `${formatPlaybackTime(currentTime)} / ${formatPlaybackTime(duration)}`;
}

function updatePlayButton() {
  const playing = !elements.video.paused && !elements.video.ended;
  elements.playButton.innerHTML = playing
    ? '<span aria-hidden="true">Ⅱ</span>'
    : '<span aria-hidden="true">▶</span>';
  elements.playButton.setAttribute('aria-label', playing ? 'Video pausieren' : 'Video starten');
}

function resetSpeedButtons() {
  elements.video.playbackRate = 1;
  speedButtons.forEach((button) => {
    button.setAttribute('aria-pressed', String(button.dataset.guideSpeed === '1'));
  });
}

async function togglePlayback() {
  if (elements.video.paused || elements.video.ended) {
    if (elements.video.ended) {
      elements.video.currentTime = 0;
    }
    try {
      enforceMuted();
      await elements.video.play();
    } catch {
      elements.status.textContent = 'Das Video konnte nicht gestartet werden. Tippe erneut auf Start.';
    }
  } else {
    elements.video.pause();
  }
}

function renderList(node, pathSegments) {
  const entries = node.children ?? [];
  elements.list.replaceChildren(...entries.map((child) => {
    const link = document.createElement('a');
    link.className = 'sport-card sport-link';
    link.href = hashForPath([...pathSegments, child.name]);

    const text = document.createElement('span');
    text.className = 'sport-text';
    const name = document.createElement('strong');
    name.textContent = child.name;
    const subtitle = document.createElement('small');
    subtitle.textContent = entrySubtitle(child);
    text.append(name, subtitle);

    const arrow = document.createElement('span');
    arrow.className = 'arrow';
    arrow.setAttribute('aria-hidden', 'true');
    arrow.textContent = '→';

    link.append(text, arrow);
    return link;
  }));
  elements.list.hidden = entries.length === 0;
  elements.empty.hidden = entries.length > 0;
}

function render() {
  const pathSegments = currentPathSegments();
  const node = findNode(pathSegments);

  if (!node) {
    window.location.replace(hashForPath([]));
    return;
  }

  const parentSegments = pathSegments.slice(0, -1);
  elements.back.href = pathSegments.length === 0
    ? `${APP_ROOT}index.html`
    : hashForPath(parentSegments);
  elements.breadcrumb.textContent = pathSegments.length === 0
    ? 'Leitbilder'
    : pathSegments.join(' › ');

  stopPlayback();
  resetSpeedButtons();

  if (node.src) {
    elements.list.hidden = true;
    elements.empty.hidden = true;
    elements.player.hidden = false;
    elements.title.textContent = node.name;
    document.title = `${node.name} | Sportkamera`;
    enforceMuted();
    elements.video.src = APP_ROOT + node.src;
    elements.video.load();
    updatePlaybackUI();
    updatePlayButton();
    return;
  }

  elements.player.hidden = true;
  elements.title.textContent = pathSegments.length === 0
    ? 'Welche Sportart möchtest du ansehen?'
    : `${node.name}: Welches Leitbild möchtest du ansehen?`;
  document.title = pathSegments.length === 0
    ? 'Leitbilder | Sportkamera'
    : `${node.name} | Sportkamera`;
  renderList(node, pathSegments);
}

elements.playButton.addEventListener('click', () => void togglePlayback());

elements.timeline.addEventListener('input', () => {
  const duration = elements.video.duration;
  if (Number.isFinite(duration) && duration > 0) {
    elements.video.currentTime = (Number(elements.timeline.value) / 1000) * duration;
  }
});

speedButtons.forEach((button) => {
  button.addEventListener('click', () => {
    elements.video.playbackRate = Number(button.dataset.guideSpeed);
    speedButtons.forEach((speedButton) => {
      speedButton.setAttribute('aria-pressed', String(speedButton === button));
    });
    elements.status.textContent = `Wiedergabegeschwindigkeit ${button.textContent.trim()}.`;
  });
});

elements.annotationButton.addEventListener('click', () => {
  annotation.open(elements.video, elements.title.textContent || 'Leitbild', elements.annotationButton);
});

elements.video.addEventListener('play', updatePlayButton);
elements.video.addEventListener('pause', updatePlayButton);
elements.video.addEventListener('ended', updatePlayButton);
elements.video.addEventListener('timeupdate', updatePlaybackUI);
elements.video.addEventListener('durationchange', updatePlaybackUI);
elements.video.addEventListener('loadedmetadata', updatePlaybackUI);
elements.video.addEventListener('volumechange', enforceMuted);
elements.video.addEventListener('error', () => {
  if (elements.video.getAttribute('src')) {
    elements.status.textContent = 'Das Leitbild-Video konnte nicht geladen werden.';
  }
});
elements.video.addEventListener('contextmenu', (event) => event.preventDefault());

window.addEventListener('hashchange', () => {
  render();
  elements.title.focus({ preventScroll: true });
});

window.addEventListener('pagehide', () => {
  elements.video.pause();
  annotation.close({ restoreFocus: false });
});

if ('serviceWorker' in navigator && window.isSecureContext) {
  navigator.serviceWorker.register(new URL('../../sw.js', import.meta.url)).catch(() => {
    // Die Leitbild-Wiedergabe funktioniert online auch ohne Offline-Cache.
  });
}

render();
document.body.dataset.ready = 'true';
