import { buildSearchFilter } from './orders.search';

function nameRegex(text: string): RegExp {
  const clauses = buildSearchFilter(text).$or as { customerName?: RegExp }[];
  return clauses[0].customerName as RegExp;
}

describe('buildSearchFilter', () => {
  it('matches everything for an empty or blank search', () => {
    expect(buildSearchFilter()).toEqual({});
    expect(buildSearchFilter('')).toEqual({});
    expect(buildSearchFilter('   ')).toEqual({});
  });

  it('searches both the name and the email', () => {
    const filter = buildSearchFilter('smith');

    expect(filter.$or).toHaveLength(2);
    expect(Object.keys((filter.$or as object[])[0])).toEqual(['customerName']);
    expect(Object.keys((filter.$or as object[])[1])).toEqual(['customerEmail']);
  });

  it('matches the start of any word, not the middle', () => {
    const regex = nameRegex('smith');

    expect(regex.test('smith')).toBe(true);
    expect(regex.test('john smith')).toBe(true);
    expect(regex.test('anna-smith jones')).toBe(true);
    expect(regex.test('goldsmith')).toBe(false);
  });

  it('treats dots, underscores, hyphens and @ as word breaks in emails', () => {
    const regex = nameRegex('reyn');

    expect(regex.test('garnet_reynolds-miller83@gmail.com')).toBe(true);
    expect(regex.test('garnet.reynolds@gmail.com')).toBe(true);
    expect(regex.test('a@reynolds.com')).toBe(true);
    expect(regex.test('careynolds@x.com')).toBe(false);
  });

  it('ignores letter case and surrounding spaces in the search text', () => {
    expect(nameRegex('  SMITH ').test('john smith')).toBe(true);
  });

  it('supports a phrase that starts at a word', () => {
    const regex = nameRegex('john sm');

    expect(regex.test('big john smith')).toBe(true);
    expect(regex.test('john jones smith')).toBe(false);
  });

  it('treats special characters as plain text', () => {
    expect(nameRegex('.*').test('john smith')).toBe(false);
    expect(nameRegex('(').test('john (smith)')).toBe(true);
    expect(() => nameRegex('[')).not.toThrow();
  });
});
