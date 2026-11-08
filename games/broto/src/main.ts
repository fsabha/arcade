import './style.css';
import { installAnalytics, trackEvent } from '@arcade/shared';
import { World, BASE_GIFTS, type Gifts, type Gate } from './world';
import { LEVELS, GIFTS, type GiftId } from './levels';
import { Renderer } from './gl';
import { Sound } from './audio';

type State = 'title' | 'count' | 'play' | 'pause' | 'between' | 'over' | 'ranking';

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
const canvas = $<HTMLCanvasElement>('gl');
const ui = {
  hud: $('hud'), score: $('score'), lv: $('lv'), petals: $('petals'), heartbar: $('heartbar'), heartFill: $('heart-fill'), horde: $('horde'),
  sproutbar: $('sproutbar'), sproutFill: $('sprout-fill'), banner: $('banner'), hint: $('hint'), count: $('count'), labels: $('labels'),
  title: $('title'), pause: $('pause'), over: $('over'), ranking: $('ranking'), between: $('between'), fail: $('fail'),
  betweenTitle: $('between-title'), betweenScore: $('between-score'), stagebar: $('stagebar'), gifts: $('gifts'),
  overTitle: $('over-title'), fScore: $('f-score'), fStage: $('f-stage'), fMade: $('f-made'), fBest: $('f-best'), best: $('best'),
  form: $<HTMLFormElement>('initials-form'), initials: $<HTMLInputElement>('initials'), sent: $('sent'), rankList: $('rank-list'),
  snd: $<HTMLButtonElement>('snd-btn'), mus: $<HTMLButtonElement>('mus-btn'), install: $<HTMLButtonElement>('install-btn'), iosHint: $('ios-hint'),
};

installAnalytics();

const store = {
  get(k: string, d: string): string { try { return localStorage.getItem(`broto.${k}`) ?? d; } catch { return d; } },
  set(k: string, v: string): void { try { localStorage.setItem(`broto.${k}`, v); } catch { /* private mode */ } },
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

/** The top safe-area inset in CSS pixels (notch / status bar). */
function safeTop(): number {
  const probe = document.createElement('div');
  probe.style.cssText = 'position:fixed;top:0;height:env(safe-area-inset-top,0px);visibility:hidden';
  document.body.appendChild(probe);
  const v = probe.getBoundingClientRect().height;
  probe.remove();
  return v;
}

function resize(): void {
  const vv = window.visualViewport;
  const w = Math.round(vv?.width ?? window.innerWidth), h = Math.round(vv?.height ?? window.innerHeight);
  renderer.resize(w, h, Math.max(1, DPR * QUALITY[quality]), safeTop());
  world.resize(renderer.fieldH);
}
window.addEventListener('resize', resize);
window.visualViewport?.addEventListener('resize', resize);
window.addEventListener('orientationchange', () => setTimeout(resize, 200));

// ---------- the run ----------

interface Run { level: number; petals: number; gifts: Gifts; score: number; made: number; taken: GiftId[] }
let run: Run = newRun();
let world = new World(2, LEVELS[0], 3, BASE_GIFTS, 1);
let state: State = 'title';
resize();
demo();

function newRun(): Run {
  return { level: 0, petals: 3, gifts: { ...BASE_GIFTS }, score: 0, made: 0, taken: [] };
}

/** Attract mode: the first stage plays itself behind the title. */
function demo(): void {
  world = new World(renderer.fieldH, LEVELS[1], 3, BASE_GIFTS, 3);
  world.sower.firing = true;
  renderer.reset();
}

function show(s: State): void {
  state = s;
  ui.title.hidden = s !== 'title';
  ui.pause.hidden = s !== 'pause';
  ui.over.hidden = s !== 'over';
  ui.ranking.hidden = s !== 'ranking';
  ui.between.hidden = s !== 'between';
  ui.hud.hidden = s !== 'play' && s !== 'pause' && s !== 'count';
  ui.labels.hidden = s === 'title' || s === 'ranking' || s === 'over' || s === 'between';
  if (s === 'title') ui.best.textContent = best ? `Recorde neste aparelho: ${best}` : '';
}

function start(): void {
  sound.unlock();
  goFullscreen();
  run = newRun();
  ui.hint.classList.remove('gone');
  setTimeout(() => ui.hint.classList.add('gone'), 8000);
  sound.startMusic();
  beginLevel(0);
  trackEvent('play', { game: 'broto' });
}

let countT = 0, countN = 0;
function beginLevel(k: number): void {
  run.level = k;
  const lv = LEVELS[k];
  world = new World(renderer.fieldH, lv, run.petals, run.gifts, (Math.random() * 2 ** 31) | 0);
  renderer.reset();
  sound.night = !!lv.dark;
  ui.lv.textContent = `FASE ${k + 1}/${LEVELS.length}`;
  buildLabels();
  shownPetals = -1;
  bigWindow = 0; bigT = 0;
  // 3, 2, 1, brota
  show('count');
  countT = 0; countN = 0;
  banner(lv.name, `FASE ${k + 1} DE ${LEVELS.length}`, 'green');
}

function count(dt: number): void {
  countT += dt;
  const n = Math.floor(countT / 0.75);
  if (n !== countN || countT === dt) {
    countN = n;
    if (n <= 3) {
      ui.count.textContent = n < 3 ? String(3 - n) : 'BROTA!';
      ui.count.classList.remove('go');
      void ui.count.offsetWidth;
      ui.count.classList.add('go');
      sound.countdown(n === 3);
      if (n === 3) vibrate(30);
    }
  }
  if (countT >= 3.2) { show('play'); last = performance.now(); }
}

function pause(): void {
  if (state !== 'play' && state !== 'count') return;
  world.sower.firing = false;
  show('pause');
  sound.stopMusic();
}

function resume(): void {
  show(countT >= 3.2 ? 'play' : 'count');
  sound.startMusic();
  last = performance.now();
}

function toMenu(): void {
  sound.stopMusic();
  demo();
  show('title');
}

function levelScore(): number {
  const lv = LEVELS[run.level];
  const time = Math.max(0, Math.round((lv.par - world.t) * 50));
  const clean = world.petals >= world.petalsAtStart ? 500 : 0;
  const mult = 1 + Math.min(1, Math.floor(world.wellHits / 50) * 0.1);
  return Math.round((world.score + time + clean) * mult);
}

function levelWon(): void {
  const gained = levelScore();
  run.score += gained;
  run.made += world.made;
  run.petals = world.petals;
  if (run.level >= LEVELS.length - 1) {
    run.score += run.petals * 1000;
    finish(true);
    return;
  }
  ui.betweenTitle.textContent = 'O CORAÇÃO FLORESCEU';
  ui.betweenScore.textContent = `+${gained} pontos · total ${run.score}`;
  ui.stagebar.replaceChildren(...LEVELS.map((_, i) => { const el = document.createElement('i'); el.className = i <= run.level ? 'done' : i === run.level + 1 ? 'now' : ''; return el; }));
  // one of three gifts
  const pool = (Object.keys(GIFTS) as GiftId[]).filter((g) => !(g === 'orvalho' && run.petals >= 3));
  for (let i = pool.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [pool[i], pool[j]] = [pool[j], pool[i]]; }
  ui.gifts.replaceChildren(...pool.slice(0, 3).map((id) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'gift';
    const n = document.createElement('b'); n.textContent = GIFTS[id].name;
    const t = document.createElement('span'); t.textContent = GIFTS[id].text;
    b.append(n, t);
    b.addEventListener('click', () => { sound.blip(); takeGift(id); beginLevel(run.level + 1); });
    return b;
  }));
  show('between');
}

function takeGift(id: GiftId): void {
  run.taken.push(id);
  const g = run.gifts;
  if (id === 'seiva') g.rate *= 1.15;
  else if (id === 'casca') g.bark = Math.min(0.5, g.bark + 0.1);
  else if (id === 'polen') g.pollen *= 2;
  else if (id === 'raiz') g.head += 30;
  else if (id === 'brotacao') g.sproutEvery = Math.max(12, Math.round(g.sproutEvery * 0.7));
  else if (id === 'orvalho') run.petals = Math.min(5, run.petals + 1);
}

function finish(won: boolean): void {
  sound.stopMusic();
  if (!won) { run.score += world.score; run.made += world.made; }
  const isBest = run.score > best;
  if (isBest) { best = run.score; store.set('best', String(best)); }
  ui.overTitle.textContent = won ? 'O JARDIM FLORESCEU' : 'A CINZA VENCEU';
  ui.fScore.textContent = String(run.score);
  ui.fStage.textContent = won ? 'todas as 10 fases' : `fase ${run.level + 1}`;
  ui.fMade.textContent = `${run.made} sementes nasceram dos portões`;
  ui.fBest.textContent = isBest ? 'novo recorde neste aparelho!' : `recorde: ${best}`;
  ui.form.hidden = run.score <= 0;
  ui.sent.textContent = '';
  ui.initials.value = store.get('initials', '');
  submitted = false;
  show('over');
}

// ---------- HUD ----------

let shownScore = -1, shownPetals = -1;
function placeHeartBar(): void {
  const [, y] = renderer.toCss(0.5, world.top + 0.035);
  heartBox.style.top = `${y}px`;
}
const heartBox = document.querySelector('.heart-box') as HTMLElement;

function updateHud(): void {
  placeHeartBar();
  const sc = run.score + world.score;
  if (sc !== shownScore) { ui.score.textContent = String(sc); shownScore = sc; }
  if (world.petals !== shownPetals) {
    shownPetals = world.petals;
    const total = Math.max(world.petalsAtStart, world.petals);
    ui.petals.replaceChildren(...Array.from({ length: total }, (_, i) => { const el = document.createElement('i'); if (i >= world.petals) el.className = 'off'; return el; }));
  }
  const open = world.open;
  ui.heartFill.style.transform = `scaleX(${world.heartHp / world.heartMax})`;
  ui.heartbar.classList.toggle('open', open);
  const left = world.hordeLeft + world.ash.n;
  ui.horde.textContent = world.done === 'win' ? 'FLORESCEU!' : open ? 'EXPOSTO! ATAQUE O CORAÇÃO' : `CINZA: ${left}`;
  ui.sproutFill.style.transform = `scaleX(${Math.min(1, world.charge / world.gifts.sproutEvery)})`;
  ui.sproutbar.classList.toggle('ready', world.sproutReady);
}

// gate labels: DOM text over the bars
const GATE_NAMES: Record<string, string> = { add: 'ORVALHO', sub: 'ESPINHO', div: 'GEADA', well: "OLHO-D'ÁGUA" };
function gateName(g: Gate): string {
  if (g.op === 'mul') return g.amp ? 'VENTO' : g.n >= 3 ? 'FLORADA' : 'RAIZ';
  return GATE_NAMES[g.op];
}
function gateText(g: Gate): string {
  if (g.uses !== undefined && g.used >= g.uses) return 'murchou';
  switch (g.op) {
    case 'add': return `+${Math.round(g.n * world.gifts.pollen)}`;
    case 'mul': case 'well': return `×${g.n}`;
    case 'sub': return `−${g.left}`;
    case 'div': return `÷${g.n}`;
  }
}
let labels: { el: HTMLDivElement; num: Text; text: string }[] = [];
function buildLabels(): void {
  ui.labels.replaceChildren();
  labels = world.gates.map((g) => {
    const el = document.createElement('div');
    el.className = g.op === 'sub' || g.op === 'div' ? 'glabel bad' : 'glabel';
    const num = document.createTextNode('');
    const small = document.createElement('small');
    small.textContent = gateName(g);
    el.append(num, small);
    ui.labels.append(el);
    return { el, num, text: '' };
  });
}
function updateLabels(): void {
  world.gates.forEach((g, i) => {
    const L = labels[i];
    if (!L) return;
    const [x, y] = renderer.toCss(g.cx, world.laneY(g.y));
    L.el.style.transform = `translate(${x}px, ${y}px) translate(-50%, -50%)`;
    L.el.style.visibility = g.hidden > 0 ? 'hidden' : 'visible';
    const t = gateText(g);
    if (t !== L.text) { L.text = t; L.num.data = t; L.el.classList.toggle('off', t === 'murchou' || (g.op === 'sub' && g.left === 0)); }
  });
}

let bannerTimer: ReturnType<typeof setTimeout> | null = null;
function banner(main: string, sub: string, tone = ''): void {
  ui.banner.innerHTML = '';
  const a = document.createElement('div'); a.className = 'b-sub'; a.textContent = sub;
  const b = document.createElement('div'); b.className = 'b-main'; b.textContent = main;
  ui.banner.append(a, b);
  ui.banner.className = `banner show ${tone}`;
  if (bannerTimer) clearTimeout(bannerTimer);
  bannerTimer = setTimeout(() => { ui.banner.className = 'banner'; }, 2200);
}

function pop(x: number, y: number, text: string, color: string, big = false): void {
  const [cx, cy] = renderer.toCss(x, y);
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
const fieldX = (clientX: number) => (clientX * renderer.pixelRatio - renderer.ox) / renderer.pw;

canvas.addEventListener('pointerdown', (e) => {
  sound.unlock();
  if (state !== 'play' && state !== 'count') return;
  if (active !== null) { if (world.sprout()) vibrate([20, 30, 40]); return; }
  active = e.pointerId;
  world.aim(fieldX(e.clientX));
  if (state === 'play') world.sower.firing = true;
  canvas.setPointerCapture(e.pointerId);
});
canvas.addEventListener('pointermove', (e) => {
  if (state !== 'play' && state !== 'count') return;
  if (e.pointerId === active || (e.pointerType === 'mouse' && active === null)) world.aim(fieldX(e.clientX));
});
const release = (e: PointerEvent) => {
  if (e.pointerId !== active) return;
  active = null;
  world.sower.firing = false;
};
canvas.addEventListener('pointerup', release);
canvas.addEventListener('pointercancel', release);
document.addEventListener('contextmenu', (e) => e.preventDefault());
document.addEventListener('gesturestart', (e) => e.preventDefault());

const keys = new Set<string>();
window.addEventListener('keydown', (e) => {
  sound.unlock();
  if (e.target instanceof HTMLInputElement) return;
  keys.add(e.code);
  if (state === 'play' || state === 'count') {
    if (e.code === 'Space') e.preventDefault();
    if (e.code === 'ArrowUp' || e.code === 'KeyW' || e.code === 'KeyX') { if (world.sprout()) vibrate(30); }
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
  const stage = run.level + 1;
  fetch('/api/scores', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ game: 'broto', initials: ini, score: run.score, label: `FASE ${stage} · ${run.made} BROTOS` }),
  })
    .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
    .then((d: { rank?: number }) => { ui.sent.textContent = typeof d.rank === 'number' && d.rank > 0 ? `você está em ${d.rank}º no ranking global!` : 'enviado!'; })
    .catch(() => { ui.sent.textContent = 'ranking indisponível agora'; submitted = false; });
});

function loadRanking(): void {
  ui.rankList.innerHTML = '<li class="empty">carregando...</li>';
  fetch('/api/scores?game=broto')
    .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
    .then((d: { entries?: { initials: string; score: number; label: string }[] }) => {
      const list = Array.isArray(d.entries) ? d.entries : [];
      ui.rankList.replaceChildren();
      if (!list.length) { ui.rankList.innerHTML = '<li class="empty">seja o primeiro!</li>'; return; }
      list.slice(0, 10).forEach((en, i) => {
        const li = document.createElement('li');
        const cell = (cls: string, t: string) => { const sp = document.createElement('span'); sp.className = cls; sp.textContent = t; li.append(sp); };
        cell('p', `${i + 1}`); cell('i', String(en.initials).slice(0, 3)); cell('s', String(Number(en.score) || 0)); cell('l', String(en.label ?? '').slice(0, 18));
        ui.rankList.append(li);
      });
    })
    .catch(() => { ui.rankList.innerHTML = '<li class="empty">ranking indisponível</li>'; });
}

// ---------- full screen and install ----------

const standalone = window.matchMedia('(display-mode: standalone)').matches || window.matchMedia('(display-mode: fullscreen)').matches || (navigator as unknown as { standalone?: boolean }).standalone === true;
const coarse = window.matchMedia('(pointer: coarse)').matches;

function goFullscreen(): void {
  if (standalone || !coarse) return;
  const el = document.documentElement as HTMLElement & { webkitRequestFullscreen?: () => void };
  try {
    if (el.requestFullscreen) el.requestFullscreen({ navigationUI: 'hide' }).catch(() => undefined);
    else el.webkitRequestFullscreen?.();
  } catch { /* not allowed */ }
}

let installEvt: (Event & { prompt: () => Promise<void> }) | null = null;
window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); installEvt = e as Event & { prompt: () => Promise<void> }; ui.install.hidden = false; });
click(ui.install, () => { installEvt?.prompt().catch(() => undefined); installEvt = null; ui.install.hidden = true; });
if (/iphone|ipad|ipod/i.test(navigator.userAgent) && !standalone) ui.iosHint.hidden = false;
if (!coarse) ui.hint.textContent = 'segure o mouse para semear · mova para mirar · ↑ ou X: muda · P: pausa';

// ---------- loop ----------

let last = performance.now();
let slow = 0, fast = 0;
let gateSoundT = 0, hitSoundT = 0, shieldT = 0, clashes = 0, fight = 0;
let bigWindow = 0, bigT = 0, bigCool = 0;
let endT = -1;

function handleEvents(dt: number): void {
  gateSoundT -= dt; hitSoundT -= dt; shieldT -= dt; bigCool -= dt;
  for (const ev of world.events) {
    switch (ev.kind) {
      case 'fire': sound.fire(); break;
      case 'sprout':
        renderer.ring(ev.x, ev.y, [0.6, 1, 0.5], 0.12, 0.6);
        sound.sprout();
        break;
      case 'gate': case 'well':
        if (gateSoundT <= 0) { gateSoundT = 0.07; sound.gate(ev.op ?? 'mul', ev.value); }
        if (Math.random() < 0.25) renderer.burst(ev.x, ev.y, 2, ev.op === 'sub' || ev.op === 'div' ? [0.9, 0.4, 0.3] : [0.7, 1, 0.6], 0.15, 0.006, 0.35);
        if (ev.kind === 'well' || (ev.op === 'mul' && ev.value >= 3)) bigWindow++;
        break;
      case 'clash':
        clashes++;
        renderer.burst(ev.x, ev.y, 2, Math.random() < 0.5 ? [1, 0.85, 0.45] : [0.6, 0.58, 0.68], 0.18, 0.006, 0.35, 0.2);
        break;
      case 'hit':
        if (hitSoundT <= 0) { hitSoundT = 0.05; sound.hit(); }
        if (Math.random() < 0.4) renderer.burst(ev.x, ev.y, 3, [0.6, 1, 0.5], 0.3, 0.008, 0.6);
        break;
      case 'crack':
        sound.crack(); renderer.hitFlash([0.4, 0.9, 0.4], 0.12, 0.4); vibrate(15);
        break;
      case 'shield':
        if (shieldT <= 0) { shieldT = 0.25; sound.shield(); renderer.burst(ev.x, ev.y, 3, [0.55, 0.53, 0.62], 0.2, 0.006, 0.4); }
        break;
      case 'open':
        sound.open(); vibrate([20, 40, 20]);
        banner('O CORAÇÃO ESTÁ EXPOSTO', 'a horda acabou: ataque!', 'green');
        renderer.ring(0.5, world.top - 0.08, [0.6, 1, 0.5], 0.3, 0.8);
        break;
      case 'surge':
        sound.surge(); vibrate([40, 30, 80]);
        renderer.hitFlash([0.3, 0.28, 0.36], 0.25, 1);
        banner('A CINZA SOPRA!', `+${ev.value} na horda`, 'red');
        break;
      case 'stage':
        sound.crack(); sound.surge(); vibrate([60, 40, 120]);
        renderer.hitFlash([0.4, 0.9, 0.4], 0.35, 1.4);
        warp(0.25, 0.6);
        banner('O CORAÇÃO RESISTE', `estágio ${ev.value + 1} de ${LEVELS[run.level].stages ?? 1}`, 'red');
        break;
      case 'petal':
        sound.petal(); vibrate([60, 40, 60]);
        renderer.hurt = 1;
        renderer.hitFlash([0.88, 0.34, 0.23], 0.25, 1.2);
        renderer.burst(world.sower.x, world.bottom + 0.04, 14, [0.9, 1, 0.92], 0.35, 0.012, 1.4, 0.6);
        warp(0.3, 0.4);
        pop(world.sower.x, world.bottom - 0.06, ev.value > 0 ? `${ev.value} pétala${ev.value > 1 ? 's' : ''}` : 'última pétala!', '#ffb0a0', true);
        break;
      case 'win':
        sound.win(); vibrate([30, 50, 30, 50, 120]);
        warp(0.15, 0.9);
        renderer.hitFlash([0.7, 1, 0.6], 0.6, 1.6);
        for (let i = 0; i < 4; i++) renderer.burst(0.5, world.top - 0.08, 40, i % 2 ? [0.91, 1, 0.94] : [1, 0.84, 0.42], 0.9, 0.014, 1.6, 0.3);
        banner('FLORESCEU!', LEVELS[run.level].name, 'green');
        endT = 2.6;
        break;
      case 'lose':
        sound.lose(); vibrate([80, 60, 200]);
        warp(0.25, 1);
        endT = 2.2;
        break;
    }
  }
  world.events.length = 0;
  // a big bloom: a ×3 or ×5 crossed by a crowd
  bigT += dt;
  if (bigT >= 0.5) {
    if (bigWindow >= 50 && bigCool <= 0) { bigCool = 4; warp(0.35, 0.4); renderer.hitFlash([0.9, 1, 0.7], 0.12, 0.2); pop(world.sower.x, world.laneY(0.5), 'FLORADA!', '#e8fff0', true); }
    bigWindow = 0; bigT = 0;
  }
  fight += ((Math.min(1, clashes / 8)) - fight) * Math.min(1, dt * 4);
  clashes = 0;
  sound.fight = fight;
  if (fight > 0.5) renderer.hitFlash([0, 0, 0], 0, fight * 0.25);
}

function frame(now: number): void {
  requestAnimationFrame(frame);
  const raw = Math.max(0, (now - last) / 1000);
  const dt = Math.min(0.05, raw);
  last = Math.max(last, now);
  if (raw < 0.25) {
    if (raw > 1 / 45) { slow += raw; fast = 0; } else if (raw < 1 / 70) { fast += raw; slow = Math.max(0, slow - raw); }
    if (slow > 1.5 && quality < QUALITY.length - 1) { quality++; slow = 0; resize(); }
    if (fast > 6 && quality > 0) { quality--; fast = 0; resize(); }
  }
  let sdt = dt;
  if (warpT > 0) { warpT -= dt; sdt = dt * warpScale; }

  if (state === 'count') {
    count(dt);
    updateHud();
    updateLabels();
  } else if (state === 'play') {
    const k = (keys.has('ArrowLeft') || keys.has('KeyA') ? -1 : 0) + (keys.has('ArrowRight') || keys.has('KeyD') ? 1 : 0);
    if (k) world.nudge(k * dt * 0.9);
    world.sower.firing = keys.has('Space') || active !== null;
    world.update(sdt);
    handleEvents(dt);
    updateHud();
    updateLabels();
    if (world.done === 'win') renderer.bloom = Math.min(1, renderer.bloom + dt * 0.8);
    if (endT > 0) {
      endT -= dt;
      if (endT <= 0) { endT = -1; world.sower.firing = false; if (world.done === 'win') levelWon(); else finish(false); }
    }
  } else if (state === 'title' || state === 'ranking') {
    // attract: the demo plays itself and starts over
    world.aim(0.5 + Math.sin(now / 1400) * 0.25);
    world.update(dt);
    world.events.length = 0;
    if (world.done) demo();
  }
  renderer.draw(world, now / 1000, state === 'pause' || state === 'between' || state === 'count' ? 0 : sdt);
}

show('title');
requestAnimationFrame(frame);

// the story greets everyone who arrives; X, the button or Esc closes it
const story = document.getElementById('story');
if (story) {
  const closeStory = () => {
    if (story.hidden || story.classList.contains('closing')) return;
    sound.unlock();
    story.classList.add('closing');
    setTimeout(() => { story.hidden = true; story.classList.remove('closing'); }, 300);
  };
  document.getElementById('story-close')?.addEventListener('click', closeStory);
  document.getElementById('story-go')?.addEventListener('click', () => { closeStory(); start(); });
  window.addEventListener('keydown', (e) => { if (!story.hidden && (e.code === 'Escape' || e.code === 'Enter')) { e.stopImmediatePropagation(); closeStory(); } }, true);
  document.getElementById('story-close')?.focus();
}

if (import.meta.env.DEV) (window as unknown as Record<string, unknown>).__broto = { get world() { return world; }, renderer, start, sound, beginLevel, get run() { return run; } };
