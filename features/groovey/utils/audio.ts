/**
 * Web Audio API synthesizer for the Metronome Practice Bar.
 * Produces crisp mechanical woodblock/percussion ticks without external audio files.
 */

let audioCtx: AudioContext | null = null;
let timerWorker: number | null = null;
let isPlaying = false;
let currentBpm = 108;
let onTickCallback: ((beat: number) => void) | null = null;
let beatCount = 0;

function getAudioContext(): AudioContext {
  if (!audioCtx) {
    const AudioContextClass =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    audioCtx = new AudioContextClass();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

export function playClick(isAccent = false) {
  try {
    const ctx = getAudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    // Accent pitch (880Hz or 1000Hz) vs normal pitch (520Hz)
    osc.frequency.setValueAtTime(isAccent ? 987.77 : 659.25, ctx.currentTime);

    // Sharp percussive transient decay
    gain.gain.setValueAtTime(1.0, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.045);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.05);
  } catch (err) {
    console.warn('Audio click failed:', err);
  }
}

export function startMetronome(bpm: number, onTick?: (beat: number) => void) {
  stopMetronome();
  isPlaying = true;
  currentBpm = bpm;
  onTickCallback = onTick || null;
  beatCount = 0;

  getAudioContext();

  const intervalMs = (60 / bpm) * 1000;

  // Immediate first tick
  playClick(true);
  if (onTickCallback) onTickCallback(0);

  timerWorker = window.setInterval(() => {
    beatCount = (beatCount + 1) % 4;
    playClick(beatCount === 0);
    if (onTickCallback) {
      onTickCallback(beatCount);
    }
  }, intervalMs);
}

export function updateMetronomeBpm(bpm: number) {
  currentBpm = bpm;
  if (isPlaying) {
    startMetronome(bpm, onTickCallback || undefined);
  }
}

export function stopMetronome() {
  if (timerWorker !== null) {
    clearInterval(timerWorker);
    timerWorker = null;
  }
  isPlaying = false;
}

export function getMetronomeState() {
  return { isPlaying, currentBpm };
}
