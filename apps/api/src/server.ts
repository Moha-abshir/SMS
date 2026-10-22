process.env.TZ = 'Africa/Nairobi';

import app from './app.js';
import { env } from './config/env.js';
import { initializeDatabaseTables } from './config/initDb.js';

process.on('unhandledRejection', (reason: any) => {
  console.error('⚠️ [Process Unhandled Rejection]:', reason?.message || reason);
});

process.on('uncaughtException', (err: any) => {
  console.error('⚠️ [Process Uncaught Exception]:', err?.message || err);
});

const PORT = parseInt(env.PORT, 10);

app.listen(PORT, async () => {
  console.log(`School Management System API running on port ${PORT}`);
  await initializeDatabaseTables();
});
