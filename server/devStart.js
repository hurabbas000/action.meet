/**
 * devStart.js — Development startup script
 * Uses mongodb-memory-server to run MongoDB in-process.
 * No local MongoDB installation needed.
 * 
 * Run with:  npm run devdb
 */
const { MongoMemoryServer } = require('mongodb-memory-server');
require('dotenv').config();

(async () => {
  // ─── Start in-memory MongoDB ───────────────────────
  console.log('🍃 Starting in-memory MongoDB...');
  const mongod = await MongoMemoryServer.create({
    instance: {
      port: 27017,      // standard port so existing connection strings work
      dbName: 'actionmeet',
    }
  });

  const uri = mongod.getUri();
  process.env.MONGODB_URI = uri;
  console.log(`✅ In-memory MongoDB running: ${uri}`);

  // ─── Graceful shutdown ─────────────────────────────
  const cleanup = async () => {
    console.log('\n⏹  Stopping in-memory MongoDB...');
    await mongod.stop();
    process.exit(0);
  };
  process.on('SIGINT',  cleanup);
  process.on('SIGTERM', cleanup);

  // ─── Launch the Express app ────────────────────────
  require('./src/app');
})();
