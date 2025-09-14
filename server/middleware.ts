import type { Request, Response, NextFunction } from 'express';

// Simple request logger with timing
export function requestLogger(req: Request, res: Response, next: NextFunction) {
  const start = process.hrtime.bigint();
  const { method, originalUrl } = req;
  res.on('finish', () => {
    const durationMs = Number(process.hrtime.bigint() - start) / 1_000_000;
    const status = res.statusCode;
    // Avoid noisy logs for swagger assets
    if (!originalUrl.startsWith('/api/docs') && !originalUrl.startsWith('/favicon')) {
      console.log(`[REQ] ${method} ${originalUrl} -> ${status} ${durationMs.toFixed(1)}ms`);
    }
  });
  next();
}

// Central error handler (must have 4 params)
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function errorHandler(err: any, _req: Request, res: Response, _next: NextFunction) {
  if (res.headersSent) {
    return; // delegate to default handler if already sent
  }
  const status = err?.status || 500;
  const message = err?.message || 'Internal Server Error';
  const details = err?.issues || err?.detail || undefined;
  if (status >= 500) {
    console.error('[ERR]', err);
  }
  res.status(status).json({ error: message, details });
}
