// Interface sounds, synthesised with the Web Audio API: no files.
// Ported from Bencho's sounds (https://bencho.dev/sounds, MIT, (c) 2026
// Lorenzo Cabra; Beacon and Plop rebuilt from cuelume by Daniel Belyi, MIT).
// Each sound is a few notes: an oscillator or filtered noise, a lowpass and
// an envelope. Plain script: sets globalThis.tetherSound.
(() => {
  const SOUNDS = {
  /* Paid · Feedback */
  paid: [
    { hz: 587, ms: 170, gain: 0.05, wave: "sine", cut: 2600, atk: 5 },
    { hz: 880, ms: 460, gain: 0.046, wave: "sine", cut: 2800, atk: 6, at: 95 },
    { hz: 1760, ms: 300, gain: 0.009, wave: "sine", atk: 8, at: 100 },
  ],
  /* Landed · Feedback */
  landed: [
    { hz: 330, to: 620, ms: 120, gain: 0.018, wave: "triangle", cut: 1400, atk: 30 },
    { hz: 784, ms: 120, gain: 0.04, wave: "sine", cut: 2600, atk: 4, at: 70 },
    { hz: 1047, ms: 130, gain: 0.04, wave: "sine", cut: 2800, atk: 4, at: 140 },
    { hz: 1319, ms: 520, gain: 0.044, wave: "sine", cut: 3000, atk: 5, at: 210 },
    { hz: 2638, ms: 320, gain: 0.007, wave: "sine", atk: 8, at: 215 },
  ],
  /* Plop · Actions */
  plop: [
    { hz: 480, to: 300, glide: 18, ms: 23, gain: 0.064, atk: 1 },
    { hz: 600, to: 900, glide: 40, ms: 61, gain: 0.015, atk: 12 },
    { hz: 960, to: 600, glide: 18, ms: 18, gain: 0.016, atk: 1 },
  ],
  /* Beacon · Notifications */
  beacon: [
    { hz: 2500, ms: 5, gain: 0.029, noise: "lowpass", q: -3, atk: 1 },
    { hz: 880, ms: 602, gain: 0.026, atk: 3 },
    { hz: 2428.8, ms: 283, gain: 0.0077, atk: 3 },
    { hz: 4752, ms: 172, gain: 0.0026, atk: 3 },
    { hz: 882, ms: 573, gain: 0.014, atk: 3 },
    { hz: 1318.51, ms: 562, gain: 0.02, atk: 3 },
    { hz: 3639.1, ms: 264, gain: 0.0059, atk: 3 },
  ],
  /* Drift · Movement */
  drift: [
    { hz: 174, to: 155, ms: 250, gain: 0.034, wave: "sine", cut: 640, atk: 28 },
  ],
  /* Hush · System */
  hush: [
    { hz: 330, to: 247, ms: 88, gain: 0.03, wave: "sine", cut: 720, atk: 8 },
  ],
  /* Wisp · Movement */
  wisp: [
    { hz: 660, to: 720, ms: 38, gain: 0.028, wave: "sine" },
  ],
  /* Sigh · Feedback */
  sigh: [
    { hz: 262, to: 131, ms: 28, gain: 0.065, wave: "triangle", cut: 1700, atk: 8 },
  ],
  /* Perk · Notifications */
  perk: [
    { hz: 330, ms: 360, gain: 0.053, wave: "sine", cut: 560, atk: 90 },
  ],
  /* Purr · System */
  purr: [
    { hz: 92, ms: 350, gain: 0.046, wave: "triangle", cut: 1100, atk: 32 },
  ],
  /* Lull · Movement */
  lull: [
    { hz: 234, ms: 214, gain: 0.054, wave: "sine", cut: 820, atk: 8 },
  ],
  /* Whisk · Navigation */
  whisk: [
    { hz: 124, to: 65, ms: 130, gain: 0.067, wave: "sine", cut: 560, atk: 50 },
  ],
  /* Buzz · Feedback */
  buzz: [
    { hz: 344, to: 239, ms: 24, gain: 0.048, wave: "triangle", cut: 1100, atk: 7 },
  ],
  /* Bump · Feedback */
  bump: [
    { hz: 208, to: 165, ms: 120, gain: 0.03, wave: "sine", cut: 520, atk: 10 },
  ],
  /* Float · Movement */
  float: [
    { hz: 262, ms: 322, gain: 0.052, wave: "sine", cut: 820, atk: 16 },
  ],
  /* Glide · Navigation */
  glide: [
    { hz: 397, to: 276, ms: 205, gain: 0.065, wave: "sine", cut: 820, atk: 90 },
  ],
  /* Step · Navigation */
  step: [
    { hz: 227, to: 114, ms: 311, gain: 0.051, wave: "sine", cut: 820, atk: 90 },
  ],
  /* Wander · Movement */
  wander: [
    { hz: 315, ms: 326, gain: 0.061, wave: "sine", cut: 820, atk: 7 },
  ],
  /* Tick · Selection */
  tick: [
    { hz: 196, to: 130, ms: 150, gain: 0.07, wave: "sine", cut: 900 },
  ],
  /* Latch · Selection */
  latch: [
    { hz: 256, ms: 90, gain: 0.058, wave: "square", cut: 2400, atk: 10 },
  ],
  /* Hail · Notifications */
  hail: [
    { hz: 392, ms: 360, gain: 0.051, wave: "sine", cut: 560, atk: 90 },
  ],
  /* Drape · Movement */
  drape: [
    { hz: 220, ms: 215, gain: 0.059, wave: "sine", cut: 560, atk: 8 },
  ],
  /* Boot · System */
  boot: [
    { hz: 291, ms: 360, gain: 0.043, wave: "sine", cut: 560, atk: 90 },
  ],
  /* Drone · System */
  drone: [
    { hz: 115, ms: 294, gain: 0.068, wave: "sine", cut: 560, atk: 72 },
  ],
};

  let ctx = null;
  let noise = null;
  function noiseFor(c) {
    if (!noise) {
      noise = c.createBuffer(1, Math.floor(c.sampleRate * 2), c.sampleRate);
      const d = noise.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    }
    return noise;
  }

  function schedule(c, notes, when, volume = 1, bend = 1) {
    for (const n of notes) {
      const t0 = when + (n.at ?? 0) / 1000;
      const t1 = t0 + n.ms / 1000;
      const tg = n.glide ? t0 + n.glide / 1000 : t1;
      let src, head;
      if (n.noise) {
        const s = c.createBufferSource();
        s.buffer = noiseFor(c);
        s.loop = true;
        const f = c.createBiquadFilter();
        f.type = n.noise;
        f.frequency.setValueAtTime(n.hz * bend, t0);
        if (n.to) f.frequency.exponentialRampToValueAtTime(n.to * bend, tg);
        if (n.q !== undefined) f.Q.value = n.q;
        s.connect(f);
        src = s; head = f;
      } else {
        const o = c.createOscillator();
        o.type = n.wave ?? "sine";
        o.frequency.setValueAtTime(n.hz * bend, t0);
        if (n.to) o.frequency.exponentialRampToValueAtTime(n.to * bend, tg);
        src = o; head = o;
      }
      // Nothing starts at full gain: that would click.
      const g = c.createGain();
      const atk = Math.min((n.atk ?? 4) / 1000, (n.ms / 1000) * 0.6);
      const peak = (n.gain ?? 0.05) * volume;
      g.gain.setValueAtTime(0.0001, t0);
      if (n.lin) g.gain.linearRampToValueAtTime(peak, t0 + atk);
      else g.gain.exponentialRampToValueAtTime(peak, t0 + atk);
      g.gain.exponentialRampToValueAtTime(0.0001, t1);
      let tail = head;
      if (n.cut) {
        const f = c.createBiquadFilter();
        f.type = "lowpass";
        f.frequency.value = n.cut;
        head.connect(f);
        tail = f;
      }
      tail.connect(g).connect(c.destination);
      if (n.noise) src.start(t0, Math.random() * 1.5);
      else src.start(t0);
      src.stop(t1 + 0.02);
    }
  }

  // volume scales a sound (1 is as designed); pitch bends it (1.12 is about
  // two semitones up).
  function play(name, { volume = 1, pitch = 1 } = {}) {
    const notes = SOUNDS[name];
    if (!notes || typeof AudioContext === "undefined") return;
    ctx ??= new AudioContext();
    if (ctx.state === "suspended") ctx.resume().catch(() => {});
    schedule(ctx, notes, ctx.currentTime + 0.005, volume, pitch);
  }

  globalThis.tetherSound = { play, SOUNDS };
})();
