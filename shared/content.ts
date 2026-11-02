// Bilingual knowledge shared by the server, the WhatsApp bot and the offline PWA.
export type Lang = "sw" | "en";
export type T = { sw: string; en: string };
export type Audience = "leader" | "herder" | "student" | "elder" | "trainer";
export type Theme =
  | "carbon_basics" | "ecology" | "measurement" | "land_rights"
  | "fpic" | "benefits" | "contracts" | "ai_trust";

export const o = (sw: string, en: string): T => ({ sw, en });

export const THEMES: Record<Theme, T> = {
  carbon_basics: o("Misingi ya kaboni", "Carbon basics"),
  ecology: o("Ardhi na maarifa ya jadi", "Land and traditional knowledge"),
  measurement: o("Upimaji wa kaboni", "Carbon measurement"),
  land_rights: o("Haki za ardhi", "Land rights"),
  fpic: o("Ridhaa huru (FPIC)", "Free consent (FPIC)"),
  benefits: o("Mgao wa mapato", "Benefit sharing"),
  contracts: o("Mikataba", "Contracts"),
  ai_trust: o("Kuamini AI kwa busara", "Trusting AI wisely"),
};

export const AUDIENCES: Record<Audience, T> = {
  leader: o("Kiongozi wa jamii", "Community leader"),
  herder: o("Mfugaji", "Herder"),
  student: o("Mwanafunzi", "Student"),
  elder: o("Bibi au babu", "Grandparent or elder"),
  trainer: o("Mkufunzi", "Trainer"),
};

// The council: every question is routed to one seat, and the seat shapes the answer.
export type Expert = { id: string; name: T; role: T; color: string; focus: T; words: string[] };
export const COUNCIL: Expert[] = [
  { id: "kaboni", name: o("Mtaalamu wa Kaboni", "Carbon Analyst"), role: o("Masoko na bei", "Markets and prices"), color: "#1f4d3a", focus: o("Anaeleza mikopo ya kaboni, wanunuzi, bei na viwango kama Verra.", "Explains credits, buyers, prices and standards such as Verra."), words: ["kaboni", "carbon", "credit", "mkopo", "mikopo", "soko", "market", "bei", "price", "verra", "gold standard", "mnunuzi", "buyer", "tani", "tonne"] },
  { id: "wakili", name: o("Wakili wa Jamii", "Community Lawyer"), role: o("Sheria, ardhi na mikataba", "Law, land and contracts"), color: "#1f6f94", focus: o("Anaeleza sheria, ardhi ya jamii na haki za CDA. Si ushauri rasmi wa kisheria.", "Explains the law, community land and CDA rights. Not formal legal advice."), words: ["sheria", "law", "haki", "right", "ardhi", "land", "mkataba", "contract", "agreement", "cda", "mahakama", "court", "sahihi", "sign", "fpic", "ridhaa", "consent", "kusaini", "kesi"] },
  { id: "mzee", name: o("Mlinzi wa Maarifa", "Knowledge Keeper"), role: o("Maarifa ya jadi", "Traditional knowledge"), color: "#8a4b2a", focus: o("Anathamini maarifa ya wazee na kuuliza nani anamiliki maarifa hayo.", "Honours elders' knowledge and asks who owns that knowledge."), words: ["jadi", "tradition", "wazee", "elder", "utamaduni", "culture", "desturi", "custom", "mababu", "ancestor", "hadithi", "story"] },
  { id: "malisho", name: o("Mtaalamu wa Malisho", "Rangeland Ecologist"), role: o("Malisho, misitu na udongo", "Grazing, forest and soil"), color: "#4c7a2b", focus: o("Anaeleza malisho, misitu, udongo na jinsi hali ya hewa inavyoathiri kaboni.", "Explains grazing, forest, soil and how weather affects carbon."), words: ["malisho", "graz", "mifugo", "livestock", "udongo", "soil", "msitu", "forest", "miti", "tree", "ukame", "drought", "nyasi", "grass", "mvua", "rain", "ng'ombe", "cattle"] },
  { id: "mwalimu", name: o("Mwalimu wa Jamii", "Community Educator"), role: o("Mifano, michezo, mafunzo", "Analogies, games, training"), color: "#c8572a", focus: o("Anatoa mifano, michezo na njia rahisi za kufundisha.", "Gives analogies, games and simple ways to teach."), words: ["mfano", "example", "analogy", "mchezo", "game", "fundisha", "teach", "somo", "lesson", "igizo", "role play"] },
  { id: "mchambuzi", name: o("Mchambuzi wa Mapato", "Benefit Analyst"), role: o("Mapato na mgao", "Earnings and shares"), color: "#9a7012", focus: o("Anasaidia kuuliza mapato yalikwenda wapi na hesabu ya mgao.", "Helps ask where earnings went and how the share is calculated."), words: ["pesa", "money", "mapato", "earning", "mgao", "share", "benefit", "faida", "asilimia", "percent", "%", "malipo", "payment", "gharama", "cost", "ripoti"] },
  { id: "mlinzi", name: o("Mlinzi wa AI", "AI Safety Guide"), role: o("Usalama na kuamini AI", "Safety and AI trust"), color: "#6b5a3e", focus: o("Anafundisha lini kuamini AI, lini kuhakiki, na jinsi ya kulinda data.", "Teaches when to trust AI, when to check, and how to protect data."), words: ["akili bandia", "roboti", "chatbot", "faragha", "privacy", "tapeli", "scam", "kuamini", "trust", "usalama", "safety"] },
];
export const expertById = (id: string) => COUNCIL.find((e) => e.id === id) ?? COUNCIL[0];

export function routeExpert(text: string): Expert {
  const t = text.toLowerCase();
  let best = COUNCIL[0], top = 0;
  for (const e of COUNCIL) {
    const score = e.words.filter((w) => t.includes(w)).length;
    if (score > top) { best = e; top = score; }
  }
  return best;
}

// The first conversation listens before it teaches.
export const INTAKE: { theme: Theme; q: T }[] = [
  { theme: "carbon_basics", q: o("Umesikia nini kuhusu biashara ya kaboni? Sema kwa maneno yako, hakuna jibu baya.", "What have you heard about carbon credits? Use your own words, no answer is wrong.") },
  { theme: "land_rights", q: o("Katika jamii yenu, nani huamua kuhusu matumizi ya ardhi, na uamuzi hufanywaje?", "In your community, who decides how land is used, and how is that decided?") },
  { theme: "ecology", q: o("Jamii yenu ina maarifa gani ya jadi ya kutunza malisho, maji au msitu? Shiriki yale tu unayoona ni sawa kushiriki.", "What traditional knowledge does your community use to care for grazing, water or forest? Share only what feels right to share.") },
  { theme: "benefits", q: o("Ni wasiwasi gani ulionao kuhusu miradi ya kaboni au pesa zake?", "What worries you about carbon projects or their money?") },
  { theme: "fpic", q: o("Kama mradi ungekuja kesho, ungetaka nini kifanyike kabla ya jamii kukubali?", "If a project came tomorrow, what would you want done before the community agrees?") },
];

// Patterns only ever raise questions. They never declare a contract safe.
export const RED_FLAGS: { id: string; re: RegExp; title: T; ask: T }[] = [
  { id: "forever", re: /perpetu|milele|99 years|miaka 99|irrevocabl/i, title: o("Muda usio na mwisho", "No end date"), ask: o("Mkataba unaisha lini, na tunatokaje?", "When does this end, and how can we exit?") },
  { id: "exclusive", re: /exclusive|sole right|haki pekee/i, title: o("Haki za pekee", "Exclusive rights"), ask: o("Haki hizi zinazuia jamii kufanya nini?", "What do these rights stop the community from doing?") },
  { id: "assign", re: /\bassign|transfer.{0,30}(right|carbon|credit)|kuhamisha|successors/i, title: o("Haki zinaweza kuhamishiwa mwingine", "Rights can pass to someone else"), ask: o("Je, wanaweza kuuza mkataba huu bila idhini yetu?", "Can they sell this deal without our approval?") },
  { id: "costs", re: /net (profit|revenue|proceeds)|after (all )?(cost|expense|deduction)|less cost|baada ya gharama|faida halisi/i, title: o("Mgao baada ya gharama", "Share after costs"), ask: o("Gharama zipi zinaondolewa, zina kikomo, na nani anazikagua?", "Which costs come off, is there a cap, and who audits them?") },
  { id: "grazing", re: /restrict|prohibit|no grazing|grazing (plan|management)|kuzuia|marufuku/i, title: o("Vizuizi vya matumizi ya ardhi", "Land use restrictions"), ask: o("Nini kinatokea wakati wa ukame au tunapohitaji kuhamisha mifugo?", "What happens in drought or when we must move livestock?") },
  { id: "secret", re: /confidential|non-disclosure|\bsiri\b/i, title: o("Usiri", "Confidentiality"), ask: o("Je, jamii inaweza kuonyesha mkataba kwa wakili na wanachama wote?", "Can the community show this to a lawyer and all members?") },
  { id: "foreign", re: /governed by the laws of (?!kenya)|arbitration in (?!kenya|nairobi)|london|singapore|new york/i, title: o("Mizozo nje ya Kenya", "Disputes outside Kenya"), ask: o("Tutawezaje kufika huko? Kwa nini isiwe Kenya?", "How would we get there? Why not Kenya?") },
  { id: "penalty", re: /penalt|liquidated damages|indemnif|\bfaini\b|\bfidia\b/i, title: o("Adhabu kwa jamii", "Penalties on the community"), ask: o("Jamii inaweza kudaiwa kiasi gani, hasa kaboni ikipungua kwa ukame?", "How much could the community owe, especially if drought cuts carbon?") },
  { id: "knowledge", re: /intellectual property|traditional knowledge|data.{0,20}(own|belong)|maarifa/i, title: o("Umiliki wa maarifa na data", "Ownership of knowledge and data"), ask: o("Nani anamiliki maarifa yetu na data ya ardhi yetu?", "Who owns our knowledge and our land data?") },
];

export const MUST_HAVES: { re: RegExp; title: T }[] = [
  { re: /40\s*%|forty|asilimia (arobaini|40)|social contribution/i, title: o("Kiasi cha mgao wa jamii kimetajwa", "The community share is stated") },
  { re: /annual report|yearly report|ripoti ya mwaka|\baudit/i, title: o("Ripoti ya mwaka au ukaguzi wa fedha", "Annual reports or financial audit") },
  { re: /consent|fpic|ridhaa/i, title: o("Ridhaa ya jamii imetajwa", "Community consent is mentioned") },
  { re: /terminat|\bexit|kusitisha/i, title: o("Njia ya kusitisha mkataba", "A way to end the agreement") },
  { re: /grievance|dispute|malalamiko|mgogoro/i, title: o("Njia ya malalamiko", "A grievance process") },
  { re: /drought|ukame|force majeure/i, title: o("Ukame umeshughulikiwa", "Drought is addressed") },
];

// Village meeting role play: exercise-based learning from the vision paper.
export type Scene = { text: T; choices: { text: T; points: number; feedback: T }[] };
export const ROLES: T[] = [o("Mwenyekiti wa jamii", "Community chair"), o("Mwakilishi wa wanawake", "Women's representative"), o("Kijana mfugaji", "Young herder"), o("Mwekezaji wa kaboni", "Carbon developer")];
export const SCENES: Scene[] = [
  { text: o("Mwekezaji anafika kijijini: 'Tuna fursa kubwa. Tukisaini wiki hii, malipo yanaanza mwaka ujao.'", "A developer arrives: 'This is a big chance. If we sign this week, payments start next year.'"),
    choices: [
      { text: o("Tuombe nakala kwa Kiswahili na muda wa kujadili", "Ask for a Swahili copy and time to discuss"), points: 3, feedback: o("Vizuri. Taarifa kwanza, na muda wa kutosha ni sehemu ya FPIC.", "Good. Information first, and enough time is part of FPIC.") },
      { text: o("Viongozi wasaini ili tusipoteze fursa", "Let the leaders sign so we do not lose out"), points: 0, feedback: o("Hatari. Sahihi ya haraka ya wachache si ridhaa ya jamii.", "Risky. A rushed signature by a few is not community consent.") },
      { text: o("Tumwondoe mara moja", "Send them away at once"), points: 1, feedback: o("Una haki ya kukataa, lakini kusikia na kuuliza kunakupa nguvu zaidi.", "You may refuse, but hearing and asking gives you more power.") },
    ] },
  { text: o("Mkataba unasema jamii itapata '40% ya faida halisi'. Mnasemaje?", "The contract says the community gets '40% of net profit'. What do you say?"),
    choices: [
      { text: o("Tuombe orodha ya gharama, kikomo chake na ukaguzi huru", "Ask for the cost list, a cap and an independent audit"), points: 3, feedback: o("Sawa kabisa. 40% ya kidogo ni kidogo.", "Exactly right. 40% of very little is very little.") },
      { text: o("40% ni nzuri, tukubali", "40% is good, accept"), points: 0, feedback: o("Angalia msingi wa hesabu kabla ya asilimia.", "Check the base of the calculation before the percentage.") },
      { text: o("Tudai 100%", "Demand 100%"), points: 1, feedback: o("Dai linaweza kuwa kubwa, lakini swali la gharama ndilo muhimu zaidi.", "Bold, but the cost question is the one that matters.") },
    ] },
  { text: o("Mkutano unaendelea, lakini wanawake na vijana wachache wamezungumza. Mnafanya nini?", "The meeting continues, but few women and youth have spoken. What do you do?"),
    choices: [
      { text: o("Tufanye mikutano ya makundi tofauti kisha turudi pamoja", "Hold separate group sessions then come back together"), points: 3, feedback: o("Bora. Ridhaa ya kweli inawafikia wote.", "Best. Real consent reaches everyone.") },
      { text: o("Waliokuja wanatosha", "Those who came are enough"), points: 0, feedback: o("Migogoro mingi huanzia hapa: ushirikishwaji mdogo.", "Many disputes begin here: too little participation.") },
      { text: o("Wazee waamue kwa niaba yao", "Let elders decide for them"), points: 1, feedback: o("Wazee ni muhimu, lakini kamati ya CDA inataka sauti za makundi yote.", "Elders matter, but the CDA committee requires all groups' voices.") },
    ] },
];

export const GLOSSARY: [string, string][] = [
  ["carbon credit", "mkopo wa kaboni"], ["baseline", "msingi wa makadirio"], ["community land", "ardhi ya jamii"],
  ["consent", "ridhaa"], ["contract", "mkataba"], ["agreement", "makubaliano"], ["benefit sharing", "mgao wa manufaa"],
  ["earnings", "mapato"], ["developer", "mwekezaji"], ["grazing", "malisho"], ["drought", "ukame"], ["auditor", "mkaguzi"],
];
