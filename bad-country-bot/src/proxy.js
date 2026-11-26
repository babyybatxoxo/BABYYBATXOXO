// Only used when the machine forces traffic through an HTTPS proxy (some cloud
// sandboxes). On a normal computer / Docker this does nothing.
import { createRequire } from 'node:module';
import { ProxyAgent } from 'undici';
import { HttpsProxyAgent } from 'https-proxy-agent';

const require = createRequire(import.meta.url);
export const PROXY = process.env.HTTPS_PROXY || process.env.https_proxy || null;
export const restAgent = PROXY ? new ProxyAgent(PROXY) : null;

if (PROXY) {
  const ws = require('ws');
  const Base = ws.WebSocket;
  const agent = new HttpsProxyAgent(PROXY);
  class ProxiedWebSocket extends Base {
    constructor(url, protocols, opts = {}) {
      // Resume URLs point at per-region hosts the proxy may not allow; the main
      // gateway accepts the same connection.
      const u = new URL(url);
      if (u.hostname.endsWith('.discord.gg')) u.hostname = 'gateway.discord.gg';
      super(u.toString(), protocols, { ...opts, agent });
    }
  }
  ws.WebSocket = ProxiedWebSocket;
}
