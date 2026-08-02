import { readFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { resolve } from 'node:path';
import type { ViteDevServer } from 'vite';
import { serverPlugins } from './plugins/index.ts';
import { seedKeystore } from './keystore.ts';
import { parseEnvText } from '../desktop/env-file.ts';
import { createMiniConnect } from '../desktop/mini-connect.ts';
import { distStaticMiddleware, uploadsMiddleware } from '../desktop/static-files.ts';

async function main(): Promise<void> {
  if (!process.env.LWC_SECRET || process.env.LWC_SECRET.length < 32) {
    throw new Error('LWC_SECRET must be set to at least 32 characters for the web server.');
  }
  const envText = await readFile(resolve('.env.local'), 'utf8').catch(() => '');
  seedKeystore(parseEnvText(envText));

  const app = createMiniConnect((error) => {
    console.error('[web]', error instanceof Error ? error.message : error);
  });
  const server = createServer((req, res) => app.handle(req, res));
  const fake = {
    middlewares: { use: app.use.bind(app) },
    httpServer: server,
    config: {
      logger: {
        info: (message: string) => console.log(message),
        warn: (message: string) => console.warn(message),
        error: (message: string) => console.error(message),
      },
    },
  } as unknown as ViteDevServer;
  for (const plugin of serverPlugins()) {
    const hook = plugin.configureServer;
    const configure = typeof hook === 'function' ? hook : hook?.handler;
    await configure?.call(plugin as never, fake);
  }

  app.use('/media/uploads', uploadsMiddleware());
  app.use(distStaticMiddleware(resolve('dist')));

  const port = Number.parseInt(process.env.PORT ?? '5199', 10);
  const host = process.env.WEB_HOST ?? '127.0.0.1';
  server.listen(port, host, () => {
    console.log(`[web] OpenChatCut listening on http://${host}:${port}`);
  });
}

main().catch((error) => {
  console.error('[web] startup failed:', error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
