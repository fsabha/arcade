import { W, H, HORIZON, DRAW_AHEAD, DRAW_BEHIND, SAMPLE, TRACK_W, CARS, LAPS, COURSE_NAMES, COURSE_LEVEL, MODE_NAMES, COUNTDOWN, VIEWS } from './config';
import { Game, MENU_ITEMS } from './game';
import { Track, at, world } from './track';
import type { Car } from './race';
import { Painter, Camera, box, shade, cylinder, cone, wedge } from './render3d';
import {
  drawText, drawTextCentered, drawMenuScreen, drawHowToScreen, drawRankingScreen, drawPausedScreen, drawGameOverScreen, drawInitialsScreen, UI,
} from '@arcade/shared';

const SKY: Record<string, [string, string]> = { bigforest: ['#2058c0', '#90c8f0'], baybridge: ['#3070d0', '#b0d8f8'], acropolis: ['#d08040', '#f0d0a0'] };
const GRASS: Record<string, [string, string]> = { bigforest: ['#3c9a3c', '#348a34'], baybridge: ['#2058a0', '#1c4c90'], acropolis: ['#b09060', '#a08050'] };

export class Renderer {
  private ctx: CanvasRenderingContext2D;
  private demoT = 0;

  constructor(canvas: HTMLCanvasElement) {
    canvas.width = W;
    canvas.height = H;
    this.ctx = canvas.getContext('2d')!;
    this.ctx.imageSmoothingEnabled = false;
  }

  draw(g: Game): void {
    const ctx = this.ctx;
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, W, H);

    if (g.state === 'menu' || g.state === 'howto' || g.state === 'ranking') {
      // attract: the camera drifts along the chosen track
      this.demoT += 1 / 60;
      const s = this.demoT * 50;
      this.drawWorld(g.track, g.race.cars.filter((c) => !c.player), s, 0, 2, g.time, g.course);
      ctx.fillStyle = 'rgba(0,0,0,0.6)';
      ctx.fillRect(0, 0, W, H);
      if (g.state === 'menu') this.drawMenu(g);
      else if (g.state === 'howto') this.drawHowTo();
      else drawRankingScreen(ctx, W, H, [], true, { shell: g.shell });
      return;
    }

    const p = g.player;
    this.drawWorld(g.track, g.race.cars, p.s, p.d, g.view, g.time, g.course, p);
    this.drawHud(g);
    if (g.state === 'paused') drawPausedScreen(ctx, W, H, g.pauseIndex);
    else if (g.state === 'gameover') this.drawGameOver(g);
    else if (g.state === 'initials') drawInitialsScreen(ctx, W, H, `${g.score} PONTOS`, g.initials, g.initialsPos, g.time);
  }

  // ---------- the world ----------

  private camera(track: Track, s: number, d: number, view: number, car?: Car): Camera {
    const back = [1.5, 8.5, 15, 23][view];
    const height = [1.1, 2.9, 4.6, 10][view];
    const horizon = [HORIZON + 8, HORIZON, HORIZON - 6, HORIZON - 30][view];
    const eye = world(track, s - back, d * (view === 0 ? 1 : 0.6), height);
    const look = at(track, s + 6);
    const yaw = Math.atan2(look.fx, look.fz) + (car ? car.steer * 0.06 : 0);
    // keep the camera above the road surface on hills
    const under = at(track, s - back).y;
    return { x: eye.x, y: Math.max(eye.y, under + height), z: eye.z, yaw, horizon };
  }

  private drawWorld(track: Track, cars: Car[], s: number, d: number, view: number, time: number, course: string, player?: Car): void {
    const ctx = this.ctx;
    const cam = this.camera(track, s, d, view, player);
    const L = track.length;
    // sky and far hills scroll with the yaw
    const sky = SKY[course] ?? SKY.bigforest;
    for (let y = 0; y < cam.horizon; y += 4) {
      const k = y / cam.horizon;
      ctx.fillStyle = mix(sky[0], sky[1], k);
      ctx.fillRect(0, y, W, 4);
    }
    const shift = Math.round((cam.yaw / (Math.PI * 2)) * 640);
    ctx.fillStyle = course === 'baybridge' ? '#4878b8' : course === 'acropolis' ? '#a07040' : '#2c6a3c';
    for (let i = -2; i < 14; i++) {
      const x = ((i * 64 - shift) % 640 + 640) % 640 - 160;
      const h = 14 + ((i * 37 + 11) % 26);
      for (let r = 0; r < h; r++) ctx.fillRect(x + 32 - Math.round((r / h) * 44), cam.horizon - h + r, Math.round((r / h) * 88), 1);
    }
    // ground below the horizon
    const grass = GRASS[course] ?? GRASS.bigforest;
    ctx.fillStyle = grass[0];
    ctx.fillRect(0, cam.horizon, W, H - cam.horizon);

    const painter = new Painter(cam);
    const base = Math.floor((((s % L) + L) % L) / SAMPLE);
    const n = track.samples.length;
    for (let k = -DRAW_BEHIND; k < DRAW_AHEAD; k++) {
      const i = ((base + k) % n + n) % n;
      const a = track.samples[i], b = track.samples[(i + 1) % n];
      const hw = TRACK_W / 2;
      const L_a = { x: a.x - a.rx * hw, y: a.y, z: a.z - a.rz * hw }, R_a = { x: a.x + a.rx * hw, y: a.y, z: a.z + a.rz * hw };
      const L_b = { x: b.x - b.rx * hw, y: b.y, z: b.z - b.rz * hw }, R_b = { x: b.x + b.rx * hw, y: b.y, z: b.z + b.rz * hw };
      // grass shoulders out to 40 m, in two tones so the ground moves
      const gw = 40;
      const GL_a = { x: a.x - a.rx * gw, y: a.y, z: a.z - a.rz * gw }, GR_a = { x: a.x + a.rx * gw, y: a.y, z: a.z + a.rz * gw };
      const GL_b = { x: b.x - b.rx * gw, y: b.y, z: b.z - b.rz * gw }, GR_b = { x: b.x + b.rx * gw, y: b.y, z: b.z + b.rz * gw };
      const gc = grass[(i >> 1) & 1];
      painter.add({ pts: [GL_a, L_a, L_b, GL_b], color: gc });
      painter.add({ pts: [R_a, GR_a, GR_b, R_b], color: gc });
      // road, with the start line and checkpoint stripes
      const isStart = i === 0;
      const isCp = track.checkpoints.some((c) => Math.abs(a.s - c) < SAMPLE / 2);
      painter.add({ pts: [L_a, R_a, R_b, L_b], color: isStart ? '#f0f0f0' : isCp ? '#e0e040' : (i & 2) ? '#6a6a70' : '#606066' });
      // curbs
      const cw = 1.2;
      const CL_a = { x: a.x - a.rx * (hw + cw), y: a.y, z: a.z - a.rz * (hw + cw) }, CL_b = { x: b.x - b.rx * (hw + cw), y: b.y, z: b.z - b.rz * (hw + cw) };
      const CR_a = { x: a.x + a.rx * (hw + cw), y: a.y, z: a.z + a.rz * (hw + cw) }, CR_b = { x: b.x + b.rx * (hw + cw), y: b.y, z: b.z + b.rz * (hw + cw) };
      const curb = (i & 1) ? '#e03030' : '#f0f0f0';
      painter.add({ pts: [CL_a, L_a, L_b, CL_b], color: curb });
      painter.add({ pts: [R_a, CR_a, CR_b, R_b], color: curb });
      if (course === 'baybridge' && a.y > 3) {
        // the bridge deck has railings
        painter.add({ pts: [CL_a, CL_b, { ...CL_b, y: CL_b.y + 1 }, { ...CL_a, y: CL_a.y + 1 }], color: '#c0c8d0' });
        painter.add({ pts: [CR_a, CR_b, { ...CR_b, y: CR_b.y + 1 }, { ...CR_a, y: CR_a.y + 1 }], color: '#c0c8d0' });
      }
    }
    // scenery near the camera
    const sNow = ((s % L) + L) % L;
    for (const sc of track.scenery) {
      let ds = sc.s - sNow;
      if (ds < -L / 2) ds += L; if (ds > L / 2) ds -= L;
      if (ds < -DRAW_BEHIND * SAMPLE || ds > DRAW_AHEAD * SAMPLE) continue;
      const p = world(track, sc.s, sc.d);
      const k = sc.scale ?? 1;
      switch (sc.kind) {
        case 'tree': {
          // polygon pines: trunk and two stacked cones, like the arcade's Big Forest
          for (const q of box(p.x, p.y, p.z, 0.8 * k, 3 * k, 0.8 * k, 0, '#5a3a1a')) painter.add(q);
          const green = course === 'acropolis' ? '#3a7a3a' : '#2c7a34';
          for (const q of cone(p.x, p.y + 2 * k, p.z, 3.4 * k, 5 * k, 6, green)) painter.add(q);
          for (const q of cone(p.x, p.y + 5 * k, p.z, 2.4 * k, 4.5 * k, 6, shade(green, 1.1))) painter.add(q);
          break;
        }
        case 'stand': for (const q of box(p.x, p.y, p.z, 10, 5, 30, Math.atan2(at(track, sc.s).fx, at(track, sc.s).fz), '#d0d0d8')) painter.add(q); break;
        case 'pit': for (const q of box(p.x, p.y, p.z, 12, 4, 40, Math.atan2(at(track, sc.s).fx, at(track, sc.s).fz), '#f0f0f0')) painter.add(q); break;
        case 'tower': for (const q of box(p.x, p.y - 20, p.z, 3, 60, 3, 0, '#c04030')) painter.add(q); break;
        case 'column': for (const q of box(p.x, p.y, p.z, 2.4, 9, 2.4, 0, '#f0e8d0')) painter.add(q); break;
        case 'sign': painter.addBillboard({ ...p, y: p.y + 2 }, 8, 3, '#f0e040', '#000'); painter.addBillboard(p, 0.6, 2, '#808080'); break;
        case 'bridge': {
          const fwd = at(track, sc.s);
          const yaw = Math.atan2(fwd.fx, fwd.fz);
          const l = world(track, sc.s, -(TRACK_W / 2 + 2)), r = world(track, sc.s, TRACK_W / 2 + 2);
          for (const q of box(l.x, l.y, l.z, 1.5, 9, 1.5, yaw, '#e0e0e0')) painter.add(q);
          for (const q of box(r.x, r.y, r.z, 1.5, 9, 1.5, yaw, '#e0e0e0')) painter.add(q);
          for (const q of box(p.x, p.y + 8, p.z, TRACK_W + 6, 2, 2, yaw, '#e03030')) painter.add(q);
          break;
        }
      }
    }
    // cars
    for (const c of cars) {
      if (c === player && view === 0) continue;
      let ds = ((c.s % L) + L) % L - sNow;
      if (ds < -L / 2) ds += L; if (ds > L / 2) ds -= L;
      if (ds < -DRAW_BEHIND * SAMPLE || ds > DRAW_AHEAD * SAMPLE) continue;
      this.drawCar(painter, track, c, time);
    }
    painter.draw(ctx);
    // the bumper view shows the nose of your own car
    if (player && view === 0) {
      // the bumper view shows your own nose cone and the tops of the front tyres
      const poly = (pts: [number, number][], fill: string) => { ctx.fillStyle = fill; ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]); for (const [x, y] of pts.slice(1)) ctx.lineTo(x, y); ctx.closePath(); ctx.fill(); };
      const cx = W / 2;
      for (const side of [-1, 1]) {
        const x = cx + side * 104;
        ctx.fillStyle = '#18181c'; ctx.beginPath(); ctx.ellipse(x, H + 4, 26, 30, 0, Math.PI, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#34343a'; ctx.beginPath(); ctx.ellipse(x - side * 4, H + 4, 18, 24, 0, Math.PI, Math.PI * 2); ctx.fill();
      }
      poly([[cx - 22, H - 40], [cx + 22, H - 40], [cx + 64, H], [cx - 64, H]], '#e8e8f0');
      poly([[cx - 22, H - 40], [cx + 22, H - 40], [cx + 26, H - 34], [cx - 26, H - 34]], '#ffffff');
      poly([[cx - 8, H - 40], [cx + 8, H - 40], [cx + 20, H], [cx - 20, H]], player.color);
      poly([[cx - 64, H - 4], [cx + 64, H - 4], [cx + 66, H], [cx - 66, H]], '#9a9aa8');
    }
  }

  /** A formula car the Model 1 way: wedge body, sidepods, airbox, helmet, wings with endplates, eight-sided wheels. */
  private drawCar(painter: Painter, track: Track, c: Car, time: number): void {
    const p = world(track, c.s, c.d);
    const f = at(track, c.s);
    const yaw = Math.atan2(f.fx, f.fz) + c.steer * 0.15;
    const wobble = c.bump > 0 ? Math.sin(time * 40) * 0.08 : 0;
    const col = c.color;
    const cy = Math.cos(yaw), sy = Math.sin(yaw);
    const local = (lx: number, lz: number) => ({ x: p.x + lx * cy + lz * sy, z: p.z - lx * sy + lz * cy });
    const K = 1.25; // Model 1 cars read big on screen
    const L = (lx: number, lz: number) => local(lx * K, lz * K);
    const lift = (h: number) => p.y + h * K;
    const add = (qs: ReturnType<typeof box>) => { for (const q of qs) painter.add(q); };
    const white = '#f0f0f0';
    // monocoque: narrow nose, wider tail; the nose cone is two-tone like the arcade liveries
    add(wedge(p.x, lift(0.22), p.z, 1.2 * K, 0.42 * K, 0.55 * K, 4.6 * K, yaw + wobble, col, 0.28 * K));
    { const o = L(0, 1.9); add(wedge(o.x, lift(0.24), o.z, 0.62 * K, 0.36 * K, 0.4 * K, 1.2 * K, yaw + wobble, white, 0.26 * K)); }
    // sidepods with radiator intakes
    for (const side of [-1, 1]) {
      { const o = L(side * 0.9, -0.2); add(box(o.x, lift(0.22), o.z, 0.55 * K, 0.48 * K, 1.5 * K, yaw, shade(col, 0.95))); }
      { const o = L(side * 0.9, 0.56); add(box(o.x, lift(0.28), o.z, 0.45 * K, 0.34 * K, 0.06 * K, yaw, '#18181c')); }
    }
    // cockpit opening, driver's helmet with visor, airbox behind
    { const o = L(0, -0.1); add(box(o.x, lift(0.78), o.z, 0.78 * K, 0.18 * K, 1.2 * K, yaw, '#202024')); }
    { const o = L(0, -0.3); add(cylinder(o.x, lift(1.05), o.z, 0.24 * K, 0.42 * K, yaw + Math.PI / 2, 8, c.player ? '#f8f8f8' : '#f0d040', '#202020')); }
    { const o = L(0, -0.12); add(box(o.x, lift(1.0), o.z, 0.36 * K, 0.1 * K, 0.06 * K, yaw, '#3060c0')); }
    { const o = L(0, -1.3); add(wedge(o.x, lift(0.78), o.z, 0.52 * K, 0.36 * K, 0.5 * K, 1.4 * K, yaw, shade(col, 0.85), 0.36 * K)); }
    // front wing with endplates, rear wing on pylons with big endplates
    { const o = L(0, 2.45); add(box(o.x, lift(0.1), o.z, 2.7 * K, 0.1 * K, 0.6 * K, yaw, col)); }
    for (const side of [-1, 1]) { const o = L(side * 1.36, 2.45); add(box(o.x, lift(0.04), o.z, 0.08 * K, 0.36 * K, 0.72 * K, yaw, white)); }
    { const o = L(0, -2.3); add(box(o.x, lift(0.98), o.z, 2.2 * K, 0.16 * K, 0.55 * K, yaw, col)); }
    { const o = L(0, -2.3); add(box(o.x, lift(0.84), o.z, 2.2 * K, 0.1 * K, 0.4 * K, yaw, white)); }
    for (const side of [-1, 1]) { const o = L(side * 1.12, -2.3); add(box(o.x, lift(0.6), o.z, 0.08 * K, 0.62 * K, 0.7 * K, yaw, white)); }
    { const o = L(0, -2.05); add(box(o.x, lift(0.5), o.z, 0.34 * K, 0.42 * K, 0.3 * K, yaw, '#303030')); }
    // gearbox and diffuser
    { const o = L(0, -2.05); add(box(o.x, lift(0.18), o.z, 0.7 * K, 0.36 * K, 0.5 * K, yaw, '#28282c')); }
    // wheels: twelve-sided drums, fat rears, with a lighter rim face
    for (const [lx, lz, w, r] of [[-1.05, 1.5, 0.4, 0.36], [1.05, 1.5, 0.4, 0.36], [-1.12, -1.45, 0.56, 0.42], [1.12, -1.45, 0.56, 0.42]] as [number, number, number, number][]) {
      const o = L(lx, lz);
      add(cylinder(o.x, lift(r), o.z, r * K, w * K, yaw, 12, '#1e1e22', '#55555c'));
      const hub = L(lx + Math.sign(lx) * (w / 2 + 0.01), lz);
      add(cylinder(hub.x, lift(r), hub.z, r * 0.5 * K, 0.02, yaw, 10, '#a8a8b0', '#c8c8d0'));
    }
  }

  // ---------- HUD ----------

  private drawHud(g: Game): void {
    const ctx = this.ctx;
    const p = g.player;
    // speed and gear, arcade style, bottom right
    const kmh = String(g.speedKmh).padStart(3, ' ');
    drawText(ctx, kmh, W - 8 - textW(kmh, 3), H - 40, '#ffe14a', 3);
    drawText(ctx, 'KM/H', W - 8 - textW('KM/H', 1), H - 20, UI.dim);
    drawText(ctx, `G${g.gear}`, W - 60, H - 20, UI.text);
    // revs bar
    ctx.fillStyle = '#202830'; ctx.fillRect(W - 110, H - 14, 100, 6);
    ctx.fillStyle = g.revs > 0.85 ? '#ff4040' : '#40e040'; ctx.fillRect(W - 110, H - 14, Math.round(100 * Math.max(0, Math.min(1, g.revs))), 6);
    // top left: time / position / lap
    if (g.mode === 'arcade') {
      drawText(ctx, 'TIME', 8, 6, UI.dim);
      const t = String(Math.ceil(g.timeLeft)).padStart(2, '0');
      drawText(ctx, t, 8, 14, g.timeLeft < 10 && Math.floor(g.time * 4) % 2 ? UI.red : UI.text, 2);
      if (g.bonusFlash > 0) drawText(ctx, '+TEMPO', 44, 16, UI.gold);
    }
    if (g.mode !== 'free') drawText(ctx, `POS ${String(g.position).padStart(2, ' ')}/${g.race.cars.length}`, 8, 34, UI.text);
    drawText(ctx, `VOLTA ${Math.min(LAPS, p.lap + 1)}/${LAPS}`, 8, 44, UI.text);
    drawText(ctx, `TEMPO ${fmt(g.race.time)}`, 8, 54, UI.dim);
    if (g.lastLap) drawText(ctx, `ULTIMA ${fmt(g.lastLap)}`, 8, 64, UI.dim);
    if (g.bestLap) drawText(ctx, `MELHOR ${fmt(g.bestLap)}`, 8, 74, UI.dim);
    drawText(ctx, `VR ${g.view + 1}`, W - 34, 6, UI.dim);
    // course map, top right
    this.drawMap(g, W - 70, 16, 60, 44);

    if (g.phase === 'countdown') {
      const n = Math.max(0, 3 - Math.floor(g.phaseTime));
      drawTextCentered(ctx, n > 0 ? String(n) : 'GO!', W / 2, 90, n > 0 ? UI.gold : '#40ff40', 4);
      drawTextCentered(ctx, `${COURSE_NAMES[g.course]}  ${MODE_NAMES[g.mode]}`, W / 2, 130, UI.text);
      void COUNTDOWN;
    }
    if (g.phase === 'finish' || g.phase === 'timeup') {
      ctx.fillStyle = 'rgba(0,0,0,0.7)'; ctx.fillRect(0, 60, W, 100);
      drawTextCentered(ctx, g.phase === 'finish' ? (g.position === 1 ? 'VITORIA!' : 'CHEGADA') : 'TEMPO ESGOTADO', W / 2, 70, g.phase === 'finish' ? UI.gold : UI.red, 2);
      const lines = g.phase === 'finish' ? [`POSICAO ${g.position} DE ${g.race.cars.length}`, `TEMPO ${fmt(g.race.time)}  MELHOR VOLTA ${fmt(g.bestLap)}`, `${g.score} PONTOS`] : [`VOLTAS ${p.lap} DE ${LAPS}`, `MELHOR VOLTA ${g.bestLap ? fmt(g.bestLap) : '-'}`, `${g.score} PONTOS`];
      lines.forEach((l, i) => drawTextCentered(ctx, l, W / 2, 98 + i * 12, UI.text));
      if (g.phaseTime > 1.5) drawTextCentered(ctx, 'ACELERADOR CONTINUA', W / 2, 142, UI.dim);
    }
  }

  private drawMap(g: Game, x: number, y: number, w: number, h: number): void {
    const ctx = this.ctx;
    const t = g.track;
    let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
    for (const s of t.samples) { minX = Math.min(minX, s.x); maxX = Math.max(maxX, s.x); minZ = Math.min(minZ, s.z); maxZ = Math.max(maxZ, s.z); }
    const k = Math.min((w - 4) / (maxX - minX || 1), (h - 4) / (maxZ - minZ || 1));
    const px = (v: number) => x + 2 + (v - minX) * k;
    const py = (v: number) => y + h - 2 - (v - minZ) * k;
    ctx.fillStyle = 'rgba(0,0,0,0.4)'; ctx.fillRect(x, y, w, h);
    ctx.fillStyle = '#c0c0c8';
    for (let i = 0; i < t.samples.length; i += 2) { const s = t.samples[i]; ctx.fillRect(Math.round(px(s.x)), Math.round(py(s.z)), 1, 1); }
    for (const c of g.race.cars) {
      const p = at(t, c.s);
      ctx.fillStyle = c.player ? '#ffffff' : '#ff4040';
      ctx.fillRect(Math.round(px(p.x)) - 1, Math.round(py(p.z)) - 1, c.player ? 3 : 2, c.player ? 3 : 2);
    }
  }

  // ---------- screens ----------

  private drawMenu(g: Game): void {
    drawMenuScreen(this.ctx, W, H, {
      title: 'VIRTUA RACING', titleColor: '#60c0ff', subtitle: 'TRES PISTAS, QUINZE ADVERSARIOS, QUATRO CAMERAS',
      labels: MENU_ITEMS.map((item) => item === 'MODO' ? `MODO: ${MODE_NAMES[g.mode]}` : item === 'PISTA' ? `PISTA: ${COURSE_NAMES[g.course]} (${COURSE_LEVEL[g.course]})` : g.shell.label(item)),
      selected: g.menuIndex, time: g.time, titleY: 24, itemsY: 66, itemGap: 11,
      footer: ['ESPACO ACELERA  Z FREIA  SETAS VIRAM  V TROCA A CAMERA', 'SEGA 1992/1994  EDICAO BROWSER'], footerY: 194,
    });
  }

  private drawHowTo(): void {
    drawHowToScreen(this.ctx, W, H, [
      'ARCADE: CORRA CONTRA O RELOGIO',
      'CADA PONTO DE CONTROLE DA MAIS TEMPO',
      `GRAND PRIX: ${LAPS} VOLTAS CONTRA ${CARS - 1} CARROS`,
      'TREINO: PISTA LIVRE, SEM TEMPO',
      'CAMBIO AUTOMATICO DE 7 MARCHAS',
      'GRAMA FREIA  MURO TIRA VELOCIDADE',
      `VR TROCA ENTRE ${VIEWS} CAMERAS`,
      'PISTAS: BIG FOREST (INICIANTE)',
      'BAY BRIDGE (MEDIO)  ACROPOLIS (EXPERT)',
      'PONTOS POR VOLTAS, POSICAO E TEMPO',
    ], { y0: 50, gap: 12 });
  }

  private drawGameOver(g: Game): void {
    drawGameOverScreen(this.ctx, W, H, {
      title: g.phase === 'finish' ? 'CORRIDA ENCERRADA' : 'FIM DE JOGO', titleColor: g.phase === 'finish' ? UI.gold : UI.red,
      lines: [`${g.score} PONTOS`, `${g.modeName}`, g.phase === 'finish' ? `POSICAO ${g.position}  TEMPO ${fmt(g.race.time)}` : `VOLTAS ${g.player.lap}`],
      qualifies: g.qualifiesForRank, stateTime: g.stateTime,
    });
  }
}

function fmt(t: number): string {
  const m = Math.floor(t / 60), s = Math.floor(t % 60), c = Math.floor((t % 1) * 100);
  return `${m}'${String(s).padStart(2, '0')}"${String(c).padStart(2, '0')}`;
}

function textW(s: string, scale: number): number {
  return (s.length * 4 - 1) * scale;
}

function mix(a: string, b: string, k: number): string {
  const pa = [1, 3, 5].map((i) => parseInt(a.slice(i, i + 2), 16));
  const pb = [1, 3, 5].map((i) => parseInt(b.slice(i, i + 2), 16));
  const c = pa.map((v, i) => Math.round(v + (pb[i] - v) * k));
  return `rgb(${c[0]},${c[1]},${c[2]})`;
}
