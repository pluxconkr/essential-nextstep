/**
 * Building blocks in the iOS grouped-list idiom. No shadows, no borders, no icon backgrounds.
 * 44 pt targets, body ≥ 15 pt, tabular numerals. No spinners anywhere.
 */
import * as Haptics from 'expo-haptics';
import type { ReactNode } from 'react';
import { Platform, Pressable, StyleSheet, Text, TextInput, View, type PressableProps, type StyleProp, type TextInputProps, type TextProps, type TextStyle, type ViewStyle } from 'react-native';

import type { TrackKey } from '@/domain/types';
import { t } from '@/i18n';

import { Icon, type IconName } from './icons';
import { CELL_PAD, MIN_TAP, colors, radius, tabular, toneColor, toneSoft, track as trackColor, trackSoft, type Tone, type } from './theme';

// ---------- Text ----------

type TP = TextProps & { children: ReactNode; style?: StyleProp<TextStyle> };

export const LargeTitle = ({ children, style, ...r }: TP) => (
  <Text accessibilityRole="header" maxFontSizeMultiplier={1.5} style={[type.largeTitle, style]} {...r}>
    {children}
  </Text>
);
export const Title2 = ({ children, style, ...r }: TP) => (
  <Text accessibilityRole="header" style={[type.title2, style]} {...r}>
    {children}
  </Text>
);
export const Title3 = ({ children, style, ...r }: TP) => (
  <Text accessibilityRole="header" style={[type.title3, style]} {...r}>
    {children}
  </Text>
);
export const Headline = ({ children, style, ...r }: TP) => (
  <Text style={[type.headline, style]} {...r}>
    {children}
  </Text>
);
export const Body = ({ children, style, ...r }: TP) => (
  <Text style={[type.body, style]} {...r}>
    {children}
  </Text>
);
export const Subhead = ({ children, style, ...r }: TP) => (
  <Text style={[type.subheadline, style]} {...r}>
    {children}
  </Text>
);
export const Footnote = ({ children, style, ...r }: TP) => (
  <Text style={[type.footnote, style]} {...r}>
    {children}
  </Text>
);
export const Caption = ({ children, style, ...r }: TP) => (
  <Text maxFontSizeMultiplier={1.4} style={[type.caption, style]} {...r}>
    {children}
  </Text>
);

// ---------- Sections ----------

/** iOS grouped-list section header: small uppercase secondary text with inset. Optional trailing note. */
export function SectionHeader({ children, right, style }: { children: ReactNode; right?: ReactNode; style?: StyleProp<ViewStyle> }) {
  return (
    <View style={[styles.sectionHeader, style]}>
      <Text style={type.sectionHeader} accessibilityRole="header">
        {children}
      </Text>
      {right ? typeof right === 'string' ? <Text style={type.sectionHeader}>{right}</Text> : <View>{right}</View> : null}
    </View>
  );
}

/** One footnote sentence under a group. */
export function SectionFooter({ children, style }: { children: ReactNode; style?: StyleProp<TextStyle> }) {
  return <Text style={[type.footnote, styles.sectionFooter, style]}>{children}</Text>;
}

// ---------- Surfaces ----------

/** Inset grouped container (white, 12 pt radius). Children are usually Cells or padded content. */
export function Group({ children, style, padded = false, tone, testID }: { children: ReactNode; style?: StyleProp<ViewStyle>; padded?: boolean; tone?: Tone; testID?: string }) {
  return (
    <View style={[styles.group, padded && styles.groupPadded, tone && { backgroundColor: toneSoft[tone] }, style]} testID={testID}>
      {children}
    </View>
  );
}

/**
 * A grouped-list cell: optional leading icon (tinted, no background), title + subtitle,
 * trailing value and/or chevron. Separator inset to the title edge, like UIKit.
 */
export function Cell({
  icon,
  iconColor = colors.tint,
  leading,
  title,
  subtitle,
  value,
  valueColor,
  accessory = 'none',
  trailing,
  onPress,
  last,
  disabled,
  testID,
  accessibilityLabel,
  accessibilityRole,
  accessibilityState,
  titleStyle,
  numberOfLines,
}: {
  icon?: IconName;
  iconColor?: string;
  leading?: ReactNode;
  title: ReactNode;
  subtitle?: ReactNode;
  value?: string;
  valueColor?: string;
  accessory?: 'none' | 'chevron' | 'check';
  trailing?: ReactNode;
  onPress?: () => void;
  last?: boolean;
  disabled?: boolean;
  testID?: string;
  accessibilityLabel?: string;
  accessibilityRole?: 'button' | 'checkbox' | 'link' | 'radio';
  accessibilityState?: PressableProps['accessibilityState'];
  titleStyle?: StyleProp<TextStyle>;
  numberOfLines?: number;
}) {
  const content = (
    <View style={[styles.cell, disabled && { opacity: 0.45 }]}>
      {leading ? <View style={styles.cellIcon}>{leading}</View> : icon ? <Icon name={icon} size={22} color={iconColor} style={styles.cellIcon} /> : null}
      <View style={[styles.cellBody, !last && styles.cellSeparator]}>
        <View style={{ flex: 1 }}>
          {typeof title === 'string' ? (
            <Text style={[type.body, titleStyle]} numberOfLines={numberOfLines}>
              {title}
            </Text>
          ) : (
            title
          )}
          {subtitle ? typeof subtitle === 'string' ? <Text style={[type.footnote, { marginTop: 2 }]}>{subtitle}</Text> : subtitle : null}
        </View>
        {value ? (
          <Text maxFontSizeMultiplier={1.4} style={[styles.cellValue, tabular, valueColor ? { color: valueColor } : null]}>
            {value}
          </Text>
        ) : null}
        {trailing}
        {accessory === 'chevron' ? <Icon name="chevron" size={14} color={colors.ink4} weight="semibold" style={{ marginLeft: 6 }} /> : null}
        {accessory === 'check' ? <Icon name="check" size={18} color={colors.tint} weight="semibold" style={{ marginLeft: 6 }} /> : null}
      </View>
    </View>
  );
  if (!onPress) return <View testID={testID}>{content}</View>;
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole={accessibilityRole ?? 'button'}
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled: !!disabled, ...(accessibilityState ?? {}) }}
      testID={testID}
      style={({ pressed }) => pressed && styles.pressed}>
      {content}
    </Pressable>
  );
}

/** Inline callout: icon in the tone colour, headline, body. Text stays ink on the soft fill. */
export function Callout({ tone = 'tint', icon, title, children, action, style }: { tone?: Tone; icon?: IconName; title?: string; children?: ReactNode; action?: ReactNode; style?: StyleProp<ViewStyle> }) {
  return (
    <View style={[styles.callout, { backgroundColor: toneSoft[tone] }, style]} accessibilityRole="summary">
      <View style={{ flexDirection: 'row', gap: 10 }}>
        {icon ? <Icon name={icon} size={20} color={toneColor[tone]} style={{ marginTop: 1 }} /> : null}
        <View style={{ flex: 1 }}>
          {title ? <Text style={type.headline}>{title}</Text> : null}
          {children ? typeof children === 'string' ? <Text style={[type.subheadline, title ? { marginTop: 3 } : null]}>{children}</Text> : children : null}
        </View>
      </View>
      {action ? <View style={{ marginTop: 10 }}>{action}</View> : null}
    </View>
  );
}

// ---------- Controls ----------

export type ButtonVariant = 'primary' | 'tonal' | 'secondary' | 'red' | 'green' | 'ghost';

export function Button({ title, onPress, variant = 'primary', icon, disabled, small, style, testID, haptic = 'light' }: { title: string; onPress: () => void; variant?: ButtonVariant; icon?: IconName; disabled?: boolean; small?: boolean; style?: StyleProp<ViewStyle>; testID?: string; haptic?: 'light' | 'success' | 'warning' | 'none' }) {
  const bg = variant === 'primary' ? colors.tint : variant === 'tonal' ? colors.tintSoft : variant === 'secondary' ? colors.fill : variant === 'red' ? colors.redSoft : variant === 'green' ? colors.green : 'transparent';
  const fg = variant === 'primary' || variant === 'green' ? colors.white : variant === 'red' ? colors.red : variant === 'ghost' || variant === 'tonal' ? colors.tint : colors.ink;
  return (
    <Pressable
      onPress={() => {
        if (Platform.OS !== 'web' && haptic !== 'none') {
          if (haptic === 'light') void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          else void Haptics.notificationAsync(haptic === 'success' ? Haptics.NotificationFeedbackType.Success : Haptics.NotificationFeedbackType.Warning);
        }
        onPress();
      }}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityState={{ disabled: !!disabled }}
      testID={testID}
      style={({ pressed }) => [styles.button, small && styles.buttonSmall, { backgroundColor: bg }, disabled && { opacity: 0.4 }, pressed && { opacity: 0.75 }, style]}>
      {icon ? <Icon name={icon} size={18} color={fg} /> : null}
      <Text maxFontSizeMultiplier={1.5} style={[type.headline, { color: fg, textAlign: 'center' }]}>
        {title}
      </Text>
    </Pressable>
  );
}

/** iOS-style segmented control. With four or more options every label uses the small control size. */
export function Segmented<T extends string>({ options, value, onChange, style }: { options: { value: T; label: string }[]; value: T | null; onChange: (v: T) => void; style?: StyleProp<ViewStyle> }) {
  const small = options.length >= 4;
  return (
    <View style={[styles.segmented, style]} accessibilityRole="tablist">
      {options.map((o) => {
        const on = o.value === value;
        return (
          <Pressable key={o.value} onPress={() => onChange(o.value)} accessibilityRole="tab" accessibilityState={{ selected: on }} style={[styles.segment, on && styles.segmentOn]}>
            <Text maxFontSizeMultiplier={1.3} numberOfLines={1} style={[small ? type.controlSmall : type.control, on && { fontWeight: type.headline.fontWeight }]}>
              {o.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/** Filter chip row. */
export function Chips<T extends string>({ options, value, onChange }: { options: { value: T; label: string }[]; value: T; onChange: (v: T) => void }) {
  return (
    <View style={styles.chips} accessibilityRole="tablist">
      {options.map((o) => {
        const on = o.value === value;
        return (
          <Pressable key={o.value} onPress={() => onChange(o.value)} accessibilityRole="tab" accessibilityState={{ selected: on }} style={[styles.chip, on && styles.chipOn]}>
            <Text maxFontSizeMultiplier={1.3} style={[type.control, on && { color: colors.tintInk, fontWeight: type.headline.fontWeight }]}>
              {o.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function Toggle({ value, onChange, label }: { value: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <Pressable onPress={() => onChange(!value)} accessibilityRole="switch" accessibilityLabel={label} accessibilityState={{ checked: value }} hitSlop={8} style={[styles.toggle, value && { backgroundColor: colors.green }]}>
      <View style={[styles.knob, value && { transform: [{ translateX: 20 }] }]} />
    </Pressable>
  );
}

export function Field(props: TextInputProps & { label?: string }) {
  const { label, style, ...rest } = props;
  return (
    <View style={{ gap: 6 }}>
      {label ? <Text style={type.footnote}>{label}</Text> : null}
      <TextInput placeholderTextColor={colors.ink4} accessibilityLabel={label} style={[styles.field, style]} {...rest} />
    </View>
  );
}

/** Label · value rows (practical tables). */
export function KeyValue({ rows }: { rows: { label: string; value: string }[] }) {
  return (
    <View style={{ gap: 8 }}>
      {rows.map((r) => (
        <View key={r.label} style={{ flexDirection: 'row', gap: 12 }}>
          <Text style={[type.subheadline, { width: 112 }]}>{r.label}</Text>
          <Text style={[type.body, { flex: 1 }]}>{r.value}</Text>
        </View>
      ))}
    </View>
  );
}

/** Label + bar + "8 / 14". Never a bare percentage. */
export function ProgressBar({ label, done, total, color = colors.tint, valueText }: { label: string; done: number; total: number; color?: string; valueText?: string }) {
  const pct = total > 0 ? Math.min(1, done / total) : 0;
  return (
    <View style={{ gap: 4 }} accessible accessibilityRole="progressbar" accessibilityLabel={`${label}, ${valueText ?? `${done} of ${total}`}`} accessibilityValue={{ min: 0, max: total, now: done }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <Text style={type.subheadline}>{label}</Text>
        <Text style={[type.subheadline, tabular, { color: colors.ink }]}>{valueText ?? `${done} / ${total}`}</Text>
      </View>
      <View style={styles.barTrack}>
        <View style={[styles.barFill, { width: `${pct * 100}%`, backgroundColor: color }]} />
      </View>
    </View>
  );
}

/** Labelled track pill — colour never stands alone. */
export function TrackPill({ track: key, label }: { track: TrackKey; label: string }) {
  return (
    <View style={[styles.pill, { backgroundColor: trackSoft[key] }]}>
      <Text maxFontSizeMultiplier={1.3} style={[type.pill, { color: trackColor[key] }]}>
        {label}
      </Text>
    </View>
  );
}

/** Small text tag in a tone colour (no fill) — "overdue", "self-reported", "demo". */
export function Tag({ children, tone = 'tint', filled = false }: { children: string; tone?: Tone | 'grey'; filled?: boolean }) {
  const color = tone === 'grey' ? colors.ink2 : toneColor[tone];
  const bg = filled ? (tone === 'grey' ? colors.fill : toneSoft[tone]) : 'transparent';
  return (
    <View style={[styles.tag, { backgroundColor: bg }]}>
      <Text maxFontSizeMultiplier={1.3} style={[type.pill, { color: filled && tone !== 'grey' ? colors.ink : color }]}>
        {children}
      </Text>
    </View>
  );
}

/** Initials avatar — there are no photos anywhere in the product. */
export function InitialsAvatar({ initials, size = 40, verified, color = colors.tint }: { initials: string; size?: number; verified?: boolean; color?: string }) {
  return (
    <View style={{ width: size, height: size }} accessible={false}>
      <View style={[styles.avatar, { width: size, height: size, borderRadius: size / 2, backgroundColor: color }]}>
        <Text style={size >= 52 ? type.avatarLarge : type.avatar}>{initials}</Text>
      </View>
      {verified ? (
        <View style={styles.verifiedDot}>
          <Icon name="check" size={9} color={colors.white} weight="bold" />
        </View>
      ) : null}
    </View>
  );
}

/** Five short bars for fit or confidence; always paired with a word. */
export function Bars({ filled, total = 5, color = colors.tint }: { filled: number; total?: number; color?: string }) {
  return (
    <View style={{ flexDirection: 'row', gap: 2 }} accessible={false}>
      {Array.from({ length: total }, (_, i) => (
        <View key={i} style={[styles.bar, { backgroundColor: i < filled ? color : colors.fill }]} />
      ))}
    </View>
  );
}

/** Empty state: one cell with a muted icon, a title and a one-line subtitle. Never a blank group. */
export function Empty({ icon, title, subtitle }: { icon: IconName; title: string; subtitle?: string }) {
  return (
    <Group>
      <Cell icon={icon} iconColor={colors.ink4} title={title} subtitle={subtitle} last />
    </Group>
  );
}

/** Two-line label for a badge or status that must never be colour alone. */
export function Dot({ color, size = 8 }: { color: string; size?: number }) {
  return <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: color }} />;
}

export function Spacer({ h = 12 }: { h?: number }) {
  return <View style={{ height: h }} />;
}

export function Row({ children, gap = 8, style }: { children: ReactNode; gap?: number; style?: StyleProp<ViewStyle> }) {
  return <View style={[{ flexDirection: 'row', alignItems: 'center', gap, flexWrap: 'wrap' }, style]}>{children}</View>;
}

export function pluralLabel(n: number, one: string, other: string): string {
  return n === 1 ? one : other;
}

export { t };

const styles = StyleSheet.create({
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', paddingHorizontal: CELL_PAD, paddingTop: 22, paddingBottom: 7 },
  sectionFooter: { paddingHorizontal: CELL_PAD, paddingTop: 7, paddingBottom: 2 },
  group: { backgroundColor: colors.surface, borderRadius: radius.group, overflow: 'hidden' },
  groupPadded: { padding: CELL_PAD },
  cell: { flexDirection: 'row', alignItems: 'center', minHeight: MIN_TAP, paddingLeft: CELL_PAD },
  cellIcon: { marginRight: 12 },
  cellBody: { flex: 1, flexDirection: 'row', alignItems: 'center', paddingVertical: 11, paddingRight: CELL_PAD, minHeight: MIN_TAP },
  cellSeparator: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.line },
  cellValue: { ...type.body, color: colors.ink2, marginLeft: 8 },
  pressed: { backgroundColor: colors.fill },
  callout: { borderRadius: radius.group, padding: CELL_PAD },
  button: { minHeight: 50, borderRadius: radius.button, paddingHorizontal: 16, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8 },
  buttonSmall: { minHeight: MIN_TAP, paddingHorizontal: 14 },
  segmented: { flexDirection: 'row', backgroundColor: colors.fill, borderRadius: radius.control + 1, padding: 2 },
  segment: { flex: 1, minHeight: 32, alignItems: 'center', justifyContent: 'center', borderRadius: radius.control, paddingHorizontal: 6 },
  segmentOn: { backgroundColor: colors.surface },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { minHeight: 36, paddingHorizontal: 14, borderRadius: 18, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
  chipOn: { backgroundColor: colors.tintSoft },
  toggle: { width: 51, height: 31, borderRadius: 16, backgroundColor: colors.fill, padding: 2, justifyContent: 'center' },
  knob: { width: 27, height: 27, borderRadius: 14, backgroundColor: colors.white },
  field: { ...type.body, minHeight: MIN_TAP, backgroundColor: colors.surface, borderRadius: radius.control + 2, paddingHorizontal: 12, paddingVertical: 10 },
  barTrack: { height: 6, borderRadius: 3, backgroundColor: colors.fill, overflow: 'hidden' },
  barFill: { height: 6, borderRadius: 3 },
  pill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: radius.tag, alignSelf: 'flex-start' },
  tag: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: radius.tag, alignSelf: 'flex-start' },
  avatar: { alignItems: 'center', justifyContent: 'center' },
  verifiedDot: { position: 'absolute', right: -2, bottom: -2, width: 16, height: 16, borderRadius: 8, backgroundColor: colors.green, borderWidth: 2, borderColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
  bar: { width: 6, height: 14, borderRadius: 2 },
});
