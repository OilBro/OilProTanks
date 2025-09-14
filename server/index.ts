import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import cors from "cors";
import { requestLogger, errorHandler } from './middleware';
import { startImageAnalysisWorker } from './imageAnalysisService';

const app = express();

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

// Health check endpoint
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({ ok: true, ts: Date.now(), service: 'ReportArchitect' });
});

// Request logging (replaces prior inline logger)
app.use(requestLogger);

(async () => {
  const server = await registerRoutes(app);

  // Initialize background workers conditionally via feature flags
  if (process.env.VITE_AI_ANALYSIS_UI === 'true') {
    startImageAnalysisWorker();
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
    await setupVite(app, server);
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
  });
})();
