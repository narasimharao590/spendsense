import mongoose from 'mongoose';
import { assertEnv, env } from './config/env.js';
import { connectDatabase } from './config/db.js';
import { createApp } from './app.js';

let server;
let shuttingDown = false;

function log(...args) {
  console.log(...args);
}

async function shutdown(signal, code = 0) {
  if (shuttingDown) return;
  shuttingDown = true;
  log(`[${signal}] shutting down SpendSense API`);

  const forceExit = setTimeout(() => {
    console.error(`[${signal}] forced exit after 10s timeout`);
    process.exit(1);
  }, 10000);
  forceExit.unref();

  try {
    if (server) {
      await new Promise((resolve) => server.close(() => resolve()));
    }
    if (mongoose.connection.readyState !== 0) {
      await mongoose.connection.close();
    }
    clearTimeout(forceExit);
    log('closed connections, bye');
    process.exit(code);
  } catch (error) {
    console.error(`[${signal}] error while shutting down:`, error);
    process.exit(1);
  }
}

async function main() {
  assertEnv();

  const connection = await connectDatabase();
  log(`mongo connected: ${connection.name} @ ${connection.host}:${connection.port}`);

  connection.on('disconnected', () => console.warn('[warn] mongo disconnected, driver is retrying'));
  connection.on('reconnected', () => log('[info] mongo reconnected'));

  const app = createApp();
  server = app.listen(env.port, () => {
    log(`SpendSense API ready on http://localhost:${env.port}/api (env: ${env.nodeEnv})`);
  });

  server.on('error', (error) => {
    if (error.code === 'EADDRINUSE') {
      console.error(`port ${env.port} is already in use - stop the other process or set PORT in backend/.env`);
    } else {
      console.error('http server error:', error);
    }
    process.exit(1);
  });
}

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => shutdown(signal));
}

process.on('unhandledRejection', (reason) => {
  console.error('[unhandledRejection]', reason);
});

process.on('uncaughtException', (error) => {
  console.error('[uncaughtException]', error);
  shutdown('uncaughtException', 1);
});

main().catch((error) => {
  console.error('failed to start SpendSense API:', error.message || error);
  process.exit(1);
});
