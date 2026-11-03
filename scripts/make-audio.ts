// Records every fixed line in Kenyan voices: npm run audio. Re-run after changing content; existing clips are kept.
import fs from "node:fs";
import { MsEdgeTTS, OUTPUT_FORMAT } from "msedge-tts";
import { intakeDone, intakeQuestion, offlineAnswer } from "../shared/answers.js";
import { REACTIONS, audioKey, segments } from "../shared/audio-key.js";
import { INTAKE, SCENES, type Audience, type Lang } from "../shared/content.js";
import { CARDS, MODULES } from "../shared/curriculum.js";
import { FINALE, STORY, WELCOME } from "../shared/story.js";
import { DONE, FOOT, GAME, INVITE, LEAD_IN, NO_CARD, OPENERS, REACT, TAKES } from "../shared/council.js";

const VOICES: Record<Lang, string> = { sw: "sw-KE-RafikiNeural", en: "en-KE-ChilembaNeural" };

function lines(lang: Lang) {
  const u = { lang, audience: "herder" as Audience, intake_step: 5 };
  const all: string[] = [WELCOME[lang], FINALE[lang], intakeDone[lang], ...REACTIONS.filter((r) => /Exactly|Not quite/.test(r) === (lang === "en"))];
  for (const s of Object.values(STORY)) all.push(s.open[lang], s.ask[lang], s.close[lang]);
  for (const m of MODULES) all.push(...m.points.map((p) => p[lang]), m.activity[lang], ...m.quiz.flatMap((q) => [q.q[lang], q.why[lang]]));
  for (const c of CARDS) all.push(c.simple[lang], c.detail[lang], c.analogy[lang], offlineAnswer(c.words[0], u, "game").body);
  all.push(offlineAnswer("zzz", u, "ask").body);
  INTAKE.forEach((_, i) => all.push(intakeQuestion({ ...u, intake_step: i })!));
  all.push(DONE[lang], INVITE[lang], FOOT[lang], GAME[lang], NO_CARD[lang], ...LEAD_IN.map((x) => x[lang]), ...Object.values(OPENERS).flat().map((x) => x[lang]), ...Object.values(REACT).flat().map((x) => x[lang]), ...Object.values(TAKES).flat().map(([, x]) => x[lang]));
  for (const s of SCENES) all.push(s.text[lang], ...s.choices.map((c) => c.feedback[lang]));
  return [...new Set(all.flatMap(segments))];
}

async function record(text: string, voice: string, path: string) {
  for (let attempt = 0; attempt < 4; attempt++) {
    const tts = new MsEdgeTTS();
    try {
      await tts.setMetadata(voice, OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3);
      const { audioStream } = tts.toStream(text, { rate: "-8%" });
      const chunks: Buffer[] = [];
      await new Promise((res, rej) => { audioStream.on("data", (d: Buffer) => chunks.push(d)); audioStream.on("end", res as () => void); audioStream.on("error", rej); });
      if (chunks.length) { fs.writeFileSync(path, Buffer.concat(chunks)); return; }
    } catch { /* retried below */ } finally { tts.close(); }
    await new Promise((r) => setTimeout(r, 1500 * (attempt + 1)));
  }
  throw new Error(`could not record: ${text.slice(0, 50)}`);
}

const manifest: string[] = [];
for (const lang of ["sw", "en"] as Lang[]) {
  fs.mkdirSync(`public/audio/${lang}`, { recursive: true });
  const queue = lines(lang);
  console.log(lang, queue.length, "lines");
  const worker = async () => {
    for (let t = queue.shift(); t; t = queue.shift()) {
      const key = audioKey(t), path = `public/audio/${lang}/${key}.mp3`;
      if (!fs.existsSync(path)) await record(t, VOICES[lang], path);
      manifest.push(`${lang}/${key}`);
    }
  };
  await Promise.all([worker(), worker(), worker(), worker()]);
}
fs.writeFileSync("public/audio/manifest.json", JSON.stringify(manifest.sort()));
console.log("done", manifest.length);
process.exit(0);
