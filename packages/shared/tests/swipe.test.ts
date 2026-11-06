import { describe, it, expect } from 'vitest';
import { Input, bindSwipe } from '../src/input';

/** Minimal event target standing in for a window and a canvas. */
function target() {
  const handlers: Record<string, ((e: unknown) => void)[]> = {};
  return {
    style: {} as Record<string, string>,
    addEventListener(type: string, fn: (e: unknown) => void) { (handlers[type] ??= []).push(fn); },
    setPointerCapture() {},
    fire(type: string, e: unknown) { for (const fn of handlers[type] ?? []) fn(e); },
  };
}

describe('bindSwipe', () => {
  it('a swipe presses one direction for a frame; a tap presses fire', () => {
    const win = target();
    const input = new Input(win as unknown as Window);
    const canvas = target();
    bindSwipe(canvas as unknown as HTMLElement, input);
    canvas.fire('pointerdown', { pointerType: 'touch', clientX: 100, clientY: 100, pointerId: 1 });
    canvas.fire('pointermove', { clientX: 110, clientY: 100 });
    expect(input.justPressed('right')).toBe(false); // under the threshold
    canvas.fire('pointermove', { clientX: 140, clientY: 104 });
    expect(input.justPressed('right')).toBe(true);
    expect(input.isDown('right')).toBe(false);
    canvas.fire('pointerup', {});
    expect(input.justPressed('fire')).toBe(false); // it was a swipe, not a tap
    input.endFrame();
    expect(input.justPressed('right')).toBe(false);
    canvas.fire('pointerdown', { pointerType: 'touch', clientX: 50, clientY: 50, pointerId: 2 });
    canvas.fire('pointerup', {});
    expect(input.justPressed('fire')).toBe(true);
    input.endFrame();
    canvas.fire('pointerdown', { pointerType: 'touch', clientX: 50, clientY: 50, pointerId: 3 });
    canvas.fire('pointermove', { clientX: 52, clientY: 10 });
    expect(input.justPressed('up')).toBe(true);
  });
});
