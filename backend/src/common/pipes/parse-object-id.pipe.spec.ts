import { BadRequestException } from '@nestjs/common';
import { ParseObjectIdPipe } from './parse-object-id.pipe';

describe('ParseObjectIdPipe', () => {
  const pipe = new ParseObjectIdPipe();

  it.each(['6ad921964ffea9039a77ced2', '6AD921964FFEA9039A77CED2'])(
    'accepts the 24-character hex id %s',
    (id) => {
      expect(pipe.transform(id)).toBe(id);
    },
  );

  it.each([
    ['empty text', ''],
    ['text that is not an id', 'abc'],
    ['23 characters', '6ad921964ffea9039a77ced'],
    ['25 characters', '6ad921964ffea9039a77ced22'],
    ['a non-hex character', '6ad921964ffea9039a77cedz'],
    ['12 plain characters (accepted by some libraries)', 'abcdefghijkl'],
    ['an operator-like text', '{"$ne":null}'],
    ['spaces around a valid id', ' 6ad921964ffea9039a77ced2 '],
  ])('rejects %s', (_label, value) => {
    expect(() => pipe.transform(value)).toThrow(BadRequestException);
  });
});
