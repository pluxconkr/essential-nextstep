/**
 * Design tokens — the only file where a colour, a font size or a weight is written.
 *
 * Register: a first-party iOS utility (grouped inset lists, system type, one accent).
 * One accent (teal), four labelled track colours, three semantic states. Light only.
 * Text on any *Soft fill is ink/ink2; the tone colour goes on icons and headers only.
 */
import { Platform, type TextStyle } from 'react-native';

export const palette = {
  tint: '#1c6b74', // 6.2:1 on white
  tintSoft: '#e2f0f1',
  tintInk: '#0f4249',
  red: '#B3261E',
  redSoft: '#FBE9E7',
  amber: '#8A5A00',
  amberSoft: '#FFF3DB',
  green: '#1B7F4C',
  greenSoft: '#E4F3EB',
  label: '#0B0F19',
  secondaryLabel: 'rgba(60,60,67,0.75)', // 4.5:1 on both surfaces
  tertiaryLabel: 'rgba(60,60,67,0.30)',
  separator: 'rgba(60,60,67,0.16)',
  groupedBackground: '#F2F2F7',
  secondaryGroupedBackground: '#FFFFFF',
  fill: 'rgba(120,120,128,0.12)',
  white: '#FFFFFF',
} as const;

export const colors = {
  tint: palette.tint,
  tintSoft: palette.tintSoft,
  tintInk: palette.tintInk,
  red: palette.red,
  redSoft: palette.redSoft,
  amber: palette.amber,
  amberSoft: palette.amberSoft,
  green: palette.green,
  greenSoft: palette.greenSoft,
  ink: palette.label,
  ink2: palette.secondaryLabel,
  ink4: palette.tertiaryLabel,
  line: palette.separator,
  bg: palette.groupedBackground,
  surface: palette.secondaryGroupedBackground,
  fill: palette.fill,
  offlineBar: '#E5E5EA',
  offlineText: 'rgba(60,60,67,0.85)',
  white: palette.white,
  onTint: 'rgba(255,255,255,0.92)',
  tabBar: 'rgba(249,249,249,0.94)',
  tabBarEdge: '#F9F9F9',
} as const;

/** Schematic venue map fills (not geography). */
export const mapColors = {
  ground: '#F7F7F2',
  park: palette.greenSoft,
  school: '#E6EEF9',
  road: '#E5E5EA',
  pinStroke: palette.white,
} as const;

/** Track colours — used only inside a labelled TrackPill, never as a bare colour. */
export const track = {
  college: '#2b5f9e', // 6.5:1
  career: '#6a4b9c', // 6.7:1
  language: '#A3335F', // 6.6:1 — distinct from the tint so a pill never reads as an action
  study: '#4F5B66', // 7.0:1 — amber is reserved for a semantic state
} as const;

/** Soft fills for track pills (12 % of the colour over white). */
export const trackSoft = {
  college: 'rgba(43,95,158,0.12)',
  career: 'rgba(106,75,156,0.12)',
  language: 'rgba(163,51,95,0.12)',
  study: 'rgba(79,91,102,0.12)',
} as const;

export type Tone = 'tint' | 'red' | 'amber' | 'green';
export const toneColor: Record<Tone, string> = { tint: colors.tint, red: colors.red, amber: colors.amber, green: colors.green };
export const toneSoft: Record<Tone, string> = { tint: colors.tintSoft, red: colors.redSoft, amber: colors.amberSoft, green: colors.greenSoft };

export const fonts = {
  sans: Platform.select({ ios: 'System', android: 'sans-serif', default: 'System' }),
  rounded: Platform.select({ ios: 'ui-rounded', android: 'sans-serif', default: 'System' }),
} as const;

/** Tabular figures so digits never jitter. */
export const tabular: TextStyle = { fontVariant: ['tabular-nums'] };

export const radius = { group: 12, button: 12, tag: 6, control: 8 } as const;
/** Horizontal page margin (iOS inset grouped). */
export const GUTTER = 16;
/** Minimum touch target (pt). */
export const MIN_TAP = 44;
/** Cell horizontal padding inside a group. */
export const CELL_PAD = 16;

/** iOS text styles at default Dynamic Type. Body ≥ 15. */
export const type = {
  largeTitle: { fontSize: 28, lineHeight: 34, fontWeight: '700' as const, letterSpacing: -0.4, color: colors.ink },
  title2: { fontSize: 22, lineHeight: 28, fontWeight: '700' as const, letterSpacing: -0.2, color: colors.ink },
  title3: { fontSize: 20, lineHeight: 25, fontWeight: '600' as const, letterSpacing: -0.2, color: colors.ink },
  headline: { fontSize: 17, lineHeight: 22, fontWeight: '600' as const, letterSpacing: -0.41, color: colors.ink },
  body: { fontSize: 17, lineHeight: 22, fontWeight: '400' as const, letterSpacing: -0.41, color: colors.ink },
  /** Multi-sentence reading text (step "why"): body size with a roomier line. */
  paragraph: { fontSize: 17, lineHeight: 24, fontWeight: '400' as const, letterSpacing: -0.41, color: colors.ink },
  subheadline: { fontSize: 15, lineHeight: 20, fontWeight: '400' as const, letterSpacing: -0.24, color: colors.ink2 },
  footnote: { fontSize: 13, lineHeight: 18, fontWeight: '400' as const, letterSpacing: -0.08, color: colors.ink2 },
  caption: { fontSize: 12, lineHeight: 16, fontWeight: '400' as const, color: colors.ink2 },
  sectionHeader: { fontSize: 13, lineHeight: 18, fontWeight: '400' as const, letterSpacing: -0.08, textTransform: 'uppercase' as const, color: colors.ink2 },
  /** Days-left number on the home hero and the step header when ≤ 30 days. */
  countdown: { fontSize: 34, lineHeight: 40, fontWeight: '700' as const, letterSpacing: -0.4, color: colors.ink },
  /** Circle check-in code. */
  code: { fontFamily: fonts.rounded, fontSize: 32, lineHeight: 38, fontWeight: '600' as const, letterSpacing: 4, color: colors.ink },
  control: { fontSize: 15, lineHeight: 20, fontWeight: '500' as const, color: colors.ink },
  controlSmall: { fontSize: 13, lineHeight: 18, fontWeight: '500' as const, color: colors.ink },
  /** Tab bar labels do not scale, like UIKit. */
  tabLabel: { fontSize: 10.5, fontWeight: '500' as const },
  mapLabel: { fontSize: 9.5, lineHeight: 12, fontWeight: '600' as const, color: colors.ink2 },
  legend: { fontSize: 12.5, lineHeight: 16, fontWeight: '600' as const, color: colors.ink2 },
  pill: { fontSize: 12, lineHeight: 16, fontWeight: '600' as const, letterSpacing: 0.1 },
  avatar: { fontSize: 15, lineHeight: 18, fontWeight: '700' as const, color: colors.white },
  avatarLarge: { fontSize: 20, lineHeight: 24, fontWeight: '700' as const, color: colors.white },
} as const;
