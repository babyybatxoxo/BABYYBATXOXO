// Uploads Charlie's avatar, banner, app icon/cover/description and app emojis.
// Run from the art/ folder: cd art && node brand.mjs   (needs DISCORD_TOKEN in env)
import fs from 'node:fs';
import { REST, Routes } from 'discord.js';
import { restAgent } from '../src/proxy.js';
const api = new REST({ version: '10', ...(restAgent ? { agent: restAgent } : {}) }).setToken(process.env.DISCORD_TOKEN || 'proxy-injected');
const uri = (f) => `data:image/png;base64,${fs.readFileSync(f).toString('base64')}`;
const step = async (label, fn) => { try { await fn(); console.log('✓', label); } catch (e) { console.log('✗', label, '→', e.status ?? '', e.message); } };

const me = await api.get(Routes.user('@me'));
console.log('bot:', me.username);
await step('bot avatar + banner', () => api.patch(Routes.user('@me'), { body: { avatar: uri('../assets/icon.png'), banner: uri('../assets/banner-profile.png') } }));
await step('app icon, cover, description', () => api.patch('/applications/@me', { body: {
  icon: uri('../assets/icon.png'),
  cover_image: uri('../assets/cover.png'),
  description: "🦇 Keeper of the gate for Bad Country (21+). We can't stop here.\nChecks your papers, hands out roles, runs the Mint 400, gonzo trivia, road trips, confessions and Raoul, the AI gonzo correspondent.",
} }));
const existing = await api.get(`/applications/${me.id}/emojis`).then((r) => r.items ?? []).catch(() => []);
for (const f of fs.readdirSync('../assets/emojis')) {
  const name = f.replace('.png', '');
  if (existing.some((e) => e.name === name)) { console.log('= emoji exists', name); continue; }
  await step(`emoji ${name}`, () => api.post(`/applications/${me.id}/emojis`, { body: { name, image: uri(`../assets/emojis/${f}`) } }));
}
const all = await api.get(`/applications/${me.id}/emojis`).then((r) => r.items ?? []);
fs.writeFileSync('../src/emojis.json', JSON.stringify(Object.fromEntries(all.map((e) => [e.name, `<:${e.name}:${e.id}>`])), null, 2));
console.log('saved', all.length, 'emoji ids → src/emojis.json');
