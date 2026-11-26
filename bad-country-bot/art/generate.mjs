// Generates Checkpoint Charlie's art (icon, banners, emojis, /art postcards).
// All original, procedurally drawn. Run: node art/generate.mjs  (needs Playwright)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
const { chromium } = createRequire(import.meta.url)('playwright'); // globally installed

const HERE = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(HERE, '..', 'assets');

// Seeded RNG so the art is reproducible.
function rng(seed) { let s = seed >>> 0; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); }

const PAL = { ink: '#120a1c', blood: '#e0122f', neon: '#ff2e88', orange: '#ff7a1a', yolk: '#ffd23f', acid: '#b6ff3b', ether: '#3fd6ff', violet: '#7b2cff', sand: '#f4c27a', bone: '#fff3dc' };

// ── Shapes ───────────────────────────────────────────────────
const BAT = 'M50 20 L44 6 L46 14 C40 8 34 8 30 10 C26 5 16 3 4 8 C10 11 11 16 5 21 C14 20 19 24 19 31 C25 27 31 28 35 34 C39 30 45 30 50 37 C55 30 61 30 65 34 C69 28 75 27 81 31 C81 24 86 20 95 21 C89 16 90 11 96 8 C84 3 74 5 70 10 C66 8 60 8 54 14 L56 6 Z';
const bat = (x, y, s, fill = PAL.ink, rot = 0) => `<path d="${BAT}" fill="${fill}" transform="translate(${x} ${y}) rotate(${rot}) scale(${s}) translate(-50 -20)"/>`;
const CAR = 'M8 44 L18 33 L58 30 L74 21 L84 21 L96 30 L176 32 L190 38 L192 47 L8 47 Z';
const car = (x, y, s, fill = PAL.blood) => `<g transform="translate(${x} ${y}) scale(${s})"><path d="${CAR}" fill="${fill}" stroke="${PAL.ink}" stroke-width="3" stroke-linejoin="round"/><path d="M74 21 L64 30" stroke="${PAL.ink}" stroke-width="3"/><circle cx="46" cy="48" r="11" fill="${PAL.ink}"/><circle cx="46" cy="48" r="4" fill="${PAL.bone}"/><circle cx="156" cy="48" r="11" fill="${PAL.ink}"/><circle cx="156" cy="48" r="4" fill="${PAL.bone}"/><path d="M182 36 L192 36" stroke="${PAL.yolk}" stroke-width="4"/></g>`;

// Wobbly concentric rings (the "breathing carpet").
function rings(cx, cy, n, step, colors, r, wob = 10) {
  let out = '';
  for (let i = n; i > 0; i--) {
    const R = i * step;
    const pts = [];
    const phase = r() * 6.28;
    const k = 3 + Math.floor(r() * 5);
    for (let a = 0; a <= 360; a += 4) {
      const t = (a * Math.PI) / 180;
      const rr = R + Math.sin(t * k + phase) * wob * (i / n);
      pts.push(`${(cx + Math.cos(t) * rr).toFixed(1)},${(cy + Math.sin(t) * rr).toFixed(1)}`);
    }
    out += `<polygon points="${pts.join(' ')}" fill="${colors[i % colors.length]}"/>`;
  }
  return out;
}

// Steadman-ish ink splatter: a blob + droplets, warped by the "ink" filter.
function splat(x, y, size, r, fill = PAL.ink) {
  let out = `<g filter="url(#ink)"><circle cx="${x}" cy="${y}" r="${size}" fill="${fill}"/>`;
  for (let i = 0; i < 14; i++) {
    const a = r() * 6.28, d = size * (0.8 + r() * 2.2), s = size * (0.05 + r() * 0.22);
    out += `<circle cx="${(x + Math.cos(a) * d).toFixed(1)}" cy="${(y + Math.sin(a) * d).toFixed(1)}" r="${s.toFixed(1)}" fill="${fill}"/>`;
    if (r() < 0.5) out += `<line x1="${x}" y1="${y}" x2="${(x + Math.cos(a) * d * 0.9).toFixed(1)}" y2="${(y + Math.sin(a) * d * 0.9).toFixed(1)}" stroke="${fill}" stroke-width="${(s * 0.6).toFixed(1)}" stroke-linecap="round"/>`;
  }
  return out + '</g>';
}

const defs = (seed = 3) => `<defs>
  <filter id="ink" x="-50%" y="-50%" width="200%" height="200%"><feTurbulence type="fractalNoise" baseFrequency="0.035" numOctaves="2" seed="${seed}"/><feDisplacementMap in="SourceGraphic" scale="14"/></filter>
  <filter id="melt" x="-20%" y="-20%" width="140%" height="140%"><feTurbulence type="turbulence" baseFrequency="0.006 0.02" numOctaves="2" seed="${seed}"/><feDisplacementMap in="SourceGraphic" scale="40"/></filter>
  <filter id="wobble" x="-10%" y="-20%" width="120%" height="140%"><feTurbulence type="turbulence" baseFrequency="0.012 0.03" numOctaves="1" seed="${seed}"/><feDisplacementMap in="SourceGraphic" scale="10"/></filter>
  <filter id="glow"><feGaussianBlur stdDeviation="6" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
  <filter id="grain" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="1" seed="${seed}"/><feColorMatrix values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 0.12 0"/></filter>
</defs>`;

const svg = (w, h, body, seed) => `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">${defs(seed)}${body}<rect width="${w}" height="${h}" fill="#fff" filter="url(#grain)"/></svg>`;

// ── Icon (1024, shown round by Discord) ──────────────────────
function icon() {
  const r = rng(7);
  const body = `
    <rect width="1024" height="1024" fill="${PAL.violet}"/>
    <g filter="url(#melt)">${rings(512, 540, 12, 46, [PAL.orange, PAL.neon, PAL.yolk, PAL.violet, PAL.blood, PAL.acid], r, 18)}</g>
    <circle cx="512" cy="540" r="150" fill="${PAL.yolk}"/>
    ${splat(300, 250, 28, r)}${splat(780, 820, 22, r)}${splat(760, 230, 14, r)}
    <g transform="translate(512 520)">
      ${bat(0, 0, 8.6, PAL.ink)}
      <!-- aviators -->
      <g transform="translate(0 -18)">
        <ellipse cx="-38" cy="0" rx="34" ry="24" fill="${PAL.blood}" stroke="${PAL.bone}" stroke-width="6"/>
        <ellipse cx="38" cy="0" rx="34" ry="24" fill="${PAL.blood}" stroke="${PAL.bone}" stroke-width="6"/>
        <path d="M-6 -4 Q0 -12 6 -4" stroke="${PAL.bone}" stroke-width="6" fill="none"/>
        <ellipse cx="-48" cy="-8" rx="10" ry="5" fill="${PAL.bone}" opacity="0.7"/><ellipse cx="28" cy="-8" rx="10" ry="5" fill="${PAL.bone}" opacity="0.7"/>
      </g>
      <!-- cigarette holder -->
      <line x1="14" y1="58" x2="190" y2="120" stroke="${PAL.ink}" stroke-width="10" stroke-linecap="round"/>
      <line x1="150" y1="106" x2="190" y2="120" stroke="${PAL.bone}" stroke-width="12" stroke-linecap="round"/>
      <circle cx="194" cy="121" r="8" fill="${PAL.orange}" filter="url(#glow)"/>
      <path d="M200 110 C215 80 185 60 205 30 C220 5 195 -10 210 -40" stroke="${PAL.bone}" stroke-width="6" fill="none" opacity="0.8" filter="url(#ink)"/>
    </g>`;
  return svg(1024, 1024, body, 7);
}

// ── Banner (profile 680x240 @2x, and app cover 1920x1080) ────
function desert(w, h, seed, title = true) {
  const r = rng(seed);
  const hz = h * 0.62;
  let stripes = '';
  const sunR = h * 0.34;
  for (let i = 0; i < 7; i++) stripes += `<rect x="${w * 0.5 - sunR}" y="${hz - sunR * 0.15 - i * sunR * 0.13}" width="${sunR * 2}" height="${sunR * 0.05 + i * 1.5}" fill="${PAL.neon}"/>`;
  let bats = '';
  // Bats stay off the title (middle 70% of the top half).
  for (let i = 0; i < 18; i++) { const side = r() < 0.5 ? r() * w * 0.14 : w * 0.86 + r() * w * 0.14; bats += bat(side, h * 0.05 + r() * hz * 0.7, 0.25 + r() * 0.6, PAL.ink, (r() - 0.5) * 40); }
  const dunes = [0.68, 0.78, 0.9].map((f, i) => {
    let d = `M0 ${h}`;
    for (let x = 0; x <= w; x += w / 12) d += ` L${x.toFixed(0)} ${(h * f + Math.sin(x / (w / 6) + i + r()) * h * 0.04).toFixed(0)}`;
    return `<path d="${d} L${w} ${h} Z" fill="${[PAL.orange, PAL.blood, PAL.ink][i]}"/>`;
  }).join('');
  const road = `<path d="M${w * 0.47} ${h} L${w * 0.496} ${h * 0.75} L${w * 0.504} ${h * 0.75} L${w * 0.53} ${h} Z" fill="#2a1630"/>`;
  const sky = `<linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${PAL.violet}"/><stop offset="0.5" stop-color="${PAL.neon}"/><stop offset="1" stop-color="${PAL.yolk}"/></linearGradient>`;
  const txt = title ? `<g filter="url(#wobble)"><text x="${w * 0.5}" y="${h * 0.3}" text-anchor="middle" font-family="Inter Display" font-weight="900" font-size="${h * 0.2}" fill="${PAL.ink}" letter-spacing="${h * 0.01}" dx="6" dy="6">BAD COUNTRY</text><text x="${w * 0.5}" y="${h * 0.3}" text-anchor="middle" font-family="Inter Display" font-weight="900" font-size="${h * 0.2}" fill="${PAL.bone}" stroke="${PAL.ink}" stroke-width="${h * 0.006}" letter-spacing="${h * 0.01}">BAD COUNTRY</text></g><text x="${w * 0.5}" y="${h * 0.41}" text-anchor="middle" font-family="JetBrains Mono" font-weight="800" font-size="${h * 0.06}" fill="${PAL.ink}" letter-spacing="${h * 0.004}">WE CAN'T STOP HERE.</text>` : '';
  const body = `<defs>${sky}</defs><rect width="${w}" height="${h}" fill="url(#sky)"/>
    <g filter="url(#melt)"><circle cx="${w * 0.5}" cy="${hz}" r="${sunR}" fill="${PAL.yolk}"/>${stripes}</g>
    ${bats}${dunes}${road}${car(w * 0.62, h * 0.8, h / 380)}
    ${splat(w * 0.08, h * 0.2, h * 0.03, r)}${splat(w * 0.93, h * 0.75, h * 0.025, r, PAL.bone)}${txt}`;
  return svg(w, h, body, seed);
}

// ── Emojis (128x128) ─────────────────────────────────────────
const E = 128;
const emoji = {
  bc_bat: () => `<g transform="translate(64 60)">${bat(0, 0, 1.2, PAL.ink)}<ellipse cx="-6" cy="-4" rx="5" ry="3.5" fill="${PAL.blood}"/><ellipse cx="6" cy="-4" rx="5" ry="3.5" fill="${PAL.blood}"/></g>`,
  bc_redshark: () => `<g transform="translate(64 64)">${car(-62, -26, 0.62)}</g>`,
  bc_lizard: () => `<g transform="translate(64 64) rotate(-20)"><path d="M-40 6 C-60 20 -58 40 -30 44" stroke="${PAL.acid}" stroke-width="10" fill="none" stroke-linecap="round"/><ellipse cx="0" cy="0" rx="34" ry="14" fill="${PAL.acid}" stroke="${PAL.ink}" stroke-width="4"/><circle cx="38" cy="-4" r="13" fill="${PAL.acid}" stroke="${PAL.ink}" stroke-width="4"/><circle cx="42" cy="-8" r="4" fill="${PAL.ink}"/><path d="M-18 10 L-26 28 M18 10 L26 28 M-14 -10 L-22 -26 M16 -10 L24 -26" stroke="${PAL.ink}" stroke-width="6" stroke-linecap="round"/><circle cx="-8" cy="-2" r="3" fill="${PAL.ink}"/><circle cx="8" cy="3" r="3" fill="${PAL.ink}"/></g>`,
  bc_cactus: () => `<g stroke="${PAL.ink}" stroke-width="5" fill="#3cb44b"><rect x="50" y="18" width="28" height="98" rx="14"/><path d="M50 74 H34 a12 12 0 0 1 -12 -12 V42 a7 7 0 0 1 14 0 V60 H50" /><path d="M78 64 H92 a12 12 0 0 0 12 -12 V34 a7 7 0 0 0 -14 0 V50 H78"/></g><circle cx="64" cy="18" r="7" fill="${PAL.neon}"/><line x1="10" y1="116" x2="118" y2="116" stroke="${PAL.ink}" stroke-width="5"/>`,
  bc_grapefruit: () => `<circle cx="64" cy="64" r="54" fill="${PAL.orange}" stroke="${PAL.ink}" stroke-width="5"/><circle cx="64" cy="64" r="44" fill="${PAL.neon}"/>${[...Array(8)].map((_, i) => `<line x1="64" y1="64" x2="${64 + Math.cos(i * Math.PI / 4) * 44}" y2="${64 + Math.sin(i * Math.PI / 4) * 44}" stroke="${PAL.bone}" stroke-width="4"/>`).join('')}<circle cx="64" cy="64" r="6" fill="${PAL.bone}"/>`,
  bc_typewriter: () => `<rect x="34" y="10" width="60" height="44" fill="${PAL.bone}" stroke="${PAL.ink}" stroke-width="4"/><path d="M42 22 H86 M42 32 H80 M42 42 H70" stroke="${PAL.ink}" stroke-width="3"/><rect x="12" y="50" width="104" height="58" rx="10" fill="${PAL.blood}" stroke="${PAL.ink}" stroke-width="5"/>${[0, 1, 2].map((row) => [0, 1, 2, 3, 4, 5].map((k) => `<circle cx="${28 + k * 15 + row * 4}" cy="${68 + row * 13}" r="5" fill="${PAL.bone}" stroke="${PAL.ink}" stroke-width="2"/>`).join('')).join('')}`,
  bc_spiral: () => { let d = 'M64 64'; for (let a = 0; a < 6 * Math.PI; a += 0.2) d += ` L${(64 + Math.cos(a) * a * 2.9).toFixed(1)} ${(64 + Math.sin(a) * a * 2.9).toFixed(1)}`; return `<ellipse cx="64" cy="64" rx="60" ry="40" fill="${PAL.bone}" stroke="${PAL.ink}" stroke-width="5"/><circle cx="64" cy="64" r="34" fill="${PAL.violet}"/><path d="${d}" stroke="${PAL.yolk}" stroke-width="5" fill="none"/>`; },
  bc_attorney: () => `<g stroke="${PAL.ink}" stroke-width="5" fill="none" stroke-linecap="round"><line x1="64" y1="14" x2="64" y2="112"/><line x1="22" y1="30" x2="106" y2="30"/><line x1="40" y1="112" x2="88" y2="112"/><path d="M22 30 L8 70 M22 30 L36 70 M106 30 L92 70 M106 30 L120 70"/></g><path d="M6 70 Q22 92 38 70 Z" fill="${PAL.yolk}" stroke="${PAL.ink}" stroke-width="4"/><path d="M90 70 Q106 92 122 70 Z" fill="${PAL.yolk}" stroke="${PAL.ink}" stroke-width="4"/><circle cx="64" cy="14" r="7" fill="${PAL.blood}"/>`,
  bc_mint400: () => `<line x1="20" y1="10" x2="20" y2="122" stroke="${PAL.ink}" stroke-width="7" stroke-linecap="round"/><g transform="translate(22 12)">${[...Array(4)].map((_, y) => [...Array(5)].map((_, x) => `<rect x="${x * 19}" y="${y * 16 + Math.sin(x) * 4}" width="19" height="16" fill="${(x + y) % 2 ? PAL.ink : PAL.bone}"/>`).join('')).join('')}</g><rect x="22" y="12" width="95" height="68" fill="none" stroke="${PAL.ink}" stroke-width="3"/>`,
  bc_gonzo: () => `<rect x="4" y="30" width="120" height="68" rx="14" fill="${PAL.ink}"/><text x="64" y="78" text-anchor="middle" font-family="Inter Display" font-weight="900" font-size="31" fill="${PAL.neon}" filter="url(#glow)">GONZO</text>`,
  bc_ether: () => `<path d="M52 10 H76 V30 C96 40 100 56 100 76 V112 Q100 120 92 120 H36 Q28 120 28 112 V76 C28 56 32 40 52 30 Z" fill="${PAL.ether}" stroke="${PAL.ink}" stroke-width="5" opacity="0.95"/><rect x="38" y="70" width="52" height="30" fill="${PAL.bone}" stroke="${PAL.ink}" stroke-width="3"/><text x="64" y="92" text-anchor="middle" font-family="JetBrains Mono" font-weight="800" font-size="16" fill="${PAL.ink}">???</text><circle cx="50" cy="50" r="4" fill="${PAL.bone}"/><circle cx="60" cy="40" r="3" fill="${PAL.bone}"/>`,
  bc_wcsh: () => `<rect x="6" y="20" width="116" height="88" rx="8" fill="${PAL.yolk}" stroke="${PAL.ink}" stroke-width="5" transform="rotate(-6 64 64)"/><g transform="rotate(-6 64 64)" font-family="Inter Display" font-weight="900" text-anchor="middle" fill="${PAL.ink}"><text x="64" y="54" font-size="24">BAT</text><text x="64" y="86" font-size="21">COUNTRY</text></g>`,
};

// ── Postcards for /art (1200x800) ────────────────────────────
function postcard(seed) {
  const r = rng(seed * 97 + 13);
  const pals = [[PAL.neon, PAL.yolk, PAL.violet, PAL.orange], [PAL.acid, PAL.ether, PAL.violet, PAL.neon], [PAL.blood, PAL.orange, PAL.yolk, PAL.ink], [PAL.ether, PAL.neon, PAL.yolk, PAL.acid]];
  const pal = pals[seed % pals.length];
  const cx = 300 + r() * 600, cy = 250 + r() * 300;
  let body = `<rect width="1200" height="800" fill="${pal[2]}"/><g filter="url(#melt)">${rings(cx, cy, 16, 60, pal, r, 30)}</g>`;
  for (let i = 0; i < 4 + seed % 4; i++) body += splat(r() * 1200, r() * 800, 14 + r() * 30, r, r() < 0.7 ? PAL.ink : PAL.bone);
  for (let i = 0; i < 6 + Math.floor(r() * 10); i++) body += bat(r() * 1200, r() * 800, 0.6 + r() * 2.4, PAL.ink, (r() - 0.5) * 60);
  if (seed % 2 === 0) body += car(150 + r() * 600, 560 + r() * 100, 1.8 + r());
  if (seed % 3 === 0) body += `<g filter="url(#melt)"><circle cx="${cx}" cy="${cy}" r="90" fill="${PAL.bone}"/><circle cx="${cx}" cy="${cy}" r="45" fill="${PAL.ink}"/><circle cx="${cx - 15}" cy="${cy - 15}" r="12" fill="${PAL.bone}"/></g>`;
  return svg(1200, 800, body, seed + 2);
}

// ── Render ───────────────────────────────────────────────────
const browser = await chromium.launch();
const page = await browser.newPage();
async function render(svgText, w, h, file) {
  await page.setViewportSize({ width: w, height: h });
  await page.setContent(`<html><body style="margin:0;background:transparent">${svgText}</body></html>`);
  await page.waitForTimeout(80);
  await page.screenshot({ path: file, omitBackground: true, clip: { x: 0, y: 0, width: w, height: h } });
  console.log('✓', path.relative(OUT, file));
}
await render(icon(), 1024, 1024, path.join(OUT, 'icon.png'));
await render(desert(1360, 480, 11), 1360, 480, path.join(OUT, 'banner-profile.png'));
await render(desert(1920, 1080, 23), 1920, 1080, path.join(OUT, 'cover.png'));
for (const [name, draw] of Object.entries(emoji)) await render(svg(E, E, draw(), 5).replace('<rect width="128" height="128" fill="#fff" filter="url(#grain)"/>', ''), E, E, path.join(OUT, 'emojis', `${name}.png`));
for (let s = 1; s <= 8; s++) await render(postcard(s), 1200, 800, path.join(OUT, 'postcards', `postcard-${s}.png`));
await browser.close();
