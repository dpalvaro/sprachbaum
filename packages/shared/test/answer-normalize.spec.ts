import { describe, expect, it } from 'vitest';
import {
  canonicalFormIfDifferent,
  matchesAccepted,
  normalizeAnswer,
} from '../src/answer-normalize';

describe('normalizeAnswer', () => {
  it('trims and collapses internal whitespace', () => {
    expect(normalizeAnswer('  bin   ')).toBe('bin');
  });

  it('lowercases by default', () => {
    expect(normalizeAnswer('BIN')).toBe('bin');
  });

  it('keeps case when caseSensitive is true', () => {
    expect(normalizeAnswer('Anna', { caseSensitive: true })).toBe('Anna');
  });

  it('collapses ä/ö/ü/ß to the official ue/oe/ae/ss digraph convention', () => {
    expect(normalizeAnswer('schön')).toBe(normalizeAnswer('schoen'));
    expect(normalizeAnswer('Straße')).toBe(normalizeAnswer('Strasse'));
    expect(normalizeAnswer('Mädchen')).toBe(normalizeAnswer('Maedchen'));
  });
});

describe('matchesAccepted', () => {
  it('matches an exact accepted string', () => {
    expect(matchesAccepted('bin', ['bin'])).toBe(true);
  });

  it('matches ignoring case by default', () => {
    expect(matchesAccepted('BIN', ['bin'])).toBe(true);
  });

  it('rejects a case mismatch when caseSensitive is true', () => {
    expect(matchesAccepted('anna', ['Anna'], { caseSensitive: true })).toBe(
      false,
    );
  });

  it('matches the umlaut-free spelling against the accented accept entry', () => {
    expect(matchesAccepted('Tschuss', ['Tschüss'])).toBe(true);
  });

  it('matches the accented spelling against an ASCII-only accept entry', () => {
    expect(matchesAccepted('straße', ['strasse'])).toBe(true);
  });

  it('rejects an unrelated answer', () => {
    expect(matchesAccepted('bist', ['bin'])).toBe(false);
  });

  it('tolerates surrounding and doubled whitespace', () => {
    expect(matchesAccepted('  bin  ', ['bin'])).toBe(true);
  });
});

describe('canonicalFormIfDifferent', () => {
  it('returns undefined when the answer already matches textually', () => {
    expect(canonicalFormIfDifferent('bin', ['bin'])).toBeUndefined();
    expect(canonicalFormIfDifferent('BIN', ['bin'])).toBeUndefined();
  });

  it('returns the accented canonical form when the user typed the digraph', () => {
    expect(canonicalFormIfDifferent('Tschuss', ['Tschüss'])).toBe('Tschüss');
  });

  it('prefers an accented candidate over an ASCII one when both are accepted', () => {
    expect(canonicalFormIfDifferent('schoen', ['schoen', 'schön'])).toBe(
      'schön',
    );
  });
});
