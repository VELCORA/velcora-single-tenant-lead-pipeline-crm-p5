import { describe, expect, it } from 'vitest';
import {
  STAGES,
  isValidEmail,
  scoreLead,
  priorityFromScore,
  initials,
  formatTime,
  formatEyebrow,
} from './logic';

describe('logic', () => {
  it('defines all five pipeline stages including lost', () => {
    expect(STAGES.map((s) => s.key)).toEqual(['new', 'qualified', 'proposal', 'won', 'lost']);
  });

  it('validates emails (trimming whitespace)', () => {
    expect(isValidEmail('alex@company.com')).toBe(true);
    expect(isValidEmail('  ALEX@COMPANY.COM ')).toBe(true);
    expect(isValidEmail('nope')).toBe(false);
    expect(isValidEmail('a@b')).toBe(false);
  });

  it('scores leads within 0-98', () => {
    const max = scoreLead({ company: 'C', role: 'R', message: 'x'.repeat(50), phone: 'P' });
    expect(max).toBe(98);
    const min = scoreLead({ company: '', role: '', message: '', phone: '' });
    expect(min).toBe(42);
  });

  it('maps scores to priority bands', () => {
    expect(priorityFromScore(80)).toBe('hot');
    expect(priorityFromScore(60)).toBe('warm');
    expect(priorityFromScore(40)).toBe('cold');
  });

  it('builds initials from names', () => {
    expect(initials('Alex Morgan')).toBe('AM');
    expect(initials('Cher')).toBe('C');
    expect(initials('  alice   bob ')).toBe('AB');
    expect(initials('')).toBe('');
  });

  it('formats time and eyebrow without throwing', () => {
    expect(typeof formatTime(new Date().toISOString())).toBe('string');
    expect(typeof formatEyebrow()).toBe('string');
  });
});
