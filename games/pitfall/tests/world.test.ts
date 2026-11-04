import { describe, it, expect } from 'vitest';
import { nextRoom, prevRoom, roomCycle, decodeRoom, groundAt, crocOpen, shiftHalf } from '../src/world';
import { START_ROOM, CROC_PERIOD, SHIFT_STEP } from '../src/config';

describe('world generation (LFSR)', () => {
  it('matches the cartridge sequence from $C4', () => {
    expect(nextRoom(0xc4)).toBe(0x89);
    expect(nextRoom(0x89)).toBe(0x12);
    expect(prevRoom(0xc4)).toBe(0xe2);
  });
  it('prevRoom inverts nextRoom for every value', () => {
    for (let v = 1; v < 256; v++) {
      expect(prevRoom(nextRoom(v))).toBe(v);
      expect(nextRoom(prevRoom(v))).toBe(v);
    }
  });
  it('has 255 rooms and exactly 32 treasures', () => {
    const cycle = roomCycle(START_ROOM);
    expect(cycle).toHaveLength(255);
    expect(new Set(cycle).size).toBe(255);
    const treasures = cycle.filter((v) => decodeRoom(v).scene === 'treasure');
    expect(treasures).toHaveLength(32);
  });
  it('decodes the first room: one hole with ladder, wall on the right', () => {
    const r = decodeRoom(0xc4);
    expect(r.scene).toBe('hole1');
    expect(r.hasLadder).toBe(true);
    expect(r.wallRight).toBe(true);
    expect(r.trees).toBe(3);
    expect(r.objects).toHaveLength(1);
    expect(r.objects[0].kind).toBe('log');
    expect(r.objects[0].rolling).toBe(false);
  });
  it('treasure rooms carry no logs and crocodile rooms get a vine from bit 1', () => {
    const t = decodeRoom(0b00101010);
    expect(t.scene).toBe('treasure');
    expect(t.treasure).toBe(2);
    expect(t.objects).toHaveLength(0);
    expect(decodeRoom(0b00100010).hasVine).toBe(true);
    expect(decodeRoom(0b00100001).hasVine).toBe(false);
  });
  it('ground hazards: holes, pits, crocodiles and shifting sand', () => {
    const hole1 = decodeRoom(0x00);
    expect(groundAt(hole1, 60, 0)).toBe('solid');
    expect(groundAt(hole1, 75, 0)).toBe('hole');
    const tar = decodeRoom(0b00010000);
    expect(groundAt(tar, 50, 0)).toBe('deadly');
    expect(groundAt(tar, 20, 0)).toBe('solid');
    const croc = decodeRoom(0b00100000);
    expect(crocOpen(0)).toBe(true);
    expect(crocOpen(CROC_PERIOD + 0.01)).toBe(false);
    expect(groundAt(croc, 58, CROC_PERIOD + 0.01)).toBe('solid'); // on a closed head
    expect(groundAt(croc, 58, 0)).toBe('deadly'); // jaws open
    const shift = decodeRoom(0b00110000);
    expect(shiftHalf(0)).toBe(0);
    expect(groundAt(shift, 76, 0)).toBe('solid');
    expect(groundAt(shift, 76, SHIFT_STEP * 5.5)).toBe('deadly');
  });
});
