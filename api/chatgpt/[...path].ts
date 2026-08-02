import type { IncomingMessage, ServerResponse } from 'node:http';
import { handleChatGpt } from '../../server/plugins/chatgpt-auth.ts';

export default function handler(req: IncomingMessage, res: ServerResponse): Promise<void> {
  return handleChatGpt(req, res);
}
