import { randomUUID } from 'node:crypto';
import type { NextFunction, Request, Response } from 'express';

/**
 * BACKEND.md §5: every error body carries a `requestId`, and responses expose
 * `X-Request-Id` for support/troubleshooting. Trust an inbound Id only if it
 * looks sane; otherwise generate.
 */
export function requestId(req: Request, res: Response, next: NextFunction): void {
  const inbound = req.headers['x-request-id'];
  const id = typeof inbound === 'string' && /^[\w-]{8,64}$/.test(inbound) ? inbound : randomUUID();
  (req as Request & { requestId: string }).requestId = id;
  res.setHeader('X-Request-Id', id);
  next();
}
