import 'dotenv/config';
import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import apiRouter from './src/backend/routes/api.js';
import { initializeSecrets } from './src/backend/config/secrets.js';
// Fabric import removed

// 1. Automatically generate secure random values for JWT_SECRET and ADMIN_MFA_SECRET if missing
initializeSecrets();

// 2. Automatically configure local Fabric development network & development CA certificates
// Fabric network initialization removed

async function startServer() {
  const app = express();
  const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

  // Body parser for JSON
  app.use(express.json({ limit: '8mb' }));

  // Cyber Security & Defense HTTP Headers
  app.use((req, res, next) => {
    res.removeHeader('X-Powered-By');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('Permissions-Policy', 'camera=(), microphone=(self), geolocation=()');
    res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
    res.setHeader(
      'Content-Security-Policy',
      "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com data:; img-src 'self' data: https: blob:; connect-src 'self' ws: wss:; frame-ancestors 'none';"
    );
    next();
  });

  // Health endpoint
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // API routes
  app.use('/api/v1', apiRouter);
  app.use('/api', apiRouter); // Alias for backwards compatibility

  // Vite middleware for development vs Production static serving
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        host: '0.0.0.0',
        port: 3000,
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[E-VOTING ENGINE] Server listening on http://0.0.0.0:${PORT}`);
    console.log(`[E-VOTING ENGINE] REST API ready at /api/v1/`);
  });
}

startServer().catch((err) => {
  console.error('[E-VOTING ENGINE FATAL]', err);
  process.exit(1);
});
