import { FilterQuery } from 'mongoose';
import { escapeRegex } from '../common/utils/escape-regex';
import { normalizeText } from '../common/utils/normalize-text';
import { Order } from './order.schema';

const WORD_START = '(^|[\\s._@-])';

export function buildSearchFilter(text = ''): FilterQuery<Order> {
  const term = normalizeText(text);
  const wordStart = new RegExp(WORD_START + escapeRegex(term));

  return term
    ? { $or: [{ customerName: wordStart }, { customerEmail: wordStart }] }
    : {};
}
