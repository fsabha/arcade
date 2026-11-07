import './style.css';
import { installAnalytics, trackEvent } from '@arcade/shared';
import { World, MAX_SHIELD, MAX_CHARGES } from './world';
import { Renderer } from './gl';
import { Sound } from './audio';

type State = 'title' | 'play' | 'pause' | 'over' | 'ranking';

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
const canvas = $<HTMLCanvasElement>('gl');
const ui = {
  hud: $('hud'), score: $('score'), dist: $('dist'), shield: $('shield'), combo: $('combo'), charges: $('charges'), hint: $('hint'),
  title: $('title'), pause: $('pause'), over: $('over'), ranking: $('ranking'), fail: $('fail'),
  fScore: $('f-score'), fDist: $('f-dist'), fCombo: $('f-combo'), fBest: $('f-best'), best: $('best'),
  form: $<HTMLFormElement>('initials-form'), initials: $<HTMLInputElement>('initials'), sent: $('sent'), rankList: $('rank-list'),
  snd: $<HTMLButtonElement>('snd-btn'), mus: $<HTMLButtonElement>('mus-btn'), install: $<HTMLButtonElement>('install-btn'), iosHint: $('ios-hint'),
};

installAnalytics();

// ---------- settings ----------

const store = {
  get(k: string, d: string): string { try { return localStorage.getItem(`cometa.${k}`) ?? d; } catch { return d; } },
  set(k: string, v: string): void { try { localStorage.setItem(`cometa.${k}`, v); } catch { /* private mode */ } },
};
let soundOn = store.get('sound', '1') === '1';
let musicOn = store.get('music', '1') === '1';
let best = Number(store.get('best', '0')) || 0;

const sound = new Sound();
sound.setMuted(!soundOn);
sound.setMusic(musicOn);

function vibrate(ms: number | number[]): void {
  try { navigator.vibrate?.(ms); } catch { /* not allowed */ }
}

// ---------- renderer and sizing ----------

let renderer: Renderer;
try {
  renderer = new Renderer(canvas);
} catch {
  ui.title.hidden = true;
  ui.fail.hidden = false;
  throw new Error('no webgl');
}

const DPR = Math.min(3, window.devicePixelRatio || 1);
const QUALITY = [1, 0.8, 0.66, 0.5];
let quality = 0;

function resize(): void {
  const vv = window.visualViewport;
  const w = Math.round(vv?.width ?? window.innerWidth), h = Math.round(vv?.height ?? window.innerHeight);
  renderer.resize(w, h, Math.max(1, DPR * QUALITY[quality]));
  world.resize(renderer.fieldH);
}
window.addEventListener('resize', resize);
window.visualViewport?.addEventListener('resize', resize);
window.addEventListener('orientationchange', () => setTimeout(resize, 200));

// ---------- state ----------

let world = new World(2, 1);
let state: State = 'title';
let demoT = 0;
resize();
newDemo();

function newDemo(): void {
  world = new World(renderer.fieldH, 7);
  renderer.reset();
}

function show(s: State): void {
  state = s;
  ui.title.hidden = s !== 'title';
  ui.pause.hidden = s !== 'pause';
  ui.over.hidden = s !== 'over';
  ui.ranking.hidden = s !== 'ranking';
  ui.hud.hidden = s !== 'play' && s !== 'pause';
  if (s === 'title') ui.best.textContent = best ? `Recorde neste aparelho: ${best}` : '';
}

function start(): void {
  sound.unlock();
  goFullscreen();
  world = new World(renderer.fieldH, (Math.random() * 2 ** 31) | 0);
  renderer.reset();
  buildHud();
  ui.hint.classList.remove('gone');
  setTimeout(() => ui.hint.classList.add('gone'), 6000);
  show('play');
  sound.startMusic();
  trackEvent('play', { game: 'cometa' });
}

function pause(): void {
  if (state !== 'play') return;
  show('pause');
  sound.stopMusic();
}

function resume(): void {
  show('play');
  sound.startMusic();
  last = performance.now();
}

function toMenu(): void {
  sound.stopMusic();
  newDemo();
  show('title');
}

function gameOver(): void {
  sound.stopMusic();
  sound.gameOver();
  vibrate([60, 40, 120]);
  const isBest = world.score > best;
  if (isBest) { best = world.score; store.set('best', String(best)); }
  ui.fScore.textContent = String(world.score);
  ui.fDist.textContent = `${world.distance} KM`;
  ui.fCombo.textContent = `combo ${world.bestCombo}`;
  ui.fBest.textContent = isBest ? 'novo recorde neste aparelho!' : `recorde: ${best}`;
  ui.form.hidden = world.score <= 0;
  ui.sent.textContent = '';
  ui.initials.value = store.get('initials', '');
  submitted = false;
  setTimeout(() => show('over'), 900);
}

// ---------- HUD ----------

function buildHud(): void {
  ui.shield.innerHTML = '<i></i>'.repeat(MAX_SHIELD);
  ui.charges.innerHTML = '<i><b></b></i>'.repeat(MAX_CHARGES);
}

let shownScore = -1, shownShield = -1, shownCombo = -1;
function updateHud(): void {
  if (world.score !== shownScore) { ui.score.textContent = String(world.score); shownScore = world.score; }
  ui.dist.textContent = `${world.distance} KM`;
  if (world.shield !== shownShield) {
    shownShield = world.shield;
    [...ui.shield.children].forEach((el, i) => el.classList.toggle('off', i >= world.shield));
  }
  [...ui.charges.querySelectorAll('b')].forEach((b, i) => { (b as HTMLElement).style.transform = `scaleX(${Math.max(0, Math.min(1, world.charges - i))})`; });
  const c = world.combo;
  if (c !== shownCombo) {
    shownCombo = c;
    ui.combo.textContent = c >= 3 ? `${c} em sequência  ×${world.mult}` : '';
    ui.combo.classList.toggle('on', c >= 3);
  }
}

function pop(x: number, y: number, text: string, color: string, big = false): void {
  const [cx, cy] = renderer.toCss(world, x, y);
  const el = document.createElement('div');
  el.className = big ? 'pop big' : 'pop';
  el.textContent = text;
  el.style.left = `${cx}px`;
  el.style.top = `${cy}px`;
  el.style.color = color;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 950);
}

// ---------- input: relative drag anywhere, tap to dash ----------

let active: number | null = null;
let lastX = 0, lastY = 0, downX = 0, downY = 0, downT = 0;

canvas.addEventListener('pointerdown', (e) => {
  sound.unlock();
  if (state !== 'play') return;
  if (active !== null) { // a second finger: dash
    if (world.tap()) vibrate(15);
    return;
  }
  active = e.pointerId;
  lastX = downX = e.clientX; lastY = downY = e.clientY; downT = performance.now();
  canvas.setPointerCapture(e.pointerId);
});
canvas.addEventListener('pointermove', (e) => {
  if (e.pointerId !== active || state !== 'play') return;
  const k = renderer.pixelRatio / renderer.pw; // CSS px -> playfield units
  world.steer((e.clientX - lastX) * k, (e.clientY - lastY) * k);
  lastX = e.clientX; lastY = e.clientY;
});
const up = (e: PointerEvent) => {
  if (e.pointerId !== active) return;
  active = null;
  const moved = Math.hypot(e.clientX - downX, e.clientY - downY);
  if (state === 'play' && performance.now() - downT < 220 && moved < 12) { if (world.tap()) vibrate(15); }
};
canvas.addEventListener('pointerup', up);
canvas.addEventListener('pointercancel', (e) => { if (e.pointerId === active) active = null; });
document.addEventListener('contextmenu', (e) => e.preventDefault());
document.addEventListener('gesturestart', (e) => e.preventDefault());

// keyboard, for desktops
const keys = new Set<string>();
window.addEventListener('keydown', (e) => {
  sound.unlock();
  if (e.target instanceof HTMLInputElement) return;
  keys.add(e.code);
  if (state === 'play') {
    if (e.code === 'Space') { world.tap(); e.preventDefault(); }
    if (e.code === 'Escape' || e.code === 'KeyP') pause();
  } else if (state === 'pause' && (e.code === 'Escape' || e.code === 'KeyP')) resume();
  else if (state === 'title' && (e.code === 'Enter' || e.code === 'Space')) start();
});
window.addEventListener('keyup', (e) => keys.delete(e.code));

// ---------- buttons ----------

const click = (el: HTMLElement, fn: () => void) => el.addEventListener('click', () => { sound.unlock(); sound.blip(); fn(); });
click($('play'), start);
click($('again'), start);
click($('pause-btn'), pause);
click($('resume'), resume);
click($('quit'), toMenu);
click($('over-menu'), toMenu);
let rankFrom: State = 'title';
const openRanking = () => { rankFrom = state; show('ranking'); loadRanking(); };
click($('rank-btn'), openRanking);
click($('over-rank'), openRanking);
click($('rank-back'), () => show(rankFrom));
const label = (b: HTMLButtonElement, name: string, on: boolean) => { b.textContent = `${name}: ${on ? 'SIM' : 'NÃO'}`; };
label(ui.snd, 'SOM', soundOn);
label(ui.mus, 'MÚSICA', musicOn);
click(ui.snd, () => { soundOn = !soundOn; store.set('sound', soundOn ? '1' : '0'); sound.setMuted(!soundOn); label(ui.snd, 'SOM', soundOn); });
click(ui.mus, () => { musicOn = !musicOn; store.set('music', musicOn ? '1' : '0'); sound.setMusic(musicOn); label(ui.mus, 'MÚSICA', musicOn); });

// ---------- ranking ----------

let submitted = false;
ui.initials.addEventListener('input', () => { ui.initials.value = ui.initials.value.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 3); });
ui.form.addEventListener('submit', (e) => {
  e.preventDefault();
  const ini = ui.initials.value.trim();
  if (submitted || !ini) return;
  submitted = true;
  ui.initials.blur();
  store.set('initials', ini);
  ui.sent.textContent = 'enviando...';
  fetch('/api/scores', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ game: 'cometa', initials: ini, score: world.score, label: `${world.distance} KM` }),
  })
    .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
    .then((d: { rank?: number }) => { ui.sent.textContent = typeof d.rank === 'number' && d.rank > 0 ? `você está em ${d.rank}º no ranking global!` : 'enviado!'; })
    .catch(() => { ui.sent.textContent = 'ranking indisponível agora'; submitted = false; });
});

function loadRanking(): void {
  ui.rankList.innerHTML = '<li class="empty">carregando...</li>';
  fetch('/api/scores?game=cometa')
    .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
    .then((d: { entries?: { initials: string; score: number; label: string }[] }) => {
      const list = Array.isArray(d.entries) ? d.entries : [];
      ui.rankList.replaceChildren();
      if (!list.length) { ui.rankList.innerHTML = '<li class="empty">seja o primeiro!</li>'; return; }
      list.slice(0, 10).forEach((en, i) => {
        const li = document.createElement('li');
        const cell = (cls: string, t: string) => { const s = document.createElement('span'); s.className = cls; s.textContent = t; li.append(s); };
        cell('p', `${i + 1}`); cell('i', String(en.initials).slice(0, 3)); cell('s', String(Number(en.score) || 0)); cell('l', String(en.label ?? '').slice(0, 12));
        ui.rankList.append(li);
      });
    })
    .catch(() => { ui.rankList.innerHTML = '<li class="empty">ranking indisponível</li>'; });
}

// ---------- full screen and install ----------

const standalone = window.matchMedia('(display-mode: standalone)').matches || window.matchMedia('(display-mode: fullscreen)').matches || (navigator as unknown as { standalone?: boolean }).standalone === true;
const coarse = window.matchMedia('(pointer: coarse)').matches;

function goFullscreen(): void {
  if (standalone || !coarse || document.fullscreenElement) return;
  const el = document.documentElement as HTMLElement & { requestFullscreen?: (o?: FullscreenOptions) => Promise<void> };
  el.requestFullscreen?.({ navigationUI: 'hide' })
    .then(() => (screen.orientation as unknown as { lock?: (o: string) => Promise<void> })?.lock?.('portrait'))
    .catch(() => undefined);
}

let installEvt: (Event & { prompt: () => Promise<void> }) | null = null;
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  installEvt = e as Event & { prompt: () => Promise<void> };
  ui.install.hidden = false;
});
click(ui.install, () => { installEvt?.prompt().catch(() => undefined); ui.install.hidden = true; });
if (!standalone && /iPhone|iPad|iPod/.test(navigator.userAgent)) ui.iosHint.hidden = false;

if ('serviceWorker' in navigator && !import.meta.env.DEV) navigator.serviceWorker.register('/sw.js').catch(() => undefined);

document.addEventListener('visibilitychange', () => { if (document.hidden) pause(); });

// ---------- loop ----------

let last = performance.now();
let slow = 0, fast = 0;

function handleEvents(): void {
  for (const ev of world.events) {
    switch (ev.kind) {
      case 'orb':
        renderer.burst(ev.x, ev.y, 10, [1, 0.85, 0.45], 0.35, 0.012, 0.5);
        sound.orb(world.combo);
        if (world.combo > 0 && world.combo % 6 === 0) pop(ev.x, ev.y + 0.05, `×${world.mult}`, '#ffd27a', true);
        break;
      case 'gate':
        renderer.burst(ev.x, ev.y, 30, [0.4, 1, 0.7], 0.6, 0.014);
        renderer.ring(ev.x, ev.y, [0.5, 1, 0.8], 0.2);
        sound.gate(); vibrate(10);
        pop(ev.x, ev.y + 0.06, `PORTAL +${ev.value}`, '#7dffb4');
        break;
      case 'sling':
        renderer.ring(ev.x, ev.y, [1, 0.7, 0.3], 0.25);
        sound.sling(); vibrate([10, 30, 10]);
        pop(ev.x, ev.y + 0.07, `ESTILINGUE +${ev.value}`, '#ffb070', true);
        break;
      case 'break':
        renderer.burst(ev.x, ev.y, 34, [1, 0.7, 0.4], 0.7, 0.016);
        renderer.hitFlash([1, 0.6, 0.3], 0.12, 0.4);
        sound.smash(); vibrate(20);
        pop(ev.x, ev.y + 0.05, `+${ev.value}`, '#ffcf8a');
        break;
      case 'dash':
        renderer.ring(ev.x, ev.y, [1, 0.75, 0.35], 0.12);
        sound.dash();
        break;
      case 'hit':
        renderer.burst(ev.x, ev.y, 40, [0.6, 0.8, 1], 0.8, 0.014);
        renderer.hitFlash([0.9, 0.2, 0.35], 0.45, 1);
        sound.hit(); vibrate(70);
        break;
      case 'level':
        renderer.ring(ev.x, ev.y, [0.7, 0.8, 1], 0.5);
        sound.level();
        pop(0.5, world.camY + world.H * 0.62, `SETOR ${ev.value + 1}`, '#cfe0ff', true);
        break;
      case 'over':
        renderer.burst(ev.x, ev.y, 120, [0.7, 0.85, 1], 1.1, 0.02, 1.2);
        renderer.hitFlash([1, 1, 1], 0.6, 1.2);
        gameOver();
        break;
    }
  }
  world.events.length = 0;
}

function frame(now: number): void {
  const raw = (now - last) / 1000;
  const dt = Math.min(0.05, raw);
  last = now;
  // adaptive resolution: drop when frames run long, climb back when there is headroom
  if (raw < 0.25) {
    if (raw > 1 / 45) { slow += raw; fast = 0; } else if (raw < 1 / 70) { fast += raw; slow = Math.max(0, slow - raw); }
    if (slow > 1.5 && quality < QUALITY.length - 1) { quality++; slow = 0; resize(); }
    if (fast > 6 && quality > 0) { quality--; fast = 0; resize(); }
  }

  if (state === 'play') {
    if (keys.has('ArrowLeft') || keys.has('KeyA')) world.steer(-dt * 0.9, 0);
    if (keys.has('ArrowRight') || keys.has('KeyD')) world.steer(dt * 0.9, 0);
    if (keys.has('ArrowUp') || keys.has('KeyW')) world.steer(0, -dt * 0.9);
    if (keys.has('ArrowDown') || keys.has('KeyS')) world.steer(0, dt * 0.9);
    world.update(dt);
    sound.intensity = Math.max(0, Math.min(1, (world.speed - 0.55) / 1.1));
    handleEvents();
    updateHud();
  } else if (state === 'title' || state === 'ranking') {
    // attract mode: the comet drifts through a calm course on its own
    demoT += dt;
    world.inv = 10;
    const target = world.orbs.find((o) => !o.taken && o.y > world.comet.y + 0.1);
    const tx = target ? target.x : 0.5 + Math.sin(demoT * 0.7) * 0.3;
    world.steer((tx - world.comet.tx) * dt * 3, 0);
    world.update(dt);
    world.events.length = 0;
    world.score = 0;
  } else if (state === 'over') {
    world.update(0);
  }
  renderer.draw(world, now / 1000, state === 'pause' ? 0 : dt, state === 'play' || state === 'title' || state === 'ranking');
  requestAnimationFrame(frame);
}

show('title');
requestAnimationFrame(frame);

// dev hook (same convention as the other games)
if (import.meta.env.DEV) (window as unknown as Record<string, unknown>).__cometa = { get world() { return world; }, renderer, start, sound };
