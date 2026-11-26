// Engagement: daily Question of the Day, anonymous confessions, Gonzo facts.
import { EmbedBuilder, SlashCommandBuilder, PermissionFlagsBits as P, MessageFlags } from 'discord.js';
import { QOTD, CONFESSIONS, COLORS } from './config.js';
import { roleId, channelId, log } from './gate.js';
import * as store from './store.js';

const EPHEMERAL = { flags: MessageFlags.Ephemeral };

// ── Hunter S. Thompson facts ─────────────────────────────────
// Kept to well-documented facts. If you add more, check them first.
export const FACTS = [
  'Hunter Stockton Thompson was born **July 18, 1937**, in **Louisville, Kentucky**.',
  'At 17 (1955) he was charged as an accessory to a robbery and spent about a month in jail. That meant he **missed his own high school graduation**.',
  'He joined the **U.S. Air Force** in 1956 and ended up writing sports for the base newspaper at Eglin Air Force Base in Florida.',
  'To learn the rhythm of great prose, he retyped **The Great Gatsby** and **A Farewell to Arms**. He just wanted to feel what writing like that felt like.',
  'He spent about a year with the **Hells Angels** for his first book, **Hell\'s Angels** (1967). It ended when several of them beat him badly.',
  'The word **"gonzo"** was first applied to his work by Boston Globe Sunday Magazine editor **Bill Cardoso**, after reading **"The Kentucky Derby Is Decadent and Depraved"** (Scanlan\'s Monthly, 1970).',
  'That Kentucky Derby piece was his first collaboration with British artist **Ralph Steadman**. Steadman\'s ink-splatter drawings became the look of gonzo.',
  'In **1970** he ran for **sheriff of Pitkin County, Colorado** (Aspen) on the **"Freak Power"** ticket. He shaved his head so he could call his crew-cut opponent "my long-haired opponent." He lost, but not by a landslide.',
  '**Fear and Loathing in Las Vegas** started as a **Sports Illustrated** assignment to write photo captions for the **Mint 400** off-road race in 1971. SI rejected what he turned in.',
  '**Rolling Stone** ran Fear and Loathing in Las Vegas in two parts in **November 1971**, under the byline **Raoul Duke**. The book came out in 1972.',
  '**Dr. Gonzo**, the attorney in Fear and Loathing in Las Vegas, was based on **Oscar Zeta Acosta**, a Chicano lawyer and activist. The book disguised him as a "300-pound Samoan."',
  'In Fear and Loathing in Las Vegas, **the Red Shark** is the red Chevy convertible and **the Great White Whale** is the white Cadillac.',
  'The **Mint 400** is a real desert off-road race outside Las Vegas, and it still runs today.',
  '**Fear and Loathing on the Campaign Trail \'72** came from covering the 1972 presidential race, McGovern vs. Nixon, for Rolling Stone.',
  'He despised **Richard Nixon**. When Nixon died in 1994, Thompson wrote an obituary for Rolling Stone called **"He Was a Crook."**',
  'He wrote **The Rum Diary** around 1960, set in Puerto Rico. It wasn\'t published until **1998**.',
  'His home base for decades was **Owl Farm** in **Woody Creek, Colorado**, just outside Aspen.',
  'The character **Uncle Duke** in Garry Trudeau\'s comic strip **Doonesbury** is based on him.',
  'Terry Gilliam directed the **1998 film** of Fear and Loathing in Las Vegas, with **Johnny Depp** as Raoul Duke and **Benicio del Toro** as Dr. Gonzo. Depp lived at Owl Farm for a while to prepare.',
  '**The Great Shark Hunt** (1979) was the first volume of **The Gonzo Papers**, a big collection of his journalism.',
  'From 2000 to 2005 he wrote a sports column for **ESPN.com** called **"Hey, Rube."**',
  'He died by suicide at Owl Farm on **February 20, 2005**, at age **67**. If you\'re hurting, reach out: in the US, call or text **988**.',
  'His last note was titled **"Football Season Is Over."** He wrote it four days before he died.',
  'In August 2005 his **ashes were fired from a cannon** at Owl Farm. The cannon sat on a tower shaped like a **double-thumbed fist clutching a peyote button**, his gonzo symbol. **Johnny Depp** paid for it.',
  'The double-thumbed fist was also the emblem of his 1970 sheriff campaign.',
];

// ── QOTD questions (21+ energy, no one gets hurt) ────────────
export const QUESTIONS = [
  "What's the most unhinged thing you've done that you'd 100% do again?",
  'You wake up in a Vegas hotel room you don\'t recognize. What\'s the first thing you check for?',
  'What\'s your "it\'s 3am and I\'m making questionable decisions" go-to?',
  'Pick a drink that matches your personality. Defend it.',
  'What\'s a hill you will absolutely die on?',
  'What\'s the weirdest job you\'ve ever had?',
  'What conspiracy theory do you lowkey kind of believe?',
  'If your life had a parental advisory label, what would it warn about?',
  'Worst date you\'ve ever been on. Go.',
  'What would your mugshot caption be?',
  'Describe your current mental state using only a road sign.',
  'What\'s the strangest thing you\'ve ever eaten?',
  'You get one call from jail. Who are you calling, and who are you NOT calling?',
  'What\'s a smell that instantly takes you back somewhere?',
  'Desert road trip: pick 3 people from this server and 1 album. Who and what?',
  'What\'s the most chaotic thing in your camera roll right now? (Describe it. Don\'t post it.)',
  'What\'s something you were weirdly good at as a kid?',
  'Which animal would you trust to drive you home?',
  'What\'s your most irrational fear?',
  'What\'s the best advice you got from a stranger at a bar?',
  'What song makes you want to drive way too fast?',
  'If you could pull off one crime with zero consequences, what would it be? (Be creative, not evil.)',
  'What\'s the most "main character" thing you\'ve ever done?',
  'What\'s your hangover cure, and does it actually work?',
  'If you started a cult, what would be its one rule?',
  'Name a "red flag" that\'s actually a green flag for you.',
  'What\'s the dumbest way you\'ve ever hurt yourself?',
  'What book, movie or album changed your brain chemistry?',
  'What does your inner monologue sound like? Narrator, gremlin, or static?',
  'If you could haunt one place after you die, where are you haunting?',
  'What\'s something everyone loves that you think is overrated?',
  'Tell us about a time you were confidently wrong.',
  'What\'s your karaoke song, and how badly do you sing it?',
  'What\'s the best thing that ever happened to you completely by accident?',
  'You get a free billboard for a week. What does it say?',
  'What\'s your most useless talent?',
  'If you were a cryptid, what would people report seeing?',
  'What\'s the last thing that made you laugh so hard you couldn\'t breathe?',
  'What do you want written on your tombstone?',
  'Sunrise or sunset? Explain yourself like a poet or a lunatic.',
  'What\'s a tiny thing that instantly makes your day better?',
  'If your vices had a group chat, what would they be saying right now?',
  'What\'s the boldest thing you\'ve ever said to someone\'s face?',
  'Which decade do you secretly belong in?',
  'What\'s something you\'re proud of that nobody ever asks about?',
  'Rate your current chaos level from 1 to "ether binge in a convertible."',
];

// Pick without repeats until the whole list has been used.
function nextFromDeck(name, list) {
  const s = (store.ids().decks ??= {});
  if (!s[name]?.length) {
    const deck = list.map((_, i) => i);
    for (let i = deck.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [deck[i], deck[j]] = [deck[j], deck[i]];
    }
    s[name] = deck;
  }
  const idx = s[name].pop();
  store.save();
  return list[idx] ?? list[0];
}
export const randomFact = () => nextFromDeck('facts', FACTS);

// ── Commands ─────────────────────────────────────────────────
export const funCommands = [
  new SlashCommandBuilder()
    .setName('confess')
    .setDescription('Post an anonymous confession (staff can see who sent it, for safety)')
    .setDMPermission(false)
    .addStringOption((o) => o.setName('confession').setDescription('Get it off your chest').setRequired(true).setMaxLength(1500)),
  new SlashCommandBuilder()
    .setName('gonzo')
    .setDescription('A true Hunter S. Thompson fact')
    .setDMPermission(false),
  new SlashCommandBuilder()
    .setName('qotd')
    .setDescription('Post a Question of the Day right now (staff)')
    .setDefaultMemberPermissions(P.ManageMessages)
    .setDMPermission(false)
    .addStringOption((o) => o.setName('question').setDescription('Your own question (blank = random)').setMaxLength(300)),
].map((c) => c.toJSON());

const isCitizen = (member) => member.roles.cache.has(roleId('citizen'));

async function fetchChannel(guild, key) {
  const id = channelId(key);
  return id ? guild.channels.fetch(id).catch(() => null) : null;
}

export async function postQOTD(guild, custom) {
  const channel = await fetchChannel(guild, QOTD.channel);
  if (!channel) throw new Error(`QOTD channel "${QOTD.channel}" not set up. Run setup with --with-engagement.`);
  const s = store.ids();
  s.qotdCount = (s.qotdCount ?? 0) + 1;
  const question = custom || nextFromDeck('qotd', QUESTIONS);
  const embed = new EmbedBuilder()
    .setColor(COLORS.neon)
    .setTitle(`🌵 Dispatch from the Desert #${s.qotdCount}`)
    .setDescription(`**${question}**\n\n_Answer in the thread ⬇️_`);
  if (QOTD.withFact) embed.addFields({ name: '🦇 Gonzo fact of the day', value: randomFact() });
  const msg = await channel.send({ embeds: [embed] });
  await msg.startThread({ name: `QOTD #${s.qotdCount}`, autoArchiveDuration: 1440 }).catch(() => {});
  store.save();
  return msg;
}

// Checks once a minute; posts once per local day at/after QOTD.time.
export function startQOTD(guild) {
  if (!QOTD.enabled) return;
  const fmt = new Intl.DateTimeFormat('en-CA', { timeZone: QOTD.timeZone, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });
  const tick = async () => {
    const parts = Object.fromEntries(fmt.formatToParts(new Date()).map((p) => [p.type, p.value]));
    const today = `${parts.year}-${parts.month}-${parts.day}`;
    const now = `${parts.hour}:${parts.minute}`;
    const s = store.ids();
    if (s.qotdLastDate === today || now < QOTD.time) return;
    s.qotdLastDate = today;
    store.save();
    await postQOTD(guild).catch((e) => console.warn('[qotd]', e.message));
  };
  tick();
  setInterval(tick, 60_000);
}

export async function onFunCommand(i) {
  if (i.commandName === 'gonzo') {
    return i.reply({ embeds: [new EmbedBuilder().setColor(COLORS.desert).setTitle('🦇 Gonzo Fact').setDescription(randomFact())] });
  }

  if (i.commandName === 'qotd') {
    await i.deferReply(EPHEMERAL);
    const msg = await postQOTD(i.guild, i.options.getString('question'));
    return i.editReply(`🌵 Posted: ${msg.url}`);
  }

  if (i.commandName === 'confess') {
    if (!CONFESSIONS.enabled) return i.reply({ content: 'The confession booth is closed.', ...EPHEMERAL });
    const member = await i.guild.members.fetch(i.user.id);
    if (!isCitizen(member)) return i.reply({ content: '🚧 Finish the checkpoint first. Only Citizens get the booth.', ...EPHEMERAL });

    const s = store.ids();
    const last = (s.confessCooldown ??= {})[i.user.id] ?? 0;
    const wait = last + CONFESSIONS.cooldownMinutes * 60_000 - Date.now();
    if (wait > 0) return i.reply({ content: `🕯️ Easy, sinner. Next confession in ${Math.ceil(wait / 60_000)} min.`, ...EPHEMERAL });

    const channel = await fetchChannel(i.guild, CONFESSIONS.channel);
    if (!channel) return i.reply({ content: 'The booth isn\'t built yet. Tell staff to run setup with --with-engagement.', ...EPHEMERAL });

    await i.deferReply(EPHEMERAL);
    s.confessionCount = (s.confessionCount ?? 0) + 1;
    s.confessCooldown[i.user.id] = Date.now();
    const n = s.confessionCount;
    store.save();

    const text = i.options.getString('confession', true);
    const msg = await channel.send({
      embeds: [new EmbedBuilder().setColor(COLORS.blood).setTitle(`🕯️ Confession #${n}`).setDescription(text).setFooter({ text: 'Anonymous. Use /confess to unburden your own soul.' })],
      allowedMentions: { parse: [] },
    });
    if (CONFESSIONS.logAuthorToStaff) {
      await log(i.guild, `🕯️ Confession #${n} was sent by <@${i.user.id}> (${i.user.username}). ${msg.url}`);
    }
    return i.editReply(`🕯️ Confession #${n} is out in the world: ${msg.url}\n_Other members can't see it was you. Staff can, so nobody uses the booth to hurt people._`);
  }
}
