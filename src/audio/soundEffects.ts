/**
 * Procedural Web Audio Sound Engine for Cyber District FPS.
 * Generates instant, zero-latency, high-impact tactical audio without any external assets.
 */

let audioCtx: AudioContext | null = null;
let soundVolume = 0.8;
let masterBus: GainNode | null = null;
let compressor: DynamicsCompressorNode | null = null;

export function initSoundEngine(existingCtx?: AudioContext): AudioContext {
  if (existingCtx) {
    audioCtx = existingCtx;
  } else if (!audioCtx) {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    audioCtx = new AudioContextClass({ latencyHint: 'interactive' });
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {});
  }
  getMasterNode(audioCtx);
  return audioCtx;
}

export function setMasterVolume(vol: number) {
  soundVolume = Math.max(0, Math.min(1, vol));
  if (masterBus && audioCtx) {
    masterBus.gain.setValueAtTime(soundVolume, audioCtx.currentTime);
  }
}

function getCtx(): AudioContext | null {
  if (!audioCtx) initSoundEngine();
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
}

function getMasterNode(ctx: AudioContext): AudioNode {
  if (!masterBus) {
    compressor = ctx.createDynamicsCompressor();
    compressor.threshold.setValueAtTime(-12, ctx.currentTime);
    compressor.knee.setValueAtTime(12, ctx.currentTime);
    compressor.ratio.setValueAtTime(8, ctx.currentTime);
    compressor.attack.setValueAtTime(0.002, ctx.currentTime);
    compressor.release.setValueAtTime(0.12, ctx.currentTime);

    masterBus = ctx.createGain();
    masterBus.gain.setValueAtTime(soundVolume, ctx.currentTime);

    masterBus.connect(compressor);
    compressor.connect(ctx.destination);
  }
  return masterBus;
}

/**
 * Concussive sub-bass explosion helper that delivers a visceral acoustic shockwave
 */
function playAcousticBoom(
  ctx: AudioContext,
  t: number,
  startHz: number,
  endHz: number,
  duration: number,
  amplitude: number,
  noiseDecay: number = 0.22
) {
  const master = getMasterNode(ctx);

  // 1. Deep Sub-bass pitch dive (vibrates chest/headset)
  const sub = ctx.createOscillator();
  const subGain = ctx.createGain();
  sub.type = 'sine';
  sub.frequency.setValueAtTime(startHz, t);
  sub.frequency.exponentialRampToValueAtTime(Math.max(18, endHz), t + duration);

  subGain.gain.setValueAtTime(amplitude, t);
  subGain.gain.exponentialRampToValueAtTime(0.001, t + duration);

  sub.connect(subGain);
  subGain.connect(master);
  sub.start(t);
  sub.stop(t + duration);

  // 2. Concussive Low-pass Air Shockwave Noise (the "boom" blast in the air)
  const bufferSize = Math.floor(ctx.sampleRate * noiseDecay);
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    // Pink/Brownian weighted random noise for low-end rumble
    data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (ctx.sampleRate * 0.08));
  }

  const noise = ctx.createBufferSource();
  noise.buffer = buffer;

  const lowpass = ctx.createBiquadFilter();
  lowpass.type = 'lowpass';
  lowpass.frequency.setValueAtTime(380, t);
  lowpass.frequency.exponentialRampToValueAtTime(65, t + noiseDecay);
  lowpass.Q.setValueAtTime(2.2, t); // Resonant low-end thump

  const noiseGain = ctx.createGain();
  noiseGain.gain.setValueAtTime(amplitude * 0.9, t);
  noiseGain.gain.exponentialRampToValueAtTime(0.001, t + noiseDecay);

  noise.connect(lowpass);
  lowpass.connect(noiseGain);
  noiseGain.connect(master);
  noise.start(t);
  noise.stop(t + noiseDecay);
}

// 1. WEAPON FIRING SOUNDS (ENHANCED WITH HEAVY BOOM EFFECT)

/** Pulse Assault Rifle: Punchy military rifle with deep concussive boom */
export function playPulseAR() {
  const ctx = getCtx();
  if (!ctx) return;
  const t = ctx.currentTime;
  const master = getMasterNode(ctx);

  // Visceral Concussive Boom
  playAcousticBoom(ctx, t, 190, 32, 0.28, 0.95, 0.22);

  // Mid-punch body oscillator (sharp kinetic hit)
  const mid = ctx.createOscillator();
  const midGain = ctx.createGain();
  mid.type = 'sawtooth';
  mid.frequency.setValueAtTime(320, t);
  mid.frequency.exponentialRampToValueAtTime(55, t + 0.14);

  midGain.gain.setValueAtTime(0.55, t);
  midGain.gain.exponentialRampToValueAtTime(0.001, t + 0.14);

  mid.connect(midGain);
  midGain.connect(master);
  mid.start(t);
  mid.stop(t + 0.14);

  // Supersonic muzzle crack transient
  const bufferSize = Math.floor(ctx.sampleRate * 0.07);
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;

  const snap = ctx.createBufferSource();
  snap.buffer = buffer;

  const bandpass = ctx.createBiquadFilter();
  bandpass.type = 'bandpass';
  bandpass.frequency.setValueAtTime(1700, t);
  bandpass.Q.setValueAtTime(3.0, t);

  const snapGain = ctx.createGain();
  snapGain.gain.setValueAtTime(0.65, t);
  snapGain.gain.exponentialRampToValueAtTime(0.001, t + 0.07);

  snap.connect(bandpass);
  bandpass.connect(snapGain);
  snapGain.connect(master);
  snap.start(t);
  snap.stop(t + 0.07);
}

/** Vector SMG: High-cadence tactical SMG with punchy bass thud */
export function playVectorSMG() {
  const ctx = getCtx();
  if (!ctx) return;
  const t = ctx.currentTime;
  const master = getMasterNode(ctx);

  // Tight sub-bass thump on each shot
  playAcousticBoom(ctx, t, 160, 38, 0.15, 0.8, 0.12);

  // Mid mechanical cycle
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'triangle';
  osc.frequency.setValueAtTime(340, t);
  osc.frequency.exponentialRampToValueAtTime(65, t + 0.08);

  gain.gain.setValueAtTime(0.48, t);
  gain.gain.exponentialRampToValueAtTime(0.001, t + 0.08);

  // Short sharp crack transient
  const bufferSize = Math.floor(ctx.sampleRate * 0.04);
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;

  const noise = ctx.createBufferSource();
  noise.buffer = buffer;
  const filter = ctx.createBiquadFilter();
  filter.type = 'highpass';
  filter.frequency.setValueAtTime(1800, t);

  const noiseGain = ctx.createGain();
  noiseGain.gain.setValueAtTime(0.45, t);
  noiseGain.gain.exponentialRampToValueAtTime(0.001, t + 0.04);

  osc.connect(gain);
  gain.connect(master);
  noise.connect(filter);
  filter.connect(noiseGain);
  noiseGain.connect(master);

  osc.start(t);
  osc.stop(t + 0.08);
  noise.start(t);
  noise.stop(t + 0.04);
}

/** Cyber-Shotgun: Massive, room-shaking cinematic explosion boom */
export function playShotgun() {
  const ctx = getCtx();
  if (!ctx) return;
  const t = ctx.currentTime;
  const master = getMasterNode(ctx);

  // Massive Earth-shaking Concussive Sub Boom
  playAcousticBoom(ctx, t, 140, 20, 0.52, 1.35, 0.42);

  // Heavy concussive body punch
  const body = ctx.createOscillator();
  const bodyGain = ctx.createGain();
  body.type = 'sawtooth';
  body.frequency.setValueAtTime(220, t);
  body.frequency.exponentialRampToValueAtTime(32, t + 0.32);

  bodyGain.gain.setValueAtTime(0.85, t);
  bodyGain.gain.exponentialRampToValueAtTime(0.001, t + 0.32);

  body.connect(bodyGain);
  bodyGain.connect(master);
  body.start(t);
  body.stop(t + 0.32);

  // Expansive blast wave noise
  const bufferSize = Math.floor(ctx.sampleRate * 0.32);
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (ctx.sampleRate * 0.09));
  }

  const noise = ctx.createBufferSource();
  noise.buffer = buffer;

  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.setValueAtTime(3500, t);
  filter.frequency.exponentialRampToValueAtTime(220, t + 0.32);

  const noiseGain = ctx.createGain();
  noiseGain.gain.setValueAtTime(1.0, t);
  noiseGain.gain.exponentialRampToValueAtTime(0.001, t + 0.32);

  noise.connect(filter);
  filter.connect(noiseGain);
  noiseGain.connect(master);

  noise.start(t);
  noise.stop(t + 0.32);
}

/** Rail Sniper: Devastating electromagnetic kinetic cannon shockwave + seismic boom */
export function playRailSniper() {
  const ctx = getCtx();
  if (!ctx) return;
  const t = ctx.currentTime;
  const master = getMasterNode(ctx);

  // Seismic Sub-bass Shockwave Boom
  playAcousticBoom(ctx, t, 170, 18, 0.70, 1.45, 0.55);

  // High-voltage electromagnetic ionizing discharge
  const zap = ctx.createOscillator();
  const zapGain = ctx.createGain();
  zap.type = 'sawtooth';
  zap.frequency.setValueAtTime(1200, t);
  zap.frequency.exponentialRampToValueAtTime(60, t + 0.42);

  zapGain.gain.setValueAtTime(0.75, t);
  zapGain.gain.exponentialRampToValueAtTime(0.001, t + 0.42);

  // Second harmonic sizzle
  const zapHarmonic = ctx.createOscillator();
  const zapHGain = ctx.createGain();
  zapHarmonic.type = 'triangle';
  zapHarmonic.frequency.setValueAtTime(2400, t);
  zapHarmonic.frequency.exponentialRampToValueAtTime(120, t + 0.28);
  zapHGain.gain.setValueAtTime(0.4, t);
  zapHGain.gain.exponentialRampToValueAtTime(0.001, t + 0.28);

  // Resonant electric crackle shockwave
  const bufferSize = Math.floor(ctx.sampleRate * 0.25);
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;

  const noise = ctx.createBufferSource();
  noise.buffer = buffer;
  const filter = ctx.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.setValueAtTime(2800, t);
  filter.Q.setValueAtTime(4.0, t);

  const noiseGain = ctx.createGain();
  noiseGain.gain.setValueAtTime(0.85, t);
  noiseGain.gain.exponentialRampToValueAtTime(0.001, t + 0.25);

  zap.connect(zapGain);
  zapGain.connect(master);
  zapHarmonic.connect(zapHGain);
  zapHGain.connect(master);
  noise.connect(filter);
  filter.connect(noiseGain);
  noiseGain.connect(master);

  zap.start(t);
  zap.stop(t + 0.42);
  zapHarmonic.start(t);
  zapHarmonic.stop(t + 0.28);
  noise.start(t);
  noise.stop(t + 0.25);
}

/** Headshot Ding: Sharp, resonant, high-dopamine metallic strike */
export function playHeadshotDing() {
  const ctx = getCtx();
  if (!ctx) return;
  const t = ctx.currentTime;
  const master = getMasterNode(ctx);

  // 1. Dual high-frequency resonant metallic bells (bell strike harmonic)
  [3136, 4186, 6272].forEach((freq, idx) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, t);
    osc.frequency.exponentialRampToValueAtTime(freq * 0.98, t + 0.45);

    const amp = (idx === 0 ? 0.65 : (idx === 1 ? 0.45 : 0.25)) * soundVolume;
    gain.gain.setValueAtTime(amp, t);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + (idx === 0 ? 0.48 : 0.35));

    osc.connect(gain);
    gain.connect(master);
    osc.start(t);
    osc.stop(t + 0.5);
  });

  // 2. High-impact kinetic crack transient
  const snapOsc = ctx.createOscillator();
  const snapGain = ctx.createGain();
  snapOsc.type = 'triangle';
  snapOsc.frequency.setValueAtTime(4800, t);
  snapOsc.frequency.exponentialRampToValueAtTime(800, t + 0.05);

  snapGain.gain.setValueAtTime(0.55 * soundVolume, t);
  snapGain.gain.exponentialRampToValueAtTime(0.001, t + 0.05);

  snapOsc.connect(snapGain);
  snapGain.connect(master);
  snapOsc.start(t);
  snapOsc.stop(t + 0.05);
}

/** Multi-Kill Streak Announcer Fanfare Stings */
export function playMultiKillSting(streak: number) {
  const ctx = getCtx();
  if (!ctx) return;
  const t = ctx.currentTime;
  const master = getMasterNode(ctx);

  if (streak === 2) {
    // DOUBLE KILL: Punchy two-tone power chord (F#5 -> A#5)
    [740, 932.3].forEach((f, i) => {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = 'triangle';
      const delay = i * 0.08;
      osc.frequency.setValueAtTime(f, t + delay);
      g.gain.setValueAtTime(0, t);
      g.gain.setValueAtTime(0.5 * soundVolume, t + delay);
      g.gain.exponentialRampToValueAtTime(0.001, t + delay + 0.45);
      osc.connect(g);
      g.connect(master);
      osc.start(t + delay);
      osc.stop(t + delay + 0.45);
    });
  } else if (streak === 3) {
    // TRIPLE KILL: Triumphant triad fanfare (D5 -> F#5 -> A5)
    [587.33, 739.99, 880.0].forEach((f, i) => {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = 'sawtooth';
      const delay = i * 0.07;
      osc.frequency.setValueAtTime(f, t + delay);
      g.gain.setValueAtTime(0, t);
      g.gain.setValueAtTime(0.42 * soundVolume, t + delay);
      g.gain.exponentialRampToValueAtTime(0.001, t + delay + 0.6);
      osc.connect(g);
      g.connect(master);
      osc.start(t + delay);
      osc.stop(t + delay + 0.6);
    });
  } else {
    // RAMPAGE / ACE: Heavy Sub Bomb + Majestic High Chord
    playAcousticBoom(ctx, t, 160, 24, 0.45, 1.2, 0.3);
    [880, 1108.73, 1318.51, 1760].forEach((f, i) => {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = 'triangle';
      const delay = i * 0.06;
      osc.frequency.setValueAtTime(f, t + delay);
      g.gain.setValueAtTime(0, t);
      g.gain.setValueAtTime(0.55 * soundVolume, t + delay);
      g.gain.exponentialRampToValueAtTime(0.001, t + delay + 0.75);
      osc.connect(g);
      g.connect(master);
      osc.start(t + delay);
      osc.stop(t + delay + 0.75);
    });
  }
}

/** Hitmarker: Crisp, tactical tick with headshot metallic ping and health-proportional pitch */
export function playHitmarker(isKill: boolean = false, isHeadshot: boolean = false, healthPercent: number = 1.0) {
  const ctx = getCtx();
  if (!ctx) return;
  const t = ctx.currentTime;

  if (isHeadshot) {
    playHeadshotDing();
    if (isKill) {
      setTimeout(() => playKillConfirmed(), 35);
    }
    return;
  }

  if (isKill) {
    // Lethal Kill Hitmarker: sharp concussive snap + resonant confirmation chord
    const snapOsc = ctx.createOscillator();
    const snapGain = ctx.createGain();
    snapOsc.type = 'triangle';
    snapOsc.frequency.setValueAtTime(3200, t);
    snapOsc.frequency.exponentialRampToValueAtTime(450, t + 0.08);

    snapGain.gain.setValueAtTime(0.58 * soundVolume, t);
    snapGain.gain.exponentialRampToValueAtTime(0.001, t + 0.08);

    snapOsc.connect(snapGain);
    snapGain.connect(ctx.destination);
    snapOsc.start(t);
    snapOsc.stop(t + 0.08);

    // Uplifting punch resonance
    const subOsc = ctx.createOscillator();
    const subGain = ctx.createGain();
    subOsc.type = 'sine';
    subOsc.frequency.setValueAtTime(880, t);
    subOsc.frequency.exponentialRampToValueAtTime(1174, t + 0.12);

    subGain.gain.setValueAtTime(0.38 * soundVolume, t);
    subGain.gain.exponentialRampToValueAtTime(0.001, t + 0.12);

    subOsc.connect(subGain);
    subGain.connect(ctx.destination);
    subOsc.start(t);
    subOsc.stop(t + 0.12);
  } else {
    // Body Hitmarker: Pitch scales higher as enemy health gets lower (from ~2100Hz at 100% up to ~3400Hz near death)
    const hpClamped = Math.max(0.05, Math.min(1.0, healthPercent));
    const baseFreq = 2100 + (1.0 - hpClamped) * 1300;
    const endFreq = baseFreq + 700;

    const tickOsc = ctx.createOscillator();
    const tickGain = ctx.createGain();
    tickOsc.type = 'sine';
    tickOsc.frequency.setValueAtTime(baseFreq, t);
    tickOsc.frequency.exponentialRampToValueAtTime(endFreq, t + 0.038);

    tickGain.gain.setValueAtTime(0.50 * soundVolume, t);
    tickGain.gain.exponentialRampToValueAtTime(0.001, t + 0.038);

    // Micro mechanical click transient
    const clickOsc = ctx.createOscillator();
    const clickGain = ctx.createGain();
    clickOsc.type = 'square';
    clickOsc.frequency.setValueAtTime(1400, t);
    clickOsc.frequency.exponentialRampToValueAtTime(350, t + 0.016);

    clickGain.gain.setValueAtTime(0.28 * soundVolume, t);
    clickGain.gain.exponentialRampToValueAtTime(0.001, t + 0.016);

    tickOsc.connect(tickGain);
    clickOsc.connect(clickGain);
    tickGain.connect(ctx.destination);
    clickGain.connect(ctx.destination);

    tickOsc.start(t);
    clickOsc.start(t);
    tickOsc.stop(t + 0.038);
    clickOsc.stop(t + 0.016);
  }
}

/** Slide-Dash: High-speed thruster with crisp friction skate */
export function playSlideDash() {
  const ctx = getCtx();
  if (!ctx) return;
  const t = ctx.currentTime;

  const bufferSize = ctx.sampleRate * 0.35;
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;

  const noise = ctx.createBufferSource();
  noise.buffer = buffer;

  const filter = ctx.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.setValueAtTime(700, t);
  filter.frequency.exponentialRampToValueAtTime(1600, t + 0.12);
  filter.frequency.exponentialRampToValueAtTime(250, t + 0.35);

  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.35 * soundVolume, t);
  gain.gain.linearRampToValueAtTime(0.55 * soundVolume, t + 0.08);
  gain.gain.exponentialRampToValueAtTime(0.001, t + 0.35);

  noise.connect(filter);
  filter.connect(gain);
  gain.connect(ctx.destination);

  noise.start(t);
  noise.stop(t + 0.35);

  // Metallic skate scrape harmonic
  const scrape = ctx.createOscillator();
  const scrapeGain = ctx.createGain();
  scrape.type = 'sawtooth';
  scrape.frequency.setValueAtTime(520, t);
  scrape.frequency.linearRampToValueAtTime(280, t + 0.22);
  scrapeGain.gain.setValueAtTime(0.18 * soundVolume, t);
  scrapeGain.gain.exponentialRampToValueAtTime(0.001, t + 0.22);
  scrape.connect(scrapeGain);
  scrapeGain.connect(ctx.destination);
  scrape.start(t);
  scrape.stop(t + 0.22);
}

/** Jump Sound: Quick mechanical jump boost */
export function playJump() {
  const ctx = getCtx();
  if (!ctx) return;
  const t = ctx.currentTime;

  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(90, t);
  osc.frequency.linearRampToValueAtTime(180, t + 0.1);

  gain.gain.setValueAtTime(0.25 * soundVolume, t);
  gain.gain.exponentialRampToValueAtTime(0.001, t + 0.1);

  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.start(t);
  osc.stop(t + 0.1);
}

/** Reload Start: Mechanical latch slide */
export function playReloadStart() {
  const ctx = getCtx();
  if (!ctx) return;
  const t = ctx.currentTime;

  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'sawtooth';
  osc.frequency.setValueAtTime(420, t);
  osc.frequency.exponentialRampToValueAtTime(210, t + 0.09);

  gain.gain.setValueAtTime(0.25 * soundVolume, t);
  gain.gain.exponentialRampToValueAtTime(0.001, t + 0.09);

  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.start(t);
  osc.stop(t + 0.09);
}

/** Reload Finish: Heavy magazine lock */
export function playReloadFinish() {
  const ctx = getCtx();
  if (!ctx) return;
  const t = ctx.currentTime;

  const osc1 = ctx.createOscillator();
  const osc2 = ctx.createOscillator();
  const gain = ctx.createGain();

  osc1.type = 'triangle';
  osc1.frequency.setValueAtTime(320, t);
  osc1.frequency.exponentialRampToValueAtTime(120, t + 0.1);

  osc2.type = 'sine';
  osc2.frequency.setValueAtTime(160, t);
  osc2.frequency.exponentialRampToValueAtTime(80, t + 0.12);

  gain.gain.setValueAtTime(0.35 * soundVolume, t);
  gain.gain.exponentialRampToValueAtTime(0.001, t + 0.12);

  osc1.connect(gain);
  osc2.connect(gain);
  gain.connect(ctx.destination);

  osc1.start(t);
  osc2.start(t);
  osc1.stop(t + 0.1);
  osc2.stop(t + 0.12);
}

/** Damage Taken: Low thud + static punch */
export function playDamageTaken() {
  const ctx = getCtx();
  if (!ctx) return;
  const t = ctx.currentTime;

  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'sawtooth';
  osc.frequency.setValueAtTime(120, t);
  osc.frequency.exponentialRampToValueAtTime(35, t + 0.18);

  gain.gain.setValueAtTime(0.45 * soundVolume, t);
  gain.gain.exponentialRampToValueAtTime(0.001, t + 0.18);

  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.start(t);
  osc.stop(t + 0.18);
}

/** Kill Confirmed: Addictive, ultra-satisfying coin-flip bing + high-dopamine harmonic chime */
export function playKillConfirmed() {
  const ctx = getCtx();
  if (!ctx) return;
  const t = ctx.currentTime;
  const master = getMasterNode(ctx);

  // 1. Crisp Metallic Coin Ring / Silver Clink Transient
  const clinkOsc = ctx.createOscillator();
  const clinkGain = ctx.createGain();
  clinkOsc.type = 'sine';
  clinkOsc.frequency.setValueAtTime(2489, t); // High D#7 silver bell
  clinkOsc.frequency.exponentialRampToValueAtTime(3136, t + 0.04);
  clinkGain.gain.setValueAtTime(0.6 * soundVolume, t);
  clinkGain.gain.exponentialRampToValueAtTime(0.001, t + 0.45);
  clinkOsc.connect(clinkGain);
  clinkGain.connect(master);
  clinkOsc.start(t);
  clinkOsc.stop(t + 0.45);

  // 2. Rising Two-Tone Arcade "Coin Flip / Cash-In" Bing (D6 -> A6)
  [1174.66, 1760.0].forEach((freq, idx) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const delay = idx * 0.075;

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq, t + delay);

    gain.gain.setValueAtTime(0, t);
    gain.gain.setValueAtTime(0.48 * soundVolume, t + delay);
    gain.gain.exponentialRampToValueAtTime(0.001, t + delay + 0.38);

    osc.connect(gain);
    gain.connect(master);

    osc.start(t + delay);
    osc.stop(t + delay + 0.38);
  });

  // 3. Resonant Sub-Thump to give the elimination visceral physical weight
  const sub = ctx.createOscillator();
  const subGain = ctx.createGain();
  sub.type = 'sine';
  sub.frequency.setValueAtTime(145, t);
  sub.frequency.exponentialRampToValueAtTime(42, t + 0.14);
  subGain.gain.setValueAtTime(0.5 * soundVolume, t);
  subGain.gain.exponentialRampToValueAtTime(0.001, t + 0.14);
  sub.connect(subGain);
  subGain.connect(master);
  sub.start(t);
  sub.stop(t + 0.14);
}

/** Match Start Horn / Chime */
export function playMatchStart() {
  const ctx = getCtx();
  if (!ctx) return;
  const t = ctx.currentTime;

  [440, 554.37, 659.25, 880].forEach((freq, idx) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const delay = idx * 0.09;

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq, t + delay);

    gain.gain.setValueAtTime(0, t);
    gain.gain.setValueAtTime(0.3 * soundVolume, t + delay);
    gain.gain.exponentialRampToValueAtTime(0.001, t + delay + 0.35);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(t + delay);
    osc.stop(t + delay + 0.35);
  });
}

/** Victory Fanfare */
export function playVictory() {
  const ctx = getCtx();
  if (!ctx) return;
  const t = ctx.currentTime;

  [523.25, 659.25, 783.99, 1046.5].forEach((freq, idx) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const delay = idx * 0.12;

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq, t + delay);

    gain.gain.setValueAtTime(0, t);
    gain.gain.setValueAtTime(0.4 * soundVolume, t + delay);
    gain.gain.exponentialRampToValueAtTime(0.001, t + delay + 0.6);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(t + delay);
    osc.stop(t + delay + 0.6);
  });
}

/** Defeat Drone */
export function playDefeat() {
  const ctx = getCtx();
  if (!ctx) return;
  const t = ctx.currentTime;

  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'sawtooth';
  osc.frequency.setValueAtTime(140, t);
  osc.frequency.linearRampToValueAtTime(65, t + 0.8);

  gain.gain.setValueAtTime(0.35 * soundVolume, t);
  gain.gain.exponentialRampToValueAtTime(0.001, t + 0.8);

  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.start(t);
  osc.stop(t + 0.8);
}

/** Subtle tactical boots footstep on metal/concrete */
let footstepToggle = false;
export function playFootstep() {
  const ctx = getCtx();
  if (!ctx) return;
  const t = ctx.currentTime;
  const master = getMasterNode(ctx);
  
  footstepToggle = !footstepToggle;
  const baseFreq = footstepToggle ? 80 : 92;

  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(baseFreq, t);
  osc.frequency.exponentialRampToValueAtTime(32, t + 0.07);

  gain.gain.setValueAtTime(0.24, t);
  gain.gain.exponentialRampToValueAtTime(0.001, t + 0.07);

  // Soft friction noise
  const bufferSize = Math.floor(ctx.sampleRate * 0.035);
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;

  const noise = ctx.createBufferSource();
  noise.buffer = buffer;
  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.setValueAtTime(550, t);

  const noiseGain = ctx.createGain();
  noiseGain.gain.setValueAtTime(0.18, t);
  noiseGain.gain.exponentialRampToValueAtTime(0.001, t + 0.035);

  osc.connect(gain);
  gain.connect(master);
  noise.connect(filter);
  filter.connect(noiseGain);
  noiseGain.connect(master);

  osc.start(t);
  osc.stop(t + 0.07);
  noise.start(t);
  noise.stop(t + 0.035);
}

/** Metallic ricochet / wall impact spark clink */
export function playWallRicochet() {
  const ctx = getCtx();
  if (!ctx) return;
  const t = ctx.currentTime;
  const master = getMasterNode(ctx);

  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'triangle';
  const startF = 1900 + Math.random() * 1100;
  osc.frequency.setValueAtTime(startF, t);
  osc.frequency.exponentialRampToValueAtTime(280, t + 0.06);

  gain.gain.setValueAtTime(0.25, t);
  gain.gain.exponentialRampToValueAtTime(0.001, t + 0.06);

  osc.connect(gain);
  gain.connect(master);
  osc.start(t);
  osc.stop(t + 0.06);
}

/** 3D Spatial gunshot crack with distance volume attenuation and directional panning */
export function playRemoteGunshot(weaponKey: string = 'AR', volume: number = 0.5, pan: number = 0) {
  const ctx = getCtx();
  if (!ctx) return;
  const t = ctx.currentTime;
  const master = getMasterNode(ctx);

  const gain = ctx.createGain();
  gain.gain.setValueAtTime(Math.max(0.01, Math.min(1.0, volume)), t);

  let pannerNode: AudioNode = gain;
  if (ctx.createStereoPanner) {
    try {
      const stereo = ctx.createStereoPanner();
      stereo.pan.setValueAtTime(Math.max(-0.95, Math.min(0.95, pan)), t);
      gain.connect(stereo);
      pannerNode = stereo;
    } catch (_) {}
  }
  pannerNode.connect(master);

  // Distant acoustic crack / blast
  const osc = ctx.createOscillator();
  const oscGain = ctx.createGain();
  osc.type = weaponKey === 'SNIPER' ? 'triangle' : 'sawtooth';
  const startHz = weaponKey === 'SNIPER' ? 240 : (weaponKey === 'SMG' ? 440 : 320);
  const endHz = weaponKey === 'SNIPER' ? 45 : 65;
  const dur = weaponKey === 'SNIPER' ? 0.32 : (weaponKey === 'SHOTGUN' ? 0.28 : 0.16);

  osc.frequency.setValueAtTime(startHz, t);
  osc.frequency.exponentialRampToValueAtTime(endHz, t + dur);

  oscGain.gain.setValueAtTime(0.65, t);
  oscGain.gain.exponentialRampToValueAtTime(0.001, t + dur);

  osc.connect(oscGain);
  oscGain.connect(gain);
  osc.start(t);
  osc.stop(t + dur);

  // High-frequency kinetic muzzle pop
  const snap = ctx.createOscillator();
  const snapGain = ctx.createGain();
  snap.type = 'sine';
  snap.frequency.setValueAtTime(weaponKey === 'SNIPER' ? 2200 : 1600, t);
  snap.frequency.exponentialRampToValueAtTime(300, t + 0.04);
  snapGain.gain.setValueAtTime(0.4, t);
  snapGain.gain.exponentialRampToValueAtTime(0.001, t + 0.04);
  snap.connect(snapGain);
  snapGain.connect(gain);
  snap.start(t);
  snap.stop(t + 0.04);
}
