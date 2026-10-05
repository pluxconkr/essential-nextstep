import { classesOf, classify, isBlocked, redact, reportFor } from '@/domain/guard';

const classes = (s: string) => classesOf(classify(s));

describe('guard: contact information is blocked both directions', () => {
  test.each([
    'call me at (714) 555-0199',
    'my number is 714.555.0199',
    'text +1 714 555 0199 tonight',
    '7145550199',
    'llámame al 714-555-0199',
  ])('phone: %s', (s) => expect(classes(s)).toContain('phone'));

  test.each(['I live at 1234 Main St', 'come to 55 Calle Verde', '2200 Harbor Blvd apt 4', 'Santa Ana, CA 92701'])('address: %s', (s) => expect(classes(s)).toContain('address'));

  test.each(['add me on snap daniela_r', 'my insta is @dani.r', 'email me ana.m@gmail.com', 'whatsapp: dani2025', 'agrégame en instagram dani'])('handle: %s', (s) => expect(classes(s)).toContain('handle'));

  test('redacts blocked spans and keeps the rest', () => {
    const f = classify('Thanks! Call me at (714) 555-0199 after 6.');
    expect(isBlocked(f)).toBe(true);
    expect(redact('Thanks! Call me at (714) 555-0199 after 6.', f)).toBe('Thanks! Call me at [blocked: phone number] after 6.');
  });
});

describe('guard: off-platform meetings and money', () => {
  test.each(['we could meet alone after school', 'I can pick you up at 5', 'come over to my place', "don't tell your mom", 'nuestro secreto', 'te recojo después'])('offline_meet: %s', (s) =>
    expect(classes(s)).toContain('offline_meet'),
  );
  test.each(['send it on venmo', 'I can zelle you $40', "I'll pay you for it", 'te pago mañana', 'buy a gift card'])('money: %s', (s) => expect(classes(s)).toContain('money'));

  test('fee amounts and waivers are not payments between users', () => {
    expect(classes('The CSU application fee is $70 but most students here get the fee waiver')).not.toContain('money');
    expect(classes('$0 fee with the waiver')).not.toContain('money');
  });
});

describe('guard: crisis, immigration and homework are delivered with a note', () => {
  test.each(['sometimes I want to die', 'I have been cutting myself', 'he hits me when he drinks', 'quiero morirme', 'me pega'])('crisis: %s', (s) => {
    const f = classify(s);
    expect(classesOf(f)).toContain('crisis');
    expect(isBlocked(f)).toBe(false);
  });
  test('immigration terms route; "status" and "papers" count only next to an immigration term', () => {
    expect(classes('can they deport my dad if I apply?')).toContain('immigration_legal');
    expect(classes('is my status a problem for the visa?')).toContain('immigration_legal');
    expect(classes('what is my FAFSA status?')).not.toContain('immigration_legal');
    expect(classes('the papers are due Friday')).not.toContain('immigration_legal');
  });
  test('homework answers are nudged, not blocked', () => {
    const f = classify('can you send me the answers for the chem quiz');
    expect(classesOf(f)).toEqual(['homework']);
    expect(isBlocked(f)).toBe(false);
  });
});

describe('guard: negatives that must pass clean', () => {
  test.each([
    'Cal Grant deadline is March 2',
    'My GPA is 3.2 and I need the Cal Grant GPA verification',
    'The code is 482913',
    'Room 214 at Valley High on Thursday',
    'I got to the parent tax section and stopped. My mom filed with an ITIN.',
    'You use the ITIN in the parent SSN field — it is allowed.',
    'Ask your mom for the 2024 1040 before Friday',
    'Cash for College night is Feb 11 at 6pm, dinner provided',
    'La fecha límite es el 2 de marzo',
    'Can we meet at the Tuesday circle?',
  ])('%s', (s) => expect(classify(s)).toEqual([]));
});

describe('guard: what the guard itself reports', () => {
  const f = (s: string) => classify(s);
  test('crisis → urgent, counselor, no freeze', () => {
    expect(reportFor(f('I want to die'), 'student', 'under_18')).toEqual({ kind: 'urgent', cls: 'crisis', freeze: false, counselor: true });
  });
  test('mentor asks an under-18 student to meet alone → urgent and freeze', () => {
    expect(reportFor(f('we could meet alone'), 'mentor', 'under_18')).toEqual({ kind: 'urgent', cls: 'offline_meet', freeze: true, counselor: false });
  });
  test('the same words from a student, or to an adult, open a standard report without a freeze', () => {
    expect(reportFor(f('we could meet alone'), 'student', 'adult')).toEqual({ kind: 'standard', cls: 'offline_meet' });
    expect(reportFor(f('we could meet alone'), 'mentor', 'adult')).toEqual({ kind: 'standard', cls: 'offline_meet' });
  });
  test('money → standard; contact info alone → none (blocked, not reported)', () => {
    expect(reportFor(f('zelle me $20'), 'mentor', 'under_18')).toEqual({ kind: 'standard', cls: 'money' });
    expect(reportFor(f('call 714-555-0199'), 'mentor', 'under_18')).toEqual({ kind: 'none' });
  });
});
