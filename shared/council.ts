// The council engine: several specialists answer in their own voices, react to what people share,
// and weave the listening questions into the conversation instead of asking them up front.
import { CARDS, type Card } from "./curriculum.js";
import { INTAKE, o, routeExpert, type Audience, type Lang, type T, type Theme } from "./content.js";

// Which seat leads each topic, and which lesson illustration goes with it.
const MODULES_THEME_EXPERT: { expert: Record<Theme, string>; module: Record<Theme, string> } = {
  expert: { carbon_basics: "kaboni", ecology: "malisho", measurement: "malisho", land_rights: "wakili", fpic: "wakili", benefits: "mchambuzi", contracts: "wakili", ai_trust: "mlinzi" },
  module: { carbon_basics: "m1", ecology: "m2", measurement: "m3", land_rights: "m4", fpic: "m5", benefits: "m6", contracts: "m7", ai_trust: "m8" },
};

export type Mode = "ask" | "analogy" | "game";
export type Learner = { lang: Lang; audience: Audience; intake_step: number };
export type Reply = { expert: string; body: string; source: string | null; pic: string | null; asks: number | null };

const pick = <X,>(list: X[], n: number) => list[Math.abs(n) % list.length];

// Each seat opens in its own way, so the same question does not always sound the same.
export const OPENERS: Record<string, T[]> = {
  kaboni: [o("Swali zuri.", "Good question."), o("Tuangalie upande wa soko.", "Let us look at the market side."), o("Hili linahusu jinsi kaboni inavyouzwa.", "This is about how carbon is sold.")],
  wakili: [o("Tuangalie sheria inasema nini.", "Let us see what the law says."), o("Hili ni swali la haki.", "This is a question of rights."), o("Nitakueleza kwa lugha rahisi.", "Let me put it simply.")],
  mzee: [o("Kaa nami kidogo, rafiki.", "Sit with me a moment, friend."), o("Wazee wetu walisema: polepole ndio mwendo.", "Our elders said: slowly is the way to walk."), o("Hili nalikumbuka vizuri.", "I remember this one well.")],
  malisho: [o("Twende malishoni kwa mawazo.", "Let us go to the pasture in our minds."), o("Ardhi yenyewe inatufundisha hapa.", "The land itself teaches us here."), o("Angalia nyasi na udongo.", "Look at the grass and the soil.")],
  mwalimu: [o("Tujifunze hili kwa njia rahisi.", "Let us learn this the easy way."), o("Nina njia nzuri ya kueleza hili.", "I have a good way to explain this."), o("Hebu tulichore akilini.", "Let us picture it together.")],
  mchambuzi: [o("Tufanye hesabu kidogo.", "Let us do a little maths."), o("Fuata pesa, rafiki.", "Follow the money, friend."), o("Hapa namba ni muhimu.", "Here the numbers matter.")],
  mlinzi: [o("Tuangalie usalama kwanza.", "Let us think about safety first."), o("Swali la busara.", "A wise question."), o("Hapa tuwe waangalifu.", "Here we should be careful.")],
};

// What the other seats add, so a whole-council answer carries more than one point of view.
export const TAKES: Record<Theme, [string, T][]> = {
  carbon_basics: [
    ["mchambuzi", o("Bei ya mkopo hubadilika sokoni, kwa hiyo usiamini ahadi ya bei isiyobadilika bila maandishi.", "The price of a credit changes on the market, so do not trust a fixed price promise unless it is written down.")],
    ["mzee", o("Kumbukeni: tunachouza ni ahadi ya kutunza ardhi, na ahadi hiyo inawafunga wajukuu pia.", "Remember: what we sell is a promise to care for the land, and that promise binds our grandchildren too.")],
    ["mlinzi", o("Mtu akikuahidi pesa za haraka kutoka hewani, uliza nani ananunua na mradi umesajiliwa wapi.", "If someone promises quick money from the air, ask who is buying and where the project is registered.")],
  ],
  ecology: [
    ["mzee", o("Maarifa ya kupumzisha malisho ni urithi. Yakitumika kwenye mradi, jamii itambuliwe kwa maandishi.", "Knowing when to rest pasture is heritage. If a project uses it, the community should be recognised in writing.")],
    ["kaboni", o("Miradi ya udongo hutegemea mvua, kwa hiyo mapato yanaweza kupanda na kushuka mwaka hadi mwaka.", "Soil projects depend on rain, so income can rise and fall from year to year.")],
    ["wakili", o("Hakikisha mkataba unaruhusu mifugo kuhama wakati wa ukame bila adhabu.", "Make sure the agreement lets livestock move in drought without penalty.")],
  ],
  measurement: [
    ["mwalimu", o("Vijana wanaweza kufundishwa kupima nyasi na kuandika matokeo. Hiyo ni kazi, na pia ni kinga.", "Young people can be trained to measure grass and record results. That is work, and it is protection.")],
    ["mchambuzi", o("Uliza ni tani ngapi zilihesabiwa kila mwaka, na ngapi ziliwekwa akiba ya hatari.", "Ask how many tonnes were counted each year, and how many were held back in the risk buffer.")],
    ["mlinzi", o("Ramani za satelaiti na modeli zinaweza kukosea. Zilinganisheni na mnachokiona ardhini.", "Satellite maps and models can be wrong. Compare them with what you see on the ground.")],
  ],
  land_rights: [
    ["mzee", o("Ardhi hii ilikuwa ya wazee wetu kabla ya karatasi. Karatasi ilinde historia hiyo, isiifute.", "This land belonged to our elders before any paper. Paper should protect that history, not erase it.")],
    ["kaboni", o("Wanunuzi wakubwa sasa huuliza kama haki za ardhi ziko wazi. Kumbukumbu safi huongeza imani yao.", "Big buyers now ask whether land rights are clear. Clean records raise their trust.")],
    ["mwalimu", o("Chorani ramani ya kijiji pamoja, mkionyesha visima, njia za mifugo na maeneo muhimu.", "Draw a village map together, showing wells, cattle routes and important places.")],
  ],
  fpic: [
    ["mwalimu", o("Fanyeni mikutano tofauti ya wanawake na ya vijana, kisha mrudi pamoja kuamua.", "Hold separate meetings for women and for youth, then come back together to decide.")],
    ["mzee", o("Kwa desturi yetu, uamuzi mkubwa huchukua muda. Muda huo ni sehemu ya ridhaa.", "In our custom, a big decision takes time. That time is part of consent.")],
    ["mlinzi", o("Andikeni kila mkutano: nani alikuwepo, lugha gani ilitumika, na nini kiliamuliwa.", "Write down every meeting: who came, which language was used, and what was decided.")],
  ],
  benefits: [
    ["wakili", o("Mgao huu lazima uandikwe ndani ya CDA, pamoja na jinsi utakavyolipwa.", "This share must be written into the CDA, together with how it will be paid.")],
    ["mzee", o("Pesa za jamii ni za wote. Wajane, vijana na wasiojiweza wasisahaulike.", "Community money belongs to everyone. Widows, youth and the vulnerable must not be forgotten.")],
    ["mwalimu", o("Fanyeni hesabu pamoja: chukueni mapato, toeni gharama, kisha hesabuni 40%.", "Do the maths together: take the earnings, subtract the costs, then work out 40%.")],
  ],
  contracts: [
    ["mchambuzi", o("Anza na kifungu cha pesa: asilimia ya nini, inalipwa lini, na ripoti inatolewa lini.", "Start with the money clause: a percentage of what, paid when, and when reports come.")],
    ["mzee", o("Mkataba usiosomwa kwa lugha yetu haujaeleweka. Kilichoeleweka nusu hakijakubaliwa.", "A contract not read in our language has not been understood. What is half understood is not agreed.")],
    ["mlinzi", o("Usipige picha ya kitambulisho chako na kuituma kwa mtu usiyemjua ili 'usajiliwe'.", "Do not photograph your ID and send it to a stranger to be 'registered'.")],
  ],
  ai_trust: [
    ["wakili", o("Hata nikijibu vizuri, mimi si wakili wako. Kwa uamuzi wa kisheria, tafuta wakili huru.", "Even if I answer well, I am not your lawyer. For legal decisions, find an independent lawyer.")],
    ["mzee", o("Mzee wa kweli kijijini ana uzoefu ambao mimi sina. Mimi ni AI, msikilizeni yeye.", "A real elder in the village has experience I do not have. I am an AI, so listen to them.")],
    ["mwalimu", o("Ijaribuni AI: iulizeni swali mnalojua jibu lake, mwone kama itakosea.", "Test the AI: ask it a question you already know the answer to, and see if it gets it wrong.")],
  ],
};

// Replies when someone shares rather than asks.
export const REACT: Record<"concern" | "knowledge" | "idea" | "skip", T[]> = {
  concern: [o("Nakusikia. Wasiwasi huo ni wa kweli, na si wewe peke yako unayeuhisi.", "I hear you. That worry is real, and you are not the only one who feels it."), o("Asante kwa kusema wazi. Wasiwasi kama huu ndio unaosaidia jamii kujilinda.", "Thank you for saying it plainly. Worries like this help a community protect itself."), o("Hilo ni jambo zito. Tutalijumuisha kwenye mafunzo ya jamii yako.", "That is a serious matter. We will include it in your community's training.")],
  knowledge: [o("Asante kwa hazina hii. Maarifa kama haya ni ya jamii yako, na yanastahili heshima.", "Thank you for this treasure. Knowledge like this belongs to your community and deserves respect."), o("Hii ni hekima ya kweli. Inaonyesha jamii yako inaijua ardhi yake.", "This is real wisdom. It shows your community knows its land."), o("Nimefurahi kusikia hili. Watoto wenu wanahitaji kujua haya.", "I am glad to hear this. Your children need to know it.")],
  idea: [o("Wazo zuri. Mawazo kama haya yanaunda mpango wa jamii yako.", "A good idea. Ideas like this shape your community's plan."), o("Asante. Nimeliweka wazo hilo kwa ajili ya mafunzo ya jamii.", "Thank you. I have kept that idea for the community's training."), o("Hilo ni wazo la kujenga. Wengine kwenye makundi wangependa kulisikia.", "That is a constructive idea. Others in the circles would like to hear it.")],
  skip: [o("Sawa kabisa, tutaendelea.", "That is fine, we will carry on."), o("Hakuna shida.", "No problem."), o("Sawa, tutarudi kwenye swali hilo baadaye.", "Fine, we can come back to that question later.")],
};
export const LEAD_IN: T[] = [o("Sasa nami nikuulize jambo moja.", "Now let me ask you one thing."), o("Kabla hujaendelea, nina swali kwako.", "Before you go on, I have a question for you."), o("Ningependa kusikia mawazo yako.", "I would love to hear your thoughts.")];
export const INVITE = o("Ungependa kujua nini zaidi? Chagua swali hapa chini au uliza lako.", "What would you like to know more about? Pick a question below or ask your own.");
export const DONE = o("Asante kwa kushiriki mawazo yako. Sauti yako sasa ni sehemu ya mpango wa mafunzo ya jamii yako.", "Thank you for sharing your thoughts. Your voice now shapes your community's training plan.");
export const FOOT = o("Hakiki na mtu unayemwamini kabla ya kuamua.", "Check with someone you trust before deciding.");
export const NO_CARD = o("Sina uhakika kuhusu hilo bado. Jaribu kuuliza kuhusu mikopo ya kaboni, mgao, ridhaa, mkataba, ardhi au malisho.", "I am not sure about that yet. Try asking about carbon credits, the share, consent, the agreement, land or grazing.");
export const GAME = o("Mchezo: gawanyeni vikundi viwili. Kimoja kitetee hoja hii, kingine kiulize maswali matatu magumu.", "Game: split into two groups. One defends this idea, the other asks three hard questions.");

// Suggested next questions; each one is worded to reach a card.
export const FOLLOW: Record<Theme, T[]> = {
  carbon_basics: [o("Nani hununua mikopo ya kaboni?", "Who buys carbon credits?"), o("Mradi hudumu muda gani?", "How long does a project last?"), o("Mgao wa mapato ni asilimia ngapi?", "What share of earnings do we get?")],
  ecology: [o("Nini kinatokea wakati wa ukame?", "What happens in a drought?"), o("Kaboni hupimwaje?", "How is carbon measured?"), o("Maarifa ya jadi yalindwe vipi?", "How should traditional knowledge be protected?")],
  measurement: [o("Mradi hudumu muda gani?", "How long does a project last?"), o("Nani hununua mikopo ya kaboni?", "Who buys carbon credits?"), o("Ridhaa ya jamii ni nini?", "What is community consent?")],
  land_rights: [o("Je, tunaweza kusema hapana?", "Can we say no?"), o("CDA ni nini?", "What is a CDA?"), o("Malalamiko yanapelekwa wapi?", "Where do complaints go?")],
  fpic: [o("Je, tunaweza kusema hapana?", "Can we say no?"), o("Wanawake na vijana wanashirikishwa vipi?", "How are women and youth included?"), o("CDA ni nini?", "What is a CDA?")],
  benefits: [o("Wanawake na vijana wanapata nini?", "What do women and youth get?"), o("Nani hununua mikopo ya kaboni?", "Who buys carbon credits?"), o("Malalamiko yanapelekwa wapi?", "Where do complaints go?")],
  contracts: [o("Mradi hudumu muda gani?", "How long does a project last?"), o("Je, tunaweza kusema hapana?", "Can we say no?"), o("Mgao wa mapato ni asilimia ngapi?", "What share of earnings do we get?")],
  ai_trust: [o("Mkopo wa kaboni ni nini?", "What is a carbon credit?"), o("Je, tunaweza kusema hapana?", "Can we say no?"), o("Ridhaa ya jamii ni nini?", "What is community consent?")],
};
export const STARTERS: T[] = [o("Mkopo wa kaboni ni nini?", "What is a carbon credit?"), o("Je, tunaweza kusema hapana?", "Can we say no?"), o("Mgao wa mapato ni asilimia ngapi?", "What share of earnings do we get?")];

// Phrases count by word, so "who buys" beats a passing mention of "carbon".
export function findCard(text: string): Card | null {
  const t = ` ${text.toLowerCase()} `;
  let best: Card | null = null, top = 0;
  for (const c of CARDS) {
    const score = c.words.filter((w) => t.includes(w)).reduce((s, w) => s + w.split(" ").length, 0);
    if (score > top) { best = c; top = score; }
  }
  return best;
}

const isQuestion = (t: string) => t.includes("?") || /^(nini|vipi|kwa nini|je|nani|lini|wapi|ni nini|what|how|why|who|when|where|can|is|are|do|does)\b/i.test(t.trim());
const kindOf = (t: string): "concern" | "knowledge" | "idea" => {
  const s = t.toLowerCase();
  if (/wasiwasi|hofu|ogopa|worr|afraid|fear|dhuluma|kuibiwa|kufukuzwa|evict|sielewi|hatuelewi/.test(s)) return "concern";
  if (/jadi|tradition|wazee|elders|zamani|desturi|custom|tunajua|we know|mababu/.test(s)) return "knowledge";
  return "idea";
};
const levelFor = (a: Audience): "detail" | "simple" => (a === "leader" || a === "trainer" ? "detail" : "simple");
const picFor = (c: Card) => MODULES_THEME_EXPERT.module[c.theme];

export type Turn = { replies: Reply[]; followups: string[]; answered: number | null };

export function converse(text: string, u: Learner, opt: { mode?: Mode; expertId?: string; pending: number | null; n: number; listen?: boolean }): Turn {
  const L = u.lang, n = opt.n, mode = opt.mode ?? "ask", t = text.trim();
  const reply = (expert: string, body: string, source: string | null = null, pic: string | null = null, asks: number | null = null): Reply => ({ expert, body, source, pic, asks });
  const replies: Reply[] = [];
  let answered: number | null = null, theme: Theme | null = null;

  if (opt.pending != null && INTAKE[opt.pending]) {
    answered = opt.pending;
    const asker = MODULES_THEME_EXPERT.expert[INTAKE[opt.pending].theme];
    if (/^(ruka|skip)$/i.test(t)) replies.push(reply(asker, pick(REACT.skip, n)[L]));
    else if (!isQuestion(t)) replies.push(reply(asker, pick(REACT[kindOf(t)], n)[L]));
    if (answered === INTAKE.length - 1) replies.push(reply("mwalimu", DONE[L]));
  }

  const card = answered != null && !isQuestion(t) ? null : findCard(t);
  if (card) {
    theme = card.theme;
    const fromWords = routeExpert(t);
    const lead = opt.expertId || (mode !== "ask" ? "mwalimu" : fromWords.id === "mzee" ? "mzee" : MODULES_THEME_EXPERT.expert[card.theme]);
    const main = mode === "ask" ? card[levelFor(u.audience)][L] : card.analogy[L];
    replies.push(reply(lead, [pick(OPENERS[lead], n)[L], main, mode === "game" ? GAME[L] : "", FOOT[L]].filter(Boolean).join("\n\n"), card.source, picFor(card)));
    const others = TAKES[card.theme].filter(([e]) => e !== lead);
    const voices = opt.expertId ? TAKES[card.theme].filter(([e]) => e === lead) : mode === "ask" ? [pick(others, n), pick(others, n + 1)].filter((v, i, a) => a.indexOf(v) === i) : [];
    for (const [e, take] of voices) replies.push(reply(e, take[L]));
  } else if (answered == null) {
    if (isQuestion(t)) replies.push(reply(opt.expertId || "mwalimu", NO_CARD[L]));
    else replies.push(reply(opt.expertId || MODULES_THEME_EXPERT.expert[kindOf(t) === "knowledge" ? "ecology" : "carbon_basics"], `${pick(REACT[kindOf(t)], n)[L]}\n\n${INVITE[L]}`));
  }

  // Ask the next listening question now and then, in the voice of the seat it belongs to.
  const step = u.intake_step + (answered != null ? 1 : 0);
  if (opt.listen !== false && step < INTAKE.length && (answered != null || n % 2 === 1)) {
    const next = INTAKE[step];
    replies.push(reply(MODULES_THEME_EXPERT.expert[next.theme], `${pick(LEAD_IN, n)[L]}\n\n${next.q[L]}`, null, null, step));
  }
  const followups = (theme ? FOLLOW[theme] : STARTERS).map((f) => f[L]).filter((f) => f.toLowerCase() !== t.toLowerCase());
  return { replies, followups, answered };
}

// Plain-text version for WhatsApp, where several voices become one message with names.
export const asText = (replies: Reply[], names: Record<string, string>) => replies.map((r) => `*${names[r.expert] ?? r.expert}*: ${r.body}`).join("\n\n");
