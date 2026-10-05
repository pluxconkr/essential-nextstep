import { useRouter } from 'expo-router';
import { Text } from 'react-native';

import { t } from '@/i18n';
import { Button } from '@/ui/primitives';
import { Screen } from '@/ui/Screen';
import { type } from '@/ui/theme';

export default function NotFound() {
  const router = useRouter();
  return (
    <Screen largeTitle={t('notFound.title')} demo={false} footer={<Button title={t('notFound.home')} onPress={() => router.replace('/')} />}>
      <Text style={type.subheadline}>{t('notFound.sub')}</Text>
    </Screen>
  );
}
