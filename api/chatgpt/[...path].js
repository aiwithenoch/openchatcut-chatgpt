import { createChatGPTHandler } from '@opencoredev/loginwithchatgpt-server';

const auth = createChatGPTHandler({
  secret: process.env.LWC_SECRET,
  responsesProxy: {
    rateLimit: { limit: 20, windowMs: 60_000 },
  },
});

async function requestBody(req) {
  if (req.method === 'GET' || req.method === 'HEAD') return undefined;
  const chunks = [];
  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return chunks.length ? Buffer.concat(chunks) : undefined;
}

export default async function handler(req, res) {
  try {
    const protocol = String(req.headers['x-forwarded-proto'] || 'https').split(',')[0].trim();
    const host = req.headers.host;
    const response = await auth.handler(new Request(`${protocol}://${host}${req.url}`, {
      method: req.method,
      headers: new Headers(req.headers),
      body: (await requestBody(req)) || undefined,
    }));

    res.statusCode = response.status;
    for (const [name, value] of response.headers) {
      if (name.toLowerCase() !== 'set-cookie') res.setHeader(name, value);
    }
    const cookies = response.headers.getSetCookie();
    if (cookies.length) res.setHeader('set-cookie', cookies);
    res.end(Buffer.from(await response.arrayBuffer()));
  } catch (error) {
    console.error('[chatgpt]', error);
    res.statusCode = 500;
    res.setHeader('content-type', 'application/json');
    res.setHeader('cache-control', 'no-store');
    res.end(JSON.stringify({ error: 'ChatGPT connection failed' }));
  }
}
