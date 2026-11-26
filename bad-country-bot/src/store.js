// Tiny JSON file store. Survives restarts; fine for one server.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'data');
const FILE = path.join(DIR, 'state.json');

let state = { ids: { roles: {}, channels: {}, messages: {} }, members: {} };

export function load() {
  try {
    const raw = JSON.parse(fs.readFileSync(FILE, 'utf8'));
    state = { ...state, ...raw, ids: { roles: {}, channels: {}, messages: {}, ...(raw.ids || {}) } };
  } catch (err) {
    if (err.code !== 'ENOENT') console.warn('[store] could not read state, starting fresh:', err.message);
  }
  return state;
}

export function save() {
  fs.mkdirSync(DIR, { recursive: true });
  const tmp = FILE + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(state, null, 2));
  fs.renameSync(tmp, FILE);
}

export const ids = () => state.ids;

export function member(userId) {
  state.members[userId] ??= {};
  return state.members[userId];
}

export function resetMember(userId) {
  delete state.members[userId];
  save();
}

load();
