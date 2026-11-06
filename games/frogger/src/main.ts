import '@arcade/shared/style.css';
import { W, H } from './config';
import { Game } from './game';
import { Renderer } from './render';
import { Input, bootstrap, bindSwipe } from '@arcade/shared';
import { SoundFx } from './audio';

const input = new Input(window);
const audio = new SoundFx();
const game = new Game(input, audio);
const canvas = document.getElementById('game') as HTMLCanvasElement;
const renderer = new Renderer(canvas);

bootstrap({ W, H, game, renderer, input, audio, debugKey: '__fg' });

// Touch: swipe on the screen to turn, tap to confirm.
bindSwipe(canvas, input);
