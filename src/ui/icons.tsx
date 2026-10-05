/**
 * Icons: SF Symbols on iOS (expo-symbols), Ionicons elsewhere. Always inline and tinted, never on a
 * background shape — the glyph and its tint carry the meaning. Decorative by default (hidden from
 * VoiceOver); pass `label` when the icon is the only content.
 */
import Ionicons from '@expo/vector-icons/Ionicons';
import { SymbolView, type SymbolWeight } from 'expo-symbols';
import type { ComponentProps } from 'react';
import { Platform, View, type StyleProp, type ViewStyle } from 'react-native';

type IonName = ComponentProps<typeof Ionicons>['name'];

const ICONS = {
  next: { sf: 'checklist', ion: 'checkbox' },
  nextOutline: { sf: 'checklist', ion: 'checkbox-outline' },
  roadmap: { sf: 'map.fill', ion: 'map' },
  roadmapOutline: { sf: 'map', ion: 'map-outline' },
  mentor: { sf: 'person.2.fill', ion: 'people' },
  mentorOutline: { sf: 'person.2', ion: 'people-outline' },
  circles: { sf: 'person.3.fill', ion: 'people-circle' },
  circlesOutline: { sf: 'person.3', ion: 'people-circle-outline' },
  growth: { sf: 'rosette', ion: 'ribbon' },
  growthOutline: { sf: 'rosette', ion: 'ribbon-outline' },
  person: { sf: 'person.crop.circle', ion: 'person-circle-outline' },
  shield: { sf: 'lock.shield', ion: 'shield-checkmark-outline' },
  flag: { sf: 'flag', ion: 'flag-outline' },
  block: { sf: 'hand.raised', ion: 'hand-left-outline' },
  back: { sf: 'chevron.left', ion: 'chevron-back' },
  chevron: { sf: 'chevron.right', ion: 'chevron-forward' },
  check: { sf: 'checkmark', ion: 'checkmark' },
  checkCircle: { sf: 'checkmark.circle.fill', ion: 'checkmark-circle' },
  circle: { sf: 'circle', ion: 'ellipse-outline' },
  clock: { sf: 'clock', ion: 'time-outline' },
  calendar: { sf: 'calendar', ion: 'calendar-outline' },
  doc: { sf: 'doc.text', ion: 'document-text-outline' },
  link: { sf: 'link', ion: 'link-outline' },
  globe: { sf: 'globe', ion: 'globe-outline' },
  family: { sf: 'figure.2.and.child.holdinghands', ion: 'home-outline' },
  bell: { sf: 'bell', ion: 'notifications-outline' },
  bus: { sf: 'bus', ion: 'bus-outline' },
  food: { sf: 'fork.knife', ion: 'restaurant-outline' },
  child: { sf: 'figure.and.child.holdinghands', ion: 'happy-outline' },
  language: { sf: 'character.bubble', ion: 'language-outline' },
  mic: { sf: 'mic', ion: 'mic-outline' },
  phone: { sf: 'phone', ion: 'call-outline' },
  qr: { sf: 'qrcode', ion: 'qr-code-outline' },
  copy: { sf: 'doc.on.doc', ion: 'copy-outline' },
  share: { sf: 'square.and.arrow.up', ion: 'share-outline' },
  camera: { sf: 'photo', ion: 'image-outline' },
  lock: { sf: 'lock', ion: 'lock-closed-outline' },
  eye: { sf: 'eye', ion: 'eye-outline' },
  eyeOff: { sf: 'eye.slash', ion: 'eye-off-outline' },
  offline: { sf: 'wifi.slash', ion: 'cloud-offline-outline' },
  warning: { sf: 'exclamationmark.triangle', ion: 'warning-outline' },
  info: { sf: 'info.circle', ion: 'information-circle-outline' },
  star: { sf: 'star', ion: 'star-outline' },
  starFill: { sf: 'star.fill', ion: 'star' },
  plus: { sf: 'plus', ion: 'add' },
  trash: { sf: 'trash', ion: 'trash-outline' },
  download: { sf: 'square.and.arrow.down', ion: 'download-outline' },
  gear: { sf: 'gearshape', ion: 'settings-outline' },
  send: { sf: 'arrow.up.circle.fill', ion: 'arrow-up-circle' },
  question: { sf: 'questionmark.circle', ion: 'help-circle-outline' },
  pin: { sf: 'mappin', ion: 'location-outline' },
  graduation: { sf: 'graduationcap', ion: 'school-outline' },
  dollar: { sf: 'dollarsign.circle', ion: 'cash-outline' },
  paperplane: { sf: 'paperplane', ion: 'paper-plane-outline' },
  rosette: { sf: 'rosette', ion: 'ribbon-outline' },
  handRaised: { sf: 'hand.raised', ion: 'hand-right-outline' },
  flagChecker: { sf: 'flag.checkered', ion: 'flag-outline' },
  docPlus: { sf: 'doc.badge.plus', ion: 'document-attach-outline' },
  sealCheck: { sf: 'checkmark.seal', ion: 'ribbon-outline' },
  map: { sf: 'map', ion: 'map-outline' },
  people: { sf: 'person.3', ion: 'people-outline' },
} as const;

export type IconName = keyof typeof ICONS;

/** Badge icons come from content as SF Symbol names; map the ones we use to Ionicons fallbacks. */
const SF_TO_ION: Record<string, IonName> = {
  'dollarsign.circle': 'cash-outline',
  'checkmark.seal': 'ribbon-outline',
  map: 'map-outline',
  graduationcap: 'school-outline',
  paperplane: 'paper-plane-outline',
  globe: 'globe-outline',
  'person.3': 'people-outline',
  'hand.raised': 'hand-right-outline',
  'doc.badge.plus': 'document-attach-outline',
  'flag.checkered': 'flag-outline',
  star: 'star-outline',
};

export function Icon({ name, size = 20, color, weight = 'regular', style, label }: { name: IconName; size?: number; color: string; weight?: SymbolWeight; style?: StyleProp<ViewStyle>; label?: string }) {
  const def = ICONS[name];
  return <Symbol sf={def.sf} ion={def.ion} size={size} color={color} weight={weight} style={style} label={label} />;
}

/** An icon named by content (badges). Unknown names fall back to a rosette. */
export function ContentIcon({ sf, size = 20, color, style, label }: { sf: string; size?: number; color: string; style?: StyleProp<ViewStyle>; label?: string }) {
  return <Symbol sf={sf} ion={SF_TO_ION[sf] ?? 'ribbon-outline'} size={size} color={color} weight="regular" style={style} label={label} />;
}

function Symbol({ sf, ion, size, color, weight, style, label }: { sf: string; ion: IonName; size: number; color: string; weight: SymbolWeight; style?: StyleProp<ViewStyle>; label?: string }) {
  const a11y = label ? { accessible: true as const, accessibilityLabel: label, accessibilityRole: 'image' as const } : { accessible: false as const, importantForAccessibility: 'no-hide-descendants' as const, accessibilityElementsHidden: true };
  if (Platform.OS === 'ios') {
    return (
      <View style={[{ width: size, height: size }, style]} {...a11y}>
        <SymbolView name={sf as never} size={size} tintColor={color} weight={weight} resizeMode="scaleAspectFit" fallback={<Ionicons name={ion} size={size} color={color} />} />
      </View>
    );
  }
  return (
    <View style={[{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }, style]} {...a11y}>
      <Ionicons name={ion} size={size} color={color} />
    </View>
  );
}
