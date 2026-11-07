import './style.css';
import { installAnalytics, trackEvent } from '@arcade/shared';
import { World, MEMORIES } from './world';
import { Renderer } from './gl';
import { Sound } from './audio';

type State = 'title' | 'play' | 'pause' | 'over' | 'ranking' | 'memories';

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
const canvas = $<HTMLCanvasElement>('gl');
const ui = {
  hud: $('hud'), score: $('score'), depth: $('depth'), tail: $('tail'), memory: $('memory'), banner: $('banner'), lightFill: $('light-fill'), hint: $('hint'),
  title: $('title'), pause: $('pause'), over: $('over'), ranking: $('ranking'), memories: $('memories'), fail: $('fail'), memList: $('mem-list'),
  fScore: $('f-score'), fDepth: $('f-depth'), fTail: $('f-tail'), fBanked: $('f-banked'), fBest: $('f-best'), best: $('best'),
  form: $<HTMLFormElement>('initials-form'), initials: $<HTMLInputElement>('initials'), sent: $('sent'), rankList: $('rank-list'),
  snd: $<HTMLButtonElement>('snd-btn'), mus: $<HTMLButtonElement>('mus-btn'), install: $<HTMLButtonElement>('install-btn'), iosHint: $('ios-hint'),
};
const lightbar = ui.lightFill.parentElement!.parentElement!;

installAnalytics();

const store = {
  get(k: string, d: string): string { try { return localStorage.getItem(`lume.${k}`) ?? d; } catch { return d; } },
  set(k: string, v: string): void { try { localStorage.setItem(`lume.${k}`, v); } catch { /* private mode */ } },
};
let soundOn = store.get('sound', '1') === '1';
let musicOn = store.get('music', '1') === '1';
let best = Number(store.get('best', '0')) || 0;
/** how many memories this device has unlocked (the codex) */
let unlocked = Number(store.get('memories', '0')) || 0;

const sound = new Sound();
sound.setMuted(!soundOn);
sound.setMusic(musicOn);

function vibrate(ms: number | number[]): void {
  try { navigator.vibrate?.(ms); } catch { /* not allowed */ }
}

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

let world = new World(2, 1);
let state: State = 'title';
let demoT = 0;
resize();
newDemo();

function newDemo(): void {
  world = new World(renderer.fieldH, 5);
  renderer.reset();
}

function show(s: State): void {
  state = s;
  ui.title.hidden = s !== 'title';
  ui.pause.hidden = s !== 'pause';
  ui.over.hidden = s !== 'over';
  ui.ranking.hidden = s !== 'ranking';
  ui.memories.hidden = s !== 'memories';
  ui.hud.hidden = s !== 'play' && s !== 'pause';
  if (s === 'title') ui.best.textContent = best ? `Recorde neste aparelho: ${best}` : '';
}

function start(): void {
  sound.unlock();
  goFullscreen();
  world = new World(renderer.fieldH, (Math.random() * 2 ** 31) | 0);
  renderer.reset();
  ui.hint.classList.remove('gone');
  setTimeout(() => ui.hint.classList.add('gone'), 7000);
  show('play');
  sound.startMusic();
  banner('SUPERFÍCIE PARTIDA', 'SETOR 1');
  trackEvent('play', { game: 'lume' });
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
  vibrate([80, 60, 160]);
  const isBest = world.score > best;
  if (isBest) { best = world.score; store.set('best', String(best)); }
  ui.fScore.textContent = String(world.score);
  ui.fDepth.textContent = `${world.depth} M`;
  ui.fTail.textContent = `maior cauda ${world.bestTail}`;
  ui.fBanked.textContent = `${world.banked} luzes salvas`;
  ui.fBest.textContent = isBest ? 'novo recorde neste aparelho!' : `recorde: ${best}`;
  ui.form.hidden = world.score <= 0;
  ui.sent.textContent = '';
  ui.initials.value = store.get('initials', '');
  submitted = false;
  // the lights drift away before the screen comes up
  setTimeout(() => { if (state === 'play') show('over'); }, 2200);
}

// ---------- HUD ----------

let shownScore = -1, shownTail = -1;
function updateHud(): void {
  if (world.score !== shownScore) { ui.score.textContent = String(world.score); shownScore = world.score; }
  ui.depth.textContent = `${world.depth} M`;
  if (world.tail.length !== shownTail) { shownTail = world.tail.length; ui.tail.textContent = `✦ ${shownTail}`; }
  ui.lightFill.style.transform = `scaleX(${Math.max(0, world.energy)})`;
  lightbar.classList.toggle('low', world.energy < 0.25);
}

let memTimer: ReturnType<typeof setTimeout> | null = null;
function showMemory(text: string): void {
  ui.memory.textContent = `“${text}”`;
  ui.memory.classList.add('show');
  if (memTimer) clearTimeout(memTimer);
  memTimer = setTimeout(() => ui.memory.classList.remove('show'), 3200);
}

let bannerTimer: ReturnType<typeof setTimeout> | null = null;
function banner(main: string, sub: string): void {
  ui.banner.innerHTML = '';
  const a = document.createElement('div'); a.className = 'b-sub'; a.textContent = sub;
  const b = document.createElement('div'); b.className = 'b-main'; b.textContent = main;
  ui.banner.append(a, b);
  ui.banner.className = 'banner show';
  if (bannerTimer) clearTimeout(bannerTimer);
  bannerTimer = setTimeout(() => { ui.banner.className = 'banner'; }, 2400);
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

let warpT = 0, warpScale = 1;
function warp(scale: number, seconds: number): void {
  if (warpT > 0 && warpScale < scale) return;
  warpScale = scale; warpT = seconds;
}

// ---------- input ----------

let active: number | null = null;
let lastX = 0, lastY = 0, downX = 0, downY = 0, downT = 0;

canvas.addEventListener('pointerdown', (e) => {
  sound.unlock();
  if (state !== 'play') return;
  if (active !== null) { if (world.pulse()) vibrate(25); return; }
  active = e.pointerId;
  lastX = downX = e.clientX; lastY = downY = e.clientY; downT = performance.now();
  canvas.setPointerCapture(e.pointerId);
});
canvas.addEventListener('pointermove', (e) => {
  if (e.pointerId !== active || state !== 'play') return;
  const k = renderer.pixelRatio / renderer.pw;
  world.steer((e.clientX - lastX) * k, (e.clientY - lastY) * k);
  lastX = e.clientX; lastY = e.clientY;
});
canvas.addEventListener('pointerup', (e) => {
  if (e.pointerId !== active) return;
  active = null;
  if (state === 'play' && performance.now() - downT < 220 && Math.hypot(e.clientX - downX, e.clientY - downY) < 12) { if (world.pulse()) vibrate(25); }
});
canvas.addEventListener('pointercancel', (e) => { if (e.pointerId === active) active = null; });
document.addEventListener('contextmenu', (e) => e.preventDefault());
document.addEventListener('gesturestart', (e) => e.preventDefault());

const keys = new Set<string>();
window.addEventListener('keydown', (e) => {
  sound.unlock();
  if (e.target instanceof HTMLInputElement) return;
  keys.add(e.code);
  if (state === 'play') {
    if (e.code === 'Space') { world.pulse(); e.preventDefault(); }
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
let backTo: State = 'title';
const openRanking = () => { backTo = state; show('ranking'); loadRanking(); };
click($('rank-btn'), openRanking);
click($('over-rank'), openRanking);
click($('rank-back'), () => show(backTo));
click($('mem-btn'), () => { renderMemories(); show('memories'); });
click($('mem-back'), () => show('title'));
const label = (b: HTMLButtonElement, name: string, on: boolean) => { b.textContent = `${name}: ${on ? 'SIM' : 'NÃO'}`; };
label(ui.snd, 'SOM', soundOn);
label(ui.mus, 'MÚSICA', musicOn);
click(ui.snd, () => { soundOn = !soundOn; store.set('sound', soundOn ? '1' : '0'); sound.setMuted(!soundOn); label(ui.snd, 'SOM', soundOn); });
click(ui.mus, () => { musicOn = !musicOn; store.set('music', musicOn ? '1' : '0'); sound.setMusic(musicOn); label(ui.mus, 'MÚSICA', musicOn); });

function renderMemories(): void {
  ui.memList.replaceChildren();
  MEMORIES.forEach((m, i) => {
    const li = document.createElement('li');
    if (i < unlocked) li.textContent = m;
    else { li.textContent = '…'; li.className = 'locked'; }
    ui.memList.append(li);
  });
}

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
    body: JSON.stringify({ game: 'lume', initials: ini, score: world.score, label: `${world.depth} M · ${world.banked} LUZES` }),
  })
    .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
    .then((d: { rank?: number }) => { ui.sent.textContent = typeof d.rank === 'number' && d.rank > 0 ? `você está em ${d.rank}º no ranking global!` : 'enviado!'; })
    .catch(() => { ui.sent.textContent = 'ranking indisponível agora'; submitted = false; });
});

function loadRanking(): void {
  ui.rankList.innerHTML = '<li class="empty">carregando...</li>';
  fetch('/api/scores?game=lume')
    .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
    .then((d: { entries?: { initials: string; score: number; label: string }[] }) => {
      const list = Array.isArray(d.entries) ? d.entries : [];
      ui.rankList.replaceChildren();
      if (!list.length) { ui.rankList.innerHTML = '<li class="empty">seja o primeiro!</li>'; return; }
      list.slice(0, 10).forEach((en, i) => {
        const li = document.createElement('li');
        const cell = (cls: string, t: string) => { const sp = document.createElement('span'); sp.className = cls; sp.textContent = t; li.append(sp); };
        cell('p', `${i + 1}`); cell('i', String(en.initials).slice(0, 3)); cell('s', String(Number(en.score) || 0)); cell('l', String(en.label ?? '').slice(0, 16));
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
      case 'light':
        renderer.burst(ev.x, ev.y, 8, [1, 0.75, 0.35], 0.25, 0.01, 0.5);
        sound.pick(ev.value); vibrate(6);
        if (ev.value === 10 || ev.value === 20 || ev.value === 30) pop(world.lume.x, world.lume.y - 0.07, `✦ ${ev.value}`, '#ffcf7a', true);
        break;
      case 'regain':
        renderer.ring(ev.x, ev.y, [1, 0.8, 0.4], 0.06);
        sound.regain(); vibrate(8);
        break;
      case 'cut':
        renderer.burst(ev.x, ev.y, 18, [1, 0.6, 0.3], 0.45, 0.012);
        renderer.hitFlash([0.6, 0.3, 0.1], 0.18, 0.5);
        sound.cut(); vibrate([20, 30, 20]);
        warp(0.3, 0.3);
        pop(ev.x, ev.y - 0.05, `−${ev.value} ✦`, '#ff9a6a');
        break;
      case 'hurt':
        renderer.burst(ev.x, ev.y, 30, [1, 0.5, 0.4], 0.6, 0.012);
        renderer.hitFlash([0.8, 0.1, 0.2], 0.4, 1);
        sound.hurt(); vibrate(70);
        warp(0.06, 0.12);
        break;
      case 'pulse':
        renderer.ring(ev.x, ev.y, [1, 0.8, 0.45], 0.32, 0.6);
        renderer.ring(ev.x, ev.y, [0.5, 1, 0.95], 0.22, 0.45);
        renderer.hitFlash([1, 0.75, 0.4], 0.2, 0.3);
        sound.pulse();
        break;
      case 'stun':
        renderer.burst(ev.x, ev.y, 6, [0.6, 1, 0.95], 0.2, 0.008, 0.4);
        break;
      case 'shatter':
        renderer.burst(ev.x, ev.y, 22, [0.65, 0.7, 0.72], 0.5, 0.012);
        pop(ev.x, ev.y - 0.04, `+${ev.value}`, '#d6e4e8');
        break;
      case 'bank':
        renderer.burst(ev.x, ev.y, 60, [1, 0.8, 0.4], 0.8, 0.016, 1);
        renderer.ring(ev.x, ev.y, [1, 0.8, 0.45], 0.45, 0.9);
        renderer.hitFlash([1, 0.75, 0.35], 0.3, 0.2);
        sound.bank(); vibrate([15, 40, 15, 40, 30]);
        pop(ev.x, ev.y - 0.08, `LANTERNA +${ev.value}`, '#ffd894', true);
        if (ev.text) showMemory(ev.text);
        if (world.memory > unlocked) { unlocked = world.memory; store.set('memories', String(Math.min(unlocked, MEMORIES.length))); }
        break;
      case 'sector':
        sound.sector(); vibrate(30);
        banner(ev.text ?? '', `SETOR ${ev.value + 1} · ${world.depth} M`);
        break;
      case 'low':
        sound.low();
        break;
      case 'over':
        renderer.burst(ev.x, ev.y, 50, [1, 0.7, 0.35], 0.4, 0.012, 2);
        warp(0.25, 1);
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
  if (raw < 0.25) {
    if (raw > 1 / 45) { slow += raw; fast = 0; } else if (raw < 1 / 70) { fast += raw; slow = Math.max(0, slow - raw); }
    if (slow > 1.5 && quality < QUALITY.length - 1) { quality++; slow = 0; resize(); }
    if (fast > 6 && quality > 0) { quality--; fast = 0; resize(); }
  }

  let sdt = dt;
  if (warpT > 0) { warpT -= dt; sdt = dt * warpScale; }
  if (state === 'play') {
    if (keys.has('ArrowLeft') || keys.has('KeyA')) world.steer(-dt * 0.9, 0);
    if (keys.has('ArrowRight') || keys.has('KeyD')) world.steer(dt * 0.9, 0);
    if (keys.has('ArrowUp') || keys.has('KeyW')) world.steer(0, -dt * 0.9);
    if (keys.has('ArrowDown') || keys.has('KeyS')) world.steer(0, dt * 0.9);
    world.update(sdt);
    sound.voices = world.tail.length;
    sound.light = world.energy;
    handleEvents();
    updateHud();
  } else if (state === 'title' || state === 'ranking' || state === 'memories') {
    // attract mode: the spark drifts down on its own, never going out
    demoT += dt;
    world.energy = Math.max(world.energy, 0.7);
    world.inv = 10;
    const target = world.lights.find((o) => o.y > world.lume.y + 0.08);
    const tx = target ? target.x : 0.5 + Math.sin(demoT * 0.6) * 0.3;
    world.steer((tx - world.lume.tx) * dt * 3, 0);
    world.update(dt);
    world.events.length = 0;
  } else if (state === 'over') {
    world.update(dt);
  }
  renderer.draw(world, now / 1000, state === 'pause' ? 0 : sdt, state !== 'pause');
  requestAnimationFrame(frame);
}

show('title');
requestAnimationFrame(frame);

if (import.meta.env.DEV) (window as unknown as Record<string, unknown>).__lume = { get world() { return world; }, renderer, start, sound };
