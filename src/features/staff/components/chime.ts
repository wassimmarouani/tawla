/**
 * Notification sounds without audio files (spec 03: a distinct sound per event type). Browsers
 * start audio only after a user gesture: "Start service" calls unlockAudio() inside the tap.
 */

let context: AudioContext | null = null;

export function unlockAudio(): void {
  if (typeof AudioContext === 'undefined') return;
  context ??= new AudioContext();
  void context.resume();
  // A silent buffer finishes the unlock on iOS.
  const source = context.createBufferSource();
  source.buffer = context.createBuffer(1, 1, 22_050);
  source.connect(context.destination);
  source.start();
}

const PATTERNS: Record<'waiter' | 'bill', readonly { frequency: number; at: number }[]> = {
  // Two rising notes: a call.
  waiter: [
    { frequency: 784, at: 0 },
    { frequency: 1047, at: 0.22 },
  ],
  // Three even notes: the bill.
  bill: [
    { frequency: 659, at: 0 },
    { frequency: 659, at: 0.2 },
    { frequency: 880, at: 0.4 },
  ],
};

export function chime(kind: 'waiter' | 'bill'): void {
  if (!context) return;
  const start = context.currentTime;
  for (const note of PATTERNS[kind]) {
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = 'sine';
    oscillator.frequency.value = note.frequency;
    gain.gain.setValueAtTime(0.0001, start + note.at);
    gain.gain.exponentialRampToValueAtTime(0.4, start + note.at + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + note.at + 0.18);
    oscillator.connect(gain).connect(context.destination);
    oscillator.start(start + note.at);
    oscillator.stop(start + note.at + 0.2);
  }
}
