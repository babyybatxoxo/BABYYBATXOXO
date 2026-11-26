# 🦇 Bad Country Bot

> *We can't stop here. This is Bad Country.*

Gatekeeper bot for the **Bad Country** Discord server (`1540905721879593030`). **21+ only.**

## How the checkpoint works

```
join ──► 🦇 Drifter (sees only THE CHECKPOINT)
           ├─ 📜 the-rules ........ press "I'm 21+ and I accept the rules"
           ├─ 🪪 who-are-you ...... press "Fill out my papers" → form → posted with a welcome thread
           └─ 🎭 pick-your-poison . pick pronouns + DM status (required), vices/region/pings (optional)
all 3 done ──► bot swaps Drifter for 🌵 Citizen of Bad Country → whole server unlocks
```

- `@everyone` loses **View Channels** server-wide. Only 🌵 Citizens see the normal channels. Drifters only see the checkpoint.
- An age under 21 in the form blocks verification and posts a 🚨 to `the-trunk-log` (or auto-kicks; see `AUTO_KICK_UNDERAGE`).
- Public intros say "21+ ✔". The exact age goes to the staff log only.
- People who were already in the server when you run setup are **grandfathered** as Citizens, so nobody gets locked out.
- When a Citizen leaves and comes back, they get Citizen again straight away.

## Setup (one time, about 10 minutes)

1. **Make the bot:** https://discord.com/developers/applications → New Application → **Bot** tab:
   - **Reset Token** → copy it (keep it secret)
   - Turn on **Server Members Intent**
2. **Invite it:** OAuth2 → URL Generator → scopes `bot` + `applications.commands`, permission **Administrator** (you can remove that after setup, but keep Manage Roles, Manage Channels, Manage Messages, Kick Members, Create Public Threads, Send Messages in Threads). Open the URL and add it to Bad Country.
3. In **Server Settings → Roles**, drag the bot's role to the **top**.
4. Run it:
   ```bash
   cd bad-country-bot
   cp .env.example .env        # paste DISCORD_TOKEN in
   npm install
   npm run setup -- --dry-run  # look first, change nothing
   npm run setup -- --with-engagement   # build it (checkpoint + approved channels)
   npm start                   # keep this running 24/7
   ```
5. Give yourself **🩺 Dr. Gonzo** and your mods **⚖️ The Attorney**.
6. If **Server Settings → Onboarding** (Discord's own) is turned on, set its default channels to the checkpoint channels so it doesn't send people to channels they can't see yet.

### Setup flags
| flag | does |
|---|---|
| `--dry-run` | report only |
| `--no-grandfather` | don't auto-verify existing members |
| `--fix-leaks` | remove "@everyone can view" overrides on old channels (setup lists them) |
| `--with-engagement` | create the engagement channels marked `approved: true` in `src/config.js` |

## Staff commands
- `/checkpoint status @user`: see their progress, stated age, and flags
- `/checkpoint pass @user`: wave them through to Citizen
- `/checkpoint reset @user`: send them back to Drifter (they re-sign the rules)
- `/checkpoint panels`: refresh the panels after you edit `config.js`

## Engagement (approved)
`npm run setup -- --with-engagement` creates these:
- **🌵 THE STRIP**
  - 🦎┃lizard-lounge: the main chat
  - 🕯️┃confession-booth: only the bot posts here. Each confession gets its own reply thread, and Citizens can react.
  - 📸┃polaroids
- **🦈 THE RED SHARK**
  - 🏨 Suite 1850 (voice)

Bot features:
- **Daily QOTD:** "Dispatch from the Desert #N" posts to lizard-lounge with an answer thread and a Gonzo fact attached. It goes out at **21:00 Vegas time** by default; change it under `QOTD` in config. Staff can post one on demand with `/qotd`, either random or with your own question.
- **`/confess`:** works from any channel and posts to the confession booth. For Citizens only, with a 10-minute cooldown. Members never see who sent a confession. Staff see the author in the trunk log so nobody can use the booth to hurt people. This is stated in the rules and in the reply.
- **`/gonzo`:** posts a true Hunter S. Thompson fact. Facts don't repeat until the whole list has been used. The facts and questions are in `src/fun.js`.

## Customizing
Every name, emoji, color, rule and line of text is in **`src/config.js`**. After you edit it, run `npm run setup` again. It updates things in place and never deletes anything.

## Hosting
The bot only works while `npm start` is running. You can run it on a cheap VPS, Railway or Fly.io, or a Raspberry Pi. On a VPS, `pm2 start src/bot.js --name bad-country` keeps it alive after a crash or reboot. The `data/` folder holds progress and IDs, so back it up.

## Honest limits
- No bot can truly verify age. The rules button and the age field are **self-attestation**. Discord's NSFW channels add Discord's own 18+ gate. Staff still need to act on any red flags or reports.
- New accounts under 7 days old are flagged ⚠️ in the log.
