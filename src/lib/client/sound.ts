"use client";
/**
 * Tiny synthesized chimes (no audio files). WebAudio needs a user gesture
 * before it may play, which is why sounds start off until the speaker is
 * clicked.
 */
export type SoundName = "purchase" | "success" | "error";

let ctx: AudioContext | null = null;

function context() {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return null;
    ctx = new Ctor();
  }
  if (ctx.state === "suspended") void ctx.resume();
  return ctx;
}

function note(ac: AudioContext, freq: number, start: number, dur: number, gain: number, type: OscillatorType = "sine") {
  const osc = ac.createOscillator();
  const g = ac.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, start);
  g.gain.setValueAtTime(0, start);
  g.gain.linearRampToValueAtTime(gain, start + 0.012);
  g.gain.exponentialRampToValueAtTime(0.0001, start + dur);
  osc.connect(g).connect(ac.destination);
  osc.start(start);
  osc.stop(start + dur + 0.05);
}

/** Unlock audio inside a click handler. */
export function unlockAudio() {
  context();
}

export function playSound(name: SoundName) {
  const ac = context();
  if (!ac) return;
  const t = ac.currentTime + 0.01;
  switch (name) {
    case "purchase": // soft two-note bell, E6 → A6, with a quiet octave shimmer
      note(ac, 1318.5, t, 0.5, 0.06);
      note(ac, 1760, t + 0.09, 0.7, 0.05);
      note(ac, 3520, t + 0.09, 0.35, 0.008, "triangle");
      break;
    case "success": // rising fifth
      note(ac, 659.3, t, 0.25, 0.05, "triangle");
      note(ac, 987.8, t + 0.08, 0.35, 0.05, "triangle");
      break;
    case "error": // low falling pair
      note(ac, 392, t, 0.22, 0.06, "triangle");
      note(ac, 293.7, t + 0.12, 0.32, 0.06, "triangle");
      break;
  }
}
