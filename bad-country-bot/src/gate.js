// The checkpoint logic: who has done what, and promotion to Citizen.
import { EmbedBuilder } from 'discord.js';
import { ROLE_MENUS, TEXT, COLORS, CHANNELS } from './config.js';
import * as store from './store.js';

export const roleId = (key) => store.ids().roles[key];
export const channelId = (key) => store.ids().channels[key];

export function hasRequiredRoles(member) {
  return ROLE_MENUS.filter((m) => m.required).every((m) =>
    m.options.some((o) => member.roles.cache.has(roleId(o.role))),
  );
}

export function progress(member) {
  const rec = store.member(member.id);
  const steps = {
    rules: Boolean(rec.rulesAt),
    intro: Boolean(rec.intro?.messageId),
    roles: hasRequiredRoles(member),
  };
  const citizen = member.roles.cache.has(roleId('citizen'));
  return { steps, done: steps.rules && steps.intro && steps.roles, citizen };
}

export function checklist(member) {
  const { steps, citizen } = progress(member);
  if (citizen) return '🌵 You are already a **Citizen of Bad Country**. The desert is yours. Go be a menace (a nice one).';
  const tick = (b) => (b ? '✅' : '⬜');
  const ch = (k) => (channelId(k) ? `<#${channelId(k)}>` : `#${CHANNELS[k].name}`);
  return [
    "**Your papers so far:**",
    `${tick(steps.rules)} Sign the rules in ${ch('rules')}`,
    `${tick(steps.intro)} File your intro in ${ch('intros')}`,
    `${tick(steps.roles)} Pick pronouns + DM status in ${ch('roles')}`,
  ].join('\n');
}

export async function log(guild, content, color = COLORS.dust) {
  const id = channelId('log');
  if (!id) return;
  const channel = guild.channels.cache.get(id) ?? (await guild.channels.fetch(id).catch(() => null));
  if (!channel) return;
  await channel
    .send({ embeds: [new EmbedBuilder().setColor(color).setDescription(content).setTimestamp()], allowedMentions: { parse: [] } })
    .catch((e) => console.warn('[log] failed:', e.message));
}

// Promote if everything is done. Returns true if they were just promoted.
export async function maybePromote(member) {
  const { done, citizen } = progress(member);
  if (!done || citizen) return false;
  const rec = store.member(member.id);
  await member.roles.add(roleId('citizen'), 'Bad Country checkpoint complete');
  if (roleId('drifter') && member.roles.cache.has(roleId('drifter'))) {
    await member.roles.remove(roleId('drifter'), 'Bad Country checkpoint complete');
  }
  rec.verifiedAt = Date.now();
  store.save();

  // Announce in their intro thread, if there is one.
  if (rec.intro?.threadId) {
    const thread = await member.guild.channels.fetch(rec.intro.threadId).catch(() => null);
    await thread?.send({ content: TEXT.verified(`<@${member.id}>`) }).catch(() => {});
  }
  await log(member.guild, `🌵 <@${member.id}> (${member.user.username}) is now a Citizen.`, COLORS.desert);
  return true;
}

// Called when someone joins.
export async function onJoin(member) {
  const rec = store.member(member.id);
  // Returning citizen? Welcome them straight back in.
  if (rec.verifiedAt && roleId('citizen')) {
    await member.roles.add(roleId('citizen'), 'Returning citizen').catch(() => {});
    await log(member.guild, `🔁 <@${member.id}> came back. Citizenship restored.`);
    return 'returning';
  }
  if (roleId('drifter')) await member.roles.add(roleId('drifter'), 'New arrival at the checkpoint');
  const ageDays = Math.floor((Date.now() - member.user.createdTimestamp) / 86_400_000);
  const flag = ageDays < 7 ? ` ⚠️ account is only **${ageDays}d** old` : '';
  await log(member.guild, `🦇 <@${member.id}> (${member.user.username}) stumbled into the checkpoint.${flag}`);
  return 'drifter';
}
