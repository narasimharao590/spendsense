import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import morgan from 'morgan';
import { env } from './config/env.js';
import { apiLimiter } from './middleware/rateLimiters.js';
import apiRoutes from './routes/index.js';
import { notFoundHandler } from './middleware/notFound.js';
import { errorHandler } from './middleware/errorHandler.js';

function sameLocalHost(a, b) {
  const localNames = new Set(['localhost', '127.0.0.1', '[::1]']);
  return (a === b && localNames.has(a)) || (localNames.has(a) && localNames.has(b));
}

function isAllowedOrigin(origin) {
  if (!origin) return true;
  return env.clientOrigins.some((allowedOrigin) => {
    if (origin === allowedOrigin) return true;
    try {
      const allowed = new URL(allowedOrigin);
      const candidate = new URL(origin);
      return allowed.protocol === candidate.protocol && allowed.port === candidate.port && sameLocalHost(allowed.hostname, candidate.hostname);
    } catch {
      return false;
    }
  });
}

export function createApp() {
  const app = express();

  app.disable('x-powered-by');
  if (env.nodeEnv === 'production') {
    app.set('trust proxy', 1);
  }
  app.use(helmet());
  app.use(
    cors({
      origin(origin, callback) {
        if (!isAllowedOrigin(origin)) {
          return callback(null, false);
        }
        return callback(null, true);
      },
      credentials: true,
    })
  );
  app.use(express.json({ limit: '256kb' }));
  app.use(express.urlencoded({ extended: false, limit: '256kb' }));

  if (env.nodeEnv !== 'test') {
    app.use(morgan(env.nodeEnv === 'production' ? 'combined' : 'dev'));
  }

  app.use('/api', apiLimiter, apiRoutes);
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
