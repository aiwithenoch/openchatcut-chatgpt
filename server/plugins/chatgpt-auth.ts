import type { IncomingMessage, ServerResponse } from 'node:http';
import type { Plugin } from 'vite';
import { createChatGPTHandler } from '@opencoredev/loginwithchatgpt-server';

const BODY_LIMIT = 48 * 1024 * 1024;

const auth = createChatGPTHandler({
  secret: process.env.LWC_SECRET,
  responsesProxy: {
    rateLimit: { limit: 20, windowMs: 60_000 },
  },
});

async function requestBody(req: IncomingMessage): Promise<Buffer | undefined> {
  if (req.method === 'GET' || req.method === 'HEAD') return undefined;
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of req) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    size += buffer.length;
    if (size > BODY_LIMIT) throw new Error('request body too large');
    chunks.push(buffer);
  }
  return Buffer.concat(chunks);
}

function webUrl(req: IncomingMessage): string {
  const forwarded = req.headers['x-forwarded-proto'];
  const protocol = typeof forwarded === 'string' ? forwarded.split(',')[0]?.trim() : 'http';
  const host = req.headers.host ?? 'localhost';
  const requestPath = req.url ?? '/';
  const suffix = requestPath.startsWith('/api/chatgpt')
    ? requestPath.slice('/api/chatgpt'.length) || '/'
    : requestPath;
  return `${protocol}://${host}/api/chatgpt${suffix}`;
}

export async function handleChatGpt(req: IncomingMessage, res: ServerResponse): Promise<void> {
  try {
    const body = await requestBody(req);
    const response = await auth.handler(new Request(webUrl(req), {
      method: req.method,
      headers: new Headers(req.headers as Record<string, string>),
      body: body ? new Uint8Array(body) : undefined,
    }));
    res.statusCode = response.status;
    for (const [name, value] of response.headers) {
      if (name.toLowerCase() !== 'set-cookie') res.setHeader(name, value);
    }
    const cookies = response.headers.getSetCookie();
    if (cookies.length) res.setHeader('set-cookie', cookies);
    res.end(Buffer.from(await response.arrayBuffer()));
  } catch (error) {
    const tooLarge = error instanceof Error && error.message === 'request body too large';
    res.statusCode = tooLarge ? 413 : 500;
    res.setHeader('content-type', 'application/json');
    res.setHeader('cache-control', 'no-store');
    res.end(JSON.stringify({ error: tooLarge ? 'request body too large' : 'ChatGPT connection failed' }));
  }
}

/** Per-user ChatGPT subscription sessions for the hosted web build. */
export function chatGptAuthPlugin(): Plugin {
  return {
    name: 'openchatcut-chatgpt-auth',
    configureServer(server) {
      server.middlewares.use('/api/chatgpt', (req, res) => { void handleChatGpt(req, res); });
    },
  };
}
