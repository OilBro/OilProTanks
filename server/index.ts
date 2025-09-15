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
let readiness: { started: boolean; seeded: boolean; startedAt: number } = { started: false, seeded: false, startedAt: Date.now() };

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

// Readiness endpoint – reports seeding & route registration completion
app.get(['/ready','/api/ready'], (_req: Request, res: Response) => {
  res.json({ ready: readiness.started && readiness.seeded, ...readiness });
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

    // Auto-seed report templates (DB mode only)
    if (process.env.DATABASE_URL) {
      db.select().from(reportTemplates).limit(1)
        .then((existing) => {
          if (existing.length === 0) {
            console.log('[startup] No report templates found. Running seed...');
            seedDatabase().then(() => { readiness.seeded = true; });
          } else {
            console.log('[startup] Report templates present. Skipping seed.');
            readiness.seeded = true;
          }
        })
        .catch((err) => {
          console.error('[startup] Template auto-seed check failed:', err);
          readiness.seeded = true;
        });
    } else {
      console.log('[startup] DATABASE_URL not set; running in in-memory mode (templates ephemeral).');
      readiness.seeded = true; // nothing to seed
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

    // ALWAYS serve the app on port 5000
    // this serves both the API and the client.
    // It is the only port that is not firewalled.
    const port = 5000;
    server.listen({
      port,
      host: "0.0.0.0",
    }, () => {
      log(`serving on port ${port}`);
      readiness.started = true;
    });
  });
}

startServer();
