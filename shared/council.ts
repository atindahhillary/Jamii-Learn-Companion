// The council engine: several specialists answer in their own voices, react to what people share,
// and weave the listening questions into the conversation instead of asking them up front.
import { CARDS, MODULES, type Card } from "./curriculum.js";
import { STORY } from "./story.js";
import { INTAKE, o, routeExpert, type Audience, type Lang, type T, type Theme } from "./content.js";

// Which seat leads each topic, and which lesson illustration goes with it.
const MODULES_THEME_EXPERT: { expert: Record<Theme, string>; module: Record<Theme, string> } = {
  expert: { carbon_basics: "kaboni", ecology: "malisho", measurement: "malisho", land_rights: "wakili", fpic: "wakili", benefits: "mchambuzi", contracts: "wakili", ai_trust: "mlinzi" },
  module: { carbon_basics: "m1", ecology: "m2", measurement: "m3", land_rights: "m4", fpic: "m5", benefits: "m6", contracts: "m7", ai_trust: "m8" },
};

export type Mode = "ask" | "analogy" | "game";
export type Learner = { lang: Lang; audience: Audience; intake_step: number };
export type Reply = { expert: string; body: string; source: string | null; pic: string | null; asks: number | null; model?: string | null };

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

const words = (t: string) => ` ${t.toLowerCase().replace(/[^\p{L}\p{N}%' ]+/gu, " ").replace(/\s+/g, " ").trim()} `;
// Whole words for intents, so "planting" never reads as "plan"; word starts for topic hints.
const has = (w: string, list: string[]) => list.some((x) => w.includes(` ${x} `));
const starts = (w: string, list: string[]) => list.some((x) => w.includes(` ${x}`));
const isQuestion = (t: string) => t.includes("?") || /^(nini|vipi|kwa nini|je|nani|lini|wapi|ni nini|gani|ngapi|naweza|tunaweza|what|how|why|who|when|where|which|can|could|should|will|is|are|do|does)\b/i.test(t.trim());
const kindOf = (t: string): "concern" | "knowledge" | "idea" => {
  const s = t.toLowerCase();
  if (/wasiwasi|hofu|ogopa|worr|afraid|fear|dhuluma|kuibiwa|kufukuzwa|evict|sielewi|hatuelewi/.test(s)) return "concern";
  if (/jadi|tradition|wazee|elders|zamani|desturi|custom|tunajua|we know|mababu/.test(s)) return "knowledge";
  return "idea";
};
const levelFor = (a: Audience): "detail" | "simple" => (a === "leader" || a === "trainer" ? "detail" : "simple");
const picFor = (c: Card) => MODULES_THEME_EXPERT.module[c.theme];
// A stable number from the words plus the turn count, so the same question asked twice is answered a little differently.
const mixOf = (t: string, n: number) => [...t].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7) + n;

export type Turn = { replies: Reply[]; followups: string[]; answered: number | null };

// The whole council speaks as one companion: the lead seat's answer, the other seats' points folded in,
// and any listening question at the end, all in a single message.
export const COMPANION_ID = "jamii";
export const ALSO = o("Pia kumbuka:", "Also keep in mind:");
export const KNOW = o("Je, unajua?", "Did you know?");
export const THINK = o("Fikiria hili:", "Think about this:");
export const HELLO = o(
  "Karibu, rafiki. Mimi ni Msaidizi wa Jamii, AI inayoleta pamoja ujuzi wa kaboni, sheria, ardhi, maarifa ya jadi, mapato na usalama wa AI. Unaweza kuniuliza chochote. Nikusaidie kuanza?",
  "Welcome, friend. I am the Jamii Companion, an AI that brings together know-how on carbon, law, land, traditional knowledge, earnings and AI safety. You can ask me anything. Can I help you get started?",
);

// Different closing reminders, all pointing back to people and the community.
const FOOTS: T[] = [
  FOOT,
  o("Uamuzi ni wa jamii nzima. Jadilini kwenye baraza kabla ya kukubali chochote.", "The decision belongs to the whole community. Talk it through in a meeting before agreeing to anything."),
  o("Kwa mambo ya sheria, ongea na wakili huru, si wa mwekezaji.", "For legal matters, talk to an independent lawyer, not the developer's."),
  o("Andika maswali yako na uyalete kwenye mkutano ujao.", "Write your questions down and bring them to the next meeting."),
];

// Replies for things people say that are not topic questions. Each has a few wordings.
type Intent = "greet" | "thanks" | "who" | "plan" | "games" | "groups" | "history" | "language" | "decide";
const INTENTS: { id: Intent; when: (w: string, n: number) => boolean; say: T[] }[] = [
  { id: "decide", when: (w) => has(w, ["should we sign", "should i sign", "should we accept", "should we reject", "should we agree", "should we refuse", "tusaini", "nisaini", "tukubali", "tukatae", "is it a good deal", "is this a good deal", "good deal"]), say: [
    o("Siwezi kukuambia usaini au ukatae. Uamuzi huo ni wa jamii nzima, baada ya kuelewa kila kitu. Kabla ya kuamua, ulizeni: mgao ni asilimia ya nini, mkataba unadumu muda gani na tunatokaje, na nini kinatokea wakati wa ukame?", "I cannot tell you to sign or refuse. That decision belongs to the whole community, once everyone understands it. Before deciding, ask: a share of what exactly, how long does it last and how do we exit, and what happens in a drought?"),
    o("Hilo ni swali la jamii, si la AI. Ninachoweza ni kukusaidia kuuliza vizuri: ombeni mkataba kwa Kiswahili, muda wa kujadili, na ushauri wa wakili huru. Tumieni Zana ya Ukaguzi kupata maswali ya kuuliza.", "That is a question for the community, not for an AI. What I can do is help you ask well: request the agreement in Kiswahili, time to discuss, and an independent lawyer. Use the Review Tool to get questions to ask."),
  ] },
  { id: "who", when: (w) => has(w, ["who are you", "what are you", "are you ai", "are you a person", "are you human", "wewe ni nani", "u nani", "what can you do", "unaweza kufanya nini", "help me", "msaada", "nisaidie"]) || w.trim() === "help", say: [
    o("Mimi ni Msaidizi wa Jamii, AI, si mtu. Ninaleta pamoja ujuzi wa kaboni, sheria na ardhi, maarifa ya jadi, mapato na usalama wa AI kwa jibu moja. Naweza kujibu maswali, kukutengenezea mpango wa kujifunza, na kukusaidia kufundisha kundi. Ninaweza kukosea, kwa hiyo hakiki mambo makubwa.", "I am the Jamii Companion, an AI, not a person. I bring carbon, law and land, traditional knowledge, earnings and AI safety together in one answer. I can answer questions, build you a learning plan, and help you teach a group. I can be wrong, so check big matters."),
    o("Mimi ni programu ya AI. Niulize kuhusu mikopo ya kaboni, mgao wa mapato, ridhaa, mikataba, ardhi au malisho. Au bonyeza 'Nisaidie kuanza' nikutengenezee mpango.", "I am an AI program. Ask me about carbon credits, the money share, consent, contracts, land or grazing. Or tap 'Help me get started' and I will build you a plan."),
  ] },
  { id: "plan", when: (w) => has(w, ["plan", "mpango", "curriculum", "mtaala", "get started", "start learning", "nianze", "tuanze", "learning path", "lesson plan"]), say: [
    o("Bonyeza 'Nisaidie kuanza' hapa chini. Nitakuuliza maswali machache, na kama unafundisha jamii, kwanza tutaijua jamii yenyewe. Kisha safari yako inaonekana kwenye Mafunzo.", "Tap 'Help me get started' below. I will ask a few questions, and if you teach a community we first get to know the community itself. Then your journey appears under Learn."),
    o("Mpango unajengwa kutokana na unachotaka kujifunza na mahitaji ya jamii. Anza na 'Nisaidie kuanza', na ubadilishe wakati wowote kwenye Mafunzo.", "Plans are built from what you want to learn and what the community needs. Start with 'Help me get started', and change it any time under Learn."),
  ] },
  { id: "games", when: (w) => has(w, ["game", "games", "mchezo", "michezo", "quiz", "play"]), say: [
    o("Michezo iko kwenye Zana. Unaweza kucheza iliyo tayari, au kubandika maudhui yako, au kuchagua somo, na nitatengeneza mchezo kwa Kiswahili, Kiingereza au Maa.", "Games live under Tools. Play a ready-made one, or paste your own content, or pick a lesson, and I will make a game in Kiswahili, English or Maa."),
    o("Fungua Zana, kisha 'Tengeneza mchezo'. Mchezo wa kulinganisha unafanya kazi vizuri ukiandika mstari mmoja kwa kila neno, kama 'CDA: mkataba wa jamii'.", "Open Tools, then 'Make a game'. A matching game works best if you write one line per word, like 'CDA: community agreement'."),
  ] },
  { id: "groups", when: (w) => has(w, ["group i teach", "my group", "groups", "kundi langu", "makundi", "facilitator", "mkufunzi", "intern", "dashboard", "dashibodi", "attendance", "mahudhurio"]), say: [
    o("Kwenye Mafunzo, fungua 'Makundi ninayofundisha'. Kila kundi lina taarifa za jamii, mpango wa vikao wenye mwongozo, mahali pa kuandika kikao na maoni kwa kila mwanachama, na dashibodi ya maendeleo.", "Under Learn, open 'Groups I teach'. Each group has a community profile, a session plan with a facilitator guide, a place to log sessions and feedback for each member, and a progress dashboard."),
    o("Unapoandika maoni ya kundi au ya mwanachama, nasoma mahitaji yaliyomo na kuongeza masomo yanayofaa kwenye safari ya kundi.", "When you write feedback for a group or a member, I read the needs in it and add the right lessons to the group's journey."),
  ] },
  { id: "history", when: (w) => has(w, ["history", "historia", "transcript", "saved conversation", "old chat", "mazungumzo ya zamani"]), say: [
    o("Kila mazungumzo yanahifadhiwa. Yaone kwenye 'Mazungumzo yaliyohifadhiwa' upande wa kushoto (au kitufe cha Historia kwenye simu), na uyapakue kama maandishi.", "Every conversation is kept. Find it under 'Saved conversations' on the left (or the History button on a phone), and download it as text."),
  ] },
  { id: "language", when: (w) => has(w, ["maa", "maasai", "masai", "samburu", "language", "lugha", "translate", "tafsiri", "kimaasai"]), say: [
    o("Ninajibu kwa Kiswahili na Kiingereza. Kwa Maa, Zana zina maneno 29 ya Maa yaliyohakikiwa na kamusi, na michezo ya Maa kutoka kila somo. Mzungumzaji wa Maa ahakiki kabla ya kutumia na jamii.", "I answer in Kiswahili and English. For Maa, Tools has 29 dictionary-checked Maa words and Maa games from every lesson. Have a Maa speaker check before using them with a community."),
  ] },
  { id: "thanks", when: (w) => has(w, ["asante", "thanks", "thank you", "shukran", "ashe", "ashê"]), say: [
    o("Karibu sana. Niko hapa ukiwa na swali jingine.", "You are very welcome. I am here if you have another question."),
    o("Asante kwako pia. Kujifunza pamoja ndiko kunakolinda jamii.", "Thank you too. Learning together is what protects a community."),
    o("Furaha yangu. Ungependa kuendelea na somo, au kuuliza jambo jingine?", "My pleasure. Would you like to carry on with a lesson, or ask something else?"),
  ] },
  { id: "greet", when: (w) => w.trim().split(" ").length <= 4 && has(w, ["hello", "hi", "hey", "habari", "jambo", "hujambo", "mambo", "salaam", "salama", "sopa", "supa", "takwenya", "good morning", "good afternoon", "good evening", "niaje"]), say: [
    o("Habari, rafiki! Unaweza kuniuliza chochote kuhusu kaboni, ardhi, mikataba au mgao wa pesa. Au nikusaidie kuanza?", "Hello, friend! You can ask me anything about carbon, land, contracts or the money share. Or shall I help you get started?"),
    o("Sopa! Karibu tena. Leo ungependa kujifunza nini?", "Sopa! Welcome back. What would you like to learn today?"),
    o("Salama kabisa. Niko tayari. Anza na swali, au chagua moja hapa chini.", "All good here, and ready. Start with a question, or pick one below."),
  ] },
];

// Words that point to a topic even when no prepared answer matches exactly.
const NEAR: [Theme, string[]][] = [
  ["ecology", ["water", "maji", "river", "mto", "rain", "mvua", "wildlife", "wanyama", "animal", "climate", "hali ya hewa", "biodiversity", "elder", "wazee"]],
  ["measurement", ["tree planting", "kupanda miti", "satellite", "setilaiti", "data", "monitor", "verify", "carbon stock", "tonne", "tani"]],
  ["land_rights", ["conservancy", "hifadhi", "title deed", "hati miliki", "county", "kaunti", "government", "serikali", "evict", "kufukuzwa", "boundary", "mpaka", "group ranch", "ranchi"]],
  ["benefits", ["tax", "kodi", "bank", "benki", "pay", "lipa", "jobs", "kazi", "school", "shule", "hospital", "development", "maendeleo", "tourism", "utalii"]],
  ["carbon_basics", ["redd", "offset", "registry", "sajili", "climate change", "mabadiliko", "pollution", "uchafuzi", "company", "kampuni", "verra", "gold standard"]],
  ["contracts", ["lawyer", "wakili", "court", "mahakama", "sign", "saini", "terms", "masharti", "document", "hati"]],
  ["fpic", ["vote", "kura", "chief", "chifu", "women", "wanawake", "youth", "vijana", "baraza"]],
  ["ai_trust", ["phone", "simu", "whatsapp", "fake", "uongo", "password", "pin"]],
];
const CORE = ["carbon", "kaboni", "credit", "mkopo", "mikopo", "project", "mradi", "miradi", "land", "ardhi", "community", "jamii", "cda", "fpic", "developer", "mwekezaji", "contract", "mkataba"];
const nearTheme = (w: string): Theme | null => NEAR.find(([, list]) => starts(w, list))?.[0] ?? null;

export function converse(text: string, u: Learner, opt: { mode?: Mode; pending: number | null; n: number; listen?: boolean }): Turn {
  const L = u.lang, n = opt.n, mode = opt.mode ?? "ask", t = text.trim(), w = words(t), mix = mixOf(t, n);
  const parts: string[] = [];
  let answered: number | null = null, theme: Theme | null = null, source: string | null = null, pic: string | null = null, asks: number | null = null;
  const card = findCard(t);
  const intent = mode === "ask" ? INTENTS.find((x) => x.when(w, n)) : undefined;
  // Greetings and thanks give way to a real topic in the same message ("hello, who buys credits?").
  const useIntent = intent && !(card && (intent.id === "greet" || intent.id === "thanks" || intent.id === "language" || intent.id === "games"));

  // A listening question is answered only by sharing, not by asking something back or saying hello.
  if (opt.pending != null && INTAKE[opt.pending] && !useIntent && (!isQuestion(t) || /^(ruka|skip)$/i.test(t))) {
    answered = opt.pending;
    parts.push(/^(ruka|skip)$/i.test(t) ? pick(REACT.skip, mix)[L] : pick(REACT[kindOf(t)], mix)[L]);
    if (answered === INTAKE.length - 1) parts.push(DONE[L]);
  }

  if (useIntent) {
    parts.push(pick(intent!.say, mix)[L]);
    if (intent!.id === "decide") { theme = "contracts"; source = "Carbon Markets Regulations 2024; Fourth Schedule"; }
  } else if (card && answered == null) {
    theme = card.theme; source = card.source; pic = picFor(card);
    const lead = mode !== "ask" ? "mwalimu" : routeExpert(t).id === "mzee" ? "mzee" : MODULES_THEME_EXPERT.expert[card.theme];
    // One loose word ("price" in a question about maize) gets the carbon answer, but says so.
    const loose = card.words.filter((x) => w.includes(x)).length === 1 && !starts(w, CORE);
    if (loose) parts.push(L === "sw" ? "Nikielewa kuwa unauliza kuhusu miradi ya kaboni:" : "If you are asking about carbon projects:");
    parts.push(pick(OPENERS[lead], mix)[L], mode === "ask" ? card[levelFor(u.audience)][L] : card.analogy[L]);
    if (mode === "game") parts.push(GAME[L]);
    if (mode === "ask") {
      const others = TAKES[card.theme].filter(([e]) => e !== lead);
      const m = MODULES.find((x) => x.theme === card.theme)!;
      const fact = pick(m.points, mix)[L];
      // Three shapes, so answers do not all read alike: two extra points; one point and a fact; one point and a question to think about.
      const shape = mix % 3;
      const also = shape === 0 ? [pick(others, mix), pick(others, mix + 1)].filter((v, i, a) => a.indexOf(v) === i) : [pick(others, mix)];
      parts.push(`${ALSO[L]}\n${also.map(([, x]) => `• ${x[L]}`).join("\n")}`);
      if (shape === 1 && !parts.some((p) => p.includes(fact))) parts.push(`${KNOW[L]} ${fact}`);
      if (shape === 2) parts.push(`${THINK[L]} ${STORY[m.id].ask[L]}`);
    }
    parts.push(pick(FOOTS, mix)[L]);
  } else if (answered == null) {
    const near = nearTheme(w);
    if (near) {
      // No prepared answer, but the topic is close to a lesson: share what the lesson says, and say so.
      const m = MODULES.find((x) => x.theme === near)!;
      theme = near; pic = MODULES_THEME_EXPERT.module[near]; source = `Jamii lesson: ${m.title.en}`;
      const pts = [pick(m.points, mix), pick(m.points, mix + 1)].filter((v, i, a) => a.indexOf(v) === i);
      parts.push(
        L === "sw" ? `Sina jibu lililoandaliwa kwa swali hilo hasa, lakini linagusa somo "${m.title.sw}". Hiki ndicho somo linasema:` : `I do not have a prepared answer for exactly that, but it touches the lesson "${m.title.en}". Here is what that lesson says:`,
        pts.map((p) => `• ${p[L]}`).join("\n"),
        L === "sw" ? "Fungua somo hilo kwenye Mafunzo kwa zaidi, au uliza kwa maneno mengine." : "Open that lesson under Learn for more, or ask it another way.",
        pick(FOOTS, mix)[L],
      );
    } else if (isQuestion(t)) parts.push(pick([NO_CARD, o("Hilo liko nje ya ninachojua vizuri. Mimi ninasaidia na kaboni, ardhi, ridhaa, mikataba, mgao wa pesa, malisho na usalama wa AI. Chagua swali hapa chini.", "That is outside what I know well. I help with carbon, land, consent, contracts, the money share, grazing and AI safety. Pick a question below.")], mix)[L]);
    else parts.push(`${pick(REACT[kindOf(t)], mix)[L]}\n\n${INVITE[L]}`);
  }

  // Ask the next listening question now and then, at the end of the same message.
  const step = u.intake_step + (answered != null ? 1 : 0);
  if (opt.listen !== false && step < INTAKE.length && intent?.id !== "decide" && (answered != null || n % 2 === 1)) {
    parts.push(`${pick(LEAD_IN, mix)[L]}\n\n${INTAKE[step].q[L]}`);
    asks = step;
  }
  // Suggested questions rotate through everything on the topic, so the chips change from turn to turn.
  const pool = theme ? [...FOLLOW[theme], ...Object.values(FOLLOW).flat()] : [...STARTERS, ...Object.values(FOLLOW).flat()];
  const uniq = [...new Map(pool.map((f) => [f[L], f[L]])).values()].filter((f) => f.toLowerCase() !== t.toLowerCase());
  const followups = theme ? [...uniq.slice(0, 3).slice(mix % 2), ...uniq.slice(3)].slice(0, 3) : [0, 1, 2].map((i) => uniq[(mix + i * 5) % uniq.length]);
  return { replies: [{ expert: COMPANION_ID, body: parts.filter(Boolean).join("\n\n"), source, pic, asks }], followups: [...new Set(followups)], answered };
}

// Plain-text version for WhatsApp.
export const asText = (replies: Reply[]) => replies.map((r) => r.body).join("\n\n");
