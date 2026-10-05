/**
 * Guarded chat widgets. System messages are full-width footnote rows with a shield; blocked
 * messages render their redaction; the composer previews the guard before anything is sent.
 */
import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { classesOf, classify, isBlocked, type Finding } from '@/domain/guard';
import type { Message } from '@/domain/types';
import { locale, t } from '@/i18n';

import { Icon } from './icons';
import { Callout } from './primitives';
import { CELL_PAD, MIN_TAP, colors, radius, type } from './theme';

export function ChatBubble({ m, mentorName }: { m: Message; mentorName: string }) {
  if (m.sender === 'system') {
    return (
      <View style={styles.system} accessibilityRole="text">
        <Icon name="shield" size={14} color={colors.ink2} />
        <Text style={[type.footnote, { flex: 1 }]}>{m.body}</Text>
      </View>
    );
  }
  const mine = m.sender === 'student';
  const time = new Intl.DateTimeFormat(locale() === 'es' ? 'es-US' : 'en-US', { hour: 'numeric', minute: '2-digit', timeZone: 'America/Los_Angeles' }).format(new Date(m.sentAt));
  return (
    <View style={[styles.row, mine ? { justifyContent: 'flex-end' } : null]}>
      <View style={[styles.bubble, mine ? styles.mine : styles.theirs, m.blocked && { backgroundColor: colors.redSoft }]} accessible accessibilityLabel={`${mine ? 'You' : mentorName}, ${time}: ${m.body}`}>
        <Text style={[type.body, mine && !m.blocked && { color: colors.white }]}>{m.body}</Text>
        <Text style={[type.caption, { marginTop: 4, color: mine && !m.blocked ? colors.onTint : colors.ink2 }]}>
          {time}
          {m.pending ? ` · ${t('queued.sendsWhenOnline')}` : ''}
        </Text>
      </View>
    </View>
  );
}

const TEMPLATES_EN = ['What did you do for this step?', 'Is this deadline real?', "I don't understand this word", 'Can we meet at a circle?'];
const TEMPLATES_ES = ['¿Qué hiciste para este paso?', '¿Esta fecha límite es real?', 'No entiendo esta palabra', '¿Podemos vernos en un círculo?'];

export function guardNoticeText(findings: Finding[]): string {
  const classes = classesOf(findings);
  const en = locale() !== 'es';
  if (classes.includes('phone')) return en ? "This looks like a phone number. Numbers and addresses can't be shared here — both ways." : 'Esto parece un número de teléfono. Los números y direcciones no se pueden compartir aquí, en ninguna dirección.';
  if (classes.includes('address')) return en ? "This looks like an address. Addresses can't be shared here — both ways." : 'Esto parece una dirección. Las direcciones no se pueden compartir aquí.';
  if (classes.includes('handle')) return en ? "Social handles and emails can't be shared here. Everything stays in the app, where it is logged for safety." : 'No se pueden compartir redes sociales ni correos. Todo queda en la app, donde se registra por seguridad.';
  if (classes.includes('offline_meet')) return en ? 'Mentors and students meet only at circles and events, never one-on-one. This message would be blocked and reviewed.' : 'Mentores y estudiantes solo se ven en círculos y eventos, nunca a solas. Este mensaje se bloquearía y revisaría.';
  if (classes.includes('money')) return en ? 'No money between students and mentors. This message would be blocked and reviewed.' : 'Nada de dinero entre estudiantes y mentores. Este mensaje se bloquearía y revisaría.';
  return en ? 'This message would be blocked.' : 'Este mensaje se bloquearía.';
}

export function Composer({ onSend, disabled, scopeHint }: { onSend: (text: string) => void; disabled?: boolean; scopeHint?: string }) {
  const [text, setText] = useState('');
  const findings = text.length > 3 ? classify(text, locale()) : [];
  const blocked = isBlocked(findings);
  const templates = locale() === 'es' ? TEMPLATES_ES : TEMPLATES_EN;
  const send = () => {
    const v = text.trim();
    if (!v || blocked || disabled) return;
    onSend(v);
    setText('');
  };
  return (
    <View style={styles.composer}>
      {text.length === 0 ? (
        <View style={styles.templates}>
          {templates.map((tpl) => (
            <Pressable key={tpl} onPress={() => setText(tpl)} accessibilityRole="button" style={({ pressed }) => [styles.template, pressed && { opacity: 0.6 }]}>
              <Text maxFontSizeMultiplier={1.3} style={type.footnote}>
                {tpl}
              </Text>
            </Pressable>
          ))}
        </View>
      ) : null}
      {blocked ? (
        <View style={{ marginBottom: 8 }}>
          <Callout tone="amber" icon="warning">
            {guardNoticeText(findings)}
          </Callout>
        </View>
      ) : null}
      {scopeHint ? <Text style={[type.caption, { marginBottom: 6 }]}>{scopeHint}</Text> : null}
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 8 }}>
        <TextInput value={text} onChangeText={setText} placeholder={locale() === 'es' ? 'Escribe un mensaje' : 'Write a message'} placeholderTextColor={colors.ink4} multiline editable={!disabled} style={styles.input} accessibilityLabel="Message" testID="composer-input" />
        <Pressable onPress={send} disabled={disabled || blocked || text.trim().length === 0} accessibilityRole="button" accessibilityLabel="Send" testID="composer-send" style={({ pressed }) => [styles.send, (disabled || blocked || text.trim().length === 0) && { opacity: 0.35 }, pressed && { opacity: 0.6 }]}>
          <Icon name="send" size={30} color={colors.tint} />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', paddingHorizontal: CELL_PAD, marginVertical: 3 },
  bubble: { maxWidth: '82%', borderRadius: 18, paddingHorizontal: 14, paddingVertical: 9 },
  mine: { backgroundColor: colors.tint, borderBottomRightRadius: 6 },
  theirs: { backgroundColor: colors.surface, borderBottomLeftRadius: 6 },
  system: { flexDirection: 'row', gap: 8, alignItems: 'flex-start', paddingHorizontal: CELL_PAD, paddingVertical: 10 },
  composer: { paddingHorizontal: CELL_PAD, paddingTop: 8, backgroundColor: colors.bg },
  templates: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 8 },
  template: { backgroundColor: colors.surface, borderRadius: 14, paddingHorizontal: 12, minHeight: 32, justifyContent: 'center' },
  input: { ...type.body, flex: 1, minHeight: MIN_TAP, maxHeight: 120, backgroundColor: colors.surface, borderRadius: radius.group, paddingHorizontal: 14, paddingVertical: 10 },
  send: { width: MIN_TAP, height: MIN_TAP, alignItems: 'center', justifyContent: 'center' },
});
