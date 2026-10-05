/**
 * S-00 Onboarding → first roadmap (spec 5.1). One question per screen, one primary button, back
 * always available. The only success criterion: the student leaves holding ONE step.
 * The aid-path question is a FORM choice, never a status question.
 */
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Text, View } from 'react-native';

import { initialsOf } from '@/data/repos';
import type { AgeBand, AidPath, ElStatus, Goal, Grade, StudentProfile } from '@/domain/types';
import { t } from '@/i18n';
import { actions } from '@/store/appStore';
import { Button, Cell, Field, Group, SectionFooter, Segmented } from '@/ui/primitives';
import { Screen } from '@/ui/Screen';
import { colors, type } from '@/ui/theme';

const ORG = process.env.EXPO_PUBLIC_ORG ?? 'valley-high';
const SCHOOL_NAME = 'Valley High';

export const LANGUAGES: { code: string; name: string }[] = [
  { code: 'en', name: 'English' },
  { code: 'es', name: 'Español' },
  { code: 'vi', name: 'Tiếng Việt' },
  { code: 'zh', name: '中文' },
  { code: 'tl', name: 'Tagalog' },
  { code: 'ar', name: 'العربية' },
  { code: 'hmn', name: 'Hmoob' },
  { code: 'pa', name: 'ਪੰਜਾਬੀ' },
  { code: 'ko', name: '한국어' },
  { code: 'fa', name: 'فارسی' },
];

type Stage = 'welcome' | 'name' | 'grade' | 'read' | 'home' | 'el' | 'age' | 'goals' | 'aid' | 'guardian' | 'generating';
const ORDER: Stage[] = ['welcome', 'name', 'grade', 'read', 'home', 'el', 'age', 'goals', 'aid', 'guardian', 'generating'];

export default function OnboardingScreen() {
  const router = useRouter();
  const [stage, setStage] = useState<Stage>('welcome');
  const [name, setName] = useState('');
  const [grade, setGrade] = useState<Grade | null>(null);
  const [read, setRead] = useState<string[]>(['en']);
  const [home, setHome] = useState<string[]>([]);
  const [el, setEl] = useState<ElStatus | null>(null);
  const [age, setAge] = useState<AgeBand | null>(null);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [aid, setAid] = useState<AidPath | null>(null);
  const [guardianPhone, setGuardianPhone] = useState('');
  const [guardianEmail, setGuardianEmail] = useState('');
  const [interpreter, setInterpreter] = useState<boolean | null>(null);

  const idx = ORDER.indexOf(stage);
  const go = (next: Stage) => setStage(next);
  const forward = () => go(ORDER[Math.min(ORDER.length - 1, idx + 1)]);
  const back = () => go(ORDER[Math.max(0, idx - 1)]);

  const finish = () => {
    const profile: StudentProfile = {
      orgId: ORG,
      schoolId: ORG,
      schoolName: SCHOOL_NAME,
      displayName: name.trim(),
      initials: initialsOf(name.trim()),
      grade: grade ?? 11,
      languagesRead: read.length ? read : ['en'],
      languagesHome: home.length ? home : ['en'],
      elStatus: el,
      ageBand: age ?? 'under_18',
      goals,
      aidPath: aid,
      verification: 'none',
      needsInterpreter: interpreter === true,
      smsOk: true,
      lowDataMode: false,
    };
    actions.completeOnboarding(profile);
    router.replace('/');
  };

  const dots = (
    <View style={{ flexDirection: 'row', gap: 6, paddingHorizontal: 16, paddingBottom: 8 }} accessibilityLabel={`${idx} / ${ORDER.length - 1}`}>
      {ORDER.slice(1, -1).map((s, i) => (
        <View key={s} style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: i < idx ? colors.tint : colors.fill }} />
      ))}
    </View>
  );

  const multi = (list: string[], set: (v: string[]) => void, code: string) => set(list.includes(code) ? list.filter((c) => c !== code) : [...list, code]);

  switch (stage) {
    case 'welcome':
      return (
        <Screen demo={false} footer={<Button title={t('onb.start')} onPress={forward} testID="onb-start" />} testID="screen-onboarding">
          <View style={{ paddingTop: 48 }}>
            <Text style={type.largeTitle} accessibilityRole="header">
              {t('onb.welcome')}
            </Text>
            <Text style={[type.subheadline, { marginTop: 12 }]}>{t('onb.welcomeSub')}</Text>
          </View>
        </Screen>
      );
    case 'name':
      return (
        <Screen title=" " demo={false} largeTitle={t('onb.nameTitle')} footer={<Button title={t('common.continue')} onPress={forward} disabled={name.trim().length < 2} testID="onb-continue" />}>
          {dots}
          <Field value={name} onChangeText={setName} placeholder={t('onb.namePlaceholder')} autoFocus autoCapitalize="words" testID="onb-name" />
          <SectionFooter>{SCHOOL_NAME}</SectionFooter>
        </Screen>
      );
    case 'grade':
      return (
        <Screen title=" " demo={false} largeTitle={t('onb.gradeTitle')} footer={<Button title={t('common.continue')} onPress={forward} disabled={!grade} testID="onb-continue" />}>
          {dots}
          <Segmented options={[9, 10, 11, 12].map((g) => ({ value: String(g), label: String(g) }))} value={grade ? String(grade) : null} onChange={(v) => setGrade(Number(v) as Grade)} />
          <BackLink onPress={back} />
        </Screen>
      );
    case 'read':
      return (
        <Screen title=" " demo={false} largeTitle={t('onb.langTitle')} footer={<Button title={t('common.continue')} onPress={forward} disabled={read.length === 0} testID="onb-continue" />}>
          {dots}
          <Group>
            {LANGUAGES.map((l, i) => (
              <Cell key={l.code} title={l.name} accessory={read.includes(l.code) ? 'check' : 'none'} onPress={() => multi(read, setRead, l.code)} accessibilityRole="checkbox" accessibilityState={{ checked: read.includes(l.code) }} last={i === LANGUAGES.length - 1} />
            ))}
          </Group>
          <BackLink onPress={back} />
        </Screen>
      );
    case 'home':
      return (
        <Screen title=" " demo={false} largeTitle={t('onb.langHomeTitle')} footer={<Button title={t('common.continue')} onPress={forward} disabled={home.length === 0} testID="onb-continue" />}>
          {dots}
          <Group>
            {LANGUAGES.map((l, i) => (
              <Cell key={l.code} title={l.name} accessory={home.includes(l.code) ? 'check' : 'none'} onPress={() => multi(home, setHome, l.code)} accessibilityRole="checkbox" accessibilityState={{ checked: home.includes(l.code) }} last={i === LANGUAGES.length - 1} />
            ))}
          </Group>
          <BackLink onPress={back} />
        </Screen>
      );
    case 'el':
      return (
        <Screen title=" " demo={false} largeTitle={t('onb.elTitle')} subtitle={t('onb.elSub')} footer={<Button title={t('common.continue')} onPress={forward} disabled={!el} testID="onb-continue" />}>
          {dots}
          <Segmented options={[{ value: 'yes', label: t('common.yes') }, { value: 'no', label: t('common.no') }, { value: 'unsure', label: t('common.notSure') }]} value={el} onChange={(v) => setEl(v as ElStatus)} />
          <BackLink onPress={back} />
        </Screen>
      );
    case 'age':
      return (
        <Screen title=" " demo={false} largeTitle={t('onb.ageTitle')} subtitle={t('onb.ageSub')} footer={<Button title={t('common.continue')} onPress={forward} disabled={!age} testID="onb-continue" />}>
          {dots}
          <Segmented options={[{ value: 'adult', label: t('common.yes') }, { value: 'under_18', label: t('common.no') }]} value={age} onChange={(v) => setAge(v as AgeBand)} />
          <BackLink onPress={back} />
        </Screen>
      );
    case 'goals':
      return (
        <Screen title=" " demo={false} largeTitle={t('onb.goalsTitle')} subtitle={t('onb.goalsSub')} footer={<Button title={t('common.continue')} onPress={forward} disabled={goals.length === 0} testID="onb-continue" />}>
          {dots}
          <Group>
            {(['college', 'certificate', 'biliteracy', 'unsure'] as Goal[]).map((g, i, arr) => (
              <Cell
                key={g}
                title={t(`goal.${g}` as const)}
                accessory={goals.includes(g) ? 'check' : 'none'}
                onPress={() => setGoals(goals.includes(g) ? goals.filter((x) => x !== g) : goals.length < 3 ? [...goals, g] : goals)}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: goals.includes(g) }}
                testID={`goal-${g}`}
                last={i === arr.length - 1}
              />
            ))}
          </Group>
          <BackLink onPress={back} />
        </Screen>
      );
    case 'aid':
      return (
        <Screen title=" " demo={false} largeTitle={t('onb.aidTitle')} footer={<Button title={t('common.continue')} onPress={forward} disabled={!aid} testID="onb-continue" />}>
          {dots}
          <Group>
            <Cell title={t('aid.yes')} accessory={aid === 'fafsa' ? 'check' : 'none'} onPress={() => setAid('fafsa')} accessibilityRole="radio" accessibilityState={{ selected: aid === 'fafsa' }} testID="aid-fafsa" />
            <Cell title={t('aid.no')} accessory={aid === 'cadaa' ? 'check' : 'none'} onPress={() => setAid('cadaa')} accessibilityRole="radio" accessibilityState={{ selected: aid === 'cadaa' }} testID="aid-cadaa" />
            <Cell title={t('aid.unsure')} accessory={aid === 'unsure' ? 'check' : 'none'} onPress={() => setAid('unsure')} accessibilityRole="radio" accessibilityState={{ selected: aid === 'unsure' }} last />
          </Group>
          <SectionFooter>{t('onb.aidSub')}</SectionFooter>
          <BackLink onPress={back} />
        </Screen>
      );
    case 'guardian':
      return (
        <Screen
          title=" "
          demo={false}
          largeTitle={t('onb.guardianTitle')}
          subtitle={t('onb.guardianSub')}
          footer={
            <>
              <Button title={t('common.continue')} onPress={() => go('generating')} testID="onb-continue" />
              <Button title={t('common.skip')} variant="ghost" small onPress={() => go('generating')} />
            </>
          }>
          {dots}
          <Group padded>
            <Field label={t('onb.guardianPhone')} value={guardianPhone} onChangeText={setGuardianPhone} keyboardType="phone-pad" />
            <View style={{ height: 12 }} />
            <Field label={t('onb.guardianEmail')} value={guardianEmail} onChangeText={setGuardianEmail} keyboardType="email-address" autoCapitalize="none" />
          </Group>
          <View style={{ height: 16 }} />
          <Text style={[type.footnote, { paddingHorizontal: 16, marginBottom: 8 }]}>{t('onb.interpreterTitle')}</Text>
          <Segmented options={[{ value: 'yes', label: t('common.yes') }, { value: 'no', label: t('common.no') }]} value={interpreter == null ? null : interpreter ? 'yes' : 'no'} onChange={(v) => setInterpreter(v === 'yes')} />
          <BackLink onPress={back} />
        </Screen>
      );
    case 'generating':
    default:
      return (
        <Screen demo={false} footer={<Button title={t('onb.firstStep')} onPress={finish} haptic="success" testID="onb-finish" />}>
          <View style={{ paddingTop: 48 }}>
            <Text style={type.largeTitle} accessibilityRole="header">
              {t('onb.generating')}
            </Text>
            <Text style={[type.subheadline, { marginTop: 12 }]}>{t('roadmap.builtFrom')}</Text>
          </View>
        </Screen>
      );
  }
}

function BackLink({ onPress }: { onPress: () => void }) {
  return (
    <View style={{ marginTop: 16 }}>
      <Button title={t('common.back')} variant="ghost" small onPress={onPress} />
    </View>
  );
}
