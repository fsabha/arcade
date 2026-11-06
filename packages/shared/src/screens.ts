import { drawText, drawTextCentered, textWidth } from './font';
import { PAUSE_ITEMS } from './shell';

/** The shared look of the menu, help, ranking, pause, game over and initials screens. */
export const UI = { text: '#dfe6ee', dim: '#8a97a6', gold: '#ffe14a', red: '#ff4a4a' } as const;

export interface MenuLayout {
  title: string;
  titleColor: string;
  titleScale?: number;
  titleY?: number;
  subtitle?: string;
  /** resolved labels, one per menu item */
  labels: string[];
  selected: number;
  time: number;
  /** y of the first item and the spacing */
  itemsY?: number;
  itemGap?: number;
  /** lines at the bottom: controls, credits */
  footer?: string[];
  footerY?: number;
}

export function drawMenuScreen(ctx: CanvasRenderingContext2D, W: number, H: number, m: MenuLayout): void {
  const scale = m.titleScale ?? (W >= 300 ? 3 : 3);
  const titleY = m.titleY ?? 36;
  drawTextCentered(ctx, m.title, W / 2, titleY, m.titleColor, scale);
  if (m.subtitle) drawTextCentered(ctx, m.subtitle, W / 2, titleY + 5 * scale + 7, UI.dim);
  const y0 = m.itemsY ?? titleY + 5 * scale + 30;
  const gap = m.itemGap ?? 12;
  m.labels.forEach((label, i) => {
    const y = y0 + i * gap;
    const sel = i === m.selected;
    if (sel && Math.floor(m.time * 4) % 2 === 0) drawText(ctx, '>', W / 2 - textWidth(label) / 2 - 10, y, UI.gold);
    drawTextCentered(ctx, label, W / 2, y, sel ? UI.gold : UI.text);
  });
  const footer = m.footer ?? [];
  const fy = m.footerY ?? H - 14 - (footer.length - 1) * 12;
  footer.forEach((l, i) => drawTextCentered(ctx, l, W / 2, fy + i * 12, UI.dim));
}

export function drawHowToScreen(ctx: CanvasRenderingContext2D, W: number, H: number, lines: string[], opts: { y0?: number; gap?: number; title?: string } = {}): void {
  drawTextCentered(ctx, opts.title ?? 'COMO JOGAR', W / 2, 26, UI.gold, 2);
  const gap = opts.gap ?? (lines.length > 11 ? 11 : 12);
  const y0 = opts.y0 ?? 50;
  lines.forEach((l, i) => drawTextCentered(ctx, l, W / 2, y0 + i * gap, UI.text));
  drawTextCentered(ctx, 'ENTER VOLTA', W / 2, H - 24, UI.dim);
}

export interface RankingShellView {
  hasRemote: boolean;
  global: unknown[] | null;
  globalError: boolean;
  lastGlobalRank: number | null;
  globalRows(): string[];
}

/** The ranking is the global leaderboard; `rows` is accepted for compatibility and ignored when a shell is given. */
export function drawRankingScreen(ctx: CanvasRenderingContext2D, W: number, H: number, rows: string[], menu: boolean, opts: { y0?: number; shell?: RankingShellView } = {}): void {
  const sh = opts.shell;
  drawTextCentered(ctx, 'RANKING', W / 2, 26, UI.gold, 2);
  const y0 = opts.y0 ?? 52;
  const list = sh && sh.hasRemote ? sh.globalRows() : rows;
  if (sh && sh.hasRemote && sh.global === null) {
    drawTextCentered(ctx, sh.globalError ? 'SEM CONEXAO COM O RANKING' : 'CARREGANDO...', W / 2, 100, UI.dim);
  } else if (list.length === 0) {
    drawTextCentered(ctx, 'NINGUEM REGISTROU AINDA', W / 2, 100, UI.dim);
  } else {
    list.forEach((line, i) => drawTextCentered(ctx, line, W / 2, y0 + i * 12, i === 0 ? UI.gold : UI.text));
  }
  if (sh && sh.lastGlobalRank !== null) drawTextCentered(ctx, `VOCE FICOU EM ${sh.lastGlobalRank}`, W / 2, H - 36, UI.gold);
  drawTextCentered(ctx, menu ? 'ENTER VOLTA' : 'ENTER CONTINUA', W / 2, H - 24, UI.dim);
}

export function drawPausedScreen(ctx: CanvasRenderingContext2D, W: number, H: number, index: number): void {
  ctx.fillStyle = 'rgba(0,0,0,0.7)';
  ctx.fillRect(0, 0, W, H);
  const y = Math.round(H * 0.33);
  drawTextCentered(ctx, 'PAUSA', W / 2, y, UI.gold, 2);
  PAUSE_ITEMS.forEach((item, i) => drawTextCentered(ctx, item, W / 2, y + 36 + i * 14, i === index ? UI.gold : UI.text));
}

export interface GameOverLayout {
  /** lines under the title, the first in text colour, the rest dim */
  lines: string[];
  qualifies: boolean;
  /** seconds since game over: the prompt shows after 2 */
  stateTime: number;
  title?: string;
  titleColor?: string;
  /** extra gold line (e.g. a club badge) */
  highlight?: string;
}

export function drawGameOverScreen(ctx: CanvasRenderingContext2D, W: number, H: number, g: GameOverLayout): void {
  const top = Math.round(H * 0.27);
  const h = 44 + g.lines.length * 12 + (g.highlight ? 12 : 0) + 30;
  ctx.fillStyle = 'rgba(0,0,0,0.76)';
  ctx.fillRect(0, top, W, h);
  drawTextCentered(ctx, g.title ?? 'FIM DE JOGO', W / 2, top + 14, g.titleColor ?? UI.red, 2);
  let y = top + 40;
  g.lines.forEach((l, i) => { drawTextCentered(ctx, l, W / 2, y, i === 0 ? UI.text : UI.dim); y += 12; });
  if (g.highlight) { drawTextCentered(ctx, g.highlight, W / 2, y, UI.gold); y += 12; }
  if (g.stateTime >= 2) drawTextCentered(ctx, g.qualifies ? 'ENTER PARA REGISTRAR' : 'ENTER PARA CONTINUAR', W / 2, y + 8, UI.gold);
}

export function drawInitialsScreen(ctx: CanvasRenderingContext2D, W: number, H: number, score: string, initials: string[], pos: number, time: number): void {
  ctx.fillStyle = 'rgba(0,0,0,0.76)';
  ctx.fillRect(0, 0, W, H);
  const y = Math.round(H * 0.2);
  drawTextCentered(ctx, 'NOVO RECORDE', W / 2, y, UI.gold, 2);
  drawTextCentered(ctx, score, W / 2, y + 26, UI.text);
  drawTextCentered(ctx, 'SUAS INICIAIS', W / 2, y + 46, UI.dim);
  const scale = 3;
  const cw = 4 * scale;
  const x0 = W / 2 - (3 * cw + 2 * 6) / 2;
  const ly = y + 62;
  initials.forEach((ch, i) => {
    const x = x0 + i * (cw + 6);
    const sel = i === pos;
    drawText(ctx, ch, x, ly, sel ? UI.gold : UI.text, scale);
    if (sel && Math.floor(time * 4) % 2 === 0) { ctx.fillStyle = UI.gold; ctx.fillRect(x, ly + 5 * scale + 2, 3 * scale, 2); }
  });
  if (W < 260) {
    drawTextCentered(ctx, 'CIMA BAIXO MUDAM', W / 2, ly + 48, UI.dim);
    drawTextCentered(ctx, 'ENTER CONFIRMA', W / 2, ly + 60, UI.dim);
  } else {
    drawTextCentered(ctx, 'CIMA BAIXO MUDAM  ENTER CONFIRMA', W / 2, ly + 48, UI.dim);
  }
}
