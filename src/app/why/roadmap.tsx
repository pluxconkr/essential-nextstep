/** Explainer modal: how the roadmap is built, in words. Every rule the engine applies, readable. */
import { Text } from 'react-native';

import { STALE_AFTER_DAYS } from '@/domain/content';
import { STALL_DAYS } from '@/domain/roadmap';
import { locale, t } from '@/i18n';
import { Cell, Group, SectionFooter } from '@/ui/primitives';
import { Screen } from '@/ui/Screen';
import { type } from '@/ui/theme';

const EN = [
  'Your goals pick the tracks. "I don\'t know yet" is a real answer: it adds a 12-minute meeting with your counselor.',
  'If your family speaks another language at home, the Language & family steps are added.',
  'Your aid-form answer swaps the aid step between FAFSA and the California Dream Act application. It is stored as a form choice, never as a status.',
  'Each step gets one real date: a published deadline, a date in your school calendar, or a window after you open it.',
  'Steps are ordered by date, then by what has to happen first. Home shows only the first open one.',
  `A step that nobody has re-checked in ${STALE_AFTER_DAYS} days is hidden rather than shown as fact.`,
  `If you open a step and do not finish it, you get a nudge after ${STALL_DAYS[0]} days, a circle invitation after ${STALL_DAYS[1]}, and the coordinator is told after ${STALL_DAYS[2]}.`,
];
const ES = [
  'Tus metas eligen los caminos. "Todavía no sé" es una respuesta válida: agrega una reunión de 12 minutos con tu consejero.',
  'Si tu familia habla otro idioma en casa, se agregan los pasos de Idioma y familia.',
  'Tu respuesta sobre el formulario de ayuda cambia el paso de ayuda entre FAFSA y la solicitud del Dream Act de California. Se guarda como elección de formulario, nunca como estatus.',
  'Cada paso recibe una fecha real: una fecha límite publicada, una fecha del calendario de tu escuela, o un plazo desde que lo abres.',
  'Los pasos se ordenan por fecha y luego por lo que debe pasar primero. La pantalla de inicio muestra solo el primero abierto.',
  `Un paso que nadie ha vuelto a revisar en ${STALE_AFTER_DAYS} días se oculta en vez de mostrarse como un hecho.`,
  `Si abres un paso y no lo terminas, recibes un recordatorio a los ${STALL_DAYS[0]} días, una invitación a un círculo a los ${STALL_DAYS[1]} y se avisa al coordinador a los ${STALL_DAYS[2]}.`,
];

export default function WhyRoadmap() {
  const lines = locale() === 'es' ? ES : EN;
  return (
    <Screen title={t('why.roadmapTitle')} largeTitle={t('why.roadmapTitle')} fallback="/roadmap">
      <Group>
        {lines.map((l, i) => (
          <Cell key={i} leading={<Text style={[type.headline, { width: 22 }]}>{i + 1}</Text>} title={<Text style={type.subheadline}>{l}</Text>} last={i === lines.length - 1} />
        ))}
      </Group>
      <SectionFooter>{t('roadmap.builtFrom')}</SectionFooter>
    </Screen>
  );
}
