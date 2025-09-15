import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import cors from "cors";
import { requestLogger, errorHandler } from './middleware';
import { startImageAnalysisWorker } from './imageAnalysisService';
import { db } from './db';
import { reportTemplates } from '../shared/schema';
import { seedDatabase } from './seed';

const app = express();
let readiness: { started: boolean; seeded: boolean; startedAt: number; seedInProgress: boolean; seedError?: string } = {
  started: false,
  seeded: false,
  startedAt: Date.now(),
  seedInProgress: false
};

// Enable CORS for cross-origin requests
app.use(cors({
  origin: process.env.CLIENT_URL || true,
  credentials: true
}));

// Security headers middleware - addressing audit findings
app.use((req: Request, res: Response, next: NextFunction) => {
  // Prevent MIME-sniffing attacks
  res.setHeader('X-Content-Type-Options', 'nosniff');
  
  // Prevent clickjacking attacks
  res.setHeader('X-Frame-Options', 'DENY');
  
  // Enable XSS protection
  res.setHeader('X-XSS-Protection', '1; mode=block');
  
  // Content Security Policy
  res.setHeader('Content-Security-Policy', 
    "default-src 'self'; " +
    "script-src 'self' 'unsafe-inline'; " +
    "style-src 'self' 'unsafe-inline'; " +
    "img-src 'self' data:; " +
    "connect-src 'self'; " +
    "font-src 'self'; " +
    "object-src 'none'; " +
    "base-uri 'self'; " +
    "form-action 'self'"
  );
  
  // Referrer policy
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  next();
});

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Basic liveness (always true if process running)
app.get(['/api/health','/health'], (_req: Request, res: Response) => {
  res.json({ ok: true, service: 'ReportArchitect', ts: Date.now() });
});

// Root endpoint for platform health checks (some providers hit '/')
app.get('/', (_req: Request, res: Response) => {
  res.status(200).send('OK');
});

// Readiness endpoint – non-blocking; reports background seeding status
app.get(['/ready','/api/ready'], (_req: Request, res: Response) => {
  res.json({
    ready: readiness.started && (readiness.seeded || process.env.SEED_TEMPLATES_DISABLE === 'true'),
    ...readiness,
    seedDisabled: process.env.SEED_TEMPLATES_DISABLE === 'true'
  });
});

// Request logging (replaces prior inline logger)
app.use(requestLogger);


// Main startup logic (no top-level async IIFE)
function startServer() {
  registerRoutes(app).then((server) => {
    // Initialize background workers conditionally via feature flags
    if (process.env.VITE_AI_ANALYSIS_UI === 'true') {
      startImageAnalysisWorker();
    }

    // Background seed (never block health checks)
    const seedDisabled = process.env.SEED_TEMPLATES_DISABLE === 'true';
    if (!seedDisabled && process.env.DATABASE_URL) {
      readiness.seedInProgress = true;
      setImmediate(() => {
        db.select().from(reportTemplates).limit(1)
          .then((existing: any[]) => {
            if (existing.length === 0) {
              console.log('[startup] No report templates found. Running seed (background)...');
              return seedDatabase().then(() => {
                readiness.seeded = true;
                readiness.seedInProgress = false;
                console.log('[startup] Seed completed');
              });
            } else {
              console.log('[startup] Report templates present. Skipping seed.');
              readiness.seeded = true;
              readiness.seedInProgress = false;
            }
          })
          .catch((err: unknown) => {
            console.error('[startup] Template auto-seed check failed:', err);
            readiness.seedError = err instanceof Error ? err.message : String(err);
            // Mark seeded=false but stop claiming in progress so readiness reflects degraded state
            readiness.seedInProgress = false;
          });
      });
    } else {
      if (seedDisabled) {
        console.log('[startup] Template seed disabled via SEED_TEMPLATES_DISABLE=true');
      } else {
        console.log('[startup] DATABASE_URL not set; running in in-memory mode (templates ephemeral).');
      }
      readiness.seeded = true; // treat as ready
    }

    // Basic 404 handler for unknown API requests only (before error handler)
    app.use('/api', (req: Request, res: Response) => {
      res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Route not found' } });
    });

    // Central error handler (after routes)
    app.use(errorHandler);

    // importantly only setup vite in development and after
    // setting up all the other routes so the catch-all route
    // doesn't interfere with the other routes
    if (app.get("env") === "development") {
      setupVite(app, server);
    } else {
      serveStatic(app);
    }

    // Bind to dynamic platform port if provided (fallback 5000)
    const port = Number(process.env.PORT || process.env.NODE_PORT || 5000);
    const host = "0.0.0.0";
    server.listen({ port, host }, () => {
      readiness.started = true;
      log(`serving on ${host}:${port} (pid ${process.pid})`);
    });

    // Heartbeat (optional) to show liveness in logs every 60s (can be disabled)
    if (process.env.HEARTBEAT_LOG !== 'false') {
      setInterval(() => {
        if (readiness.started) {
          console.log(`[heartbeat] up seedInProgress=${readiness.seedInProgress} seeded=${readiness.seeded}`);
        }
      }, 60000).unref();
    }

    // Graceful shutdown & error handlers
    const shutdown = (signal: string) => {
      console.log(`[shutdown] received ${signal}, closing server...`);
      server.close(() => {
        console.log('[shutdown] HTTP server closed');
        process.exit(0);
      });
      // Fallback force exit after 8s
      setTimeout(() => {
        console.warn('[shutdown] force exit after timeout');
        process.exit(1);
      }, 8000).unref();
    };
    ['SIGINT','SIGTERM'].forEach(sig => process.on(sig as NodeJS.Signals, () => shutdown(sig)));
    process.on('uncaughtException', (err) => {
      console.error('[fatal] uncaughtException', err);
    });
    process.on('unhandledRejection', (reason) => {
      console.error('[warn] unhandledRejection', reason);
    });
  });
}

startServer();
