import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { TrainMascot } from '@/components/TrainMascot';
import { useAppState, type Experience, type Goal, type Profile } from '@/context/AppState';
import { useColors } from '@/hooks/useColors';

const experiences: Experience[] = ['Just starting', 'Less than 6 months', '6–12 months', '1–3 years', '3+ years'];
const goals: Goal[] = ['Build muscle', 'Get stronger', 'Lose fat', 'Improve fitness', 'Stay consistent'];

export default function OnboardingScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { hydrated, hasOnboarded, completeOnboarding } = useAppState();
  const [step, setStep] = useState(0);
  const [profile, setProfile] = useState<Profile>({ experience: 'Just starting', goal: 'Build muscle', age: '', height: '', weight: '' });

  useEffect(() => {
    if (hydrated && hasOnboarded) router.replace('/(tabs)');
  }, [hydrated, hasOnboarded]);

  if (!hydrated || hasOnboarded) return <View style={[styles.loading, { backgroundColor: colors.background }]} />;

  const next = () => {
    if (step < 4) setStep((current) => current + 1);
    else {
      completeOnboarding(profile);
      router.replace('/(tabs)/workout');
    }
  };

  return (
    <View style={[styles.screen, { backgroundColor: colors.background, paddingTop: insets.top + 12, paddingBottom: Math.max(insets.bottom, 18) }]}>
      <View style={styles.topRow}>
        <Text style={[styles.wordmark, { color: colors.foreground }]}>TRAIN <Text style={{ color: colors.tint }}>XP</Text></Text>
        {step > 0 ? <Text style={[styles.stepText, { color: colors.mutedForeground }]}>{step}/4</Text> : null}
      </View>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {step === 0 ? (
          <View style={styles.hero}>
            <View style={styles.mascotHero}><TrainMascot mood="excited" size={142} /></View>
            <Text style={[styles.eyebrow, { color: colors.tint }]}>REAL TRAINING. REAL PROGRESS.</Text>
            <Text style={[styles.title, { color: colors.foreground }]}>Turn every workout into progress.</Text>
            <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>Track your lifts, earn XP, climb the ranks.</Text>
          </View>
        ) : step === 1 ? (
          <View style={styles.section}>
            <TrainMascot size={92} mood="ready" />
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Your gym, with a game layer.</Text>
            <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>Every meaningful session moves your character forward.</Text>
            <View style={styles.benefitList}>
              {[
                ['activity', 'Track your workouts', 'Log a set in seconds.'],
                ['award', 'Rank your lifts', 'See exactly what to beat next.'],
                ['zap', 'Build your streak', 'Stay consistent without chasing perfection.'],
              ].map(([icon, title, text]) => (
                <View key={title} style={[styles.benefit, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <View style={[styles.iconCircle, { backgroundColor: colors.secondary }]}><Feather name={icon as 'activity'} size={20} color={colors.tint} /></View>
                  <View style={styles.benefitCopy}><Text style={[styles.benefitTitle, { color: colors.foreground }]}>{title}</Text><Text style={[styles.benefitText, { color: colors.mutedForeground }]}>{text}</Text></View>
                </View>
              ))}
            </View>
          </View>
        ) : step === 2 ? (
          <ChoiceStep title="What's your experience?" subtitle="We’ll tune your starting point." options={experiences} value={profile.experience} onChange={(value) => setProfile({ ...profile, experience: value as Experience })} colors={colors} />
        ) : step === 3 ? (
          <ChoiceStep title="What are you training for?" subtitle="Pick the goal that matters most right now." options={goals} value={profile.goal} onChange={(value) => setProfile({ ...profile, goal: value as Goal })} colors={colors} />
        ) : (
          <View style={styles.section}>
            <TrainMascot size={92} mood="impressed" />
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Build your starting profile.</Text>
            <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>Just the basics. You can change these later.</Text>
            <View style={styles.inputGrid}>
              <StatInput label="AGE" placeholder="24" value={profile.age} onChangeText={(age) => setProfile({ ...profile, age })} colors={colors} />
              <StatInput label="HEIGHT" placeholder="175 cm" value={profile.height} onChangeText={(height) => setProfile({ ...profile, height })} colors={colors} />
              <StatInput label="WEIGHT" placeholder="72 kg" value={profile.weight} onChangeText={(weight) => setProfile({ ...profile, weight })} colors={colors} />
            </View>
            <View style={[styles.profilePreview, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[styles.label, { color: colors.mutedForeground }]}>YOUR STARTING PROFILE</Text>
              <Text style={[styles.previewLevel, { color: colors.tint }]}>LEVEL 1</Text>
              <Text style={[styles.previewText, { color: colors.foreground }]}>{profile.goal} · {profile.experience}</Text>
            </View>
          </View>
        )}
      </ScrollView>
      <Pressable testID="onboarding-cta" onPress={next} style={({ pressed }) => [styles.primaryButton, { backgroundColor: colors.tint, opacity: pressed ? 0.82 : 1 }]}>
        <Text style={[styles.primaryText, { color: colors.primaryForeground }]}>{step === 0 ? 'GET STARTED' : step === 4 ? 'START TRAINING' : 'CONTINUE'}</Text>
        <Feather name="arrow-right" size={19} color={colors.primaryForeground} />
      </Pressable>
    </View>
  );
}

function ChoiceStep({ title, subtitle, options, value, onChange, colors }: { title: string; subtitle: string; options: string[]; value: string; onChange: (value: string) => void; colors: ReturnType<typeof useColors> }) {
  return (
    <View style={styles.section}>
      <Text style={[styles.sectionTitle, { color: colors.foreground }]}>{title}</Text>
      <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>{subtitle}</Text>
      <View style={styles.choiceList}>
        {options.map((option, index) => {
          const selected = option === value;
          return (
            <Pressable key={option} onPress={() => onChange(option)} style={({ pressed }) => [styles.choice, { backgroundColor: selected ? colors.tint : colors.card, borderColor: selected ? colors.tint : colors.border, opacity: pressed ? 0.8 : 1 }]}>
              <Text style={[styles.choiceText, { color: selected ? colors.primaryForeground : colors.foreground }]}>{option}</Text>
              {selected ? <Feather name="check" size={19} color={colors.primaryForeground} /> : <Text style={[styles.choiceIndex, { color: colors.mutedForeground }]}>{String(index + 1).padStart(2, '0')}</Text>}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

function StatInput({ label, placeholder, value, onChangeText, colors }: { label: string; placeholder: string; value: string; onChangeText: (text: string) => void; colors: ReturnType<typeof useColors> }) {
  return (
    <View style={styles.inputWrap}>
      <Text style={[styles.label, { color: colors.mutedForeground }]}>{label}</Text>
      <TextInput placeholder={placeholder} placeholderTextColor={colors.mutedForeground} value={value} onChangeText={onChangeText} keyboardType="numeric" style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.foreground }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, paddingHorizontal: 22 },
  loading: { flex: 1 },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  wordmark: { fontSize: 18, fontWeight: '800', letterSpacing: 1.6 },
  stepText: { fontSize: 12, fontWeight: '700', letterSpacing: 1 },
  content: { flexGrow: 1, justifyContent: 'center', paddingVertical: 30 },
  hero: { alignItems: 'center', paddingBottom: 34 },
  mascotHero: { marginBottom: 32 },
  eyebrow: { fontSize: 11, fontWeight: '800', letterSpacing: 1.5, marginBottom: 15, textAlign: 'center' },
  title: { fontSize: 42, lineHeight: 46, fontWeight: '800', letterSpacing: -1.8, textAlign: 'center', maxWidth: 350 },
  subtitle: { fontSize: 16, lineHeight: 24, marginTop: 12 },
  section: { width: '100%', paddingBottom: 24 },
  sectionTitle: { fontSize: 32, lineHeight: 37, fontWeight: '800', letterSpacing: -1, marginTop: 22 },
  benefitList: { gap: 12, marginTop: 28 },
  benefit: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 18, padding: 15, gap: 14 },
  iconCircle: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 15 },
  benefitCopy: { flex: 1, gap: 4 },
  benefitTitle: { fontSize: 16, fontWeight: '700' },
  benefitText: { fontSize: 13 },
  choiceList: { gap: 10, marginTop: 30 },
  choice: { minHeight: 58, borderWidth: 1, borderRadius: 17, paddingHorizontal: 17, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  choiceText: { fontSize: 16, fontWeight: '700' },
  choiceIndex: { fontSize: 12, fontWeight: '700', letterSpacing: 1 },
  inputGrid: { gap: 12, marginTop: 30 },
  inputWrap: { gap: 8 },
  label: { fontSize: 10, fontWeight: '800', letterSpacing: 1.2 },
  input: { borderWidth: 1, borderRadius: 15, height: 56, paddingHorizontal: 16, fontSize: 16, fontWeight: '600' },
  profilePreview: { marginTop: 18, borderWidth: 1, borderRadius: 18, padding: 18 },
  previewLevel: { fontSize: 28, fontWeight: '800', marginTop: 10 },
  previewText: { fontSize: 14, marginTop: 4 },
  primaryButton: { height: 60, borderRadius: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
  primaryText: { fontSize: 14, fontWeight: '800', letterSpacing: 1.3 },
});