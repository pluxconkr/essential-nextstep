/**
 * S-16 Family view (student side) — preview of what the parent sees, and the share controls.
 * The parent never has an account; the link is a 128-bit token.
 */
import * as Clipboard from 'expo-clipboard';
import { useState } from 'react';
import { Share, Text, View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';

import { newToken } from '@/domain/ids';
import { nowIso } from '@/domain/time';
import { t, type Locale } from '@/i18n';
import { actions, useAppState } from '@/store/appStore';
import { useMyMentor, useNow, useRoadmap } from '@/store/derived';
import { FamilyDates, FamilyRequests, Glossary, NoticeBanner } from '@/ui/family-widgets';
import { Button, Group, SectionFooter, Segmented } from '@/ui/primitives';
import { Screen } from '@/ui/Screen';
import { colors, type } from '@/ui/theme';

import { LANGUAGES } from './onboarding';

const API = process.env.EXPO_PUBLIC_API_URL ?? 'https://nextstep.example';

export default function FamilyScreen() {
  const profile = useAppState((s) => s.profile);
  const content = useAppState((s) => s.content);
  const link = useAppState((s) => s.familyLink);
  const roadmap = useRoadmap();
  const now = useNow();
  const { match } = useMyMentor();
  const [showQr, setShowQr] = useState(false);
  const [copied, setCopied] = useState(false);
  const [sent, setSent] = useState<Record<string, boolean>>({});

  if (!profile) return null;
  const loc: Locale = link?.locale ?? (profile.languagesHome.includes('es') ? 'es' : 'en');
  const url = link ? `${API}/f/${link.token}` : null;

  const ensureLink = () => {
    if (link) return link;
    const l = { token: newToken(), locale: loc, createdAt: nowIso(), lastOpenedAt: null };
    actions.setFamilyLink(l);
    return l;
  };

  const share = async () => {
    const l = ensureLink();
    await Share.share({ message: `${API}/f/${l.token}`, title: 'NextStep' });
  };
  const copy = async () => {
    const l = ensureLink();
    await Clipboard.setStringAsync(`${API}/f/${l.token}`);
    setCopied(true);
  };
  const langName = LANGUAGES.find((l) => l.code === loc)?.name ?? loc;

  return (
    <Screen title={t('family.title')} largeTitle={loc === 'es' ? 'Vista para la familia' : t('family.title')} subtitle={loc === 'es' ? 'sin cuenta' : t('family.subtitle')} fallback="/" testID="screen-family">
      <Group padded>
        <Text style={type.headline}>{t('family.hero')}</Text>
        <Text style={[type.subheadline, { marginTop: 4 }]}>{t('family.heroSub')}</Text>
        <View style={{ flexDirection: 'row', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
          <Button title={t('family.share')} icon="share" small onPress={() => void share()} />
          <Button title={copied ? t('family.linkCopied') : t('family.copy')} icon="copy" small variant="tonal" onPress={() => void copy()} />
          <Button title={t('family.qr')} icon="qr" small variant="tonal" onPress={() => { ensureLink(); setShowQr((v) => !v); }} />
        </View>
        {showQr && url ? (
          <View style={{ alignItems: 'center', marginTop: 16 }} accessibilityLabel={t('family.qr')}>
            <QRCode value={url} size={180} color={colors.ink} backgroundColor={colors.surface} />
            <Text style={[type.caption, { marginTop: 8 }]}>{url}</Text>
          </View>
        ) : null}
      </Group>
      <SectionFooter>{t('family.previewNote', { language: langName })}</SectionFooter>
      <View style={{ height: 8 }} />
      <Segmented options={[{ value: 'es', label: 'Español' }, { value: 'en', label: 'English' }]} value={loc} onChange={(v) => actions.setFamilyLink({ ...ensureLink(), locale: v as Locale })} />

      {match && (match.state === 'active' || match.state === 'confirmed_pending_notice') ? (
        <View style={{ marginTop: 16 }}>
          <NoticeBanner loc={loc} studentName={profile.displayName.split(' ')[0]} onOptOut={() => {}} />
        </View>
      ) : null}

      <FamilyDates rows={roadmap} loc={loc} now={now} />
      <Glossary entries={content.glossary} loc={loc} />
      <FamilyRequests loc={loc} sent={sent} onRequest={(k) => setSent((s) => ({ ...s, [k]: true }))} />

      <View style={{ height: 24 }} />
      {link ? (
        <View style={{ gap: 8 }}>
          <Button title={t('family.regenerate')} variant="secondary" small onPress={() => actions.setFamilyLink({ ...link, token: newToken(), createdAt: nowIso(), lastOpenedAt: null })} />
          <Button title={t('family.revoke')} variant="red" small onPress={() => actions.setFamilyLink(null)} />
        </View>
      ) : null}
    </Screen>
  );
}
