// Message builders for the four checkpoint panels. Shared by setup + bot.
import {
  ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder,
  StringSelectMenuBuilder, ModalBuilder, TextInputBuilder, TextInputStyle,
} from 'discord.js';
import { TEXT, COLORS, ROLE_MENUS, MIN_AGE } from './config.js';

export const IDS = {
  status: 'gate:status',
  accept: 'gate:accept',
  intro: 'gate:intro',
  modal: 'gate:intro-modal',
  menu: (key) => `roles:${key}`,
};

export function welcomePanel() {
  const embed = new EmbedBuilder()
    .setColor(COLORS.desert)
    .setTitle(TEXT.welcome.title)
    .setDescription(TEXT.welcome.body)
    .setFooter({ text: TEXT.welcome.footer });
  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(IDS.status).setLabel('Where am I?').setEmoji('🧭').setStyle(ButtonStyle.Secondary),
  );
  return { embeds: [embed], components: [row] };
}

export function rulesPanel() {
  const embed = new EmbedBuilder()
    .setColor(COLORS.blood)
    .setTitle(TEXT.rules.title)
    .setDescription(TEXT.rules.intro)
    .addFields(TEXT.rules.list.map(([name, value]) => ({ name, value })))
    .addFields({ name: '​', value: TEXT.rules.outro });
  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(IDS.accept).setLabel(TEXT.rules.button).setStyle(ButtonStyle.Danger),
  );
  return { embeds: [embed], components: [row] };
}

export function introPanel() {
  const embed = new EmbedBuilder()
    .setColor(COLORS.neon)
    .setTitle(TEXT.intros.title)
    .setDescription(TEXT.intros.body);
  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(IDS.intro).setLabel(TEXT.intros.button).setStyle(ButtonStyle.Primary),
  );
  return { embeds: [embed], components: [row] };
}

export function rolesPanel() {
  const embed = new EmbedBuilder()
    .setColor(COLORS.ether)
    .setTitle(TEXT.roles.title)
    .setDescription(TEXT.roles.body);
  const rows = ROLE_MENUS.slice(0, 5).map((menu) =>
    new ActionRowBuilder().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId(IDS.menu(menu.key))
        .setPlaceholder(menu.placeholder + (menu.required ? ' (required)' : ''))
        .setMinValues(0)
        .setMaxValues(menu.single ? 1 : menu.options.length)
        .addOptions(menu.options.map((o, i) => ({
          label: o.label,
          value: String(i),
          emoji: o.emoji,
          ...(o.description ? { description: o.description } : {}),
        }))),
    ),
  );
  return { embeds: [embed], components: rows };
}

export function introModal(previous = {}) {
  const modal = new ModalBuilder().setCustomId(IDS.modal).setTitle(TEXT.intros.modalTitle);
  for (const f of TEXT.intros.fields) {
    const input = new TextInputBuilder()
      .setCustomId(f.id)
      .setLabel(f.label)
      .setStyle(f.style === 'paragraph' ? TextInputStyle.Paragraph : TextInputStyle.Short)
      .setMaxLength(f.max)
      .setRequired(f.required)
      .setPlaceholder(f.placeholder);
    if (previous[f.id]) input.setValue(String(previous[f.id]).slice(0, f.max));
    modal.addComponents(new ActionRowBuilder().addComponents(input));
  }
  return modal;
}

export function introPost(member, a) {
  return new EmbedBuilder()
    .setColor(COLORS.neon)
    .setAuthor({ name: member.user.username, iconURL: member.displayAvatarURL() })
    .setTitle(TEXT.intros.postTitle(a.name))
    .setThumbnail(member.displayAvatarURL({ size: 256 }))
    .addFields(
      { name: '🏷️ Call me', value: a.name, inline: true },
      // Exact age only goes to the staff log, not the public post.
      { name: '🎂 Age', value: `${MIN_AGE}+ ✔`, inline: true },
      { name: '🗺️ Pronouns & hideout', value: a.where },
      { name: '🥃 Poison & what dragged me here', value: a.poison },
      { name: '🦎 Something weird', value: a.weird },
    )
    .setFooter({ text: `Filed by ${member.user.tag ?? member.user.username}` })
    .setTimestamp();
}
