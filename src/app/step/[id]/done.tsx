/**
 * S-03b — how should we count this? Four verification paths (spec 5.2): mentor confirms (default
 * when matched), screenshot upload (private, 90 days), coordinator confirms, self-attest.
 */
import * as ImagePicker from 'expo-image-picker';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Image, Platform, Text, View } from 'react-native';

import type { VerificationPath } from '@/domain/types';
import { pick, t } from '@/i18n';
import { actions, useAppState } from '@/store/appStore';
import { useMyMentor, useStep } from '@/store/derived';
import { Button, Cell, Group, SectionFooter, SectionHeader } from '@/ui/primitives';
import { Screen } from '@/ui/Screen';
import { colors, radius, type } from '@/ui/theme';

export default function DoneScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const row = useStep(id);
  const { match, mentor } = useMyMentor();
  const hasMentor = !!mentor && match?.state === 'active';
  const verifier = row?.step.verifier ?? 'any';
  const defaultPath: VerificationPath = verifier === 'staff' ? 'staff' : verifier === 'self' ? 'self' : hasMentor ? 'mentor' : verifier === 'mentor' ? 'self' : 'upload';
  const [path, setPath] = useState<VerificationPath>(defaultPath);
  const [imageUri, setImageUri] = useState<string | null>(null);
  const lowData = useAppState((s) => s.profile?.lowDataMode ?? false);

  if (!row) return null;

  const allowed: VerificationPath[] = verifier === 'any' ? ['mentor', 'upload', 'staff', 'self'] : verifier === 'mentor' ? ['mentor', 'self'] : verifier === 'upload' ? ['upload', 'mentor', 'self'] : verifier === 'staff' ? ['staff', 'self'] : ['self'];

  const pickImage = async () => {
    if (Platform.OS === 'web') return;
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.8, allowsEditing: false, exif: false });
    if (!res.canceled && res.assets[0]) setImageUri(res.assets[0].uri);
  };

  const submit = () => {
    const result = actions.finishStep(row.step.key, path, imageUri ?? undefined);
    router.replace({ pathname: '/verified/[id]', params: { id: row.step.key, path, points: String(result.points), badges: result.newBadges.map((b) => b.badgeKey).join(',') } });
  };

  const option = (p: VerificationPath, icon: Parameters<typeof Cell>[0]['icon'], title: string, sub: string, disabled = false, last = false) => (
    <Cell
      key={p}
      icon={icon}
      iconColor={path === p ? colors.tint : colors.ink2}
      title={title}
      subtitle={sub}
      accessory={path === p ? 'check' : 'none'}
      onPress={() => setPath(p)}
      disabled={disabled}
      accessibilityRole="radio"
      accessibilityState={{ selected: path === p }}
      testID={`path-${p}`}
      last={last}
    />
  );

  return (
    <Screen title={pick(row.step, 'title')} largeTitle={t('done.title')} subtitle={t('done.subtitle')} fallback="/roadmap" footer={<Button title={t('done.submit')} onPress={submit} disabled={path === 'upload' && !imageUri} haptic="success" testID="submit-done" />}>
      <SectionHeader>{t('verified.how')}</SectionHeader>
      <Group>
        {allowed.map((p, i) => {
          const last = i === allowed.length - 1;
          if (p === 'mentor') return option('mentor', 'mentor', t('done.mentor'), hasMentor ? t('done.mentorSub') : t('done.mentorDisabled'), !hasMentor, last);
          if (p === 'upload') return option('upload', 'camera', t('done.upload'), t('done.uploadSub'), Platform.OS === 'web', last);
          if (p === 'staff') return option('staff', 'shield', t('done.staff'), t('done.staffSub'), false, last);
          return option('self', 'checkCircle', t('done.self'), t('done.selfSub'), false, last);
        })}
      </Group>
      {path === 'upload' ? (
        <>
          <SectionHeader>{t('verified.evidence')}</SectionHeader>
          <Group padded>
            {imageUri && !lowData ? <Image source={{ uri: imageUri }} style={{ width: '100%', height: 220, borderRadius: radius.control, backgroundColor: colors.fill }} resizeMode="contain" accessibilityLabel={t('verified.evidence')} /> : null}
            <View style={{ marginTop: imageUri ? 12 : 0 }}>
              <Button title={imageUri ? t('done.changeImage') : t('done.pickImage')} variant="tonal" small onPress={() => void pickImage()} />
            </View>
            <Text style={[type.footnote, { marginTop: 10 }]}>{t('done.uploadPrivacy')}</Text>
          </Group>
        </>
      ) : null}
      <SectionFooter>{t('verified.schoolSeesSub')}</SectionFooter>
    </Screen>
  );
}
