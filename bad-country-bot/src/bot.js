// The always-on gatekeeper. Run with `npm start` and leave it running.
import {
  Client, GatewayIntentBits, Events, MessageFlags, SlashCommandBuilder, PermissionFlagsBits as P,
} from 'discord.js';
import { TOKEN, GUILD_ID, MIN_AGE, AUTO_KICK_UNDERAGE, WELCOME_PING_MINUTES, ROLE_MENUS, TEXT, COLORS } from './config.js';
import { IDS, introModal, introPost, welcomePanel, rulesPanel, introPanel, rolesPanel } from './panels.js';
import { roleId, channelId, checklist, maybePromote, onJoin, log } from './gate.js';
import * as store from './store.js';
import { funCommands, onFunCommand, startQOTD } from './fun.js';

if (!TOKEN) {
  console.error('No DISCORD_TOKEN. Copy .env.example to .env and paste your bot token in.');
  process.exit(1);
}
if (!store.ids().roles.citizen) {
  console.error('No saved roles found. Run `npm run setup` first.');
  process.exit(1);
}

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers] });
const EPHEMERAL = { flags: MessageFlags.Ephemeral };

// ── Slash commands for staff ─────────────────────────────────
const commands = [
  new SlashCommandBuilder()
    .setName('checkpoint')
    .setDescription('Bad Country gate controls (staff)')
    .setDefaultMemberPermissions(P.ManageRoles)
    .setDMPermission(false)
    .addSubcommand((s) => s.setName('status').setDescription("See someone's checkpoint progress")
      .addUserOption((o) => o.setName('user').setDescription('Who').setRequired(true)))
    .addSubcommand((s) => s.setName('pass').setDescription('Wave someone through: make them a Citizen now')
      .addUserOption((o) => o.setName('user').setDescription('Who').setRequired(true)))
    .addSubcommand((s) => s.setName('reset').setDescription('Send someone back to the checkpoint as a Drifter')
      .addUserOption((o) => o.setName('user').setDescription('Who').setRequired(true)))
    .addSubcommand((s) => s.setName('panels').setDescription('Re-post/refresh the checkpoint panels from config')),
].map((c) => c.toJSON()).concat(funCommands);

client.once(Events.ClientReady, async () => {
  const guild = await client.guilds.fetch(GUILD_ID);
  await guild.commands.set(commands);
  startQOTD(guild);
  console.log(`🦇 ${client.user.tag} is guarding the checkpoint of "${guild.name}"`);
});

// ── Arrivals ─────────────────────────────────────────────────
client.on(Events.GuildMemberAdd, async (member) => {
  if (member.guild.id !== GUILD_ID || member.user.bot) return;
  try {
    const kind = await onJoin(member);
    if (kind === 'drifter' && WELCOME_PING_MINUTES > 0 && channelId('welcome')) {
      const ch = await member.guild.channels.fetch(channelId('welcome')).catch(() => null);
      const msg = await ch?.send(`🦇 <@${member.id}> just drifted in off the highway. Your papers start right here ⬆️`);
      if (msg) setTimeout(() => msg.delete().catch(() => {}), WELCOME_PING_MINUTES * 60_000);
    }
  } catch (e) {
    console.error('[join]', e);
  }
});

// If a mod hands out Citizen by hand, clean up the Drifter role.
client.on(Events.GuildMemberUpdate, async (_old, member) => {
  if (member.guild.id !== GUILD_ID) return;
  if (member.roles.cache.has(roleId('citizen')) && member.roles.cache.has(roleId('drifter'))) {
    await member.roles.remove(roleId('drifter'), 'Became a Citizen').catch(() => {});
  }
});

// ── Buttons, menus, forms, commands ──────────────────────────
client.on(Events.InteractionCreate, async (i) => {
  if (!i.inGuild() || i.guildId !== GUILD_ID) return;
  try {
    if (i.isButton()) return await onButton(i);
    if (i.isStringSelectMenu() && i.customId.startsWith('roles:')) return await onRoleMenu(i);
    if (i.isModalSubmit() && i.customId === IDS.modal) return await onIntroSubmit(i);
    if (i.isChatInputCommand() && i.commandName === 'checkpoint') return await onCommand(i);
    if (i.isChatInputCommand()) return await onFunCommand(i);
  } catch (e) {
    console.error('[interaction]', e);
    const reply = { content: '🌀 Something went sideways in the desert. Try again, or poke a ⚖️ Attorney.', ...EPHEMERAL };
    if (i.deferred || i.replied) await i.followUp(reply).catch(() => {});
    else await i.reply(reply).catch(() => {});
  }
});

async function freshMember(i) {
  return i.guild.members.fetch({ user: i.user.id, force: true });
}

async function onButton(i) {
  const member = await freshMember(i);
  const rec = store.member(member.id);

  if (i.customId === IDS.status) {
    return i.reply({ content: checklist(member), ...EPHEMERAL });
  }

  if (i.customId === IDS.accept) {
    if (!rec.rulesAt) {
      rec.rulesAt = Date.now();
      store.save();
      await log(i.guild, `📜 <@${member.id}> signed the rules (swore 21+).`);
    }
    await i.deferReply(EPHEMERAL);
    const promoted = await maybePromote(member);
    return i.editReply(promoted
      ? TEXT.verified('You')
      : `📜 Signed in blood (metaphorically). Noted that you swear you're **${MIN_AGE}+**.\n\n${checklist(await freshMember(i))}`);
  }

  if (i.customId === IDS.intro) {
    if (rec.blockedUnderage) {
      return i.reply({ content: '🚫 Your papers are on hold with staff. A ⚖️ Attorney will sort it out.', ...EPHEMERAL });
    }
    return i.showModal(introModal(rec.intro?.answers));
  }
}

async function onRoleMenu(i) {
  const menu = ROLE_MENUS.find((m) => i.customId === IDS.menu(m.key));
  if (!menu) return;
  await i.deferReply(EPHEMERAL);
  let member = await freshMember(i);

  const all = menu.options.map((o) => roleId(o.role)).filter(Boolean);
  const want = new Set(i.values.map((v) => roleId(menu.options[Number(v)]?.role)).filter(Boolean));
  const toAdd = [...want].filter((id) => !member.roles.cache.has(id));
  const toRemove = all.filter((id) => !want.has(id) && member.roles.cache.has(id));
  if (toAdd.length) member = await member.roles.add(toAdd, `Self-roles: ${menu.key}`);
  if (toRemove.length) member = await member.roles.remove(toRemove, `Self-roles: ${menu.key}`);

  const picked = menu.options.filter((_, idx) => i.values.includes(String(idx))).map((o) => `${o.emoji} ${o.label}`);
  const promoted = await maybePromote(member);
  const head = picked.length ? `🎭 Got it: ${picked.join(', ')}` : `🎭 Cleared your ${menu.key} roles.`;
  return i.editReply(promoted ? `${head}\n\n${TEXT.verified('You')}` : `${head}\n\n${checklist(await freshMember(i))}`);
}

async function onIntroSubmit(i) {
  await i.deferReply(EPHEMERAL);
  const member = await freshMember(i);
  const rec = store.member(member.id);
  const a = {};
  for (const f of TEXT.intros.fields) a[f.id] = i.fields.getTextInputValue(f.id).trim();

  // Age check. Anything that isn't a plain number 21–120 is rejected.
  const age = /^\d{1,3}$/.test(a.age) ? Number(a.age) : NaN;
  if (!Number.isFinite(age) || age > 120) {
    return i.editReply(`🔢 Age needs to be a plain number, like \`27\`. Try again.`);
  }
  if (age < MIN_AGE) {
    rec.blockedUnderage = { typed: a.age, at: Date.now() };
    store.save();
    await log(i.guild, `🚨 **UNDERAGE FLAG** — <@${member.id}> (${member.user.username}) typed age **${a.age}** in their papers. ${AUTO_KICK_UNDERAGE ? 'Auto-kicked.' : 'Blocked from verifying. Use `/checkpoint reset` to clear if it was a typo.'}`, COLORS.blood);
    await i.editReply(TEXT.underage);
    if (AUTO_KICK_UNDERAGE) await member.kick(`Stated age ${a.age} (< ${MIN_AGE})`).catch(() => {});
    return;
  }

  const channel = await i.guild.channels.fetch(channelId('intros'));
  const payload = { content: `<@${member.id}>`, embeds: [introPost(member, a)], allowedMentions: { users: [] } };
  let message = rec.intro?.messageId && (await channel.messages.fetch(rec.intro.messageId).catch(() => null));
  let edited = false;
  if (message) { await message.edit(payload); edited = true; }
  else {
    message = await channel.send(payload);
    const thread = await message.startThread({ name: TEXT.intros.threadName(a.name), autoArchiveDuration: 10080 }).catch(() => null);
    rec.intro = { ...(rec.intro || {}), threadId: thread?.id };
  }
  rec.intro = { ...(rec.intro || {}), messageId: message.id, answers: a, at: Date.now() };
  store.save();
  await log(i.guild, `🪪 <@${member.id}> ${edited ? 'updated' : 'filed'} their papers (stated age ${age}). ${message.url}`);

  const promoted = await maybePromote(member);
  return i.editReply(promoted
    ? `🪪 Papers ${edited ? 'updated' : 'filed'}: ${message.url}\n\n${TEXT.verified('You')}`
    : `🪪 Papers ${edited ? 'updated' : 'filed'}: ${message.url}\n\n${checklist(await freshMember(i))}`);
}

async function onCommand(i) {
  const sub = i.options.getSubcommand();
  await i.deferReply(EPHEMERAL);

  if (sub === 'panels') {
    const plan = [['welcome', welcomePanel], ['rules', rulesPanel], ['intros', introPanel], ['roles', rolesPanel]];
    for (const [key, build] of plan) {
      const ch = await i.guild.channels.fetch(channelId(key));
      const msgs = store.ids().messages;
      const old = msgs[key] && (await ch.messages.fetch(msgs[key]).catch(() => null));
      if (old) await old.edit(build());
      else { const m = await ch.send(build()); await m.pin().catch(() => {}); msgs[key] = m.id; }
    }
    store.save();
    return i.editReply('🔁 Panels refreshed from config.');
  }

  const user = i.options.getUser('user', true);
  const member = await i.guild.members.fetch(user.id).catch(() => null);
  if (!member) return i.editReply("That person isn't in the server.");
  const rec = store.member(member.id);

  if (sub === 'status') {
    const extra = [
      rec.blockedUnderage ? `🚨 underage flag: typed "${rec.blockedUnderage.typed}"` : null,
      rec.intro?.answers?.age ? `stated age: ${rec.intro.answers.age}` : null,
      rec.grandfathered ? 'grandfathered at setup' : null,
    ].filter(Boolean).join(' • ');
    return i.editReply(`**${member.user.username}**\n${checklist(member)}${extra ? `\n_${extra}_` : ''}`);
  }

  if (sub === 'pass') {
    await member.roles.add(roleId('citizen'), `Waved through by ${i.user.username}`);
    if (member.roles.cache.has(roleId('drifter'))) await member.roles.remove(roleId('drifter')).catch(() => {});
    rec.verifiedAt = Date.now();
    delete rec.blockedUnderage;
    store.save();
    await log(i.guild, `🛂 <@${i.user.id}> waved <@${member.id}> through to Citizen.`, COLORS.desert);
    return i.editReply(`🌵 ${member.user.username} is now a Citizen.`);
  }

  if (sub === 'reset') {
    await member.roles.remove(roleId('citizen'), `Reset by ${i.user.username}`).catch(() => {});
    await member.roles.add(roleId('drifter'), `Reset by ${i.user.username}`);
    // Wipe the signature + any underage flag; keep their intro post and roles.
    delete rec.rulesAt;
    delete rec.verifiedAt;
    delete rec.blockedUnderage;
    store.save();
    await log(i.guild, `↩️ <@${i.user.id}> sent <@${member.id}> back to the checkpoint.`);
    return i.editReply(`↩️ ${member.user.username} is a Drifter again: they need to re-sign the rules (intro + roles are kept, edit if needed).`);
  }
}

client.login(TOKEN);
