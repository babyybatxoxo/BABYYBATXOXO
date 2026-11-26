// One-shot provisioning over Discord's REST API (no live gateway connection,
// so it can run from anywhere). Safe to re-run: it finds things by saved ID or
// by name, updates them in place, and NEVER deletes anything.
//
//   npm run setup                         → roles, checkpoint, panels, lock-down
//   npm run setup -- --with-engagement    → also create approved ENGAGEMENT channels
//   npm run setup -- --no-grandfather     → don't auto-verify people already in the server
//   npm run setup -- --fix-leaks          → strip "@everyone can view" overrides from old channels
//   npm run setup -- --dry-run            → just report what it sees, change nothing
import { REST, Routes, ChannelType, PermissionFlagsBits as P } from 'discord.js';
import { TOKEN, GUILD_ID, ROLES, ROLE_MENUS, CATEGORIES, CHANNELS, ENGAGEMENT } from './config.js';
import { welcomePanel, rulesPanel, introPanel, rolesPanel } from './panels.js';
import * as store from './store.js';

const args = new Set(process.argv.slice(2));
const DRY = args.has('--dry-run');
const say = (...m) => console.log('•', ...m);

if (!TOKEN) {
  console.error('No DISCORD_TOKEN. Copy .env.example to .env and paste your bot token in.');
  process.exit(1);
}

const api = new REST({ version: '10' }).setToken(TOKEN);
const ROLE = 0;
const MEMBER = 1;
const bits = (list) => String((list ?? []).reduce((a, b) => a | b, 0n));
const ow = (id, type, allow = [], deny = []) => ({ id, type, allow: bits(allow), deny: bits(deny) });
// Builders → plain JSON for the API.
const json = (x) => JSON.parse(JSON.stringify(x, (_k, v) => (v && typeof v.toJSON === 'function' ? v.toJSON() : v)));

let roles = [];
let channels = [];

async function ensureRole(key, spec, botTop) {
  const ids = store.ids().roles;
  let role = roles.find((r) => r.id === ids[key]) || roles.find((r) => r.name === spec.name);
  const body = {
    name: spec.name,
    color: spec.color ?? 0,
    hoist: spec.hoist ?? false,
    mentionable: false,
    permissions: bits((spec.perms ?? []).map((p) => P[p])),
  };
  if (DRY) { say(role ? 'role exists' : 'would create role', spec.name); return role; }
  if (!role) {
    role = await api.post(Routes.guildRoles(GUILD_ID), { body, reason: spec.reason ?? 'Bad Country setup' });
    roles.push(role);
    say('created role', spec.name);
  } else if (role.position < botTop) {
    role = await api.patch(Routes.guildRole(GUILD_ID, role.id), { body, reason: 'Bad Country setup' });
    say('updated role', spec.name);
  } else say(`⚠️ can't edit role "${spec.name}" — it's above the bot's role`);
  ids[key] = role.id;
  return role;
}

async function ensureChannel(key, spec, parentId, overwrites, type = ChannelType.GuildText) {
  const ids = store.ids().channels;
  let ch = channels.find((c) => c.id === ids[key]) || channels.find((c) => c.name === spec.name && c.type === type);
  const body = {
    name: spec.name,
    ...(type === ChannelType.GuildText ? { topic: spec.topic ?? null, nsfw: Boolean(spec.nsfw) } : {}),
    ...(parentId ? { parent_id: parentId } : {}),
    permission_overwrites: overwrites,
  };
  if (DRY) { say(ch ? 'channel exists' : 'would create channel', spec.name); return ch; }
  const label = type === ChannelType.GuildCategory ? 'category' : 'channel';
  if (!ch) {
    ch = await api.post(Routes.guildChannels(GUILD_ID), { body: { ...body, type }, reason: 'Bad Country setup' });
    channels.push(ch);
    say('created', label, spec.name);
  } else {
    ch = await api.patch(Routes.channel(ch.id), { body, reason: 'Bad Country setup' });
    say('updated', label, spec.name);
  }
  ids[key] = ch.id;
  return ch;
}

async function postPanel(channel, key, payload) {
  if (DRY || !channel) return;
  const msgs = store.ids().messages;
  const body = json(payload);
  const existing = msgs[key] && (await api.get(Routes.channelMessage(channel.id, msgs[key])).catch(() => null));
  if (existing) {
    await api.patch(Routes.channelMessage(channel.id, existing.id), { body });
    say('refreshed panel', key);
  } else {
    const m = await api.post(Routes.channelMessages(channel.id), { body });
    await api.put(Routes.channelPin(channel.id, m.id)).catch(() => {});
    msgs[key] = m.id;
    say('posted panel', key);
  }
}

async function main() {
  const me = await api.get(Routes.user('@me'));
  const guild = await api.get(Routes.guild(GUILD_ID));
  roles = guild.roles;
  channels = await api.get(Routes.guildChannels(GUILD_ID));
  const meMember = await api.get(Routes.guildMember(GUILD_ID, me.id));
  say(`logged in as ${me.username} → "${guild.name}"`, DRY ? '(DRY RUN)' : '');

  // Bot's effective permissions + highest role.
  const myRoles = roles.filter((r) => meMember.roles.includes(r.id) || r.id === GUILD_ID);
  const perms = myRoles.reduce((a, r) => a | BigInt(r.permissions), 0n);
  const botTop = Math.max(...myRoles.map((r) => r.position));
  const isAdmin = (perms & P.Administrator) === P.Administrator;
  const needed = ['ManageRoles', 'ManageChannels', 'ManageMessages', 'ViewChannel', 'SendMessages', 'EmbedLinks', 'CreatePublicThreads'];
  const missing = needed.filter((p) => !isAdmin && (perms & P[p]) !== P[p]);
  if (missing.length) throw new Error(`Bot is missing permissions: ${missing.join(', ')}. Easiest fix: give the bot's role Administrator while setup runs.`);

  // 1 ── Roles (top-down so the role list reads right).
  const r = {};
  for (const key of ['gonzo', 'attorney', 'citizen', 'drifter']) r[key] = await ensureRole(key, ROLES[key], botTop);
  for (const menu of ROLE_MENUS) for (const o of menu.options) await ensureRole(o.role, { name: o.role, reason: `Self-role (${menu.key})` }, botTop);

  if (DRY) {
    for (const c of Object.values(CHANNELS)) say(channels.some((x) => x.name === c.name) ? 'channel exists' : 'would create channel', c.name);
    const leaks = channels.filter((c) => (c.permission_overwrites ?? []).some((o) => o.id === GUILD_ID && (BigInt(o.allow) & P.ViewChannel)));
    say(`${leaks.length} channel(s) explicitly let @everyone view:`, leaks.map((c) => c.name).join(', ') || 'none');
    say(`bot role position ${botTop}, admin: ${isAdmin}`);
    return;
  }
  store.save();

  // Sit the gate + staff roles just under the bot so it can always assign them.
  await api.patch(Routes.guildRoles(GUILD_ID), {
    body: [
      { id: r.gonzo.id, position: Math.max(1, botTop - 1) },
      { id: r.attorney.id, position: Math.max(1, botTop - 2) },
      { id: r.citizen.id, position: Math.max(1, botTop - 3) },
      { id: r.drifter.id, position: Math.max(1, botTop - 4) },
    ],
    reason: 'Bad Country setup',
  }).catch((e) => say('⚠️ could not reorder roles (drag them under the bot by hand):', e.message));

  // 2 ── Grandfather everyone already here BEFORE locking, so nobody gets locked out.
  if (!args.has('--no-grandfather')) {
    let after = '0';
    let n = 0;
    for (;;) {
      const page = await api.get(Routes.guildMembers(GUILD_ID), { query: new URLSearchParams({ limit: '1000', after }) });
      if (!page.length) break;
      for (const m of page) {
        if (m.user.bot || m.roles.includes(r.citizen.id) || m.roles.includes(r.drifter.id)) continue;
        await api.put(Routes.guildMemberRole(GUILD_ID, m.user.id, r.citizen.id), { reason: 'Bad Country setup: grandfathered existing member' })
          .then(() => {
            const rec = store.member(m.user.id);
            rec.verifiedAt = Date.now();
            rec.grandfathered = true;
            n++;
          })
          .catch((e) => say(`⚠️ ${m.user.username}: ${e.message}`));
      }
      after = page[page.length - 1].user.id;
      if (page.length < 1000) break;
    }
    store.save();
    say(`grandfathered ${n} existing member(s) as 🌵 Citizens`);
  }

  // 2b ── Lock the doors. @everyone can't see channels; Citizens can.
  const everyone = roles.find((x) => x.id === GUILD_ID);
  await api.patch(Routes.guildRole(GUILD_ID, GUILD_ID), { body: { permissions: String(BigInt(everyone.permissions) & ~P.ViewChannel) }, reason: 'Bad Country: gate the server' });
  await api.patch(Routes.guildRole(GUILD_ID, r.citizen.id), { body: { permissions: String(BigInt(r.citizen.permissions) | P.ViewChannel) }, reason: 'Bad Country: citizens see everything' });
  say('@everyone can no longer see channels by default; 🌵 Citizens can');

  // 3 ── Checkpoint + staff channels.
  const bot = ow(me.id, MEMBER, [P.ViewChannel, P.SendMessages, P.EmbedLinks, P.ReadMessageHistory, P.ManageMessages, P.CreatePublicThreads, P.SendMessagesInThreads, P.ManageThreads]);
  const hideAll = ow(GUILD_ID, ROLE, [], [P.ViewChannel]);
  const readOnlyFor = (role) => ow(role.id, ROLE, [P.ViewChannel, P.ReadMessageHistory], [P.SendMessages, P.CreatePublicThreads, P.CreatePrivateThreads, P.AddReactions]);
  const staff = [r.gonzo, r.attorney].map((role) => ow(role.id, ROLE, [P.ViewChannel, P.SendMessages, P.ReadMessageHistory, P.ManageMessages]));

  const checkpointOW = [hideAll, readOnlyFor(r.drifter), readOnlyFor(r.citizen), ...staff, bot];
  const cat = await ensureChannel('cat_checkpoint', { name: CATEGORIES.checkpoint }, null, checkpointOW, ChannelType.GuildCategory);
  const trunkOW = [hideAll, ow(r.citizen.id, ROLE, [], [P.ViewChannel]), ...staff, bot];
  const trunk = await ensureChannel('cat_trunk', { name: CATEGORIES.trunk }, null, trunkOW, ChannelType.GuildCategory);

  const ch = {};
  for (const key of ['welcome', 'rules', 'roles']) ch[key] = await ensureChannel(key, CHANNELS[key], cat.id, checkpointOW);
  const introOW = [
    hideAll,
    readOnlyFor(r.drifter),
    ow(r.citizen.id, ROLE, [P.ViewChannel, P.ReadMessageHistory, P.AddReactions, P.SendMessagesInThreads], [P.SendMessages, P.CreatePublicThreads]),
    ...staff, bot,
  ];
  ch.intros = await ensureChannel('intros', CHANNELS.intros, cat.id, introOW);
  ch.log = await ensureChannel('log', CHANNELS.log, trunk.id, trunkOW);
  store.save();

  // 4 ── Panels.
  await postPanel(ch.welcome, 'welcome', welcomePanel());
  await postPanel(ch.rules, 'rules', rulesPanel());
  await postPanel(ch.intros, 'intros', introPanel());
  await postPanel(ch.roles, 'roles', rolesPanel());
  store.save();

  // 5 ── Engagement channels (only the approved ones in config.js).
  if (args.has('--with-engagement')) {
    const approved = ENGAGEMENT.channels.filter((c) => c.approved);
    if (!approved.length) say('no engagement channels are approved yet — flip `approved: true` in config.js');
    const catOW = [hideAll, ow(r.citizen.id, ROLE, [P.ViewChannel]), ...staff, bot];
    const cats = {};
    for (const c of approved) {
      cats[c.category] ??= await ensureChannel(`cat_${c.category}`, { name: ENGAGEMENT.categories[c.category] }, null, catOW, ChannelType.GuildCategory);
      // readOnly → only the bot posts; Citizens read, react and reply in threads.
      const chOW = c.readOnly
        ? [hideAll, ow(r.citizen.id, ROLE, [P.ViewChannel, P.ReadMessageHistory, P.AddReactions, P.SendMessagesInThreads], [P.SendMessages, P.CreatePublicThreads, P.CreatePrivateThreads]), ...staff, bot]
        : catOW; // same as the category = "synced"
      await ensureChannel(c.key ?? `eng_${c.name}`, c, cats[c.category].id, chOW, c.voice ? ChannelType.GuildVoice : ChannelType.GuildText);
    }
    store.save();
  }

  // 6 ── Leak check: old channels that explicitly let @everyone in.
  const leaks = channels.filter((c) => (c.permission_overwrites ?? []).some((o) => o.id === GUILD_ID && (BigInt(o.allow) & P.ViewChannel)));
  if (leaks.length) {
    say(`⚠️ ${leaks.length} channel(s) explicitly allow @everyone to view (they bypass the gate):`);
    for (const c of leaks) {
      say(`   - ${c.name}`);
      if (args.has('--fix-leaks')) {
        const o = c.permission_overwrites.find((x) => x.id === GUILD_ID);
        await api.put(Routes.channelPermission(c.id, GUILD_ID), {
          body: { type: ROLE, allow: String(BigInt(o.allow) & ~P.ViewChannel), deny: o.deny },
          reason: 'Bad Country gate',
        });
        say('     fixed');
      }
    }
    if (!args.has('--fix-leaks')) say('   re-run with --fix-leaks to close them (only if they should be Citizen-only)');
  }

  say('done. Now start the bot (`npm start` or `docker compose up -d`) and leave it running. 🦇');
}

main().catch((err) => {
  console.error('✖ setup failed:', err.message);
  process.exitCode = 1;
});
