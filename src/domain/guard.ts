/**
 * Message guard (spec §14 automatic guardrails). Pure text classification shared by the composer
 * preview on the phone and the authoritative check in the message route.
 *
 *   phone / address / handle  → block both directions, system note
 *   offline_meet / money      → block; original kept for review; standard report, no freeze —
 *                               except offline_meet from a mentor to an under-18 student: urgent + freeze
 *   crisis                    → deliver; resources shown to the student; counselor alerted
 *   immigration_legal         → deliver with a routed note; mentors told not to answer
 *   homework                  → nudge; repeat opens a ticket
 */
import type { AgeBand } from './types';

export type GuardClass = 'phone' | 'address' | 'handle' | 'offline_meet' | 'money' | 'crisis' | 'immigration_legal' | 'homework';
export type GuardAction = 'block' | 'block_flag' | 'deliver_resources' | 'route' | 'nudge';

export interface Finding {
  cls: GuardClass;
  action: GuardAction;
  start: number;
  end: number;
  text: string;
}

export const ACTION_FOR: Record<GuardClass, GuardAction> = {
  phone: 'block',
  address: 'block',
  handle: 'block',
  offline_meet: 'block_flag',
  money: 'block_flag',
  crisis: 'deliver_resources',
  immigration_legal: 'route',
  homework: 'nudge',
};

const PHONE = /(?:\+?1[\s.-]?)?\(?\b\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}\b/g;
const ADDRESS = /\b\d{1,6}\s+(?:[A-Za-zÀ-ÿ]+\.?\s){0,3}(?:st|street|ave|avenue|blvd|boulevard|rd|road|dr|drive|ln|lane|ct|court|way|pl|place|calle|avenida|av)\b\.?/gi;
const APT = /\b(?:apt|apartment|unit|suite|depto|departamento)\s*#?\s*\d+[a-z]?\b/gi;
const ZIP = /\b(?:ca|california)\s+\d{5}\b/gi;
const EMAIL = /\b[\w.+-]+@[\w-]+\.[\w.-]+\b/gi;
const AT_HANDLE = /(?<![\w.])@[a-z0-9_.]{3,}/gi;
const MESSENGER = /\b(?:snap(?:chat)?|insta(?:gram)?|ig|tiktok|whatsapp|telegram|discord|signal|facebook|fb)\b[\s:]*(?:is|es|me|-)?\s*@?[a-z0-9_.]{3,}/gi;
const ADD_ME = /\b(?:add me on|agr[eé]game en|búscame en|buscame en|follow me on|dm me)\b/gi;
const OFFLINE_MEET = /\b(?:meet (?:me )?alone|just (?:you and me|us two|us)|pick you up|come over(?: to my)?|my (?:car|place|apartment|house)|don'?t tell(?: anyone| your (?:mom|dad|parents))?|our secret|solos? (?:tú y yo|después de clases)|te recojo|ven a mi casa|no le digas a nadie|nuestro secreto)\b/gi;
const MONEY_APP = /\b(?:venmo|cash ?app|zelle|paypal|apple pay|western union)\b/gi;
const MONEY_AMOUNT = /\$\s?(?:[1-9]\d{0,5}(?:[.,]\d{1,2})?)\b/g;
/** A dollar amount in a message about fees, waivers, aid or wages is school business, not a payment between users. */
const MONEY_CONTEXT_OK = /\b(?:fee|fees|waiver|tuition|cost|costs|scholarship|grant|award|aid|salary|wage|wages|per hour|stipend|price|deposit|cuota|beca|costo|precio)\b/i;
const MONEY_VERB = /\b(?:pay you|i'?ll pay|send (?:me )?money|te pago|mándame dinero|mandame dinero|gift card)\b/gi;
const CRISIS = /\b(?:kill myself|suicid(?:e|al)|end my life|want to die|wanna die|hurt myself|cut(?:ting)? myself|self[- ]harm|no reason to live|better off dead|(?:he|she|they) hits? me|abus(?:es|ing) me|touch(?:ed|es) me|quiero morir(?:me)?|matarme|suicid(?:io|a)|me pega|me golpea|me lastimo|me hago daño|abusa de m[ií])\b/gi;
const IMMIGRATION_CORE = /\b(?:deport(?:ed|ation|ar|ación)?|undocumented|indocumentad[oa]s?|green card|visa|asylum|asilo|daca|la migra|immigration lawyer|abogad[oa] de inmigraci[oó]n)\b|\bICE\b/g;
const IMMIGRATION_CONDITIONAL = /\b(?:status|papers|papeles|estatus|legal(?:ly)?)\b/gi;
const HOMEWORK = /\b(?:answers? (?:for|to) (?:the|my|this)|answer key|send me the (?:test|exam|quiz)|(?:do|write) my (?:essay|homework|assignment)|respuestas de(?:l)? (?:examen|tarea)|hazme la tarea|escribe mi ensayo)\b/gi;

function collect(text: string, re: RegExp, cls: GuardClass, out: Finding[]): void {
  re.lastIndex = 0;
  for (const m of text.matchAll(re)) {
    if (m.index == null || m[0].length === 0) continue;
    out.push({ cls, action: ACTION_FOR[cls], start: m.index, end: m.index + m[0].length, text: m[0] });
  }
}

/** Classify a message. Findings may overlap; `redact()` merges them. Locale is accepted for future per-language lists. */
export function classify(text: string, _locale: 'en' | 'es' = 'en'): Finding[] {
  const out: Finding[] = [];
  collect(text, PHONE, 'phone', out);
  collect(text, ADDRESS, 'address', out);
  collect(text, APT, 'address', out);
  collect(text, ZIP, 'address', out);
  collect(text, EMAIL, 'handle', out);
  collect(text, AT_HANDLE, 'handle', out);
  collect(text, MESSENGER, 'handle', out);
  collect(text, ADD_ME, 'handle', out);
  collect(text, OFFLINE_MEET, 'offline_meet', out);
  collect(text, MONEY_APP, 'money', out);
  if (!MONEY_CONTEXT_OK.test(text)) collect(text, MONEY_AMOUNT, 'money', out);
  collect(text, MONEY_VERB, 'money', out);
  collect(text, CRISIS, 'crisis', out);
  const core: Finding[] = [];
  collect(text, IMMIGRATION_CORE, 'immigration_legal', core);
  out.push(...core);
  if (core.length > 0) collect(text, IMMIGRATION_CONDITIONAL, 'immigration_legal', out);
  collect(text, HOMEWORK, 'homework', out);
  // Email addresses contain '@name' pieces; drop handle findings fully inside an email finding.
  const emails = out.filter((f) => f.cls === 'handle' && /@[\w-]+\.[\w.-]+$/.test(f.text));
  const deduped = out.filter((f) => !(f.cls === 'handle' && !emails.includes(f) && emails.some((e) => f.start >= e.start && f.end <= e.end)));
  return deduped.sort((a, b) => a.start - b.start || b.end - a.end);
}

export const BLOCKING: readonly GuardAction[] = ['block', 'block_flag'];

export function isBlocked(findings: readonly Finding[]): boolean {
  return findings.some((f) => BLOCKING.includes(f.action));
}

export function classesOf(findings: readonly Finding[]): GuardClass[] {
  return [...new Set(findings.map((f) => f.cls))];
}

/** Replace blocked spans with `[blocked: phone number]`-style markers. Non-blocking classes are left intact. */
export function redact(text: string, findings: readonly Finding[]): string {
  const spans = findings
    .filter((f) => BLOCKING.includes(f.action))
    .sort((a, b) => a.start - b.start || b.end - a.end);
  if (spans.length === 0) return text;
  let out = '';
  let cursor = 0;
  let lastEnd = -1;
  for (const s of spans) {
    if (s.start < lastEnd) continue; // overlapping
    out += text.slice(cursor, s.start) + `[blocked: ${LABEL[s.cls]}]`;
    cursor = s.end;
    lastEnd = s.end;
  }
  return out + text.slice(cursor);
}

const LABEL: Record<GuardClass, string> = {
  phone: 'phone number',
  address: 'address',
  handle: 'contact handle',
  offline_meet: 'meeting request',
  money: 'payment',
  crisis: 'crisis',
  immigration_legal: 'legal question',
  homework: 'homework request',
};

export type ReportDecision = { kind: 'none' } | { kind: 'standard'; cls: GuardClass } | { kind: 'urgent'; cls: GuardClass; freeze: boolean; counselor: boolean };

/**
 * What the guard itself opens (§3.8): block+flag classes open a standard report without freezing;
 * an off-platform meeting request from a mentor to an under-18 student is urgent and freezes;
 * crisis language is urgent with counselor access and no freeze.
 */
export function reportFor(findings: readonly Finding[], senderRole: 'student' | 'mentor', recipientAgeBand: AgeBand): ReportDecision {
  const classes = classesOf(findings);
  if (classes.includes('crisis')) return { kind: 'urgent', cls: 'crisis', freeze: false, counselor: true };
  if (classes.includes('offline_meet')) {
    if (senderRole === 'mentor' && recipientAgeBand === 'under_18') return { kind: 'urgent', cls: 'offline_meet', freeze: true, counselor: false };
    return { kind: 'standard', cls: 'offline_meet' };
  }
  if (classes.includes('money')) return { kind: 'standard', cls: 'money' };
  return { kind: 'none' };
}
