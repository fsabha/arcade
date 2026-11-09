import './style.css';
import { installAnalytics, trackEvent } from '@arcade/shared';
import { World, BASE_GIFTS, BASE_KIT, UPGRADES, TRIAL_NAMES, BOX_H, type Gifts, type Kit, type Block, type Upgrade, type TrialKind } from './world';
import { type Boss } from './boss';
import { LEVELS, GIFTS, type GiftId } from './levels';
import { Renderer } from './gl';
import { Sound } from './audio';

type State = 'title' | 'count' | 'play' | 'pause' | 'between' | 'over' | 'ranking';

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
const canvas = $<HTMLCanvasElement>('gl');
const ui = {
  hud: $('hud'), score: $('score'), lv: $('lv'), lives: $('lives'), kit: $('kit'), heartbar: $('heartbar'), heartName: $('heart-name'), heartFill: $('heart-fill'), horde: $('horde'),
  banner: $('banner'), hint: $('hint'), count: $('count'), labels: $('labels'),
  title: $('title'), pause: $('pause'), over: $('over'), ranking: $('ranking'), between: $('between'), fail: $('fail'),
  betweenTitle: $('between-title'), betweenScore: $('between-score'), stagebar: $('stagebar'), gifts: $('gifts'),
  overTitle: $('over-title'), fScore: $('f-score'), fStage: $('f-stage'), fMade: $('f-made'), fBest: $('f-best'), best: $('best'),
  form: $<HTMLFormElement>('initials-form'), initials: $<HTMLInputElement>('initials'), sent: $('sent'), rankList: $('rank-list'),
  snd: $<HTMLButtonElement>('snd-btn'), mus: $<HTMLButtonElement>('mus-btn'), install: $<HTMLButtonElement>('install-btn'), iosHint: $('ios-hint'),
};

installAnalytics();

const store = {
  get(k: string, d: string): string { try { return localStorage.getItem(`ribomba.${k}`) ?? d; } catch { return d; } },
  set(k: string, v: string): void { try { localStorage.setItem(`ribomba.${k}`, v); } catch { /* private mode */ } },
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

interface Run { level: number; lives: number; gifts: Gifts; kit: Kit; score: number; killed: number; taken: GiftId[] }
let run: Run = newRun();
let world = new World(2, LEVELS[0], 3, BASE_GIFTS, BASE_KIT, 1);
let state: State = 'title';
resize();
demo();

function newRun(): Run {
  return { level: 0, lives: 3, gifts: { ...BASE_GIFTS }, kit: { ...BASE_KIT }, score: 0, killed: 0, taken: [] };
}

/** Attract mode: the second stage plays itself behind the title. */
function demo(): void {
  world = new World(renderer.fieldH, LEVELS[1], 99, BASE_GIFTS, { ...BASE_KIT, barrels: 2 }, 3);
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
  setTimeout(() => ui.hint.classList.add('gone'), 7000);
  sound.startMusic();
  beginLevel(0);
  trackEvent('play', { game: 'ribomba' });
}

let countT = 0, countN = 0;
function beginLevel(k: number): void {
  run.level = k;
  const lv = LEVELS[k];
  world = new World(renderer.fieldH, lv, run.lives, run.gifts, run.kit, (Math.random() * 2 ** 31) | 0);
  renderer.reset();
  ui.lv.textContent = `FASE ${k + 1}/${LEVELS.length}`;
  buildLabels();
  shownLives = -1; shownKit = '';
  sound.boss = false; sound.fury = false;
  alarmT = 0;
  show('count');
  countT = 0; countN = 0;
  banner(lv.name, `FASE ${k + 1} DE ${LEVELS.length}`, 'blue');
}

function count(dt: number): void {
  countT += dt;
  const n = Math.floor(countT / 0.75);
  if (n !== countN || countT === dt) {
    countN = n;
    if (n <= 3) {
      ui.count.textContent = n < 3 ? String(3 - n) : 'FOGO!';
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
  const time = Math.max(0, Math.round((lv.par + 60 - world.t) * 20));
  const clean = world.lives >= world.livesAtStart ? 1000 : 0;
  return world.score + time + clean;
}

function levelWon(): void {
  const gained = levelScore();
  run.score += gained;
  run.killed += world.killed;
  run.lives = world.lives;
  run.kit = { ...world.kit };
  if (run.level >= LEVELS.length - 1) {
    run.score += run.lives * 3000;
    finish(true);
    return;
  }
  ui.betweenTitle.textContent = `${world.boss?.def.name ?? 'O CAPITÃO'} CAIU!`;
  ui.betweenScore.textContent = `+${gained} pontos · total ${run.score}`;
  ui.stagebar.replaceChildren(...LEVELS.map((_, i) => { const el = document.createElement('i'); el.className = i <= run.level ? 'done' : i === run.level + 1 ? 'now' : ''; return el; }));
  const pool = (Object.keys(GIFTS) as GiftId[]).filter((g) => !(g === 'vida' && run.lives >= 4) && !(g === 'duplo' && run.kit.barrels >= 4) && !(g === 'portao' && run.gifts.firstDouble));
  for (let i = pool.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [pool[i], pool[j]] = [pool[j], pool[i]]; }
  // a life first when hurt, so it is never missing from the offer
  if (run.lives < 3) { const v = pool.indexOf('vida'); if (v > 2) [pool[0], pool[v]] = [pool[v], pool[0]]; }
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
  if (id === 'vida') run.lives = Math.min(4, run.lives + 1);
  else if (id === 'duplo') run.kit.barrels = Math.min(4, run.kit.barrels + 1);
  else if (id === 'caixas') g.boxes *= 0.75;
  else if (id === 'portao') g.firstDouble = true;
  else if (id === 'aviso') g.warn += 0.2;
  else if (id === 'lento') g.river *= 0.9;
  else if (id === 'fraco') g.weak *= 1.5;
}

function finish(won: boolean): void {
  sound.stopMusic();
  if (!won) { run.score += world.score; run.killed += world.killed; }
  const isBest = run.score > best;
  if (isBest) { best = run.score; store.set('best', String(best)); }
  ui.overTitle.textContent = won ? 'O REI RUBRO CAIU!' : 'O RIO VERMELHO PASSOU';
  ui.fScore.textContent = String(run.score);
  ui.fStage.textContent = won ? 'todas as 8 fases' : `fase ${run.level + 1}`;
  ui.fMade.textContent = `${run.killed} rubros derrubados`;
  ui.fBest.textContent = isBest ? 'novo recorde neste aparelho!' : `recorde: ${best}`;
  ui.form.hidden = run.score <= 0;
  ui.sent.textContent = '';
  ui.initials.value = store.get('initials', '');
  submitted = false;
  show('over');
}

// ---------- HUD ----------

let shownScore = -1, shownLives = -1, shownKit = '';
function bossHint(b: Boss): string {
  if (b.intro > 0) return b.def.epithet;
  if (b.id === 5 && b.open <= 0) return `a chave gira · ${Math.ceil(10 - b.spin)}s`;
  if (b.open > 0 || b.always) return 'MIRE NO ALVO ACESO!';
  if (b.fury) return 'FÚRIA!';
  return b.def.armor > 0 ? 'o meio é blindado: mire de lado' : 'espere o alvo acender';
}

const heartBox = document.querySelector('.heart-box') as HTMLElement;
const dangerMark = Object.assign(document.createElement('div'), { className: 'danger-mark', textContent: '!', hidden: true });
document.body.appendChild(dangerMark);

function kitText(): string {
  const k = world.kit, out: string[] = [];
  if (world.doze > 0) out.push(`12 CANOS ${Math.ceil(world.doze)}s`);
  if (k.barrels > 1) out.push(`${k.barrels} CANOS`);
  if (k.cadence) out.push(`CADÊNCIA ${k.cadence}`);
  if (k.fan) out.push('LEQUE');
  if (k.lead) out.push('CHUMBO');
  if (k.spring) out.push('MOLA');
  return out.join('|');
}

function updateHud(): void {
  const [, y] = renderer.toCss(0.5, world.top + (world.boss ? 0.09 : 0.03));
  heartBox.style.top = `${y}px`;
  dangerMark.hidden = !renderer.danger || state !== 'play';
  if (!dangerMark.hidden) { const [x, yy] = renderer.toCss(world.cannon.x, world.cannonY - 0.08); dangerMark.style.left = `${x}px`; dangerMark.style.top = `${yy}px`; }
  const sc = run.score + world.score;
  if (sc !== shownScore) { ui.score.textContent = String(sc); shownScore = sc; }
  if (world.lives !== shownLives) {
    shownLives = world.lives;
    const total = Math.max(world.livesAtStart, world.lives, 3);
    ui.lives.replaceChildren(...Array.from({ length: total }, (_, i) => { const el = document.createElement('i'); if (i >= world.lives) el.className = 'off'; return el; }));
  }
  const kt = kitText();
  if (kt !== shownKit) {
    shownKit = kt;
    ui.kit.replaceChildren(...(kt ? kt.split('|') : []).map((t) => { const sp = document.createElement('span'); sp.textContent = t; if (t.startsWith('12')) sp.className = 'hot'; return sp; }));
  }
  const b = world.boss;
  if (b) {
    ui.heartName.textContent = b.def.name;
    ui.heartFill.style.transform = `scaleX(${Math.max(0, b.hp) / b.max})`;
    ui.heartbar.classList.toggle('open', b.open > 0 || b.always);
    ui.heartbar.classList.toggle('fury', b.fury);
    ui.heartbar.classList.remove('river');
    ui.horde.textContent = world.done === 'win' ? 'DERRUBADO!' : bossHint(b);
  } else {
    ui.heartName.textContent = 'RIO VERMELHO';
    ui.heartFill.style.transform = `scaleX(${world.riverShare})`;
    ui.heartbar.classList.remove('open', 'fury');
    ui.heartbar.classList.add('river');
    const tr = world.trial;
    if (tr) {
      const left = Math.max(0, Math.ceil(tr.dur - tr.t));
      const extra = tr.box && !tr.box.gone ? ` · caixa ${tr.box.left}` : '';
      ui.horde.textContent = `${TRIAL_NAMES[tr.kind][0]} · ${left}s${extra}`;
    } else ui.horde.textContent = `${world.riverLeft + world.red.n} rubros`;
  }
}

// labels: the number over each gate and crate
function blockText(b: Block): [string, string] {
  if (b.kind === 'mul') return [`×${b.n}`, ''];
  if (b.kind === 'add') return [`+${b.n}`, ''];
  return [String(b.left), b.up ? UPGRADES[b.up].name : 'VAZIA'];
}
let labels: { el: HTMLDivElement; num: Text; small: HTMLElement; text: string; block: Block }[] = [];
function buildLabels(): void {
  ui.labels.replaceChildren();
  labels = world.blocks.map((b) => {
    const el = document.createElement('div');
    el.className = `glabel ${b.kind === 'box' ? (b.up ? 'box' : 'box empty') : b.kind}${b.kind === 'mul' && b.n >= 5 ? ' big' : ''}`;
    if (b.golden || b.giant) el.classList.add('gold');
    const num = document.createTextNode('');
    const small = document.createElement('small');
    el.append(num, small);
    ui.labels.append(el);
    return { el, num, small, text: '', block: b };
  });
}
function updateLabels(): void {
  if (labels.length !== world.blocks.length || labels.some((L, i) => L.block !== world.blocks[i])) buildLabels();
  for (const L of labels) {
    const b = L.block;
    const [x, y] = renderer.toCss(b.cx, world.laneY(b.y) - (1 - b.enter) * 0.3 + (b.kind === 'box' ? 0 : -0.002));
    L.el.style.transform = `translate(${x}px, ${y}px) translate(-50%, -50%)`;
    L.el.style.visibility = b.gone || (world.fog > 0 && world.laneY(b.y) < world.laneY(0.7)) ? 'hidden' : 'visible';
    const [t, sm] = blockText(b);
    if (t !== L.text) { L.text = t; L.num.data = t; L.small.textContent = sm; }
  }
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
// relative drag: the cannon follows the finger's movement, so the thumb never covers it
let dragFrom = 0, dragAt = 0;

canvas.addEventListener('pointerdown', (e) => {
  sound.unlock();
  if (state !== 'play' && state !== 'count') return;
  if (active !== null) return;
  active = e.pointerId;
  dragFrom = fieldX(e.clientX);
  dragAt = world.cannon.tx;
  if (e.pointerType === 'mouse') world.aim(fieldX(e.clientX));
  canvas.setPointerCapture(e.pointerId);
});
canvas.addEventListener('pointermove', (e) => {
  if (state !== 'play' && state !== 'count') return;
  if (e.pointerType === 'mouse') { world.aim(fieldX(e.clientX)); return; }
  if (e.pointerId === active) world.aim(dragAt + (fieldX(e.clientX) - dragFrom) * 1.25);
});
const release = (e: PointerEvent) => { if (e.pointerId === active) active = null; };
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
  fetch('/api/scores', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ game: 'ribomba', initials: ini, score: run.score, label: `FASE ${run.level + 1} · ${run.killed} RUBROS` }),
  })
    .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
    .then((d: { rank?: number }) => { ui.sent.textContent = typeof d.rank === 'number' && d.rank > 0 ? `você está em ${d.rank}º no ranking global!` : 'enviado!'; })
    .catch(() => { ui.sent.textContent = 'ranking indisponível agora'; submitted = false; });
});

function loadRanking(): void {
  ui.rankList.innerHTML = '<li class="empty">carregando...</li>';
  fetch('/api/scores?game=ribomba')
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
if (!coarse) ui.hint.textContent = 'mova o mouse ou ← → · o Bocão atira sozinho · P: pausa';

// ---------- loop ----------

let last = performance.now();
let slow = 0, fast = 0;
let gateSoundT = 0, hitSoundT = 0, tucT = 0, clashes = 0, fight = 0, alarmT = 0, weakPopT = 0;
let bigWindow = 0, bigT = 0, bigCool = 0;
let endT = -1;

const BLUE: [number, number, number] = [0.35, 0.6, 1];
const RED: [number, number, number] = [1, 0.35, 0.3];

function handleEvents(dt: number): void {
  gateSoundT -= dt; hitSoundT -= dt; tucT -= dt; bigCool -= dt; alarmT -= dt; weakPopT -= dt;
  for (const ev of world.events) {
    switch (ev.kind) {
      case 'fire': sound.fire(ev.value); break;
      case 'gate':
        if (gateSoundT <= 0) { gateSoundT = 0.07; sound.gate(ev.text === 'add' ? 'add' : 'mul', ev.value); }
        if (Math.random() < 0.15) renderer.burst(ev.x, ev.y, 2, [0.8, 0.9, 1], 0.15, 0.006, 0.35);
        if (ev.text === 'mul' && ev.value >= 3) bigWindow += ev.value - 1;
        break;
      case 'box':
        if (tucT <= 0) { tucT = 0.06; sound.tuc(); }
        if (Math.random() < 0.3) renderer.burst(ev.x, ev.y + 0.02, 2, [0.85, 0.6, 0.3], 0.2, 0.006, 0.4, 0.5);
        break;
      case 'break': {
        sound.crate(); vibrate([20, 30, 40]);
        renderer.burst(ev.x, ev.y, 26, [0.85, 0.6, 0.3], 0.5, 0.012, 0.8, 0.8);
        renderer.ring(ev.x, ev.y, [1, 0.85, 0.4], 0.12, 0.5);
        const up = ev.text as Upgrade | undefined;
        if (up) {
          pop(ev.x, ev.y - 0.04, `${UPGRADES[up].name}!`, '#ffe08a', true);
          if (up === 'doze') { banner('DOZE CANOS!', 'rajada por 12 segundos', 'gold'); warp(0.3, 0.5); renderer.hitFlash([1, 0.9, 0.5], 0.3, 1); }
        } else pop(ev.x, ev.y - 0.04, 'vazia...', '#ffd0c0');
        break;
      }
      case 'clash':
        clashes++;
        if (Math.random() < 0.5) renderer.burst(ev.x, ev.y, 1, Math.random() < 0.5 ? [0.95, 0.85, 0.65] : [0.85, 0.75, 0.6], 0.12, 0.008, 0.4, 0, 11);
        if (Math.random() < 0.15) renderer.burst(ev.x, ev.y, 1, RED, 0.25, UNIT_SIZE, 0.5, 1.2, Math.random() < 0.5 ? 3 : 4);
        break;
      case 'hit': case 'armor': case 'weak':
        if (hitSoundT <= 0) { hitSoundT = ev.kind === 'weak' ? 0.04 : 0.07; sound.hit(); }
        if (Math.random() < 0.3) renderer.burst(ev.x, ev.y, 2, ev.kind === 'weak' ? [1, 0.95, 0.5] : ev.kind === 'armor' ? [0.75, 0.78, 0.85] : BLUE, 0.25, 0.008, 0.4);
        if (ev.kind === 'weak' && weakPopT <= 0) { weakPopT = 0.35; pop(ev.x, ev.y, `×${ev.value.toFixed(ev.value % 1 ? 1 : 0)}`, '#ffe08a'); }
        break;
      case 'miss': break;
      case 'warn': sound.warn(); break;
      case 'attack': {
        const look = ev.value;
        if (look === 10) { sound.open(); vibrate(15); }
        else if (look === 13) { sound.thud(); renderer.burst(ev.x, ev.y, 20, RED, 0.4, 0.012, 0.8, 0.8); }
        else if (look === 0 || look === 1 || look === 3) { renderer.hitFlash([0.3, 0.3, 0.32], 0.04, 1); sound.thud(); vibrate(20); }
        else if (look === 4 || look === 5) { sound.splat(); sound.thud(); renderer.hitFlash([1, 0.6, 0.3], 0.12, 1.2); }
        else if (look === 2) sound.wind();
        else sound.whoosh();
        break;
      }
      case 'struck':
        sound.hurt(); sound.petal(); vibrate([60, 40, 120]);
        renderer.hurt = 1;
        renderer.hitFlash([0.9, 0.15, 0.1], 0.3, 1.6);
        renderer.burst(ev.x, world.cannonY, 18, [1, 0.6, 0.3], 0.45, 0.012, 0.7);
        warp(0.3, 0.35);
        pop(world.cannon.x, world.cannonY - 0.1, ev.value > 0 ? (ev.text === 'breach' ? 'ROMPERAM A LINHA!' : 'ACERTOU O BOCÃO!') : 'ÚLTIMA VIDA!', '#ffb0a0', true);
        if (ev.value === 1) sound.heartbeat();
        break;
      case 'breach':
        renderer.burst(ev.x, world.bottom - 0.1, 30, [0.95, 0.85, 0.65], 0.6, 0.014, 0.8, 0, 11);
        break;
      case 'trial': {
        const k = ev.text as TrialKind;
        const [name, hint] = TRIAL_NAMES[k];
        banner(name, hint, k === 'golden' || k === 'giant' ? 'gold' : 'red');
        sound.trial();
        break;
      }
      case 'trialEnd': {
        const k = ev.text as TrialKind;
        if (k !== 'golden' && k !== 'giant') break;
        if (ev.value) { sound.win(true); banner('QUEBROU!', k === 'giant' ? 'DOZE CANOS!' : 'cano duplo', 'gold'); }
        else { sound.lose(true); banner('NÃO DEU', k === 'giant' ? 'a caixa virou exército!' : 'a caixa se foi', 'red'); }
        break;
      }
      case 'wave':
        banner('NOVA FILEIRA', 'portões e caixas mais fortes', 'blue');
        sound.trial();
        break;
      case 'shift':
        sound.thud();
        renderer.burst(ev.x, world.top + 0.02, 8, [0.6, 0.55, 0.5], 0.2, 0.01, 0.8, 0.6, 11);
        break;
      case 'summon':
        sound.alarm();
        break;
      case 'boss': {
        const b = world.boss!;
        sound.bossEnter(); sound.bugle(); vibrate([80, 60, 160]);
        renderer.hitFlash([0, 0, 0], 0, 1.5);
        banner(b.def.name, b.def.epithet.toUpperCase(), 'red');
        sound.boss = true;
        break;
      }
      case 'fury':
        sound.fury = true; sound.roar(); vibrate([40, 30, 40, 30, 80]);
        renderer.hitFlash([0.9, 0.15, 0.1], 0.3, 1.4);
        warp(0.3, 0.8);
        banner('FÚRIA!', world.boss?.def.name ?? '', 'red');
        break;
      case 'half':
        sound.roar(); renderer.hitFlash([0.9, 0.2, 0.2], 0.25, 1.2);
        banner('A CAPA CAIU', 'o Rei ficou mais rápido', 'red');
        break;
      case 'win':
        sound.boss = false; sound.fury = false;
        sound.win(); vibrate([30, 50, 30, 50, 120]);
        warp(0.15, 0.9);
        renderer.hitFlash([1, 0.95, 0.8], 0.6, 1.6);
        for (let i = 0; i < 4; i++) renderer.burst(ev.x, ev.y, 40, i % 2 ? [1, 0.85, 0.4] : BLUE, 0.9, 0.014, 1.6, 0.3);
        renderer.burst(ev.x, ev.y, 30, RED, 0.8, UNIT_SIZE, 1.4, 1.5, 4);
        banner('DERRUBADO!', world.boss?.def.name ?? '', 'gold');
        endT = 2.6;
        break;
      case 'lose':
        sound.boss = false; sound.fury = false;
        sound.lose(); vibrate([80, 60, 200]);
        warp(0.25, 1);
        endT = 2.2;
        break;
    }
  }
  world.events.length = 0;
  // reds close to the line: the alarm
  if (alarmT <= 0 && world.phase === 'river') {
    for (let i = 0; i < world.red.n; i++) if (world.red.y[i] > world.bottom - 0.25) { sound.alarm(); alarmT = 1.2; break; }
  }
  bigT += dt;
  if (bigT >= 0.5) {
    if (bigWindow >= 40 && bigCool <= 0) { bigCool = 5; warp(0.4, 0.35); pop(world.cannon.x, world.laneY(0.45), 'MULTIDÃO!', '#e6f0ff', true); }
    bigWindow = 0; bigT = 0;
  }
  fight += ((Math.min(1, clashes / 8)) - fight) * Math.min(1, dt * 4);
  clashes = 0;
  sound.fight = fight;
}
const UNIT_SIZE = 0.016;
void BOX_H;

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
    if (k) world.nudge(k * dt * 1.4);
    world.update(sdt);
    handleEvents(dt);
    updateHud();
    updateLabels();
    if (world.done === 'win') renderer.win = Math.min(1, renderer.win + dt * 0.8);
    if (endT > 0) {
      endT -= dt;
      if (endT <= 0) { endT = -1; if (world.done === 'win') levelWon(); else finish(false); }
    }
  } else if (state === 'title' || state === 'ranking') {
    // attract: the demo plays itself (it follows the river) and starts over
    let tx = world.mouth;
    if (world.red.n) { let sx = 0, sw = 0; for (let i = 0; i < world.red.n; i++) { const wt = Math.max(0, world.red.y[i] - world.top) ** 3; sx += world.red.x[i] * wt; sw += wt; } if (sw > 0) tx = sx / sw; }
    world.aim(tx);
    world.update(dt);
    world.events.length = 0;
    if (world.done || world.phase === 'boss') demo();
  }
  renderer.draw(world, now / 1000, state === 'pause' || state === 'between' || state === 'count' ? 0 : sdt);
}

show('title');
requestAnimationFrame(frame);

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

if (import.meta.env.DEV) (window as unknown as Record<string, unknown>).__ribomba = { get world() { return world; }, renderer, start, sound, beginLevel, get run() { return run; } };
