import { en } from '@/i18n/en';
import { es } from '@/i18n/es';
import { locale, pick, setLocale, t, tFor, tn } from '@/i18n';

describe('i18n catalogs', () => {
  test('English and Spanish have identical key sets', () => {
    const a = Object.keys(en).sort();
    const b = Object.keys(es).sort();
    expect(b).toEqual(a);
  });
  test('every placeholder in English exists in Spanish', () => {
    for (const k of Object.keys(en) as (keyof typeof en)[]) {
      const ph = (s: string) => (s.match(/\{[a-z]+\}/gi) ?? []).sort();
      expect({ key: k, es: ph(es[k]) }).toEqual({ key: k, es: ph(en[k]) });
    }
  });
  test('no exclamation marks and no "!" shouting in either language', () => {
    for (const dict of [en, es]) for (const [k, v] of Object.entries(dict)) expect({ k, v }).not.toEqual(expect.objectContaining({ v: expect.stringMatching(/!/) }));
  });
  test('setLocale falls back to English for anything that is not Spanish', () => {
    expect(setLocale('es-MX')).toBe('es');
    expect(setLocale('vi')).toBe('en');
    expect(setLocale(undefined)).toBe('en');
    expect(locale()).toBe('en');
  });
  test('t, tn and pick', () => {
    setLocale('en');
    expect(t('home.subtitle', { name: 'Ana M.', grade: 12, school: 'Valley High' })).toBe('Ana M. · grade 12 · Valley High');
    expect(tn(1, 'due.daysLeft')).toBe('1 day left');
    expect(tn(23, 'due.daysLeft')).toBe('23 days left');
    expect(tFor('es', 'tab.roadmap')).toBe('Ruta');
    const step = { title: 'Submit', titleEs: 'Enviar' };
    expect(pick(step, 'title')).toBe('Submit');
    setLocale('es');
    expect(pick(step, 'title')).toBe('Enviar');
    setLocale('en');
  });
});
