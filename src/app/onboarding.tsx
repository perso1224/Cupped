import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Animated, Easing, KeyboardAvoidingView, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PressScale } from '../components/motion';
import { Chip, PillButton } from '../components/ui';
import { BRAND } from '../config/brand';
import { tr, upper } from '../i18n/tr';
import {
  starterPalateTypeId,
  type CupsPerDay,
  type OnboardingAnswers,
  type PalateGoal,
  type UsualPlace,
} from '../lib/onboarding';
import { getPalateType } from '../lib/palate';
import { saveProfile } from '../lib/storage';
import type { Method, TasteNote } from '../lib/types';
import { colors } from '../theme';

const METHODS: Method[] = ['espresso', 'filter', 'coldbrew', 'milk', 'turkish'];
const NOTES: TasteNote[] = ['fruity', 'floral', 'chocolate', 'nutty', 'caramel', 'bright', 'bold'];
const CUPS: CupsPerDay[] = ['one', 'few', 'many'];
const PLACES: UsualPlace[] = ['home', 'cafe', 'office', 'mixed'];
const GOALS: PalateGoal[] = ['explore', 'brew', 'taste', 'log'];

// 0: hoş geldin · 1-6: sorular · 7: damak tipi önizlemesi
const QUESTIONS = 6;

export default function Onboarding() {
  const insets = useSafeAreaInsets();
  const [step, setStep] = useState(0);
  const [a, setA] = useState<Partial<OnboardingAnswers>>({ notes: [], nickname: '' });
  const [fade] = useState(() => new Animated.Value(1));

  useEffect(() => {
    fade.setValue(0);
    Animated.timing(fade, { toValue: 1, duration: 350, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
  }, [step, fade]);

  function set<K extends keyof OnboardingAnswers>(k: K, v: OnboardingAnswers[K], autoNext = true) {
    Haptics.selectionAsync().catch(() => {});
    setA((p) => ({ ...p, [k]: v }));
    if (autoNext) setTimeout(() => setStep((s) => s + 1), 180);
  }

  function toggleNote(n: TasteNote) {
    Haptics.selectionAsync().catch(() => {});
    setA((p) => {
      const cur = p.notes ?? [];
      if (cur.includes(n)) return { ...p, notes: cur.filter((x) => x !== n) };
      if (cur.length >= 2) return { ...p, notes: [cur[1], n] };
      return { ...p, notes: [...cur, n] };
    });
  }

  const answers: OnboardingAnswers = {
    cupsPerDay: a.cupsPerDay ?? 'few',
    usualPlace: a.usualPlace ?? 'mixed',
    favMethod: a.favMethod ?? 'filter',
    notes: a.notes ?? [],
    goal: a.goal ?? 'explore',
    nickname: (a.nickname ?? '').trim(),
  };
  const starterTypeId = starterPalateTypeId(answers);

  async function finish() {
    await saveProfile({ ...answers, starterTypeId, onboardedAt: new Date().toISOString() });
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    router.replace('/');
    setTimeout(() => router.push('/new'), 350);
  }

  let content: React.ReactNode;
  let footer: React.ReactNode = null;

  if (step === 0) {
    content = (
      <View style={{ flex: 1, justifyContent: 'center' }}>
        <Text style={styles.brand}>{BRAND.name}</Text>
        <Text style={styles.welcomeTitle}>{tr.onboarding.welcomeTitle}</Text>
        <Text style={styles.body}>{tr.onboarding.welcomeBody}</Text>
      </View>
    );
    footer = <PillButton label={tr.onboarding.start} onPress={() => setStep(1)} />;
  } else if (step === 1) {
    content = (
      <Question title={tr.onboarding.cupsQ}>
        {CUPS.map((c) => (
          <Option key={c} label={tr.onboarding.cups[c]} selected={a.cupsPerDay === c} onPress={() => set('cupsPerDay', c)} />
        ))}
      </Question>
    );
  } else if (step === 2) {
    content = (
      <Question title={tr.onboarding.placeQ}>
        {PLACES.map((p) => (
          <Option key={p} label={tr.onboarding.place[p]} selected={a.usualPlace === p} onPress={() => set('usualPlace', p)} />
        ))}
      </Question>
    );
  } else if (step === 3) {
    content = (
      <Question title={tr.onboarding.methodQ}>
        {METHODS.map((m) => (
          <Option key={m} label={tr.methods[m]} selected={a.favMethod === m} onPress={() => set('favMethod', m)} />
        ))}
      </Question>
    );
  } else if (step === 4) {
    content = (
      <Question title={tr.onboarding.notesQ} hint={tr.onboarding.notesHint}>
        <View style={styles.chips}>
          {NOTES.map((n) => (
            <Chip key={n} label={tr.notes[n]} selected={(a.notes ?? []).includes(n)} onPress={() => toggleNote(n)} />
          ))}
        </View>
      </Question>
    );
    footer = (
      <PillButton
        label={(a.notes ?? []).length ? tr.onboarding.next : tr.onboarding.skip}
        variant={(a.notes ?? []).length ? 'dark' : 'light'}
        onPress={() => setStep(5)}
      />
    );
  } else if (step === 5) {
    content = (
      <Question title={tr.onboarding.goalQ}>
        {GOALS.map((g) => (
          <Option key={g} label={tr.onboarding.goal[g]} selected={a.goal === g} onPress={() => set('goal', g)} />
        ))}
      </Question>
    );
  } else if (step === 6) {
    content = (
      <Question title={tr.onboarding.nickQ} hint={tr.onboarding.nickHint}>
        <TextInput
          value={a.nickname}
          onChangeText={(t) => setA((p) => ({ ...p, nickname: t.slice(0, 24) }))}
          placeholder={tr.onboarding.nickPlaceholder}
          placeholderTextColor={colors.muted}
          returnKeyType="done"
          onSubmitEditing={() => setStep(7)}
          style={styles.input}
          autoCapitalize="none"
        />
      </Question>
    );
    footer = (
      <PillButton
        label={(a.nickname ?? '').trim() ? tr.onboarding.next : tr.onboarding.skip}
        variant={(a.nickname ?? '').trim() ? 'dark' : 'light'}
        onPress={() => setStep(7)}
      />
    );
  } else {
    const type = getPalateType(starterTypeId);
    content = (
      <View style={{ flex: 1, justifyContent: 'center' }}>
        <View style={styles.revealCard}>
          <Text style={styles.revealKicker}>{upper(tr.onboarding.revealKicker)}</Text>
          {answers.nickname ? <Text style={styles.revealNick}>@{answers.nickname}</Text> : null}
          <Text style={styles.revealName}>{type.name}</Text>
          <Text style={styles.revealTagline}>{type.tagline}</Text>
        </View>
        <Text style={[styles.body, { marginTop: 20 }]}>{tr.onboarding.revealNote}</Text>
      </View>
    );
    footer = <PillButton label={tr.onboarding.finish} onPress={finish} />;
  }

  // Geri dönülen ve zaten cevaplanmış tek seçimli sorularda "Devam" göster
  const answeredSingle =
    (step === 1 && a.cupsPerDay) || (step === 2 && a.usualPlace) || (step === 3 && a.favMethod) || (step === 5 && a.goal);
  if (!footer && answeredSingle) footer = <PillButton label={tr.onboarding.next} onPress={() => setStep(step + 1)} />;

  return (
    <KeyboardAvoidingView behavior="padding" style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={{ flex: 1, paddingTop: insets.top + 12, paddingBottom: insets.bottom + 16, paddingHorizontal: 24 }}>
        {step >= 1 && step <= QUESTIONS ? (
          <View style={styles.topRow}>
            <Pressable onPress={() => setStep((s) => s - 1)} hitSlop={12}>
              <Text style={styles.back}>‹</Text>
            </Pressable>
            <View style={styles.progress}>
              <View style={[styles.progressFill, { width: `${(step / QUESTIONS) * 100}%` }]} />
            </View>
            <Text style={styles.stepText}>{tr.onboarding.step(step, QUESTIONS)}</Text>
          </View>
        ) : null}
        <Animated.View style={{ flex: 1, opacity: fade }}>{content}</Animated.View>
        {footer}
      </View>
    </KeyboardAvoidingView>
  );
}

function Question({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <View style={{ flex: 1, paddingTop: 32 }}>
      <Text style={styles.q}>{title}</Text>
      {hint ? <Text style={styles.hint}>{hint}</Text> : null}
      <View style={{ marginTop: 24 }}>{children}</View>
    </View>
  );
}

function Option({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  return (
    <PressScale onPress={onPress} scaleTo={0.97} style={[styles.option, selected && styles.optionOn]}>
      <Text style={[styles.optionText, selected && { color: colors.white }]}>{label}</Text>
    </PressScale>
  );
}

const styles = StyleSheet.create({
  brand: { fontSize: 22, fontWeight: '900', color: colors.accent, letterSpacing: -0.3 },
  welcomeTitle: { fontSize: 44, fontWeight: '900', color: colors.text, letterSpacing: -1.5, lineHeight: 48, marginTop: 12 },
  body: { fontSize: 17, color: colors.muted, lineHeight: 25, marginTop: 16 },
  topRow: { flexDirection: 'row', alignItems: 'center' },
  back: { fontSize: 36, fontWeight: '300', color: colors.text, marginTop: -6, width: 28 },
  progress: { flex: 1, height: 6, borderRadius: 3, backgroundColor: colors.line, overflow: 'hidden', marginHorizontal: 12 },
  progressFill: { height: 6, backgroundColor: colors.black },
  stepText: { fontSize: 13, fontWeight: '700', color: colors.muted, width: 28, textAlign: 'right' },
  q: { fontSize: 34, fontWeight: '900', color: colors.text, letterSpacing: -1, lineHeight: 38 },
  hint: { fontSize: 15, color: colors.muted, marginTop: 8 },
  chips: { flexDirection: 'row', flexWrap: 'wrap' },
  option: {
    height: 60,
    borderRadius: 18,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.line,
    justifyContent: 'center',
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  optionOn: { backgroundColor: colors.black, borderColor: colors.black },
  optionText: { fontSize: 17, fontWeight: '700', color: colors.text },
  input: {
    height: 56,
    borderRadius: 16,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.line,
    paddingHorizontal: 18,
    fontSize: 18,
    color: colors.text,
  },
  revealCard: { backgroundColor: colors.black, borderRadius: 28, padding: 28 },
  revealKicker: { color: colors.accent, fontSize: 13, fontWeight: '800', letterSpacing: 1.4 },
  revealNick: { color: '#BDB6AC', fontSize: 16, fontWeight: '700', marginTop: 10 },
  revealName: { color: colors.white, fontSize: 40, fontWeight: '900', letterSpacing: -1, marginTop: 8, lineHeight: 44 },
  revealTagline: { color: '#CFC8BE', fontSize: 17, lineHeight: 24, marginTop: 12 },
});
