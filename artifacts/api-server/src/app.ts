import path            from 'node:path';
import { fileURLToPath } from 'node:url';
import express, { type Express } from 'express';
import cors             from 'cors';
import pinoHttp         from 'pino-http';
import router           from './routes/index.js';
import { logger }       from './lib/logger.js';
import { compressedStatic } from './middlewares/compressed-static.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app: Express = express();

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return { id: req.id, method: req.method, url: req.url?.split('?')[0] };
      },
      res(res) {
        return { statusCode: res.statusCode };
      },
    },
  }),
);
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ── API routes ────────────────────────────────────────────────────────────────
app.use('/api', router);

// ── Static file serving (production) ─────────────────────────────────────────
// In development, the Vite dev server handles the game directly.
// In production (Replit deployment or self-hosted), the API server serves the
// pre-built game from toon-rts/dist/public/ with pre-compressed .br / .gz assets.
//
// The compressedStatic middleware checks Accept-Encoding and serves the smallest
// available variant with immutable cache headers for hashed assets.
if (process.env.NODE_ENV === 'production') {
  // Path: api-server/dist/ → api-server/ → artifacts/ → toon-rts/dist/public
  const toonRtsDist = path.resolve(__dirname, '..', '..', '..', 'toon-rts', 'dist', 'public');

  // 1. Pre-compressed text assets (JS, CSS, HTML, JSON, SVG…)
  app.use('/', compressedStatic(toonRtsDist));

  // 2. Binary assets (images, FBX, WASM, audio…) via express.static
  //    These are already optimally compressed at the source; no .gz/.br needed.
  app.use('/', express.static(toonRtsDist, {
    // Long-term cache for content-hashed filenames
    setHeaders(res, filePath) {
      if (/\/(js|assets)\//.test(filePath)) {
        res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
      } else {
        res.setHeader('Cache-Control', 'public, max-age=3600');
      }
    },
  }));

  // 3. SPA fallback — any unmatched route serves index.html (React Router / Wouter)
  app.get('*', (_req, res) => {
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.sendFile(path.join(toonRtsDist, 'index.html'));
  });

  logger.info({ distDir: toonRtsDist }, 'Serving static game build');
}

export default app;
