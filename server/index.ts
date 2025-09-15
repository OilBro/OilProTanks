import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import cors from "cors";
import { requestLogger, errorHandler } from './middleware';
import { startImageAnalysisWorker } from './imageAnalysisService';
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

// Root endpoint for platform health checks (many deployment platforms hit '/')
// This MUST respond immediately for successful deployments
app.get('/', (_req: Request, res: Response) => {
  // Set cache headers to prevent unnecessary requests during deployment
  res.setHeader('Cache-Control', 'no-cache');
  res.status(200).send('OK');
});

// Basic liveness check (always returns success if process is running)
// This endpoint is designed for deployment health checks and load balancers
app.get(['/api/health','/health'], (_req: Request, res: Response) => {
  // Optimized response with minimal data for fastest possible response
  res.setHeader('Cache-Control', 'no-cache');
  res.json({ ok: true, ts: Date.now() });
});

// Readiness endpoint – reports application readiness including background tasks
// This endpoint is separate from health checks and provides detailed status
app.get(['/ready','/api/ready'], (_req: Request, res: Response) => {
  res.setHeader('Cache-Control', 'no-cache');
  const isReady = readiness.started && (readiness.seeded || process.env.SEED_TEMPLATES_DISABLE === 'true');
  
  res.json({
    ready: isReady,
    started: readiness.started,
    seeded: readiness.seeded,
    seedInProgress: readiness.seedInProgress,
    seedDisabled: process.env.SEED_TEMPLATES_DISABLE === 'true',
    seedError: readiness.seedError || null,
    uptime: Date.now() - readiness.startedAt
  });
});

// Request logging (replaces prior inline logger)
app.use(requestLogger);


// Main startup logic (no top-level async IIFE)
function startServer() {
  const startupDeadlineMs = Date.now() + 10000; // warn if not listening within 10s
  let listening = false;

  const startFallbackServer = (reason: string) => {
    if (listening) return; // already started
    console.error('[startup:fallback] Falling back to minimal server due to:', reason);
    const http = require('http');
    const fallbackServer = http.createServer(app);
    const port = Number(process.env.PORT || process.env.NODE_PORT || 5000);
    fallbackServer.listen(port, '0.0.0.0', () => {
      readiness.started = true;
      listening = true;
      console.log(`[startup:fallback] Minimal server listening on 0.0.0.0:${port}`);
    });
  };

  registerRoutes(app).then((server) => {
    // Initialize background workers conditionally via feature flags
    if (process.env.VITE_AI_ANALYSIS_UI === 'true') {
      startImageAnalysisWorker();
    }

  // Background seed (never block health checks or startup)
    const seedDisabled = process.env.SEED_TEMPLATES_DISABLE === 'true';
    
    if (seedDisabled) {
      console.log('[startup] Template seed disabled via SEED_TEMPLATES_DISABLE=true');
      readiness.seeded = true; // treat as ready
    } else if (!process.env.DATABASE_URL) {
      console.log('[startup] DATABASE_URL not set; running in in-memory mode (templates ephemeral).');
      readiness.seeded = true; // treat as ready
    } else {
      // Run seeding with maximum timeout protection to never block health checks
      readiness.seedInProgress = true;
      
      // Use setImmediate to ensure this runs after server starts accepting connections
      setImmediate(async () => {
        const STARTUP_SEED_TIMEOUT = 15000; // 15 seconds max for entire seeding process
        
        try {
          console.log('[startup] Starting background seeding with deployment timeout protection...');
          
          // Use AbortController for safe timeout handling
          const controller = new AbortController();
          const timeoutHandle = setTimeout(() => {
            controller.abort();
          }, STARTUP_SEED_TIMEOUT);
          
          try {
            await seedDatabase(); // original seed returns void
            clearTimeout(timeoutHandle);
            readiness.seeded = true;
            console.log('[startup] Background seeding completed successfully');
          } catch (seedErr) {
            clearTimeout(timeoutHandle);
            throw seedErr;
          }
          
          readiness.seedInProgress = false;
          
        } catch (err: unknown) {
          const errorMsg = err instanceof Error ? err.message : String(err);
          console.error('[startup] Background seeding failed (app continues):', errorMsg);
          
          // Record error but don't block startup - only mark as seeded if explicitly successful
          readiness.seedError = errorMsg;
          readiness.seedInProgress = false;
          
          if (errorMsg.includes('timeout') || errorMsg.includes('abort')) {
            console.log('[startup] Seeding timed out - health checks remain unaffected');
          }
        }
      });
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
      listening = true;
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
  }).catch((err: unknown) => {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[startup] registerRoutes failed:', msg);
    startFallbackServer(msg);
  });

  // Startup watchdog warning (does not kill process)
  setTimeout(() => {
    if (!listening) {
      console.warn('[startup] WARNING: Server not listening within 10s – check route registration or build output');
    }
  }, 10000).unref();
}

startServer();
