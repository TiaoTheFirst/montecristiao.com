/* Original 16-bar music-box sketch; no third-party recording or remote media. */
var ManorMusic = (() => {
  let context,
    master,
    timer,
    next = 0,
    step = 0,
    wanted = false,
    level = 0.2;
  const voices = new Set();
  const quietReasons = new Set();
  const gainLevel = () => level * (quietReasons.size ? 0.35 : 1);
  const melody = [
    76, 0, 74, 72, 0, 71, 69, 0, 72, 76, 0, 74, 72, 0, 71, 69, 0, 67, 64, 0, 67,
    71, 0, 0, 72, 0, 76, 79, 0, 76, 74, 0, 72, 71, 0, 69, 68, 0, 71, 76, 0, 74,
    71, 0, 68, 69, 0, 0, 81, 0, 79, 76, 0, 74, 77, 0, 76, 72, 0, 71, 74, 0, 72,
    71, 0, 67, 72, 0, 71, 69, 0, 0, 72, 0, 76, 74, 0, 71, 69, 0, 67, 65, 0, 64,
    68, 0, 71, 74, 0, 71, 69, 0, 0, 0, 0, 0,
  ];
  const bass = [45, 41, 48, 40, 41, 43, 40, 45, 41, 38, 43, 45, 41, 38, 40, 45];
  const beat = 60 / 72 / 2;
  const emit = () => window.dispatchEvent(new CustomEvent("manor:music"));
  function note(midi, time, strength, duration) {
    const frequency = 440 * 2 ** ((midi - 69) / 12);
    [1, 2, 3].forEach((partial, i) => {
      const osc = context.createOscillator(),
        envelope = context.createGain();
      osc.type = "sine";
      osc.frequency.value = frequency * partial;
      envelope.gain.setValueAtTime(0, time);
      envelope.gain.linearRampToValueAtTime(
        strength * [1, 0.19, 0.045][i],
        time + 0.014,
      );
      envelope.gain.exponentialRampToValueAtTime(0.0001, time + duration);
      osc.connect(envelope);
      envelope.connect(master);
      voices.add(osc);
      osc.onended = () => {
        voices.delete(osc);
        osc.disconnect();
        envelope.disconnect();
      };
      osc.start(time);
      osc.stop(time + duration + 0.03);
    });
  }
  function schedule() {
    if (!wanted || context.state !== "running") return;
    while (next < context.currentTime + 0.25) {
      const position = step % melody.length;
      if (melody[position]) note(melody[position], next, 0.22, 2.2);
      if (position % 6 === 0)
        note(bass[Math.floor(position / 6)], next, 0.16, 2.8);
      if (position % 6 === 3)
        note(bass[Math.floor(position / 6)] + 19, next, 0.07, 1.6);
      step++;
      next += beat;
    }
  }
  function stop() {
    wanted = false;
    clearInterval(timer);
    timer = null;
    for (const voice of voices) {
      try {
        voice.stop();
      } catch {}
    }
    if (context) context.suspend().catch(() => {});
    emit();
  }
  async function toggle() {
    if (wanted) {
      stop();
      return;
    }
    if (!context) {
      const Audio = window.AudioContext || window.webkitAudioContext;
      if (!Audio) throw new Error("AUDIO_UNAVAILABLE");
      context = new Audio();
      master = context.createGain();
      master.gain.value = gainLevel();
      const filter = context.createBiquadFilter();
      filter.type = "lowpass";
      filter.frequency.value = 2600;
      master.connect(filter);
      filter.connect(context.destination);
      context.onstatechange = emit;
    }
    wanted = true;
    try {
      await context.resume();
      if (!wanted) return;
      if (context.state !== "running") throw new Error("AUDIO_BLOCKED");
      next = context.currentTime + 0.06;
      clearInterval(timer);
      timer = setInterval(schedule, 100);
      schedule();
      emit();
    } catch (error) {
      stop();
      throw error;
    }
  }
  window.addEventListener("pagehide", stop);
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) stop();
  });
  return {
    toggle,
    stop,
    duck(reason, on) {
      if (on) quietReasons.add(reason);
      else quietReasons.delete(reason);
      if (master)
        master.gain.setTargetAtTime(gainLevel(), context.currentTime, 0.25);
    },
    volume(value) {
      level = Math.min(0.5, Math.max(0, value));
      if (master)
        master.gain.setTargetAtTime(gainLevel(), context.currentTime, 0.05);
      emit();
    },
    get playing() {
      return wanted && context?.state === "running";
    },
  };
})();
