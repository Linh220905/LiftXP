import { Platform } from 'react-native';
import * as Haptics from 'expo-haptics';

/**
 * Audio chime and haptic feedback alert for rest timer completion.
 * Replicates Arrow's dingling chime behavior.
 */
let audioCtx: any = null;

function getAudioContext(): any {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return null;
  try {
    const AudioContextClass =
      (window as any).AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return null;
    if (!audioCtx || audioCtx.state === 'closed') {
      audioCtx = new AudioContextClass();
    }
    if (audioCtx.state === 'suspended') {
      void audioCtx.resume();
    }
    return audioCtx;
  } catch {
    return null;
  }
}

export function playRestTimerChime(): void {
  // 1. Always fire primary haptic on mobile
  void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

  // 2. Synthesize chime sound on Web/browsers
  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    const now = ctx.currentTime;

    // Harmonic bell chime chords (C5 -> G5 -> C6)
    const notes = [
      { freq: 523.25, start: 0, duration: 0.35, gain: 0.25 },
      { freq: 783.99, start: 0.08, duration: 0.45, gain: 0.3 },
      { freq: 1046.5, start: 0.16, duration: 0.7, gain: 0.35 },
    ];

    notes.forEach(({ freq, start, duration, gain }) => {
      const osc = ctx.createOscillator();
      const gainNode = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + start);

      gainNode.gain.setValueAtTime(0.001, now + start);
      gainNode.gain.exponentialRampToValueAtTime(gain, now + start + 0.03);
      gainNode.gain.exponentialRampToValueAtTime(0.0001, now + start + duration);

      osc.connect(gainNode);
      gainNode.connect(ctx.destination);

      osc.start(now + start);
      osc.stop(now + start + duration + 0.05);
    });
  } catch {
    // Fail silently if audio blocked by browser policy
  }
}
