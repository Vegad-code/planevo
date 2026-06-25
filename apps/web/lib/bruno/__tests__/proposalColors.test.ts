import { describe, it, expect } from 'vitest';
import {
  resolveProposalColor,
  inferColorCategory,
  paletteColorByIndex,
  assignColorsToProposalBatch,
} from '../proposalColors';

describe('resolveProposalColor', () => {
  it('uses explicit hex when provided', () => {
    expect(resolveProposalColor({ color: '#D50000' })).toBe('#D50000');
  });

  it('maps colorCategory to palette', () => {
    expect(resolveProposalColor({ colorCategory: 'study' })).toBe('#3F51B5');
  });

  it('infers category from title keywords', () => {
    expect(resolveProposalColor({ title: 'Morning workout' })).toBe('#33B679');
  });

  it('rotates palette by batch index', () => {
    expect(resolveProposalColor({ batchIndex: 0 })).toBe(paletteColorByIndex(0));
    expect(resolveProposalColor({ batchIndex: 1 })).toBe(paletteColorByIndex(1));
    expect(resolveProposalColor({ batchIndex: 0 })).not.toBe(
      resolveProposalColor({ batchIndex: 1 })
    );
  });
});

describe('inferColorCategory', () => {
  it('detects study tasks', () => {
    expect(inferColorCategory('Read chapter 4 for history')).toBe('study');
  });
});

describe('assignColorsToProposalBatch', () => {
  it('assigns distinct colors across a batch', () => {
    const batch = assignColorsToProposalBatch([
      { type: 'CREATE_TASK', title: 'Task A', description: 'Do thing', payload: {} },
      { type: 'CREATE_TASK', title: 'Task B', description: 'Do other', payload: {} },
      { type: 'CREATE_TIME_BLOCK', title: 'Block C', description: 'Schedule', payload: {} },
    ]);

    const colors = batch.map((p) => p.payload.color);
    expect(colors[0]).toMatch(/^#[0-9A-Fa-f]{6}$/);
    expect(colors[1]).toMatch(/^#[0-9A-Fa-f]{6}$/);
    expect(new Set(colors).size).toBe(3);
  });
});
