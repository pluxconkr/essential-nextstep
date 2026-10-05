/**
 * S-07 Guarded chat — the highest-risk surface, so the most constrained: rules stated in-thread,
 * contact info blocked both directions, templates instead of a blank box, report in the header.
 * Local-first: outgoing messages are stored and queued; the server (M2) is the authority.
 */
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useRef } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { classify, isBlocked, redact } from '@/domain/guard';
import { newId } from '@/domain/ids';
import { nowIso } from '@/domain/time';
import type { Message } from '@/domain/types';
import { locale, pick, t } from '@/i18n';
import { actions, useAppState } from '@/store/appStore';
import { useMentor, useNextStep } from '@/store/derived';
import { ChatBubble, Composer } from '@/ui/chat-widgets';
import { Callout } from '@/ui/primitives';
import { BackHeader, HeaderIconButton, OfflineBanner } from '@/ui/Screen';
import { colors, type } from '@/ui/theme';

export default function ChatScreen() {
  const { matchId } = useLocalSearchParams<{ matchId: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const match = useAppState((s) => s.matches.find((m) => m.id === matchId) ?? null);
  const thread = useAppState((s) => (matchId ? (s.messages[matchId] ?? []) : []));
  const mentor = useMentor(match?.mentorId);
  const next = useNextStep();
  const scroll = useRef<ScrollView>(null);

  useEffect(() => {
    const id = setTimeout(() => scroll.current?.scrollToEnd({ animated: false }), 50);
    return () => clearTimeout(id);
  }, [thread.length]);

  if (!match || !mentor || !matchId) return null;
  const frozen = !!match.frozenAt;

  const send = (text: string) => {
    const findings = classify(text, locale());
    if (isBlocked(findings)) return; // the composer already refused; the server would too
    const m: Message = {
      id: newId('msg'),
      matchId,
      sender: 'student',
      body: redact(text, findings),
      bodyOriginal: null,
      blocked: false,
      blockedPatterns: [],
      scopeStepKey: next?.step.key ?? null,
      sentAt: nowIso(),
      pending: true,
    };
    actions.appendMessage(matchId, m);
    if (/\?\s*$/.test(text)) actions.addEffort('question_asked', matchId);
  };

  return (
    <View style={[styles.root, { paddingTop: insets.top }]} testID="screen-chat">
      <OfflineBanner />
      <BackHeader title={mentor.displayName} fallback="/mentor" right={<HeaderIconButton icon="flag" label={t('safety.report')} onPress={() => router.push('/safety')} testID="report" />} />
      <Text style={[type.footnote, { textAlign: 'center', marginTop: -4, marginBottom: 4 }]}>{locale() === 'es' ? 'Registrado por seguridad' : 'Logged for safety'}</Text>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={0}>
        <ScrollView ref={scroll} style={{ flex: 1 }} contentContainerStyle={{ paddingVertical: 8 }} keyboardShouldPersistTaps="handled">
          {thread.map((m) => (
            <ChatBubble key={m.id} m={m} mentorName={mentor.displayName} />
          ))}
        </ScrollView>
        <View style={{ paddingBottom: Math.max(insets.bottom, 8) }}>
          {frozen ? (
            <View style={{ paddingHorizontal: 16 }}>
              <Callout tone="amber" icon="lock" title={t('safety.after1')}>
                {t('safety.after1Sub')} · {t('safety.after3Sub')}
              </Callout>
            </View>
          ) : (
            <Composer onSend={send} scopeHint={next ? `${locale() === 'es' ? 'Sobre' : 'About'}: ${pick(next.step, 'title')}` : undefined} />
          )}
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
});
