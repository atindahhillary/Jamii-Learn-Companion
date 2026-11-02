import { o, type T } from "./content.js";

// The journey: one fictional village, one stop per module. Each stop stands alone because the order follows community gaps.
export const GUIDE = "Mzee Sironka";
export const VILLAGE = "Enkare";
export type Stop = { place: T; open: T; ask: T; close: T };

export const STORY: Record<string, Stop> = {
  m1: {
    place: o("Kisimani", "At the well"),
    open: o("Karibu, rafiki. Ni asubuhi hapa kijijini Enkare. Gari geni limefika kisimani, na mgeni anasema atalipa kwa 'hewa safi'. Wanawake wananitazama: Mzee, hewa inauzwaje? Tembea nami, tujue.", "Welcome, friend. It is morning in Enkare village. A strange car has stopped at the well, and the visitor says he will pay for 'clean air'. The women look at me: Elder, how is air sold? Walk with me and let us find out."),
    ask: o("Ungemwuliza nini mgeni huyo hapo kisimani?", "What would you ask that visitor at the well?"),
    close: o("Swali zuri ni kama maji: huleta uhai. Sasa tunajua kinachouzwa ni ahadi, si hewa.", "A good question is like water: it brings life. Now we know what is sold is a promise, not air."),
  },
  m2: {
    place: o("Malishoni", "On the grazing land"),
    open: o("Tumepanda hadi malishoni. Angalia nyasi hizi. Baba yangu alijua lini kupumzisha eneo hili, bila karatasi yoyote. Mgeni anaita hii 'kaboni'. Sisi tunaiita maisha.", "We have climbed to the grazing land. Look at this grass. My father knew when to rest this place, without any paper. The visitor calls this 'carbon'. We call it life."),
    ask: o("Ni jambo gani la jadi unalotaka watoto wenu wasilisahau? Shiriki tu unachoona ni sawa.", "What traditional practice do you want your children never to forget? Share only what feels right."),
    close: o("Asante. Hazina hiyo ni ya jamii yako. Usimpe mtu yeyote bila jamii kukubali.", "Thank you. That treasure belongs to your community. Give it to no one unless the community agrees."),
  },
  m3: {
    place: o("Kilimani", "On the hill"),
    open: o("Leo mkaguzi amekuja na vifaa vya kupimia. Tumekaa juu ya kilima tukimtazama. Kijana mmoja ananiuliza: Mzee, kama hatuelewi hesabu zake, nani analinda ukweli?", "Today an auditor came with measuring tools. We sit on the hill watching. A young person asks me: Elder, if we do not understand the sums, who protects the truth?"),
    ask: o("Ni nani katika jamii yako angeweza kujifunza kufuatilia upimaji huu?", "Who in your community could learn to follow this measuring?"),
    close: o("Jicho la jamii ni kinga bora kuliko karatasi yoyote.", "The community's own eye is better protection than any paper."),
  },
  m4: {
    place: o("Mpakani", "At the boundary"),
    open: o("Tumefika kwenye mpaka wa ardhi. Mgeni anaonyesha ramani yake, lakini mistari yake haijui njia ya mifugo wala kisima cha ukame. Ardhi hii ina hadithi ambayo ramani haijui.", "We have reached the boundary. The visitor shows his map, but its lines do not know the cattle path or the drought well. This land holds a story the map does not know."),
    ask: o("Ni sehemu gani ya ardhi yenu ambayo ramani haiwezi kueleza umuhimu wake?", "Which part of your land can no map explain the importance of?"),
    close: o("Ijue ardhi yako kwa sheria pia, si kwa moyo tu. Vyote viwili vinakulinda.", "Know your land by law too, not by heart alone. Both protect you."),
  },
  m5: {
    place: o("Chini ya mti wa mkutano", "Under the meeting tree"),
    open: o("Kengele imelia. Kila mtu amekuja chini ya mti wa mkutano. Lakini angalia: wanawake wamekaa nyuma na vijana wako kimya. Mgeni anasema: 'Mmekubali, sivyo?' Je, kimya ni ndiyo?", "The call has gone out. Everyone has come under the meeting tree. But look: the women sit at the back and the youth are silent. The visitor says: 'You agree, don't you?' Is silence a yes?"),
    ask: o("Sauti ya nani mara nyingi haisikiki katika mikutano yenu?", "Whose voice is often not heard in your meetings?"),
    close: o("Jamii inakubali pale tu sauti zote zimesikika. Kumbuka hilo chini ya mti wowote.", "A community agrees only when all voices have been heard. Remember that under any tree."),
  },
  m6: {
    place: o("Sokoni", "At the market"),
    open: o("Siku ya soko. Mama Naserian anauza ng'ombe na anahesabu kila shilingi. Anacheka: 'Mgeni anasema tutapata 40%, lakini 40% ya nini?' Twende tukae naye, tufanye hesabu hii.", "Market day. Mama Naserian sells a cow and counts every shilling. She laughs: 'The visitor says we get 40%, but 40% of what?' Let us sit with her and do this sum."),
    ask: o("Mradi ukileta pesa kwa jamii yenu, mngeanza na nini kwanza?", "If a project brought money to your community, what would you start with?"),
    close: o("Pesa bila hesabu ni kama maji kwenye kikapu. Omba kuona hesabu kila mwaka.", "Money without accounts is water in a basket. Ask to see the accounts every year."),
  },
  m7: {
    place: o("Kamatini", "With the committee"),
    open: o("Usiku umefika na kamati inasoma mkataba kwa taa. Kurasa ni nyingi na Kiingereza ni kigumu. Mgeni amesema lazima saini iwe kesho. Mimi nasema: mti mkubwa haukui kwa siku moja.", "Night has come and the committee reads the contract by lamp. The pages are many and the English is hard. The visitor says it must be signed tomorrow. I say: a great tree does not grow in one day."),
    ask: o("Ni nani anayeaminika mngemwomba asome mkataba pamoja nanyi?", "Who could you trust to read a contract with you?"),
    close: o("Haraka ya mwingine si dharura yako. Soma, uliza, kisha amueni pamoja.", "Another person's hurry is not your emergency. Read, ask, then decide together."),
  },
  m8: {
    place: o("Karibu na moto wa jioni", "By the evening fire"),
    open: o("Jioni moto unawaka. Mjukuu wangu ananionyesha simu na kusema: 'Babu, inajua kila kitu!' Natabasamu, kwa sababu hata mimi niliye hapa ni AI, si mzee halisi. Nikae nawe, tuzungumze jinsi ya kuniamini kwa busara.", "In the evening the fire burns. My grandchild shows me a phone and says: 'Grandfather, it knows everything!' I smile, because even I am an AI, not a real elder. Sit with me and let us talk about how to trust me wisely."),
    ask: o("Ni jambo gani usingeuliza AI, bali mtu wa kweli?", "What would you never ask an AI, only a real person?"),
    close: o("Nimefurahi. Unaweza kunitumia, lakini maamuzi ni yenu daima.", "I am glad. You may use me, but the decisions are always yours."),
  },
};

export const WELCOME = o(
  "Karibu, rafiki. Mimi ni Mzee Sironka, kiongozi wako wa safari. Mimi ni AI, si mzee halisi. Kabla ya kutembea, nataka kukusikiliza.",
  "Welcome, friend. I am Mzee Sironka, your journey guide. I am an AI, not a real elder. Before we walk, I want to listen to you.",
);

export const FINALE = o(
  "Tumetembea pamoja, na ardhi yako imechanua. Sasa rudi kijijini ukawafundishe wengine. Hiyo ndiyo safari halisi.",
  "We have walked together and your land has bloomed. Now go back to the village and teach others. That is the real journey.",
);
