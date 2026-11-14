// Maa (Maasai) words for the topics the app teaches, so games and facilitators can work in Maa without live AI.
// Spellings are copied from the Payne & Ole-Kotikash Maa dictionary (English index, University of Oregon),
// whose default is Narok/Keekonyokie Maa of southern Kenya. Nothing here is invented or machine-translated.
// shortcut: no Maa speaker has reviewed this list yet; have Kenyan and Tanzanian Maa speakers check it before wider use.
import { o, type Lang, type T, type Theme } from "./content.js";
import type { Game } from "./games.js";

export type MaaWord = { maa: string; plain: string; gloss: T; themes: Theme[]; note?: T };

export const MAA_SOURCE = "D. L. Payne & L. Ole-Kotikash, Maa Dictionary (Univ. of Oregon, 2005/2008); D. L. Payne, L. Ole-Kotikash & A. L. Ole-Mapena, Maa-Swahili-English Dictionary (LOT, Univ. of Dar es Salaam, 2014)";

// plain = the same word without tone marks and special vowels, as many community readers write it.
export const MAA: MaaWord[] = [
  { maa: "ɛn-kɔ́p", plain: "enkop", gloss: o("ardhi, nchi", "land, country"), themes: ["land_rights", "carbon_basics"] },
  { maa: "ɛnk-árɛ́", plain: "enkare", gloss: o("maji", "water"), themes: ["ecology"] },
  { maa: "ɛn-kʉ́jɨ́tá", plain: "enkujita", gloss: o("nyasi", "grass"), themes: ["ecology", "measurement"] },
  { maa: "ɔl-catá", plain: "olchata", gloss: o("mti", "tree"), themes: ["ecology", "measurement"] },
  { maa: "en-kulukúóni", plain: "enkulukuoni", gloss: o("udongo, vumbi", "soil, dirt"), themes: ["measurement", "ecology"] },
  { maa: "in-kíshú", plain: "inkishu", gloss: o("ng'ombe", "cattle"), themes: ["ecology", "benefits"] },
  { maa: "ɔl-áméyú", plain: "olameyu", gloss: o("ukame, njaa", "drought"), themes: ["ecology", "contracts"] },
  { maa: "ɛn-dáátá", plain: "endaata", gloss: o("malisho", "grazing, pasture"), themes: ["ecology", "land_rights"] },
  { maa: "en-tîm", plain: "entim", gloss: o("msitu, pori", "forest, bush"), themes: ["ecology", "measurement"] },
  { maa: "en-kijápɛ", plain: "enkijape", gloss: o("upepo, hewa", "wind, air"), themes: ["carbon_basics"] },
  { maa: "ol-órere", plain: "olorere", gloss: o("watu, jamii", "people, community"), themes: ["fpic", "benefits", "land_rights"] },
  { maa: "enk-igúɛ́na", plain: "enkiguena", gloss: o("mkutano, baraza", "meeting"), themes: ["fpic", "contracts"], note: o("Purko: ɛnk-igúána", "Purko: ɛnk-igúána") },
  { maa: "ɔl-aigúɛ́nani", plain: "olaiguenani", gloss: o("kiongozi, msemaji", "leader, spokesman"), themes: ["fpic", "contracts"] },
  { maa: "ol-niŋó", plain: "olning'o", gloss: o("makubaliano, mkataba", "agreement, contract"), themes: ["contracts", "fpic"] },
  { maa: "a-irúk", plain: "airuk", gloss: o("kukubali", "to agree"), themes: ["fpic"] },
  { maa: "a-ány", plain: "aany", gloss: o("kukataa", "to refuse"), themes: ["fpic"] },
  { maa: "e-ropíyia", plain: "eropiyia", gloss: o("pesa", "money"), themes: ["benefits", "carbon_basics"] },
  { maa: "a-ɔ́r", plain: "aor", gloss: o("kugawa", "to divide"), themes: ["benefits"] },
  { maa: "ɛn-kɨ́tánápata", plain: "enkitanapata", gloss: o("sheria", "law"), themes: ["contracts", "land_rights"] },
  { maa: "ɔl-ɔinyaŋɨ́", plain: "oloinyangi", gloss: o("soko", "market"), themes: ["carbon_basics"] },
  { maa: "a-inyáŋ", plain: "ainyang", gloss: o("kununua", "to buy"), themes: ["carbon_basics"] },
  { maa: "a-ikilikúán", plain: "aikilikuan", gloss: o("kuuliza", "to ask"), themes: ["fpic", "ai_trust"] },
  { maa: "e-yioloúnotó", plain: "eyiolounoto", gloss: o("maarifa", "knowledge"), themes: ["ecology", "ai_trust"] },
  { maa: "e-ŋénó", plain: "engeno", gloss: o("hekima", "wisdom"), themes: ["ecology", "ai_trust"] },
  { maa: "ɛn-kʉ́tʉ́k", plain: "enkutuk", gloss: o("lugha, neno", "language, word"), themes: ["fpic", "ai_trust"] },
  { maa: "ɛn-kɛ́ráí", plain: "enkerai", gloss: o("mtoto", "child"), themes: ["contracts", "benefits"] },
  { maa: "ɛnk-akúí", plain: "enkakui", gloss: o("mjukuu", "grandchild"), themes: ["contracts", "carbon_basics"] },
  { maa: "ɔl-mʉ́rráni", plain: "olmurrani", gloss: o("moran, kijana shujaa", "warrior, young man"), themes: ["benefits", "fpic"] },
  { maa: "ɛ-rɨ́shátá", plain: "erishata", gloss: o("mpaka", "boundary"), themes: ["land_rights", "measurement"] },
];

// What a facilitator needs to know before using Maa with a group.
export const MAA_NOTE = o(
  "Maa huzungumzwa Kenya na Tanzania na Wamaasai, Waarusha, Waparakuyo, Wasamburu na Ilchamus. Maneno haya ni ya Maa ya Narok/Keekonyokie (Kenya kusini), ambayo mara nyingi yanafanana na Kisonko wa Tanzania. Arusha na Parakuyo wana maneno yao baadhi, na Samburu mara nyingi hawaweki vokali ya mwanzo (n-kɔ́p badala ya ɛn-kɔ́p). Kamusi zinaandika toni na vokali maalum (ɛ ɔ ɨ ʉ); wasomaji wengi huandika bila hizo, kwa hiyo tunaonyesha pia namna rahisi. Hakuna neno la Maa lililothibitishwa la 'kaboni' au 'mkopo wa kaboni': elezeni kwa maneno ya jamii na mkubaliane kama kundi. Mzungumzaji wa Maa ahakiki kabla ya kutumia.",
  "Maa is spoken in Kenya and Tanzania by Maasai, Arusha, Parakuyo, Samburu and Ilchamus people. These words are Narok/Keekonyokie Maa (southern Kenya), which is often close to Kisonko Maa in Tanzania. Arusha and Parakuyo have some words of their own, and Samburu often drops the first vowel (n-kɔ́p instead of ɛn-kɔ́p). Dictionaries write tone and special vowels (ɛ ɔ ɨ ʉ); many readers write without them, so a plain spelling is shown too. There is no checked Maa word for 'carbon' or 'carbon credit': explain it in the community's own words and agree the wording as a group. Have a Maa speaker check before use.",
);

export const isMaa = (lang: string) => /^(maa|ol ?maa|kimaasai|maasai|masai)\b/i.test(lang.trim());

// A Maa vocabulary game on a lesson's theme, glossed in Kiswahili or English.
export function maaGame(kind: "match" | "quiz", theme: Theme | null, gloss: Lang, title: string, seed = 1): Game {
  const onTheme = MAA.filter((w) => !theme || w.themes.includes(theme));
  const words = [...onTheme, ...MAA.filter((w) => !onTheme.includes(w))].slice(0, 8);
  const show = (w: MaaWord) => `${w.maa} (${w.plain})`;
  const id = `maa${Date.now().toString(36)}`;
  if (kind === "match") return { id, title, lang: "Maa", kind, pairs: words.slice(0, 6).map((w) => [show(w), w.gloss[gloss]]), questions: [], by: "rules" };
  const questions = words.map((w, i) => {
    const others = MAA.filter((x) => x !== w && x.gloss[gloss] !== w.gloss[gloss]);
    const wrong = [others[(i * 3 + seed) % others.length], others[(i * 7 + seed + 5) % others.length]].filter((x, k, a) => a.indexOf(x) === k);
    const options = [w, ...wrong].map((x) => x.gloss[gloss]).sort((a, b) => ((a.length * 31 + i) % 7) - ((b.length * 31 + i) % 7));
    return { q: gloss === "sw" ? `Neno la Maa "${show(w)}" lina maana gani?` : `What does the Maa word "${show(w)}" mean?`, options, answer: options.indexOf(w.gloss[gloss]) };
  });
  return { id, title, lang: "Maa", kind, pairs: [], questions, by: "rules" };
}

// Context handed to the AI model when someone asks for a game in Maa.
export const maaPromptNotes = () => `${MAA_NOTE.en}\nChecked Maa words (dictionary spelling, plain spelling, meaning): ${MAA.map((w) => `${w.maa} / ${w.plain} = ${w.gloss.en}`).join("; ")}. Use only these Maa words or words written in the user's content; never invent Maa words. Where no Maa word is known, keep the Kiswahili or English term.`;
