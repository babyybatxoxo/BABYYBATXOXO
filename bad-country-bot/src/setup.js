// One-shot provisioning. Safe to re-run: it finds things by saved ID or name,
// updates them in place, and NEVER deletes anything.
//
//   npm run setup                         → roles, checkpoint, panels, lock-down
//   npm run setup -- --with-engagement    → also create approved ENGAGEMENT channels
//   npm run setup -- --no-grandfather     → don't auto-verify people already in the server
//   npm run setup -- --fix-leaks          → strip "@everyone can view" overrides from old channels
//   npm run setup -- --dry-run            → just report what it sees, change nothing
import { Client, GatewayIntentBits, ChannelType, PermissionFlagsBits as P, OverwriteType } from 'discord.js';
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

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers] });

async function ensureRole(guild, key, spec) {
  const ids = store.ids().roles;
  let role = (ids[key] && guild.roles.cache.get(ids[key])) || guild.roles.cache.find((r) => r.name === spec.name);
  const data = {
    name: spec.name,
    color: spec.color ?? 0,
    hoist: spec.hoist ?? false,
    mentionable: false,
    permissions: (spec.perms ?? []).map((p) => P[p]),
    reason: spec.reason ?? 'Bad Country setup',
  };
  if (DRY) { say(role ? 'role exists' : 'would create role', spec.name); return role; }
  if (!role) { role = await guild.roles.create(data); say('created role', spec.name); }
  else if (role.editable) { await role.edit(data); say('updated role', spec.name); }
  else say(`⚠️ can't edit role "${spec.name}" — it's above the bot's role`);
  ids[key] = role.id;
  return role;
}

async function ensureChannel(guild, key, spec, parentId, overwrites, type = ChannelType.GuildText) {
  const ids = store.ids().channels;
  let ch = (ids[key] && guild.channels.cache.get(ids[key])) ||
    guild.channels.cache.find((c) => c.name === spec.name && c.type === type);
  const data = {
    name: spec.name,
    type,
    ...(type === ChannelType.GuildText ? { topic: spec.topic ?? null, nsfw: Boolean(spec.nsfw) } : {}),
    ...(parentId ? { parent: parentId } : {}),
    ...(overwrites ? { permissionOverwrites: overwrites } : {}),
    reason: 'Bad Country setup',
  };
  if (DRY) { say(ch ? 'channel exists' : 'would create channel', spec.name); return ch; }
  if (!ch) { ch = await guild.channels.create(data); say('created', type === ChannelType.GuildCategory ? 'category' : 'channel', spec.name); }
  else {
    const { type: _t, ...edit } = data;
    await ch.edit(edit);
    say('updated', spec.name);
  }
  // No explicit overwrites → follow the category's permissions.
  if (!overwrites && parentId && ch.permissionsLocked === false) await ch.lockPermissions().catch(() => {});
  ids[key] = ch.id;
  return ch;
}

async function postPanel(channel, key, payload) {
  if (DRY || !channel) return;
  const msgs = store.ids().messages;
  const existing = msgs[key] && (await channel.messages.fetch(msgs[key]).catch(() => null));
  if (existing) { await existing.edit(payload); say('refreshed panel', key); }
  else {
    const m = await channel.send(payload);
    await m.pin().catch(() => {});
    msgs[key] = m.id;
    say('posted panel', key);
  }
}

client.once('ready', async () => {
  try {
    const guild = await client.guilds.fetch(GUILD_ID);
    await guild.roles.fetch();
    await guild.channels.fetch();
    const me = await guild.members.fetchMe();
    say(`logged in as ${client.user.tag} → "${guild.name}"`, DRY ? '(DRY RUN)' : '');

    const needed = ['ManageRoles', 'ManageChannels', 'ManageMessages', 'KickMembers', 'ViewChannel', 'SendMessages', 'EmbedLinks', 'CreatePublicThreads'];
    const missing = needed.filter((p) => !me.permissions.has(P[p]));
    if (missing.length) throw new Error(`Bot is missing permissions: ${missing.join(', ')}. Easiest fix: give the bot's role Administrator while you run setup.`);

    // 1 ── Roles. Created top-down so the order in the role list makes sense.
    const r = {};
    for (const key of ['gonzo', 'attorney', 'citizen', 'drifter']) r[key] = await ensureRole(guild, key, ROLES[key]);
    for (const menu of ROLE_MENUS) for (const o of menu.options) await ensureRole(guild, o.role, { name: o.role, reason: `Self-role (${menu.key})` });
    if (DRY) {
      for (const [k, c] of Object.entries(CHANNELS)) {
        const found = guild.channels.cache.find((x) => x.name === c.name);
        say(found ? 'channel exists' : 'would create channel', c.name);
      }
      const leaks = guild.channels.cache.filter((c) => c.permissionOverwrites?.cache.get(guild.roles.everyone.id)?.allow.has(P.ViewChannel));
      say(`${leaks.size} channel(s) explicitly let @everyone view:`, [...leaks.values()].map((c) => c.name).join(', ') || 'none');
      say(`${guild.memberCount} member(s) would be grandfathered as Citizens (minus bots)`);
      return;
    }
    store.save();

    // Try to sit the gate roles just under the bot so it can always assign them.
    const top = me.roles.highest.position;
    if (!DRY && r.citizen && r.drifter) {
      await guild.roles.setPositions([
        { role: r.gonzo.id, position: Math.max(1, top - 1) },
        { role: r.attorney.id, position: Math.max(1, top - 2) },
        { role: r.citizen.id, position: Math.max(1, top - 3) },
        { role: r.drifter.id, position: Math.max(1, top - 4) },
      ]).catch((e) => say('⚠️ could not reorder roles (do it by hand, bot role on top):', e.message));
    }

    // 2 ── Lock the doors. @everyone can't see channels; Citizens can.
    const everyone = guild.roles.everyone;
    if (!DRY) {
      await everyone.setPermissions(everyone.permissions.remove(P.ViewChannel), 'Bad Country: gate the server');
      await r.citizen.setPermissions(r.citizen.permissions.add(P.ViewChannel), 'Bad Country: citizens see everything');
      say('@everyone can no longer see channels by default; 🌵 Citizens can');
    }

    // 3 ── Checkpoint + staff categories and channels.
    const bot = { id: me.id, type: OverwriteType.Member, allow: [P.ViewChannel, P.SendMessages, P.EmbedLinks, P.ReadMessageHistory, P.ManageMessages, P.CreatePublicThreads, P.SendMessagesInThreads, P.ManageThreads] };
    const hideAll = { id: everyone.id, type: OverwriteType.Role, deny: [P.ViewChannel] };
    const readOnlyFor = (role) => ({ id: role.id, type: OverwriteType.Role, allow: [P.ViewChannel, P.ReadMessageHistory], deny: [P.SendMessages, P.CreatePublicThreads, P.CreatePrivateThreads, P.AddReactions] });
    const staff = [r.gonzo, r.attorney].filter(Boolean).map((role) => ({ id: role.id, type: OverwriteType.Role, allow: [P.ViewChannel, P.SendMessages, P.ReadMessageHistory, P.ManageMessages] }));

    const checkpointOW = [hideAll, readOnlyFor(r.drifter), readOnlyFor(r.citizen), ...staff, bot];
    const cat = await ensureChannel(guild, 'cat_checkpoint', { name: CATEGORIES.checkpoint }, null, checkpointOW, ChannelType.GuildCategory);
    const trunkOW = [hideAll, { id: r.citizen.id, type: OverwriteType.Role, deny: [P.ViewChannel] }, ...staff, bot];
    const trunk = await ensureChannel(guild, 'cat_trunk', { name: CATEGORIES.trunk }, null, trunkOW, ChannelType.GuildCategory);

    const ch = {};
    for (const key of ['welcome', 'rules', 'roles']) ch[key] = await ensureChannel(guild, key, CHANNELS[key], cat?.id, checkpointOW);
    // Intros: Citizens can react + chat in welcome threads; nobody types in the channel itself.
    const introOW = [
      hideAll,
      readOnlyFor(r.drifter),
      { id: r.citizen.id, type: OverwriteType.Role, allow: [P.ViewChannel, P.ReadMessageHistory, P.AddReactions, P.SendMessagesInThreads], deny: [P.SendMessages, P.CreatePublicThreads] },
      ...staff, bot,
    ];
    ch.intros = await ensureChannel(guild, 'intros', CHANNELS.intros, cat?.id, introOW);
    ch.log = await ensureChannel(guild, 'log', CHANNELS.log, trunk?.id, trunkOW);
    if (!DRY) store.save();

    // 4 ── Panels.
    await postPanel(ch.welcome, 'welcome', welcomePanel());
    await postPanel(ch.rules, 'rules', rulesPanel());
    await postPanel(ch.intros, 'intros', introPanel());
    await postPanel(ch.roles, 'roles', rolesPanel());
    if (!DRY) store.save();

    // 5 ── Engagement channels (only the ones you approved in config.js).
    if (args.has('--with-engagement')) {
      const approved = ENGAGEMENT.channels.filter((c) => c.approved);
      if (!approved.length) say('no engagement channels are approved yet — flip `approved: true` in config.js');
      const cats = {};
      for (const c of approved) {
        if (!cats[c.category]) {
          const nsfwCat = approved.some((x) => x.category === c.category && x.nsfw);
          cats[c.category] = await ensureChannel(guild, `cat_${c.category}`, { name: ENGAGEMENT.categories[c.category] }, null,
            [hideAll, { id: r.citizen.id, type: OverwriteType.Role, allow: [P.ViewChannel] }, ...staff, bot], ChannelType.GuildCategory);
          if (nsfwCat) say(`(${ENGAGEMENT.categories[c.category]} contains NSFW channels — Discord will age-gate them too)`);
        }
        await ensureChannel(guild, c.key ?? `eng_${c.name}`, c, cats[c.category]?.id, null, c.voice ? ChannelType.GuildVoice : ChannelType.GuildText);
        // ↑ null overwrites = channel syncs with its category's permissions.
      }
      if (!DRY) store.save();
    }

    // 6 ── Leak check: old channels that explicitly let @everyone in.
    const leaks = guild.channels.cache.filter((c) => c.permissionOverwrites?.cache.get(everyone.id)?.allow.has(P.ViewChannel));
    if (leaks.size) {
      say(`⚠️ ${leaks.size} channel(s) explicitly allow @everyone to view (they bypass the gate):`);
      for (const c of leaks.values()) {
        say(`   - ${c.name}`);
        if (args.has('--fix-leaks') && !DRY) {
          await c.permissionOverwrites.edit(everyone, { ViewChannel: null }, { reason: 'Bad Country gate' });
          say('     fixed');
        }
      }
      if (!args.has('--fix-leaks')) say('   re-run with --fix-leaks to close them (only do this if they should be Citizen-only)');
    }

    // 7 ── Grandfather everyone already here so nobody gets locked out.
    if (!args.has('--no-grandfather') && !DRY) {
      const members = await guild.members.fetch();
      let n = 0;
      for (const m of members.values()) {
        if (m.user.bot || m.roles.cache.has(r.citizen.id) || m.roles.cache.has(r.drifter.id)) continue;
        await m.roles.add(r.citizen, 'Bad Country setup: grandfathered existing member').catch((e) => say(`⚠️ ${m.user.username}: ${e.message}`));
        const rec = store.member(m.id);
        rec.verifiedAt = Date.now();
        rec.grandfathered = true;
        n++;
      }
      store.save();
      say(`grandfathered ${n} existing member(s) as 🌵 Citizens`);
    }

    say('done. Now run `npm start` and leave it running. 🦇');
  } catch (err) {
    console.error('✖ setup failed:', err.message);
    process.exitCode = 1;
  } finally {
    client.destroy();
  }
});

client.login(TOKEN);
