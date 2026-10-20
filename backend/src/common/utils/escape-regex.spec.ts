import { escapeRegex } from './escape-regex';

describe('escapeRegex', () => {
  it('escapes every regular-expression special character', () => {
    expect(escapeRegex('.*+?^${}()|[]\\')).toBe(
      '\\.\\*\\+\\?\\^\\$\\{\\}\\(\\)\\|\\[\\]\\\\',
    );
  });

  it('leaves ordinary text unchanged', () => {
    expect(escapeRegex('john smith 42')).toBe('john smith 42');
  });

  it('makes input match only itself', () => {
    expect(new RegExp(escapeRegex('.*')).test('abc')).toBe(false);
    expect(new RegExp(escapeRegex('.*')).test('a.*b')).toBe(true);
    expect(() => new RegExp(escapeRegex('('))).not.toThrow();
  });
});
