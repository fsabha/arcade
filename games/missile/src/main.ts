import '@arcade/shared/style.css';
import { W, H } from './config';
import { Game } from './game';
import { Renderer } from './render';
import { Input, bootstrap } from '@arcade/shared';
import { SoundFx } from './audio';

const input = new Input(window);
const audio = new SoundFx();
const game = new Game(input, audio);
const canvas = document.getElementById('game') as HTMLCanvasElement;
const renderer = new Renderer(canvas);

bootstrap({ W, H, game, renderer, input, audio, debugKey: '__mc' });

// Tapping or clicking the sky aims and fires: the joystick is faithful, the touch screen is not.
canvas.addEventListener('pointerdown', (e) => {
  const r = canvas.getBoundingClientRect();
  const x = ((e.clientX - r.left) / r.width) * W;
  const y = ((e.clientY - r.top) / r.height) * H;
  game.tap(x, y);
  e.preventDefault();
});
