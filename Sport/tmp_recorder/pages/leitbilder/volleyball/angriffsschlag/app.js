import { formatPlaybackTime } from '../../../../media-utils.js';
import { setupVideoAnnotation } from '../../../../annotation.js?v=27';

const guideVideo = document.querySelector('#guide-video');
const guidePlayButton = document.querySelector('#guide-play-button');
const guideTimeline = document.querySelector('#guide-timeline');
const guidePlaybackTime = document.querySelector('#guide-playback-time');
const guideVideoStatus = document.querySelector('#guide-video-status');
const guideAnnotationButton = document.querySelector('#guide-annotation-button');
const guideSpeedButtons = [...document.querySelectorAll('[data-guide-speed]')];
const annotation = setupVideoAnnotation({ statusElement: guideVideoStatus });

function updateGuidePlaybackUI() {
  const duration = Number.isFinite(guideVideo.duration) ? guideVideo.duration : 0;
  const currentTime = Number.isFinite(guideVideo.currentTime) ? guideVideo.currentTime : 0;
  guideTimeline.value = duration ? String(Math.round((currentTime / duration) * 1000)) : '0';
  guidePlaybackTime.value = `${formatPlaybackTime(currentTime)} / ${formatPlaybackTime(duration)}`;
}

function updateGuidePlayButton() {
  const playing = !guideVideo.paused && !guideVideo.ended;
  guidePlayButton.innerHTML = playing
    ? '<span aria-hidden="true">Ⅱ</span>'
    : '<span aria-hidden="true">▶</span>';
  guidePlayButton.setAttribute('aria-label', playing ? 'Video pausieren' : 'Video starten');
}

async function toggleGuidePlayback() {
  if (guideVideo.paused || guideVideo.ended) {
    if (guideVideo.ended) {
      guideVideo.currentTime = 0;
    }
    try {
      await guideVideo.play();
    } catch {
      guideVideoStatus.textContent = 'Das Video konnte nicht gestartet werden. Tippe erneut auf Start.';
    }
  } else {
    guideVideo.pause();
  }
}

guidePlayButton.addEventListener('click', () => void toggleGuidePlayback());

guideTimeline.addEventListener('input', () => {
  const duration = guideVideo.duration;
  if (Number.isFinite(duration) && duration > 0) {
    guideVideo.currentTime = (Number(guideTimeline.value) / 1000) * duration;
  }
});

guideSpeedButtons.forEach((button) => {
  button.addEventListener('click', () => {
    guideVideo.playbackRate = Number(button.dataset.guideSpeed);
    guideSpeedButtons.forEach((speedButton) => {
      speedButton.setAttribute('aria-pressed', String(speedButton === button));
    });
    guideVideoStatus.textContent = `Wiedergabegeschwindigkeit ${button.textContent.trim()}.`;
  });
});

guideAnnotationButton.addEventListener('click', () => {
  annotation.open(
    guideVideo,
    document.querySelector('#video-title')?.textContent || 'Leitbild',
    guideAnnotationButton
  );
});

guideVideo.addEventListener('play', updateGuidePlayButton);
guideVideo.addEventListener('pause', updateGuidePlayButton);
guideVideo.addEventListener('ended', updateGuidePlayButton);
guideVideo.addEventListener('timeupdate', updateGuidePlaybackUI);
guideVideo.addEventListener('durationchange', updateGuidePlaybackUI);
guideVideo.addEventListener('loadedmetadata', updateGuidePlaybackUI);
guideVideo.addEventListener('error', () => {
  guideVideoStatus.textContent = 'Das Leitbild-Video konnte nicht geladen werden.';
});
guideVideo.addEventListener('contextmenu', (event) => event.preventDefault());
window.addEventListener('pagehide', () => {
  guideVideo.pause();
  annotation.close({ restoreFocus: false });
});
