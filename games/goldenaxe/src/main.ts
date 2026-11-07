import '@arcade/shared/style.css';
import { W, H } from './config';
import { Game } from './game';
import { Renderer } from './render';
import { Input, bootstrap } from '@arcade/shared';
import { SoundFx } from './audio';

const input = new Input(window);
const audio = new SoundFx();
const game = new Game(input, audio);
const renderer = new Renderer(document.getElementById('game') as HTMLCanvasElement);

bootstrap({ W, H, game, renderer, input, audio, debugKey: '__ga' });
