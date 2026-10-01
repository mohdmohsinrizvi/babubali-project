import type { LanguageCode, TranslationSchema } from '../types';
import { en } from './en';
import { hi } from './hi';
import { ur } from './ur';
import { ta } from './ta';
import { te } from './te';

export const translations: Record<LanguageCode, TranslationSchema> = {
  en,
  hi,
  ur,
  ta,
  te,
};
