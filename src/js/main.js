// Browser entry point. Bundled into app.js by scripts/build.mjs.
import { launchInstant, zonedToInstant, timeLeft, timeSince, pad2, unitLabel, srSentence } from './time.js';
import { measureOffset } from './clock.js';
import { isShielded, isPhaseLive } from './content.js';

const config = JSON.parse(document.getElementById('app-config').textContent);
const launch = launchInstant(config);
const gtaV = zonedToInstant(config.gtaVReleaseLocal, config.timeZone);
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
const numberFormat = new Intl.NumberFormat('da-DK');

// localStorage can throw (private mode, blocked storage); the page must work without it.
const storage = {
  get(key) { try { return localStorage.getItem(key); } catch { return null; } },
  set(key, value) { try { localStorage.setItem(key, value); } catch { /* ignore */ } },
};

let offset = 0;
const now = () => Date.now() + offset;

const setText = (el, text) => { if (el && el.textContent !== text) el.textContent = text; };

// --- Countdown (FR-01, FR-05) ---------------------------------------------

const countdownEl = document.getElementById('countdown');
const launchedEl = document.getElementById('launched');
const heroTitle = document.getElementById('hero-title');
const srStatus = document.getElementById('sr-status');
const tiles = Object.fromEntries(['days', 'hours', 'minutes', 'seconds'].map((unit) => {
  const el = countdownEl.querySelector(`[data-unit="${unit}"]`);
  return [unit, { value: el.querySelector('.tile__value'), label: el.querySelector('.tile__label') }];
}));

let launched = false;
let lastAnnounced = null;

function renderCountdown(t) {
  const left = timeLeft(launch, t);
  if (left.done) {
    if (!launched) showLaunched(lastAnnounced !== null);
    return;
  }
  setText(tiles.days.value, String(left.days));
  setText(tiles.hours.value, pad2(left.hours));
  setText(tiles.minutes.value, pad2(left.minutes));
  setText(tiles.seconds.value, pad2(left.seconds));
  for (const unit of Object.keys(tiles)) setText(tiles[unit].label, unitLabel(unit, left[unit]));

  // Screen readers hear the time once per minute, not every second (TC-N3).
  const minuteKey = `${left.days}:${left.hours}:${left.minutes}`;
  if (minuteKey !== lastAnnounced) {
    lastAnnounced = minuteKey;
    setText(srStatus, srSentence(left));
  }
}

/** `celebrate` is true only when zero is reached while the page is open. */
function showLaunched(celebrate) {
  launched = true;
  countdownEl.hidden = true;
  launchedEl.hidden = false;
  setText(heroTitle, heroTitle.dataset.launchedText);
  setText(srStatus, 'GTA VI er ude nu.');
  if (!celebrate) return;
  if (soundOn) playChime();
  if (reducedMotion.matches) return;
  document.body.dataset.celebrating = 'true';
  burstConfetti();
}

function burstConfetti() {
  const box = document.querySelector('.confetti');
  const colors = ['#FF3D8B', '#FFB547', '#F4ECFF', '#CDB8EA'];
  const fragment = document.createDocumentFragment();
  for (let i = 0; i < 48; i++) {
    const piece = document.createElement('span');
    piece.style.setProperty('--x', `${Math.random() * 100}%`);
    piece.style.setProperty('--delay', `${Math.random() * 0.6}s`);
    piece.style.setProperty('--spin', `${Math.random() * 720 - 360}deg`);
    piece.style.background = colors[i % colors.length];
    fragment.append(piece);
  }
  box.append(fragment);
}

// --- Sound and soundtrack (FR-20) -------------------------------------------
// Always off on load and never remembered: YouTube is contacted only after a click.

const soundToggle = document.getElementById('sound-toggle');
const soundtrackEl = document.getElementById('soundtrack');
const soundtrackPlayer = soundtrackEl.querySelector('.soundtrack__player');
let soundOn = false;

function renderSound() {
  soundToggle.setAttribute('aria-pressed', String(soundOn));
  setText(soundToggle.querySelector('.toggle__state'), soundOn ? 'til' : 'fra');
  soundtrackEl.hidden = !soundOn;
  if (soundOn && !soundtrackPlayer.firstChild) {
    // Official embed player, visible as YouTube requires; the audio is never rehosted.
    const iframe = document.createElement('iframe');
    iframe.src = `https://www.youtube-nocookie.com/embed/${config.soundtrack.youtubeId}?autoplay=1&rel=0`;
    iframe.title = `Soundtrack: ${config.soundtrack.title}`;
    iframe.allow = 'autoplay; encrypted-media';
    soundtrackPlayer.append(iframe);
  } else if (!soundOn) {
    soundtrackPlayer.replaceChildren();
  }
}

function playChime() {
  try {
    const ctx = new AudioContext();
    [523.25, 659.25, 783.99, 1046.5].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const start = ctx.currentTime + i * 0.12;
      osc.type = 'triangle';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(0.2, start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.6);
      osc.connect(gain).connect(ctx.destination);
      osc.start(start);
      osc.stop(start + 0.65);
    });
  } catch { /* no audio support */ }
}

soundToggle.addEventListener('click', () => {
  soundOn = !soundOn;
  renderSound();
});

// --- Long wait (FR-17) ------------------------------------------------------

const longwaitDays = document.getElementById('longwait-days');
const longwaitClock = document.getElementById('longwait-clock');

function renderLongWait(t) {
  const since = timeSince(gtaV, t);
  setText(longwaitDays, numberFormat.format(since.days));
  setText(longwaitClock, `${pad2(since.hours)}:${pad2(since.minutes)}:${pad2(since.seconds)}`);
}

// --- Video phases (FR-11) ---------------------------------------------------

const videoCards = [...document.querySelectorAll('.video-card')];

function renderPhases(t) {
  for (const card of videoCards) card.hidden = !isPhaseLive(card.dataset.phase, config, t);
}

// --- Spoiler shield (FR-15) -------------------------------------------------

const spoilerToggle = document.getElementById('spoiler-toggle');
let shieldOn = storage.get('spoilerShield') !== 'off';

function renderShield() {
  spoilerToggle.setAttribute('aria-pressed', String(shieldOn));
  setText(spoilerToggle.querySelector('.toggle__state'), shieldOn ? 'til' : 'fra');
  for (const item of document.querySelectorAll('.item[data-spoiler]')) {
    const shielded = isShielded(item.dataset.spoiler, shieldOn) && !item.classList.contains('is-revealed');
    item.classList.toggle('is-shielded', shielded);
    item.querySelector('.shield-content').inert = shielded;
    const play = item.querySelector('.video-card__play');
    if (play) play.disabled = shielded;
  }
}

spoilerToggle.addEventListener('click', () => {
  shieldOn = !shieldOn;
  storage.set('spoilerShield', shieldOn ? 'on' : 'off');
  renderShield();
});

document.addEventListener('click', (event) => {
  const reveal = event.target.closest('.shield__reveal');
  if (reveal) {
    const item = reveal.closest('.item');
    item.classList.add('is-revealed');
    renderShield();
    item.querySelector('.shield-content a, .shield-content button')?.focus();
    return;
  }

  // Click-to-load facade (FR-12): nothing is requested from YouTube before this.
  const play = event.target.closest('.video-card__play');
  if (play && !play.disabled) {
    const card = play.closest('.video-card');
    const iframe = document.createElement('iframe');
    iframe.src = `https://www.youtube-nocookie.com/embed/${card.dataset.youtubeId}?autoplay=1&rel=0`;
    iframe.title = play.getAttribute('aria-label').replace(/^Afspil: /, '');
    iframe.allow = 'autoplay; encrypted-media; picture-in-picture; fullscreen';
    iframe.allowFullscreen = true;
    play.replaceWith(iframe);
    iframe.focus();
  }
});

// --- Clock ------------------------------------------------------------------

let timer;

function tick() {
  const t = now();
  renderCountdown(t);
  renderLongWait(t);
  renderPhases(t);
  clearTimeout(timer);
  // Wake just after the next whole second, so we never drift in background tabs.
  timer = setTimeout(tick, 1000 - (t % 1000) + 20);
}

renderSound();
renderShield();
tick();
document.addEventListener('visibilitychange', () => { if (!document.hidden) tick(); });

// FR-04: correct a wrong device clock once, using our own server's Date header.
measureOffset(window.fetch.bind(window), window.location.href).then((value) => {
  if (value !== 0) {
    offset = value;
    tick();
  }
});
