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
import { TOKEN, GUILD_ID, ROLES, ROLE_MENUS, CATEGORIES, CHANNELS, ENGAGEMENT, NSFW_GATE } from './config.js';
import { welcomePanel, rulesPanel, introPanel, rolesPanel, ROLE_PAGES } from './panels.js';
import * as store from './store.js';
import { restAgent } from './proxy.js';

const args = new Set(process.argv.slice(2));
const DRY = args.has('--dry-run');
const say = (...m) => console.log('•', ...m);

if (!TOKEN) {
  console.error('No DISCORD_TOKEN. Copy .env.example to .env and paste your bot token in.');
  process.exit(1);
}

const api = new REST({ version: '10', ...(restAgent ? { agent: restAgent } : {}) }).setToken(TOKEN);
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
  } else if (!spec.manage) {
    say('using existing role', spec.name);
  } else if (role.position < botTop) {
    role = await api.patch(Routes.guildRole(GUILD_ID, role.id), { body, reason: 'Bad Country setup' });
    say('updated role', spec.name);
  } else say(`⚠️ can't edit role "${spec.name}" — it's above the bot's role`);
  ids[key] = role.id;
  return role;
}

// opts.keepName → don't rename an existing channel. overwrites === undefined →
// leave its permissions alone (new channels then follow their category).
async function ensureChannel(key, spec, parentId, overwrites, type = ChannelType.GuildText, opts = {}) {
  const ids = store.ids().channels;
  let ch = channels.find((c) => c.id === (spec.id ?? ids[key])) || channels.find((c) => c.name === spec.name && c.type === type);
  const renaming = !(ch && opts.keepName);
  const body = {
    ...(renaming ? { name: spec.name } : {}),
    ...(type === ChannelType.GuildText && spec.topic !== undefined ? { topic: spec.topic, nsfw: Boolean(spec.nsfw) } : {}),
    ...(parentId ? { parent_id: parentId } : {}),
    ...(overwrites !== undefined ? { permission_overwrites: overwrites } : {}),
  };
  const label = type === ChannelType.GuildCategory ? 'category' : 'channel';
  const shown = ch && !renaming ? ch.name : spec.name;
  if (DRY) { say(ch ? `would update ${label}` : `would create ${label}`, ch && ch.name !== spec.name && renaming ? `${ch.name} → ${spec.name}` : shown); return ch; }
  if (!ch) {
    ch = await api.post(Routes.guildChannels(GUILD_ID), { body: { ...body, name: spec.name, type }, reason: 'Bad Country setup' });
    channels.push(ch);
    say('created', label, spec.name);
  } else {
    const before = ch.name;
    ch = await api.patch(Routes.channel(ch.id), { body, reason: 'Bad Country setup' });
    say('updated', label, before !== ch.name ? `${before} → ${ch.name}` : ch.name);
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
  for (const key of ['gonzo', 'attorney', 'citizen', 'drifter']) r[key] = await ensureRole(key, { ...ROLES[key], manage: true }, botTop);
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
  const cat = await ensureChannel('cat_checkpoint', CATEGORIES.checkpoint, null, checkpointOW, ChannelType.GuildCategory, { keepName: true });
  const trunkOW = [hideAll, ow(r.citizen.id, ROLE, [], [P.ViewChannel]), ...staff, bot];
  const trunk = await ensureChannel('cat_trunk', CATEGORIES.trunk, null, trunkOW, ChannelType.GuildCategory);

  const ch = {};
  for (const key of ['welcome', 'rules', 'roles']) ch[key] = await ensureChannel(key, CHANNELS[key], cat.id, checkpointOW, ChannelType.GuildText, { keepName: true });
  const introOW = [
    hideAll,
    readOnlyFor(r.drifter),
    ow(r.citizen.id, ROLE, [P.ViewChannel, P.ReadMessageHistory, P.AddReactions, P.SendMessagesInThreads], [P.SendMessages, P.CreatePublicThreads]),
    ...staff, bot,
  ];
  ch.intros = await ensureChannel('intros', CHANNELS.intros, cat.id, introOW, ChannelType.GuildText, { keepName: true });
  ch.log = await ensureChannel('log', CHANNELS.log, trunk.id, trunkOW);
  store.save();

  // 4 ── Panels.
  await postPanel(ch.welcome, 'welcome', welcomePanel());
  await postPanel(ch.rules, 'rules', rulesPanel());
  await postPanel(ch.intros, 'intros', introPanel());
  for (let pg = 0; pg < ROLE_PAGES; pg++) await postPanel(ch.roles, pg ? `roles${pg + 1}` : 'roles', rolesPanel(pg));
  store.save();

  // 5 ── Engagement channels (only the approved ones in config.js).
  if (args.has('--with-engagement')) {
    const approved = ENGAGEMENT.channels.filter((c) => c.approved);
    if (!approved.length) say('no engagement channels are approved yet — flip `approved: true` in config.js');
    const catOW = [hideAll, ow(r.citizen.id, ROLE, [P.ViewChannel]), ...staff, bot];
    const cats = {};
    for (const c of approved) {
      const catSpec = ENGAGEMENT.categories[c.category];
      // Existing category (has an id) → put channels in it, don't touch the category.
      cats[c.category] ??= typeof catSpec === 'object' && catSpec.id
        ? { id: catSpec.id }
        : await ensureChannel(`cat_${c.category}`, { name: catSpec }, null, catOW, ChannelType.GuildCategory);
      // readOnly → only the bot posts; Citizens read, react and reply in threads.
      const chOW = c.readOnly
        ? [hideAll, ow(r.citizen.id, ROLE, [P.ViewChannel, P.ReadMessageHistory, P.AddReactions, P.SendMessagesInThreads], [P.SendMessages, P.CreatePublicThreads, P.CreatePrivateThreads]), ...staff, bot]
        : undefined; // follow the category (existing channels: left as they are)
      await ensureChannel(c.key ?? `eng_${c.name}`, c, cats[c.category].id, chOW, c.voice ? ChannelType.GuildVoice : ChannelType.GuildText);
    }
    store.save();
  }

  // 5b ── NSFW category: only 🔞 NSFW Access can see it.
  if (NSFW_GATE?.categoryId) {
    const nsfwRole = roles.find((x) => x.id === store.ids().roles[NSFW_GATE.role]);
    const nsfwCat = channels.find((c) => c.id === NSFW_GATE.categoryId);
    if (nsfwRole && nsfwCat) {
      const before = JSON.stringify(nsfwCat.permission_overwrites ?? []);
      const gateOW = [hideAll, ow(nsfwRole.id, ROLE, [P.ViewChannel]), ...staff, bot];
      await api.patch(Routes.channel(nsfwCat.id), { body: { permission_overwrites: gateOW }, reason: 'Bad Country: NSFW Access only' });
      // Children that were synced with the category stay synced.
      for (const c of channels.filter((x) => x.parent_id === nsfwCat.id && JSON.stringify(x.permission_overwrites ?? []) === before)) {
        await api.patch(Routes.channel(c.id), { body: { permission_overwrites: gateOW, nsfw: true }, reason: 'Bad Country: NSFW Access only' });
      }
      say('NSFW category is now 🔞 NSFW Access only (channels marked NSFW)');
    } else say('⚠️ NSFW gate skipped: category or role not found');
  }

  // 6 ── Leak check: old channels that explicitly let @everyone in.
  channels = await api.get(Routes.guildChannels(GUILD_ID));
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
