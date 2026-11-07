import { describe, it, expect } from 'vitest';
import { validateSheet } from '@arcade/brawl';
import { AX_SHEET } from '../src/sheets/ax';

describe('sprite sheets', () => {
  it('every frame is 32x48 with known letters', () => {
    expect(validateSheet(AX_SHEET)).toEqual([]);
    for (const frames of Object.values(AX_SHEET.frames)) for (const f of frames) { expect(f.length).toBe(48); expect(f[0].length).toBe(32); }
  });
});
