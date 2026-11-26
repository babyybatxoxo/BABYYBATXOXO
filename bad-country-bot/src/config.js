// ─────────────────────────────────────────────────────────────
//  BAD COUNTRY — every name, color, word and rule lives here.
//  Edit this file to change the vibe. Re-run `npm run setup`
//  afterwards and it will update things in place (it never deletes).
// ─────────────────────────────────────────────────────────────
import 'dotenv/config';

export const GUILD_ID = process.env.GUILD_ID || '1540905721879593030';
export const TOKEN = process.env.DISCORD_TOKEN;

export const MIN_AGE = 21;
// If someone types an age under MIN_AGE in their intro papers:
//   false → they are blocked and staff get pinged in the log (a human decides)
//   true  → they are kicked automatically
export const AUTO_KICK_UNDERAGE = false;

// Post a "fresh meat at the checkpoint" ping in the welcome channel on join,
// deleted automatically after this many minutes (0 = don't ping at all).
export const WELCOME_PING_MINUTES = 15;

export const COLORS = {
  desert: 0xe2711d, // burnt orange
  blood: 0xc1121f,
  neon: 0xff2e88,
  ether: 0x8ecae6,
  dust: 0x8a7f6a,
};

// ── Gate roles + staff ───────────────────────────────────────
export const ROLES = {
  drifter: {
    name: '🦇 Drifter',
    color: COLORS.dust,
    hoist: false,
    reason: 'Partially verified: can read the rules, introduce themselves, pick roles.',
  },
  citizen: {
    name: '🌵 Citizen of Bad Country',
    color: COLORS.desert,
    hoist: false,
    reason: 'Fully verified: the whole desert is theirs.',
  },
  attorney: {
    name: '⚖️ The Attorney',
    color: 0x3c6e71,
    hoist: true,
    reason: 'Moderators.',
    perms: ['ManageMessages', 'KickMembers', 'ModerateMembers', 'ManageNicknames', 'ViewAuditLog', 'MoveMembers', 'MuteMembers', 'ManageThreads'],
  },
  gonzo: {
    name: '🩺 Dr. Gonzo',
    color: COLORS.blood,
    hoist: true,
    reason: 'Admins (no raw Administrator flag on purpose).',
    perms: ['ManageGuild', 'ManageRoles', 'ManageChannels', 'ManageMessages', 'KickMembers', 'BanMembers', 'ModerateMembers', 'ManageNicknames', 'ViewAuditLog', 'MoveMembers', 'MuteMembers', 'ManageThreads', 'ManageWebhooks', 'ManageEvents', 'ManageGuildExpressions'],
  },
};

// ── Self-roles for #pick-your-poison ─────────────────────────
// `required: true` → must pick something here before becoming a Citizen.
// `single: true`   → only one choice allowed in that category.
export const ROLE_MENUS = [
  {
    key: 'pronouns',
    placeholder: '🪞 Pronouns — what do we call you?',
    required: true,
    single: false,
    options: [
      { label: 'he/him', emoji: '🦂', role: 'he/him' },
      { label: 'she/her', emoji: '🌹', role: 'she/her' },
      { label: 'they/them', emoji: '🌀', role: 'they/them' },
      { label: 'any/all', emoji: '✨', role: 'any/all' },
      { label: 'ask me', emoji: '❓', role: 'ask my pronouns' },
    ],
  },
  {
    key: 'dms',
    placeholder: '📬 DM status — consent is sexy, declare it',
    required: true,
    single: true,
    options: [
      { label: 'DMs open', emoji: '🟢', role: '🟢 DMs Open', description: 'Slide in. Be cool about it.' },
      { label: 'Ask first', emoji: '🟡', role: '🟡 Ask to DM', description: 'Ask in public before you DM.' },
      { label: 'DMs closed', emoji: '🔴', role: '🔴 DMs Closed', description: 'Do not. Seriously.' },
    ],
  },
  {
    key: 'poison',
    placeholder: '🧪 Your poison — pick your vices',
    required: false,
    single: false,
    options: [
      { label: 'Whiskey Priest', emoji: '🥃', role: '🥃 Whiskey Priest' },
      { label: 'Wine Gremlin', emoji: '🍷', role: '🍷 Wine Gremlin' },
      { label: 'Beer Goblin', emoji: '🍺', role: '🍺 Beer Goblin' },
      { label: 'Cocktail Chemist', emoji: '🍸', role: '🍸 Cocktail Chemist' },
      { label: 'Herbalist (where legal)', emoji: '🌿', role: '🌿 Herbalist' },
      { label: 'Caffeine Fiend', emoji: '☕', role: '☕ Caffeine Fiend' },
      { label: 'Sober & Still Unhinged', emoji: '🧃', role: '🧃 Sober & Unhinged' },
    ],
  },
  {
    key: 'region',
    placeholder: '🗺️ Where in the desert are you?',
    required: false,
    single: true,
    options: [
      { label: 'North America', emoji: '🌵', role: '🌵 North America' },
      { label: 'Latin America', emoji: '🌶️', role: '🌶️ Latin America' },
      { label: 'Europe', emoji: '🏰', role: '🏰 Europe' },
      { label: 'Africa / Middle East', emoji: '🐪', role: '🐪 Africa & Middle East' },
      { label: 'Asia / Oceania', emoji: '🌏', role: '🌏 Asia & Oceania' },
    ],
  },
  {
    key: 'pings',
    placeholder: '🔔 Pings — what can we wake you up for?',
    required: false,
    single: false,
    options: [
      { label: 'Announcements', emoji: '📣', role: '📣 Announcements' },
      { label: 'Events & game nights', emoji: '🎲', role: '🎲 Event Pings' },
      { label: 'VC hangouts', emoji: '🎙️', role: '🎙️ VC Pings' },
      { label: 'Dead of night chaos', emoji: '🌙', role: '🌙 3AM Club' },
    ],
  },
];

// ── The checkpoint (what Drifters can see) ───────────────────
export const CATEGORIES = {
  checkpoint: '🚧 THE CHECKPOINT',
  trunk: '🧳 THE TRUNK',
};

export const CHANNELS = {
  welcome: { name: '🦇┃welcome-to-bad-country', topic: "We can't stop here. This is Bad Country. Start here.", category: 'checkpoint' },
  rules: { name: '📜┃the-rules', topic: 'Read them sober. Or at least squint. Then sign at the bottom.', category: 'checkpoint' },
  intros: { name: '🪪┃who-are-you', topic: 'Papers, please. Every soul in the desert has filled these out.', category: 'checkpoint' },
  roles: { name: '🎭┃pick-your-poison', topic: 'Pronouns, DM status, vices, pings. Change them whenever.', category: 'checkpoint' },
  log: { name: '📓┃the-trunk-log', topic: 'Staff only. Joins, verifications, red flags.', category: 'trunk' },
};

// ── Words ────────────────────────────────────────────────────
export const TEXT = {
  welcome: {
    title: "🦇 We can't stop here. This is Bad Country.",
    body: [
      "You've crossed the county line, the radio's gone to static, and something with wings just hit the windshield. Welcome, Drifter.",
      '',
      "This is a **21+ only** joint. The desert is wide, the people are weird, and the rules are few but **non-negotiable**.",
      '',
      '**Before the whole place opens up to you, get your papers in order:**',
      '',
      '**1.** 📜 Read **the rules** and sign at the bottom (that\'s you swearing you\'re 21+).',
      '**2.** 🪪 Fill out your **who-are-you** papers. Takes two minutes. Be weird. Be honest.',
      '**3.** 🎭 **Pick your poison** — at minimum your pronouns and your DM status.',
      '',
      "Do all three and the bot hands you **🌵 Citizen of Bad Country** automatically. No waiting on a mod at 4am.",
      '',
      'Lost? Hit **"Where am I?"** below and it\'ll tell you exactly what\'s left.',
    ].join('\n'),
    footer: 'Buy the ticket, take the ride.',
  },

  rules: {
    title: '📜 The Rules of Bad Country',
    intro: "We are not a church. We are barely a functioning society. But even a desert full of lunatics has laws — and these ones get you **banned**, not lectured.",
    list: [
      ['1. 21+ or get out.', "No exceptions, no \"I'm basically 21.\" Lie about your age and you're gone forever. If you suspect someone is underage, tell a ⚖️ Attorney immediately."],
      ['2. Consent is the whole game.', "Respect DM roles. No unsolicited nudes, no unsolicited anything. \"No\" ends the conversation. Being drunk doesn't make you less responsible."],
      ['3. Nothing involving minors. Ever.', 'Not jokes, not "art," not "fiction." Instant ban and a report to Discord.'],
      ['4. No dealing, no sourcing.', 'Talk about your vices all you want. Buying, selling, trading or "who\'s got" anything = ban. We like this server existing.'],
      ['5. Keep the spicy stuff where it belongs.', 'NSFW only in channels marked NSFW. Lewd profile pics/names get changed or removed.'],
      ["6. Don't be a menace to actual people.", 'Unhinged is the brand. Cruel is not. No hate speech, slurs aimed at people, harassment, stalking, or dogpiling.'],
      ['7. No doxxing, no leaking.', "Don't post anyone's real info, faces, or screenshots of private convos without consent."],
      ['8. No spam, no self-promo raids.', 'Ask a mod before advertising. Scam links = instant ban.'],
      ['9. Discord\'s rules still apply.', 'Terms of Service + Community Guidelines. We don\'t make exceptions they wouldn\'t.'],
      ['10. Confessions are anonymous, not lawless.', 'Other members never see who sent a /confess. Staff can, so nobody uses the booth to out, threaten or harass anyone.'],
      ['11. The Attorney has the final word.', "Mods make the call. Disagree? Take it to DMs with staff calmly — not to the main chat at full volume."],
    ],
    outro: 'By clicking below you swear — on whatever you hold sacred, even if it\'s just the bottle — that **you are 21 years of age or older** and you\'ll follow these rules.',
    button: "🦇 I'm 21+ and I accept the rules",
  },

  intros: {
    title: '🪪 Who Are You?',
    body: [
      "Every soul in Bad Country has filled these out. Your turn.",
      '',
      'Smash the button, fill in the form, and your papers get posted here for the whole desert to read (and welcome you in the thread).',
      '',
      '**The template:**',
      '> 🏷️ **What do we call you?**',
      '> 🎂 **Age** (21+, we check)',
      '> 🗺️ **Pronouns & where you\'re hiding out**',
      '> 🥃 **Your poison & what dragged you here**',
      '> 🦎 **Tell us something weird about yourself**',
      '',
      'Made a typo or became a different person? Hit the button again — it edits your existing papers.',
    ].join('\n'),
    button: '🪪 Fill out my papers',
    modalTitle: 'Bad Country — Papers, Please',
    fields: [
      { id: 'name', label: 'What do we call you?', style: 'short', max: 64, placeholder: 'Raoul, Doc, Lizard Queen, whatever', required: true },
      { id: 'age', label: 'Age (21+ only — numbers please)', style: 'short', max: 3, placeholder: '27', required: true },
      { id: 'where', label: "Pronouns & where you're hiding out", style: 'short', max: 100, placeholder: 'she/her • somewhere outside Barstow', required: true },
      { id: 'poison', label: 'Your poison & what dragged you here', style: 'paragraph', max: 500, placeholder: 'Mezcal, bad decisions, a friend who swore this place was "chill"', required: true },
      { id: 'weird', label: 'Tell us something weird about yourself', style: 'paragraph', max: 700, placeholder: 'I have opinions about reptiles that no one asked for…', required: true },
    ],
    postTitle: (name) => `🪪 Papers filed: ${name}`,
    threadName: (name) => `welcome ${name}`.slice(0, 90),
  },

  roles: {
    title: '🎭 Pick Your Poison',
    body: [
      'Use the menus below. You can come back and change these any time.',
      '',
      '**Required for Citizenship:** 🪞 pronouns + 📬 DM status.',
      'Everything else is just for fun (and so we know who to ping at 3am).',
      '',
      '_Pick nothing in a menu to clear it._',
    ].join('\n'),
  },

  verified: (mention) =>
    `🌵 **${mention} has been granted Citizenship of Bad Country.** The whole desert is open. Hydrate. Or don't. We're not your mother.`,
  underage: `🚫 Bad Country is **21+ only**. If you mistyped, try again. If you didn't — this place isn't for you yet. Come back when you're legal to drink in the US.`,
};

// ── Engagement channels — PROPOSED, NOT CREATED until approved ─
// Flip `approved: true` on the ones you want, then run:
//   npm run setup -- --with-engagement
export const ENGAGEMENT = {
  categories: {
    strip: '🌵 THE STRIP',
    afterhours: '🌙 AFTER HOURS (NSFW)',
    voice: '🦈 THE RED SHARK',
  },
  channels: [
    { approved: false, category: 'strip', name: '🏨┃flamingo-lobby', topic: 'Main chat. The lobby is full of reptiles. Ignore them.' },
    { approved: true, key: 'main', category: 'strip', name: '🦎┃lizard-lounge', topic: 'Main chat. Memes, cursed images, things you saw at 3am. Daily QOTD + confessions land here.' },
    { approved: false, category: 'strip', name: '🥃┃the-bar-tab', topic: "What are you drinking/smoking tonight? (Talk, don't source.)" },
    { approved: true, category: 'strip', name: '📸┃polaroids', topic: 'Selfies, pets, your view. Only post people who consented.' },
    { approved: false, category: 'strip', name: '📻┃red-shark-radio', topic: 'Music. Drop what you have on repeat.' },
    { approved: false, category: 'strip', name: '📝┃gonzo-journal', topic: 'Long-form rants, stories, trip reports, 3am thoughts. First person, full send.' },
    { approved: false, category: 'strip', name: '🧯┃dumpster-fire', topic: 'Vent. Rage. Unload. Be gentle with each other in here.' },
    { approved: false, category: 'strip', name: '🗓️┃fear-and-loathing-nights', topic: 'Events, game nights, watch parties.' },
    { approved: false, category: 'afterhours', name: '🔥┃after-hours', topic: 'Spicy talk. Consent rules apply double in here.', nsfw: true },
    { approved: false, category: 'afterhours', name: '💋┃thirst-traps', topic: 'Spicy pics of YOURSELF only. Consenting adults only.', nsfw: true },
    { approved: false, category: 'voice', name: '🦈 The Red Shark', voice: true },
    { approved: true, category: 'voice', name: '🏨 Suite 1850', voice: true },
  ],
};

// ── Fun stuff (see src/fun.js for the question + fact lists) ──
// Channel keys: 'main' = the main chat (🦎 lizard-lounge).
export const QOTD = {
  enabled: true,
  channel: 'main',
  time: '21:00',                    // 24h clock…
  timeZone: 'America/Los_Angeles',  // …in Vegas time. Change to yours.
  withFact: true,                   // tack a Gonzo fact onto each daily post
};

export const CONFESSIONS = {
  enabled: true,
  channel: 'main',
  cooldownMinutes: 10,
  // Staff can see who wrote each confession (in the trunk log) so nobody can
  // use anonymity to harass, out, or threaten people. Members are told this.
  logAuthorToStaff: true,
};
