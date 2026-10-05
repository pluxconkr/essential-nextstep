/**
 * S-14 Profile — goals are the input to the roadmap engine, so this screen is functional,
 * not decorative. Export and delete are buttons, not email requests.
 */
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, Platform, Share, Text, View } from 'react-native';

import type { AidPath, Goal } from '@/domain/types';
import { t } from '@/i18n';
import { actions, useAppState } from '@/store/appStore';
import { useCircles, useMyMentor } from '@/store/derived';
import { Button, Cell, Group, InitialsAvatar, SectionFooter, SectionHeader, Tag } from '@/ui/primitives';
import { Screen } from '@/ui/Screen';
import { colors, type } from '@/ui/theme';

import { LANGUAGES } from './onboarding';

const GOALS: Goal[] = ['college', 'certificate', 'biliteracy', 'unsure'];
const AID: AidPath[] = ['fafsa', 'cadaa', 'unsure'];

export default function ProfileScreen() {
  const router = useRouter();
  const profile = useAppState((s) => s.profile);
  const effort = useAppState((s) => s.effort);
  const badges = useAppState((s) => s.badges);
  const progress = useAppState((s) => s.progress);
  const { mentor } = useMyMentor();
  const circles = useCircles();
  const myCircle = circles.find((c) => c.mine) ?? null;
  const [editingGoals, setEditingGoals] = useState(false);
  const [editingAid, setEditingAid] = useState(false);

  if (!profile) return null;

  const toggleGoal = (g: Goal) => {
    const goals = profile.goals.includes(g) ? profile.goals.filter((x) => x !== g) : profile.goals.length < 3 ? [...profile.goals, g] : profile.goals;
    actions.saveProfile({ goals });
  };

  const exportData = () => {
    const payload = JSON.stringify({ profile, progress, effort, badges, exportedAt: new Date().toISOString() }, null, 2);
    void Share.share({ message: payload, title: 'NextStep export' });
  };

  const deleteData = () => {
    const doIt = () => {
      actions.resetAll();
      router.replace('/onboarding');
    };
    if (Platform.OS === 'web') doIt();
    else Alert.alert(t('profile.delete'), t('data.resetConfirm'), [{ text: t('common.cancel'), style: 'cancel' }, { text: t('profile.delete'), style: 'destructive', onPress: doIt }]);
  };

  const langs = (codes: string[]) => codes.map((c) => LANGUAGES.find((l) => l.code === c)?.name ?? c.toUpperCase()).join(' · ');

  return (
    <Screen title={t('profile.title')} largeTitle={t('profile.title')} subtitle={t('profile.subtitle')} fallback="/" testID="screen-profile">
      <Group padded>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <InitialsAvatar initials={profile.initials} size={52} verified={profile.verification !== 'none'} />
          <View style={{ flex: 1 }}>
            <Text style={type.title3}>{profile.displayName}</Text>
            <Text style={type.footnote}>{t('profile.line', { grade: profile.grade, school: profile.schoolName })}</Text>
            <View style={{ flexDirection: 'row', gap: 6, marginTop: 6, flexWrap: 'wrap' }}>
              <Tag tone="grey" filled>{langs(profile.languagesHome)}</Tag>
              <Tag tone={profile.verification === 'none' ? 'amber' : 'green'}>{t(`profile.verified.${profile.verification}` as const)}</Tag>
            </View>
          </View>
        </View>
      </Group>
      <SectionFooter>{t('profile.verifyNote')}</SectionFooter>

      <SectionHeader right={<Text style={[type.sectionHeader, { color: colors.tint }]} onPress={() => setEditingGoals((v) => !v)}>{editingGoals ? t('common.done') : t('common.edit')}</Text>}>{t('profile.goals')}</SectionHeader>
      <Group>
        {(editingGoals ? GOALS : profile.goals).map((g, i, arr) => (
          <Cell key={g} icon={g === 'college' ? 'graduation' : g === 'certificate' ? 'doc' : g === 'biliteracy' ? 'globe' : 'question'} title={t(`goal.${g}` as const)} accessory={editingGoals ? (profile.goals.includes(g) ? 'check' : 'none') : 'none'} onPress={editingGoals ? () => toggleGoal(g) : undefined} accessibilityRole="checkbox" accessibilityState={{ checked: profile.goals.includes(g) }} last={i === arr.length - 1} />
        ))}
        {!editingGoals && profile.goals.length === 0 ? <Cell title={t('profile.none')} last /> : null}
      </Group>
      <SectionFooter>{t('profile.goalsFooter')}</SectionFooter>

      <SectionHeader right={<Text style={[type.sectionHeader, { color: colors.tint }]} onPress={() => setEditingAid((v) => !v)}>{editingAid ? t('common.done') : t('common.edit')}</Text>}>{t('profile.aidPath')}</SectionHeader>
      <Group>
        {(editingAid ? AID : profile.aidPath ? [profile.aidPath] : []).map((a, i, arr) => (
          <Cell key={a} title={t(`aid.${a === 'fafsa' ? 'yes' : a === 'cadaa' ? 'no' : 'unsure'}` as const)} subtitle={a === 'fafsa' ? 'FAFSA' : a === 'cadaa' ? 'CADAA' : undefined} accessory={editingAid && profile.aidPath === a ? 'check' : 'none'} onPress={editingAid ? () => actions.saveProfile({ aidPath: a }) : undefined} last={i === arr.length - 1} />
        ))}
        {!editingAid && !profile.aidPath ? <Cell title={t('common.notSure')} last /> : null}
      </Group>
      <SectionFooter>{t('profile.aidPathNote')}</SectionFooter>

      <SectionHeader>{t('profile.mentorCircles')}</SectionHeader>
      <Group>
        <Cell icon="mentor" title={t('profile.myMentor')} value={mentor?.displayName ?? t('profile.none')} accessory="chevron" onPress={() => router.push(mentor ? { pathname: '/mentor/[id]', params: { id: mentor.id } } : '/mentors')} />
        <Cell icon="circles" title={t('profile.myCircle')} value={myCircle ? myCircle.venueName : t('profile.none')} accessory="chevron" onPress={() => router.push(myCircle ? { pathname: '/circle/[id]', params: { id: myCircle.id } } : '/circles')} />
        <Cell icon="handRaised" title={t('profile.studentsIHelp')} value={String(effort.filter((e) => e.kind === 'helped_peer').length)} last />
      </Group>

      <SectionHeader>{t('profile.family')}</SectionHeader>
      <Group>
        <Cell icon="family" title={t('profile.familyView')} accessory="chevron" onPress={() => router.push('/family')} />
        <Cell icon="language" title={t('profile.languages')} value={langs(profile.languagesRead)} last />
      </Group>

      <SectionHeader>{t('profile.settings')}</SectionHeader>
      <Group>
        <Cell icon="shield" title={t('profile.safety')} accessory="chevron" onPress={() => router.push('/safety')} />
        <Cell icon="bell" title={t('profile.reminders')} value={t('common.yes')} />
        <Cell icon="download" title={t('profile.data')} accessory="chevron" onPress={() => router.push('/data')} last />
      </Group>

      <View style={{ height: 24, }} />
      <Button title={t('profile.export')} variant="tonal" onPress={exportData} />
      <View style={{ height: 8 }} />
      <Button title={t('profile.delete')} variant="red" onPress={deleteData} />
    </Screen>
  );
}
