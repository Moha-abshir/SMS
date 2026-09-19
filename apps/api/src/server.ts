process.env.TZ = 'Africa/Nairobi';

import app from './app.js';
import { env } from './config/env.js';
import { initializeDatabaseTables } from './config/initDb.js';

const PORT = parseInt(env.PORT, 10);

app.listen(PORT, async () => {
  console.log(`School Management System API running on port ${PORT}`);
  await initializeDatabaseTables();
});
