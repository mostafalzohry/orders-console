import { normalizeText } from './normalize-text';

describe('normalizeText', () => {
  it('trims and lowercases', () => {
    expect(normalizeText('  John.Smith@Example.COM  ')).toBe(
      'john.smith@example.com',
    );
  });

  it('keeps inner spaces', () => {
    expect(normalizeText('John  Smith')).toBe('john  smith');
  });

  it('turns blank text into an empty string', () => {
    expect(normalizeText('   ')).toBe('');
  });
});
