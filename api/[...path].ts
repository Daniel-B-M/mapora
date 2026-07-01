import type { IncomingMessage, ServerResponse } from 'http';
import app from '../backend/src/app';
import { connectDatabase } from '../backend/src/config/database';

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  await connectDatabase();
  app(req as any, res as any);
}
