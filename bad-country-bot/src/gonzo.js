// 🦇 The Gonzo Arcade: Hunter S. Thompson–flavored games and toys.
//
//   /bat-country     a hallucination hits the channel
//   /trunk           inventory of the trunk of the Red Shark
//   /gonzo-name      your gonzo alter ego (always the same for you)
//   /attorney        ask your attorney for (terrible) advice
//   /fear-meter      how much fear & loathing someone is carrying today
//   /dispatch        a gonzo news headline about someone
//   /trivia          Hunter S. Thompson trivia, anyone can answer, points for right answers
//   /mint400         multiplayer desert race, join with a button, winner takes points
//   /leaderboard     the Gonzo Points standings
//   /raoul           talk to Raoul, the AI gonzo correspondent (needs ANTHROPIC_API_KEY)
//   /journal         a page from Raoul's field journal
//   /library         Hunter S. Thompson's books, with years
//   /art             an original Bad Country gonzo postcard
//   /road-trip       choose-your-own-disaster drive to Vegas, with buttons
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, SlashCommandBuilder, MessageFlags, AttachmentBuilder,
} from 'discord.js';
import { COLORS } from './config.js';
import * as store from './store.js';
import { aiEnabled, raoulChat, raoulJournal } from './ai.js';

const POSTCARDS = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'assets', 'postcards');

const EPHEMERAL = { flags: MessageFlags.Ephemeral };
const pick = (a) => a[Math.floor(Math.random() * a.length)];
const shuffle = (a) => {
  const b = [...a];
  for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [b[i], b[j]] = [b[j], b[i]]; }
  return b;
};
// Same input → same number, so "your" gonzo name never changes.
const hash = (s) => [...s].reduce((h, c) => (Math.imul(h ^ c.charCodeAt(0), 16777619) >>> 0), 2166136261);
const seeded = (seed, list) => list[hash(seed) % list.length];

// ── Gonzo Points ─────────────────────────────────────────────
function addPoints(userId, n) {
  const pts = (store.ids().gonzoPoints ??= {});
  pts[userId] = (pts[userId] ?? 0) + n;
  store.save();
  return pts[userId];
}

// ── Word piles ───────────────────────────────────────────────
const HALLUCINATIONS = [
  'The carpet in the lobby starts breathing. It has opinions about your shoes.',
  'Every bartender in the room has turned into a lizard. They are still making excellent drinks.',
  'A swarm of bats pours out of the air vent and politely asks for the Wi-Fi password.',
  'The slot machines start chanting your name. One of them owes you money.',
  'The neon sign outside now just says "WHY". It is blinking faster.',
  'A man in a cardinal costume insists you two went to high school together.',
  'The walls are melting, but only on the left side. The right side is fine. The right side is smug.',
  'Your drink has developed a small, reasonable tide.',
  'The hotel elevator asks where you see yourself in five years.',
  'A pterodactyl lands on the convertible and demands to see your press pass.',
  'The TV is showing the news, but every anchor is you, and none of you look well.',
  'Someone at the craps table is rolling dice made of teeth. Nobody else seems bothered.',
  'The desert sky splits open and a voice says "drink some water." It is your mom.',
  'The ice machine down the hall has been screaming for an hour. You are starting to agree with it.',
];

const TRUNK = [
  'a tape recorder that only plays screaming', 'two dozen grapefruit', 'a quart of cheap tequila',
  'a press pass of questionable authenticity', 'one (1) cursed hotel key', 'a bag of rubber lizards',
  'an IBM Selectric typewriter, still warm', 'a pith helmet', 'a cigarette holder', 'a fake police badge (very fake)',
  'a brochure from a 1971 District Attorneys conference', 'a cassette labeled "DO NOT"', 'a broken Polaroid camera',
  'a road map of Nevada with "NO" circled everywhere', 'a jumbo bottle of Visine', 'a Hawaiian shirt with a mysterious stain',
  'a coconut that nobody remembers buying', 'a jar of something labeled ETHER?? in shaky handwriting',
  'the business card of a 300-pound attorney', 'an inflatable pool flamingo with a name tag that says "Steve"',
  'eleven unpaid bar tabs', 'a single cowboy boot', 'a karaoke microphone that is somehow on',
];
const TRUNK_STATUS = ['ominous', 'legally ambiguous', 'leaking slightly', 'humming', 'under federal review', 'emotionally unstable'];

const NAME_FIRST = ['Raoul', 'Lazlo', 'Velvet', 'Mojave', 'Buzzard', 'Dusty', 'Neon', 'Rattlesnake', 'Cactus', 'Vegas', 'Mescal', 'Tumbleweed', 'Sterling', 'Marquis', 'Ditch'];
const NAME_LAST = ['Duke', 'Static', 'Bonebreak', 'Horizon', 'Sideways', 'McFear', 'Loathington', 'Gravel', 'Thunderbird', 'Dustbowl', 'Wildfire', 'Overdrive', 'Barstow', 'Lizardking', 'Moonshine'];
const NAME_TITLE = ['Dr.', 'Sheriff', 'Reverend', 'Professor', 'Colonel', 'Doc', 'The Honorable', 'Captain'];
const NAME_JOB = ['Attorney at Large', 'Sports Correspondent (Fired)', 'Freak Power Candidate', 'Doctor of Journalism', 'Licensed Ordained Minister of the Desert', 'Roving Correspondent', 'Chief of Bat Control', 'Unaccredited Press'];

const ADVICE = [
  'As your attorney, I advise you to rent a very fast car with no top.',
  'As your attorney, I advise you to deny everything, including your own name.',
  'As your attorney, I advise you to drink a glass of water and think about your choices. Then ignore that.',
  'As your attorney, I advise you to absolutely not. Not even a little.',
  'As your attorney, I advise you to do it, but in a disguise.',
  'As your attorney, I advise you to plead the fifth. Also, drink the fifth.',
  'As your attorney, I advise you to leave the state and say nothing to the press.',
  'As your attorney, I advise you to buy the ticket and take the ride.',
  'As your attorney, I advise you to sleep on it. In the car. Somewhere safe.',
  'As your attorney, I advise you to text them. No. Wait. Put the phone down.',
  'As your attorney, I need you to know I am billing you for this question.',
  'As your attorney, I advise you that this is a terrible idea, and I respect it deeply.',
  'As your attorney, I advise you to ask again after a nap and a sandwich.',
  'As your attorney, I advise you to commit fully. Half-measures are how people get caught.',
];

const FEAR_VERDICTS = [
  [10, 'Suspiciously calm. Possibly a narc.'],
  [25, 'Mild unease. A single bat circles overhead.'],
  [45, 'Moderate loathing. The carpet is starting to look at you.'],
  [65, 'Serious fear. Pull over. Hydrate. Breathe.'],
  [85, 'Deep in bat country. Do not operate the convertible.'],
  [101, 'MAXIMUM GONZO. Someone call the attorney. Someone call your mother.'],
];

const D_WHO = ['was spotted', 'was seen', 'was detained', 'was briefly worshipped', 'was found', 'was photographed'];
const D_DOING = ['arguing with a slot machine', 'leading a conga line of lizards', 'giving a TED talk to a parking meter', 'challenging a cactus to a duel', 'trying to pay for drinks in bottle caps', 'singing to the ice machine', 'refusing to leave a hotel pool', 'interviewing a tumbleweed'];
const D_WHERE = ['outside Barstow', 'in the lobby of the Mint Hotel', 'on the Las Vegas Strip', 'somewhere in the Mojave', 'at a 24-hour wedding chapel', 'behind a truck stop in Baker', 'at a casino buffet at 5am'];
const D_WITNESS = ['Witnesses describe the scene as "spiritual."', 'Police declined to comment, citing "vibes."', 'Local bats are said to be "concerned."', 'The suspect\'s attorney says it was "research."', 'Sources say this was not the first time.', 'No one was hurt, except emotionally.'];

// Trivia: every answer here is well documented. Answer is always options[0]; we shuffle on display.
export const TRIVIA = [
  { q: 'Where was Hunter S. Thompson born?', options: ['Louisville, Kentucky', 'Aspen, Colorado', 'Las Vegas, Nevada', 'San Francisco, California'], fact: 'Born July 18, 1937, in Louisville, Kentucky.' },
  { q: 'What year was he born?', options: ['1937', '1941', '1929', '1945'], fact: 'July 18, 1937.' },
  { q: 'Fear and Loathing in Las Vegas first ran in Rolling Stone under which byline?', options: ['Raoul Duke', 'Dr. Gonzo', 'Uncle Duke', 'Lazlo Booth'], fact: 'Rolling Stone ran it in two parts in November 1971 under "Raoul Duke."' },
  { q: 'Fear and Loathing in Las Vegas started as an assignment to cover what?', options: ['The Mint 400 race', 'A boxing match', 'A DA conference only', 'A Sinatra concert'], fact: 'Sports Illustrated sent him to write photo captions for the Mint 400 off-road race. SI rejected what he turned in.' },
  { q: 'The attorney "Dr. Gonzo" was based on which real person?', options: ['Oscar Zeta Acosta', 'Ralph Steadman', 'Jann Wenner', 'Bill Cardoso'], fact: 'Oscar Zeta Acosta was a Chicano lawyer and activist.' },
  { q: 'Who first called Thompson\'s writing "gonzo"?', options: ['Bill Cardoso', 'Tom Wolfe', 'Ralph Steadman', 'Jann Wenner'], fact: 'Bill Cardoso used it after reading "The Kentucky Derby Is Decadent and Depraved" (1970).' },
  { q: 'Which artist\'s ink-splatter drawings became the look of gonzo?', options: ['Ralph Steadman', 'R. Crumb', 'Andy Warhol', 'Garry Trudeau'], fact: 'Their first collaboration was the 1970 Kentucky Derby piece.' },
  { q: 'Which magazine published "The Kentucky Derby Is Decadent and Depraved"?', options: ["Scanlan's Monthly", 'Rolling Stone', 'Playboy', 'Esquire'], fact: "Scanlan's Monthly, June 1970." },
  { q: 'His first book (1967) was about which group?', options: ['The Hells Angels', 'The Merry Pranksters', 'The Black Panthers', 'The Rat Pack'], fact: 'He spent about a year with them for "Hell\'s Angels." It ended with several of them beating him.' },
  { q: 'In 1970, what office did he run for?', options: ['Sheriff of Pitkin County, Colorado', 'Mayor of Aspen', 'Governor of Colorado', 'U.S. Senate'], fact: 'He ran for sheriff on the "Freak Power" ticket and lost.' },
  { q: 'What was the name of his 1970 campaign\'s ticket?', options: ['Freak Power', 'Gonzo Party', 'Bat Country Coalition', 'Mescaline Movement'], fact: 'He shaved his head so he could call his crew-cut opponent "my long-haired opponent."' },
  { q: 'In Fear and Loathing in Las Vegas, what is "the Red Shark"?', options: ['A red convertible', 'A casino', 'A drink', "Dr. Gonzo's nickname"], fact: 'The Red Shark is the red Chevy convertible. The white Cadillac is the Great White Whale.' },
  { q: 'What was the name of his home in Woody Creek, Colorado?', options: ['Owl Farm', 'Bat Ranch', 'Gonzo Acres', 'Freak Hollow'], fact: 'Owl Farm was his base for decades.' },
  { q: 'Who played Raoul Duke in the 1998 film?', options: ['Johnny Depp', 'Bill Murray', 'Benicio del Toro', 'Nicolas Cage'], fact: 'Depp played Duke, and Benicio del Toro played Dr. Gonzo. Bill Murray played Thompson in the 1980 film "Where the Buffalo Roam."' },
  { q: 'Who directed the 1998 film of Fear and Loathing in Las Vegas?', options: ['Terry Gilliam', 'Martin Scorsese', 'David Lynch', 'Oliver Stone'], fact: 'Terry Gilliam, of Monty Python.' },
  { q: 'What was his ESPN.com column called?', options: ['Hey, Rube', 'Gonzo Sports', 'The Shark Tank', 'Fear and Football'], fact: '"Hey, Rube" ran from 2000 to 2005.' },
  { q: 'Which novel, written around 1960, wasn\'t published until 1998?', options: ['The Rum Diary', 'The Curse of Lono', 'Generation of Swine', 'Kingdom of Fear'], fact: 'The Rum Diary is set in Puerto Rico.' },
  { q: 'Which Doonesbury character is based on him?', options: ['Uncle Duke', 'Zonker', 'B.D.', 'Mike Doonesbury'], fact: "Garry Trudeau's Uncle Duke." },
  { q: 'Which book did he famously retype to feel the rhythm of great writing?', options: ['The Great Gatsby', 'On the Road', 'Moby-Dick', 'Ulysses'], fact: 'He also retyped Hemingway\'s "A Farewell to Arms."' },
  { q: 'Which election did "Fear and Loathing on the Campaign Trail \'72" cover?', options: ['Nixon vs. McGovern', 'Nixon vs. Humphrey', 'Carter vs. Ford', 'Johnson vs. Goldwater'], fact: 'He covered the 1972 race for Rolling Stone.' },
  { q: 'What happened to his ashes in 2005?', options: ['Fired from a cannon', 'Scattered in Las Vegas', 'Buried at sea', 'Sealed in a typewriter'], fact: 'The cannon sat atop a tower shaped like his double-thumbed fist. Johnny Depp paid for it.' },
  { q: 'He wrote an obituary for Richard Nixon called…', options: ['"He Was a Crook"', '"Good Riddance"', '"The Last Lie"', '"Fear and Loathing in San Clemente"'], fact: 'Rolling Stone, 1994.' },
];


// ── Journal (used when the AI isn't connected; original writing) ─
const JOURNAL = [
  ['Barstow, 3:12 a.m.', 'The motel sign has lost three letters and all of its dignity. It now says MO EL, which feels like a personal attack. I have filed a complaint with the night clerk, who is either asleep or a very convincing coat on a chair. The bats are out in force tonight. They circle the parking lot in tight, furious loops, like they know something about the morning that we do not.'],
  ['The Checkpoint, 4:40 a.m.', 'Charlie checked three sets of papers tonight. One claimed to be "a ghost, but legally 34." Another listed their poison as "yes." Charlie stamped them all. Charlie believes in people. Charlie is a better man than me, and Charlie is a bat in sunglasses.'],
  ['Somewhere on I-15, 2:05 a.m.', 'The radio found one station and it is only playing the sound of a man breathing. We are not changing it. It feels like the right soundtrack for a road with no other cars on it and a moon that keeps pacing us like a cop.'],
  ['Room 1850, 5:30 a.m.', 'The ice machine down the hall has been screaming since midnight. At first I thought it was a malfunction. Now I think it is the only honest voice in this building. I filled a bucket out of solidarity. We understand each other now.'],
  ['The Lizard Lounge, 1:15 a.m.', 'A woman at the bar told me she could see my aura and that it was "the color of a parking ticket." I have never felt so seen. Tipped the bartender double. The bartender may or may not have been a lizard, but the drinks were honest and the music was loud enough to drown out the bad thoughts.'],
  ['Mint 400 pit row, dawn', 'Dust in the teeth. Dust in the notebook. Dust in places a doctor would ask about. Somewhere out there, eighty machines are screaming across the desert for no reason anyone can articulate, and God help me, it is beautiful.'],
  ['The Trunk Log, 3:33 a.m.', 'Inventory check: one tape recorder, two dozen grapefruit, a press pass with somebody else\'s face on it, and a coconut that nobody will admit to buying. The coconut is the problem. The coconut knows.'],
  ['Pool deck, Bad Country Hotel, 4:00 a.m.', 'Security has asked me to leave the pool twice. I have explained both times that I am conducting research. They do not understand journalism. Neither do I, anymore, but the water is warm and the stars are doing that thing where they wobble.'],
];

// Hunter S. Thompson's books (years = first publication).
const LIBRARY = [
  ["Hell's Angels", 1967, 'His first book: a year riding with the Hells Angels.'],
  ['Fear and Loathing in Las Vegas', 1972, 'Raoul Duke and Dr. Gonzo vs. the American Dream. Illustrated by Ralph Steadman.'],
  ["Fear and Loathing: On the Campaign Trail '72", 1973, 'The 1972 presidential race (Nixon vs. McGovern) from inside the bus.'],
  ['The Great Shark Hunt', 1979, 'Gonzo Papers Vol. 1: a big collection of his journalism.'],
  ['The Curse of Lono', 1983, 'Hawaii, a marathon and a curse. With Ralph Steadman.'],
  ['Generation of Swine', 1988, 'Gonzo Papers Vol. 2: his 1980s newspaper columns.'],
  ['Songs of the Doomed', 1990, 'Gonzo Papers Vol. 3: essays, stories and memoir.'],
  ['Better Than Sex', 1994, 'Gonzo Papers Vol. 4: the 1992 presidential campaign.'],
  ['The Proud Highway', 1997, 'Letters, 1955–1967.'],
  ['The Rum Diary', 1998, 'His early novel, set in Puerto Rico and written around 1960.'],
  ['Fear and Loathing in America', 2000, 'Letters, 1968–1976.'],
  ['Kingdom of Fear', 2003, 'Late-career memoir and essays.'],
  ['Hey Rube', 2004, 'Collected ESPN.com columns.'],
];

const POSTCARD_TITLES = ['Bats Over Barstow', 'Red Shark at Dawn', 'The Carpet Is Breathing', 'Room Service at 4 A.M.', 'Lizard Lounge Hallucination No. 9', 'The Eye of the Mint 400', 'Freak Power Sunset', 'Ether Static'];

// ── Road trip ────────────────────────────────────────────────
const TRIP = [
  { scene: '🌵 **Barstow, edge of the desert.** The trunk is packed, the radio is screaming, and the sun is coming up like a threat.', choices: [
    ['Floor it', [['The Red Shark hits 110 and the speedometer gives up.', 140, 2], ['You blow past a highway patrolman. He salutes. Strange.', 120, 1], ['A tumbleweed hits the windshield and you both scream.', 90, 2]]],
    ['Gas & grapefruit', [['The clerk sells you 24 grapefruit and a map of a place that doesn\'t exist.', 60, 0], ['You fill up and feel almost responsible.', 70, -1], ['The pump starts talking to you. You tip it.', 60, 1]]],
    ['Pick up a hitchhiker', [['He talks about the end of the world for 80 miles. Great guy.', 100, 2], ['She turns out to be a better driver than you. She takes the wheel.', 130, -1], ['He gets out at a cactus and says "this is my stop."', 80, 1]]],
  ] },
  { scene: '🎰 **The Strip rises out of the heat like a fever dream.** Neon everywhere. Your attorney is humming.', choices: [
    ['Check into the hotel', [['The lobby carpet is breathing. You sign in anyway.', 30, 1], ['The front desk gives you the honeymoon suite "for security reasons."', 30, 2], ['You check in under a fake name and then forget it.', 20, 1]]],
    ['Hit the casino floor', [['You win $400 at craps and lose it to a slot machine named Doris.', 10, 2], ['The dealer is a lizard. You lose with dignity.', 10, 1], ['You win big and immediately need to lie down.', 20, -1]]],
    ['Wander into a conference', [['It\'s a room full of district attorneys. You take notes. You are not welcome.', 20, 3], ['You end up giving a keynote. Standing ovation. No idea what you said.', 20, 2], ['Free coffee. You drink six. Your eyes are vibrating.', 10, 2]]],
  ] },
  { scene: '🌙 **3 a.m., Room 1850.** The ice machine is screaming. The wallpaper is doing something it shouldn\'t.', choices: [
    ['Call your attorney', [['"As your attorney, I advise you to go to sleep." Unusually good advice.', 0, -2], ['Your attorney is already in the bathtub with the radio. You leave.', 0, 2], ['He bills you $300 and hangs up.', 0, 1]]],
    ['Order room service', [['Two club sandwiches and a pot of coffee. Civilization returns.', 0, -2], ['The waiter looks at the room and says nothing, which is worse.', 0, 1], ['They send up 12 grapefruit. You did not order grapefruit.', 0, 2]]],
    ['Go swimming', [['The pool is closed. You swim anyway. Security is "disappointed."', 0, 2], ['You float under the stars and feel briefly immortal.', 0, -1], ['A bat lands on your floatie. You are friends now.', 0, 1]]],
  ] },
  { scene: '🌅 **Dawn.** Time to get out of town before the bill catches up with you.', choices: [
    ['Pay the bill', [['The total is unspeakable. You pay it like a hero.', 120, -1], ['The clerk takes one look at you and gives you a discount out of pity.', 140, 0], ['They charge you for a coconut. You don\'t argue.', 130, 0]]],
    ['Sneak out the back', [['Down the service stairs, into the Shark, onto the highway. Clean.', 160, 2], ['You set off every alarm, but nobody chases you.', 150, 3], ['The parking valet waves. He knows. He respects it.', 160, 1]]],
    ['Drive into the sunrise', [['You scream the whole way to the state line. It helps.', 170, 2], ['The sunrise is so beautiful you have to pull over and sit with it.', 120, -2], ['The radio finally plays a good song. Pure joy for 4 minutes.', 160, 0]]],
  ] },
];

// ── Commands ─────────────────────────────────────────────────
export const gonzoCommands = [
  new SlashCommandBuilder().setName('bat-country').setDescription('We can\'t stop here. Trigger a hallucination.'),
  new SlashCommandBuilder().setName('trunk').setDescription('Pop the trunk of the Red Shark and see what\'s inside'),
  new SlashCommandBuilder().setName('gonzo-name').setDescription('Reveal your gonzo alter ego')
    .addUserOption((o) => o.setName('who').setDescription('Someone else (optional)')),
  new SlashCommandBuilder().setName('attorney').setDescription('Ask your attorney for legal advice (do not follow it)')
    .addStringOption((o) => o.setName('question').setDescription('What\'s the situation?').setRequired(true).setMaxLength(200)),
  new SlashCommandBuilder().setName('fear-meter').setDescription('Measure someone\'s fear & loathing levels today')
    .addUserOption((o) => o.setName('who').setDescription('Victim (optional)')),
  new SlashCommandBuilder().setName('dispatch').setDescription('File a gonzo news report about someone')
    .addUserOption((o) => o.setName('who').setDescription('The subject').setRequired(true)),
  new SlashCommandBuilder().setName('trivia').setDescription('Hunter S. Thompson trivia: first round of answers win Gonzo Points'),
  new SlashCommandBuilder().setName('mint400').setDescription('Start a Mint 400 desert race. Anyone can join.'),
  new SlashCommandBuilder().setName('leaderboard').setDescription('Gonzo Points standings'),
  new SlashCommandBuilder().setName('raoul').setDescription('Talk to Raoul, the AI gonzo correspondent')
    .addStringOption((o) => o.setName('message').setDescription('What do you want to tell him?').setRequired(true).setMaxLength(600)),
  new SlashCommandBuilder().setName('journal').setDescription('Read a page from Raoul\'s field journal')
    .addStringOption((o) => o.setName('topic').setDescription('What should tonight\'s entry be about? (optional)').setMaxLength(150)),
  new SlashCommandBuilder().setName('library').setDescription('Hunter S. Thompson\'s books, with the year each came out'),
  new SlashCommandBuilder().setName('art').setDescription('An original Bad Country gonzo postcard'),
  new SlashCommandBuilder().setName('road-trip').setDescription('Choose-your-own-disaster drive to Las Vegas'),
].map((c) => c.setDMPermission(false).toJSON());

export const GONZO_NAMES = new Set(gonzoCommands.map((c) => c.name));

export async function onGonzoCommand(i) {
  const name = i.commandName;

  if (name === 'bat-country') {
    return i.reply({ embeds: [new EmbedBuilder().setColor(COLORS.neon).setTitle('🦇 We can\'t stop here. This is Bad Country.').setDescription(`*${pick(HALLUCINATIONS)}*`).setFooter({ text: `${i.user.username} is experiencing this. Everyone else is just watching.` })] });
  }

  if (name === 'trunk') {
    const items = shuffle(TRUNK).slice(0, 5 + Math.floor(Math.random() * 3));
    return i.reply({ embeds: [new EmbedBuilder().setColor(COLORS.blood).setTitle('🦈 The trunk of the Red Shark').setDescription(items.map((x) => `• ${x}`).join('\n')).addFields({ name: 'Status', value: pick(TRUNK_STATUS), inline: true }, { name: 'Opened by', value: `<@${i.user.id}>`, inline: true })] , allowedMentions: { parse: [] } });
  }

  if (name === 'gonzo-name') {
    const u = i.options.getUser('who') ?? i.user;
    const s = u.id;
    const full = `${seeded(s + 't', NAME_TITLE)} ${seeded(s + 'f', NAME_FIRST)} ${seeded(s + 'l', NAME_LAST)}`;
    return i.reply({ embeds: [new EmbedBuilder().setColor(COLORS.desert).setTitle('🪪 Gonzo Alter Ego').setDescription(`<@${u.id}>, out here you are known as\n\n# ${full}\n*${seeded(s + 'j', NAME_JOB)}*`)], allowedMentions: { parse: [] } });
  }

  if (name === 'attorney') {
    const q = i.options.getString('question', true);
    return i.reply({ embeds: [new EmbedBuilder().setColor(0x3c6e71).setTitle('⚖️ Your Attorney Will See You Now').addFields({ name: 'Your question', value: q }, { name: 'Legal advice', value: pick(ADVICE) }).setFooter({ text: 'Not legal advice. Your attorney is a work of fiction and possibly a lizard.' })], allowedMentions: { parse: [] } });
  }

  if (name === 'fear-meter') {
    const u = i.options.getUser('who') ?? i.user;
    const day = new Date().toISOString().slice(0, 10);
    const n = hash(u.id + day) % 101;
    const bar = '█'.repeat(Math.round(n / 10)) + '░'.repeat(10 - Math.round(n / 10));
    const verdict = FEAR_VERDICTS.find(([max]) => n < max)[1];
    return i.reply({ embeds: [new EmbedBuilder().setColor(n > 64 ? COLORS.blood : COLORS.ether).setTitle('🌡️ Fear & Loathing Meter').setDescription(`<@${u.id}>\n\`${bar}\` **${n}%**\n\n${verdict}`).setFooter({ text: 'Readings reset at midnight UTC. The bats do not.' })], allowedMentions: { parse: [] } });
  }

  if (name === 'dispatch') {
    const u = i.options.getUser('who', true);
    const city = pick(['LAS VEGAS', 'BARSTOW', 'WOODY CREEK', 'BAKER', 'ASPEN', 'THE MOJAVE']);
    return i.reply({ embeds: [new EmbedBuilder().setColor(COLORS.dust).setTitle('📰 DISPATCH FROM THE DESERT').setDescription(`**${city} —** <@${u.id}> ${pick(D_WHO)} ${pick(D_DOING)} ${pick(D_WHERE)} at approximately ${1 + Math.floor(Math.random() * 4)}:${String(Math.floor(Math.random() * 60)).padStart(2, '0')} a.m. ${pick(D_WITNESS)}`).setFooter({ text: `Filed by ${i.user.username}, roving correspondent` })], allowedMentions: { parse: [] } });
  }


  if (name === 'raoul') {
    if (!aiEnabled) return i.reply({ content: '🦇 Raoul isn\'t hooked up yet. Staff: add an `ANTHROPIC_API_KEY` to Charlie\'s `.env` and restart him.', ...EPHEMERAL });
    const s = (store.ids().raoulCooldown ??= {});
    const wait = (s[i.user.id] ?? 0) + 15_000 - Date.now();
    if (wait > 0) return i.reply({ content: `🥃 Raoul is still lighting a cigarette. Try again in ${Math.ceil(wait / 1000)}s.`, ...EPHEMERAL });
    s[i.user.id] = Date.now();
    await i.deferReply();
    const msg = i.options.getString('message', true);
    const reply = await raoulChat(i.channelId, i.member?.displayName ?? i.user.username, msg);
    return i.editReply({ content: `> **${i.user.username}:** ${msg.slice(0, 300)}\n\n${reply}`, allowedMentions: { parse: [] } });
  }

  if (name === 'journal') {
    const topic = i.options.getString('topic');
    if (aiEnabled) {
      await i.deferReply();
      const entry = await raoulJournal(topic);
      if (entry) return i.editReply({ embeds: [new EmbedBuilder().setColor(COLORS.dust).setTitle('📓 From Raoul\'s Field Journal').setDescription(entry.slice(0, 4000)).setFooter({ text: 'Written fresh by Raoul, an AI in a gonzo mood. Original fiction.' })] });
    }
    const [when, text] = JOURNAL[Math.floor(Math.random() * JOURNAL.length)];
    const payload = { embeds: [new EmbedBuilder().setColor(COLORS.dust).setTitle('📓 From Raoul\'s Field Journal').setDescription(`**${when}**\n\n${text}`).setFooter({ text: 'Original fiction from Bad Country, written in a gonzo spirit.' })] };
    return i.deferred ? i.editReply(payload) : i.reply(payload);
  }

  if (name === 'library') {
    const body = LIBRARY.map(([t, y, d]) => `**${t}** (${y})\n${d}`).join('\n\n');
    return i.reply({ embeds: [new EmbedBuilder().setColor(COLORS.desert).setTitle('📚 The Gonzo Library').setDescription(body).setFooter({ text: 'Read the real thing. Your local library has him. Charlie insists.' })] });
  }

  if (name === 'art') {
    const n = 1 + Math.floor(Math.random() * POSTCARD_TITLES.length);
    const file = new AttachmentBuilder(path.join(POSTCARDS, `postcard-${n}.png`), { name: `bad-country-${n}.png` });
    return i.reply({ embeds: [new EmbedBuilder().setColor(COLORS.neon).setTitle(`🖼️ "${POSTCARD_TITLES[n - 1]}"`).setImage(`attachment://bad-country-${n}.png`).setFooter({ text: `Bad Country original, No. ${n} of ${POSTCARD_TITLES.length} • /art for another` })], files: [file] });
  }

  if (name === 'road-trip') return startTrip(i);

  if (name === 'trivia') return startTrivia(i);
  if (name === 'mint400') return startRace(i);

  if (name === 'leaderboard') {
    const pts = Object.entries(store.ids().gonzoPoints ?? {}).sort((a, b) => b[1] - a[1]).slice(0, 10);
    const medals = ['🥇', '🥈', '🥉'];
    const body = pts.length ? pts.map(([id, p], n) => `${medals[n] ?? `**${n + 1}.**`} <@${id}> — **${p}** pts`).join('\n') : 'Nobody has any Gonzo Points yet. Try `/trivia` or `/mint400`.';
    return i.reply({ embeds: [new EmbedBuilder().setColor(COLORS.desert).setTitle('🏆 Gonzo Points').setDescription(body).setFooter({ text: 'Trivia: +1 per correct answer • Mint 400: +3 win, +1 finish' })], allowedMentions: { parse: [] } });
  }
}

// ── Trivia ───────────────────────────────────────────────────
const trivia = new Map(); // messageId → { correct, answered: Map<userId, idx> }
const TRIVIA_SECONDS = 30;

async function startTrivia(i) {
  const t = TRIVIA[Math.floor(Math.random() * TRIVIA.length)];
  const order = shuffle([0, 1, 2, 3]);
  const correct = order.indexOf(0);
  const letters = ['🅰️', '🅱️', '©️', '🇩'];
  const embed = new EmbedBuilder().setColor(COLORS.neon).setTitle('🧠 Gonzo Trivia').setDescription(`**${t.q}**\n\n${order.map((o, n) => `${letters[n]} ${t.options[o]}`).join('\n')}`).setFooter({ text: `${TRIVIA_SECONDS} seconds. One guess each. Right answers get +1 Gonzo Point.` });
  const row = new ActionRowBuilder().addComponents(order.map((_, n) => new ButtonBuilder().setCustomId(`trivia:${n}`).setEmoji(letters[n]).setStyle(ButtonStyle.Secondary)));
  const msg = await i.reply({ embeds: [embed], components: [row], withResponse: true }).then((r) => r.resource.message);
  trivia.set(msg.id, { correct, answered: new Map() });
  setTimeout(async () => {
    const game = trivia.get(msg.id);
    trivia.delete(msg.id);
    const winners = [...game.answered].filter(([, a]) => a === correct).map(([id]) => id);
    for (const id of winners) addPoints(id, 1);
    const result = new EmbedBuilder().setColor(COLORS.desert).setTitle('🧠 Gonzo Trivia: time\'s up')
      .setDescription(`**${t.q}**\n✅ **${t.options[0]}**\n\n🦇 ${t.fact}\n\n${winners.length ? `**+1 Gonzo Point:** ${winners.map((id) => `<@${id}>`).join(' ')}` : 'Nobody got it. The bats are disappointed.'}`)
      .setFooter({ text: `${game.answered.size} guess(es) • /trivia to go again` });
    await msg.edit({ embeds: [result], components: [], allowedMentions: { parse: [] } }).catch(() => {});
  }, TRIVIA_SECONDS * 1000);
}

// ── Mint 400 ─────────────────────────────────────────────────
const races = new Map(); // messageId → { racers: Map<id, name>, started }
const LOBBY_SECONDS = 45;
const LAPS = 4;
const NPCS = ['🦎 A man-sized lizard', '⚖️ Your attorney', '🦇 A suspicious bat', '🌵 A cactus with a driver\'s license'];
const RACE_EVENTS = [
  ['hits a dune at full speed and goes airborne', 3], ['takes a shortcut through a cactus field', 2], ['finds a clean stretch of salt flat', 3],
  ['stops to argue with a vulture', -1], ['gets lost following a mirage', -2], ['blows a tire and changes it in record time', 0],
  ['is passed by a tumbleweed, emotionally', -1], ['catches a tailwind and screams the whole time', 2], ['detours to a roadside bar "just for one"', -3],
  ['drifts sideways through a sandstorm', 1], ['spots bats and floors it', 2], ['gets pulled over by a highway patrolman who is also a lizard', -2],
];

async function startRace(i) {
  const embed = (r) => new EmbedBuilder().setColor(COLORS.blood).setTitle('🏁 THE MINT 400 — the most chaotic desert race in the West')
    .setDescription(`Engines screaming. Dust everywhere. **Join in the next ${LOBBY_SECONDS} seconds.**\n\n**Racers:**\n${[...r.racers.values()].map((n) => `🏎️ ${n}`).join('\n') || '*nobody yet…*'}`)
    .setFooter({ text: 'Win: +3 Gonzo Points • Finish: +1' });
  const row = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('mint:join').setLabel('Strap in').setEmoji('🏎️').setStyle(ButtonStyle.Danger));
  const race = { racers: new Map([[i.user.id, i.user.username]]), started: false, embed };
  const msg = await i.reply({ embeds: [embed(race)], components: [row], withResponse: true }).then((r) => r.resource.message);
  races.set(msg.id, race);
  setTimeout(() => runRace(msg, race).catch((e) => console.warn('[mint400]', e.message)), LOBBY_SECONDS * 1000);
}

async function runRace(msg, race) {
  race.started = true;
  const humans = [...race.racers].map(([id, name]) => ({ id, name: `🏎️ ${name}`, pos: 0 }));
  const npcs = shuffle(NPCS).slice(0, Math.max(1, 4 - humans.length)).map((name) => ({ id: null, name, pos: 0 }));
  const field = [...humans, ...npcs];
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const track = (f) => {
    const len = 14;
    const p = Math.max(0, Math.min(len, Math.round((f.pos / (LAPS * 5)) * len)));
    return `\`${'·'.repeat(p)}🏎${'·'.repeat(len - p)}🏁\` ${f.name}`;
  };
  for (let lap = 1; lap <= LAPS; lap++) {
    const log = [];
    for (const f of field) {
      const [what, bonus] = pick(RACE_EVENTS);
      f.pos += Math.max(0, 3 + Math.floor(Math.random() * 3) + bonus);
      if (Math.random() < 0.6) log.push(`${f.name} ${what}.`);
    }
    field.sort((a, b) => b.pos - a.pos);
    const e = new EmbedBuilder().setColor(COLORS.blood).setTitle(`🏁 THE MINT 400 — Lap ${lap}/${LAPS}`)
      .setDescription(`${field.map(track).join('\n')}\n\n${log.slice(0, 5).join('\n')}`);
    await msg.edit({ embeds: [e], components: [] });
    await wait(3500);
  }
  const winner = field[0];
  for (const h of humans) addPoints(h.id, h === winner ? 3 : 1);
  const podium = field.map((f, n) => `${['🥇', '🥈', '🥉'][n] ?? `${n + 1}.`} ${f.name}`).join('\n');
  const done = new EmbedBuilder().setColor(COLORS.desert).setTitle('🏆 THE MINT 400 — FINAL')
    .setDescription(`${podium}\n\n${winner.id ? `**<@${winner.id}> wins and takes +3 Gonzo Points.** Every human finisher gets +1.` : `**${winner.name} wins.** The humans have been humbled. Finishers still get +1.`}`);
  await msg.edit({ embeds: [done], components: [], allowedMentions: { parse: [] } });
  races.delete(msg.id);
}


// ── Road trip engine ─────────────────────────────────────────
const trips = new Map(); // messageId → { owner, step, miles, chaos, log }

function tripView(t) {
  const sc = TRIP[t.step];
  const gauge = (n) => '🦇'.repeat(Math.max(0, Math.min(10, n))) || '·';
  const e = new EmbedBuilder().setColor(COLORS.blood).setTitle(`🦈 Road Trip to Vegas — Leg ${t.step + 1}/${TRIP.length}`)
    .setDescription(`${t.log.length ? `${t.log.at(-1)}\n\n` : ''}${sc.scene}\n\n**What do you do?**`)
    .addFields({ name: 'Miles', value: String(t.miles), inline: true }, { name: 'Chaos', value: gauge(t.chaos), inline: true });
  const row = new ActionRowBuilder().addComponents(sc.choices.map(([label], n) => new ButtonBuilder().setCustomId(`trip:${n}`).setLabel(label).setStyle(n === 0 ? ButtonStyle.Danger : ButtonStyle.Secondary)));
  return { embeds: [e], components: [row] };
}

async function startTrip(i) {
  const t = { owner: i.user.id, step: 0, miles: 0, chaos: 3, log: [] };
  const msg = await i.reply({ ...tripView(t), withResponse: true }).then((r) => r.resource.message);
  trips.set(msg.id, t);
  setTimeout(() => trips.delete(msg.id), 15 * 60_000);
}

async function onTripButton(i) {
  const t = trips.get(i.message.id);
  if (!t) return i.reply({ content: '🏜️ This trip ended. Start your own with `/road-trip`.', ...EPHEMERAL });
  if (i.user.id !== t.owner) return i.reply({ content: '🚗 Not your car, pal. Start your own with `/road-trip`.', ...EPHEMERAL });
  const [, outcomes] = TRIP[t.step].choices[Number(i.customId.split(':')[1])];
  const [text, miles, chaos] = pick(outcomes);
  t.miles += miles;
  t.chaos = Math.max(0, Math.min(10, t.chaos + chaos));
  t.log.push(`*${text}*`);
  t.step++;
  if (t.step < TRIP.length) return i.update(tripView(t));

  trips.delete(i.message.id);
  const pts = Math.round(t.miles / 100) + (t.chaos >= 7 ? 2 : t.chaos <= 2 ? 1 : 0);
  addPoints(t.owner, pts);
  const ending = t.chaos >= 8 ? 'You made it out alive, technically. Legends will be told. None of them flattering.'
    : t.chaos <= 2 ? 'Suspiciously well-behaved. The desert is disappointed in you, but your liver is proud.'
      : 'Sunburned, broke and changed forever. A classic run.';
  const e = new EmbedBuilder().setColor(COLORS.desert).setTitle('🏁 Trip Report')
    .setDescription(`${t.log.join('\n')}\n\n**${ending}**`)
    .addFields({ name: 'Miles', value: String(t.miles), inline: true }, { name: 'Final chaos', value: `${t.chaos}/10`, inline: true }, { name: 'Gonzo Points', value: `+${pts}`, inline: true })
    .setFooter({ text: '/road-trip to ride again • /leaderboard' });
  return i.update({ embeds: [e], components: [] });
}

// ── Buttons ──────────────────────────────────────────────────
export async function onGonzoButton(i) {
  if (i.customId.startsWith('trip:')) return onTripButton(i);
  if (i.customId.startsWith('trivia:')) {
    const game = trivia.get(i.message.id);
    if (!game) return i.reply({ content: '⏰ That round is over. Start a new one with `/trivia`.', ...EPHEMERAL });
    if (game.answered.has(i.user.id)) return i.reply({ content: '🦇 One guess per round, champ.', ...EPHEMERAL });
    game.answered.set(i.user.id, Number(i.customId.split(':')[1]));
    return i.reply({ content: '🔒 Answer locked in. Results when the timer runs out.', ...EPHEMERAL });
  }
  if (i.customId === 'mint:join') {
    const race = races.get(i.message.id);
    if (!race || race.started) return i.reply({ content: '🏁 Too late, the flag already dropped.', ...EPHEMERAL });
    if (race.racers.has(i.user.id)) return i.reply({ content: '🏎️ You\'re already strapped in.', ...EPHEMERAL });
    race.racers.set(i.user.id, i.user.username);
    return i.update({ embeds: [race.embed(race)] });
  }
}

export const isGonzoButton = (id) => id.startsWith('trivia:') || id === 'mint:join' || id.startsWith('trip:');
