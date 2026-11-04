/** Helpers for headless tests: fake canvas/2D context, input and audio. */
const noop = () => undefined;

export function fakeCtx(): CanvasRenderingContext2D {
  return new Proxy({} as CanvasRenderingContext2D, { get: (_t, p) => (typeof p === 'string' ? noop : undefined), set: () => true });
}

export function fakeCanvas(): HTMLCanvasElement {
  return { width: 0, height: 0, getContext: fakeCtx, style: {} } as unknown as HTMLCanvasElement;
}

/** Installs a global `document` whose createElement returns fake canvases. Call before importing game modules. */
export function installFakeDocument(): void {
  (globalThis as unknown as { document: unknown }).document = { createElement: fakeCanvas };
}

export class FakeInput {
  held = new Set<string>();
  pressed = new Set<string>();
  isDown(a: string): boolean { return this.held.has(a); }
  justPressed(a: string): boolean { return this.pressed.has(a); }
  endFrame(): void { this.pressed.clear(); }
  tap(a: string): void { this.pressed.add(a); }
  press(a: string): void { if (!this.held.has(a)) this.pressed.add(a); this.held.add(a); }
  release(a: string): void { this.held.delete(a); }
}

/** Every method is a no-op. */
export function fakeAudio<T>(): T {
  return new Proxy({}, { get: () => noop }) as T;
}
