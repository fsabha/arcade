import { W, H, HUD_H, MARIO_H, HAMMER_SWING, POINTS, EXTRA_LIFE_AT, HAMMER_TIME, bonusStart } from './config';
import { Game, MENU_ITEMS, PAUSE_ITEMS } from './game';
import { Stage, Platform, yAt, buildStage } from './stages';
import { sprite } from './sprites';
import { drawText, drawTextCentered, textWidth } from '@arcade/shared';

const C = {
  girder: '#e85050', girderDark: '#a02828', girderLight: '#f88080', ladder: '#40c0f0', conveyor: '#f0a040', conveyorDark: '#a06020',
  elevator: '#40c0f0', rivet: '#f0e040', shaft: '#303040', text: '#dfe6ee', dim: '#8a97a6', gold: '#ffe14a', red: '#ff4a4a', cyan: '#40c0f0',
  bonusBox: '#2050c0',
};

const HEIGHT_LABEL: Record<string, string> = { barrels: '25 M', conveyors: '50 M', elevators: '75 M', rivets: '100 M' };

export class Renderer {
  private ctx: CanvasRenderingContext2D;
  private demo = buildStage('barrels');

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
      this.drawStage(this.demo, g.time, null);
      ctx.fillStyle = 'rgba(0,0,0,0.72)';
      ctx.fillRect(0, 0, W, H);
      if (g.state === 'menu') this.drawMenu(g);
      else if (g.state === 'howto') this.drawHowTo();
      else this.drawRanking(g, true);
      return;
    }

    this.drawStage(g.stage, g.time, g);
    this.drawActors(g);
    this.drawMario(g);
    this.drawHud(g);
    if (g.state === 'paused') this.drawPaused(g);
    else if (g.state === 'gameover') this.drawGameOver(g);
    else if (g.state === 'initials') this.drawInitials(g);
  }

  // ---------- the stage ----------

  private drawStage(st: Stage, time: number, g: Game | null): void {
    const ctx = this.ctx;
    // elevator shafts first
    for (const s of st.shafts) {
      ctx.fillStyle = C.shaft;
      ctx.fillRect(s.x + 7, s.yTop - 8, 2, s.yBottom - s.yTop + 8);
    }
    for (const p of st.platforms) this.drawPlatform(p, st, time, g);
    for (const l of st.ladders) this.drawLadder(l.x, l.yTop, l.yBottom, l.broken);
    for (const r of st.rivets) {
      if (r.taken) continue;
      ctx.fillStyle = C.rivet;
      ctx.fillRect(r.x + 1, r.y, 6, 7);
      ctx.fillStyle = '#000';
      ctx.fillRect(r.x + 3, r.y + 2, 2, 3);
    }
    if (st.oilDrum) {
      ctx.drawImage(sprite('oilDrum'), st.oilDrum.x, st.oilDrum.y - 16);
      const lit = g ? g.actors.fireballs.length > 0 || g.kind !== 'barrels' : true;
      if (lit) ctx.drawImage(sprite(`drumFire${Math.floor(time * 8) % 2}`), st.oilDrum.x, st.oilDrum.y - 24);
    }
    for (const h of st.hammers) if (!h.taken) ctx.drawImage(sprite('hammerItem'), h.x, h.y - 10);
    for (const it of st.items) if (!it.taken) ctx.drawImage(sprite(it.kind), it.x, it.y - 10);
    // Kong and Pauline
    const k = st.kong;
    const kongFrame = g && g.kind === 'barrels' && Math.floor(g.kongPhase * 2) % 4 === 0 ? 'kong1' : 'kong0';
    if (g && g.phase === 'win' && g.kind === 'rivets') {
      ctx.drawImage(sprite('kong0'), k.x, Math.min(224, k.y - 32 + g.phaseTime * 70));
    } else {
      ctx.drawImage(sprite(kongFrame), k.x, k.y - 32);
    }
    const pl = st.pauline;
    ctx.drawImage(sprite('pauline'), pl.x, pl.y - 22);
    if (g && g.phase === 'play' && Math.floor(time * 2) % 3 === 0) drawText(ctx, 'HELP!', pl.x + 14, pl.y - 30, C.cyan);
  }

  private drawPlatform(p: Platform, st: Stage, time: number, g: Game | null): void {
    const ctx = this.ctx;
    const x0 = Math.min(p.x0, p.x1);
    const x1 = Math.max(p.x0, p.x1);
    const conveyor = !!p.conveyor;
    for (let x = x0; x < x1; x++) {
      if (st.rivets.some((r) => r.taken && Math.abs(r.y - p.y0) < 2 && x >= r.x && x < r.x + 8)) continue;
      const y = Math.round(yAt(p, x));
      if (conveyor) {
        ctx.fillStyle = C.conveyor;
        ctx.fillRect(x, y, 1, 6);
        const dir = g ? Math.sign(g.actors.conveyorSpeed(p, x)) : 1;
        ctx.fillStyle = ((x + Math.floor(time * 20) * dir) & 7) < 3 ? C.conveyorDark : C.conveyor;
        ctx.fillRect(x, y + 2, 1, 2);
      } else {
        ctx.fillStyle = (x & 7) < 4 ? C.girder : C.girderLight;
        ctx.fillRect(x, y, 1, 8);
        ctx.fillStyle = C.girderDark;
        ctx.fillRect(x, y + 3, 1, 2);
      }
    }
    void st;
  }

  private drawLadder(x: number, yTop: number, yBottom: number, broken?: number): void {
    const ctx = this.ctx;
    ctx.fillStyle = C.ladder;
    const parts: [number, number][] = broken === undefined ? [[yTop, yBottom]] : [[yTop, yTop + 8], [yBottom - broken, yBottom]];
    for (const [a, b] of parts) {
      ctx.fillRect(x, Math.round(a), 2, Math.round(b - a));
      ctx.fillRect(x + 6, Math.round(a), 2, Math.round(b - a));
      for (let y = Math.round(a) + 2; y < b - 1; y += 4) ctx.fillRect(x + 2, y, 4, 1);
    }
  }

  // ---------- actors ----------

  private drawActors(g: Game): void {
    const ctx = this.ctx;
    const a = g.actors;
    const st = g.stage;
    for (const c of a.cars) {
      const s = st.shafts[c.shaft];
      ctx.fillStyle = C.elevator;
      ctx.fillRect(s.x, Math.round(c.y), 16, 3);
      ctx.fillRect(s.x + 7, Math.round(c.y) - 6, 2, 6);
    }
    for (const b of a.barrels) {
      const name = b.ladder ? (b.blue ? 'blue0' : 'barrel0') : `${b.blue ? 'blue' : 'barrel'}${Math.floor(b.phase) % 2}`;
      ctx.drawImage(sprite(name), Math.round(b.x) - 6, Math.round(b.y) - 10);
    }
    for (const f of a.fireballs) {
      const name = g.hammering ? 'fireBlue0' : `fire${Math.floor(f.phase) % 2}`;
      ctx.drawImage(sprite(name, f.dir < 0), Math.round(f.x) - 6, Math.round(f.y) - 12);
    }
    for (const p of a.pies) ctx.drawImage(sprite('pie'), Math.round(p.x) - 8, Math.round(p.y) - 6);
    for (const s of a.springs) ctx.drawImage(sprite(s.vy < 0 ? 'spring0' : 'spring1'), Math.round(s.x) - 6, Math.round(s.y) - 10);
    if (g.lastPoints.t > 0) drawTextCentered(ctx, String(g.lastPoints.n), g.lastPoints.x, g.lastPoints.y, C.text);
  }

  private drawMario(g: Game): void {
    const ctx = this.ctx;
    const m = g.mario;
    let name = 'stand';
    if (g.phase === 'dead') name = 'dead';
    else if (g.phase === 'win') name = Math.floor(g.phaseTime * 4) % 2 ? 'stand' : 'jump';
    else if (g.hammering) name = Math.floor(m.swing / HAMMER_SWING) % 2 === 0 ? 'hammer0' : 'hammer1';
    else {
      switch (m.mode) {
        case 'walk': name = m.walking ? `run${Math.floor(m.phase * 8) % 2}` : 'stand'; break;
        case 'jump': case 'fall': name = 'jump'; break;
        case 'climb': name = `climb${Math.floor(m.phase * 6) % 2}`; break;
      }
    }
    const s = sprite(name, m.facing < 0);
    ctx.drawImage(s, Math.round(m.x) - 6, Math.round(m.feet) - MARIO_H);
    if (g.hammering && g.phase === 'play') {
      const up = Math.floor(m.swing / HAMMER_SWING) % 2 === 0;
      const hx = up ? Math.round(m.x) - 4 : (m.facing > 0 ? Math.round(m.x) + 5 : Math.round(m.x) - 13);
      const hy = up ? Math.round(m.feet) - MARIO_H - 12 : Math.round(m.feet) - 12;
      ctx.drawImage(sprite('hammerItem'), hx, hy);
    }
  }

  // ---------- HUD ----------

  private drawHud(g: Game): void {
    const ctx = this.ctx;
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, W, HUD_H);
    drawText(ctx, '1UP', 10, 2, C.red);
    drawText(ctx, String(g.score).padStart(6, '0'), 4, 9, C.text, 2);
    const hi = Math.max(g.score, g.highScores[0]?.score ?? 0);
    drawTextCentered(ctx, 'RECORDE', W / 2, 2, C.red);
    drawTextCentered(ctx, String(hi).padStart(6, '0'), W / 2, 9, C.text, 2);
    // bonus box and level, arcade style, top right
    ctx.fillStyle = C.bonusBox;
    ctx.fillRect(W - 60, 1, 56, 21);
    ctx.fillStyle = '#000';
    ctx.fillRect(W - 58, 3, 52, 17);
    drawTextCentered(ctx, 'BONUS', W - 32, 5, C.cyan);
    drawTextCentered(ctx, String(g.bonus).padStart(4, '0'), W - 32, 12, g.bonus <= 1000 ? C.red : C.text);
    drawText(ctx, `L=${String(g.level).padStart(2, '0')}`, W - 60 - textWidth('L=00') - 6, 2, C.cyan);
    for (let i = 0; i < g.lives - 1; i++) ctx.drawImage(sprite('life'), W - 60 - 30 + i * 10 - 24, 11);
    drawText(ctx, HEIGHT_LABEL[g.kind], W - 24, 28, C.text);
    if (g.phase === 'intro') {
      ctx.fillStyle = 'rgba(0,0,0,0.6)';
      ctx.fillRect(40, 110, 144, 30);
      drawTextCentered(ctx, 'QUE ALTURA VOCE', W / 2, 116, C.cyan);
      drawTextCentered(ctx, 'CONSEGUE SUBIR?', W / 2, 126, C.cyan);
    }
    if (g.phase === 'win') drawTextCentered(ctx, `BONUS ${g.bonus}`, W / 2, 120, C.gold, 2);
  }

  // ---------- screens ----------

  private drawMenu(g: Game): void {
    const ctx = this.ctx;
    drawTextCentered(ctx, 'DONKEY KONG', W / 2, 36, '#e85050', 3);
    drawTextCentered(ctx, 'SALVE PAULINE DO GRANDE MACACO', W / 2, 62, C.dim);
    MENU_ITEMS.forEach((item, i) => {
      const y = 96 + i * 14;
      let label: string = item;
      if (item === 'CRT') label = `CRT: ${g.settings.crt ? 'LIGADO' : 'DESLIGADO'}`;
      if (item === 'SOM') label = `SOM: ${g.settings.sound ? 'LIGADO' : 'DESLIGADO'}`;
      const sel = i === g.menuIndex;
      if (sel && Math.floor(g.time * 4) % 2 === 0) drawText(ctx, '>', W / 2 - textWidth(label) / 2 - 10, y, C.gold);
      drawTextCentered(ctx, label, W / 2, y, sel ? C.gold : C.text);
    });
    drawTextCentered(ctx, 'SETAS ANDAM E SOBEM  ESPACO PULA', W / 2, 196, C.dim);
    drawTextCentered(ctx, 'NINTENDO 1981  EDICAO BROWSER', W / 2, 212, C.dim);
  }

  private drawHowTo(): void {
    const ctx = this.ctx;
    drawTextCentered(ctx, 'COMO JOGAR', W / 2, 26, C.gold, 2);
    const lines = [
      'SUBA ATE PAULINE: 25 50 75 E 100 METROS',
      `PULAR BARRIL OU TORTA: ${POINTS.jump}`,
      `MARTELO (${HAMMER_TIME} S): ${POINTS.hammerBarrel.join(' ')}`,
      'COM O MARTELO NAO SE PULA NEM SOBE',
      'BOLSA CHAPEU E GUARDA-CHUVA: 300 500 800',
      `REBITES: ${POINTS.rivet} CADA  OS 8 DERRUBAM KONG`,
      `BONUS COMECA EM ${bonusStart(1)} E CAI`,
      'O QUE SOBRAR VAI PARA O PLACAR',
      'BONUS EM ZERO OU QUEDA GRANDE: MORTE',
      'ESCADAS QUEBRADAS NAO VAO ATE O FIM',
      'FOGO SOBE ESCADAS E VIRA AZUL',
      'QUANDO VOCE TEM O MARTELO',
      `VIDA EXTRA COM ${EXTRA_LIFE_AT}`,
    ];
    lines.forEach((l, i) => drawTextCentered(ctx, l, W / 2, 50 + i * 11, C.text));
    drawTextCentered(ctx, 'ENTER VOLTA', W / 2, 220, C.dim);
  }

  private drawRanking(g: Game, menu: boolean): void {
    const ctx = this.ctx;
    drawTextCentered(ctx, 'RANKING', W / 2, 26, C.gold, 2);
    if (g.highScores.length === 0) drawTextCentered(ctx, 'NENHUM REGISTRO AINDA', W / 2, 100, C.dim);
    g.highScores.forEach((h, i) => {
      const y = 56 + i * 12;
      const line = `${String(i + 1).padStart(2, ' ')} ${h.initials.padEnd(3, ' ')} ${String(h.score).padStart(6, ' ')} NIV ${String(h.level).padStart(2, ' ')}`;
      drawTextCentered(ctx, line, W / 2, y, i === 0 ? C.gold : C.text);
    });
    drawTextCentered(ctx, menu ? 'ENTER VOLTA' : 'ENTER CONTINUA', W / 2, 220, C.dim);
  }

  private drawPaused(g: Game): void {
    const ctx = this.ctx;
    ctx.fillStyle = 'rgba(0,0,0,0.7)';
    ctx.fillRect(0, 0, W, H);
    drawTextCentered(ctx, 'PAUSA', W / 2, 90, C.gold, 2);
    PAUSE_ITEMS.forEach((item, i) => {
      drawTextCentered(ctx, item, W / 2, 126 + i * 14, i === g.pauseIndex ? C.gold : C.text);
    });
  }

  private drawGameOver(g: Game): void {
    const ctx = this.ctx;
    ctx.fillStyle = 'rgba(0,0,0,0.78)';
    ctx.fillRect(0, 70, W, 110);
    drawTextCentered(ctx, 'FIM DE JOGO', W / 2, 84, C.red, 2);
    drawTextCentered(ctx, `PONTOS ${g.score}`, W / 2, 110, C.text);
    drawTextCentered(ctx, `NIVEL ${g.level}  ${HEIGHT_LABEL[g.kind]}`, W / 2, 122, C.text);
    if (g.stateTime >= 2) drawTextCentered(ctx, g.qualifiesForRank ? 'ENTER PARA REGISTRAR' : 'ENTER PARA CONTINUAR', W / 2, 160, C.gold);
  }

  private drawInitials(g: Game): void {
    const ctx = this.ctx;
    ctx.fillStyle = 'rgba(0,0,0,0.78)';
    ctx.fillRect(0, 0, W, H);
    drawTextCentered(ctx, 'NOVO RECORDE', W / 2, 60, C.gold, 2);
    drawTextCentered(ctx, `${g.score} PONTOS`, W / 2, 86, C.text);
    drawTextCentered(ctx, 'SUAS INICIAIS', W / 2, 106, C.dim);
    const scale = 3;
    const cw = 4 * scale;
    const x0 = W / 2 - (3 * cw + 2 * 6) / 2;
    g.initials.forEach((ch, i) => {
      const x = x0 + i * (cw + 6);
      const sel = i === g.initialsPos;
      drawText(ctx, ch, x, 122, sel ? C.gold : C.text, scale);
      if (sel && Math.floor(g.time * 4) % 2 === 0) { ctx.fillStyle = C.gold; ctx.fillRect(x, 122 + 5 * scale + 2, 3 * scale, 2); }
    });
    drawTextCentered(ctx, 'CIMA BAIXO MUDAM', W / 2, 170, C.dim);
    drawTextCentered(ctx, 'ENTER CONFIRMA', W / 2, 182, C.dim);
  }
}
