// Interface sounds for the site, synthesised with the Web Audio API (no
// files). Sounds and the way they are played follow Bencho (bencho.dev):
//   - a small vocabulary used consistently: click to pick, expand to open,
//     press for main buttons, off to close, bump for attention, lift to grab
//   - `at` (0..1) bends the pitch with position, so a row of items rises
//   - `gap` stops one sound repeating faster than it can be heard
//   - audio is unlocked on the first gesture with a silent buffer, so the
//     first real sound is never late
// Plain script: sets globalThis.tetherSound.
(() => {
  const SOUNDS = {"click":[{"hz":196,"to":130,"ms":150,"gain":0.07,"wave":"sine","cut":900}],"expand":[{"hz":196,"to":174,"ms":360,"gain":0.042,"wave":"sine","cut":880,"atk":36},{"hz":294,"to":262,"ms":300,"gain":0.014,"wave":"sine","cut":1100,"atk":48,"at":24}],"press":[{"hz":168,"ms":95,"gain":0.028,"wave":"sine","cut":480,"atk":14}],"off":[{"hz":330,"to":247,"ms":88,"gain":0.03,"wave":"sine","cut":720,"atk":8}],"bump":[{"hz":150,"to":92,"ms":140,"gain":0.07,"wave":"sine","cut":640,"atk":4},{"hz":420,"ms":26,"gain":0.014,"wave":"triangle","cut":1500,"atk":3}],"lift":[{"hz":660,"to":720,"ms":38,"gain":0.028,"wave":"sine"}],"deny":[{"hz":208,"to":165,"ms":120,"gain":0.03,"wave":"sine","cut":520,"atk":10}],"select":[{"hz":2800,"ms":8,"gain":0.13,"noise":"bandpass","q":2.2,"atk":1},{"hz":664,"to":415,"glide":18,"ms":20,"gain":0.024,"atk":1}],"copied":[{"hz":880,"ms":70,"gain":0.026,"wave":"sine","cut":2400,"atk":4},{"hz":1175,"ms":150,"gain":0.02,"wave":"sine","cut":2600,"atk":4,"at":55}],"pop":[{"hz":680,"to":930,"ms":34,"gain":0.05,"wave":"sine","atk":3}],"notch":[{"hz":230,"ms":49,"gain":0.048,"wave":"sine","cut":820,"atk":6}],"open":[{"hz":600,"to":1500,"glide":100,"ms":106,"gain":0.15,"noise":"bandpass","q":1.4,"atk":50,"lin":true},{"hz":659.25,"ms":215,"gain":0.013,"atk":50,"lin":true},{"hz":1318.51,"ms":138,"gain":0.0044,"atk":50,"lin":true}],"close":[{"hz":1400,"to":540,"glide":70,"ms":74,"gain":0.14,"noise":"bandpass","q":1.4,"atk":20,"lin":true},{"hz":261.63,"ms":107,"gain":0.013,"atk":3},{"hz":350,"ms":28,"gain":0.14,"noise":"bandpass","q":2,"atk":1}],"navigate":[{"hz":400,"to":1100,"glide":210,"ms":231,"gain":0.15,"noise":"bandpass","q":1.2,"atk":120,"lin":true},{"hz":540,"ms":199,"gain":0.038,"noise":"lowpass","q":0.7,"atk":90,"lin":true}],"attention":[{"hz":2500,"ms":5,"gain":0.029,"noise":"lowpass","q":-3,"atk":1},{"hz":880,"ms":602,"gain":0.026,"atk":3},{"hz":2428.8,"ms":283,"gain":0.0077,"atk":3},{"hz":4752,"ms":172,"gain":0.0026,"atk":3},{"hz":882,"ms":573,"gain":0.014,"atk":3},{"hz":1318.51,"ms":562,"gain":0.02,"atk":3},{"hz":3639.1,"ms":264,"gain":0.0059,"atk":3}],"paid":[{"hz":587,"ms":170,"gain":0.05,"wave":"sine","cut":2600,"atk":5},{"hz":880,"ms":460,"gain":0.046,"wave":"sine","cut":2800,"atk":6,"at":95},{"hz":1760,"ms":300,"gain":0.009,"wave":"sine","atk":8,"at":100}],"landed":[{"hz":330,"to":620,"ms":120,"gain":0.018,"wave":"triangle","cut":1400,"atk":30},{"hz":784,"ms":120,"gain":0.04,"wave":"sine","cut":2600,"atk":4,"at":70},{"hz":1047,"ms":130,"gain":0.04,"wave":"sine","cut":2800,"atk":4,"at":140},{"hz":1319,"ms":520,"gain":0.044,"wave":"sine","cut":3000,"atk":5,"at":210},{"hz":2638,"ms":320,"gain":0.007,"wave":"sine","atk":8,"at":215}],"perk":[{"hz":330,"ms":360,"gain":0.053,"wave":"sine","cut":560,"atk":90}],"hush":[{"hz":330,"to":247,"ms":88,"gain":0.03,"wave":"sine","cut":720,"atk":8}]};

  let ctx = null, primed = false, gestured = false;
  const last = {};
  function wake() {
    try { ctx ??= new AudioContext(); } catch { return; }
    if (ctx.state !== "running") ctx.resume().catch(() => {});
    if (!primed) {
      primed = true;
      try { const s = ctx.createBufferSource(); s.buffer = ctx.createBuffer(1, 1, ctx.sampleRate); s.connect(ctx.destination); s.start(0); } catch {}
      // On iPhone, play through the silent switch like other app sounds.
      try { if (navigator.audioSession) navigator.audioSession.type = "playback"; } catch {}
    }
  }
  const unlockOn = ["pointerdown", "keydown", "touchend", "click"];
  const unlock = (e) => {
    if (!e.isTrusted) return;
    gestured = true;
    wake();
    if (ctx?.state === "running") for (const t of unlockOn) removeEventListener(t, unlock, true);
  };
  for (const t of unlockOn) addEventListener(t, unlock, true);

  let noise = null;
  function noiseFor(c) {
    if (!noise) {
      noise = c.createBuffer(1, Math.floor(c.sampleRate * 2), c.sampleRate);
      const d = noise.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    }
    return noise;
  }

  function schedule(c, notes, when, gain, bend) {
    for (const n of notes) {
      const t0 = when + (n.at ?? 0) / 1000, t1 = t0 + n.ms / 1000, tg = n.glide ? t0 + n.glide / 1000 : t1;
      let src, head;
      if (n.noise) {
        const s = c.createBufferSource(); s.buffer = noiseFor(c); s.loop = true;
        const f = c.createBiquadFilter(); f.type = n.noise; f.frequency.setValueAtTime(n.hz * bend, t0);
        if (n.to) f.frequency.exponentialRampToValueAtTime(n.to * bend, tg);
        if (n.q !== undefined) f.Q.value = n.q;
        s.connect(f); src = s; head = f;
      } else {
        const o = c.createOscillator(); o.type = n.wave ?? "sine"; o.frequency.setValueAtTime(n.hz * bend, t0);
        if (n.to) o.frequency.exponentialRampToValueAtTime(n.to * bend, tg);
        src = o; head = o;
      }
      const g = c.createGain();
      const atk = Math.min((n.atk ?? 4) / 1000, (n.ms / 1000) * 0.6);
      g.gain.setValueAtTime(0.0001, t0);
      if (n.lin) g.gain.linearRampToValueAtTime((n.gain ?? 0.05) * gain, t0 + atk);
      else g.gain.exponentialRampToValueAtTime((n.gain ?? 0.05) * gain, t0 + atk);
      g.gain.exponentialRampToValueAtTime(0.0001, t1);
      let tail = head;
      if (n.cut) { const f = c.createBiquadFilter(); f.type = "lowpass"; f.frequency.value = n.cut; head.connect(f); tail = f; }
      tail.connect(g).connect(c.destination);
      if (n.noise) src.start(t0, Math.random() * 1.5); else src.start(t0);
      src.stop(t1 + 0.02);
    }
  }

  // play("click"), play("click", { at: 0.6 }), play("notch", { gap: 40 })
  function play(name, { at, gap, gain = 1, pitch } = {}) {
    const notes = SOUNDS[name];
    if (!notes || !gestured) return;
    if (gap) { const now = performance.now(); if (now - (last[name] ?? -1e9) < gap) return; last[name] = now; }
    wake();
    if (!ctx || ctx.state !== "running") return;
    const bend = pitch ?? (at === undefined ? 1 : 0.75 + Math.min(1, Math.max(0, at)) * 0.75);
    schedule(ctx, notes, ctx.currentTime + 0.005, gain, bend);
  }

  globalThis.tetherSound = { play, SOUNDS };
})();
