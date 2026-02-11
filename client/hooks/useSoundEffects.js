import { useCallback, useRef, useState } from 'react';

const buildTone = (audioContext, { frequency, durationMs, type = 'sine', gain = 0.035 }) => {
  const oscillator = audioContext.createOscillator();
  const gainNode = audioContext.createGain();
  const now = audioContext.currentTime;

  oscillator.type = type;
  oscillator.frequency.setValueAtTime(frequency, now);

  gainNode.gain.setValueAtTime(0.0001, now);
  gainNode.gain.exponentialRampToValueAtTime(gain, now + 0.01);
  gainNode.gain.exponentialRampToValueAtTime(0.0001, now + durationMs / 1000);

  oscillator.connect(gainNode);
  gainNode.connect(audioContext.destination);

  oscillator.start(now);
  oscillator.stop(now + durationMs / 1000 + 0.02);
};

export const useSoundEffects = () => {
  const [muted, setMuted] = useState(false);
  const audioContextRef = useRef(null);

  const ensureContext = useCallback(async () => {
    if (typeof window === 'undefined') {
      return null;
    }

    if (!audioContextRef.current) {
      audioContextRef.current = new window.AudioContext();
    }

    if (audioContextRef.current.state === 'suspended') {
      await audioContextRef.current.resume();
    }

    return audioContextRef.current;
  }, []);

  const playMoveFeedback = useCallback(
    async ({ capture = false, check = false } = {}) => {
      if (muted) {
        return;
      }

      const audioContext = await ensureContext();
      if (!audioContext) {
        return;
      }

      if (capture) {
        buildTone(audioContext, { frequency: 210, durationMs: 105, type: 'triangle', gain: 0.045 });
      } else {
        buildTone(audioContext, { frequency: 460, durationMs: 90, type: 'sine', gain: 0.03 });
      }

      if (check) {
        setTimeout(() => {
          buildTone(audioContext, { frequency: 660, durationMs: 70, type: 'square', gain: 0.02 });
        }, 55);
      }
    },
    [ensureContext, muted]
  );

  const toggleMuted = useCallback(() => {
    setMuted((previous) => !previous);
  }, []);

  return {
    muted,
    toggleMuted,
    playMoveFeedback,
  };
};
