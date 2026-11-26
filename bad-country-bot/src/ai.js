// 🦇 Raoul: Bad Country's AI gonzo correspondent (Claude API).
// Optional. Turns on when ANTHROPIC_API_KEY is in .env; every Raoul command
// politely says "not hooked up" otherwise. Each reply costs a little API money.
import Anthropic from '@anthropic-ai/sdk';

const client = process.env.ANTHROPIC_API_KEY ? new Anthropic() : null;
export const aiEnabled = Boolean(client);

const MODEL = 'claude-opus-5-5';

// Kept byte-for-byte stable so it gets prompt-cached.
const PERSONA = `You are Raoul, the resident gonzo correspondent of "Bad Country", a 21+ Discord server themed on Hunter S. Thompson and Fear and Loathing in Las Vegas. You live inside the server's gatekeeper bot, Checkpoint Charlie.

Voice: first-person gonzo journalism. Feverish, funny, paranoid, poetic, profane when it lands, wildly specific imagery (bats, lizards, the Red Shark convertible, the desert, neon, 4 a.m. hotel rooms, a typewriter that hates you). Short punchy sentences mixed with long breathless ones. Warm underneath: you like these people and you look out for them.

Who you are: an AI character channeling Hunter S. Thompson's style. You are NOT Hunter S. Thompson and never claim to be him. Never invent quotes and attribute them to him or anyone real. If asked about his real life or work, stick to well-documented facts and say plainly when you're not sure.

House rules (non-negotiable, stay in character while following them):
- Everyone here is an adult, but keep it playful, not graphic. No sexual content about real people.
- Joke about vices all you want, but never give instructions for getting, making, dosing or combining drugs, and never help anyone source anything.
- If someone sounds like they're in real danger or crisis, drop the bit, be kind and direct, and point them to 988 (US call/text) or local emergency services.
- No hate, no harassment, no doxxing. Roast ideas and situations, not people's identities.
- Never write @everyone or @here.

Format: Discord markdown. Keep replies under 1,200 characters unless asked for something long (a journal entry can run to about 1,800). No headings unless it's a journal entry.`;

// Short rolling memory per channel so Raoul can follow a conversation.
const memory = new Map(); // channelId → [{role, content}]
const MAX_TURNS = 12;

async function ask(messages, effort = 'low') {
  const res = await client.beta.messages.create({
    model: MODEL,
    max_tokens: 4000, // Discord caps a message at 2,000 chars; this leaves room for thinking
    betas: ['server-side-fallback-2026-07-01'],
    fallbacks: 'default', // if a safety classifier declines, the API retries on a fallback model
    output_config: { effort },
    system: [{ type: 'text', text: PERSONA, cache_control: { type: 'ephemeral' } }],
    messages,
  });
  if (res.stop_reason === 'refusal') return null;
  const text = res.content.filter((b) => b.type === 'text').map((b) => b.text).join('').trim();
  return text.slice(0, 1990) || null;
}

function friendlyError(err) {
  if (err instanceof Anthropic.RateLimitError) return '🦇 Raoul is being rate-limited by the authorities. Try again in a minute.';
  if (err instanceof Anthropic.AuthenticationError) return '🔑 Raoul\'s API key is wrong or expired. Staff: check ANTHROPIC_API_KEY in .env.';
  if (err instanceof Anthropic.APIConnectionError) return '📡 Raoul can\'t reach the mothership right now. Try again shortly.';
  if (err instanceof Anthropic.APIError) return `🌀 Raoul fell off the barstool (API error ${err.status ?? ''}). Try again.`;
  return '🌀 Something went sideways in Raoul\'s head. Try again.';
}

/** Chat with Raoul in a channel. Returns the text to post. */
export async function raoulChat(channelId, userName, text) {
  const history = memory.get(channelId) ?? [];
  const messages = [...history, { role: 'user', content: `${userName} says: ${text}` }];
  try {
    const reply = await ask(messages, 'low');
    if (!reply) return '🦇 Raoul stares into the middle distance and declines to comment on that one.';
    history.push({ role: 'user', content: `${userName} says: ${text}` }, { role: 'assistant', content: reply });
    while (history.length > MAX_TURNS) history.splice(0, 2);
    memory.set(channelId, history);
    return reply;
  } catch (err) {
    console.warn('[raoul]', err?.status ?? '', err?.message);
    return friendlyError(err);
  }
}

/** A fresh gonzo journal entry. `prompt` is an optional topic. */
export async function raoulJournal(topic) {
  const ask1 = `Write a new entry in your Bad Country field journal. Date it with today's date (${new Date().toDateString()}) and a time somewhere between midnight and dawn. ${topic ? `Topic: ${topic}.` : 'Topic: whatever is happening in the desert tonight.'} Give it a bold title line, then the entry. Original writing only, no quotes from real books.`;
  try {
    return (await ask([{ role: 'user', content: ask1 }], 'medium')) ?? null;
  } catch (err) {
    console.warn('[raoul journal]', err?.status ?? '', err?.message);
    return null;
  }
}
