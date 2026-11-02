#!/usr/bin/env node

import 'dotenv/config';
import { loadConfig } from './src/config.js';
import { EntityMonitoringWorker } from './src/worker.js';

let worker;

async function shutdown(signal) {
  console.log(`[${new Date().toISOString()}] ${signal} received`);
  await worker?.stop();
  process.exit(0);
}

process.once('SIGINT', () => void shutdown('SIGINT'));
process.once('SIGTERM', () => void shutdown('SIGTERM'));

try {
  worker = new EntityMonitoringWorker(loadConfig());
  await worker.run();
  if (worker.config.runOnce) await worker.stop();
} catch (error) {
  console.error(`[${new Date().toISOString()}] Fatal worker error:`, error);
  process.exit(1);
}
