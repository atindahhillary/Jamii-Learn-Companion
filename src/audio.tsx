import { Volume2, VolumeX } from "lucide-react";
import { useEffect, useState } from "react";
import { audioKey, segments } from "../shared/audio-key";
import type { Lang } from "../shared/content";
import { useApp, useL } from "./core";

const KEY = "jlc-audio";
let enabled = false;
try { enabled = localStorage.getItem(KEY) === "1"; } catch { /* storage blocked: audio stays off until chosen */ }
const listeners = new Set<() => void>();
export const audioOn = () => enabled;
export function setAudio(on: boolean) {
  enabled = on;
  try { localStorage.setItem(KEY, on ? "1" : "0"); } catch { /* still works for this visit */ }
  if (!on) stop();
  listeners.forEach((f) => f());
}

let manifest: Promise<Set<string>> | null = null;
const clips = () => (manifest ??= fetch("/audio/manifest.json").then((r) => r.json()).then((l: string[]) => new Set(l)).catch(() => new Set<string>()));

let run = 0, current: HTMLAudioElement | null = null;
export function stop() {
  run++;
  current?.pause();
  current = null;
  if ("speechSynthesis" in window) speechSynthesis.cancel();
}

const playFile = (src: string) => new Promise<void>((done) => {
  const a = new Audio(src);
  current = a;
  a.onended = a.onerror = () => done();
  a.play().catch(() => done());
});
const speakDevice = (text: string, lang: Lang) => new Promise<void>((done) => {
  if (!("speechSynthesis" in window)) return done();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = lang === "sw" ? "sw-KE" : "en-KE";
  u.voice = speechSynthesis.getVoices().find((v) => v.lang.toLowerCase().startsWith(lang)) ?? null;
  u.onend = u.onerror = () => done();
  speechSynthesis.speak(u);
});

// Kenyan recordings first; the device voice only covers text that has no recording, such as live AI answers.
export async function play(text: string, lang: Lang) {
  stop();
  const mine = run, have = await clips();
  for (const seg of segments(text)) {
    if (mine !== run) return;
    const key = audioKey(seg);
    if (have.has(`${lang}/${key}`)) await playFile(`/audio/${lang}/${key}.mp3`);
    else await speakDevice(seg, lang);
  }
}

export function useAudioOn() {
  const [on, setOn] = useState(enabled);
  useEffect(() => { const f = () => setOn(enabled); listeners.add(f); return () => { listeners.delete(f); }; }, []);
  return on;
}

export function AudioToggle() {
  const L = useL(), on = useAudioOn();
  return (
    <button className="sound" aria-pressed={on} onClick={() => setAudio(!on)}>
      {on ? <Volume2 size={17} aria-hidden /> : <VolumeX size={17} aria-hidden />}
      <span>{on ? L("Sauti imewashwa", "Sound on") : L("Washa sauti", "Turn on sound")}</span>
    </button>
  );
}

export function Listen({ text }: { text: string }) {
  const { lang } = useApp();
  const L = useL();
  return <button className="flag" onClick={() => play(text, lang)}><Volume2 size={13} aria-hidden /> {L("Sikiliza", "Listen")}</button>;
}
